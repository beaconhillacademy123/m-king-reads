-- Growth features: visitor counts, teacher reading lists.
-- Additive only: new tables and functions, nothing existing is changed.

-- 1. Visitor counts -----------------------------------------------------------
-- One row per anonymous browser per day (Lagos time). The visitor id is a random
-- string the browser makes for itself; no IP, email or device details are kept.
create table if not exists public.booknest_site_visits (
  day date not null,
  visitor text not null check (visitor ~ '^[A-Za-z0-9_-]{8,64}$'),
  views integer not null default 1,
  user_id uuid references auth.users(id) on delete set null,
  first_at timestamptz not null default now(),
  primary key (day, visitor)
);
create index if not exists booknest_site_visits_user_idx on public.booknest_site_visits (user_id) where user_id is not null;
alter table public.booknest_site_visits enable row level security;
alter table public.booknest_site_visits force row level security;
revoke all on public.booknest_site_visits from anon, authenticated;

create or replace function public.booknest_track_visit(p_visitor text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if p_visitor is null or p_visitor !~ '^[A-Za-z0-9_-]{8,64}$' then return; end if;
  insert into public.booknest_site_visits (day, visitor, user_id)
  values ((now() at time zone 'Africa/Lagos')::date, p_visitor, (select auth.uid()))
  on conflict (day, visitor) do update
    set views = least(public.booknest_site_visits.views + 1, 5000),
        user_id = coalesce(excluded.user_id, public.booknest_site_visits.user_id);
end $$;
revoke all on function public.booknest_track_visit(text) from public;
grant execute on function public.booknest_track_visit(text) to anon, authenticated;

-- Accounts on this shared Supabase project that belong to M King Reads: tagged at
-- sign-up from now on, or (for older accounts) with any reading activity here.
create or replace function public.booknest_is_reader_account(p_user uuid, p_meta jsonb)
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce(p_meta ->> 'signup_app', '') = 'm-king-reads'
    or (coalesce(p_meta ->> 'signup_app', '') = '' and (
         exists (select 1 from public.booknest_library x where x.user_id = p_user)
      or exists (select 1 from public.booknest_reading_days x where x.user_id = p_user)
      or exists (select 1 from public.booknest_reading_progress x where x.user_id = p_user)
      or exists (select 1 from public.booknest_bookmarks x where x.user_id = p_user)
      or exists (select 1 from public.booknest_notes x where x.user_id = p_user)
      or exists (select 1 from public.booknest_subscriptions x where x.user_id = p_user)
      or exists (select 1 from public.booknest_authors x where x.user_id = p_user)
      or exists (select 1 from public.booknest_site_visits x where x.user_id = p_user)));
$$;
revoke all on function public.booknest_is_reader_account(uuid, jsonb) from public, anon, authenticated;

create or replace function public.booknest_admin_traffic()
returns json language plpgsql stable security definer set search_path = '' as $$
declare
  today date := (now() at time zone 'Africa/Lagos')::date;
begin
  if not public.booknest_is_admin() then raise exception 'Administrator access required.'; end if;
  return (
    with v as (select day, count(*) as visitors, sum(views) as views from public.booknest_site_visits
               where day > today - 30 group by day),
    s as (select (u.created_at at time zone 'Africa/Lagos')::date as day, count(*) as signups
          from auth.users u
          where u.created_at > now() - interval '31 days' and public.booknest_is_reader_account(u.id, u.raw_user_meta_data)
          group by 1),
    days as (select (today - g)::date as day from generate_series(0, 13) g)
    select json_build_object(
      'visitors_today', coalesce((select visitors from v where day = today), 0),
      'visitors_7d', coalesce((select count(distinct visitor) from public.booknest_site_visits where day > today - 7), 0),
      'visitors_30d', coalesce((select count(distinct visitor) from public.booknest_site_visits where day > today - 30), 0),
      'views_today', coalesce((select views from v where day = today), 0),
      'views_7d', coalesce((select sum(views) from v where day > today - 7), 0),
      'views_30d', coalesce((select sum(views) from v), 0),
      'signups_today', coalesce((select signups from s where day = today), 0),
      'signups_7d', coalesce((select sum(signups) from s where day > today - 7), 0),
      'signups_30d', coalesce((select sum(signups) from s where day > today - 30), 0),
      'signups_total', (select count(*) from auth.users u where public.booknest_is_reader_account(u.id, u.raw_user_meta_data)),
      'reading_lists', (select count(*) from public.booknest_reading_lists),
      'series', (select json_agg(json_build_object('day', d.day, 'visitors', coalesce(v.visitors, 0), 'views', coalesce(v.views, 0), 'signups', coalesce(s.signups, 0)) order by d.day)
                 from days d left join v on v.day = d.day left join s on s.day = d.day)
    )
  );
end $$;

-- 2. Teacher reading lists ---------------------------------------------------
create table if not exists public.booknest_reading_lists (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 120),
  class_name text check (class_name is null or char_length(class_name) <= 80),
  note text check (note is null or char_length(note) <= 600),
  teacher_name text check (teacher_name is null or char_length(teacher_name) <= 80),
  share_code text not null unique default substr(replace(gen_random_uuid()::text, '-', ''), 1, 10),
  opens integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists booknest_reading_lists_owner_idx on public.booknest_reading_lists (owner_id);

create table if not exists public.booknest_reading_list_items (
  id uuid primary key default gen_random_uuid(),
  list_id uuid not null references public.booknest_reading_lists(id) on delete cascade,
  position integer not null default 0,
  book_ref text not null check (book_ref ~ '^(cat:[0-9a-f-]{36}|gut:[0-9]{1,7})$'),
  title text not null check (char_length(title) between 1 and 300),
  author text check (author is null or char_length(author) <= 200),
  cover_url text check (cover_url is null or (cover_url ~ '^https://' and char_length(cover_url) <= 500)),
  added_at timestamptz not null default now(),
  unique (list_id, book_ref)
);
create index if not exists booknest_reading_list_items_list_idx on public.booknest_reading_list_items (list_id, position);

alter table public.booknest_reading_lists enable row level security;
alter table public.booknest_reading_lists force row level security;
alter table public.booknest_reading_list_items enable row level security;
alter table public.booknest_reading_list_items force row level security;
revoke all on public.booknest_reading_lists from anon;
revoke all on public.booknest_reading_list_items from anon;
revoke all on public.booknest_reading_lists from authenticated;
grant select, insert, delete on public.booknest_reading_lists to authenticated;
grant update (title, class_name, note, teacher_name) on public.booknest_reading_lists to authenticated;
grant select, insert, update, delete on public.booknest_reading_list_items to authenticated;

drop policy if exists "teachers manage own lists" on public.booknest_reading_lists;
create policy "teachers manage own lists" on public.booknest_reading_lists for all to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));

drop policy if exists "teachers manage own list items" on public.booknest_reading_list_items;
create policy "teachers manage own list items" on public.booknest_reading_list_items for all to authenticated
  using (exists (select 1 from public.booknest_reading_lists l where l.id = list_id and l.owner_id = (select auth.uid())))
  with check (exists (select 1 from public.booknest_reading_lists l where l.id = list_id and l.owner_id = (select auth.uid())));

-- Students open a list by its share code only, so lists can't be listed or guessed in bulk.
create or replace function public.booknest_public_reading_list(p_code text)
returns json language sql stable security definer set search_path = '' as $$
  select json_build_object(
    'title', l.title, 'class_name', l.class_name, 'note', l.note, 'teacher_name', l.teacher_name,
    'share_code', l.share_code, 'updated_at', l.updated_at,
    'items', coalesce((select json_agg(json_build_object('book_ref', i.book_ref, 'title', i.title, 'author', i.author, 'cover_url', i.cover_url) order by i.position, i.added_at)
                       from public.booknest_reading_list_items i where i.list_id = l.id), '[]'::json))
  from public.booknest_reading_lists l
  where l.share_code = p_code and p_code ~ '^[a-f0-9]{10}$';
$$;
revoke all on function public.booknest_public_reading_list(text) from public;
grant execute on function public.booknest_public_reading_list(text) to anon, authenticated;

create or replace function public.booknest_count_list_open(p_code text)
returns void language sql security definer set search_path = '' as $$
  update public.booknest_reading_lists set opens = least(opens + 1, 1000000)
  where share_code = p_code and p_code ~ '^[a-f0-9]{10}$';
$$;
revoke all on function public.booknest_count_list_open(text) from public;
grant execute on function public.booknest_count_list_open(text) to anon, authenticated;

create or replace function public.booknest_touch_reading_list()
returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at := now(); return new; end $$;
drop trigger if exists booknest_reading_lists_touch on public.booknest_reading_lists;
create trigger booknest_reading_lists_touch before update on public.booknest_reading_lists
  for each row execute function public.booknest_touch_reading_list();

-- At most 50 lists per teacher and 100 books per list.
create or replace function public.booknest_limit_reading_lists()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_table_name = 'booknest_reading_lists' then
    if (select count(*) from public.booknest_reading_lists where owner_id = new.owner_id) >= 50 then
      raise exception 'You can keep up to 50 reading lists.';
    end if;
  else
    if (select count(*) from public.booknest_reading_list_items where list_id = new.list_id) >= 100 then
      raise exception 'A reading list can hold up to 100 books.';
    end if;
  end if;
  return new;
end $$;
revoke all on function public.booknest_limit_reading_lists() from public, anon, authenticated;
drop trigger if exists booknest_reading_lists_limit on public.booknest_reading_lists;
create trigger booknest_reading_lists_limit before insert on public.booknest_reading_lists
  for each row execute function public.booknest_limit_reading_lists();
drop trigger if exists booknest_reading_list_items_limit on public.booknest_reading_list_items;
create trigger booknest_reading_list_items_limit before insert on public.booknest_reading_list_items
  for each row execute function public.booknest_limit_reading_lists();

-- Defined after the lists table exists because it counts lists.
revoke all on function public.booknest_admin_traffic() from public, anon;
grant execute on function public.booknest_admin_traffic() to authenticated;
