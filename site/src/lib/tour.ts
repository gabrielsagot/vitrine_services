import { dist, type Pt } from './geometry';

/**
 * Mini-moteur de tournée de la démo : il teste tous les ordres de passage possibles,
 * respecte les contraintes de chaque client et garde la journée la plus courte.
 * C'est une version jouet du vrai moteur de l'application de soins équins.
 */
export interface Stop extends Pt {
  id: string;
  name: string;
  place: string;
  /** Durée du rendez-vous (min). */
  duration: number;
  /** Heure de début au plus tôt (minutes depuis minuit). */
  earliest?: number;
  /** Heure de début au plus tard (minutes depuis minuit). */
  latest?: number;
  /** Contrainte affichée dans la démo. */
  constraint?: string;
}

export interface Visit {
  stop: Stop;
  start: number;
  end: number;
  driveKm: number;
}

export interface Plan {
  order: Stop[];
  visits: Visit[];
  km: number;
  backAt: number;
  late: number;
}

export interface TourSettings {
  home: Pt;
  /** Kilomètres par unité de la carte. */
  kmPerUnit: number;
  /** Vitesse moyenne (km/h). */
  speed: number;
  /** Départ du domicile (minutes depuis minuit). */
  leaveAt: number;
}

export function simulate(order: readonly Stop[], s: TourSettings): Plan {
  let t = s.leaveAt;
  let km = 0;
  let late = 0;
  let pos: Pt = s.home;
  const visits: Visit[] = [];
  for (const stop of order) {
    const d = dist(pos, stop) * s.kmPerUnit;
    km += d;
    t += (d / s.speed) * 60;
    if (stop.earliest !== undefined && t < stop.earliest) t = stop.earliest;
    if (stop.latest !== undefined && t > stop.latest) late += t - stop.latest;
    const start = Math.round(t / 5) * 5;
    visits.push({ stop, start, end: start + stop.duration, driveKm: d });
    t = start + stop.duration;
    pos = stop;
  }
  const back = dist(pos, s.home) * s.kmPerUnit;
  km += back;
  t += (back / s.speed) * 60;
  return { order: order.slice(), visits, km, backAt: Math.round(t / 5) * 5, late };
}

/** Teste toutes les permutations (6 arrêts = 720 journées possibles) et garde la meilleure. */
export function optimize(stops: readonly Stop[], s: TourSettings): Plan {
  let best: Plan | null = null;
  const score = (p: Plan) => p.km + p.late * 10;
  for (const order of permutations(stops)) {
    const plan = simulate(order, s);
    if (!best || score(plan) < score(best)) best = plan;
  }
  return best!;
}

export function* permutations<T>(items: readonly T[]): Generator<T[]> {
  const a = items.slice();
  const c = new Array<number>(a.length).fill(0);
  yield a.slice();
  let i = 0;
  while (i < a.length) {
    if (c[i]! < i) {
      const j = i % 2 === 0 ? 0 : c[i]!;
      [a[j], a[i]] = [a[i]!, a[j]!];
      yield a.slice();
      c[i]!++;
      i = 0;
    } else {
      c[i] = 0;
      i++;
    }
  }
}

export const hhmm = (minutes: number) => {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return `${h}h${m.toString().padStart(2, '0')}`;
};

/** La journée de la démo : six clients fictifs, quelques contraintes bien réelles. */
export const demoHome: Pt = { x: 200, y: 292 };

export const demoStops: Stop[] = [
  {
    id: 'rossi',
    name: 'Mme Rossi',
    place: 'Kervian',
    x: 92,
    y: 226,
    duration: 60,
    latest: 9 * 60 + 30,
    constraint: 'Le matin',
  },
  { id: 'bernard', name: 'M. Bernard', place: 'Les Forges', x: 66, y: 118, duration: 60 },
  {
    id: 'tilleuls',
    name: 'Les Tilleuls',
    place: 'Beaulieu',
    x: 176,
    y: 58,
    duration: 75,
    constraint: 'Bavard +15 min',
  },
  { id: 'okafor', name: 'Mme Okafor', place: 'Saint-Aubin', x: 304, y: 84, duration: 60 },
  {
    id: 'moulin',
    name: 'Ferme du Moulin',
    place: 'Le Moulin',
    x: 338,
    y: 192,
    duration: 60,
    earliest: 14 * 60,
    constraint: 'Dès 14h',
  },
  {
    id: 'lemoine',
    name: 'M. Lemoine',
    place: 'Brévalan',
    x: 262,
    y: 228,
    duration: 60,
    latest: 16 * 60 + 10,
    constraint: 'Avant 16h10',
  },
];

/** L'ordre dans lequel les demandes sont arrivées par message : le point de départ « emmêlé ». */
export const messageOrder = ['okafor', 'rossi', 'moulin', 'bernard', 'lemoine', 'tilleuls'];

export const demoSettings: TourSettings = { home: demoHome, kmPerUnit: 0.093, speed: 52, leaveAt: 8 * 60 };
