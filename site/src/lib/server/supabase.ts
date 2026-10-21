import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { PUBLIC_SUPABASE_PUBLISHABLE_KEY, PUBLIC_SUPABASE_URL } from 'astro:env/client';
import { SUPABASE_SERVICE_ROLE_KEY } from 'astro:env/server';

const options = { auth: { persistSession: false, autoRefreshToken: false } };

let secret: SupabaseClient | null | undefined;
let publicOnly: SupabaseClient | null | undefined;

/**
 * Client Supabase avec la clé secrète, côté serveur uniquement (jamais envoyée au navigateur).
 * Indispensable pour enregistrer les demandes de contact. `null` tant que la clé n'est pas renseignée.
 */
export function serverClient(): SupabaseClient | null {
  if (secret !== undefined) return secret;
  secret =
    PUBLIC_SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
      ? createClient(PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, options)
      : null;
  return secret;
}

/**
 * Client avec la clé publique : il ne peut appeler que les fonctions ouvertes au public
 * (reconnaître un lien de parrainage, compter une visite). Les tables lui restent fermées.
 */
export function publicClient(): SupabaseClient | null {
  if (publicOnly !== undefined) return publicOnly;
  publicOnly =
    PUBLIC_SUPABASE_URL && PUBLIC_SUPABASE_PUBLISHABLE_KEY
      ? createClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_PUBLISHABLE_KEY, options)
      : null;
  return publicOnly;
}
