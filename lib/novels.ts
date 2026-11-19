import { supabaseRest } from './supabase-rest';

export type NovelLang = 'en' | 'ha' | 'yo' | 'ig' | 'pcm';
export type NovelAccess = 'free' | 'plus' | 'paid';
export type NovelStatus = 'draft' | 'pending' | 'published' | 'rejected';

export const NOVEL_LANGS: { code: NovelLang; name: string }[] = [
  { code: 'yo', name: 'Yorùbá' },
  { code: 'ha', name: 'Hausa' },
  { code: 'ig', name: 'Igbo' },
  { code: 'pcm', name: 'Pidgin' },
  { code: 'en', name: 'English' },
];

export const NOVEL_GENRES: { slug: string; name: string }[] = [
  { slug: 'romance', name: 'Romance' }, { slug: 'drama', name: 'Drama' }, { slug: 'mystery', name: 'Mystery' },
  { slug: 'thriller', name: 'Thriller' }, { slug: 'fantasy', name: 'Fantasy & folklore' }, { slug: 'horror', name: 'Horror' },
  { slug: 'comedy', name: 'Comedy' }, { slug: 'faith', name: 'Faith & inspiration' }, { slug: 'history', name: 'Historical' },
  { slug: 'young-adult', name: 'Young adult' }, { slug: 'children', name: 'Children' }, { slug: 'poetry', name: 'Poetry' },
  { slug: 'non-fiction', name: 'Non-fiction' },
];

export const langName = (c: string) => NOVEL_LANGS.find(l => l.code === c)?.name ?? c;
export const genreName = (g: string) => NOVEL_GENRES.find(x => x.slug === g)?.name ?? g;

export type Novel = {
  id: string; author_id: string; title: string; description: string | null; language: NovelLang; genre: string;
  cover_url: string | null; access: NovelAccess; price_ngn: number; free_chapters: number; mature: boolean;
  status: NovelStatus; review_note: string | null; reads: number; created_at: string; updated_at: string; published_at: string | null;
  booknest_authors?: { pen_name: string; bio: string | null } | null;
};

export type TocRow = { id: string; chapter_position: number; title: string; word_count: number; unlocked: boolean };
export type Chapter = { id: string; book_id: string; position: number; title: string; content: string; word_count: number };

const NOVEL_FIELDS = 'id,author_id,title,description,language,genre,cover_url,access,price_ngn,free_chapters,mature,status,reads,published_at,created_at,updated_at,review_note,booknest_authors(pen_name,bio)';

export function getPublishedNovels(opts: { lang?: string; limit?: number } = {}) {
  const q = new URLSearchParams({ select: NOVEL_FIELDS, status: 'eq.published', order: 'published_at.desc', limit: String(opts.limit ?? 60) });
  if (opts.lang) q.set('language', `eq.${opts.lang}`);
  return supabaseRest<Novel[]>(`booknest_author_books?${q}`, 120).catch(() => [] as Novel[]);
}

export async function getNovel(id: string) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const rows = await supabaseRest<Novel[]>(`booknest_author_books?select=${NOVEL_FIELDS}&id=eq.${id}&status=eq.published`, 60).catch(() => []);
  return rows[0] ?? null;
}

export function accessLabel(n: Pick<Novel, 'access' | 'price_ngn' | 'free_chapters'>) {
  if (n.access === 'free') return 'Free to read';
  const first = n.free_chapters === 1 ? 'First chapter free' : `First ${n.free_chapters} chapters free`;
  return n.access === 'plus' ? `${first} · rest with Plus` : `${first} · ₦${n.price_ngn.toLocaleString('en-NG')} to unlock`;
}

export const wordsToMinutes = (w: number) => Math.max(1, Math.round(w / 220));
