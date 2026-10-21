import type { APIRoute } from 'astro';
import { channels, moments, normalizePhone } from '../../lib/contact';
import { describeChoice } from '../../lib/atelier';
import { contactSchema } from '../../lib/server/contact-schema';
import { notify } from '../../lib/server/notify';
import { findReferrer } from '../../lib/server/referrers';
import { serverClient } from '../../lib/server/supabase';

export const prerender = false;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

/** Limite simple par adresse (par instance) : 5 demandes en 10 minutes. */
const recent = new Map<string, number[]>();
const limited = (key: string) => {
  const now = Date.now();
  const list = (recent.get(key) ?? []).filter((t) => now - t < 10 * 60_000);
  list.push(now);
  recent.set(key, list);
  return list.length > 5;
};

/** Adresse du visiteur, seulement pour limiter les envois en rafale (jamais enregistrée). */
const visitorKey = (request: Request) =>
  request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
  request.headers.get('x-real-ip') ||
  'inconnu';

export const POST: APIRoute = async ({ request, url }) => {
  const raw = await request.text();
  if (raw.length > 20_000) return json({ ok: false, error: 'too_large' }, 413);
  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return json({ ok: false, error: 'invalid' }, 400);
  }
  const parsed = contactSchema.safeParse(body);
  if (!parsed.success) return json({ ok: false, error: 'invalid' }, 400);
  const v = parsed.data;

  // Robots : on fait comme si tout allait bien, sans rien enregistrer.
  if (v.website || Date.now() - v.startedAt < 3000) return json({ ok: true });
  if (limited(visitorKey(request))) return json({ ok: false, error: 'rate_limited' }, 429);

  const needsPhone = channels[v.channel].needs === 'phone';
  const contact = needsPhone ? normalizePhone(v.contact)! : v.contact.trim().toLowerCase();
  const referrer = v.referrer ? await findReferrer(v.referrer) : null;

  const db = serverClient();
  if (db) {
    const { error } = await db.from('contact_requests').insert({
      first_name: v.firstName,
      channel: v.channel,
      contact,
      moment: v.moment,
      message: v.message,
      model: v.model,
      referrer_id: referrer?.id ?? null,
    });
    if (error) {
      console.error('[contact] enregistrement impossible', error.message);
      return json({ ok: false, error: 'storage' }, 500);
    }
  } else {
    console.warn('[contact] mode démo : clé secrète Supabase absente, la demande n’est pas enregistrée.', {
      firstName: v.firstName,
      channel: v.channel,
    });
  }

  const lines = [
    `${v.firstName} souhaite être recontacté(e) ${channels[v.channel].phrase} : ${contact}`,
    v.moment && v.moment !== 'libre' ? `Moment préféré : ${moments[v.moment].label.toLowerCase()}` : '',
    referrer ? `De la part de ${referrer.name}` : '',
    v.message ? `Message : ${v.message}` : '',
    v.model
      ? (() => {
          const d = describeChoice(v.model);
          return `Modèle de l'atelier : « ${d.appName} », ${d.color}, ${d.names.join(', ') || 'aucun module'}`;
        })()
      : '',
  ].filter(Boolean);
  // La notification sur le téléphone reste discrète (pas de numéro ni de message) : le détail est dans
  // l'e-mail et dans l'espace admin.
  const pushLines = [
    `${v.firstName} préfère être recontacté(e) ${channels[v.channel].phrase}.`,
    referrer ? `De la part de ${referrer.name}.` : '',
  ].filter(Boolean);
  await notify({
    title: `Nouvelle demande : ${v.firstName}`,
    lines,
    pushLines,
    url: new URL('/admin', url).href,
  });

  return json({ ok: true });
};
