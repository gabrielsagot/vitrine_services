import { clamp, smoothstep, type Pt } from './geometry';

/**
 * Trait « à la plume » : une forme pleine dont l'épaisseur dépend de la direction du trait,
 * comme une plume à bec large tenue avec un angle fixe. Plus fin dans les diagonales montantes,
 * plus épais dans les descentes : c'est ce qui donne le côté calligraphique du fil.
 */
export interface StrokeOptions {
  /** Épaisseur minimale (px). */
  min: number;
  /** Épaisseur maximale (px). */
  max: number;
  /** Angle de la plume (radians). */
  nib?: number;
  /** Longueur de l'affinement au départ (px). */
  taperStart?: number;
  /** Longueur de l'affinement à l'arrivée (px). */
  taperEnd?: number;
  /** Longueur de l'affinement de la pointe pendant le tracé (px). */
  taperHead?: number;
}

export interface Stroke {
  points: Pt[];
  /** Distance parcourue depuis le départ, pour chaque point. */
  along: number[];
  length: number;
  internal: {
    nx: Float32Array;
    ny: Float32Array;
    w: Float32Array;
    left: string[];
    right: string[];
    taperHead: number;
  };
}

const fmt = (v: number) => (Math.round(v * 10) / 10).toString();

export function buildStroke(points: readonly Pt[], options: StrokeOptions): Stroke {
  const { min, max, nib = -0.6, taperStart = 40, taperEnd = 30, taperHead = 26 } = options;
  const n = points.length;
  const nx = new Float32Array(n);
  const ny = new Float32Array(n);
  const raw = new Float32Array(n);
  const along: number[] = new Array(n).fill(0);

  for (let i = 0; i < n; i++) {
    const prev = points[Math.max(0, i - 1)]!;
    const next = points[Math.min(n - 1, i + 1)]!;
    let tx = next.x - prev.x;
    let ty = next.y - prev.y;
    const len = Math.hypot(tx, ty) || 1;
    tx /= len;
    ty /= len;
    nx[i] = -ty;
    ny[i] = tx;
    raw[i] = min + (max - min) * Math.abs(Math.sin(Math.atan2(ty, tx) - nib));
    if (i > 0)
      along[i] = along[i - 1]! + Math.hypot(points[i]!.x - points[i - 1]!.x, points[i]!.y - points[i - 1]!.y);
  }
  const length = along[n - 1] ?? 0;

  // Lissage de l'épaisseur pour éviter les à-coups dans les courbes serrées.
  const w = new Float32Array(n);
  const r = 5;
  for (let i = 0; i < n; i++) {
    let sum = 0;
    let count = 0;
    for (let j = Math.max(0, i - r); j <= Math.min(n - 1, i + r); j++) {
      sum += raw[j]!;
      count++;
    }
    const s = along[i]!;
    const taper = Math.max(
      0.18,
      smoothstep(s / Math.max(taperStart, 1)) * smoothstep((length - s) / Math.max(taperEnd, 1)),
    );
    w[i] = (sum / count) * taper;
  }

  const left: string[] = new Array(n);
  const right: string[] = new Array(n);
  for (let i = 0; i < n; i++) {
    const p = points[i]!;
    const h = w[i]! / 2;
    left[i] = `${fmt(p.x + nx[i]! * h)},${fmt(p.y + ny[i]! * h)}`;
    right[i] = `${fmt(p.x - nx[i]! * h)},${fmt(p.y - ny[i]! * h)}`;
  }

  return { points: points.slice(), along, length, internal: { nx, ny, w, left, right, taperHead } };
}

/** Index du dernier point situé à moins de `distance` du départ. */
export function indexAt(stroke: Stroke, distance: number): number {
  const { along } = stroke;
  let lo = 0;
  let hi = along.length - 1;
  if (distance >= stroke.length) return hi;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (along[mid]! <= distance) lo = mid;
    else hi = mid - 1;
  }
  return lo;
}

/**
 * Contour SVG du trait, de son départ jusqu'au point `upto`.
 * Quand le trait n'est pas complet, la pointe s'affine comme une plume qui avance.
 */
export function strokePath(stroke: Stroke, upto = stroke.points.length - 1): string {
  const { points, along } = stroke;
  const { nx, ny, w, left, right, taperHead } = stroke.internal;
  const last = Math.round(clamp(upto, 0, points.length - 1));
  if (last < 1) return '';
  const complete = last === points.length - 1;

  const head = complete ? last + 1 : firstWithin(along, along[last]! - taperHead, last);
  const l = left.slice(0, head);
  const rr: string[] = [];
  for (let i = head; i <= last; i++) {
    const p = points[i]!;
    const f = Math.max(0.12, smoothstep((along[last]! - along[i]!) / taperHead));
    const h = (w[i]! * f) / 2;
    l.push(`${fmt(p.x + nx[i]! * h)},${fmt(p.y + ny[i]! * h)}`);
    rr.push(`${fmt(p.x - nx[i]! * h)},${fmt(p.y - ny[i]! * h)}`);
  }
  rr.reverse();
  const r = rr.concat(right.slice(0, head).reverse());
  return `M${l.join('L')}L${r.join('L')}Z`;
}

function firstWithin(along: number[], distance: number, last: number): number {
  let i = last;
  while (i > 0 && along[i - 1]! >= distance) i--;
  return i;
}
