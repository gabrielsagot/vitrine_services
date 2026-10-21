-- Lecture publique et limitée d'un lien de parrainage : le prénom affiché sur la page, rien d'autre.
-- Le site peut ainsi reconnaître /prenom avec la seule clé publique ; les tables restent fermées.
create or replace function public.get_referrer(p_slug text)
returns table (id uuid, slug text, display_name text)
language sql
stable
security definer
set search_path = public
as $$
  select r.id, r.slug, r.display_name
  from public.referrers r
  where r.slug = p_slug and r.active
  limit 1;
$$;

revoke all on function public.get_referrer(text) from public;
grant execute on function public.get_referrer(text) to anon, authenticated, service_role;

-- Le compteur de visites (une simple incrémentation) peut aussi être appelé avec la clé publique.
grant execute on function public.count_referrer_visit(text) to anon, authenticated;
