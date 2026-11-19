import Link from 'next/link';
import type { Metadata } from 'next';
import { Search } from 'lucide-react';
import { getCatalogue, getGenres, searchBooks } from '../../lib/booknest';
import BookTile from '../components/BookTile';
import SponsorSlot from '../components/SponsorSlot';
import Footer from '../components/Footer';

export const metadata: Metadata = { title: 'Explore', description: 'Search and browse free books by genre, author and topic.' };

export default async function Explore({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q: raw } = await searchParams;
  const q = raw?.trim() ?? '';
  const [genres, books] = await Promise.all([getGenres(), q ? searchBooks(q) : getCatalogue()]);

  return (
    <main className="page">
      <div className="pageHead">
        <span className="kicker">EXPLORE</span>
        <h1>{q ? <>Results for “{q}”</> : 'Find your next book'}</h1>
        <form className="searchBar" action="/explore" method="get" role="search">
          <Search size={19} />
          <input name="q" defaultValue={q} placeholder="Title, author or topic" aria-label="Search books" autoFocus={!q} />
          <button className="btn btnGold btnSmall">Search</button>
        </form>
      </div>

      {!q && (
        <section className="genreGrid" aria-label="Genres">
          {genres.map(g => <Link key={g.id} href={`/genre/${g.slug}`} className="genreCard"><span>{g.icon}</span><strong>{g.name}</strong></Link>)}
        </section>
      )}

      <div className="sectionTitle"><h2>{q ? `${books.length} book${books.length === 1 ? '' : 's'} in our catalogue` : 'The full M King Reads shelf'}</h2></div>
      {books.length ? (
        <div className="grid">{books.map(b => <BookTile key={b.id} book={b} wide />)}</div>
      ) : (
        <div className="emptyState"><strong>Nothing in our curated shelf matches that yet.</strong><p>Try the open collection of 70,000+ free books.</p></div>
      )}
      {q && <Link className="btn btnGhost searchMore" href={`/free-books?q=${encodeURIComponent(q)}`}>Search “{q}” in the 70,000-book open collection →</Link>}
      <SponsorSlot variant="inline" />
      <Footer />
    </main>
  );
}
