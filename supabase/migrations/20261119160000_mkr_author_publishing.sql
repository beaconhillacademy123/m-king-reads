-- M King Reads author publishing: writers publish novels; readers unlock via Plus or purchase; authors earn a share.

alter table public.booknest_billing_config add column if not exists author_share_pct integer not null default 60 check (author_share_pct between 0 and 100);

create table if not exists public.booknest_authors (
  user_id uuid primary key references auth.users(id) on delete cascade,
  pen_name text not null check (char_length(pen_name) between 2 and 60),
  bio text check (char_length(bio) <= 600),
  phone text check (char_length(phone) <= 30),
  payout_bank text check (char_length(payout_bank) <= 80),
  payout_account_name text check (char_length(payout_account_name) <= 120),
  payout_account_number text check (payout_account_number ~ '^[0-9]{10}$'),
  status text not null default 'active' check (status in ('active','suspended')),
  agreed_terms_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create unique index if not exists booknest_authors_pen_name_uidx on public.booknest_authors (lower(pen_name));

create table if not exists public.booknest_author_books (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.booknest_authors(user_id) on delete cascade,
  title text not null check (char_length(title) between 1 and 120),
  description text check (char_length(description) <= 1500),
  language text not null default 'en' check (language in ('en','ha','yo','ig','pcm')),
  genre text not null default 'romance' check (genre in ('romance','drama','mystery','thriller','fantasy','horror','comedy','faith','history','young-adult','children','poetry','non-fiction')),
  cover_url text,
  access text not null default 'plus' check (access in ('free','plus','paid')),
  price_ngn integer not null default 0 check (price_ngn between 0 and 50000),
  free_chapters integer not null default 1 check (free_chapters between 1 and 10),
  mature boolean not null default false,
  status text not null default 'draft' check (status in ('draft','pending','published','rejected')),
  review_note text,
  reads integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz,
  check (access <> 'paid' or price_ngn >= 100)
);
create index if not exists booknest_author_books_author_idx on public.booknest_author_books(author_id);
create index if not exists booknest_author_books_live_idx on public.booknest_author_books(language, published_at desc) where status = 'published';

create table if not exists public.booknest_author_chapters (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null references public.booknest_author_books(id) on delete cascade,
  position integer not null check (position >= 1),
  title text not null check (char_length(title) between 1 and 120),
  content text not null default '' check (char_length(content) <= 200000),
  word_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (book_id, position)
);

create table if not exists public.booknest_author_purchases (
  user_id uuid not null references auth.users(id) on delete cascade,
  book_id uuid not null references public.booknest_author_books(id) on delete cascade,
  amount integer not null,
  payment_id uuid,
  created_at timestamptz not null default now(),
  primary key (user_id, book_id)
);
create index if not exists booknest_author_purchases_book_idx on public.booknest_author_purchases(book_id);

create table if not exists public.booknest_author_earnings (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.booknest_authors(user_id) on delete cascade,
  book_id uuid references public.booknest_author_books(id) on delete set null,
  source text not null check (source in ('sale','plus_pool','bonus')),
  amount integer not null check (amount >= 0),
  note text,
  paid_out boolean not null default false,
  paid_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists booknest_author_earnings_author_idx on public.booknest_author_earnings(author_id);
create index if not exists booknest_author_earnings_book_idx on public.booknest_author_earnings(book_id);

create table if not exists public.booknest_author_reads (
  user_id uuid not null references auth.users(id) on delete cascade,
  chapter_id uuid not null references public.booknest_author_chapters(id) on delete cascade,
  book_id uuid not null references public.booknest_author_books(id) on delete cascade,
  via_plus boolean not null default false,
  read_at timestamptz not null default now(),
  primary key (user_id, chapter_id)
);
create index if not exists booknest_author_reads_book_idx on public.booknest_author_reads(book_id, read_at);
create index if not exists booknest_author_reads_chapter_idx on public.booknest_author_reads(chapter_id);

-- Book purchases go through the existing payment flow.
alter table public.booknest_payment_requests drop constraint if exists booknest_payment_requests_kind_check;
alter table public.booknest_payment_requests add constraint booknest_payment_requests_kind_check check (kind in ('plus','tip','sponsor','book'));
alter table public.booknest_payment_requests add column if not exists book_id uuid references public.booknest_author_books(id) on delete set null;
create index if not exists booknest_payment_requests_book_idx on public.booknest_payment_requests(book_id);

-- ---------- access helpers ----------
create or replace function public.booknest_has_plus(p_user uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.booknest_subscriptions s where s.user_id = p_user and s.plan = 'plus' and s.status = 'active' and s.expires_at > now());
$$;
revoke all on function public.booknest_has_plus(uuid) from public, anon, authenticated;

create or replace function public.booknest_can_read_author_chapter(p_book uuid, p_position integer)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.booknest_author_books b
    where b.id = p_book and (
      b.author_id = (select auth.uid())
      or public.booknest_is_admin()
      or (b.status = 'published' and (
        p_position <= b.free_chapters
        or b.access = 'free'
        or (b.access = 'plus' and public.booknest_has_plus((select auth.uid())))
        or exists (select 1 from public.booknest_author_purchases p where p.book_id = b.id and p.user_id = (select auth.uid()))
      ))
    ));
$$;
grant execute on function public.booknest_can_read_author_chapter(uuid, integer) to anon, authenticated;

create or replace function public.booknest_author_toc(p_book uuid)
returns table (id uuid, chapter_position integer, title text, word_count integer, unlocked boolean)
language sql stable security definer set search_path = '' as $$
  select c.id, c.position, c.title, c.word_count, public.booknest_can_read_author_chapter(c.book_id, c.position)
  from public.booknest_author_chapters c join public.booknest_author_books b on b.id = c.book_id
  where c.book_id = p_book and (b.status = 'published' or b.author_id = (select auth.uid()) or public.booknest_is_admin())
  order by c.position;
$$;
grant execute on function public.booknest_author_toc(uuid) to anon, authenticated;

-- ---------- RLS ----------
alter table public.booknest_authors enable row level security;
alter table public.booknest_author_books enable row level security;
alter table public.booknest_author_chapters enable row level security;
alter table public.booknest_author_purchases enable row level security;
alter table public.booknest_author_earnings enable row level security;
alter table public.booknest_author_reads enable row level security;
alter table public.booknest_authors force row level security;
alter table public.booknest_author_books force row level security;
alter table public.booknest_author_chapters force row level security;
alter table public.booknest_author_purchases force row level security;
alter table public.booknest_author_earnings force row level security;
alter table public.booknest_author_reads force row level security;
revoke all on public.booknest_authors, public.booknest_author_books, public.booknest_author_chapters, public.booknest_author_purchases, public.booknest_author_earnings, public.booknest_author_reads from anon, authenticated;

-- Only public profile columns are readable; payout details come back through booknest_my_author().
grant select (user_id, pen_name, bio, status, created_at) on public.booknest_authors to anon, authenticated;
grant insert, update on public.booknest_authors to authenticated;
create policy "authors public profile" on public.booknest_authors for select to anon, authenticated using (true);
create policy "authors own insert" on public.booknest_authors for insert to authenticated with check ((select auth.uid()) = user_id and status = 'active');
create policy "authors own update" on public.booknest_authors for update to authenticated using ((select auth.uid()) = user_id or (select public.booknest_is_admin())) with check ((select auth.uid()) = user_id or (select public.booknest_is_admin()));

grant select on public.booknest_author_books to anon;
grant select, insert, update, delete on public.booknest_author_books to authenticated;
create policy "author books read" on public.booknest_author_books for select to anon, authenticated
  using (status = 'published' or author_id = (select auth.uid()) or (select public.booknest_is_admin()));
create policy "author books own insert" on public.booknest_author_books for insert to authenticated
  with check (author_id = (select auth.uid()) and status in ('draft','pending')
    and exists (select 1 from public.booknest_authors a where a.user_id = (select auth.uid()) and a.status = 'active'));
create policy "author books own update" on public.booknest_author_books for update to authenticated
  using (author_id = (select auth.uid()) or (select public.booknest_is_admin())) with check (author_id = (select auth.uid()) or (select public.booknest_is_admin()));
create policy "author books own delete" on public.booknest_author_books for delete to authenticated
  using ((author_id = (select auth.uid()) and status <> 'published') or (select public.booknest_is_admin()));

grant select on public.booknest_author_chapters to anon;
grant select, insert, update, delete on public.booknest_author_chapters to authenticated;
create policy "author chapters read" on public.booknest_author_chapters for select to anon, authenticated
  using ((select public.booknest_can_read_author_chapter(book_id, position)));
create policy "author chapters own write" on public.booknest_author_chapters for insert to authenticated
  with check (exists (select 1 from public.booknest_author_books b where b.id = book_id and b.author_id = (select auth.uid())));
create policy "author chapters own update" on public.booknest_author_chapters for update to authenticated
  using (exists (select 1 from public.booknest_author_books b where b.id = book_id and b.author_id = (select auth.uid())))
  with check (exists (select 1 from public.booknest_author_books b where b.id = book_id and b.author_id = (select auth.uid())));
create policy "author chapters own delete" on public.booknest_author_chapters for delete to authenticated
  using (exists (select 1 from public.booknest_author_books b where b.id = book_id and b.author_id = (select auth.uid())) or (select public.booknest_is_admin()));

grant select on public.booknest_author_purchases to authenticated;
create policy "purchases own read" on public.booknest_author_purchases for select to authenticated
  using (user_id = (select auth.uid()) or (select public.booknest_is_admin()));

grant select on public.booknest_author_earnings to authenticated;
create policy "earnings own read" on public.booknest_author_earnings for select to authenticated
  using (author_id = (select auth.uid()) or (select public.booknest_is_admin()));

grant select on public.booknest_author_reads to authenticated;
create policy "reads own read" on public.booknest_author_reads for select to authenticated using (user_id = (select auth.uid()));

-- ---------- integrity triggers ----------
create or replace function public.booknest_author_book_guard()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if not public.booknest_is_admin() then
    if tg_op = 'UPDATE' then
      new.author_id := old.author_id; new.reads := old.reads; new.review_note := old.review_note; new.published_at := old.published_at;
      if new.status <> old.status and new.status not in ('draft','pending') then raise exception 'Only an editor can publish or reject a book.'; end if;
      if old.status = 'published' and new.status = 'published' then null; end if;
    else
      new.reads := 0; new.review_note := null; new.published_at := null;
      if new.status not in ('draft','pending') then new.status := 'draft'; end if;
    end if;
  elsif new.status = 'published' and (tg_op = 'INSERT' or old.status <> 'published') then
    new.published_at := coalesce(new.published_at, now());
  end if;
  if new.access <> 'paid' then new.price_ngn := 0; end if;
  new.updated_at := now();
  return new;
end $$;
drop trigger if exists booknest_author_book_guard on public.booknest_author_books;
create trigger booknest_author_book_guard before insert or update on public.booknest_author_books for each row execute function public.booknest_author_book_guard();
revoke all on function public.booknest_author_book_guard() from public, anon, authenticated;

create or replace function public.booknest_author_chapter_touch()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.word_count := coalesce(array_length(regexp_split_to_array(trim(new.content), '\s+'), 1), 0);
  if trim(new.content) = '' then new.word_count := 0; end if;
  new.updated_at := now();
  return new;
end $$;
drop trigger if exists booknest_author_chapter_touch on public.booknest_author_chapters;
create trigger booknest_author_chapter_touch before insert or update on public.booknest_author_chapters for each row execute function public.booknest_author_chapter_touch();
revoke all on function public.booknest_author_chapter_touch() from public, anon, authenticated;

create or replace function public.booknest_author_profile_guard()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if not public.booknest_is_admin() then
    new.status := case when tg_op = 'UPDATE' then old.status else 'active' end;
    if tg_op = 'UPDATE' then new.agreed_terms_at := old.agreed_terms_at; new.created_at := old.created_at; end if;
  end if;
  return new;
end $$;
drop trigger if exists booknest_author_profile_guard on public.booknest_authors;
create trigger booknest_author_profile_guard before insert or update on public.booknest_authors for each row execute function public.booknest_author_profile_guard();
revoke all on function public.booknest_author_profile_guard() from public, anon, authenticated;

-- Book payments: validate price.
create or replace function public.booknest_payment_request_guard()
returns trigger language plpgsql security definer set search_path = '' as $$
declare cfg public.booknest_billing_config; pending_count integer; bk public.booknest_author_books;
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
  if new.kind = 'book' then
    select * into bk from public.booknest_author_books where id = new.book_id;
    if bk is null or bk.status <> 'published' or bk.access <> 'paid' then raise exception 'This book is not for sale.'; end if;
    if new.amount < bk.price_ngn then raise exception 'The amount is below the book price.'; end if;
    if exists (select 1 from public.booknest_author_purchases p where p.user_id = new.user_id and p.book_id = new.book_id) then raise exception 'You already own this book.'; end if;
  else
    new.book_id := null;
  end if;
  new.status := 'pending'; new.reviewed_at := null; new.reviewed_by := null; new.created_at := now();
  return new;
end $$;
revoke all on function public.booknest_payment_request_guard() from public, anon, authenticated;

create or replace function public.booknest_admin_review_payment(p_id uuid, p_decision text)
returns text language plpgsql security definer set search_path = '' as $$
declare req public.booknest_payment_requests; cfg public.booknest_billing_config; cur public.booknest_subscriptions; base timestamptz; days integer; bk public.booknest_author_books;
begin
  if not public.booknest_is_admin() then raise exception 'Administrator access required.'; end if;
  if p_decision not in ('approved','rejected') then raise exception 'Invalid decision.'; end if;
  select * into req from public.booknest_payment_requests where id = p_id for update;
  if req is null then raise exception 'Payment request not found.'; end if;
  if req.status <> 'pending' then raise exception 'This request has already been reviewed.'; end if;
  select * into cfg from public.booknest_billing_config where id = true;
  if p_decision = 'approved' and req.kind = 'plus' then
    days := case when req.billing_period = 'yearly' then cfg.yearly_days else cfg.monthly_days end;
    select * into cur from public.booknest_subscriptions where user_id = req.user_id for update;
    base := greatest(now(), coalesce(case when cur.status = 'active' then cur.expires_at end, now()));
    insert into public.booknest_subscriptions as s (user_id, plan, status, billing_period, starts_at, expires_at, updated_at)
      values (req.user_id, 'plus', 'active', req.billing_period, now(), base + make_interval(days => days), now())
      on conflict (user_id) do update set plan = 'plus', status = 'active', billing_period = excluded.billing_period,
        starts_at = coalesce(case when s.status = 'active' then s.starts_at end, now()), expires_at = excluded.expires_at, updated_at = now();
  end if;
  if p_decision = 'approved' and req.kind = 'book' and req.book_id is not null then
    select * into bk from public.booknest_author_books where id = req.book_id;
    insert into public.booknest_author_purchases (user_id, book_id, amount, payment_id) values (req.user_id, req.book_id, req.amount, req.id) on conflict do nothing;
    if bk is not null then
      insert into public.booknest_author_earnings (author_id, book_id, source, amount, note)
        values (bk.author_id, bk.id, 'sale', floor(req.amount * cfg.author_share_pct / 100.0)::int, 'Sale of ' || bk.title);
    end if;
  end if;
  update public.booknest_payment_requests set status = p_decision, reviewed_at = now(), reviewed_by = (select auth.uid()) where id = p_id;
  return p_decision;
end $$;

-- Payment overview now includes book title.
drop function if exists public.booknest_admin_payment_overview();
create function public.booknest_admin_payment_overview()
returns table (id uuid, email text, kind text, billing_period text, amount integer, payment_reference text,
  payer_name text, note text, status text, created_at timestamptz, book_title text)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.booknest_is_admin() then raise exception 'Administrator access required.'; end if;
  return query select p.id, u.email::text, p.kind, p.billing_period, p.amount, p.payment_reference, p.payer_name, p.note, p.status, p.created_at, b.title
    from public.booknest_payment_requests p join auth.users u on u.id = p.user_id left join public.booknest_author_books b on b.id = p.book_id
    order by (p.status = 'pending') desc, p.created_at desc limit 200;
end $$;
revoke all on function public.booknest_admin_payment_overview() from public, anon;
grant execute on function public.booknest_admin_payment_overview() to authenticated;

-- Reads: count unique readers per chapter; remember whether a Plus membership unlocked it.
create or replace function public.booknest_log_author_read(p_chapter uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare uid uuid := (select auth.uid()); ch public.booknest_author_chapters; bk public.booknest_author_books; inserted integer;
begin
  if uid is null then return; end if;
  select * into ch from public.booknest_author_chapters where id = p_chapter;
  if ch is null or not public.booknest_can_read_author_chapter(ch.book_id, ch.position) then return; end if;
  select * into bk from public.booknest_author_books where id = ch.book_id;
  if bk.author_id = uid then return; end if;
  insert into public.booknest_author_reads (user_id, chapter_id, book_id, via_plus)
    values (uid, ch.id, ch.book_id, bk.access = 'plus' and ch.position > bk.free_chapters and public.booknest_has_plus(uid))
    on conflict do nothing;
  get diagnostics inserted = row_count;
  if inserted > 0 and ch.position = 1 then update public.booknest_author_books set reads = reads + 1 where id = ch.book_id; end if;
end $$;
revoke all on function public.booknest_log_author_read(uuid) from public, anon;
grant execute on function public.booknest_log_author_read(uuid) to authenticated;

-- Author dashboard stats.
create or replace function public.booknest_author_stats()
returns json language sql stable security definer set search_path = '' as $$
  select json_build_object(
    'books', (select count(*) from public.booknest_author_books where author_id = (select auth.uid())),
    'published', (select count(*) from public.booknest_author_books where author_id = (select auth.uid()) and status = 'published'),
    'readers', (select coalesce(sum(reads),0) from public.booknest_author_books where author_id = (select auth.uid())),
    'plus_reads_30d', (select count(*) from public.booknest_author_reads r join public.booknest_author_books b on b.id = r.book_id where b.author_id = (select auth.uid()) and r.via_plus and r.read_at > now() - interval '30 days'),
    'sales', (select count(*) from public.booknest_author_purchases p join public.booknest_author_books b on b.id = p.book_id where b.author_id = (select auth.uid())),
    'earned', (select coalesce(sum(amount),0) from public.booknest_author_earnings where author_id = (select auth.uid())),
    'unpaid', (select coalesce(sum(amount),0) from public.booknest_author_earnings where author_id = (select auth.uid()) and not paid_out)
  );
$$;
revoke all on function public.booknest_author_stats() from public, anon;
grant execute on function public.booknest_author_stats() to authenticated;

create or replace function public.booknest_my_author()
returns table (user_id uuid, pen_name text, bio text, phone text, payout_bank text, payout_account_name text, payout_account_number text, status text, created_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select a.user_id, a.pen_name, a.bio, a.phone, a.payout_bank, a.payout_account_name, a.payout_account_number, a.status, a.created_at
  from public.booknest_authors a where a.user_id = (select auth.uid());
$$;
revoke all on function public.booknest_my_author() from public, anon;
grant execute on function public.booknest_my_author() to authenticated;

-- Admin: review books, author overview, payouts, Plus pool.
create or replace function public.booknest_admin_review_book(p_book uuid, p_decision text, p_note text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.booknest_is_admin() then raise exception 'Administrator access required.'; end if;
  if p_decision not in ('published','rejected','draft') then raise exception 'Invalid decision.'; end if;
  update public.booknest_author_books set status = p_decision, review_note = nullif(trim(p_note),'') where id = p_book;
end $$;
revoke all on function public.booknest_admin_review_book(uuid, text, text) from public, anon;
grant execute on function public.booknest_admin_review_book(uuid, text, text) to authenticated;

create or replace function public.booknest_admin_author_overview()
returns table (user_id uuid, pen_name text, email text, phone text, payout_bank text, payout_account_name text, payout_account_number text,
  status text, books bigint, published bigint, readers bigint, plus_reads_30d bigint, unpaid bigint, earned bigint, created_at timestamptz)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.booknest_is_admin() then raise exception 'Administrator access required.'; end if;
  return query select a.user_id, a.pen_name, u.email::text, a.phone, a.payout_bank, a.payout_account_name, a.payout_account_number, a.status,
    (select count(*) from public.booknest_author_books b where b.author_id = a.user_id),
    (select count(*) from public.booknest_author_books b where b.author_id = a.user_id and b.status = 'published'),
    (select coalesce(sum(b.reads),0)::bigint from public.booknest_author_books b where b.author_id = a.user_id),
    (select count(*) from public.booknest_author_reads r join public.booknest_author_books b on b.id = r.book_id where b.author_id = a.user_id and r.via_plus and r.read_at > now() - interval '30 days'),
    (select coalesce(sum(e.amount),0)::bigint from public.booknest_author_earnings e where e.author_id = a.user_id and not e.paid_out),
    (select coalesce(sum(e.amount),0)::bigint from public.booknest_author_earnings e where e.author_id = a.user_id),
    a.created_at
  from public.booknest_authors a join auth.users u on u.id = a.user_id order by a.created_at desc;
end $$;
revoke all on function public.booknest_admin_author_overview() from public, anon;
grant execute on function public.booknest_admin_author_overview() to authenticated;

create or replace function public.booknest_admin_add_earning(p_author uuid, p_amount integer, p_note text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.booknest_is_admin() then raise exception 'Administrator access required.'; end if;
  insert into public.booknest_author_earnings (author_id, source, amount, note) values (p_author, 'plus_pool', greatest(p_amount,0), nullif(trim(p_note),''));
end $$;
revoke all on function public.booknest_admin_add_earning(uuid, integer, text) from public, anon;
grant execute on function public.booknest_admin_add_earning(uuid, integer, text) to authenticated;

create or replace function public.booknest_admin_mark_paid(p_author uuid)
returns integer language plpgsql security definer set search_path = '' as $$
declare total integer;
begin
  if not public.booknest_is_admin() then raise exception 'Administrator access required.'; end if;
  select coalesce(sum(amount),0) into total from public.booknest_author_earnings where author_id = p_author and not paid_out;
  update public.booknest_author_earnings set paid_out = true, paid_at = now() where author_id = p_author and not paid_out;
  return total;
end $$;
revoke all on function public.booknest_admin_mark_paid(uuid) from public, anon;
grant execute on function public.booknest_admin_mark_paid(uuid) to authenticated;

create or replace function public.booknest_admin_set_author_status(p_author uuid, p_status text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.booknest_is_admin() then raise exception 'Administrator access required.'; end if;
  update public.booknest_authors set status = p_status where user_id = p_author;
  if p_status = 'suspended' then update public.booknest_author_books set status = 'draft' where author_id = p_author and status = 'published'; end if;
end $$;
revoke all on function public.booknest_admin_set_author_status(uuid, text) from public, anon;
grant execute on function public.booknest_admin_set_author_status(uuid, text) to authenticated;

-- Public billing now exposes author share.
drop function if exists public.booknest_public_billing();
create function public.booknest_public_billing()
returns table (plus_monthly_ngn integer, plus_yearly_ngn integer, sponsor_weekly_ngn integer,
  payment_enabled boolean, bank_name text, account_name text, account_number text, support_email text, author_share_pct integer)
language sql stable security definer set search_path = '' as $$
  select c.plus_monthly_ngn, c.plus_yearly_ngn, c.sponsor_weekly_ngn, c.payment_enabled,
    case when c.payment_enabled then c.bank_name end, case when c.payment_enabled then c.account_name end,
    case when c.payment_enabled then c.account_number end, c.support_email, c.author_share_pct
  from public.booknest_billing_config c where c.id = true;
$$;
grant execute on function public.booknest_public_billing() to anon, authenticated;

-- Cover images: public bucket, each author writes only inside their own folder.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('author-covers', 'author-covers', true, 2097152, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public = true, file_size_limit = 2097152, allowed_mime_types = array['image/jpeg','image/png','image/webp'];
drop policy if exists "author covers own upload" on storage.objects;
create policy "author covers own upload" on storage.objects for insert to authenticated
  with check (bucket_id = 'author-covers' and (storage.foldername(name))[1] = (select auth.uid())::text);
drop policy if exists "author covers own update" on storage.objects;
create policy "author covers own update" on storage.objects for update to authenticated
  using (bucket_id = 'author-covers' and (storage.foldername(name))[1] = (select auth.uid())::text);
drop policy if exists "author covers own delete" on storage.objects;
create policy "author covers own delete" on storage.objects for delete to authenticated
  using (bucket_id = 'author-covers' and (storage.foldername(name))[1] = (select auth.uid())::text);
