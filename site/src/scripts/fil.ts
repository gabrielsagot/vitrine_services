import { buildStroke, strokePath, type Stroke } from '../lib/calligraphy';
import { catmullRom, resample, ringPoints, type Pt } from '../lib/geometry';
import { getTier, prefersReduced } from '../lib/tier';

/**
 * Le fil conducteur : un trait calligraphique qui traverse toute la page.
 * Il passe par des points d'ancrage posés dans les sections (`data-fil="ordre"`),
 * fait le tour de certains éléments (`data-fil-ring`), s'interrompt où il faut (`data-fil-break`)
 * et se dessine au fil du défilement. Bleu nuit sur fond clair, ambre sur fond sombre.
 */

interface Segment {
  stroke: Stroke;
  /** Plus grande hauteur atteinte jusqu'à chaque point : le fil avance avec le défilement. */
  reach: Float32Array;
  el: SVGPathElement;
  drawn: number;
  full: string;
}

const NS = 'http://www.w3.org/2000/svg';

export function initFil() {
  const root = document.querySelector<HTMLElement>('[data-fil-root]');
  const svg = root?.querySelector<SVGSVGElement>('[data-fil-svg]');
  if (!root || !svg) return;

  const group = svg.querySelector<SVGGElement>('[data-fil-paths]')!;
  const gradient = svg.querySelector<SVGLinearGradientElement>('#fil-ink')!;
  const pearl = svg.querySelector<SVGGElement>('[data-fil-pearl]')!;

  let segments: Segment[] = [];
  let rootTop = 0;
  let live = true;
  let queued = false;
  let lastWidth = 0;

  const layout = () => {
    const width = root.offsetWidth;
    const height = root.offsetHeight;
    lastWidth = width;
    rootTop = root.getBoundingClientRect().top + window.scrollY;
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    svg.style.height = `${height}px`;

    paintInk(root, gradient, height);

    const anchors = [...root.querySelectorAll<HTMLElement>('[data-fil]')]
      .filter((el) => el.getClientRects().length > 0 || el.offsetParent !== null)
      .sort((a, b) => Number(a.dataset['fil']) - Number(b.dataset['fil']));

    // Un élément collant (position: sticky) se mesure à sa place d'origine, pas là où le défilement l'a poussé.
    root.classList.add('fil-measuring');
    const places = anchors.map((el) => position(el, root));
    root.classList.remove('fil-measuring');

    const runs: Pt[][] = [];
    let run: Pt[] = [];
    for (const [i, el] of anchors.entries()) {
      const { x, y, w } = places[i]!;
      if (el.hasAttribute('data-fil-break') && run.length) {
        runs.push(run);
        run = [];
      }
      const ring = el.dataset['filRing'];
      const prev = run[run.length - 1];
      if (ring !== undefined && prev) {
        const radius = ring === 'auto' ? w / 2 + 16 : Number(ring);
        run.push(...ringPoints({ x, y }, radius, prev, el.dataset['filCcw'] === undefined, 16));
      } else {
        run.push({ x, y });
      }
    }
    if (run.length) runs.push(run);

    const mobile = width < 720;
    group.replaceChildren();
    segments = runs
      .filter((r) => r.length > 1)
      .map((points) => {
        const line = resample(catmullRom(points, 18), 3);
        const stroke = buildStroke(line, {
          min: mobile ? 1.1 : 1.3,
          max: mobile ? 3.8 : 5.2,
          nib: -0.65,
          taperStart: 60,
          taperEnd: 40,
          taperHead: 34,
        });
        const reach = new Float32Array(line.length);
        let max = -Infinity;
        line.forEach((p, i) => {
          max = Math.max(max, p.y);
          reach[i] = max;
        });
        const el = document.createElementNS(NS, 'path');
        el.setAttribute('fill', 'url(#fil-ink)');
        group.appendChild(el);
        return { stroke, reach, el, drawn: -1, full: strokePath(stroke) };
      });
    update(true);
  };

  const update = (force = false) => {
    queued = false;
    if (!segments.length) return;
    const target = live ? window.scrollY - rootTop + window.innerHeight * 0.68 : Infinity;
    let head: { seg: Segment; index: number } | null = null;
    for (const seg of segments) {
      const n = seg.reach.length;
      const index = target === Infinity ? n - 1 : lastBelow(seg.reach, target);
      if (index !== seg.drawn || force) {
        seg.drawn = index;
        seg.el.setAttribute('d', index >= n - 1 ? seg.full : index > 1 ? strokePath(seg.stroke, index) : '');
      }
      if (index > 1) head = { seg, index };
    }
    placePearl(head);
  };

  const placePearl = (head: { seg: Segment; index: number } | null) => {
    if (!head) {
      pearl.style.opacity = '0';
      return;
    }
    const p = head.seg.stroke.points[head.index]!;
    pearl.style.opacity = '1';
    pearl.setAttribute('transform', `translate(${p.x.toFixed(1)} ${p.y.toFixed(1)})`);
    const last = segments[segments.length - 1]!;
    const atEnd = head.seg === last && head.index >= last.reach.length - 1;
    pearl.classList.toggle('is-awake', atEnd);
  };

  const onScroll = () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => update());
  };

  let timer = 0;
  const relayout = () => {
    window.clearTimeout(timer);
    timer = window.setTimeout(layout, 120);
  };

  getTier().then((tier) => {
    live = tier !== 'low' && !prefersReduced();
    root.classList.add('fil-ready');
    layout();
    if (live) window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('fil:relayout', relayout);
    window.addEventListener('resize', () => {
      if (root.offsetWidth !== lastWidth) relayout();
    });
    if ('ResizeObserver' in window) new ResizeObserver(relayout).observe(root);
    document.fonts?.ready.then(relayout);
  });
}

function lastBelow(reach: Float32Array, target: number): number {
  let lo = -1;
  let hi = reach.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (reach[mid]! <= target) lo = mid;
    else hi = mid - 1;
  }
  return lo;
}

/** Position d'un élément dans le conteneur, sans tenir compte des animations (transform). */
function position(el: HTMLElement, root: HTMLElement) {
  let x = 0;
  let y = 0;
  let node: HTMLElement | null = el;
  while (node && node !== root) {
    x += node.offsetLeft;
    y += node.offsetTop;
    node = node.offsetParent as HTMLElement | null;
  }
  if (node !== root) {
    const r = el.getBoundingClientRect();
    const rr = root.getBoundingClientRect();
    return { x: r.left - rr.left + r.width / 2, y: r.top - rr.top + r.height / 2, w: r.width };
  }
  return { x: x + el.offsetWidth / 2, y: y + el.offsetHeight / 2, w: el.offsetWidth };
}

/** Dégradé à paliers nets : bleu nuit sur fond clair, ambre dans les sections sombres. */
function paintInk(root: HTMLElement, gradient: SVGLinearGradientElement, height: number) {
  gradient.setAttribute('y2', String(height));
  const zones = [...root.querySelectorAll<HTMLElement>('[data-fil-dark]')].map((el) => {
    const { y } = position(el, root);
    const top = y - el.offsetHeight / 2;
    return [top / height, (top + el.offsetHeight) / height] as const;
  });
  const stops: [number, string, number][] = [[0, '#16213e', 0.92]];
  for (const [a, b] of zones) {
    stops.push([a, '#16213e', 0.92], [a, '#e0a54a', 1], [b, '#e0a54a', 1], [b, '#16213e', 0.92]);
  }
  stops.push([1, '#16213e', 0.92]);
  gradient.replaceChildren(
    ...stops.map(([offset, color, opacity]) => {
      const s = document.createElementNS(NS, 'stop');
      s.setAttribute('offset', String(Math.min(1, Math.max(0, offset))));
      s.setAttribute('stop-color', color);
      s.setAttribute('stop-opacity', String(opacity));
      return s;
    }),
  );
}
