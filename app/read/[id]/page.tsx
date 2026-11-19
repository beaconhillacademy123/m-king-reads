import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { getBook } from '../../../lib/booknest';
import Reader from './Reader';
import { clampChapter, extractBody, cleanEbookHtml, fetchWithTimeout, loadGutenbergChapters } from '../../../lib/ebook';

type ReaderSource = { repo: string; chapters: string[] };

const SOURCES: Record<string, ReaderSource> = {
  '1342': { repo: 'standardebooks/jane-austen_pride-and-prejudice', chapters: Array.from({ length: 61 }, (_, i) => `chapter-${i + 1}.xhtml`) },
  '1661': {
    repo: 'standardebooks/arthur-conan-doyle_the-adventures-of-sherlock-holmes',
    chapters: ['a-scandal-in-bohemia.xhtml','the-redheaded-league.xhtml','a-case-of-identity.xhtml','the-boscombe-valley-mystery.xhtml','the-five-orange-pips.xhtml','the-man-with-the-twisted-lip.xhtml','the-adventure-of-the-blue-carbuncle.xhtml','the-adventure-of-the-speckled-band.xhtml','the-adventure-of-the-engineers-thumb.xhtml','the-adventure-of-the-noble-bachelor.xhtml','the-adventure-of-the-beryl-coronet.xhtml','the-adventure-of-the-copper-beeches.xhtml']
  },
  '11': { repo: 'standardebooks/lewis-carroll_alices-adventures-in-wonderland_john-tenniel', chapters: Array.from({ length: 12 }, (_, i) => `chapter-${i + 1}.xhtml`) },
  '345': { repo: 'standardebooks/bram-stoker_dracula', chapters: Array.from({ length: 27 }, (_, i) => `chapter-${i + 1}.xhtml`) },
  '2701': { repo: 'standardebooks/herman-melville_moby-dick', chapters: Array.from({ length: 135 }, (_, i) => `chapter-${i + 1}.xhtml`) }
};

const DRACULA_CHAPTER_LABELS = [
  "Jonathan Harker's Journal",
  "Jonathan Harker's Journal — continued",
  "Jonathan Harker's Journal — continued",
  "Jonathan Harker's Journal — continued",
  "Letter from Miss Mina Murray to Miss Lucy Westenra",
  "Mina Murray's Journal",
  "Cutting from “The Dailygraph,” 8 August",
  "Mina Murray's Journal",
  "Letter, Mina Harker to Lucy Westenra",
  "Letter, Dr. Seward to the Hon. Arthur Holmwood",
  "Lucy Westenra's Diary",
  "Dr. Seward's Diary",
  "Dr. Seward's Diary — continued",
  "Mina Harker's Journal",
  "Dr. Seward's Diary — continued",
  "Dr. Seward's Diary — continued",
  "Dr. Seward's Diary — continued",
  "Dr. Seward's Diary",
  "Jonathan Harker's Journal",
  "Jonathan Harker's Journal",
  "Dr. Seward's Diary",
  "Jonathan Harker's Journal",
  "Dr. Seward's Diary",
  "Dr. Seward's Phonograph Diary, spoken by Van Helsing",
  "Dr. Seward's Diary",
  "Dr. Seward's Diary",
  "Mina Harker's Journal"
];

function getSourceId(book: { source_url: string | null; gutenberg_id?: number | null }) {
  if (book.gutenberg_id) return String(book.gutenberg_id);
  const match = book.source_url?.match(/\/ebooks\/(\d+)/);
  return match?.[1] ?? null;
}

function labelFromFile(file: string, index: number) {
  if (file.startsWith('chapter-')) return `Chapter ${index + 1}`;
  const words = file.replace('.xhtml', '').replace(/-/g, ' ');
  return words.charAt(0).toUpperCase() + words.slice(1);
}

function chapterLabel(sourceId: string | null, file: string, index: number) {
  if (sourceId === '345') return DRACULA_CHAPTER_LABELS[index] ?? `Chapter ${index + 1}`;
  return labelFromFile(file, index);
}

function Unavailable({ id, readUrl }: { id: string; readUrl: string | null }) {
  return (
    <main className="page narrow">
      <div className="emptyState">
        <strong>This book couldn&apos;t be opened right now.</strong>
        <p>The source library is busy. Please try again in a minute.</p>
        <div className="row"><Link className="btn btnGold" href={`/read/${id}`}>Try again</Link>
          <Link className="btn btnGhost" href={`/book/${id}`}>Back to book</Link>
          {readUrl && <a className="btn btnGhost" href={readUrl} target="_blank" rel="noreferrer">Open at source</a>}</div>
      </div>
    </main>
  );
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const book = await getBook(id);
  return { title: book ? `Reading ${book.title}` : 'Reader', robots: { index: false } };
}

export default async function ReadPage({ params, searchParams }: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ chapter?: string; bookmark?: string }>;
}) {
  const { id } = await params;
  const { chapter: chapterParam, bookmark } = await searchParams;
  const resumeBookmark = bookmark === '1';
  const book = await getBook(id);
  if (!book) notFound();

  const sourceId = getSourceId(book);
  const source = sourceId ? SOURCES[sourceId] : undefined;
  const base = `/read/${id}`;
  const href = (n: number) => (n > 1 ? `${base}?chapter=${n}` : base);

  if (!source) {
    if (!sourceId) { if (book.read_url) redirect(book.read_url); notFound(); }
    const chapters = await loadGutenbergChapters(sourceId);
    if (!chapters) return <Unavailable id={id} readUrl={book.read_url} />;
    const chapter = clampChapter(chapterParam, chapters.length);
    const current = chapters[chapter - 1];
    return <Reader bookId={id} title={book.title} author={book.author} coverUrl={book.cover_url}
      chapter={chapter} chapterCount={chapters.length} chapterLabel={current.label}
      chapterItems={chapters.map((c, i) => ({ number: i + 1, label: c.label, href: href(i + 1) }))}
      resumeBookmark={resumeBookmark} content={current.content} sourceUrl={book.source_url}
      prevHref={chapter > 1 ? href(chapter - 1) : undefined} nextHref={chapter < chapters.length ? href(chapter + 1) : undefined}
      resumeHref={href(chapter)} />;
  }

  const chapter = clampChapter(chapterParam, source.chapters.length);
  const file = source.chapters[chapter - 1];
  const rawUrl = `https://raw.githubusercontent.com/${source.repo}/master/src/epub/text/${file}`;
  let content: string | null = null;
  try {
    const response = await fetchWithTimeout(rawUrl, 15000, 604800);
    if (response.ok) content = cleanEbookHtml(extractBody(await response.text()));
  } catch { content = null; }
  if (!content) return <Unavailable id={id} readUrl={book.read_url} />;

  return <Reader bookId={id} title={book.title} author={book.author} coverUrl={book.cover_url}
    chapter={chapter} chapterCount={source.chapters.length} chapterLabel={chapterLabel(sourceId, file, chapter - 1)}
    chapterItems={source.chapters.map((f, i) => ({ number: i + 1, label: chapterLabel(sourceId, f, i), href: href(i + 1) }))}
    resumeBookmark={resumeBookmark} content={content} sourceUrl={book.source_url}
    prevHref={chapter > 1 ? href(chapter - 1) : undefined} nextHref={chapter < source.chapters.length ? href(chapter + 1) : undefined}
    resumeHref={href(chapter)} />;
}
