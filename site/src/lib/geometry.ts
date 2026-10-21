export interface Pt {
  x: number;
  y: number;
}

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const clamp = (v: number, min = 0, max = 1) => Math.min(max, Math.max(min, v));
export const smoothstep = (t: number) => {
  const x = clamp(t);
  return x * x * (3 - 2 * x);
};
export const easeInOut = (t: number) => {
  const x = clamp(t);
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
};
export const dist = (a: Pt, b: Pt) => Math.hypot(b.x - a.x, b.y - a.y);

/**
 * Courbe de Catmull-Rom centripète passant par tous les points, échantillonnée finement.
 * Centripète = pas de boucles parasites ni de dépassements quand les points sont irréguliers.
 */
export function catmullRom(points: readonly Pt[], stepsPerSegment = 16): Pt[] {
  if (points.length < 2) return points.slice();
  const out: Pt[] = [];
  const first = points[0]!;
  const last = points[points.length - 1]!;
  const pts = [
    { x: 2 * first.x - points[1]!.x, y: 2 * first.y - points[1]!.y },
    ...points,
    { x: 2 * last.x - points[points.length - 2]!.x, y: 2 * last.y - points[points.length - 2]!.y },
  ];
  for (let i = 0; i < pts.length - 3; i++) {
    const p0 = pts[i]!;
    const p1 = pts[i + 1]!;
    const p2 = pts[i + 2]!;
    const p3 = pts[i + 3]!;
    const t0 = 0;
    const t1 = t0 + Math.max(Math.sqrt(dist(p0, p1)), 1e-4);
    const t2 = t1 + Math.max(Math.sqrt(dist(p1, p2)), 1e-4);
    const t3 = t2 + Math.max(Math.sqrt(dist(p2, p3)), 1e-4);
    for (let s = 0; s < stepsPerSegment; s++) {
      const t = lerp(t1, t2, s / stepsPerSegment);
      const a1 = mix(p0, p1, t0, t1, t);
      const a2 = mix(p1, p2, t1, t2, t);
      const a3 = mix(p2, p3, t2, t3, t);
      const b1 = mix(a1, a2, t0, t2, t);
      const b2 = mix(a2, a3, t1, t3, t);
      out.push(mix(b1, b2, t1, t2, t));
    }
  }
  out.push({ ...last });
  return out;
}

function mix(a: Pt, b: Pt, ta: number, tb: number, t: number): Pt {
  const span = tb - ta;
  const wa = (tb - t) / span;
  const wb = (t - ta) / span;
  return { x: a.x * wa + b.x * wb, y: a.y * wa + b.y * wb };
}

/** Rééchantillonne une polyligne à pas constant (en longueur d'arc). */
export function resample(poly: readonly Pt[], spacing: number): Pt[] {
  if (poly.length < 2) return poly.slice();
  const out: Pt[] = [{ ...poly[0]! }];
  let carry = 0;
  for (let i = 1; i < poly.length; i++) {
    const a = poly[i - 1]!;
    const b = poly[i]!;
    const seg = dist(a, b);
    if (seg === 0) continue;
    let d = spacing - carry;
    while (d <= seg) {
      const t = d / seg;
      out.push({ x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t) });
      d += spacing;
    }
    carry = seg - (d - spacing);
  }
  const end = poly[poly.length - 1]!;
  if (dist(out[out.length - 1]!, end) > spacing * 0.25) out.push({ ...end });
  return out;
}

export function polylineLength(poly: readonly Pt[]): number {
  let len = 0;
  for (let i = 1; i < poly.length; i++) len += dist(poly[i - 1]!, poly[i]!);
  return len;
}

/**
 * Points d'un tour complet autour d'un cercle, en partant de l'angle le plus proche de `from`
 * (le fil arrive, fait le tour, puis repart du même endroit).
 */
export function ringPoints(center: Pt, radius: number, from: Pt, clockwise = true, steps = 14): Pt[] {
  const start = Math.atan2(from.y - center.y, from.x - center.x);
  const dir = clockwise ? 1 : -1;
  const pts: Pt[] = [];
  for (let k = 0; k <= steps; k++) {
    const a = start + (dir * k * Math.PI * 2) / steps;
    pts.push({ x: center.x + Math.cos(a) * radius, y: center.y + Math.sin(a) * radius });
  }
  return pts;
}

/** Générateur pseudo-aléatoire déterministe (mêmes « nœuds » à chaque visite). */
export function seeded(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
