import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import serifRegular from '@fontsource/instrument-serif/files/instrument-serif-latin-400-normal.woff?inline';
import serifItalic from '@fontsource/instrument-serif/files/instrument-serif-latin-400-italic.woff?inline';
import { pitch, site } from '../../config/site';

const fromDataUrl = (url: string) => Buffer.from(url.slice(url.indexOf(',') + 1), 'base64');

type Node = { type: string; props: Record<string, unknown> & { children?: unknown } };
const h = (
  type: string,
  style: Record<string, unknown>,
  children?: unknown,
  extra: Record<string, unknown> = {},
): Node => ({
  type,
  props: { style, children, ...extra },
});

/** Décor : un téléphone cousu au point ambre, et le fil qui en sort avec sa perle. */
const decor = `<svg xmlns="http://www.w3.org/2000/svg" width="460" height="630" viewBox="0 0 460 630">
  <rect x="96" y="70" width="300" height="620" rx="54" fill="#16213e"/>
  <rect x="108" y="82" width="276" height="596" rx="44" fill="#fcfbf8"/>
  <rect x="84" y="58" width="324" height="644" rx="64" fill="none" stroke="#e0a54a" stroke-width="3" stroke-dasharray="11 11"/>
  <rect x="132" y="150" width="46" height="46" rx="13" fill="#5e8b6e"/>
  <rect x="190" y="160" width="130" height="14" rx="7" fill="#16213e" opacity=".85"/>
  <rect x="190" y="182" width="80" height="10" rx="5" fill="#5b6b8c" opacity=".5"/>
  <rect x="132" y="232" width="110" height="96" rx="20" fill="#e3ece5"/>
  <rect x="252" y="232" width="110" height="96" rx="20" fill="#e3ece5"/>
  <rect x="132" y="340" width="110" height="96" rx="20" fill="#e3ece5"/>
  <rect x="252" y="340" width="110" height="96" rx="20" fill="#f6ead6"/>
  <path d="M40 600 C 10 520, 90 470, 70 400 C 52 340, -10 330, 20 270 C 44 222, 96 240, 84 200" fill="none" stroke="#16213e" stroke-width="4" stroke-linecap="round"/>
  <circle cx="84" cy="196" r="11" fill="#e0a54a" stroke="#f7f6f2" stroke-width="4"/>
</svg>`;

export async function renderOg(options: { title: string; italic?: string }): Promise<Buffer> {
  const tree = h(
    'div',
    {
      width: '100%',
      height: '100%',
      display: 'flex',
      background: '#f7f6f2',
      fontFamily: 'Instrument Serif',
      color: '#16213e',
    },
    [
      h(
        'div',
        {
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '64px 0 60px 72px',
          width: 760,
        },
        [
          h('div', { display: 'flex', alignItems: 'center', fontSize: 34 }, [
            h('div', { width: 18, height: 18, borderRadius: 9, background: '#e0a54a', marginRight: 16 }),
            `${site.brand.name} · ${site.brand.tagline}`,
          ]),
          h(
            'div',
            { display: 'flex', flexDirection: 'column', fontSize: 96, lineHeight: 1, letterSpacing: -2 },
            [
              h('span', {}, options.title),
              options.italic ? h('span', { fontStyle: 'italic', color: '#5b6b8c' }, options.italic) : null,
            ].filter(Boolean),
          ),
          h('div', { display: 'flex', fontSize: 34, fontStyle: 'italic', color: '#5b6b8c' }, pitch.ctaNote),
        ],
      ),
      h('img', { position: 'absolute', right: 0, top: 0 }, undefined, {
        src: `data:image/svg+xml;base64,${Buffer.from(decor).toString('base64')}`,
        width: 460,
        height: 630,
      }),
    ],
  );

  const svg = await satori(tree as never, {
    width: 1200,
    height: 630,
    fonts: [
      { name: 'Instrument Serif', data: fromDataUrl(serifRegular), weight: 400, style: 'normal' },
      { name: 'Instrument Serif', data: fromDataUrl(serifItalic), weight: 400, style: 'italic' },
    ],
  });
  return new Resvg(svg, { fitTo: { mode: 'width', value: 1200 } }).render().asPng();
}
