create table if not exists public.booknest_notes (
  user_id uuid not null references auth.users(id) on delete cascade,
  book_key text not null check (char_length(book_key) between 3 and 120),
  title text not null default '' check (char_length(title) <= 200),
  href text check (char_length(href) <= 300),
  content text not null default '' check (char_length(content) <= 50000),
  updated_at timestamptz not null default now(),
  primary key (user_id, book_key)
);
create index if not exists booknest_notes_recent_idx on public.booknest_notes (user_id, updated_at desc);
alter table public.booknest_notes enable row level security;
alter table public.booknest_notes force row level security;
revoke all on public.booknest_notes from anon, authenticated;
grant select, insert, update, delete on public.booknest_notes to authenticated;
create policy "own notes read" on public.booknest_notes for select to authenticated using (user_id = (select auth.uid()));
create policy "own notes insert" on public.booknest_notes for insert to authenticated with check (user_id = (select auth.uid()));
create policy "own notes update" on public.booknest_notes for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "own notes delete" on public.booknest_notes for delete to authenticated using (user_id = (select auth.uid()));
