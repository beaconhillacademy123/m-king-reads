import type { MetadataRoute } from 'next';
import { getCatalogue, getGenres } from '../lib/booknest';

const SITE = process.env.NEXT_PUBLIC_SITE_URL || 'https://mkingreads.vercel.app';
export const revalidate = 86400;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [books, genres] = await Promise.all([getCatalogue().catch(() => []), getGenres().catch(() => [])]);
  const now = new Date();
  return [
    ...['', '/explore', '/naija', '/naija/yo', '/naija/ha', '/naija/ig', '/naija/pcm', '/free-books', '/premium', '/advertise', '/support'].map(p => ({ url: SITE + p, lastModified: now, changeFrequency: 'daily' as const, priority: p ? 0.7 : 1 })),
    ...genres.map(g => ({ url: `${SITE}/genre/${g.slug}`, lastModified: now, changeFrequency: 'weekly' as const, priority: 0.6 })),
    ...books.map(b => ({ url: `${SITE}/book/${b.id}`, lastModified: now, changeFrequency: 'monthly' as const, priority: 0.8 })),
  ];
}
