import { describe, expect, it } from 'vitest';
import { geoFrom, originAllowed, parseAgent, toRows } from './visits';

const iphone =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1';
const android =
  'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Mobile Safari/537.36';
const mac =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36';

describe('suivi des visites', () => {
  it('reconnaît le navigateur, le système et l’appareil', () => {
    expect(parseAgent(iphone)).toMatchObject({
      browser: 'Safari',
      os: 'iOS',
      os_version: '17.4',
      device_type: 'mobile',
    });
    expect(parseAgent(android)).toMatchObject({ browser: 'Chrome', os: 'Android', device_type: 'mobile' });
    expect(parseAgent(mac)).toMatchObject({ browser: 'Chrome', os: 'macOS', device_type: 'desktop' });
    expect(parseAgent('Googlebot/2.1 (+http://www.google.com/bot.html)').device_type).toBe('bot');
  });

  it('lit le lieu donné par Vercel', () => {
    const h = new Headers({
      'x-vercel-ip-country': 'FR',
      'x-vercel-ip-country-region': 'NAQ',
      'x-vercel-ip-city': 'Niort',
      'x-vercel-ip-latitude': '46.32',
    });
    expect(geoFrom(h)).toEqual({
      country: 'FR',
      region: 'NAQ',
      city: 'Niort',
      latitude: 46.32,
      longitude: null,
    });
  });

  it("n'accepte un site que depuis ses propres adresses", () => {
    expect(originAllowed('portfolio', 'https://gabrielsagot.github.io')).toBe(true);
    expect(originAllowed('portfolio', 'https://dram-one.vercel.app')).toBe(false);
    expect(originAllowed('dram', 'http://localhost:5173')).toBe(true);
    expect(originAllowed('equicare', null)).toBe(true);
  });

  it('transforme un envoi en lignes propres', () => {
    const vid = '11111111-1111-4111-8111-111111111111';
    const batch = toRows(
      {
        site: 'portfolio',
        vid,
        sid: 'pas-un-uuid',
        n: 3,
        ctx: { sw: 390, sh: 844, dpr: 3, lang: 'fr-FR', tz: 'Europe/Paris', bot: false },
        events: [
          {
            type: 'pageview',
            path: '/Portfolio_pro/index.html',
            referrer: 'https://www.linkedin.com/feed/',
            utm_source: 'cv',
          },
          {
            type: 'click',
            name: 'Voir EquiCare',
            props: { href: 'https://equi-care-app.vercel.app', nested: { x: 1 } },
          },
          { type: 'inconnu' },
        ],
      },
      { userAgent: iphone, geo: geoFrom(new Headers()), ipHash: 'abc' },
    );
    expect(batch?.rows).toHaveLength(2);
    const [pv, click] = batch!.rows;
    expect(pv).toMatchObject({
      site: 'portfolio',
      visitor_id: vid,
      session_id: null,
      visit_number: 3,
      referrer_host: 'www.linkedin.com',
      utm_source: 'cv',
      device_type: 'mobile',
      screen_w: 390,
      timezone: 'Europe/Paris',
      is_bot: false,
    });
    expect(click!.props).toEqual({ href: 'https://equi-care-app.vercel.app' });
  });

  it('ignore les envois mal formés et repère les robots', () => {
    expect(
      toRows(
        { site: 'autre', events: [{ type: 'pageview' }] },
        { userAgent: '', geo: geoFrom(new Headers()), ipHash: null },
      ),
    ).toBeNull();
    expect(
      toRows({ site: 'dram', events: [] }, { userAgent: '', geo: geoFrom(new Headers()), ipHash: null }),
    ).toBeNull();
    const bot = toRows(
      { site: 'dram', ctx: { bot: true }, events: [{ type: 'pageview' }] },
      { userAgent: mac, geo: geoFrom(new Headers()), ipHash: null },
    );
    expect(bot!.rows[0]).toMatchObject({ is_bot: true, device_type: 'bot' });
  });
});
