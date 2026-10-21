import { defaultAppName, modules, swatches, type AtelierChoice } from '../../lib/atelier';
import { clamp, smoothstep } from '../../lib/geometry';
import { iconPaths } from '../../lib/icons';

/**
 * L'écran du téléphone de l'atelier, dessiné à la main sur un canvas.
 * Le même dessin sert de texture au téléphone 3D et d'écran au téléphone en CSS.
 */
export const SCREEN_W = 390;
export const SCREEN_H = 844;
const SCALE = 2;

const SERIF = "'Instrument Serif', Georgia, serif";
const SANS = "'Inter Variable', 'Inter', system-ui, sans-serif";
const INK = '#1c2333';
const MUTED = '#737c90';

interface Card {
  id: string;
  x: number;
  y: number;
  born: number;
  leaving: number;
}

type RGB = [number, number, number];
const hexToRgb = (hex: string): RGB => {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const rgb = (c: RGB, a = 1) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
const tint = (c: RGB, k: number): RGB => [
  c[0] + (255 - c[0]) * k,
  c[1] + (255 - c[1]) * k,
  c[2] + (255 - c[2]) * k,
];

export class Screen {
  readonly canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private cards = new Map<string, Card>();
  private color: RGB = hexToRgb(swatches[0]!.hex);
  private targetColor: RGB = this.color;
  private name = defaultAppName;
  private icons = new Map<string, Path2D>();
  private onFrame: () => void;
  private raf = 0;
  private stitchStart = 0;

  constructor(onFrame: () => void) {
    this.onFrame = onFrame;
    this.canvas = document.createElement('canvas');
    this.canvas.width = SCREEN_W * SCALE;
    this.canvas.height = SCREEN_H * SCALE;
    this.ctx = this.canvas.getContext('2d')!;
    for (const [k, d] of Object.entries(iconPaths)) this.icons.set(k, new Path2D(d));
  }

  set(choice: AtelierChoice) {
    const now = performance.now();
    const wanted = new Set(choice.modules);
    for (const [id, card] of this.cards) {
      if (!wanted.has(id) && !card.leaving) card.leaving = now;
    }
    choice.modules.forEach((id, i) => {
      const existing = this.cards.get(id);
      if (existing && !existing.leaving) return;
      const slot = this.slot(i);
      this.cards.set(id, { id, x: slot.x, y: slot.y, born: now + 60, leaving: 0 });
    });
    this.order = choice.modules.slice();
    const hex = swatches.find((s) => s.id === choice.color)?.hex ?? swatches[0]!.hex;
    this.targetColor = hexToRgb(hex);
    this.name = choice.name.trim() || defaultAppName;
    this.play();
  }

  private order: string[] = [];

  /** Quelques secondes de « couture » autour de l'écran, quand on veut attirer l'œil. */
  stitch() {
    this.stitchStart = performance.now();
    this.play();
  }

  private slot(i: number) {
    const col = i % 2;
    const row = Math.floor(i / 2);
    return { x: 24 + col * (164 + 14), y: 232 + row * (122 + 12) };
  }

  play() {
    if (this.raf) return;
    const loop = () => {
      const busy = this.draw(performance.now());
      this.onFrame();
      this.raf = busy ? requestAnimationFrame(loop) : 0;
    };
    this.raf = requestAnimationFrame(loop);
  }

  dispose() {
    cancelAnimationFrame(this.raf);
  }

  /** Dessine l'écran. Renvoie `true` tant qu'une animation est en cours. */
  draw(now: number): boolean {
    const { ctx } = this;
    let busy = false;
    ctx.setTransform(SCALE, 0, 0, SCALE, 0, 0);

    // Couleur : glisse doucement vers la nouvelle teinte.
    const next = this.color.map((v, i) => v + (this.targetColor[i]! - v) * 0.16) as RGB;
    if (next.some((v, i) => Math.abs(v - this.targetColor[i]!) > 0.6)) busy = true;
    this.color = next;
    const accent = this.color;
    const soft = tint(accent, 0.86);

    ctx.fillStyle = '#fcfbf8';
    ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);

    // Barre d'état et îlot
    ctx.fillStyle = INK;
    ctx.font = `600 15px ${SANS}`;
    ctx.textBaseline = 'alphabetic';
    ctx.fillText('9:41', 36, 36);
    roundRect(ctx, 316, 24, 28, 13, 4);
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    roundRect(ctx, 318.5, 26.5, 20, 8, 2.5);
    ctx.fill();
    for (let i = 0; i < 3; i++) {
      roundRect(ctx, 288 + i * 6, 34 - (4 + i * 3), 4, 4 + i * 3, 1.2);
      ctx.fill();
    }
    ctx.fillStyle = '#0b1122';
    roundRect(ctx, SCREEN_W / 2 - 62, 12, 124, 36, 18);
    ctx.fill();

    // En-tête de l'application
    ctx.fillStyle = rgb(accent);
    roundRect(ctx, 24, 74, 46, 46, 14);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = `400 30px ${SERIF}`;
    ctx.textAlign = 'center';
    ctx.fillText(this.name.charAt(0).toUpperCase(), 47, 107);
    ctx.textAlign = 'left';
    ctx.fillStyle = INK;
    ctx.font = `400 27px ${SERIF}`;
    ctx.fillText(fit(ctx, this.name, 230), 84, 97);
    ctx.fillStyle = MUTED;
    ctx.font = `500 13px ${SANS}`;
    ctx.fillText('Votre application', 84, 117);
    ctx.fillStyle = rgb(soft);
    circle(ctx, 344, 97, 21);
    ctx.fill();
    ctx.fillStyle = rgb(accent);
    ctx.font = `700 15px ${SANS}`;
    ctx.textAlign = 'center';
    ctx.fillText('V', 344, 102);
    ctx.textAlign = 'left';

    ctx.fillStyle = INK;
    ctx.font = `400 40px ${SERIF}`;
    ctx.fillText('Bonjour !', 24, 182);
    ctx.fillStyle = MUTED;
    ctx.font = `500 15px ${SANS}`;
    ctx.fillText('Mardi 14 octobre · belle journée en vue', 24, 208);

    // Cartes des modules
    const visible = [...this.cards.values()];
    if (!this.order.length && !visible.some((c) => !c.leaving || now - c.leaving < 300)) {
      this.empty(ctx, accent);
    }
    this.order.forEach((id, i) => {
      const card = this.cards.get(id);
      if (!card) return;
      const slot = this.slot(i);
      card.x += (slot.x - card.x) * 0.2;
      card.y += (slot.y - card.y) * 0.2;
      if (Math.abs(slot.x - card.x) + Math.abs(slot.y - card.y) > 0.4) busy = true;
    });
    for (const card of visible) {
      const mod = modules.find((m) => m.id === card.id)!;
      let appear = clamp((now - card.born) / 900);
      if (card.leaving) {
        appear = 1 - clamp((now - card.leaving) / 260);
        if (appear <= 0) {
          this.cards.delete(card.id);
          continue;
        }
      }
      if (appear < 1) busy = true;
      this.card(ctx, card, mod, appear, accent, soft, !!card.leaving);
    }

    // Barre d'onglets
    const barY = SCREEN_H - 96;
    ctx.fillStyle = 'rgba(252,251,248,0.96)';
    ctx.fillRect(0, barY, SCREEN_W, 96);
    ctx.fillStyle = '#ebe8e1';
    ctx.fillRect(0, barY, SCREEN_W, 1);
    const tabs = ['home', ...this.order.slice(0, 3).map((id) => modules.find((m) => m.id === id)!.icon)];
    while (tabs.length < 4) tabs.push('settings');
    tabs.forEach((icon, i) => {
      const cx = ((i + 0.5) * SCREEN_W) / tabs.length;
      if (i === 0) {
        ctx.fillStyle = rgb(soft);
        roundRect(ctx, cx - 26, barY + 12, 52, 36, 14);
        ctx.fill();
      }
      this.icon(ctx, icon, cx - 12, barY + 18, 24, i === 0 ? rgb(accent) : '#a3a9b6', 1.8);
    });
    ctx.fillStyle = INK;
    roundRect(ctx, SCREEN_W / 2 - 68, SCREEN_H - 14, 136, 5, 3);
    ctx.fill();

    // Couture autour de l'écran
    const s = (now - this.stitchStart) / 1600;
    if (this.stitchStart && s < 1.2) {
      busy = true;
      this.stitchFrame(ctx, clamp(s), accent);
    }
    return busy;
  }

  private card(
    ctx: CanvasRenderingContext2D,
    card: Card,
    mod: (typeof modules)[number],
    appear: number,
    accent: RGB,
    soft: RGB,
    leaving: boolean,
  ) {
    const w = 164;
    const h = 122;
    const { x, y } = card;
    const sew = leaving ? 1 : smoothstep(appear / 0.6);
    const fill = leaving ? appear : smoothstep((appear - 0.35) / 0.65);
    ctx.save();
    if (leaving) {
      ctx.globalAlpha = appear;
      ctx.translate(x + w / 2, y + h / 2);
      ctx.scale(0.92 + 0.08 * appear, 0.92 + 0.08 * appear);
      ctx.translate(-x - w / 2, -y - h / 2);
    }
    // Fond qui apparaît une fois la carte « cousue »
    ctx.globalAlpha = (leaving ? appear : 1) * fill;
    ctx.fillStyle = rgb(soft);
    roundRect(ctx, x, y, w, h, 22);
    ctx.fill();
    ctx.globalAlpha = leaving ? appear : 1;

    // Point de couture qui fait le tour de la carte
    if (!leaving && sew < 1) {
      const per = perimeter(w, h);
      ctx.setLineDash([6, 6]);
      ctx.lineDashOffset = 0;
      ctx.strokeStyle = rgb(accent, 0.9);
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      tracePartial(ctx, x, y, w, h, 22, sew * per);
      ctx.stroke();
      ctx.setLineDash([]);
      const p = pointOn(x, y, w, h, sew * per);
      ctx.fillStyle = '#e0a54a';
      circle(ctx, p.x, p.y, 5);
      ctx.fill();
    }

    ctx.globalAlpha = (leaving ? appear : 1) * fill;
    ctx.fillStyle = '#fff';
    roundRect(ctx, x + 14, y + 14, 38, 38, 12);
    ctx.fill();
    this.icon(ctx, mod.icon, x + 22, y + 22, 22, rgb(accent), 1.8);
    ctx.fillStyle = MUTED;
    ctx.font = `600 13px ${SANS}`;
    ctx.fillText(mod.label, x + 16, y + 76);
    ctx.fillStyle = INK;
    ctx.font = `700 19px ${SANS}`;
    ctx.fillText(fit(ctx, mod.value, w - 30), x + 16, y + 100);
    ctx.restore();
  }

  private empty(ctx: CanvasRenderingContext2D, accent: RGB) {
    ctx.save();
    ctx.setLineDash([7, 7]);
    ctx.strokeStyle = rgb(accent, 0.6);
    ctx.lineWidth = 1.6;
    roundRect(ctx, 24, 232, SCREEN_W - 48, 200, 24);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = MUTED;
    ctx.textAlign = 'center';
    ctx.font = `400 26px ${SERIF}`;
    ctx.fillText('Tout commence ici.', SCREEN_W / 2, 322);
    ctx.font = `500 14px ${SANS}`;
    ctx.fillText('Choisissez ce qui vous prend du temps.', SCREEN_W / 2, 350);
    ctx.textAlign = 'left';
    ctx.restore();
  }

  private stitchFrame(ctx: CanvasRenderingContext2D, s: number, accent: RGB) {
    const inset = 8;
    const w = SCREEN_W - inset * 2;
    const h = SCREEN_H - inset * 2;
    const per = perimeter(w, h);
    ctx.save();
    ctx.globalAlpha = 1 - smoothstep((s - 0.85) / 0.15);
    ctx.setLineDash([8, 8]);
    ctx.strokeStyle = rgb(accent, 0.8);
    ctx.lineWidth = 2;
    ctx.beginPath();
    tracePartial(ctx, inset, inset, w, h, 44, smoothstep(s) * per);
    ctx.stroke();
    ctx.restore();
  }

  private icon(
    ctx: CanvasRenderingContext2D,
    name: string,
    x: number,
    y: number,
    size: number,
    color: string,
    width: number,
  ) {
    const path = this.icons.get(name);
    if (!path) return;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(size / 24, size / 24);
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke(path);
    ctx.restore();
  }
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

function circle(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
}

function fit(ctx: CanvasRenderingContext2D, text: string, max: number) {
  if (ctx.measureText(text).width <= max) return text;
  let t = text;
  while (t.length > 1 && ctx.measureText(`${t}…`).width > max) t = t.slice(0, -1);
  return `${t}…`;
}

/** Périmètre d'un rectangle (les coins arrondis sont approchés, c'est invisible à l'œil). */
const perimeter = (w: number, h: number) => 2 * (w + h);

/** Point situé à `d` le long du contour, en partant du milieu du bord haut, dans le sens horaire. */
function pointOn(x: number, y: number, w: number, h: number, d: number) {
  const per = perimeter(w, h);
  let t = (((d + w / 2) % per) + per) % per;
  if (t < w) return { x: x + t, y };
  t -= w;
  if (t < h) return { x: x + w, y: y + t };
  t -= h;
  if (t < w) return { x: x + w - t, y: y + h };
  t -= w;
  return { x, y: y + h - t };
}

/** Trace le contour arrondi depuis le milieu du bord haut, jusqu'à la longueur `d`. */
function tracePartial(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  d: number,
) {
  const steps = 120;
  const per = perimeter(w, h);
  const n = Math.max(2, Math.round((steps * d) / per));
  for (let i = 0; i <= n; i++) {
    const p = pointOn(x, y, w, h, (d * i) / n);
    const q = roundCorner(p, x, y, w, h, r);
    if (i === 0) ctx.moveTo(q.x, q.y);
    else ctx.lineTo(q.x, q.y);
  }
}

/** Ramène un point du rectangle sur le contour arrondi (pour les coins). */
function roundCorner(p: { x: number; y: number }, x: number, y: number, w: number, h: number, r: number) {
  const cx = Math.min(Math.max(p.x, x + r), x + w - r);
  const cy = Math.min(Math.max(p.y, y + r), y + h - r);
  const dx = p.x - cx;
  const dy = p.y - cy;
  const len = Math.hypot(dx, dy);
  if (len === 0 || Math.abs(dx) < 1e-6 || Math.abs(dy) < 1e-6) return p;
  return { x: cx + (dx / len) * r, y: cy + (dy / len) * r };
}
