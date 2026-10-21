import { clamp, dist, easeInOut, lerp, type Pt } from '../lib/geometry';
import { getTier, prefersReduced } from '../lib/tier';
import { routePath, routePoints, tourModel } from '../lib/tour-render';

/**
 * Démo « La tournée qui se démêle ».
 * - Appareils capables : la section reste à l'écran et le défilement pilote la démo.
 * - Appareils modestes : la démo se joue d'elle-même quand elle apparaît.
 * - « Réduire les animations » : on montre directement la journée prête (rendu serveur).
 */
export function initTour() {
  const section = document.querySelector<HTMLElement>('#demo-tournee');
  if (!section || prefersReduced()) return;

  const pin = section.querySelector<HTMLElement>('[data-tour]')!;
  const route = section.querySelector<SVGPathElement>('[data-route]')!;
  const ghost = section.querySelector<SVGPathElement>('[data-route-ghost]')!;
  const km = section.querySelector<HTMLElement>('[data-km]')!;
  const plan = section.querySelector<HTMLElement>('[data-plan]')!;
  const traveller = section.querySelector<SVGGElement>('[data-traveller]')!;
  const captions = [...section.querySelectorAll<HTMLElement>('[data-phase]')];
  const rows = [...section.querySelectorAll<HTMLElement>('[data-row]')];
  const stopEls = new Map(
    [...section.querySelectorAll<SVGGElement>('[data-stop]')].map((g) => [g.dataset['stop']!, g]),
  );

  const model = tourModel();
  const messyKm = Number(pin.dataset['messyKm']);
  const bestKm = Number(pin.dataset['bestKm']);

  // Trajet final : sert au petit point qui parcourt la journée.
  const finalPts = routePoints(model, 1, 2);
  const along: number[] = [0];
  for (let i = 1; i < finalPts.length; i++) along.push(along[i - 1]! + dist(finalPts[i - 1]!, finalPts[i]!));
  const total = along[along.length - 1]!;
  const arrivals = model.best.order.map((stop) => {
    let bestI = 0;
    let bestD = Infinity;
    finalPts.forEach((p, i) => {
      const d = dist(p, stop);
      if (d < bestD) {
        bestD = d;
        bestI = i;
      }
    });
    return { id: stop.id, at: along[bestI]! / total };
  });

  ghost.setAttribute('d', routePath(model, 1));
  let lastT = -1;
  let lastCaption = -1;
  const isMobile = () => window.matchMedia('(max-width: 959px)').matches;

  const untangle = (t: number) => {
    if (Math.abs(t - lastT) < 0.0008) return;
    lastT = t;
    route.setAttribute('d', routePath(model, t));
    ghost.style.opacity = String(clamp((t - 0.85) / 0.15));
    km.textContent = String(Math.round(lerp(messyKm, bestKm, easeInOut(t))));
  };

  const caption = (i: number) => {
    if (i === lastCaption) return;
    lastCaption = i;
    captions.forEach((c, k) => c.classList.toggle('is-on', k === i));
  };

  const badges = (on: boolean) => {
    model.best.order.forEach((stop, i) => {
      const badge = stopEls.get(stop.id)?.querySelector<SVGGElement>('.stop-badge');
      if (!badge) return;
      badge.style.transitionDelay = on ? `${i * 70}ms` : '0ms';
      badge.classList.toggle('is-in', on);
    });
  };

  const travel = (q: number) => {
    const d = q * total;
    let i = 0;
    while (i < along.length - 1 && along[i + 1]! < d) i++;
    const a = finalPts[i]!;
    const b = finalPts[Math.min(i + 1, finalPts.length - 1)]!;
    const span = along[i + 1]! - along[i]! || 1;
    const p: Pt = { x: lerp(a.x, b.x, (d - along[i]!) / span), y: lerp(a.y, b.y, (d - along[i]!) / span) };
    traveller.setAttribute('transform', `translate(${p.x.toFixed(1)} ${p.y.toFixed(1)})`);
    traveller.style.opacity = q > 0 && q < 1 ? '1' : '0';
    let current = '';
    arrivals.forEach(({ id, at }, k) => {
      const reached = q > 0 && q >= at - 0.015;
      stopEls.get(id)?.classList.toggle('is-visited', reached);
      rows[k]?.classList.toggle('is-in', q > 0 && (k === 0 || reached));
      if (reached) current = id;
    });
    rows.forEach((r) => r.classList.toggle('is-current', q < 1 && r.dataset['row'] === current));
  };

  const sheet = (s: number) => {
    if (!isMobile()) {
      plan.style.opacity = String(easeInOut(s));
      plan.style.transform = `translateX(${(1 - easeInOut(s)) * 24}px)`;
      return;
    }
    plan.style.transform =
      isMobile() && section.classList.contains('tour-pinned')
        ? `translateY(calc(${(1 - easeInOut(s)) * 100}% + ${(1 - s) * 24}px))`
        : '';
  };

  /** Toute la démo pour une progression de 0 à 1. */
  const frame = (p: number) => {
    untangle(clamp((p - 0.08) / 0.44));
    caption(p < 0.08 ? 0 : p < 0.56 ? 1 : 2);
    badges(p > 0.54);
    sheet(clamp((p - 0.56) / 0.08));
    travel(clamp((p - 0.62) / 0.33));
    section.classList.toggle('tour-done', p > 0.95);
  };

  section.classList.add('tour-live');
  frame(0);

  getTier().then(async (tier) => {
    if (tier === 'low') {
      playOnce(section, frame);
      return;
    }
    const [{ gsap }, { ScrollTrigger }] = await Promise.all([import('gsap'), import('gsap/ScrollTrigger')]);
    gsap.registerPlugin(ScrollTrigger);
    ScrollTrigger.config({ ignoreMobileResize: true });
    section.classList.add('tour-pinned');
    const state = { p: 0 };
    gsap.to(state, {
      p: 1,
      ease: 'none',
      onUpdate: () => frame(state.p),
      scrollTrigger: {
        trigger: pin,
        start: 'top top',
        end: () => `+=${Math.round(window.innerHeight * (isMobile() ? 2.4 : 2))}`,
        pin: true,
        scrub: 0.6,
        anticipatePin: 1,
        invalidateOnRefresh: true,
        onRefresh: () => window.dispatchEvent(new Event('fil:relayout')),
      },
    });
    window.dispatchEvent(new Event('fil:relayout'));
  });
}

/** Version sans épinglage : la démo se joue une fois, quand on arrive dessus. */
function playOnce(section: HTMLElement, frame: (p: number) => void) {
  const map = section.querySelector('.tour-map')!;
  const io = new IntersectionObserver(
    (entries) => {
      if (!entries.some((e) => e.isIntersecting)) return;
      io.disconnect();
      const duration = 6500;
      const start = performance.now();
      const step = (now: number) => {
        const p = clamp((now - start) / duration);
        frame(p);
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    },
    { threshold: 0.55 },
  );
  io.observe(map);
}
