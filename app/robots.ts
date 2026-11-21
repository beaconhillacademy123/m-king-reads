import type { MetadataRoute } from 'next';
import { FREE_BOOK_SITEMAPS, SITE } from '../lib/seo';
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: ['/admin', '/api/', '/read/', '/profile', '/library', '/list/'] }],
    sitemap: [`${SITE}/sitemap.xml`, ...Array.from({ length: FREE_BOOK_SITEMAPS }, (_, i) => `${SITE}/free-books/sitemap/${i}.xml`)],
  };
}
