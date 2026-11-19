-- Read policies call booknest_is_admin(); anon must be able to evaluate it (it returns false for anon).
grant execute on function public.booknest_is_admin() to anon;
