-- Durcissement suggéré par les conseillers de sécurité de Supabase :
-- is_admin() s'exécute avec les droits de l'appelant (sa propre ligne d'admin lui est lisible),
-- et n'est plus appelable sans être connecté.
create or replace function public.is_admin()
returns boolean
language sql
stable
security invoker
set search_path = public
as $$
  select exists (select 1 from public.admins where user_id = (select auth.uid()));
$$;

revoke execute on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

-- auth.uid() évalué une seule fois par requête (recommandation de performance de Supabase)
alter policy "admin lit sa ligne" on public.admins using (user_id = (select auth.uid()));
