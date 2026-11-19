create or replace function public.booknest_admin_set_author_share(p_pct integer)
returns integer language plpgsql security definer set search_path = '' as $$
begin
  if not public.booknest_is_admin() then raise exception 'Administrator access required.'; end if;
  if p_pct is null or p_pct < 0 or p_pct > 100 then raise exception 'Writer share must be between 0 and 100.'; end if;
  update public.booknest_billing_config set author_share_pct = p_pct, updated_at = now() where id = true;
  return p_pct;
end $$;
revoke all on function public.booknest_admin_set_author_share(integer) from public, anon;
grant execute on function public.booknest_admin_set_author_share(integer) to authenticated;
