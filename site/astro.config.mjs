// @ts-check
import { defineConfig, envField } from 'astro/config';
import preact from '@astrojs/preact';
import vercel from '@astrojs/vercel';
import { loadEnv } from 'vite';

// Adresse publique : PUBLIC_SITE_URL si renseignée, sinon le domaine de production fourni par Vercel.
const env = loadEnv(process.env.NODE_ENV ?? 'production', process.cwd(), '');
const vercelUrl = env.VERCEL_PROJECT_PRODUCTION_URL ?? process.env.VERCEL_PROJECT_PRODUCTION_URL;
const site = env.PUBLIC_SITE_URL || (vercelUrl ? `https://${vercelUrl}` : 'https://exemple.fr');

export default defineConfig({
  site,
  output: 'static',
  adapter: vercel({ maxDuration: 15 }),
  integrations: [preact({ compat: false })],
  trailingSlash: 'never',
  prefetch: false,
  devToolbar: { enabled: false },
  build: { inlineStylesheets: 'auto' },
  env: {
    schema: {
      PUBLIC_SUPABASE_URL: envField.string({ context: 'client', access: 'public', optional: true }),
      PUBLIC_SUPABASE_PUBLISHABLE_KEY: envField.string({
        context: 'client',
        access: 'public',
        optional: true,
      }),
      SUPABASE_SERVICE_ROLE_KEY: envField.string({ context: 'server', access: 'secret', optional: true }),
      RESEND_API_KEY: envField.string({ context: 'server', access: 'secret', optional: true }),
      CONTACT_EMAIL_TO: envField.string({ context: 'server', access: 'secret', optional: true }),
      CONTACT_EMAIL_FROM: envField.string({ context: 'server', access: 'secret', optional: true }),
      NTFY_TOPIC: envField.string({ context: 'server', access: 'secret', optional: true }),
      NTFY_TOKEN: envField.string({ context: 'server', access: 'secret', optional: true }),
    },
  },
  vite: {
    ssr: { external: ['@resvg/resvg-js'] },
    optimizeDeps: { exclude: ['@resvg/resvg-js'] },
  },
});
