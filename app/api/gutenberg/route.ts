import { NextResponse } from 'next/server';
import { gutendexBook, personName, coverFor } from '../../../lib/gutendex';

export async function GET(request: Request) {
  const id = new URL(request.url).searchParams.get('id')?.replace(/\D/g, '') ?? '';
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  const b = await gutendexBook(id);
  if (!b) return NextResponse.json({ id: Number(id), found: false, cover: `https://www.gutenberg.org/cache/epub/${id}/pg${id}.cover.medium.jpg` });
  return NextResponse.json({
    id: b.id, found: true, title: b.title, author: personName(b.authors?.[0]?.name), cover: coverFor(b),
    summary: b.summaries?.[0]?.replace(/\(This is an automatically generated summary\.\)/, '').trim() ?? null,
    subjects: b.subjects?.slice(0, 6) ?? [], language: b.languages?.[0] ?? 'en',
    deathYear: b.authors?.[0]?.death_year ?? null,
  }, { headers: { 'Cache-Control': 'public, s-maxage=86400' } });
}
