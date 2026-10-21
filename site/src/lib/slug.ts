/** Chemins du site qui ne peuvent pas servir de lien de parrainage. */
export const reservedSlugs = new Set([
  'admin',
  'api',
  'og',
  'og.png',
  'mentions-legales',
  'confidentialite',
  'favicon.svg',
  'robots.txt',
  'apple-touch-icon.png',
  'index',
  '404',
  'fonts',
  'images',
  '_astro',
]);

/** « Marie-Hélène » → « marie-helene » */
export function slugify(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
    .replace(/-+$/g, '');
}

export function isValidSlug(slug: string): boolean {
  return /^[a-z0-9](?:[a-z0-9-]{0,38}[a-z0-9])?$/.test(slug) && !reservedSlugs.has(slug);
}
