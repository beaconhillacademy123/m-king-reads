import Link from 'next/link';
import type { Metadata } from 'next';
import { ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { gutendex, personName, coverFor } from '../../lib/gutendex';
import BookCover from '../components/BookCover';
import SponsorSlot from '../components/SponsorSlot';
import Footer from '../components/Footer';

export const metadata: Metadata = { title: 'Open collection — 70,000+ free books', description: 'Search the complete Project Gutenberg library and read any book inside M King Reads.' };

const TOPICS = [
  ['', 'Popular'], ['fiction', 'Fiction'], ['children', 'Children'], ['romance', 'Romance'], ['science fiction', 'Sci-Fi'],
  ['detective', 'Mystery'], ['poetry', 'Poetry'], ['philosophy', 'Philosophy'], ['history', 'History'], ['africa', 'Africa'], ['business', 'Business'],
] as const;

export default async function FreeBooksPage({ searchParams }: { searchParams: Promise<{ q?: string; topic?: string; page?: string }> }) {
  const p = await searchParams;
  const q = p.q?.trim() || ''; const topic = p.topic?.trim() || ''; const page = Math.max(1, Number(p.page || 1) || 1);
  const qs = new URLSearchParams({ languages: 'en', page: String(page) });
  if (q) qs.set('search', q);
  if (topic) qs.set('topic', topic);
  const data = await gutendex(`?${qs.toString()}`);
  const totalPages = data ? Math.max(1, Math.ceil(data.count / 32)) : 1;
  const link = (over: Record<string, string>) => '/free-books?' + new URLSearchParams({ ...(q ? { q } : {}), ...(topic ? { topic } : {}), ...over }).toString();

  return (
    <main className="page">
      <div className="pageHead">
        <span className="kicker">OPEN COLLECTION · PROJECT GUTENBERG</span>
        <h1>70,000+ free books</h1>
        <p>Every book in the world&apos;s oldest digital library, readable right here.</p>
        <form className="searchBar" action="/free-books" method="get" role="search">
          <Search size={19} /><input name="q" defaultValue={q} placeholder="Search titles or authors" aria-label="Search the open collection" />
          {topic && <input type="hidden" name="topic" value={topic} />}<button className="btn btnGold btnSmall">Search</button>
        </form>
      </div>
      <nav className="chipRow" aria-label="Topics">
        {TOPICS.map(([v, l]) => <Link key={v} href={'/free-books?' + new URLSearchParams({ ...(q ? { q } : {}), ...(v ? { topic: v } : {}) }).toString()} className={`chip${topic === v ? ' on' : ''}`}>{l}</Link>)}
      </nav>
      {!data ? (
        <div className="emptyState"><strong>The open collection is busy right now.</strong><p>Project Gutenberg&apos;s catalogue is responding slowly. Try again in a moment, or browse our curated shelf.</p><div className="row"><Link className="btn btnGold" href={link({ page: String(page) })}>Try again</Link><Link className="btn btnGhost" href="/explore">Curated shelf</Link></div></div>
      ) : (
        <>
          <p className="dim metaLine"><strong>{data.count.toLocaleString()}</strong> books · page {page} of {totalPages.toLocaleString()}</p>
          <div className="grid">
            {data.results.map((b, i) => (
              <div key={b.id} style={{ display: 'contents' }}>
                <Link href={`/free-books/${b.id}`} className="tile tileWide">
                  <div className="tileCoverWrap"><BookCover src={coverFor(b)} title={b.title} author={personName(b.authors?.[0]?.name)} /></div>
                  <div className="tileText"><strong>{b.title}</strong><span>{personName(b.authors?.[0]?.name)}</span><em>{b.download_count.toLocaleString()} reads</em></div>
                </Link>
                {i === 11 && <div className="gridAd"><SponsorSlot variant="inline" /></div>}
              </div>
            ))}
          </div>
          <div className="pager">
            {page > 1 ? <Link className="btn btnGhost" href={link({ page: String(page - 1) })}><ChevronLeft size={16} /> Previous</Link> : <span />}
            {page < totalPages ? <Link className="btn btnGhost" href={link({ page: String(page + 1) })}>Next <ChevronRight size={16} /></Link> : <span />}
          </div>
        </>
      )}
      <p className="fine">Copyright status can differ by country. Check the rights that apply where you live before redistributing a work. <Link href="/copyright">Learn more</Link></p>
      <Footer />
    </main>
  );
}
