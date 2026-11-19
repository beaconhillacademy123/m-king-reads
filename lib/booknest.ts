import { supabaseRest } from './supabase-rest';

export type Genre = { id: string; name: string; slug: string; icon: string | null };
export type Book = {
  id: string; title: string; author: string; description: string | null; cover_url: string | null;
  source_name: string | null; source_url: string | null; license: string | null; read_url: string | null; download_url: string | null;
  is_featured: boolean; publication_year: number | null; language: string | null; gutenberg_id?: number | null;
  audience?: string[] | null; vibe?: string | null;
  booknest_genres?: Genre | Genre[] | null;
};

const FIELDS = 'id,title,author,description,cover_url,source_name,source_url,license,read_url,download_url,is_featured,publication_year,language,gutenberg_id,audience,vibe,booknest_genres(id,name,slug,icon)';

export async function getGenres() {
  return supabaseRest<Genre[]>('booknest_genres?select=id,name,slug,icon&order=name.asc');
}

export async function getBooks(limit = 12) {
  return supabaseRest<Book[]>(`booknest_books?select=${FIELDS}&order=created_at.desc&limit=${limit}`);
}

/** Every catalogue book, de-duplicated by Gutenberg id (one book can sit in two genres). */
export async function getCatalogue(limit = 400) {
  const rows = await supabaseRest<Book[]>(`booknest_books?select=${FIELDS}&order=is_featured.desc,created_at.asc&limit=${limit}`);
  const seen = new Set<string>();
  return rows.filter(b => {
    const key = b.gutenberg_id ? `g${b.gutenberg_id}` : b.id;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export async function getBook(id: string) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const rows = await supabaseRest<Book[]>(`booknest_books?select=${FIELDS}&id=eq.${encodeURIComponent(id)}&limit=1`);
  return rows[0] ?? null;
}

export async function getBooksByGenre(slug: string, limit = 60) {
  const genres = await supabaseRest<Genre[]>(`booknest_genres?select=id,name,slug,icon&slug=eq.${encodeURIComponent(slug)}&limit=1`);
  const genre = genres[0];
  if (!genre) return { genre: null, books: [] as Book[] };
  const books = await supabaseRest<Book[]>(`booknest_books?select=${FIELDS}&genre_id=eq.${genre.id}&order=is_featured.desc,created_at.desc&limit=${limit}`);
  return { genre, books };
}

export async function searchBooks(query: string, limit = 60) {
  const clean = query.replace(/[%,()*]/g, ' ').trim();
  if (!clean) return [];
  const q = encodeURIComponent(`*${clean}*`);
  return supabaseRest<Book[]>(`booknest_books?select=${FIELDS}&or=(title.ilike.${q},author.ilike.${q},description.ilike.${q})&order=is_featured.desc&limit=${limit}`);
}

export function getGenre(book: Book) {
  return Array.isArray(book.booknest_genres) ? book.booknest_genres[0] : book.booknest_genres;
}

export async function getSimilarBooks(book: Book, limit = 8) {
  const genre = getGenre(book);
  if (!genre) return [];
  const books = await getBooksByGenre(genre.slug, limit + 2);
  return books.books.filter(b => b.id !== book.id && b.title !== book.title).slice(0, limit);
}

/** Rough reading time from Gutenberg-era word counts isn't available, so we estimate by genre. */
export function readingMinutes(book: Book) {
  const g = getGenre(book)?.slug;
  if (g === 'children' || g === 'poetry') return 60;
  if (g === 'history' || g === 'classics') return 540;
  return 360;
}

export const AUDIENCES = [
  { id: 'teens', label: 'Teens & Gen Z', short: 'Teens', emoji: '🔥', blurb: 'Plot twists, dark romance, heists and monsters.' },
  { id: 'young-adult', label: 'Young adults', short: 'Young adults', emoji: '✨', blurb: 'Love, ambition, identity and big decisions.' },
  { id: 'grown-ups', label: 'Grown-ups', short: 'Grown-ups', emoji: '☕', blurb: 'The great novels, history and big ideas.' },
  { id: 'kids', label: 'Kids', short: 'Kids', emoji: '🧸', blurb: 'Fairy tales, talking animals and adventure.' },
] as const;

export function forAudience(books: Book[], id: string) {
  return books.filter(b => (b.audience ?? []).includes(id));
}
