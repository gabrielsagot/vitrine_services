import { buildStroke, strokePath, type Stroke } from './calligraphy';
import { catmullRom, easeInOut, resample, ringPoints, seeded, type Pt } from './geometry';
import {
  demoHome,
  demoSettings,
  demoStops,
  messageOrder,
  optimize,
  simulate,
  type Plan,
  type Stop,
} from './tour';

/** Tout ce que la démo de tournée affiche, calculé une fois (côté serveur comme côté navigateur). */
export interface TourModel {
  best: Plan;
  messy: Plan;
  /** Séquence de points (domicile → arrêts → domicile) dans l'ordre des messages. */
  messySeq: Pt[];
  bestSeq: Pt[];
  loops: { side: number; offset: number; radius: number; clockwise: boolean }[];
}

export function tourModel(): TourModel {
  const best = optimize(demoStops, demoSettings);
  const messyOrder = messageOrder.map((id) => demoStops.find((s) => s.id === id)!) as Stop[];
  const messy = simulate(messyOrder, demoSettings);
  const rand = seeded(7);
  const legs = messyOrder.length + 1;
  const loops = Array.from({ length: legs }, () => ({
    side: rand() > 0.5 ? 1 : -1,
    offset: 10 + rand() * 26,
    radius: 9 + rand() * 12,
    clockwise: rand() > 0.5,
  }));
  return {
    best,
    messy,
    messySeq: [demoHome, ...messyOrder, demoHome],
    bestSeq: [demoHome, ...best.order, demoHome],
    loops,
  };
}

/**
 * Un trajet qui passe par `seq` dans l'ordre, avec des nœuds sur chaque tronçon.
 * `knot` = 1 : bien emmêlé (boucles) ; `knot` = 0 : trajet net.
 */
export function threadPoints(
  seq: readonly Pt[],
  loops: TourModel['loops'],
  knot: number,
  spacing = 1.6,
): Pt[] {
  const k = easeInOut(knot);
  const control: Pt[] = [seq[0]!];
  for (let i = 1; i < seq.length; i++) {
    const a = seq[i - 1]!;
    const b = seq[i]!;
    const loop = loops[i - 1];
    if (loop && k > 0.02) {
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const len = Math.hypot(dx, dy) || 1;
      const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      const off = loop.side * loop.offset * k;
      const center = { x: mid.x + (-dy / len) * off, y: mid.y + (dx / len) * off };
      control.push(...ringPoints(center, loop.radius * k, a, loop.clockwise, 9).slice(0, -1));
    }
    control.push(b);
  }
  return resample(catmullRom(control, 12), spacing);
}

/** Le trajet dans l'ordre des messages, plus ou moins emmêlé. */
export const messyPoints = (model: TourModel, knot: number) =>
  threadPoints(model.messySeq, model.loops, knot);

/** Le meilleur trajet, net. */
export const bestPoints = (model: TourModel, spacing = 1.6) => threadPoints(model.bestSeq, [], 0, spacing);

export function routeStroke(points: Pt[]): Stroke {
  return buildStroke(points, { min: 1.3, max: 3.4, nib: -0.5, taperStart: 14, taperEnd: 14, taperHead: 10 });
}

/** Contour du meilleur trajet complet (rendu serveur). */
export const bestPath = (model: TourModel) => strokePath(routeStroke(bestPoints(model)));

/** Courbes de niveau décoratives (carte « topographique »), déterministes. */
export function contours(): string[] {
  const rand = seeded(42);
  const out: string[] = [];
  const centers = [
    { x: 120, y: 150, r: 34 },
    { x: 300, y: 250, r: 26 },
    { x: 330, y: 40, r: 22 },
  ];
  for (const c of centers) {
    const phase = rand() * Math.PI * 2;
    for (let ring = 0; ring < 5; ring++) {
      const r = c.r + ring * 17;
      const pts: Pt[] = [];
      for (let k = 0; k < 28; k++) {
        const a = (k / 28) * Math.PI * 2;
        const wobble = 1 + 0.16 * Math.sin(a * 3 + phase + ring * 0.4) + 0.07 * Math.sin(a * 5 - phase);
        pts.push({ x: c.x + Math.cos(a) * r * wobble * 1.25, y: c.y + Math.sin(a) * r * wobble });
      }
      pts.push(pts[0]!);
      out.push(
        'M' +
          catmullRom(pts, 4)
            .map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`)
            .join('L') +
          'Z',
      );
    }
  }
  return out;
}
