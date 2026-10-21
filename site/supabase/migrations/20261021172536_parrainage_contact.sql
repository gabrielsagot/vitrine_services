-- Site vitrine : parrains (liens de recommandation) et demandes de contact.
-- Toutes les lectures et écritures côté visiteur passent par le serveur (clé service_role) :
-- le public n'a aucun accès direct aux tables. L'espace admin lit et écrit en tant qu'admin connecté.

-- ——— Admins ———
create table public.admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;

-- ——— Parrains ———
create table public.referrers (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]([a-z0-9-]{0,38}[a-z0-9])?$'),
  display_name text not null check (char_length(display_name) between 1 and 60),
  note text check (char_length(note) <= 500),
  active boolean not null default true,
  visits integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ——— Demandes de contact ———
create table public.contact_requests (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  first_name text not null check (char_length(first_name) between 1 and 60),
  channel text not null check (channel in ('sms', 'whatsapp', 'email', 'appel')),
  contact text not null check (char_length(contact) <= 120),
  moment text check (moment in ('matin', 'journee', 'soir', 'libre')),
  message text check (char_length(message) <= 2000),
  model jsonb,
  referrer_id uuid references public.referrers (id) on delete set null,
  status text not null default 'nouvelle'
    check (status in ('nouvelle', 'contactee', 'devis', 'cliente', 'sans_suite')),
  admin_note text check (char_length(admin_note) <= 2000),
  updated_at timestamptz not null default now()
);

create index contact_requests_created_at_idx on public.contact_requests (created_at desc);
create index contact_requests_referrer_idx on public.contact_requests (referrer_id);

-- ——— Horodatage des modifications ———
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger referrers_touch before update on public.referrers
  for each row execute function public.touch_updated_at();
create trigger contact_requests_touch before update on public.contact_requests
  for each row execute function public.touch_updated_at();

-- ——— Sécurité : seuls les admins connectés voient et modifient ———
alter table public.admins enable row level security;
alter table public.referrers enable row level security;
alter table public.contact_requests enable row level security;

create policy "admin lit sa ligne" on public.admins
  for select to authenticated using (user_id = auth.uid());

create policy "admin gère les parrains" on public.referrers
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "admin gère les demandes" on public.contact_requests
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ——— Compteur de visites des liens (appelé par le serveur) ———
create or replace function public.count_referrer_visit(p_slug text)
returns void
language sql
security definer
set search_path = public
as $$
  update public.referrers set visits = visits + 1 where slug = p_slug and active;
$$;

revoke all on function public.count_referrer_visit(text) from public, anon, authenticated;
grant execute on function public.count_referrer_visit(text) to service_role;

-- ——— Vue pour l'espace admin : chaque parrain avec son nombre de demandes ———
create view public.referrer_stats
with (security_invoker = true) as
select
  r.*,
  (select count(*) from public.contact_requests c where c.referrer_id = r.id)::int as requests
from public.referrers r;

-- ——— Conservation : les demandes sans suite depuis 3 ans sont supprimées ———
create or replace function public.purge_old_contact_requests()
returns integer
language sql
security definer
set search_path = public
as $$
  with gone as (
    delete from public.contact_requests
    where updated_at < now() - interval '3 years' and status <> 'cliente'
    returning 1
  )
  select count(*)::int from gone;
$$;

revoke all on function public.purge_old_contact_requests() from public, anon, authenticated;
