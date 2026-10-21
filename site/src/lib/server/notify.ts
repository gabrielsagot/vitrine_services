import {
  CONTACT_EMAIL_FROM,
  CONTACT_EMAIL_TO,
  NTFY_TOKEN,
  NTFY_TOPIC,
  RESEND_API_KEY,
} from 'astro:env/server';

export interface Notice {
  title: string;
  lines: string[];
  /** Lien vers l'espace admin. */
  url: string;
}

/** Prévient le porteur de projet par e-mail et par notification, sans jamais bloquer la demande. */
export async function notify(notice: Notice): Promise<{ email: boolean; push: boolean }> {
  const [email, push] = await Promise.allSettled([sendEmail(notice), sendPush(notice)]);
  for (const r of [email, push]) {
    if (r.status === 'rejected') console.error('[alerte] échec', r.reason);
  }
  return {
    email: email.status === 'fulfilled' && email.value,
    push: push.status === 'fulfilled' && push.value,
  };
}

async function sendEmail({ title, lines, url }: Notice): Promise<boolean> {
  if (!RESEND_API_KEY || !CONTACT_EMAIL_TO || !CONTACT_EMAIL_FROM) return false;
  const esc = (s: string) =>
    s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
  const html = `<div style="font-family:Georgia,serif;color:#16213e;max-width:520px">
    <h1 style="font-weight:400;font-size:28px;margin:0 0 16px">${esc(title)}</h1>
    ${lines.map((l) => `<p style="font-family:Arial,sans-serif;font-size:16px;margin:0 0 8px">${esc(l)}</p>`).join('')}
    <p style="margin-top:24px"><a href="${esc(url)}" style="font-family:Arial,sans-serif;color:#8a5a14">Ouvrir l'espace admin</a></p>
  </div>`;
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { authorization: `Bearer ${RESEND_API_KEY}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      from: CONTACT_EMAIL_FROM,
      to: CONTACT_EMAIL_TO.split(',').map((s) => s.trim()),
      subject: title,
      text: [...lines, '', url].join('\n'),
      html,
    }),
    signal: AbortSignal.timeout(6000),
  });
  if (!res.ok) throw new Error(`Resend ${res.status}`);
  return true;
}

async function sendPush({ title, lines, url }: Notice): Promise<boolean> {
  if (!NTFY_TOPIC) return false;
  const headers: Record<string, string> = {
    Title: encodeHeader(title),
    Priority: 'high',
    Click: url,
  };
  if (NTFY_TOKEN) headers['Authorization'] = `Bearer ${NTFY_TOKEN}`;
  const res = await fetch(`https://ntfy.sh/${encodeURIComponent(NTFY_TOPIC)}`, {
    method: 'POST',
    headers,
    body: lines.join('\n'),
    signal: AbortSignal.timeout(6000),
  });
  if (!res.ok) throw new Error(`ntfy ${res.status}`);
  return true;
}

/** Les en-têtes HTTP n'acceptent pas les accents : ntfy comprend l'encodage RFC 2047. */
const encodeHeader = (s: string) =>
  /^[\x20-\x7e]*$/.test(s) ? s : `=?UTF-8?B?${Buffer.from(s).toString('base64')}?=`;
