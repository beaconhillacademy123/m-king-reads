import index from './generated/gutenberg-en.json';

export const SITE = process.env.NEXT_PUBLIC_SITE_URL || 'https://mkingreads.promisevisuals.com';

type GutenbergIndex = { generatedAt: string | null; count: number; ranges: (number | [number, number])[] };
const data = index as unknown as GutenbergIndex;

/** Books per /free-books/sitemap/N.xml file (Google allows up to 50,000). */
export const BOOKS_PER_SITEMAP = 20000;

/** Every English text in Project Gutenberg's catalogue (built by scripts/gutenberg-index.mjs at build time). */
export function englishGutenbergIds() {
  const ids: number[] = [];
  for (const r of data.ranges) {
    if (Array.isArray(r)) for (let i = r[0]; i <= r[1]; i++) ids.push(i);
    else ids.push(r);
  }
  return ids;
}

/** How many free-book sitemaps there are (at least one, so robots.txt and the sitemap stay in step). */
export const FREE_BOOK_SITEMAPS = Math.max(1, Math.ceil(data.count / BOOKS_PER_SITEMAP));
