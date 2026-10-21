import type { IconName } from './icons';

export interface Module {
  id: string;
  label: string;
  icon: IconName;
  /** Ce que la carte affiche dans l'aperçu. */
  value: string;
  hint: string;
}

export const modules: Module[] = [
  { id: 'rdv', label: 'Rendez-vous', icon: 'calendar', value: '3 aujourd’hui', hint: 'Prochain à 10h30' },
  { id: 'clients', label: 'Clients', icon: 'users', value: '48 fiches', hint: '2 nouveaux' },
  { id: 'trajets', label: 'Trajets', icon: 'route', value: '62 km', hint: 'Itinéraire prêt' },
  { id: 'factures', label: 'Factures', icon: 'receipt', value: '2 à envoyer', hint: '1 payée hier' },
  { id: 'devis', label: 'Devis', icon: 'quote', value: '1 en attente', hint: 'Relancer jeudi' },
  { id: 'relances', label: 'Relances', icon: 'bell', value: '4 à faire', hint: 'Cette semaine' },
  { id: 'notes', label: 'Comptes rendus', icon: 'note', value: 'Hier, 17h', hint: 'À partager' },
  { id: 'stats', label: 'Statistiques', icon: 'chart', value: '+12 %', hint: 'Ce mois-ci' },
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
