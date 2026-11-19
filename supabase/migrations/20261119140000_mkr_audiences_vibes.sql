-- Reader audiences (kids / teens / young-adult / grown-ups) and short "vibe" hooks for Gen Z discovery.
alter table public.booknest_books add column if not exists audience text[] not null default '{}';
alter table public.booknest_books add column if not exists vibe text check (char_length(vibe) <= 60);
create index if not exists booknest_books_audience_idx on public.booknest_books using gin (audience);
insert into public.booknest_genres (name, slug, icon) values
 ('Young Adult', 'young-adult', '🔥'), ('Adventure', 'adventure', '🗺️'), ('Self-Growth', 'self-growth', '🌱')
on conflict do nothing;
-- Data: 48 additional public-domain titles (verified against the Project Gutenberg catalogue, authors deceased 70+ years)
-- and audience/vibe tags for the existing catalogue were applied directly to the production database on 19 Nov 2026.
