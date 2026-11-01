import type { SupabaseClient } from '@supabase/supabase-js';
import { useEffect, useState } from 'preact/hooks';

/** Onglet « Visites » : résumé des quatre sites (fonction SQL visits_overview) et export brut. */

interface SiteRow {
  site: string;
  visitors: number;
  sessions: number;
  pageviews: number;
  avg_seconds: number;
  bounce_pct: number;
}
interface Overview {
  since: string;
  sites: SiteRow[];
  days: { day: string; site: string; sessions: number }[];
  sources: { source: string; site: string; sessions: number }[];
  pages: { site: string; path: string; views: number }[];
  clicks: { site: string; name: string; n: number }[];
  places: { city: string; region: string; country: string; sessions: number }[];
  devices: { device_type: string; os: string; browser: string; sessions: number }[];
  journeys: { from_site: string; to_site: string; sessions: number }[];
  recent: {
    session_id: string;
    site: string;
    visit_number: number | null;
    started_at: string;
    engaged_ms: number;
    pageviews: number;
    clicks: number;
    max_scroll_pct: number | null;
    landing_path: string | null;
    source: string | null;
    city: string | null;
    region: string | null;
    country: string | null;
    device_type: string | null;
    os: string | null;
    browser: string | null;
    linked: boolean;
  }[];
}

const SITE_NAMES: Record<string, string> = {
  portfolio: 'Portfolio',
  vitrine: 'Site vitrine',
  equicare: 'EquiCare',
  dram: 'Dram',
};
const DEVICES: Record<string, string> = {
  mobile: 'Téléphone',
  tablet: 'Tablette',
  desktop: 'Ordinateur',
  unknown: 'Inconnu',
};
const PERIODS = [7, 30, 90, 365];
const dateFr = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short' });

function duration(ms: number) {
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s} s`;
  const m = Math.floor(s / 60);
  return `${m} min ${String(s % 60).padStart(2, '0')}`;
}

export default function Visits({ db }: { db: SupabaseClient }) {
  const [days, setDays] = useState(30);
  const [data, setData] = useState<Overview | null>(null);
  const [error, setError] = useState('');
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    setData(null);
    db.rpc('visits_overview', { p_days: days }).then(({ data: d, error: e }) => {
      if (e) setError(e.message);
      else setData(d as Overview);
    });
  }, [db, days]);

  const exportCsv = async () => {
    setExporting(true);
    const since = new Date(Date.now() - days * 86_400_000).toISOString();
    const rows: Record<string, unknown>[] = [];
    for (let from = 0; from < 50_000; from += 1000) {
      const { data: page, error: e } = await db
        .from('visit_events')
        .select('*')
        .gte('received_at', since)
        .order('received_at', { ascending: true })
        .range(from, from + 999);
      if (e) {
        setError(e.message);
        break;
      }
      rows.push(...(page ?? []));
      if (!page || page.length < 1000) break;
    }
    setExporting(false);
    if (!rows.length) return;
    const cols = Object.keys(rows[0]!);
    const cell = (v: unknown) => {
      const s = v == null ? '' : typeof v === 'object' ? JSON.stringify(v) : String(v);
      return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const csv = [cols.join(';'), ...rows.map((r) => cols.map((c) => cell(r[c])).join(';'))].join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }));
    a.download = `visites-${new Date().toISOString().slice(0, 10)}-${days}j.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  };

  const byDay = new Map<string, number>();
  for (const d of data?.days ?? []) byDay.set(d.day, (byDay.get(d.day) ?? 0) + d.sessions);
  const dayList = [...byDay.entries()].sort(([a], [b]) => a.localeCompare(b)).slice(-60);
  const maxDay = Math.max(1, ...dayList.map(([, n]) => n));

  return (
    <div class="adm-visits">
      <div class="adm-visits-bar">
        <div class="adm-chips" role="group" aria-label="Période">
          {PERIODS.map((p) => (
            <button class={p === days ? 'is-on' : ''} onClick={() => setDays(p)}>
              {p === 365 ? '1 an' : `${p} jours`}
            </button>
          ))}
        </div>
        <button class="adm-link" disabled={exporting} onClick={exportCsv}>
          {exporting ? 'Export…' : 'Tout exporter (CSV)'}
        </button>
      </div>
      {error && <p class="adm-error">{error}</p>}
      {!data && !error && <p class="adm-muted">Chargement…</p>}
      {data && !data.sites.length && (
        <p class="adm-muted">Aucune visite sur la période. Elles apparaîtront ici dès les premières.</p>
      )}
      {data && data.sites.length > 0 && (
        <>
          <div class="adm-kpis">
            {data.sites.map((s) => (
              <div class="adm-kpi">
                <strong>{SITE_NAMES[s.site] ?? s.site}</strong>
                <span class="adm-kpi-big">{s.visitors}</span>
                <span class="adm-muted">
                  visiteurs · {s.sessions} visites · {s.pageviews} pages
                </span>
                <span class="adm-muted">
                  {duration(s.avg_seconds * 1000)} en moyenne · {s.bounce_pct} % repartis tout de suite
                </span>
              </div>
            ))}
          </div>

          <section class="adm-card">
            <h3>Visites par jour</h3>
            <div class="adm-days">
              {dayList.map(([day, n]) => (
                <div class="adm-day" title={`${day} : ${n} visite${n > 1 ? 's' : ''}`}>
                  <span style={{ height: `${Math.max(4, (n / maxDay) * 100)}%` }} />
                </div>
              ))}
            </div>
          </section>

          <div class="adm-grid2">
            <Table
              title="D'où ils viennent"
              rows={data.sources.map((s) => [s.source, SITE_NAMES[s.site] ?? s.site, s.sessions])}
            />
            <Table
              title="Où ils sont"
              rows={data.places.map((p) => [
                [p.city, p.region].filter(Boolean).join(', '),
                p.country,
                p.sessions,
              ])}
            />
            <Table
              title="Pages les plus vues"
              rows={data.pages.map((p) => [p.path, SITE_NAMES[p.site] ?? p.site, p.views])}
            />
            <Table
              title="Ce qu'ils touchent"
              rows={data.clicks.map((c) => [c.name, SITE_NAMES[c.site] ?? c.site, c.n])}
            />
            <Table
              title="Appareils"
              rows={data.devices.map((d) => [
                DEVICES[d.device_type] ?? d.device_type,
                `${d.os} · ${d.browser}`,
                d.sessions,
              ])}
            />
            <Table
              title="Parcours d'un site à l'autre"
              rows={data.journeys.map((j) => [
                `${SITE_NAMES[j.from_site] ?? j.from_site} → ${SITE_NAMES[j.to_site] ?? j.to_site}`,
                '',
                j.sessions,
              ])}
            />
          </div>

          <section class="adm-card">
            <h3>Dernières visites</h3>
            <ul class="adm-recent">
              {data.recent.map((r) => (
                <li>
                  <div>
                    <strong>{SITE_NAMES[r.site] ?? r.site}</strong>
                    {r.visit_number && r.visit_number > 1 ? ` · ${r.visit_number}e visite` : ' · 1re visite'}
                    {r.linked ? ' · venu d’un autre site' : ''}
                  </div>
                  <div class="adm-muted">
                    {dateFr.format(new Date(r.started_at))} · {duration(r.engaged_ms)} · {r.pageviews} page
                    {r.pageviews > 1 ? 's' : ''} · {r.clicks} clic{r.clicks > 1 ? 's' : ''}
                    {r.max_scroll_pct != null ? ` · lu à ${r.max_scroll_pct} %` : ''}
                  </div>
                  <div class="adm-muted">
                    {[r.city, r.region, r.country].filter(Boolean).join(', ') || 'Lieu inconnu'} ·{' '}
                    {DEVICES[r.device_type ?? 'unknown'] ?? r.device_type} {r.os} {r.browser} · arrivé sur{' '}
                    {r.landing_path ?? '?'}
                    {r.source ? ` depuis ${r.source}` : ''}
                  </div>
                </li>
              ))}
            </ul>
          </section>
          <p class="adm-muted">
            Toutes les données brutes sont aussi dans Supabase (table <code>visit_events</code>, vue{' '}
            <code>visit_sessions</code>).
          </p>
        </>
      )}
    </div>
  );
}

function Table({ title, rows }: { title: string; rows: (string | number)[][] }) {
  return (
    <section class="adm-card">
      <h3>{title}</h3>
      {rows.length ? (
        <table class="adm-table">
          <tbody>
            {rows.map((r) => (
              <tr>
                <td>{r[0] || '—'}</td>
                <td class="adm-muted">{r[1]}</td>
                <td class="adm-num">{r[2]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p class="adm-muted">Rien pour l'instant.</p>
      )}
    </section>
  );
}
