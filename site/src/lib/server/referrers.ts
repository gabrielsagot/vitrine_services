import { isValidSlug } from '../slug';
import { serverClient } from './supabase';

export interface Referrer {
  id: string | null;
  slug: string;
  name: string;
}

/** Parrains d'exemple, seulement tant que Supabase n'est pas configuré (aperçus, développement). */
const demoReferrers: Record<string, string> = { sylvie: 'Sylvie', marc: 'Marc' };

export async function findReferrer(slug: string): Promise<Referrer | null> {
  if (!isValidSlug(slug)) return null;
  const db = serverClient();
  if (!db) {
    const name = demoReferrers[slug];
    return name ? { id: null, slug, name } : null;
  }
  const { data, error } = await db
    .from('referrers')
    .select('id, slug, display_name')
    .eq('slug', slug)
    .eq('active', true)
    .maybeSingle();
  if (error) {
    console.error('[parrainage] lecture impossible', error.message);
    return null;
  }
  return data
    ? { id: data.id as string, slug: data.slug as string, name: data.display_name as string }
    : null;
}

export async function countVisit(slug: string): Promise<void> {
  const db = serverClient();
  if (!db || !isValidSlug(slug)) return;
  const { error } = await db.rpc('count_referrer_visit', { p_slug: slug });
  if (error) console.error('[parrainage] visite non comptée', error.message);
}
