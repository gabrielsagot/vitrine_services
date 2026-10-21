export type Tier = 'low' | 'mid' | 'high';

const html = () => document.documentElement;

export const prefersReduced = () => html().classList.contains('reduced');

let probe: Promise<Tier> | null = null;

/**
 * Niveau d'effets à utiliser. La première estimation (mémoire, processeur, économie de données)
 * est faite dans le <head> ; on la confirme ici en mesurant la fluidité réelle pendant ~0,4 s.
 * Un appareil qui peine est rétrogradé : le site reste beau, mais plus sobre.
 */
export function getTier(): Promise<Tier> {
  if (probe) return probe;
  probe = new Promise<Tier>((resolve) => {
    const initial = (html().dataset['tier'] as Tier | undefined) ?? 'mid';
    const forced = html().hasAttribute('data-tier-forced');
    if (forced || initial === 'low' || prefersReduced() || document.visibilityState === 'hidden') {
      resolve(initial);
      return;
    }
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
      let tier: Tier = initial;
      if (median > 40) tier = 'low';
      else if (median > 24 && tier === 'high') tier = 'mid';
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
