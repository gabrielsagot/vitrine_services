import { describe, expect, it } from 'vitest';
import { isValidSlug, slugify } from './slug';

describe('liens de parrainage', () => {
  it('transforme un prénom en lien propre', () => {
    expect(slugify('Marie-Hélène')).toBe('marie-helene');
    expect(slugify('  Zoé  ')).toBe('zoe');
    expect(slugify("Jean d'Arc")).toBe('jean-d-arc');
  });

  it('refuse les chemins réservés et les formats invalides', () => {
    expect(isValidSlug('sylvie')).toBe(true);
    expect(isValidSlug('sylvie-m')).toBe(true);
    expect(isValidSlug('admin')).toBe(false);
    expect(isValidSlug('-sylvie')).toBe(false);
    expect(isValidSlug('Sylvie')).toBe(false);
    expect(isValidSlug('a'.repeat(41))).toBe(false);
  });
});
