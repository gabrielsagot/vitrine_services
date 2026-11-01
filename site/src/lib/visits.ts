/**
 * Suivi des visites : mise en forme des envois de `public/visites.js` en lignes de `visit_events`.
 * Calcul pur (testé) ; l'enregistrement est fait par `pages/api/collect.ts`.
 */

export const SITES = ['portfolio', 'vitrine', 'equicare', 'dram'] as const;
export type Site = (typeof SITES)[number];

const TYPES = ['pageview', 'leave', 'event', 'click', 'error', 'session'] as const;

/** Adresses d'où un envoi est accepté, pour chaque site (en plus de localhost, pour les essais). */
export const ORIGINS: Record<Site, string[]> = {
  portfolio: ['gabrielsagot.github.io'],
  vitrine: ['gabrielsagot.vercel.app'],
  equicare: ['equi-care-app.vercel.app', 'app-equicare.vercel.app', 'horse-planner-plum.vercel.app'],
  dram: ['dram-one.vercel.app'],
};

export function originAllowed(site: Site, origin: string | null): boolean {
  if (!origin) return true; // sendBeacon depuis la même adresse, ou ancien navigateur
  let host: string;
  try {
    host = new URL(origin).hostname;
  } catch {
    return false;
  }
  if (host === 'localhost' || host === '127.0.0.1') return true;
  // Aperçus Vercel de chaque projet (adresse en …-gabriels-projects-….vercel.app)
  if (host.endsWith('-gabriels-projects-e0c9ddae.vercel.app')) return true;
  return ORIGINS[site].includes(host);
}

export interface Agent {
  browser: string;
  browser_version: string;
  os: string;
  os_version: string;
  device_type: 'mobile' | 'tablet' | 'desktop' | 'bot' | 'unknown';
}

const BOT =
  /bot|crawler|spider|crawling|headless|lighthouse|facebookexternalhit|slurp|bingpreview|embedly|quora link|vkshare|telegrambot|discordbot|twitterbot|linkedinbot|pinterest|google-inspectiontool|chrome-lighthouse|curl|wget|python-requests|httpclient/i;

/** Lecture simple du navigateur, du système et du type d'appareil (sans dépendance). */
export function parseAgent(ua: string): Agent {
  const out: Agent = { browser: '', browser_version: '', os: '', os_version: '', device_type: 'unknown' };
  if (!ua) return out;
  if (BOT.test(ua)) out.device_type = 'bot';

  const os: [RegExp, string, (m: RegExpMatchArray) => string][] = [
    [/iPhone OS (\d+[_.]\d+)/, 'iOS', (m) => (m[1] ?? '').replace('_', '.')],
    [/iPad.*OS (\d+[_.]\d+)/, 'iPadOS', (m) => (m[1] ?? '').replace('_', '.')],
    [/Android (\d+(?:\.\d+)?)/, 'Android', (m) => m[1] ?? ''],
    [
      /Windows NT (\d+\.\d+)/,
      'Windows',
      (m) => ({ '10.0': '10/11', '6.3': '8.1', '6.1': '7' })[m[1] ?? ''] ?? m[1] ?? '',
    ],
    [/Mac OS X (\d+[_.]\d+)/, 'macOS', (m) => (m[1] ?? '').replace('_', '.')],
    [/CrOS/, 'ChromeOS', () => ''],
    [/Linux/, 'Linux', () => ''],
  ];
  for (const [re, name, version] of os) {
    const m = ua.match(re);
    if (m) {
      out.os = name;
      out.os_version = version(m);
      break;
    }
  }

  const browsers: [RegExp, string][] = [
    [/SamsungBrowser\/(\d+)/, 'Samsung Internet'],
    [/EdgA?\/(\d+)/, 'Edge'],
    [/OPR\/(\d+)/, 'Opera'],
    [/FBAN|FBAV\/(\d+)/, 'Facebook'],
    [/Instagram (\d+)/, 'Instagram'],
    [/CriOS\/(\d+)/, 'Chrome'],
    [/FxiOS\/(\d+)/, 'Firefox'],
    [/Firefox\/(\d+)/, 'Firefox'],
    [/Chrome\/(\d+)/, 'Chrome'],
    [/Version\/(\d+(?:\.\d+)?).*Safari/, 'Safari'],
  ];
  for (const [re, name] of browsers) {
    const m = ua.match(re);
    if (m) {
      out.browser = name;
      out.browser_version = m[1] ?? '';
      break;
    }
  }

  if (out.device_type !== 'bot') {
    if (/iPad|Tablet|Android(?!.*Mobile)/i.test(ua)) out.device_type = 'tablet';
    else if (/Mobi|iPhone|Android/i.test(ua)) out.device_type = 'mobile';
    else if (out.os) out.device_type = 'desktop';
  }
  return out;
}

export interface Geo {
  country: string | null;
  region: string | null;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
}

/** Lieu approximatif donné par Vercel (en-têtes x-vercel-ip-*). */
export function geoFrom(headers: Headers): Geo {
  const text = (name: string) => {
    const v = headers.get(name);
    if (!v) return null;
    try {
      return decodeURIComponent(v).slice(0, 120);
    } catch {
      return v.slice(0, 120);
    }
  };
  const num = (name: string) => {
    const v = Number(headers.get(name));
    return Number.isFinite(v) && headers.get(name) ? v : null;
  };
  return {
    country: text('x-vercel-ip-country'),
    region: text('x-vercel-ip-country-region'),
    city: text('x-vercel-ip-city'),
    latitude: num('x-vercel-ip-latitude'),
    longitude: num('x-vercel-ip-longitude'),
  };
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const str = (v: unknown, max: number) => (typeof v === 'string' && v ? v.slice(0, max) : null);
const int = (v: unknown, min: number, max: number) =>
  typeof v === 'number' && Number.isFinite(v) ? Math.max(min, Math.min(max, Math.round(v))) : null;
const id = (v: unknown) => (typeof v === 'string' && UUID.test(v) ? v : null);

function hostOf(url: string | null): string | null {
  if (!url) return null;
  try {
    return new URL(url).hostname.slice(0, 255) || null;
  } catch {
    return null;
  }
}

/** Propriétés libres : un objet plat et petit (au plus 40 clés, valeurs courtes). */
function cleanProps(v: unknown): Record<string, unknown> {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return {};
  const out: Record<string, unknown> = {};
  for (const [k, value] of Object.entries(v as Record<string, unknown>).slice(0, 40)) {
    const key = k.slice(0, 40);
    if (typeof value === 'string') out[key] = value.slice(0, 500);
    else if (typeof value === 'number' || typeof value === 'boolean' || value === null) out[key] = value;
    else if (Array.isArray(value))
      out[key] = value.slice(0, 20).map((x) => (typeof x === 'string' ? x.slice(0, 100) : x));
  }
  return out;
}

export interface Batch {
  site: Site;
  rows: Record<string, unknown>[];
}

/**
 * Transforme un envoi du navigateur en lignes prêtes à insérer.
 * `null` si l'envoi est mal formé (il est alors ignoré sans rien dire).
 */
export function toRows(
  body: unknown,
  meta: { userAgent: string; geo: Geo; ipHash: string | null },
): Batch | null {
  if (!body || typeof body !== 'object') return null;
  const b = body as Record<string, unknown>;
  const site = b.site as Site;
  if (!SITES.includes(site)) return null;
  if (!Array.isArray(b.events) || !b.events.length) return null;

  const ctx = (b.ctx && typeof b.ctx === 'object' ? b.ctx : {}) as Record<string, unknown>;
  const agent = parseAgent(meta.userAgent);
  const bot = agent.device_type === 'bot' || ctx.bot === true;
  const common = {
    site,
    visitor_id: id(b.vid),
    session_id: id(b.sid),
    visit_number: int(b.n, 0, 100000),
    from_session: id(b.from),
    ...meta.geo,
    user_agent: meta.userAgent.slice(0, 600) || null,
    browser: agent.browser || null,
    browser_version: agent.browser_version || null,
    os: agent.os || null,
    os_version: str(ctx.osv, 40) ?? (agent.os_version || null),
    device_type: bot ? 'bot' : agent.device_type,
    device_model: str(ctx.model, 80),
    screen_w: int(ctx.sw, 0, 30000),
    screen_h: int(ctx.sh, 0, 30000),
    viewport_w: int(ctx.vw, 0, 30000),
    viewport_h: int(ctx.vh, 0, 30000),
    pixel_ratio: typeof ctx.dpr === 'number' && Number.isFinite(ctx.dpr) ? Math.min(10, ctx.dpr) : null,
    language: str(ctx.lang, 35),
    languages: str(ctx.langs, 200),
    timezone: str(ctx.tz, 60),
    installed: typeof ctx.installed === 'boolean' ? ctx.installed : null,
    is_bot: bot,
    ip_hash: meta.ipHash,
  };

  const rows: Record<string, unknown>[] = [];
  for (const raw of b.events.slice(0, 50)) {
    if (!raw || typeof raw !== 'object') continue;
    const e = raw as Record<string, unknown>;
    const type = e.type as (typeof TYPES)[number];
    if (!TYPES.includes(type)) continue;
    const at = typeof e.at === 'string' ? new Date(e.at) : null;
    const referrer = str(e.referrer, 1000);
    rows.push({
      ...common,
      client_at: at && !Number.isNaN(at.getTime()) ? at.toISOString() : null,
      type,
      name: str(e.name, 120),
      path: str(e.path, 500),
      search: str(e.search, 1000),
      title: str(e.title, 300),
      referrer,
      referrer_host: hostOf(referrer),
      utm_source: str(e.utm_source, 200),
      utm_medium: str(e.utm_medium, 200),
      utm_campaign: str(e.utm_campaign, 200),
      utm_content: str(e.utm_content, 200),
      utm_term: str(e.utm_term, 200),
      engaged_ms: int(e.engaged_ms, 0, 24 * 3600 * 1000),
      scroll_pct: int(e.scroll_pct, 0, 100),
      props: cleanProps(e.props),
    });
  }
  return rows.length ? { site, rows } : null;
}
