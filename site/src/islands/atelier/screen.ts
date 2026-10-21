import { defaultAppName, focusOrder, modules, swatches, type AtelierChoice } from '../../lib/atelier';
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
  w: number;
  h: number;
  born: number;
  leaving: number;
}

interface Row {
  id: string;
  y: number;
  born: number;
  leaving: number;
}

interface Hero {
  label: string;
  main: string;
  sub: string;
  icon: string;
}

// Disposition de l'écran (en points du canvas, 390 × 844).
const HERO_Y = 232;
const HERO_H = 104;
const GRID_TOP = HERO_Y + HERO_H + 16;
const CARD_W = 164;
const GAP = 12;
const BAR_Y = SCREEN_H - 96;
const CONTENT_END = BAR_Y - 14;
const ROW_H = 58;

/** Où tout se place pour `n` modules : cartes en deux colonnes, puis la liste « Aujourd'hui » s'il reste de la place. */
function layoutFor(n: number) {
  const rows = Math.ceil(n / 2);
  const room = CONTENT_END - GRID_TOP;
  const cardH = rows <= 2 ? 122 : Math.max(84, Math.min(122, (room - (rows - 1) * GAP) / rows));
  const gridBottom = GRID_TOP + rows * cardH + Math.max(0, rows - 1) * GAP;
  const listTitle = gridBottom + 32;
  const firstRow = listTitle + 12;
  const maxRows = Math.max(0, Math.floor((CONTENT_END - firstRow) / ROW_H));
  return { cardH, listTitle, firstRow, maxRows };
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
  private rows = new Map<string, Row>();
  private order: string[] = [];
  private color: RGB = hexToRgb(swatches[0]!.hex);
  private targetColor: RGB = this.color;
  private name = defaultAppName;
  private icons = new Map<string, Path2D>();
  private onFrame: () => void;
  private raf = 0;
  private stitchStart = 0;
  private heroShow = 0;
  private heroKey = '';
  private heroSince = 0;
  private listShow = 0;

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
    const n = choice.modules.length;
    choice.modules.forEach((id, i) => {
      const existing = this.cards.get(id);
      if (existing && !existing.leaving) return;
      this.cards.set(id, { id, ...this.slot(i, n), born: now + 60, leaving: 0 });
    });
    this.order = choice.modules.slice();
    const hex = swatches.find((s) => s.id === choice.color)?.hex ?? swatches[0]!.hex;
    this.targetColor = hexToRgb(hex);
    this.name = choice.name.trim() || defaultAppName;
    this.syncRows(now);
    this.play();
  }

  /** Quelques secondes de « couture » autour de l'écran, quand on veut attirer l'œil. */
  stitch() {
    this.stitchStart = performance.now();
    this.play();
  }

  private slot(i: number, n: number) {
    const { cardH } = layoutFor(n);
    if (n === 1) return { x: 24, y: GRID_TOP, w: SCREEN_W - 48, h: cardH };
    const col = i % 2;
    const row = Math.floor(i / 2);
    return { x: 24 + col * (CARD_W + 14), y: GRID_TOP + row * (cardH + GAP), w: CARD_W, h: cardH };
  }

  /** La journée du jour : d'abord ce qui a une heure, dans l'ordre de la journée, puis le reste. */
  private agenda() {
    const items = this.order.map((id) => modules.find((m) => m.id === id)!);
    const minutes = (t?: string) => {
      if (!t) return Infinity;
      const [h, m] = t.split('h');
      return Number(h) * 60 + Number(m || 0);
    };
    return items.sort((a, b) => minutes(a.today.time) - minutes(b.today.time));
  }

  /** Met à jour les lignes de la liste « Aujourd'hui » : celles qui arrivent, celles qui s'en vont. */
  private syncRows(now: number) {
    const { firstRow, maxRows } = layoutFor(this.order.length);
    const shown = this.agenda().slice(0, maxRows);
    const keep = new Set(shown.map((m) => m.id));
    for (const row of this.rows.values()) {
      if (!keep.has(row.id) && !row.leaving) row.leaving = now;
    }
    shown.forEach((m, i) => {
      const row = this.rows.get(m.id);
      if (row && !row.leaving) return;
      this.rows.set(m.id, { id: m.id, y: firstRow + i * ROW_H + 10, born: now + 260 + i * 90, leaving: 0 });
    });
  }

  /** La grande carte de couleur en haut : ce qui compte le plus aujourd'hui, selon les modules choisis. */
  private hero(): Hero | null {
    const id = focusOrder.find((m) => this.order.includes(m));
    const mod = modules.find((m) => m.id === id);
    return mod ? { ...mod.focus, icon: mod.icon } : null;
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

    // Grande carte de couleur
    const hero = this.hero();
    const heroTarget = hero ? 1 : 0;
    this.heroShow += (heroTarget - this.heroShow) * 0.14;
    if (Math.abs(heroTarget - this.heroShow) > 0.004) busy = true;
    else this.heroShow = heroTarget;
    if (hero) {
      const key = hero.main;
      if (key !== this.heroKey) {
        this.heroKey = key;
        this.heroSince = now;
      }
    }
    const textIn = clamp((now - this.heroSince) / 380);
    if (textIn < 1) busy = true;
    if (this.heroShow > 0.01 && (hero || this.heroLast)) {
      this.drawHero(ctx, hero ?? this.heroLast!, this.heroShow, smoothstep(textIn), accent);
    }
    if (hero) this.heroLast = hero;

    // Cartes des modules
    const visible = [...this.cards.values()];
    if (!this.order.length && !visible.some((c) => !c.leaving || now - c.leaving < 300)) {
      this.empty(ctx, accent, 1 - this.heroShow);
    }
    const n = this.order.length;
    this.order.forEach((id, i) => {
      const card = this.cards.get(id);
      if (!card) return;
      const slot = this.slot(i, n);
      card.x += (slot.x - card.x) * 0.2;
      card.y += (slot.y - card.y) * 0.2;
      card.w += (slot.w - card.w) * 0.2;
      card.h += (slot.h - card.h) * 0.2;
      const gap =
        Math.abs(slot.x - card.x) +
        Math.abs(slot.y - card.y) +
        Math.abs(slot.w - card.w) +
        Math.abs(slot.h - card.h);
      if (gap > 0.4) busy = true;
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

    // Liste « Aujourd'hui »
    if (this.drawList(ctx, now, accent, soft)) busy = true;

    // Barre d'onglets
    ctx.fillStyle = 'rgba(252,251,248,0.96)';
    ctx.fillRect(0, BAR_Y, SCREEN_W, 96);
    ctx.fillStyle = '#ebe8e1';
    ctx.fillRect(0, BAR_Y, SCREEN_W, 1);
    const tabs = ['home', ...this.order.slice(0, 3).map((id) => modules.find((m) => m.id === id)!.icon)];
    while (tabs.length < 4) tabs.push('settings');
    tabs.forEach((icon, i) => {
      const cx = ((i + 0.5) * SCREEN_W) / tabs.length;
      if (i === 0) {
        ctx.fillStyle = rgb(soft);
        roundRect(ctx, cx - 26, BAR_Y + 12, 52, 36, 14);
        ctx.fill();
      }
      this.icon(ctx, icon, cx - 12, BAR_Y + 18, 24, i === 0 ? rgb(accent) : '#a3a9b6', 1.8);
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

  private heroLast: Hero | null = null;

  private drawHero(ctx: CanvasRenderingContext2D, hero: Hero, show: number, textIn: number, accent: RGB) {
    const x = 24;
    const w = SCREEN_W - 48;
    const y = HERO_Y + (1 - show) * 14;
    ctx.save();
    ctx.globalAlpha = show;
    ctx.fillStyle = rgb(accent);
    roundRect(ctx, x, y, w, HERO_H, 26);
    ctx.fill();
    // Un reflet discret, pour la profondeur
    ctx.save();
    roundRect(ctx, x, y, w, HERO_H, 26);
    ctx.clip();
    ctx.fillStyle = 'rgba(255,255,255,0.09)';
    circle(ctx, x + w - 34, y + 6, 78);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    circle(ctx, x + w - 34, y + 6, 116);
    ctx.fill();
    ctx.restore();

    ctx.globalAlpha = show * (0.35 + 0.65 * textIn);
    const lift = (1 - textIn) * 6;
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.font = `600 13px ${SANS}`;
    ctx.fillText(hero.label, x + 20, y + 32 + lift);
    ctx.fillStyle = '#fff';
    ctx.font = `400 31px ${SERIF}`;
    ctx.fillText(fit(ctx, hero.main, w - 100), x + 20, y + 68 + lift);
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.font = `500 13px ${SANS}`;
    ctx.fillText(fit(ctx, hero.sub, w - 100), x + 20, y + 90 + lift);

    ctx.globalAlpha = show;
    ctx.fillStyle = '#fff';
    circle(ctx, x + w - 44, y + HERO_H / 2, 25);
    ctx.fill();
    this.icon(ctx, hero.icon, x + w - 56, y + HERO_H / 2 - 12, 24, rgb(accent), 1.9);
    ctx.restore();
  }

  /** Dessine la liste du jour. Renvoie `true` tant qu'une ligne bouge encore. */
  private drawList(ctx: CanvasRenderingContext2D, now: number, accent: RGB, soft: RGB): boolean {
    let busy = false;
    const { listTitle, firstRow, maxRows } = layoutFor(this.order.length);
    const shown = this.agenda().slice(0, maxRows);
    const titleTarget = shown.length ? 1 : 0;
    this.listShow += (titleTarget - this.listShow) * 0.18;
    if (Math.abs(titleTarget - this.listShow) > 0.01) busy = true;
    else this.listShow = titleTarget;
    if (this.listShow > 0.01) {
      ctx.save();
      ctx.globalAlpha = this.listShow;
      ctx.fillStyle = MUTED;
      ctx.font = `700 12px ${SANS}`;
      spaced(ctx, 'AUJOURD’HUI', 24, listTitle, 1.4);
      ctx.restore();
    }
    for (const row of [...this.rows.values()]) {
      const index = shown.findIndex((m) => m.id === row.id);
      let alpha = clamp((now - row.born) / 420);
      if (row.leaving) {
        alpha = Math.min(alpha, 1 - clamp((now - row.leaving) / 220));
        if (alpha <= 0) {
          this.rows.delete(row.id);
          continue;
        }
      }
      const target = index >= 0 ? firstRow + index * ROW_H : row.y;
      row.y += (target - row.y) * 0.2;
      if (Math.abs(target - row.y) > 0.4 || alpha < 1) busy = true;
      const mod = modules.find((m) => m.id === row.id)!;
      this.row(ctx, mod, row.y, smoothstep(alpha), accent, soft, index < shown.length - 1);
    }
    return busy;
  }

  private row(
    ctx: CanvasRenderingContext2D,
    mod: (typeof modules)[number],
    y: number,
    alpha: number,
    accent: RGB,
    soft: RGB,
    divider: boolean,
  ) {
    if (alpha <= 0) return;
    ctx.save();
    ctx.globalAlpha = alpha;
    const { time, title, detail } = mod.today;
    if (time) {
      ctx.fillStyle = INK;
      ctx.font = `700 15px ${SANS}`;
      ctx.fillText(time, 24, y + 25);
    } else {
      ctx.fillStyle = rgb(soft);
      roundRect(ctx, 24, y + 6, 34, 34, 11);
      ctx.fill();
      this.icon(ctx, mod.icon, 31, y + 13, 20, rgb(accent), 1.8);
    }
    ctx.fillStyle = INK;
    ctx.font = `600 15px ${SANS}`;
    ctx.fillText(fit(ctx, title, 220), 84, y + 22);
    ctx.fillStyle = MUTED;
    ctx.font = `500 13px ${SANS}`;
    ctx.fillText(fit(ctx, detail, 230), 84, y + 41);
    ctx.strokeStyle = rgb(accent, 0.55);
    ctx.lineWidth = 1.6;
    circle(ctx, SCREEN_W - 38, y + 24, 10);
    ctx.stroke();
    if (divider) {
      ctx.fillStyle = '#ebe8e1';
      ctx.fillRect(84, y + ROW_H - 4, SCREEN_W - 108, 1);
    }
    ctx.restore();
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
    const { x, y, w, h } = card;
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

    // Contenu : plus serré quand il y a beaucoup de cartes.
    const compact = h < 110;
    const box = compact ? 32 : 38;
    ctx.globalAlpha = (leaving ? appear : 1) * fill;
    ctx.fillStyle = '#fff';
    roundRect(ctx, x + 14, y + 14, box, box, 11);
    ctx.fill();
    this.icon(ctx, mod.icon, x + 14 + (box - 22) / 2, y + 14 + (box - 22) / 2, 22, rgb(accent), 1.8);
    ctx.fillStyle = MUTED;
    ctx.font = `600 13px ${SANS}`;
    ctx.fillText(mod.label, x + 16, y + h - (compact ? 30 : 46));
    ctx.fillStyle = INK;
    ctx.font = `700 19px ${SANS}`;
    ctx.fillText(fit(ctx, mod.value, Math.min(w, CARD_W) - 30), x + 16, y + h - (compact ? 10 : 22));
    if (w > CARD_W + 40) {
      // Carte seule, en pleine largeur : on a la place pour un détail.
      ctx.fillStyle = MUTED;
      ctx.font = `500 13px ${SANS}`;
      ctx.textAlign = 'right';
      ctx.fillText(mod.hint, x + w - 18, y + h - 22);
      ctx.textAlign = 'left';
    }
    ctx.restore();
  }

  private empty(ctx: CanvasRenderingContext2D, accent: RGB, alpha: number) {
    ctx.save();
    ctx.globalAlpha = alpha;
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

/** Texte en petites capitales espacées (ctx.letterSpacing n'existe pas partout). */
function spaced(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, spacing: number) {
  let cx = x;
  for (const ch of text) {
    ctx.fillText(ch, cx, y);
    cx += ctx.measureText(ch).width + spacing;
  }
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
