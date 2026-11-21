import { NextResponse } from 'next/server';
import { searchBooks } from '../../../lib/booknest';
import { gutendex, personName, coverFor } from '../../../lib/gutendex';

/** Search for the teacher list builder: curated catalogue first, then the open collection. */
export async function GET(request: Request) {
  const q = (new URL(request.url).searchParams.get('q') ?? '').trim().slice(0, 80);
  if (q.length < 2) return NextResponse.json({ results: [] });
  const [curated, open] = await Promise.all([
    searchBooks(q, 12).catch(() => []),
    gutendex(`?languages=en&search=${encodeURIComponent(q)}`, 9000),
  ]);
  const curatedIds = new Set(curated.map(b => b.gutenberg_id).filter(Boolean));
  const results = [
    ...curated.map(b => ({ ref: `cat:${b.id}`, title: b.title, author: b.author, cover: b.cover_url, source: 'M King Reads' })),
    ...(open?.results ?? []).filter(b => !curatedIds.has(b.id) && !b.copyright).slice(0, 16).map(b => ({
      ref: `gut:${b.id}`, title: b.title, author: personName(b.authors?.[0]?.name), cover: coverFor(b), source: 'Open collection',
    })),
  ];
  return NextResponse.json({ results }, { headers: { 'Cache-Control': 'public, s-maxage=3600' } });
}
