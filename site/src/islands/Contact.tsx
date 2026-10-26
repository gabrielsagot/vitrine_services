import { useEffect, useRef, useState } from 'preact/hooks';
import type { JSX, Ref } from 'preact';
import { atelierStore, describeChoice, swatches, type AtelierChoice } from '../lib/atelier';
import { channels, isEmail, moments, normalizePhone, type Channel, type Moment } from '../lib/contact';
import { iconPaths, type IconName } from '../lib/icons';
import { prefersReduced } from '../lib/tier';
import './contact.css';

interface Props {
  owner: string;
  referrer: { slug: string; name: string } | null;
  direct: { sms: string; whatsapp: string; email: string };
}

type Step =
  | 'intro'
  | 'name'
  | 'channel'
  | 'contact'
  | 'moment'
  | 'message'
  | 'model'
  | 'confirm'
  | 'sending'
  | 'done'
  | 'error';

interface Bubble {
  id: number;
  from: 'me' | 'you';
  content: string | JSX.Element;
}

interface Answers {
  firstName: string;
  channel: Channel | null;
  contact: string;
  moment: Moment | null;
  message: string;
  model: AtelierChoice | null;
  includeModel: boolean;
}

const empty: Answers = {
  firstName: '',
  channel: null,
  contact: '',
  moment: null,
  message: '',
  model: null,
  includeModel: true,
};

const Icon = ({ name, size = 20 }: { name: IconName; size?: number }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true" class="c-icon">
    <path d={iconPaths[name]} />
  </svg>
);

let uid = 0;

export default function Contact({ owner, referrer, direct }: Props) {
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const [step, setStep] = useState<Step>('intro');
  const [typing, setTyping] = useState(false);
  const [answers, setAnswers] = useState<Answers>(empty);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState('');
  const started = useRef(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);
  const userActed = useRef(false);
  const honeypot = useRef<HTMLInputElement>(null);

  const reduced = () => prefersReduced();
  const wait = (ms: number) => new Promise((r) => setTimeout(r, reduced() ? 0 : ms));

  /** Messages de Gabriel, l'un après l'autre, avec l'indicateur « en train d'écrire ». */
  const say = async (...lines: (string | JSX.Element)[]) => {
    for (const line of lines) {
      setTyping(true);
      const len = typeof line === 'string' ? line.length : 60;
      await wait(Math.min(1300, 380 + len * 11));
      setTyping(false);
      setBubbles((b) => [...b, { id: ++uid, from: 'me', content: line }]);
      await wait(120);
    }
  };

  const answer = (content: string | JSX.Element) => {
    userActed.current = true;
    setBubbles((b) => [...b, { id: ++uid, from: 'you', content }]);
  };

  // La conversation démarre quand elle apparaît à l'écran.
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        io.disconnect();
        start();
      },
      { threshold: 0.35 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Le modèle de l'atelier peut arriver à tout moment.
  useEffect(() => atelierStore.subscribe((model) => setAnswers((a) => ({ ...a, model }))), []);

  // Garde le dernier message visible, seulement après une action du visiteur.
  useEffect(() => {
    if (!userActed.current || !endRef.current) return;
    const r = endRef.current.getBoundingClientRect();
    if (r.bottom > window.innerHeight - 90 || r.top < 0) {
      endRef.current.scrollIntoView({ behavior: reduced() ? 'auto' : 'smooth', block: 'end' });
    }
  }, [bubbles.length, typing, step]);

  useEffect(() => {
    if (!userActed.current) return;
    if (step === 'message') textRef.current?.focus({ preventScroll: true });
    else if (step === 'name' || step === 'contact') inputRef.current?.focus({ preventScroll: true });
  }, [step]);

  const start = async () => {
    started.current = Date.now();
    await say(
      referrer
        ? `Bonjour ! ${referrer.name} pense que je peux vous aider, et je suis ravi que vous soyez là.`
        : 'Bonjour ! Je suis ravi que vous passiez par ici.',
      'Quelques questions rapides, et je vous recontacte pour en parler. Le devis est offert, sans aucune obligation.',
      'Pour commencer, comment vous appelez-vous ?',
    );
    setStep('name');
  };

  const submitName = async () => {
    const v = draft.trim();
    if (!v) return setError('Votre prénom suffit.');
    setError('');
    setDraft('');
    answer(v);
    setAnswers((a) => ({ ...a, firstName: v }));
    setStep('intro');
    await say(`Enchanté, ${v} ! Comment préférez-vous que je vous recontacte ?`);
    setStep('channel');
  };

  const pickChannel = async (c: Channel) => {
    answer(channels[c].label);
    setAnswers((a) => ({ ...a, channel: c }));
    setStep('intro');
    setDraft(c === answers.channel ? answers.contact : '');
    await say(
      channels[c].needs === 'email' ? 'Parfait. À quelle adresse e-mail ?' : 'Très bien. À quel numéro ?',
    );
    setStep('contact');
  };

  const submitContact = async () => {
    const needs = channels[answers.channel!].needs;
    const v = draft.trim();
    if (needs === 'phone' && !normalizePhone(v))
      return setError('Ce numéro ne semble pas complet. Exemple : 06 12 34 56 78');
    if (needs === 'email' && !isEmail(v))
      return setError('Cette adresse ne semble pas complète. Exemple : prenom@exemple.fr');
    setError('');
    setDraft('');
    answer(v);
    setAnswers((a) => ({ ...a, contact: v }));
    setStep('intro');
    if (needs === 'email') {
      setAnswers((a) => ({ ...a, moment: null }));
      await askMessage();
    } else {
      await say('Plutôt à quel moment ?');
      setStep('moment');
    }
  };

  const pickMoment = async (m: Moment) => {
    answer(moments[m].label);
    setAnswers((a) => ({ ...a, moment: m }));
    setStep('intro');
    await askMessage();
  };

  const askMessage = async () => {
    setDraft(answers.message);
    await say("Voulez-vous m'en dire un peu plus sur votre activité ou votre projet ? C'est facultatif.");
    setStep('message');
  };

  const submitMessage = async (skip: boolean) => {
    const v = skip ? '' : draft.trim();
    setDraft('');
    setError('');
    answer(v || 'Je préfère en parler de vive voix.');
    setAnswers((a) => ({ ...a, message: v }));
    setStep('intro');
    const model = atelierStore.get();
    if (model) {
      await say("J'ai aussi le modèle que vous avez composé dans l'atelier :");
      setStep('model');
    } else {
      await confirm();
    }
  };

  const pickModel = async (include: boolean) => {
    answer(include ? 'Oui, joignez-le.' : 'Non, pas la peine.');
    setAnswers((a) => ({ ...a, includeModel: include }));
    setStep('intro');
    await confirm();
  };

  const confirm = async () => {
    await say("C'est tout bon ? Ces informations servent uniquement à vous recontacter.");
    setStep('confirm');
  };

  const restart = async () => {
    answer('Je corrige.');
    setStep('intro');
    setDraft(answers.firstName);
    await say('Pas de souci, reprenons. Votre prénom ?');
    setStep('name');
  };

  const send = async () => {
    answer('Envoyer ma demande');
    setStep('sending');
    setTyping(true);
    const model = answers.includeModel ? atelierStore.get() : null;
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          firstName: answers.firstName,
          channel: answers.channel,
          contact: answers.contact,
          moment: answers.moment,
          message: answers.message || null,
          model,
          referrer: referrer?.slug ?? null,
          website: honeypot.current?.value ?? '',
          startedAt: started.current,
        }),
      });
      if (!res.ok) throw new Error(String(res.status));
      await wait(500);
      setTyping(false);
      const c = channels[answers.channel!];
      const when = answers.moment ? moments[answers.moment].phrase : '';
      setStep('done');
      await say(
        `Merci ${answers.firstName} ! Je vous recontacte ${c.phrase}${when ? `, ${when}` : ''}. À très vite.`,
      );
    } catch {
      setTyping(false);
      setStep('error');
      await say(
        "Oups, votre demande n'est pas partie. Vous pouvez réessayer, ou m'écrire directement juste en dessous.",
      );
    }
  };

  const onKey = (e: KeyboardEvent, run: () => void) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      run();
    }
  };

  const summary = answers.model ? describeChoice(answers.model) : null;

  return (
    <div class="chat" ref={rootRef}>
      <div class="chat-head">
        <span class="chat-avatar" aria-hidden="true">
          {owner.charAt(0)}
          <i class="chat-online" />
        </span>
        <span>
          <strong>{owner}</strong>
          <small>Répond en général dans la journée</small>
        </span>
      </div>

      <ol class="chat-log" aria-live="polite" aria-relevant="additions">
        {bubbles.map((b) => (
          <li key={b.id} class={`bubble bubble--${b.from}`}>
            {b.content}
          </li>
        ))}
        {typing && (
          <li class="bubble bubble--me bubble--typing" aria-label={`${owner} écrit…`}>
            <i />
            <i />
            <i />
          </li>
        )}
      </ol>

      {step === 'model' && summary && (
        <div class="chat-model">
          <span class="model-icon" style={{ background: modelHex(answers.model!.color) }}>
            {summary.appName.charAt(0)}
          </span>
          <span>
            <strong>{summary.appName}</strong>
            <small>
              {summary.names.length ? summary.names.join(' · ') : 'Aucun module choisi'} — couleur{' '}
              {summary.color}
            </small>
          </span>
        </div>
      )}

      {step === 'confirm' && (
        <dl class="chat-recap">
          <div>
            <dt>Prénom</dt>
            <dd>{answers.firstName}</dd>
          </div>
          <div>
            <dt>Je vous recontacte</dt>
            <dd>
              {channels[answers.channel!].phrase} · {answers.contact}
              {answers.moment && answers.moment !== 'libre'
                ? ` · ${moments[answers.moment].label.toLowerCase()}`
                : ''}
            </dd>
          </div>
          {answers.message && (
            <div>
              <dt>Votre message</dt>
              <dd>{answers.message}</dd>
            </div>
          )}
          {summary && answers.includeModel && (
            <div>
              <dt>Modèle de l'atelier</dt>
              <dd>
                {summary.appName} · {summary.color}
              </dd>
            </div>
          )}
          {referrer && (
            <div>
              <dt>De la part de</dt>
              <dd>{referrer.name}</dd>
            </div>
          )}
        </dl>
      )}

      <div class="chat-input" ref={endRef}>
        {step === 'name' && (
          <TextRow
            inputRef={inputRef}
            label="Votre prénom"
            value={draft}
            onInput={setDraft}
            onSubmit={submitName}
            onKey={onKey}
            autoComplete="given-name"
          />
        )}
        {step === 'channel' && (
          <div class="choices">
            {(Object.keys(channels) as Channel[]).map((c) => (
              <button type="button" class="choice" onClick={() => pickChannel(c)}>
                <Icon
                  name={
                    c === 'sms' ? 'message' : c === 'whatsapp' ? 'whatsapp' : c === 'email' ? 'mail' : 'phone'
                  }
                />
                {channels[c].label}
              </button>
            ))}
          </div>
        )}
        {step === 'contact' && answers.channel && (
          <TextRow
            inputRef={inputRef}
            label={channels[answers.channel].needs === 'email' ? 'Votre adresse e-mail' : 'Votre numéro'}
            type={channels[answers.channel].needs === 'email' ? 'email' : 'tel'}
            autoComplete={channels[answers.channel].needs === 'email' ? 'email' : 'tel'}
            value={draft}
            onInput={(v) => {
              setDraft(v);
              setError('');
            }}
            onSubmit={submitContact}
            onKey={onKey}
          />
        )}
        {step === 'moment' && (
          <div class="choices">
            {(Object.keys(moments) as Moment[]).map((m) => (
              <button type="button" class="choice" onClick={() => pickMoment(m)}>
                {moments[m].label}
              </button>
            ))}
          </div>
        )}
        {step === 'message' && (
          <div class="message-row">
            <label class="visually-hidden" for="chat-message">
              Votre message (facultatif)
            </label>
            <textarea
              id="chat-message"
              ref={textRef}
              rows={3}
              maxLength={2000}
              placeholder="Mon métier, ce qui me prend du temps…"
              value={draft}
              onInput={(e) => setDraft((e.currentTarget as HTMLTextAreaElement).value)}
            />
            <div class="choices">
              <button
                type="button"
                class="choice choice--primary"
                onClick={() => submitMessage(false)}
                disabled={!draft.trim()}
              >
                Envoyer ce message
              </button>
              <button type="button" class="choice" onClick={() => submitMessage(true)}>
                Passer
              </button>
            </div>
          </div>
        )}
        {step === 'model' && (
          <div class="choices">
            <button type="button" class="choice choice--primary" onClick={() => pickModel(true)}>
              Oui, joignez-le
            </button>
            <button type="button" class="choice" onClick={() => pickModel(false)}>
              Non, pas la peine
            </button>
          </div>
        )}
        {step === 'confirm' && (
          <div class="choices">
            <button type="button" class="btn btn--amber" onClick={send}>
              <span>Envoyer ma demande</span>
              <svg class="btn-icon" viewBox="0 0 20 20" width="17" height="17" aria-hidden="true">
                <path
                  d="M4 10h12M11 5l5 5-5 5"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
            </button>
            <button type="button" class="choice" onClick={restart}>
              Corriger
            </button>
          </div>
        )}
        {step === 'error' && (
          <div class="choices">
            <button type="button" class="choice choice--primary" onClick={send}>
              Réessayer
            </button>
          </div>
        )}
        {step === 'done' && (
          <p class="chat-done">
            <span class="done-pearl" aria-hidden="true">
              <i />
              <i />
            </span>
            Demande bien reçue. Le devis est offert, sans aucune obligation.
          </p>
        )}
        {error && (
          <p class="chat-error" role="alert">
            {error}
          </p>
        )}
        <input
          ref={honeypot}
          class="hp"
          type="text"
          name="website"
          tabIndex={-1}
          autoComplete="off"
          aria-hidden="true"
        />
      </div>

      <div class="chat-direct">
        <p>Vous préférez m'écrire directement ?</p>
        <div class="direct-links">
          <a href={direct.sms} class="direct">
            <Icon name="message" /> SMS
          </a>
          <a href={direct.whatsapp} class="direct" target="_blank" rel="noopener">
            <Icon name="whatsapp" /> WhatsApp
          </a>
          <a href={direct.email} class="direct">
            <Icon name="mail" /> E-mail
          </a>
        </div>
      </div>
    </div>
  );
}

function TextRow(props: {
  inputRef: Ref<HTMLInputElement>;
  label: string;
  value: string;
  onInput: (v: string) => void;
  onSubmit: () => void;
  onKey: (e: KeyboardEvent, run: () => void) => void;
  type?: 'text' | 'email' | 'tel';
  autoComplete?: string;
}) {
  return (
    <form
      class="text-row"
      onSubmit={(e) => {
        e.preventDefault();
        props.onSubmit();
      }}
    >
      <label class="visually-hidden" for="chat-field">
        {props.label}
      </label>
      <input
        id="chat-field"
        ref={props.inputRef}
        type={(props.type ?? 'text') as 'text'}
        autoComplete={props.autoComplete ?? 'off'}
        placeholder={props.label}
        value={props.value}
        onInput={(e) => props.onInput((e.currentTarget as HTMLInputElement).value)}
        onKeyDown={(e) => props.onKey(e, props.onSubmit)}
      />
      <button type="submit" class="send" aria-label="Valider">
        <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
          <path d={iconPaths.arrow} />
        </svg>
      </button>
    </form>
  );
}

const modelHex = (id: string) => swatches.find((s) => s.id === id)?.hex ?? '#16213e';
