import type { APIRoute } from 'astro';
import { pitch, site } from '../config/site';

export const prerender = true;

/** Manifeste d'application : nom et icône propres quand on ajoute le site à l'écran d'accueil. */
export const GET: APIRoute = () =>
  new Response(
    JSON.stringify({
      name: `${site.brand.name} · ${site.brand.tagline}`,
      short_name: site.brand.name,
      description: pitch.subtitle,
      lang: 'fr',
      start_url: '/',
      display: 'standalone',
      background_color: '#f7f6f2',
      theme_color: '#f7f6f2',
      icons: [
        { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
        { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
        { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      ],
    }),
    { headers: { 'content-type': 'application/manifest+json' } },
  );
