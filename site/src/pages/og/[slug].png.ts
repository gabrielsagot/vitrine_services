import type { APIRoute } from 'astro';
import { renderOg } from '../../lib/server/og';
import { findReferrer } from '../../lib/server/referrers';

export const prerender = false;

export const GET: APIRoute = async ({ params, redirect }) => {
  const referrer = await findReferrer(params.slug ?? '');
  if (!referrer) return redirect('/og.png', 302);
  try {
    const name = referrer.name.length > 22 ? `${referrer.name.slice(0, 21)}…` : referrer.name;
    const png = await renderOg({ title: `${name} pense que`, italic: 'je peux vous aider.' });
    return new Response(new Uint8Array(png), {
      headers: {
        'content-type': 'image/png',
        'cache-control': 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800',
      },
    });
  } catch (e) {
    console.error('[aperçu] image impossible', e);
    return redirect('/og.png', 302);
  }
};
