// Ajoute des en-têtes de sécurité à toutes les réponses servies par Vercel.
// L'adaptateur Astro écrit .vercel/output/config.json ; on le complète juste après la compilation.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';

const file = new URL('../.vercel/output/config.json', import.meta.url);
if (!existsSync(file)) process.exit(0);

const config = JSON.parse(readFileSync(file, 'utf8'));
const security = {
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-Frame-Options': 'DENY',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
};
config.routes = [
  { src: '/(.*)', headers: security, continue: true },
  { src: '/admin', headers: { 'X-Robots-Tag': 'noindex, nofollow' }, continue: true },
  ...(config.routes ?? []),
];
writeFileSync(file, JSON.stringify(config, null, 2));
console.log('[en-têtes] sécurité ajoutée à .vercel/output/config.json');
