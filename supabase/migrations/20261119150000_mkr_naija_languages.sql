-- Naija Languages: CC BY storybooks, public-domain FSI audio courses, learner progress, heritage tags.
-- Applied to production on 19 Nov 2026. Story data: data/naija-stories.json. Lessons were built from the
-- FSI archive listings at fsi-languages.yojik.eu (Hausa 10, Yorùbá 56, Igbo 46 lessons).
create table if not exists public.booknest_lang_stories (id uuid primary key default gen_random_uuid(), lang text not null check (lang in ('ha','yo','ig','pcm')), story_no text not null, title text not null, title_en text, author text, illustrator text, translator text, level integer, license text not null check (license ~ '^CC BY [0-9.]+$'), source text not null, cover_url text, pages jsonb not null default '[]', created_at timestamptz not null default now(), unique (lang, story_no));
create table if not exists public.booknest_lang_courses (id uuid primary key default gen_random_uuid(), lang text not null check (lang in ('ha','yo','ig','pcm')), title text not null, description text, source text not null, book_url text, free_lessons integer not null default 3, created_at timestamptz not null default now(), unique (lang, title));
create table if not exists public.booknest_lang_lessons (id uuid primary key default gen_random_uuid(), course_id uuid not null references public.booknest_lang_courses(id) on delete cascade, position integer not null, title text not null, tracks jsonb not null default '[]', unique (course_id, position));
create table if not exists public.booknest_lang_progress (user_id uuid not null references auth.users(id) on delete cascade, lesson_id uuid not null references public.booknest_lang_lessons(id) on delete cascade, completed_at timestamptz not null default now(), primary key (user_id, lesson_id));
create index if not exists booknest_lang_progress_lesson_idx on public.booknest_lang_progress(lesson_id);
alter table public.booknest_books add column if not exists naija_langs text[] not null default '{}';
alter table public.booknest_lang_stories enable row level security;
alter table public.booknest_lang_courses enable row level security;
alter table public.booknest_lang_lessons enable row level security;
alter table public.booknest_lang_progress enable row level security;
alter table public.booknest_lang_progress force row level security;
revoke all on public.booknest_lang_stories, public.booknest_lang_courses, public.booknest_lang_lessons, public.booknest_lang_progress from anon, authenticated;
grant select on public.booknest_lang_stories, public.booknest_lang_courses, public.booknest_lang_lessons to anon, authenticated;
grant select, insert, delete on public.booknest_lang_progress to authenticated;
create policy "lang stories public read" on public.booknest_lang_stories for select to anon, authenticated using (true);
create policy "lang courses public read" on public.booknest_lang_courses for select to anon, authenticated using (true);
create policy "lang lessons public read" on public.booknest_lang_lessons for select to anon, authenticated using (true);
create policy "lang progress own read" on public.booknest_lang_progress for select to authenticated using ((select auth.uid()) = user_id);
create policy "lang progress own insert" on public.booknest_lang_progress for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "lang progress own delete" on public.booknest_lang_progress for delete to authenticated using ((select auth.uid()) = user_id);
