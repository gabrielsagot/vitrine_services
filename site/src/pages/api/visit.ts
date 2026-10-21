import type { APIRoute } from 'astro';
import { countVisit } from '../../lib/server/referrers';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  try {
    const { slug } = JSON.parse((await request.text()).slice(0, 200)) as { slug?: unknown };
    if (typeof slug === 'string') await countVisit(slug);
  } catch {
    /* requête mal formée : ignorée */
  }
  return new Response(null, { status: 204 });
};
