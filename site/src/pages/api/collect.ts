import type { APIRoute } from 'astro';
import { SUPABASE_SERVICE_ROLE_KEY } from 'astro:env/server';
import { serverClient } from '../../lib/server/supabase';
import { geoFrom, originAllowed, toRows } from '../../lib/visits';

export const prerender = false;

/**
 * Réception des visites des quatre sites (script public/visites.js). Toujours 204 : le navigateur
 * n'attend rien en retour, et un envoi refusé n'apprend rien à celui qui l'a fait.
 */
const done = () =>
  new Response(null, {
    status: 204,
    headers: { 'access-control-allow-origin': '*', 'cache-control': 'no-store' },
  });

/** Limite par adresse (par instance) : 240 envois en 10 minutes. */
const recent = new Map<string, number[]>();
function limited(key: string) {
  const now = Date.now();
  const list = (recent.get(key) ?? []).filter((t) => now - t < 10 * 60_000);
  list.push(now);
  recent.set(key, list);
  if (recent.size > 5000) recent.clear();
  return list.length > 240;
}

/** Empreinte de l'adresse IP, salée et différente chaque jour : l'adresse n'est jamais gardée. */
async function ipHash(ip: string): Promise<string | null> {
  if (!ip) return null;
  const day = new Date().toISOString().slice(0, 10);
  const salt = (SUPABASE_SERVICE_ROLE_KEY ?? 'visites').slice(-24);
  const data = new TextEncoder().encode(`${salt}|${day}|${ip}`);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest).slice(0, 12), (b) => b.toString(16).padStart(2, '0')).join('');
}

export const OPTIONS: APIRoute = () =>
  new Response(null, {
    status: 204,
    headers: {
      'access-control-allow-origin': '*',
      'access-control-allow-methods': 'POST, OPTIONS',
      'access-control-allow-headers': 'content-type',
      'access-control-max-age': '86400',
    },
  });

export const POST: APIRoute = async ({ request }) => {
  const raw = await request.text();
  if (raw.length > 120_000) return done();
  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return done();
  }

  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || '';
  if (limited(ip || 'inconnu')) return done();

  const batch = toRows(body, {
    userAgent: request.headers.get('user-agent') ?? '',
    geo: geoFrom(request.headers),
    ipHash: await ipHash(ip),
  });
  if (!batch || !originAllowed(batch.site, request.headers.get('origin'))) return done();

  const db = serverClient();
  if (!db) return done();
  const { error } = await db.from('visit_events').insert(batch.rows);
  if (error) console.error('[visites] enregistrement impossible', error.message);
  return done();
};
