-- M King Reads: monetization (Plus subscriptions, tips, sponsors), reading stats, admin tools.
-- All objects are prefixed booknest_ so they stay isolated from other apps in this project.

create or replace function public.booknest_is_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.booknest_admins a where a.user_id = (select auth.uid()));
$$;
revoke all on function public.booknest_is_admin() from public, anon;
grant execute on function public.booknest_is_admin() to authenticated;

-- Billing configuration (singleton) --------------------------------------
create table if not exists public.booknest_billing_config (
  id boolean primary key default true check (id = true),
  plus_monthly_ngn integer not null default 1000 check (plus_monthly_ngn > 0),
  plus_yearly_ngn integer not null default 9000 check (plus_yearly_ngn > 0),
  sponsor_weekly_ngn integer not null default 5000 check (sponsor_weekly_ngn > 0),
  monthly_days integer not null default 30,
  yearly_days integer not null default 365,
  payment_enabled boolean not null default false,
  bank_name text,
  account_name text,
  account_number text,
  support_email text,
  updated_at timestamptz not null default now()
);
alter table public.booknest_billing_config enable row level security;
alter table public.booknest_billing_config force row level security;
revoke all on public.booknest_billing_config from anon, authenticated;

create or replace function public.booknest_public_billing()
returns table (plus_monthly_ngn integer, plus_yearly_ngn integer, sponsor_weekly_ngn integer,
  payment_enabled boolean, bank_name text, account_name text, account_number text, support_email text)
language sql stable security definer set search_path = '' as $$
  select c.plus_monthly_ngn, c.plus_yearly_ngn, c.sponsor_weekly_ngn, c.payment_enabled,
    case when c.payment_enabled then c.bank_name end,
    case when c.payment_enabled then c.account_name end,
    case when c.payment_enabled then c.account_number end,
    c.support_email
  from public.booknest_billing_config c where c.id = true;
$$;
grant execute on function public.booknest_public_billing() to anon, authenticated;

-- Subscriptions -----------------------------------------------------------
create table if not exists public.booknest_subscriptions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  plan text not null default 'free' check (plan in ('free','plus')),
  status text not null default 'free' check (status in ('free','active','expired')),
  billing_period text check (billing_period in ('monthly','yearly')),
  starts_at timestamptz,
  expires_at timestamptz,
  updated_at timestamptz not null default now()
);
alter table public.booknest_subscriptions enable row level security;
alter table public.booknest_subscriptions force row level security;
revoke all on public.booknest_subscriptions from anon, authenticated;
grant select on public.booknest_subscriptions to authenticated;
drop policy if exists "booknest subs own read" on public.booknest_subscriptions;
create policy "booknest subs own read" on public.booknest_subscriptions for select to authenticated
  using ((select auth.uid()) = user_id or (select public.booknest_is_admin()));

-- Payment requests (Plus, tips, sponsorships) -----------------------------
create table if not exists public.booknest_payment_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('plus','tip','sponsor')),
  billing_period text check (billing_period in ('monthly','yearly')),
  amount integer not null check (amount > 0 and amount <= 10000000),
  payment_reference text not null check (char_length(payment_reference) between 3 and 160),
  payer_name text check (char_length(payer_name) <= 120),
  note text check (char_length(note) <= 1000),
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id) on delete set null
);
create index if not exists booknest_payment_requests_user_idx on public.booknest_payment_requests(user_id);
create index if not exists booknest_payment_requests_pending_idx on public.booknest_payment_requests(created_at) where status = 'pending';
create index if not exists booknest_payment_requests_reviewer_idx on public.booknest_payment_requests(reviewed_by);
alter table public.booknest_payment_requests enable row level security;
alter table public.booknest_payment_requests force row level security;
revoke all on public.booknest_payment_requests from anon, authenticated;
grant select, insert on public.booknest_payment_requests to authenticated;
drop policy if exists "booknest payments own insert" on public.booknest_payment_requests;
create policy "booknest payments own insert" on public.booknest_payment_requests for insert to authenticated
  with check ((select auth.uid()) = user_id and status = 'pending' and reviewed_at is null and reviewed_by is null);
drop policy if exists "booknest payments own read" on public.booknest_payment_requests;
create policy "booknest payments own read" on public.booknest_payment_requests for select to authenticated
  using ((select auth.uid()) = user_id or (select public.booknest_is_admin()));

create or replace function public.booknest_payment_request_guard()
returns trigger language plpgsql security definer set search_path = '' as $$
declare cfg public.booknest_billing_config; pending_count integer;
begin
  select * into cfg from public.booknest_billing_config where id = true;
  if cfg is null or not cfg.payment_enabled then raise exception 'Payments are not open yet.'; end if;
  select count(*) into pending_count from public.booknest_payment_requests where user_id = new.user_id and status = 'pending';
  if pending_count >= 3 then raise exception 'You already have payments awaiting confirmation.'; end if;
  if new.kind = 'plus' then
    if new.billing_period is null then raise exception 'Choose monthly or yearly.'; end if;
    if new.amount < (case when new.billing_period = 'yearly' then cfg.plus_yearly_ngn else cfg.plus_monthly_ngn end) then
      raise exception 'The amount is below the plan price.';
    end if;
  else
    new.billing_period := null;
  end if;
  new.status := 'pending'; new.reviewed_at := null; new.reviewed_by := null; new.created_at := now();
  return new;
end $$;
drop trigger if exists booknest_payment_request_guard on public.booknest_payment_requests;
create trigger booknest_payment_request_guard before insert on public.booknest_payment_requests
  for each row execute function public.booknest_payment_request_guard();

-- Admin: review payment ----------------------------------------------------
create or replace function public.booknest_admin_review_payment(p_id uuid, p_decision text)
returns text language plpgsql security definer set search_path = '' as $$
declare req public.booknest_payment_requests; cfg public.booknest_billing_config; cur public.booknest_subscriptions; base timestamptz; days integer;
begin
  if not public.booknest_is_admin() then raise exception 'Administrator access required.'; end if;
  if p_decision not in ('approved','rejected') then raise exception 'Invalid decision.'; end if;
  select * into req from public.booknest_payment_requests where id = p_id for update;
  if req is null then raise exception 'Payment request not found.'; end if;
  if req.status <> 'pending' then raise exception 'This request has already been reviewed.'; end if;
  if p_decision = 'approved' and req.kind = 'plus' then
    select * into cfg from public.booknest_billing_config where id = true;
    days := case when req.billing_period = 'yearly' then cfg.yearly_days else cfg.monthly_days end;
    select * into cur from public.booknest_subscriptions where user_id = req.user_id for update;
    base := greatest(now(), coalesce(case when cur.status = 'active' then cur.expires_at end, now()));
    insert into public.booknest_subscriptions as s (user_id, plan, status, billing_period, starts_at, expires_at, updated_at)
      values (req.user_id, 'plus', 'active', req.billing_period, now(), base + make_interval(days => days), now())
      on conflict (user_id) do update set plan = 'plus', status = 'active', billing_period = excluded.billing_period,
        starts_at = coalesce(case when s.status = 'active' then s.starts_at end, now()), expires_at = excluded.expires_at, updated_at = now();
  end if;
  update public.booknest_payment_requests set status = p_decision, reviewed_at = now(), reviewed_by = (select auth.uid()) where id = p_id;
  return p_decision;
end $$;
revoke all on function public.booknest_admin_review_payment(uuid, text) from public, anon;
grant execute on function public.booknest_admin_review_payment(uuid, text) to authenticated;

create or replace function public.booknest_admin_set_plus(p_email text, p_days integer)
returns timestamptz language plpgsql security definer set search_path = '' as $$
declare uid uuid; exp timestamptz;
begin
  if not public.booknest_is_admin() then raise exception 'Administrator access required.'; end if;
  select id into uid from auth.users where lower(email) = lower(trim(p_email));
  if uid is null then raise exception 'No account uses that email.'; end if;
  if p_days <= 0 then
    update public.booknest_subscriptions set plan = 'free', status = 'expired', expires_at = now(), updated_at = now() where user_id = uid;
    return now();
  end if;
  exp := now() + make_interval(days => least(p_days, 3650));
  insert into public.booknest_subscriptions (user_id, plan, status, billing_period, starts_at, expires_at)
    values (uid, 'plus', 'active', 'monthly', now(), exp)
    on conflict (user_id) do update set plan='plus', status='active', expires_at = exp, updated_at = now();
  return exp;
end $$;
revoke all on function public.booknest_admin_set_plus(text, integer) from public, anon;
grant execute on function public.booknest_admin_set_plus(text, integer) to authenticated;

create or replace function public.booknest_admin_payment_overview()
returns table (id uuid, email text, kind text, billing_period text, amount integer, payment_reference text,
  payer_name text, note text, status text, created_at timestamptz)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.booknest_is_admin() then raise exception 'Administrator access required.'; end if;
  return query select p.id, u.email::text, p.kind, p.billing_period, p.amount, p.payment_reference, p.payer_name, p.note, p.status, p.created_at
    from public.booknest_payment_requests p join auth.users u on u.id = p.user_id
    order by (p.status = 'pending') desc, p.created_at desc limit 200;
end $$;
revoke all on function public.booknest_admin_payment_overview() from public, anon;
grant execute on function public.booknest_admin_payment_overview() to authenticated;

create or replace function public.booknest_admin_stats()
returns json language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.booknest_is_admin() then raise exception 'Administrator access required.'; end if;
  return json_build_object(
    'readers', (select count(*) from auth.users u where exists (select 1 from public.booknest_library l where l.user_id=u.id) or exists (select 1 from public.booknest_reading_days d where d.user_id=u.id)),
    'plus_active', (select count(*) from public.booknest_subscriptions where status = 'active' and expires_at > now()),
    'revenue_30d', (select coalesce(sum(amount),0) from public.booknest_payment_requests where status='approved' and reviewed_at > now() - interval '30 days'),
    'revenue_total', (select coalesce(sum(amount),0) from public.booknest_payment_requests where status='approved'),
    'pending', (select count(*) from public.booknest_payment_requests where status='pending'),
    'books', (select count(*) from public.booknest_books),
    'reading_minutes_7d', (select coalesce(sum(seconds),0)/60 from public.booknest_reading_days where day > current_date - 7)
  );
end $$;

create or replace function public.booknest_admin_update_billing(p_plus_monthly integer, p_plus_yearly integer, p_sponsor_weekly integer,
  p_enabled boolean, p_bank text, p_account_name text, p_account_number text, p_support_email text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.booknest_is_admin() then raise exception 'Administrator access required.'; end if;
  update public.booknest_billing_config set plus_monthly_ngn = p_plus_monthly, plus_yearly_ngn = p_plus_yearly,
    sponsor_weekly_ngn = p_sponsor_weekly, payment_enabled = p_enabled, bank_name = nullif(trim(p_bank),''),
    account_name = nullif(trim(p_account_name),''), account_number = nullif(regexp_replace(p_account_number,'\D','','g'),''),
    support_email = nullif(trim(p_support_email),''), updated_at = now() where id = true;
end $$;
revoke all on function public.booknest_admin_update_billing(integer,integer,integer,boolean,text,text,text,text) from public, anon;
grant execute on function public.booknest_admin_update_billing(integer,integer,integer,boolean,text,text,text,text) to authenticated;

-- Sponsored placements -----------------------------------------------------
create table if not exists public.booknest_sponsors (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 2 and 80),
  body text check (char_length(body) <= 200),
  cta text not null default 'Learn more' check (char_length(cta) <= 30),
  image_url text,
  link_url text not null check (link_url ~* '^https?://'),
  active boolean not null default true,
  starts_at timestamptz not null default now(),
  ends_at timestamptz not null default now() + interval '7 days',
  impressions bigint not null default 0,
  clicks bigint not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists booknest_sponsors_live_idx on public.booknest_sponsors(ends_at) where active;
alter table public.booknest_sponsors enable row level security;
alter table public.booknest_sponsors force row level security;
revoke all on public.booknest_sponsors from anon, authenticated;
grant select on public.booknest_sponsors to anon, authenticated;
grant insert, update, delete on public.booknest_sponsors to authenticated;
drop policy if exists "booknest sponsors live read" on public.booknest_sponsors;
create policy "booknest sponsors live read" on public.booknest_sponsors for select to anon, authenticated
  using ((active and now() between starts_at and ends_at) or (select public.booknest_is_admin()));
drop policy if exists "booknest sponsors admin insert" on public.booknest_sponsors;
create policy "booknest sponsors admin insert" on public.booknest_sponsors for insert to authenticated with check ((select public.booknest_is_admin()));
drop policy if exists "booknest sponsors admin update" on public.booknest_sponsors;
create policy "booknest sponsors admin update" on public.booknest_sponsors for update to authenticated using ((select public.booknest_is_admin())) with check ((select public.booknest_is_admin()));
drop policy if exists "booknest sponsors admin delete" on public.booknest_sponsors;
create policy "booknest sponsors admin delete" on public.booknest_sponsors for delete to authenticated using ((select public.booknest_is_admin()));

create or replace function public.booknest_track_sponsor(p_id uuid, p_click boolean)
returns void language sql security definer set search_path = '' as $$
  update public.booknest_sponsors set impressions = impressions + (case when p_click then 0 else 1 end),
    clicks = clicks + (case when p_click then 1 else 0 end)
  where id = p_id and active and now() between starts_at and ends_at;
$$;
grant execute on function public.booknest_track_sponsor(uuid, boolean) to anon, authenticated;

-- Reading activity (streaks & stats) ---------------------------------------
create table if not exists public.booknest_reading_days (
  user_id uuid not null references auth.users(id) on delete cascade,
  day date not null default current_date,
  seconds integer not null default 0 check (seconds >= 0),
  primary key (user_id, day)
);
alter table public.booknest_reading_days enable row level security;
alter table public.booknest_reading_days force row level security;
revoke all on public.booknest_reading_days from anon, authenticated;
grant select on public.booknest_reading_days to authenticated;
drop policy if exists "booknest reading days own read" on public.booknest_reading_days;
create policy "booknest reading days own read" on public.booknest_reading_days for select to authenticated using ((select auth.uid()) = user_id);

create or replace function public.booknest_log_reading(p_seconds integer)
returns void language plpgsql security definer set search_path = '' as $$
declare uid uuid := (select auth.uid()); s integer := least(greatest(coalesce(p_seconds,0),0),300);
begin
  if uid is null or s = 0 then return; end if;
  insert into public.booknest_reading_days (user_id, day, seconds) values (uid, current_date, s)
  on conflict (user_id, day) do update set seconds = least(public.booknest_reading_days.seconds + excluded.seconds, 86400);
end $$;
revoke all on function public.booknest_log_reading(integer) from public, anon;
grant execute on function public.booknest_log_reading(integer) to authenticated;

revoke all on function public.booknest_admin_stats() from public, anon;
grant execute on function public.booknest_admin_stats() to authenticated;

-- Admin catalogue management -----------------------------------------------
grant insert, update, delete on public.booknest_books to authenticated;
drop policy if exists "booknest books admin insert" on public.booknest_books;
create policy "booknest books admin insert" on public.booknest_books for insert to authenticated with check ((select public.booknest_is_admin()));
drop policy if exists "booknest books admin update" on public.booknest_books;
create policy "booknest books admin update" on public.booknest_books for update to authenticated using ((select public.booknest_is_admin())) with check ((select public.booknest_is_admin()));
drop policy if exists "booknest books admin delete" on public.booknest_books;
create policy "booknest books admin delete" on public.booknest_books for delete to authenticated using ((select public.booknest_is_admin()));

create index if not exists booknest_books_genre_idx on public.booknest_books(genre_id);
create index if not exists booknest_books_created_idx on public.booknest_books(created_at desc);
alter table public.booknest_books add column if not exists gutenberg_id integer;
create unique index if not exists booknest_books_gutenberg_genre_uidx on public.booknest_books(gutenberg_id, genre_id) where gutenberg_id is not null;
alter table public.booknest_books add column if not exists popularity integer not null default 0;

-- Trigger function should not be callable over the API.
revoke all on function public.booknest_payment_request_guard() from public, anon, authenticated;
