import type { MetadataRoute } from 'next';
import { getCatalogueGutenbergIds } from '../../lib/booknest';
import { BOOKS_PER_SITEMAP, FREE_BOOK_SITEMAPS, SITE, englishGutenbergIds } from '../../lib/seo';

// The list comes from Project Gutenberg's catalogue, fetched at build time; it doesn't depend on Gutendex.
export const revalidate = 86400;

export async function generateSitemaps() {
  return Array.from({ length: FREE_BOOK_SITEMAPS }, (_, id) => ({ id }));
}

export default async function sitemap(props: { id: Promise<string | number> }): Promise<MetadataRoute.Sitemap> {
  const id = Number(await props.id) || 0;
  const curated = await getCatalogueGutenbergIds();
  return englishGutenbergIds()
    .slice(id * BOOKS_PER_SITEMAP, (id + 1) * BOOKS_PER_SITEMAP)
    // Catalogue copies have their own /book page, which is the canonical one.
    .filter(gid => !curated.has(gid))
    .map(gid => ({ url: `${SITE}/free-books/${gid}`, changeFrequency: 'yearly' as const, priority: 0.5 }));
}
