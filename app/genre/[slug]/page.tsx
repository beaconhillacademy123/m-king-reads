import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { getBooksByGenre } from '../../../lib/booknest';
import BookTile from '../../components/BookTile';
import SponsorSlot from '../../components/SponsorSlot';
import Footer from '../../components/Footer';

export const revalidate = 300;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const { genre } = await getBooksByGenre(slug, 1);
  return { title: genre ? `${genre.name} books` : 'Genre', description: genre ? `Read free ${genre.name.toLowerCase()} books on M King Reads.` : undefined };
}

export default async function GenrePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { genre, books } = await getBooksByGenre(slug);
  if (!genre) notFound();
  return (
    <main className="page">
      <Link href="/explore" className="backLink"><ArrowLeft size={16} /> All genres</Link>
      <div className="pageHead genreHead">
        <span className="genreEmoji">{genre.icon}</span>
        <div><span className="kicker">GENRE</span><h1>{genre.name}</h1><p>{books.length} book{books.length === 1 ? '' : 's'} on the shelf</p></div>
      </div>
      {books.length ? <div className="grid">{books.map(b => <BookTile key={b.id} book={b} wide />)}</div>
        : <div className="emptyState"><strong>Books are on their way.</strong><p>Browse the open collection while we add more.</p><Link className="btn btnGold" href={`/free-books?q=${encodeURIComponent(genre.name)}`}>Open collection</Link></div>}
      <SponsorSlot variant="inline" />
      <Footer />
    </main>
  );
}
