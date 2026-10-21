import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { PUBLIC_SUPABASE_URL } from 'astro:env/client';
import { SUPABASE_SERVICE_ROLE_KEY } from 'astro:env/server';

let client: SupabaseClient | null | undefined;

/**
 * Client Supabase côté serveur uniquement (clé secrète, jamais envoyée au navigateur).
 * `null` quand Supabase n'est pas encore configuré : le site passe alors en mode démo.
 */
export function serverClient(): SupabaseClient | null {
  if (client !== undefined) return client;
  client =
    PUBLIC_SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
      ? createClient(PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
          auth: { persistSession: false, autoRefreshToken: false },
        })
      : null;
  return client;
}
