-- Allow authors to publish novels in Enuani.
alter table public.booknest_author_books
  drop constraint if exists booknest_author_books_language_check;
alter table public.booknest_author_books
  add constraint booknest_author_books_language_check
  check (language in ('en', 'ha', 'yo', 'ig', 'pcm', 'enu'));
