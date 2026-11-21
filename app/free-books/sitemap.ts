import type { MetadataRoute } from 'next';
import { gutendex } from '../../lib/gutendex';
import { getCatalogueGutenbergIds } from '../../lib/booknest';

import { FREE_BOOK_SITEMAPS, SITE } from '../../lib/seo';

/** Each sitemap covers 10 Gutendex pages (32 books each) of the most-read English books. */
const PAGES_PER_SITEMAP = 10;
export const revalidate = 604800;

export async function generateSitemaps() {
  return Array.from({ length: FREE_BOOK_SITEMAPS }, (_, id) => ({ id }));
}

export default async function sitemap(props: { id: Promise<string | number> }): Promise<MetadataRoute.Sitemap> {
  const id = Number(await props.id) || 0;
  const first = id * PAGES_PER_SITEMAP + 1;
  const [curated, pages] = await Promise.all([
    getCatalogueGutenbergIds(),
    Promise.all(Array.from({ length: PAGES_PER_SITEMAP }, (_, i) => gutendex(`?languages=en&page=${first + i}`, 15000))),
  ]);
  const seen = new Set<number>();
  const out: MetadataRoute.Sitemap = [];
  for (const page of pages) {
    for (const b of page?.results ?? []) {
      // Catalogue copies have their own /book page, which is the canonical one.
      if (seen.has(b.id) || curated.has(b.id) || b.copyright) continue;
      seen.add(b.id);
      out.push({ url: `${SITE}/free-books/${b.id}`, changeFrequency: 'monthly', priority: 0.6 });
    }
  }
  return out;
}
