import Link from 'next/link';
import type { Metadata } from 'next';
import { Search } from 'lucide-react';
import { AUDIENCES, forAudience, getCatalogue, getGenres, searchBooks } from '../../lib/booknest';
import BookTile from '../components/BookTile';
import SponsorSlot from '../components/SponsorSlot';
import Footer from '../components/Footer';

export const metadata: Metadata = { title: 'Explore', description: 'Search and browse free books by genre, author and topic.' };

export default async function Explore({ searchParams }: { searchParams: Promise<{ q?: string; for?: string }> }) {
  const { q: raw, for: forRaw } = await searchParams;
  const q = raw?.trim() ?? '';
  const audience = AUDIENCES.find(a => a.id === forRaw);
  const [genres, all] = await Promise.all([getGenres(), q ? searchBooks(q) : getCatalogue()]);
  const books = audience ? forAudience(all, audience.id) : all;

  return (
    <main className="page">
      <div className="pageHead">
        <span className="kicker">EXPLORE</span>
        <h1>{q ? <>Results for “{q}”</> : audience ? <>{audience.emoji} {audience.label}</> : 'Find your next book'}</h1>
        {audience && !q && <p>{audience.blurb}</p>}
        <form className="searchBar" action="/explore" method="get" role="search">
          {audience && <input type="hidden" name="for" value={audience.id} />}
          <Search size={19} />
          <input name="q" defaultValue={q} placeholder="Title, author or topic" aria-label="Search books" autoFocus={!q} />
          <button className="btn btnGold btnSmall">Search</button>
        </form>
      </div>

      <nav className="chipRow" aria-label="Reader age">
        <Link href={q ? `/explore?q=${encodeURIComponent(q)}` : '/explore'} className={`chip${!audience ? ' on' : ''}`}>Everyone</Link>
        {AUDIENCES.map(a => <Link key={a.id} href={`/explore?for=${a.id}${q ? `&q=${encodeURIComponent(q)}` : ''}`} className={`chip${audience?.id === a.id ? ' on' : ''}`}><span>{a.emoji}</span>{a.short}</Link>)}
      </nav>

      {!q && !audience && (
        <section className="genreGrid" aria-label="Genres">
          {genres.map(g => <Link key={g.id} href={`/genre/${g.slug}`} className="genreCard"><span>{g.icon}</span><strong>{g.name}</strong></Link>)}
        </section>
      )}

      <div className="sectionTitle"><h2>{q || audience ? `${books.length} book${books.length === 1 ? '' : 's'}` : 'The full M King Reads shelf'}</h2></div>
      {books.length ? (
        <div className="grid">{books.map(b => <BookTile key={b.id} book={b} wide vibe={audience?.id === 'teens' || audience?.id === 'young-adult'} />)}</div>
      ) : (
        <div className="emptyState"><strong>Nothing in our curated shelf matches that yet.</strong><p>Try the open collection of 70,000+ free books.</p></div>
      )}
      {q && <Link className="btn btnGhost searchMore" href={`/free-books?q=${encodeURIComponent(q)}`}>Search “{q}” in the 70,000-book open collection →</Link>}
      <SponsorSlot variant="inline" />
      <Footer />
    </main>
  );
}
