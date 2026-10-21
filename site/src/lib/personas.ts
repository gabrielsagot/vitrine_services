import type { IconName } from './icons';

/**
 * Trois métiers fictifs pour l'accueil : la même idée (organiser sa journée),
 * trois applications différentes. C'est le sur-mesure montré plutôt qu'expliqué.
 */
export interface Persona {
  id: string;
  person: string;
  job: string;
  app: string;
  accent: string;
  soft: string;
  /** Police des titres de son application : chaque app a sa personnalité. */
  font: 'serif' | 'grotesk' | 'rounded';
  date: string;
  stats: [string, string, string];
  agenda: { time: string; title: string; who: string; meta: string }[];
  hint: { icon: IconName; text: string };
}

export const personas: Persona[] = [
  {
    id: 'claire',
    person: 'Claire',
    job: 'paysagiste',
    app: 'Jardins de Claire',
    accent: '#4e7a5a',
    soft: '#e4ede4',
    font: 'serif',
    date: 'Mardi 14 octobre',
    stats: ['4 chantiers', '38 km', 'Retour 17h10'],
    agenda: [
      { time: '8h30', title: 'Taille des haies', who: 'M. Bernard · Les Forges', meta: '2 h' },
      { time: '10h45', title: 'Tonte et ramassage', who: 'Mme Rossi · Kervian', meta: '1 h 30' },
      { time: '14h00', title: 'Devis terrasse', who: 'Les Tilleuls · Beaulieu', meta: '45 min' },
      { time: '15h30', title: 'Arrosage automatique', who: 'Mme Okafor · Saint-Aubin', meta: '1 h' },
    ],
    hint: { icon: 'cloud', text: 'Averse prévue à 16h : avancer le chantier de 15h30 ?' },
  },
  {
    id: 'marc',
    person: 'Marc',
    job: 'coiffeur à domicile',
    app: 'Marc Coiffure',
    accent: '#b4553c',
    soft: '#f4e4dc',
    font: 'grotesk',
    date: 'Jeudi 16 octobre',
    stats: ['6 clientes', '22 km', '214 € encaissés'],
    agenda: [
      { time: '9h00', title: 'Coupe et brushing', who: 'Mme Durand · Centre', meta: '45 min' },
      { time: '10h00', title: 'Coupe homme', who: 'M. Petit · Les Forges', meta: '30 min' },
      { time: '11h15', title: 'Couleur', who: 'Mme Leroy · Résidence Les Lilas', meta: '1 h 30' },
      { time: '14h30', title: 'Coupes enfants ×2', who: 'Famille Moreau · Kervian', meta: '1 h' },
    ],
    hint: { icon: 'palette', text: 'Mme Leroy : couleur 6.3, comme la dernière fois.' },
  },
  {
    id: 'ines',
    person: 'Inès',
    job: 'infirmière libérale',
    app: "Tournée d'Inès",
    accent: '#2f5f9e',
    soft: '#e1e9f4',
    font: 'rounded',
    date: 'Lundi 13 octobre',
    stats: ['11 patients', '47 km', 'Fin à 12h40'],
    agenda: [
      { time: '6h45', title: 'Insuline', who: 'M. Garnier · Beaulieu', meta: '15 min' },
      { time: '7h20', title: 'Pansement', who: 'Mme Colin · Le Moulin', meta: '30 min' },
      { time: '8h05', title: 'Prise de sang à jeun', who: 'M. Faure · Saint-Aubin', meta: '15 min' },
      { time: '8h50', title: 'Surveillance tension', who: 'Mme Nguyen · Kervian', meta: '20 min' },
    ],
    hint: { icon: 'clipboard', text: 'Ordonnance de Mme Colin à renouveler dans 3 jours.' },
  },
];
