import { isValidSlug } from '../slug';
import { publicClient, serverClient } from './supabase';

export interface Referrer {
  id: string | null;
  slug: string;
  name: string;
}

/** Parrains d'exemple, seulement tant que Supabase n'est pas configuré (aperçus, développement). */
const demoReferrers: Record<string, string> = { sylvie: 'Sylvie', marc: 'Marc' };

export async function findReferrer(slug: string): Promise<Referrer | null> {
  if (!isValidSlug(slug)) return null;
  const db = serverClient() ?? publicClient();
  if (!db) {
    const name = demoReferrers[slug];
    return name ? { id: null, slug, name } : null;
  }
  const { data, error } = await db.rpc('get_referrer', { p_slug: slug });
  if (error) {
    console.error('[parrainage] lecture impossible', error.message);
    return null;
  }
  const row = (data as { id: string; slug: string; display_name: string }[] | null)?.[0];
  return row ? { id: row.id, slug: row.slug, name: row.display_name } : null;
}

export async function countVisit(slug: string): Promise<void> {
  const db = serverClient() ?? publicClient();
  if (!db || !isValidSlug(slug)) return;
  const { error } = await db.rpc('count_referrer_visit', { p_slug: slug });
  if (error) console.error('[parrainage] visite non comptée', error.message);
}
