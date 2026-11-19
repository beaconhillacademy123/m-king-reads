import { fetchWithTimeout } from './ebook';

export type GutenbergBook = {
  id: number; title: string; authors: { name: string; birth_year: number | null; death_year: number | null }[];
  summaries?: string[]; subjects: string[]; bookshelves: string[]; languages: string[]; copyright: boolean | null;
  formats: Record<string, string>; download_count: number;
};
export type GutendexPage = { count: number; next: string | null; previous: string | null; results: GutenbergBook[] };

export async function gutendex(path: string, timeout = 12000): Promise<GutendexPage | null> {
  try {
    const res = await fetchWithTimeout(`https://gutendex.com/books/${path}`, timeout, 3600);
    if (!res.ok) return null;
    return (await res.json()) as GutendexPage;
  } catch { return null; }
}

export async function gutendexBook(id: string): Promise<GutenbergBook | null> {
  const clean = id.replace(/\D/g, '');
  if (!clean) return null;
  try {
    const res = await fetchWithTimeout(`https://gutendex.com/books/${clean}`, 10000, 86400);
    if (!res.ok) return null;
    return (await res.json()) as GutenbergBook;
  } catch { return null; }
}

/** Display name "Austen, Jane" → "Jane Austen". */
export function personName(name?: string) {
  if (!name) return 'Unknown author';
  const [last, first] = name.split(',').map(s => s.trim());
  return first ? `${first.replace(/\s*\(.*\)$/, '')} ${last}` : last;
}

export const coverFor = (b: GutenbergBook) => b.formats['image/jpeg'] || `https://www.gutenberg.org/cache/epub/${b.id}/pg${b.id}.cover.medium.jpg`;
