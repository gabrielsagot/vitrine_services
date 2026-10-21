import type { IconName } from './icons';

export interface Module {
  id: string;
  label: string;
  icon: IconName;
  /** Ce que la carte affiche dans l'aperçu. */
  value: string;
  hint: string;
  /** Sa ligne dans la liste « Aujourd'hui » de l'aperçu. */
  today: { time?: string; title: string; detail: string };
  /** La grande carte de couleur, quand ce module est le plus important de ceux choisis. */
  focus: { label: string; main: string; sub: string };
}

/** Quel module occupe la grande carte de couleur, par ordre de priorité. */
export const focusOrder = ['rdv', 'trajets', 'factures', 'devis', 'relances', 'clients', 'notes', 'stats'];

export const modules: Module[] = [
  {
    id: 'rdv',
    label: 'Rendez-vous',
    icon: 'calendar',
    value: '3 aujourd’hui',
    hint: 'Prochain à 10h30',
    today: { time: '10h30', title: 'Mme Martin', detail: 'Rendez-vous · Kervian' },
    focus: { label: 'Prochain rendez-vous', main: '10h30 · Mme Martin', sub: 'Kervian · dans 45 min' },
  },
  {
    id: 'clients',
    label: 'Clients',
    icon: 'users',
    value: '48 fiches',
    hint: '2 nouveaux',
    today: { title: 'Léa Dumas', detail: 'Nouvelle cliente · fiche créée' },
    focus: { label: 'À revoir bientôt', main: '3 clients', sub: 'Dernière visite il y a trois mois' },
  },
  {
    id: 'trajets',
    label: 'Trajets',
    icon: 'route',
    value: '62 km',
    hint: 'Itinéraire prêt',
    today: { time: '8h15', title: 'Départ de la tournée', detail: '4 arrêts · 62 km' },
    focus: { label: 'Tournée du jour', main: '4 arrêts · 62 km', sub: 'Départ à 8h15, itinéraire prêt' },
  },
  {
    id: 'factures',
    label: 'Factures',
    icon: 'receipt',
    value: '2 à envoyer',
    hint: '1 payée hier',
    today: { title: 'Facture n° 42', detail: '180 € · prête à envoyer' },
    focus: { label: 'À encaisser', main: '1 240 €', sub: '2 factures à envoyer' },
  },
  {
    id: 'devis',
    label: 'Devis',
    icon: 'quote',
    value: '1 en attente',
    hint: 'Relancer jeudi',
    today: { title: 'Devis n° 17', detail: 'En attente · relancer jeudi' },
    focus: { label: 'Devis en attente', main: '860 €', sub: 'Envoyé lundi, relance jeudi' },
  },
  {
    id: 'relances',
    label: 'Relances',
    icon: 'bell',
    value: '4 à faire',
    hint: 'Cette semaine',
    today: { title: 'Relancer M. Petit', detail: 'Facture du 2 octobre' },
    focus: { label: 'À relancer', main: '4 clients', sub: 'Un message prêt pour chacun' },
  },
  {
    id: 'notes',
    label: 'Comptes rendus',
    icon: 'note',
    value: 'Hier, 17h',
    hint: 'À partager',
    today: { time: '17h00', title: 'Compte rendu', detail: 'À envoyer à Mme Martin' },
    focus: { label: 'À partager', main: '2 comptes rendus', sub: 'Photos et notes de la semaine' },
  },
  {
    id: 'stats',
    label: 'Statistiques',
    icon: 'chart',
    value: '+12 %',
    hint: 'Ce mois-ci',
    today: { title: 'Bilan d’octobre', detail: '+12 % par rapport à septembre' },
    focus: { label: 'Chiffre d’affaires', main: '3 480 €', sub: 'Octobre, +12 % sur un mois' },
  },
];

export interface Swatch {
  id: string;
  name: string;
  hex: string;
}

export const swatches: Swatch[] = [
  { id: 'sauge', name: 'Sauge', hex: '#5e8b6e' },
  { id: 'ocean', name: 'Océan', hex: '#2f6fa3' },
  { id: 'terracotta', name: 'Terracotta', hex: '#c0603f' },
  { id: 'prune', name: 'Prune', hex: '#7a4e7e' },
  { id: 'ambre', name: 'Ambre', hex: '#d39233' },
  { id: 'nuit', name: 'Nuit', hex: '#22305a' },
];

export const defaultAppName = 'Mon atelier';

export interface AtelierChoice {
  modules: string[];
  color: string;
  name: string;
}

/** Ce que le visiteur a composé dans l'atelier, partagé avec la conversation de contact. */
type Listener = (choice: AtelierChoice | null) => void;
let current: AtelierChoice | null = null;
const listeners = new Set<Listener>();

export const atelierStore = {
  get: () => current,
  set(choice: AtelierChoice | null) {
    current = choice;
    listeners.forEach((l) => l(choice));
  },
  subscribe(l: Listener) {
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  },
};

export const describeChoice = (c: AtelierChoice) => {
  const names = c.modules.map((id) => modules.find((m) => m.id === id)?.label).filter(Boolean);
  const color = swatches.find((s) => s.id === c.color)?.name ?? c.color;
  return { names: names as string[], color, appName: c.name.trim() || defaultAppName };
};
