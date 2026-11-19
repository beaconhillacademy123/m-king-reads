-- Enuani language support and searchable, verified dictionary entries.
alter table public.booknest_lang_stories
  drop constraint if exists booknest_lang_stories_lang_check;
alter table public.booknest_lang_stories
  add constraint booknest_lang_stories_lang_check
  check (lang in ('ha', 'yo', 'ig', 'pcm', 'enu'));

alter table public.booknest_lang_courses
  drop constraint if exists booknest_lang_courses_lang_check;
alter table public.booknest_lang_courses
  add constraint booknest_lang_courses_lang_check
  check (lang in ('ha', 'yo', 'ig', 'pcm', 'enu'));

create table if not exists public.booknest_lang_dictionary (
  id uuid primary key default gen_random_uuid(),
  lang text not null default 'enu' check (lang in ('ha', 'yo', 'ig', 'pcm', 'enu')),
  term text not null,
  definition text not null,
  pronunciation text,
  part_of_speech text,
  example_native text,
  example_en text,
  source text,
  verified boolean not null default false,
  created_at timestamptz not null default now(),
  unique (lang, term)
);

create index if not exists booknest_lang_dictionary_lookup_idx
  on public.booknest_lang_dictionary (lang, lower(term));

alter table public.booknest_lang_dictionary enable row level security;
revoke all on public.booknest_lang_dictionary from anon, authenticated;
grant select on public.booknest_lang_dictionary to anon, authenticated;
drop policy if exists "verified language dictionary public read" on public.booknest_lang_dictionary;
create policy "verified language dictionary public read"
  on public.booknest_lang_dictionary
  for select
  to anon, authenticated
  using (verified = true);
