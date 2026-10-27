import { createClient, type Session, type SupabaseClient } from '@supabase/supabase-js';
import { PUBLIC_SUPABASE_PUBLISHABLE_KEY, PUBLIC_SUPABASE_URL } from 'astro:env/client';
import { useEffect, useMemo, useState } from 'preact/hooks';
import { describeChoice, type AtelierChoice } from '../../lib/atelier';
import { channels, moments, type Channel, type Moment } from '../../lib/contact';
import { isValidSlug, slugify } from '../../lib/slug';
import './admin.css';

interface Request {
  id: string;
  created_at: string;
  first_name: string;
  channel: Channel;
  contact: string;
  moment: Moment | null;
  message: string | null;
  model: AtelierChoice | null;
  referrer_id: string | null;
  status: Status;
  admin_note: string | null;
}

interface ReferrerRow {
  id: string;
  slug: string;
  display_name: string;
  note: string | null;
  active: boolean;
  visits: number;
  requests: number;
  created_at: string;
}

type Status = 'nouvelle' | 'contactee' | 'devis' | 'cliente' | 'sans_suite';
const statuses: Record<Status, string> = {
  nouvelle: 'Nouvelle',
  contactee: 'Recontactée',
  devis: 'Devis envoyé',
  cliente: 'Cliente',
  sans_suite: 'Sans suite',
};

const dateFr = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short' });

export default function Admin() {
  const db = useMemo<SupabaseClient | null>(
    () =>
      PUBLIC_SUPABASE_URL && PUBLIC_SUPABASE_PUBLISHABLE_KEY
        ? createClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_PUBLISHABLE_KEY)
        : null,
    [],
  );
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  const [allowed, setAllowed] = useState<boolean | null>(null);

  useEffect(() => {
    if (!db) return;
    db.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setReady(true);
    });
    const { data } = db.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, [db]);

  useEffect(() => {
    if (!db || !session) return setAllowed(null);
    db.rpc('is_admin').then(({ data }) => setAllowed(data === true));
  }, [db, session]);

  if (!db) {
    return (
      <div class="adm-card">
        <h2>Supabase n'est pas encore configuré</h2>
        <p>
          Renseignez <code>PUBLIC_SUPABASE_URL</code> et <code>PUBLIC_SUPABASE_PUBLISHABLE_KEY</code> (voir{' '}
          <code>docs/mise-en-ligne.md</code>), puis redéployez le site.
        </p>
      </div>
    );
  }
  if (!ready) return <p class="adm-muted">Chargement…</p>;
  if (!session) return <Login db={db} />;
  if (allowed === false) {
    return (
      <div class="adm-card">
        <h2>Ce compte n'a pas accès à l'espace admin.</h2>
        <button class="adm-btn" onClick={() => db.auth.signOut()}>
          Se déconnecter
        </button>
      </div>
    );
  }
  if (allowed === null) return <p class="adm-muted">Vérification…</p>;
  return <Dashboard db={db} />;
}

function Login({ db }: { db: SupabaseClient }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  return (
    <form
      class="adm-card adm-login"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError('');
        const { error } = await db.auth.signInWithPassword({ email, password });
        setBusy(false);
        if (error) setError('E-mail ou mot de passe incorrect.');
      }}
    >
      <h2>Connexion</h2>
      <label>
        E-mail
        <input
          type="email"
          autoComplete="email"
          required
          value={email}
          onInput={(e) => setEmail(e.currentTarget.value)}
        />
      </label>
      <label>
        Mot de passe
        <input
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onInput={(e) => setPassword(e.currentTarget.value)}
        />
      </label>
      {error && <p class="adm-error">{error}</p>}
      <button class="adm-btn adm-btn--primary" disabled={busy}>
        {busy ? 'Connexion…' : 'Se connecter'}
      </button>
    </form>
  );
}

function Dashboard({ db }: { db: SupabaseClient }) {
  const [tab, setTab] = useState<'requests' | 'referrers'>('requests');
  const [requests, setRequests] = useState<Request[]>([]);
  const [referrers, setReferrers] = useState<ReferrerRow[]>([]);
  const [error, setError] = useState('');

  const load = async () => {
    const [r, p] = await Promise.all([
      db.from('contact_requests').select('*').order('created_at', { ascending: false }).limit(200),
      db.from('referrer_stats').select('*').order('created_at', { ascending: false }),
    ]);
    if (r.error || p.error) setError((r.error ?? p.error)!.message);
    setRequests((r.data ?? []) as Request[]);
    setReferrers((p.data ?? []) as ReferrerRow[]);
  };

  useEffect(() => {
    load();
  }, []);

  const byId = new Map(referrers.map((r) => [r.id, r]));
  const fresh = requests.filter((r) => r.status === 'nouvelle').length;

  return (
    <div class="adm">
      <div class="adm-tabs" role="tablist">
        <button
          role="tab"
          aria-selected={tab === 'requests'}
          class={tab === 'requests' ? 'is-on' : ''}
          onClick={() => setTab('requests')}
        >
          Demandes {fresh > 0 && <span class="adm-badge">{fresh}</span>}
        </button>
        <button
          role="tab"
          aria-selected={tab === 'referrers'}
          class={tab === 'referrers' ? 'is-on' : ''}
          onClick={() => setTab('referrers')}
        >
          Parrains
        </button>
        <button class="adm-link" onClick={() => db.auth.signOut()}>
          Se déconnecter
        </button>
      </div>
      {error && <p class="adm-error">{error}</p>}
      {tab === 'requests' ? (
        <Requests db={db} items={requests} referrers={byId} reload={load} />
      ) : (
        <Referrers db={db} items={referrers} reload={load} />
      )}
    </div>
  );
}

function Requests({
  db,
  items,
  referrers,
  reload,
}: {
  db: SupabaseClient;
  items: Request[];
  referrers: Map<string, ReferrerRow>;
  reload: () => void;
}) {
  if (!items.length) return <p class="adm-muted">Aucune demande pour l'instant. Elles apparaîtront ici.</p>;
  return (
    <ul class="adm-list">
      {items.map((r) => {
        const phone = channels[r.channel].needs === 'phone';
        const digits = r.contact.replace('+', '');
        const model = r.model ? describeChoice(r.model) : null;
        return (
          <li class={`adm-item is-${r.status}`} key={r.id}>
            <div class="adm-item-head">
              <strong>{r.first_name}</strong>
              <span class="adm-muted">{dateFr.format(new Date(r.created_at))}</span>
            </div>
            <p>
              Préfère être recontacté(e) <b>{channels[r.channel].phrase}</b>
              {r.moment && r.moment !== 'libre' ? `, ${moments[r.moment].phrase}` : ''} : {r.contact}
            </p>
            {r.referrer_id && referrers.get(r.referrer_id) && (
              <p class="adm-tag">De la part de {referrers.get(r.referrer_id)!.display_name}</p>
            )}
            {r.message && <blockquote>{r.message}</blockquote>}
            {model && (
              <p class="adm-muted">
                Atelier : « {model.appName} », {model.color} — {model.names.join(', ') || 'aucun module'}
              </p>
            )}
            <div class="adm-actions">
              {phone ? (
                <>
                  <a class="adm-btn" href={`tel:${r.contact}`}>
                    Appeler
                  </a>
                  <a class="adm-btn" href={`sms:${r.contact}`}>
                    SMS
                  </a>
                  <a class="adm-btn" href={`https://wa.me/${digits}`} target="_blank" rel="noopener">
                    WhatsApp
                  </a>
                </>
              ) : (
                <a class="adm-btn" href={`mailto:${r.contact}`}>
                  Écrire
                </a>
              )}
              <select
                aria-label="Statut"
                value={r.status}
                onChange={async (e) => {
                  await db.from('contact_requests').update({ status: e.currentTarget.value }).eq('id', r.id);
                  reload();
                }}
              >
                {(Object.keys(statuses) as Status[]).map((s) => (
                  <option value={s}>{statuses[s]}</option>
                ))}
              </select>
              <button
                class="adm-link adm-danger"
                onClick={async () => {
                  if (!confirm(`Supprimer la demande de ${r.first_name} ?`)) return;
                  await db.from('contact_requests').delete().eq('id', r.id);
                  reload();
                }}
              >
                Supprimer
              </button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function Referrers({ db, items, reload }: { db: SupabaseClient; items: ReferrerRow[]; reload: () => void }) {
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugEdited, setSlugEdited] = useState(false);
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState('');
  const origin = location.origin;
  const finalSlug = slugEdited ? slug : slugify(name);

  const create = async (e: Event) => {
    e.preventDefault();
    setError('');
    if (!isValidSlug(finalSlug))
      return setError('Ce lien n’est pas possible : lettres, chiffres et tirets uniquement.');
    const { error } = await db
      .from('referrers')
      .insert({ display_name: name.trim(), slug: finalSlug, note: note.trim() || null });
    if (error) {
      setError(
        error.code === '23505'
          ? `Le lien /${finalSlug} existe déjà. Essayez par exemple /${finalSlug}-2.`
          : error.message,
      );
      return;
    }
    setName('');
    setSlug('');
    setSlugEdited(false);
    setNote('');
    reload();
  };

  const share = async (r: ReferrerRow) => {
    const url = `${origin}/${r.slug}`;
    const text = `Voici ton lien pour me recommander : ${url}`;
    if (navigator.share) {
      try {
        // Le lien est déjà dans le texte : l'ajouter aussi en `url` l'enverrait deux fois (iPhone, Android).
        await navigator.share({ text });
        return;
      } catch (e) {
        // Partage annulé par l'utilisateur : on s'arrête là, sans copier à sa place.
        if (e instanceof DOMException && e.name === 'AbortError') return;
      }
    }
    await navigator.clipboard.writeText(url);
    setCopied(r.id);
    setTimeout(() => setCopied(''), 1800);
  };

  return (
    <div class="adm-grid">
      <form class="adm-card" onSubmit={create}>
        <h2>Nouveau lien de parrainage</h2>
        <label>
          Prénom affiché
          <input
            required
            maxLength={60}
            value={name}
            placeholder="Sylvie"
            onInput={(e) => setName(e.currentTarget.value)}
          />
        </label>
        <label>
          Lien
          <span class="adm-slug">
            <span>{origin.replace(/^https?:\/\//, '')}/</span>
            <input
              value={finalSlug}
              maxLength={40}
              onInput={(e) => {
                setSlugEdited(true);
                setSlug(e.currentTarget.value.toLowerCase());
              }}
            />
          </span>
        </label>
        <label>
          Note privée <small>(facultatif)</small>
          <input
            maxLength={500}
            value={note}
            placeholder="Cliente depuis mars, réseau équestre"
            onInput={(e) => setNote(e.currentTarget.value)}
          />
        </label>
        {name && (
          <p class="adm-preview">
            Aperçu : « <em>{name.trim()} pense que je peux vous aider.</em> »
          </p>
        )}
        {error && <p class="adm-error">{error}</p>}
        <button class="adm-btn adm-btn--primary" disabled={!name.trim()}>
          Créer le lien
        </button>
      </form>

      <ul class="adm-list">
        {items.map((r) => (
          <li class={`adm-item${r.active ? '' : ' is-off'}`} key={r.id}>
            <div class="adm-item-head">
              <strong>{r.display_name}</strong>
              <span class="adm-muted">
                {r.visits} visite{r.visits > 1 ? 's' : ''} · {r.requests} demande{r.requests > 1 ? 's' : ''}
              </span>
            </div>
            <p class="adm-url">
              {origin.replace(/^https?:\/\//, '')}/{r.slug}
            </p>
            {r.note && <p class="adm-muted">{r.note}</p>}
            <div class="adm-actions">
              <button class="adm-btn adm-btn--primary" onClick={() => share(r)}>
                {copied === r.id ? 'Lien copié' : 'Partager le lien'}
              </button>
              <a class="adm-btn" href={`/${r.slug}`} target="_blank" rel="noopener">
                Voir
              </a>
              <button
                class="adm-btn"
                onClick={async () => {
                  await db.from('referrers').update({ active: !r.active }).eq('id', r.id);
                  reload();
                }}
              >
                {r.active ? 'Désactiver' : 'Réactiver'}
              </button>
              <button
                class="adm-link adm-danger"
                onClick={async () => {
                  if (!confirm(`Supprimer le lien de ${r.display_name} ? Ses demandes sont conservées.`))
                    return;
                  await db.from('referrers').delete().eq('id', r.id);
                  reload();
                }}
              >
                Supprimer
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
