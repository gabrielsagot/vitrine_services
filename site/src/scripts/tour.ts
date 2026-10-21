import { indexAt, strokePath } from '../lib/calligraphy';
import { clamp, dist, easeInOut, lerp, smoothstep, type Pt } from '../lib/geometry';
import { getTier, prefersReduced } from '../lib/tier';
import { bestPoints, messyPoints, routeStroke, tourModel } from '../lib/tour-render';

/**
 * Démo « Votre journée, démêlée ».
 * 1. Les demandes arrivées dans le désordre forment un fil emmêlé ; les nœuds se défont.
 * 2. Le bon trajet se trace d'arrêt en arrêt, pendant que l'ancien s'efface.
 * 3. Le planning de la journée se range, et la perle parcourt la journée.
 *
 * - Appareils capables : la section reste à l'écran et le défilement pilote la démo.
 * - Appareils modestes : la démo se joue d'elle-même quand elle apparaît.
 * - « Réduire les animations » : on montre directement la journée prête (rendu serveur).
 */
export function initTour() {
  const section = document.querySelector<HTMLElement>('#demo-tournee');
  if (!section || prefersReduced()) return;

  const pin = section.querySelector<HTMLElement>('[data-tour]')!;
  const route = section.querySelector<SVGPathElement>('[data-route]')!;
  const messy = section.querySelector<SVGPathElement>('[data-route-messy]')!;
  const km = section.querySelector<HTMLElement>('[data-km]')!;
  const kmLine = section.querySelector<HTMLElement>('.tour-km')!;
  const captionsBox = section.querySelector<HTMLElement>('.tour-captions')!;
  const mapSvg = section.querySelector<SVGSVGElement>('.tour-map svg')!;
  const plan = section.querySelector<HTMLElement>('[data-plan]')!;
  const slot = section.querySelector<HTMLElement>('.plan-slot');
  const traveller = section.querySelector<SVGGElement>('[data-traveller]')!;
  const captions = [...section.querySelectorAll<HTMLElement>('[data-phase]')];
  const rows = [...section.querySelectorAll<HTMLElement>('[data-row]')];
  const stopEls = new Map(
    [...section.querySelectorAll<SVGGElement>('[data-stop]')].map((g) => [g.dataset['stop']!, g]),
  );

  const model = tourModel();
  const messyKm = Number(pin.dataset['messyKm']);
  const bestKm = Number(pin.dataset['bestKm']);

  // Le meilleur trajet, calculé une fois : on en dessine une partie de plus en plus longue.
  const best = routeStroke(bestPoints(model));
  const bestFull = strokePath(best);
  const total = best.length;
  const pointAt = (f: number): Pt => best.points[indexAt(best, clamp(f) * total)]!;
  const arrivals = model.best.order.map((stop) => {
    let at = 0;
    let closest = Infinity;
    best.points.forEach((p, i) => {
      const d = dist(p, stop);
      if (d < closest) {
        closest = d;
        at = best.along[i]! / total;
      }
    });
    return { id: stop.id, at };
  });

  const isMobile = () => window.matchMedia('(max-width: 959px)').matches;
  const pinned = () => section.classList.contains('tour-pinned');

  let lastKnot = -1;
  let lastDraw = -1;
  let lastCaption = -1;

  const tangle = (knot: number, fade: number) => {
    if (Math.abs(knot - lastKnot) > 0.002) {
      lastKnot = knot;
      messy.setAttribute('d', strokePath(routeStroke(messyPoints(model, knot))));
    }
    messy.style.opacity = String(fade);
  };

  const draw = (d: number) => {
    if (Math.abs(d - lastDraw) < 0.0015 && d !== 0 && d !== 1) return;
    lastDraw = d;
    route.setAttribute('d', d >= 1 ? bestFull : d <= 0 ? '' : strokePath(best, indexAt(best, d * total)));
    km.textContent = String(Math.round(lerp(messyKm, bestKm, easeInOut(d))));
    model.best.order.forEach((stop, i) => {
      const reached = d > 0 && d >= arrivals[i]!.at - 0.012;
      stopEls.get(stop.id)?.querySelector('.stop-badge')?.classList.toggle('is-in', reached);
    });
  };

  const caption = (i: number) => {
    if (i === lastCaption) return;
    lastCaption = i;
    captions.forEach((c, k) => c.classList.toggle('is-on', k === i));
  };

  /** La perle : elle trace le trajet (étape 2), puis parcourt la journée (étape 3). */
  const pearl = (d: number, q: number) => {
    const tracing = d > 0 && d < 1;
    const touring = q > 0 && q < 1;
    if (!tracing && !touring) {
      traveller.style.opacity = '0';
    } else {
      const p = pointAt(tracing ? d : q);
      traveller.style.opacity = '1';
      traveller.setAttribute('transform', `translate(${p.x.toFixed(1)} ${p.y.toFixed(1)})`);
    }
    let current = '';
    arrivals.forEach(({ id, at }, k) => {
      const reached = q > 0 && q >= at - 0.015;
      stopEls.get(id)?.classList.toggle('is-visited', reached);
      rows[k]?.classList.toggle('is-in', q > 0 && (k === 0 || reached));
      if (reached) current = id;
    });
    rows.forEach((r) => r.classList.toggle('is-current', q < 1 && r.dataset['row'] === current));
  };

  // Sur téléphone, la carte remonte et se resserre pour rester visible au-dessus du planning.
  let fit = { dy: 0, k: 1 };
  const measure = () => {
    mapSvg.style.transform = '';
    if (!isMobile() || !pinned()) {
      fit = { dy: 0, k: 1 };
      return;
    }
    const top = pin.getBoundingClientRect().top;
    const capBottom = captionsBox.getBoundingClientRect().bottom - top;
    const svg = mapSvg.getBoundingClientRect();
    const sheetTop = pin.clientHeight - 12 - plan.offsetHeight;
    const k = Math.min(1, Math.max(0.55, (sheetTop - capBottom - 12) / svg.height));
    fit = { dy: capBottom + 6 - (svg.top - top), k };
  };

  const sheet = (s: number) => {
    const e = easeInOut(s);
    if (!isMobile()) {
      if (slot) slot.style.opacity = String(1 - e);
      plan.style.opacity = String(e);
      plan.style.transform = `translateX(${(1 - e) * 24}px)`;
      return;
    }
    if (!pinned()) {
      plan.style.transform = '';
      return;
    }
    plan.style.transform = `translateY(calc(${(1 - e) * 100}% + ${(1 - s) * 24}px))`;
    mapSvg.style.transformOrigin = '50% 0';
    mapSvg.style.transform = `translateY(${(fit.dy * e).toFixed(1)}px) scale(${(1 + (fit.k - 1) * e).toFixed(3)})`;
    kmLine.style.opacity = String(1 - e);
  };

  /** Toute la démo pour une progression de 0 à 1. */
  const frame = (p: number) => {
    caption(p < 0.08 ? 0 : p < 0.56 ? 1 : 2);
    const knot = 1 - smoothstep((p - 0.06) / 0.22);
    const fade = (1 - 0.86 * smoothstep((p - 0.3) / 0.16)) * (1 - smoothstep((p - 0.56) / 0.06));
    tangle(knot, fade);
    const d = clamp((p - 0.3) / 0.25);
    draw(d);
    sheet(clamp((p - 0.56) / 0.08));
    pearl(d, clamp((p - 0.62) / 0.33));
    section.classList.toggle('tour-done', p > 0.95);
  };

  section.classList.add('tour-live');
  frame(0);

  getTier().then(async (tier) => {
    // Écran court (iPhone SE…) : le planning ne tiendrait pas sous la carte épinglée, on joue la démo telle quelle.
    const shortScreen = isMobile() && window.innerHeight < 700;
    if (tier === 'low' || shortScreen) {
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
        end: () => `+=${Math.round(window.innerHeight * (isMobile() ? 2.6 : 2.2))}`,
        pin: true,
        scrub: 0.6,
        anticipatePin: 1,
        invalidateOnRefresh: true,
        onRefresh: () => {
          measure();
          frame(state.p);
          window.dispatchEvent(new Event('fil:relayout'));
        },
      },
    });
    measure();
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
      const duration = 7000;
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
