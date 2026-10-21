export type Tier = 'low' | 'mid' | 'high';

const html = () => document.documentElement;

export const prefersReduced = () => html().classList.contains('reduced');

let probe: Promise<Tier> | null = null;

/** Petit calcul chronométré (quelques millisecondes) : un bon indicateur de la puissance du processeur. */
function benchmark(): number {
  const t0 = performance.now();
  let x = 0;
  for (let i = 0; i < 120000; i++) x += Math.sqrt(i) * Math.sin(i);
  (window as unknown as { __bench: number }).__bench = x;
  return performance.now() - t0;
}

/**
 * Niveau d'effets à utiliser, mesuré sur l'appareil réel :
 * 1. un petit calcul chronométré (processeur) ;
 * 2. la fluidité des images pendant ~0,4 s (un appareil qui peine est rétrogradé).
 * Le site reste beau dans tous les cas ; seuls les effets coûteux sont dosés.
 */
export function getTier(): Promise<Tier> {
  if (probe) return probe;
  probe = new Promise<Tier>((resolve) => {
    const hinted = (html().dataset['tier'] as Tier | undefined) ?? 'mid';
    const forced = html().hasAttribute('data-tier-forced');
    if (forced || hinted === 'low' || prefersReduced() || document.visibilityState === 'hidden') {
      resolve(hinted);
      return;
    }
    const cpu = benchmark();
    let tier: Tier = cpu <= 6 ? 'high' : cpu <= 14 ? 'mid' : 'low';
    const frames: number[] = [];
    let last = performance.now();
    const started = last;
    const tick = (now: number) => {
      frames.push(now - last);
      last = now;
      if (now - started < 400) {
        requestAnimationFrame(tick);
        return;
      }
      const sorted = frames.slice(2).sort((a, b) => a - b);
      const median = sorted[Math.floor(sorted.length / 2)] ?? 16;
      if (median > 45) tier = 'low';
      else if (median > 28) tier = tier === 'high' ? 'mid' : 'low';
      html().dataset['tier'] = tier;
      resolve(tier);
    };
    requestAnimationFrame(tick);
  });
  return probe;
}

export function supportsWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas');
    return !!(canvas.getContext('webgl2') ?? canvas.getContext('webgl'));
  } catch {
    return false;
  }
}

/** Exécute `run` quand l'élément approche de l'écran (une seule fois). */
export function whenNear(el: Element, run: () => void, margin = '300px') {
  if (!('IntersectionObserver' in window)) {
    run();
    return;
  }
  const io = new IntersectionObserver(
    (entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        io.disconnect();
        run();
      }
    },
    { rootMargin: margin },
  );
  io.observe(el);
}
