import type { APIRoute } from 'astro';
import { renderOg } from '../lib/server/og';

export const prerender = true;

export const GET: APIRoute = async () => {
  const png = await renderOg({ title: 'Votre quotidien,', italic: 'sur mesure.' });
  return new Response(new Uint8Array(png), { headers: { 'content-type': 'image/png' } });
};
