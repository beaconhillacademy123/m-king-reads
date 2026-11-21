import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ArrowLeft, BookOpen, Clock, ExternalLink, Globe2, CalendarDays } from 'lucide-react';
import SaveBookButton from '../../components/SaveBookButton';
import ResumeBookButton from '../../components/ResumeBookButton';
import ShareBookButton from '../../components/ShareBookButton';
import AddToListButton from '../../components/AddToListButton';
import OfflineButton from '../../components/OfflineButton';
import BookCover from '../../components/BookCover';
import Rail from '../../components/Rail';
import SponsorSlot from '../../components/SponsorSlot';
import Footer from '../../components/Footer';
import { AUDIENCES, getBook, getGenre, getSimilarBooks, readingMinutes } from '../../../lib/booknest';
import { hoursLabel } from '../../../lib/format';

export const revalidate = 300;

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const book = await getBook(id);
  if (!book) return { title: 'Book not found' };
  const description = book.description ?? `Read ${book.title} by ${book.author} free on M King Reads.`;
  return {
    title: `${book.title} by ${book.author}`, description,
    openGraph: { title: `${book.title} — read free on M King Reads`, description, images: book.cover_url ? [book.cover_url] : ['/og.png'] },
  };
}

export default async function BookPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const book = await getBook(id);
  if (!book) notFound();
  const genre = getGenre(book);
  const similar = await getSimilarBooks(book, 12);
  const year = book.publication_year && book.publication_year > 0 ? book.publication_year : null;
  const jsonLd = {
    '@context': 'https://schema.org', '@type': 'Book', name: book.title, author: { '@type': 'Person', name: book.author },
    image: book.cover_url ?? undefined, inLanguage: book.language ?? 'en', genre: genre?.name, isAccessibleForFree: true,
    datePublished: year ? String(year) : undefined,
  };

  return (
    <main className="page bookPage">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="bookBackdrop" style={book.cover_url ? { backgroundImage: `url("${book.cover_url}")` } : undefined} aria-hidden />
      <Link href={genre ? `/genre/${genre.slug}` : '/explore'} className="backLink"><ArrowLeft size={16} /> {genre ? genre.name : 'Explore'}</Link>
      <section className="bookHero">
        <BookCover src={book.cover_url} title={book.title} author={book.author} size="xl" />
        <div className="bookInfo">
          <div className="row">
            {genre && <Link href={`/genre/${genre.slug}`} className="pill">{genre.icon} {genre.name}</Link>}
            {book.vibe && <span className="pill pillVibe">{book.vibe}</span>}
          </div>
          <h1>{book.title}</h1>
          <p className="byline">by <strong>{book.author}</strong></p>
          <div className="facts">
            <span><Clock size={15} /> ~{hoursLabel(readingMinutes(book))} read</span>
            {year && <span><CalendarDays size={15} /> {year}</span>}
            <span><Globe2 size={15} /> {book.language ?? 'English'}</span>
            <span className="free">Free</span>
          </div>
          {(book.audience ?? []).length > 0 && <p className="forLine">Great for: {AUDIENCES.filter(a => book.audience!.includes(a.id)).map((a, i) => <span key={a.id}>{i ? ' · ' : ''}<Link href={`/explore?for=${a.id}`}>{a.emoji} {a.short}</Link></span>)}</p>}
          <div className="bookCtas">
            <Link className="btn btnGold btnLg" href={`/read/${id}`}><BookOpen size={18} /> Read now</Link>
            <ResumeBookButton bookId={id} />
            <SaveBookButton bookId={id} />
            <OfflineButton bookId={id} title={book.title} author={book.author} coverUrl={book.cover_url} urls={[`/read/${id}`]} />
            <ShareBookButton title={book.title} />
            <AddToListButton book={{ ref: `cat:${book.id}`, title: book.title, author: book.author, cover: book.cover_url }} />
          </div>
          {book.description && <p className="bookDesc">{book.description}</p>}
          <p className="fine">{book.source_name ?? 'Open source'} edition. {book.license}{' '}
            {book.source_url && <a href={book.source_url} target="_blank" rel="noreferrer">Source <ExternalLink size={12} /></a>}</p>
        </div>
      </section>
      <SponsorSlot />
      <Rail title={`More ${genre?.name ?? 'books'} you'll love`} kicker="KEEP READING" href={genre ? `/genre/${genre.slug}` : undefined} books={similar} />
      <Footer />
    </main>
  );
}
