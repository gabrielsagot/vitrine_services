/**
 * Tout ce qui est propre au porteur de projet se règle ici.
 * Les valeurs marquées « À COMPLÉTER » sont provisoires : le site fonctionne avec,
 * mais elles doivent être remplacées avant la mise en ligne.
 */
export const site = {
  /** Provisoire tant que la marque n'est pas choisie. */
  brand: {
    name: 'Gabriel',
    tagline: 'Applications sur mesure',
  },
  owner: {
    firstName: 'Gabriel',
    /** Nom complet, obligatoire dans les mentions légales. */
    fullName: 'Gabriel Sagot',
    age: 19,
    /** Chemin d'une photo carrée dans `public/` (640 × 640 px conseillés), ou `null`. */
    portrait: '/images/portrait.jpg' as string | null,
  },
  contact: {
    /** Numéro au format international, sans espaces (SMS et WhatsApp). */
    phoneE164: '+33769950436',
    email: 'sagotgabrielpro@gmail.com',
  },
  legal: {
    /** À COMPLÉTER à la création de la micro-entreprise. */
    siret: null as string | null,
    /** À COMPLÉTER : adresse postale (ou domiciliation) de l'éditeur. */
    address: '[Adresse à compléter]',
  },
} as const;

export const pitch = {
  title: 'Votre quotidien, sur mesure.',
  subtitle: 'Une application pensée pour votre métier, conçue pour vous seul.',
  cta: 'Parlons de votre projet',
  ctaNote: 'Le devis est offert, sans aucune obligation.',
} as const;

export const referralLine = (name: string) => `${name} pense que je peux vous aider.`;
