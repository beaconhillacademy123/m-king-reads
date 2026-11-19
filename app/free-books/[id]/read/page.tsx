import Link from 'next/link';
import type { Metadata } from 'next';
import Reader from '../../../read/[id]/Reader';
import { clampChapter, loadGutenbergChapters } from '../../../../lib/ebook';
import { gutendexBook, personName, coverFor } from '../../../../lib/gutendex';

export const metadata: Metadata = { robots: { index: false } };

export default async function FreeBookReader({ params, searchParams }: {
  params: Promise<{ id: string }>; searchParams: Promise<{ chapter?: string | string[] }>;
}) {
  const { id } = await params;
  const { chapter: requested } = await searchParams;
  const gid = id.replace(/\D/g, '');
  const [meta, chapters] = await Promise.all([gutendexBook(gid), loadGutenbergChapters(gid)]);
  if (!chapters) {
    return (
      <main className="page narrow"><div className="emptyState">
        <strong>We couldn&apos;t open this edition right now.</strong><p>The source library is busy or this book has no web edition.</p>
        <div className="row"><Link className="btn btnGold" href={`/free-books/${gid}/read`}>Try again</Link><Link className="btn btnGhost" href={`/free-books/${gid}`}>Back to book</Link></div>
      </div></main>
    );
  }
  const chapter = clampChapter(requested, chapters.length);
  const current = chapters[chapter - 1];
  const base = `/free-books/${gid}/read`;
  const href = (n: number) => `${base}?chapter=${n}`;
  return (
    <Reader bookId={`gutenberg-${gid}`} title={meta?.title ?? `Book #${gid}`} author={personName(meta?.authors?.[0]?.name)}
      coverUrl={meta ? coverFor(meta) : null} chapter={chapter} chapterCount={chapters.length} chapterLabel={current.label}
      chapterItems={chapters.map((c, i) => ({ number: i + 1, label: c.label, href: href(i + 1) }))}
      content={current.content} sourceUrl={`https://www.gutenberg.org/ebooks/${gid}`} backHref={`/free-books/${gid}`}
      persistToCloud={false} sourceLabel="Project Gutenberg"
      prevHref={chapter > 1 ? href(chapter - 1) : undefined} nextHref={chapter < chapters.length ? href(chapter + 1) : undefined}
      resumeHref={href(chapter)} />
  );
}
