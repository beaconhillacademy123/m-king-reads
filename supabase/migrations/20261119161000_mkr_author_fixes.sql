-- Record checks: `rec is not null` is false when any column is null, so test the key instead.
create or replace function public.booknest_admin_review_payment(p_id uuid, p_decision text)
returns text language plpgsql security definer set search_path = '' as $$
declare req public.booknest_payment_requests; cfg public.booknest_billing_config; cur public.booknest_subscriptions; base timestamptz; days integer; bk public.booknest_author_books;
begin
  if not public.booknest_is_admin() then raise exception 'Administrator access required.'; end if;
  if p_decision not in ('approved','rejected') then raise exception 'Invalid decision.'; end if;
  select * into req from public.booknest_payment_requests where id = p_id for update;
  if req.id is null then raise exception 'Payment request not found.'; end if;
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
    if bk.id is not null then
      insert into public.booknest_author_earnings (author_id, book_id, source, amount, note)
        values (bk.author_id, bk.id, 'sale', floor(req.amount * coalesce(cfg.author_share_pct, 60) / 100.0)::int, 'Sale of ' || bk.title);
    end if;
  end if;
  update public.booknest_payment_requests set status = p_decision, reviewed_at = now(), reviewed_by = (select auth.uid()) where id = p_id;
  return p_decision;
end $$;

-- Let the read logger bump the counter past the author edit guard.
create or replace function public.booknest_author_book_guard()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'UPDATE' and current_setting('booknest.internal', true) = 'reads' then
    return new;
  end if;
  if not public.booknest_is_admin() then
    if tg_op = 'UPDATE' then
      new.author_id := old.author_id; new.reads := old.reads; new.review_note := old.review_note; new.published_at := old.published_at;
      if new.status <> old.status and new.status not in ('draft','pending') then raise exception 'Only an editor can publish or reject a book.'; end if;
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
revoke all on function public.booknest_author_book_guard() from public, anon, authenticated;

create or replace function public.booknest_log_author_read(p_chapter uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare uid uuid := (select auth.uid()); ch public.booknest_author_chapters; bk public.booknest_author_books; inserted integer;
begin
  if uid is null then return; end if;
  select * into ch from public.booknest_author_chapters where id = p_chapter;
  if ch.id is null or not public.booknest_can_read_author_chapter(ch.book_id, ch.position) then return; end if;
  select * into bk from public.booknest_author_books where id = ch.book_id;
  if bk.author_id = uid then return; end if;
  insert into public.booknest_author_reads (user_id, chapter_id, book_id, via_plus)
    values (uid, ch.id, ch.book_id, bk.access = 'plus' and ch.position > bk.free_chapters and public.booknest_has_plus(uid))
    on conflict do nothing;
  get diagnostics inserted = row_count;
  if inserted > 0 and ch.position = 1 then
    perform set_config('booknest.internal', 'reads', true);
    update public.booknest_author_books set reads = reads + 1 where id = ch.book_id;
    perform set_config('booknest.internal', '', true);
  end if;
end $$;
revoke all on function public.booknest_log_author_read(uuid) from public, anon;
grant execute on function public.booknest_log_author_read(uuid) to authenticated;

create or replace function public.booknest_payment_request_guard()
returns trigger language plpgsql security definer set search_path = '' as $$
declare cfg public.booknest_billing_config; pending_count integer; bk public.booknest_author_books;
begin
  select * into cfg from public.booknest_billing_config where id = true;
  if cfg.id is null or not cfg.payment_enabled then raise exception 'Payments are not open yet.'; end if;
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
    if bk.id is null or bk.status <> 'published' or bk.access <> 'paid' then raise exception 'This book is not for sale.'; end if;
    if new.amount < bk.price_ngn then raise exception 'The amount is below the book price.'; end if;
    if exists (select 1 from public.booknest_author_purchases p where p.user_id = new.user_id and p.book_id = new.book_id) then raise exception 'You already own this book.'; end if;
  else
    new.book_id := null;
  end if;
  new.status := 'pending'; new.reviewed_at := null; new.reviewed_by := null; new.created_at := now();
  return new;
end $$;
revoke all on function public.booknest_payment_request_guard() from public, anon, authenticated;
