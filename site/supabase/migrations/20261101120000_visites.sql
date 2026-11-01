-- Suivi des visites des quatre sites de Gabriel : portfolio, site vitrine, EquiCare (mode visiteur)
-- et Dram (mode visiteur). Les navigateurs envoient leurs événements à /api/collect (site vitrine,
-- sur Vercel), qui les enregistre ici avec la clé service_role et y ajoute le lieu approximatif
-- (pays, région, ville) donné par Vercel. L'adresse IP n'est jamais enregistrée : seule une empreinte
-- salée qui change chaque jour, pour repérer les envois en rafale.
-- Lecture : espace admin du site vitrine (onglet « Visites ») et éditeur SQL de Supabase.

create table public.visit_events (
  id bigint generated always as identity primary key,
  received_at timestamptz not null default now(),
  client_at timestamptz,
  site text not null check (site in ('portfolio', 'vitrine', 'equicare', 'dram')),
  type text not null check (type in ('pageview', 'leave', 'event', 'click', 'error', 'session')),
  name text check (char_length(name) <= 120),

  -- Qui (pseudonyme, propre à chaque site) et quand
  visitor_id uuid,
  session_id uuid,
  visit_number integer,
  from_session uuid,

  -- Où sur le site
  path text check (char_length(path) <= 500),
  search text check (char_length(search) <= 1000),
  title text check (char_length(title) <= 300),

  -- D'où il vient
  referrer text check (char_length(referrer) <= 1000),
  referrer_host text check (char_length(referrer_host) <= 255),
  utm_source text check (char_length(utm_source) <= 200),
  utm_medium text check (char_length(utm_medium) <= 200),
  utm_campaign text check (char_length(utm_campaign) <= 200),
  utm_content text check (char_length(utm_content) <= 200),
  utm_term text check (char_length(utm_term) <= 200),

  -- Ce qu'il a fait sur la page (événement « leave »)
  engaged_ms integer,
  scroll_pct smallint,

  -- Lieu approximatif (d'après Vercel)
  country text,
  region text,
  city text,
  latitude double precision,
  longitude double precision,

  -- Appareil
  user_agent text check (char_length(user_agent) <= 600),
  browser text,
  browser_version text,
  os text,
  os_version text,
  device_type text check (device_type in ('mobile', 'tablet', 'desktop', 'bot', 'unknown')),
  device_model text,
  screen_w smallint,
  screen_h smallint,
  viewport_w smallint,
  viewport_h smallint,
  pixel_ratio real,
  language text,
  languages text,
  timezone text,
  installed boolean,
  is_bot boolean not null default false,
  ip_hash text,

  -- Tout le reste (mesures techniques, détails du clic ou de l'événement)
  props jsonb not null default '{}'::jsonb
);

create index visit_events_received_idx on public.visit_events (received_at desc);
create index visit_events_site_idx on public.visit_events (site, received_at desc);
create index visit_events_session_idx on public.visit_events (session_id);
create index visit_events_visitor_idx on public.visit_events (visitor_id);

alter table public.visit_events enable row level security;

create policy "admin lit les visites" on public.visit_events
  for select to authenticated using (public.is_admin());

create policy "admin supprime des visites" on public.visit_events
  for delete to authenticated using (public.is_admin());

-- ——— Une ligne par session : début, fin, durée, pages, parcours ———
create view public.visit_sessions
with (security_invoker = true) as
select
  e.session_id,
  min(e.site) as site,
  min(e.visitor_id::text)::uuid as visitor_id,
  max(e.visit_number) as visit_number,
  min(e.received_at) as started_at,
  max(e.received_at) as ended_at,
  coalesce(sum(e.engaged_ms) filter (where e.type = 'leave'), 0)::bigint as engaged_ms,
  count(*) filter (where e.type = 'pageview')::int as pageviews,
  count(*) filter (where e.type = 'click')::int as clicks,
  count(*) filter (where e.type = 'event')::int as events,
  max(e.scroll_pct) as max_scroll_pct,
  (array_agg(e.path order by e.received_at) filter (where e.type = 'pageview'))[1] as landing_path,
  (array_agg(e.referrer_host order by e.received_at) filter (where e.type = 'pageview'))[1] as referrer_host,
  (array_agg(e.utm_source order by e.received_at) filter (where e.type = 'pageview'))[1] as utm_source,
  (array_agg(e.utm_campaign order by e.received_at) filter (where e.type = 'pageview'))[1] as utm_campaign,
  max(e.from_session::text)::uuid as from_session,
  max(e.country) as country,
  max(e.region) as region,
  max(e.city) as city,
  max(e.device_type) as device_type,
  max(e.os) as os,
  max(e.browser) as browser,
  bool_or(e.is_bot) as is_bot
from public.visit_events e
where e.session_id is not null
group by e.session_id;

-- ——— Résumé pour l'espace admin ———
create or replace function public.visits_overview(p_days integer default 30)
returns jsonb
language plpgsql
stable
security invoker
set search_path = public
as $$
declare
  since timestamptz := now() - make_interval(days => greatest(1, least(p_days, 800)));
  result jsonb;
begin
  if not public.is_admin() then
    raise exception 'réservé à l''admin';
  end if;

  with ev as (
    select * from public.visit_events where received_at >= since and not is_bot
  ),
  ses as (
    select * from public.visit_sessions where started_at >= since and not coalesce(is_bot, false)
  )
  select jsonb_build_object(
    'since', since,
    'sites', (
      select coalesce(jsonb_agg(s order by s.sessions desc), '[]'::jsonb) from (
        select site,
          count(distinct visitor_id)::int as visitors,
          count(*)::int as sessions,
          sum(pageviews)::int as pageviews,
          round(avg(engaged_ms) / 1000.0)::int as avg_seconds,
          round(100.0 * count(*) filter (where pageviews <= 1 and engaged_ms < 10000) / greatest(count(*), 1))::int as bounce_pct
        from ses group by site
      ) s
    ),
    'days', (
      select coalesce(jsonb_agg(d order by d.day), '[]'::jsonb) from (
        select to_char(date_trunc('day', started_at at time zone 'Europe/Paris'), 'YYYY-MM-DD') as day,
          site, count(*)::int as sessions
        from ses group by 1, 2
      ) d
    ),
    'sources', (
      select coalesce(jsonb_agg(x order by x.sessions desc), '[]'::jsonb) from (
        select coalesce(utm_source, referrer_host, 'direct') as source, site, count(*)::int as sessions
        from ses group by 1, 2 order by 3 desc limit 30
      ) x
    ),
    'pages', (
      select coalesce(jsonb_agg(p order by p.views desc), '[]'::jsonb) from (
        select site, path, count(*)::int as views
        from ev where type = 'pageview' group by 1, 2 order by 3 desc limit 30
      ) p
    ),
    'clicks', (
      select coalesce(jsonb_agg(c order by c.n desc), '[]'::jsonb) from (
        select site, name, count(*)::int as n
        from ev where type in ('click', 'event') and name is not null group by 1, 2 order by 3 desc limit 40
      ) c
    ),
    'places', (
      select coalesce(jsonb_agg(l order by l.sessions desc), '[]'::jsonb) from (
        select coalesce(city, '?') as city, coalesce(region, '') as region, coalesce(country, '?') as country,
          count(*)::int as sessions
        from ses group by 1, 2, 3 order by 4 desc limit 30
      ) l
    ),
    'devices', (
      select coalesce(jsonb_agg(v order by v.sessions desc), '[]'::jsonb) from (
        select coalesce(device_type, 'unknown') as device_type, coalesce(os, '?') as os,
          coalesce(browser, '?') as browser, count(*)::int as sessions
        from ses group by 1, 2, 3 order by 4 desc limit 20
      ) v
    ),
    'journeys', (
      select coalesce(jsonb_agg(j order by j.sessions desc), '[]'::jsonb) from (
        select a.site as from_site, b.site as to_site, count(*)::int as sessions
        from ses b join public.visit_sessions a on a.session_id = b.from_session
        group by 1, 2
      ) j
    ),
    'recent', (
      select coalesce(jsonb_agg(r order by r.started_at desc), '[]'::jsonb) from (
        select session_id, site, visit_number, started_at, engaged_ms, pageviews, clicks, max_scroll_pct,
          landing_path, coalesce(utm_source, referrer_host) as source, city, region, country,
          device_type, os, browser, from_session is not null as linked
        from ses order by started_at desc limit 60
      ) r
    )
  ) into result;
  return result;
end;
$$;

revoke all on function public.visits_overview(integer) from public, anon;
grant execute on function public.visits_overview(integer) to authenticated;

-- ——— Conservation : 25 mois au plus (recommandation de la CNIL pour la mesure d'audience) ———
create or replace function public.purge_old_visit_events()
returns integer
language sql
security definer
set search_path = public
as $$
  with gone as (
    delete from public.visit_events where received_at < now() - interval '25 months' returning 1
  )
  select count(*)::int from gone;
$$;

revoke all on function public.purge_old_visit_events() from public, anon, authenticated;

create extension if not exists pg_cron;
select cron.schedule('vitrine-purge-visites', '17 3 1 * *', 'select public.purge_old_visit_events();');
