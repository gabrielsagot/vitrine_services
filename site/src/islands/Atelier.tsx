import { useEffect, useRef, useState } from 'preact/hooks';
import { atelierStore, defaultAppName, describeChoice, modules, swatches } from '../lib/atelier';
import { iconPaths } from '../lib/icons';
import { getTier, prefersReduced, supportsWebGL } from '../lib/tier';
import type { Phone } from './atelier/phone3d';
import { Screen } from './atelier/screen';
import './atelier.css';

type Mode = 'pending' | '3d' | 'css';

const fontsReady = () =>
  Promise.race([
    Promise.all([
      document.fonts?.load("400 27px 'Instrument Serif'"),
      document.fonts?.load("600 15px 'Inter Variable'"),
    ]),
    new Promise((r) => setTimeout(r, 1500)),
  ]);

export default function Atelier() {
  const [picked, setPicked] = useState<string[]>(['rdv', 'clients']);
  const [color, setColor] = useState(swatches[0]!.id);
  const [name, setName] = useState('');
  const [mode, setMode] = useState<Mode>('pending');
  const [spinning, setSpinning] = useState(false);
  const [stuck, setStuck] = useState(false);
  const stageRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLSpanElement>(null);
  const threeHostRef = useRef<HTMLDivElement>(null);
  const screenHostRef = useRef<HTMLDivElement>(null);
  const screenRef = useRef<Screen | null>(null);
  const phoneRef = useRef<Phone | null>(null);
  const touched = useRef(false);
  const lastSpin = useRef(0);

  useEffect(() => {
    let disposed = false;
    const screen = new Screen(() => phoneRef.current?.refresh());
    screenRef.current = screen;
    (async () => {
      const tier = await getTier();
      await fontsReady();
      if (disposed) return;
      let next: Mode = 'css';
      if (tier === 'high' && !prefersReduced() && supportsWebGL() && threeHostRef.current) {
        try {
          const { createPhone3D } = await import('./atelier/phone3d');
          if (disposed) return;
          const phone = await createPhone3D(threeHostRef.current, screen.canvas);
          if (disposed) {
            phone.dispose();
            return;
          }
          phoneRef.current = phone;
          next = '3d';
        } catch {
          next = 'css';
        }
      }
      setMode(next);
      screen.set({ modules: picked, color, name });
      if (!prefersReduced()) screen.stitch();
    })();
    return () => {
      disposed = true;
      screen.dispose();
      phoneRef.current?.dispose();
    };
  }, []);

  // Sur téléphone, le téléphone reste en haut pendant les choix : on lui donne un fond dès qu'il est « collé ».
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !('IntersectionObserver' in window)) return;
    const io = new IntersectionObserver(([e]) =>
      setStuck(!e!.isIntersecting && e!.boundingClientRect.top < 0),
    );
    io.observe(sentinel);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    const host = screenHostRef.current;
    const screen = screenRef.current;
    if (mode === 'css' && host && screen && screen.canvas.parentElement !== host) {
      host.appendChild(screen.canvas);
      screen.play();
    }
  }, [mode]);

  useEffect(() => {
    if (mode === 'pending') return;
    screenRef.current?.set({ modules: picked, color, name });
    if (touched.current) atelierStore.set({ modules: picked, color, name });
  }, [picked, color, name, mode]);

  const touch = () => {
    touched.current = true;
  };

  const toggle = (id: string) => {
    touch();
    setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  };

  const pickColor = (id: string) => {
    touch();
    if (id === color) return;
    setColor(id);
    const now = performance.now();
    if (now - lastSpin.current > 2500 && !prefersReduced()) {
      lastSpin.current = now;
      if (mode === '3d') phoneRef.current?.spin();
      else {
        setSpinning(true);
        setTimeout(() => setSpinning(false), 1100);
      }
    }
  };

  const onColorKey = (e: KeyboardEvent) => {
    const i = swatches.findIndex((s) => s.id === color);
    const delta =
      e.key === 'ArrowRight' || e.key === 'ArrowDown'
        ? 1
        : e.key === 'ArrowLeft' || e.key === 'ArrowUp'
          ? -1
          : 0;
    if (!delta) return;
    e.preventDefault();
    const next = swatches[(i + delta + swatches.length) % swatches.length]!;
    pickColor(next.id);
    (e.currentTarget as HTMLElement).querySelector<HTMLElement>(`[data-swatch="${next.id}"]`)?.focus();
  };

  const tilt = (e: PointerEvent) => {
    if (mode !== 'css' || e.pointerType !== 'mouse') return;
    const el = e.currentTarget as HTMLElement;
    const r = el.getBoundingClientRect();
    el.style.setProperty('--ry', `${(((e.clientX - r.left) / r.width) * 2 - 1) * 10}deg`);
    el.style.setProperty('--rx', `${(((e.clientY - r.top) / r.height) * 2 - 1) * -7}deg`);
  };

  const send = (e: MouseEvent) => {
    touch();
    atelierStore.set({ modules: picked, color, name });
    const target = document.getElementById('contact');
    if (target) {
      e.preventDefault();
      target.scrollIntoView({ behavior: prefersReduced() ? 'auto' : 'smooth', block: 'start' });
      history.replaceState(null, '', '#contact');
    }
  };

  const summary = describeChoice({ modules: picked, color, name });

  return (
    <div class="atelier">
      <div class="atelier-zone">
        <span class="atelier-sentinel" ref={sentinelRef} aria-hidden="true" />
        <div
          class={`atelier-stage is-${mode}${spinning ? ' is-spinning' : ''}${stuck ? ' is-stuck' : ''}`}
          ref={stageRef}
          onPointerMove={tilt}
          data-fil-sticky
          aria-hidden="true"
        >
          <span class="fil-a fil-m fil-gut" data-fil="70.5" style={{ top: '8%' }} />
          <span class="fil-a" data-fil="71" />
          <span class="fil-a fil-m fil-gut" data-fil="72" style={{ bottom: '-12px' }} />
          <span class="fil-a fil-d fil-seam-r-in" data-fil="70.5" style={{ top: '38%' }} />
          <span class="fil-a fil-d fil-seam-r-in" data-fil="72" style={{ bottom: '0' }} />
          <div class="three-host" ref={threeHostRef} />
          {mode !== '3d' && (
            <div class="css-phone">
              <div class="css-phone-body">
                <div class="css-screen" ref={screenHostRef} />
              </div>
            </div>
          )}
          {mode === '3d' && <p class="stage-hint">Faites-le tourner du bout du doigt</p>}
        </div>
        <p class="visually-hidden" aria-live="polite">
          Aperçu de l'application « {summary.appName} », couleur {summary.color}
          {summary.names.length ? `, avec : ${summary.names.join(', ')}` : ''}.
        </p>

        <div class="atelier-controls">
          <fieldset class="a-step">
            <legend>
              <span class="a-num">1</span>Ce qui vous prend du temps
            </legend>
            <div class="chips">
              {modules.map((m) => {
                const on = picked.includes(m.id);
                return (
                  <button
                    type="button"
                    class={`chip${on ? ' is-on' : ''}`}
                    aria-pressed={on}
                    onClick={() => toggle(m.id)}
                  >
                    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
                      <path d={iconPaths[m.icon]} />
                    </svg>
                    {m.label}
                  </button>
                );
              })}
            </div>
          </fieldset>

          <fieldset class="a-step">
            <legend>
              <span class="a-num">2</span>Votre couleur
            </legend>
            <div
              class="swatches"
              role="radiogroup"
              aria-label="Couleur de l'application"
              onKeyDown={onColorKey}
            >
              {swatches.map((s) => {
                const on = s.id === color;
                return (
                  <button
                    type="button"
                    role="radio"
                    aria-checked={on}
                    tabIndex={on ? 0 : -1}
                    data-swatch={s.id}
                    class={`swatch${on ? ' is-on' : ''}`}
                    style={{ '--c': s.hex }}
                    onClick={() => pickColor(s.id)}
                  >
                    <span class="swatch-dot" />
                    <span class="swatch-name">{s.name}</span>
                  </button>
                );
              })}
            </div>
          </fieldset>

          <div class="a-step">
            <label class="a-label" for="atelier-name">
              <span class="a-num">3</span>Son nom <small>(facultatif)</small>
            </label>
            <input
              id="atelier-name"
              class="a-input"
              type="text"
              inputMode="text"
              autoComplete="off"
              maxLength={24}
              placeholder={defaultAppName}
              value={name}
              onInput={(e) => {
                touch();
                setName((e.currentTarget as HTMLInputElement).value);
              }}
            />
          </div>
        </div>
      </div>

      <div class="a-cta">
        <a class="btn btn--amber" href="#contact" onClick={send}>
          <span>Parlons-en avec ce modèle</span>
          <span class="btn-pearl" aria-hidden="true" />
        </a>
        <p>Ce n'est qu'un aperçu&nbsp;: la vraie sera encore plus à vous.</p>
      </div>
    </div>
  );
}
