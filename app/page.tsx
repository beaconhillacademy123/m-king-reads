import Link from 'next/link';
import { BookOpen, ChevronRight, Crown, Headphones, Download, Sparkles, Globe2 } from 'lucide-react';
import { LANGS } from '../lib/naija';
import { AUDIENCES, forAudience, getCatalogue, getGenres, getGenre, type Book } from '../lib/booknest';
import Rail from './components/Rail';
import BookCover from './components/BookCover';
import ContinueReading from './components/ContinueReading';
import SponsorSlot from './components/SponsorSlot';
import SaveBookButton from './components/SaveBookButton';
import Footer from './components/Footer';

export const revalidate = 300;

function bySlugs(books: Book[], slugs: string[]) {
  return books.filter(b => slugs.includes(getGenre(b)?.slug ?? ''));
}

function dayIndex(len: number) {
  const d = new Date();
  return len ? (d.getUTCFullYear() * 372 + d.getUTCMonth() * 31 + d.getUTCDate()) % len : 0;
}

export default async function Home() {
  const [books, genres] = await Promise.all([getCatalogue(), getGenres()]);
  const featured = books.filter(b => b.is_featured);
  const spotlight = featured[dayIndex(featured.length)] ?? books[0];
  const heroStack = featured.filter(b => b.id !== spotlight?.id).slice(0, 4);
  const spotlightGenre = spotlight ? getGenre(spotlight) : null;

  const rails: { title: string; kicker: string; href: string; slugs: string[] }[] = [
    { title: 'Mystery & suspense', kicker: 'PAGE-TURNERS', href: '/genre/mystery', slugs: ['mystery'] },
    { title: 'Epic adventures', kicker: 'ADVENTURE', href: '/genre/adventure', slugs: ['adventure'] },
    { title: 'Love stories', kicker: 'ROMANCE', href: '/genre/romance', slugs: ['romance'] },
    { title: 'Worlds beyond ours', kicker: 'SCI-FI & FANTASY', href: '/genre/science-fiction', slugs: ['science-fiction', 'fantasy'] },
    { title: 'Money, power & strategy', kicker: 'BUSINESS', href: '/genre/business', slugs: ['business', 'finance'] },
    { title: 'Level up your life', kicker: 'SELF-GROWTH', href: '/genre/self-growth', slugs: ['self-growth'] },
    { title: 'For young readers', kicker: 'CHILDREN', href: '/genre/children', slugs: ['children'] },
    { title: 'After dark', kicker: 'HORROR & GOTHIC', href: '/genre/horror', slugs: ['horror'] },
    { title: 'Mind, faith & wisdom', kicker: 'PHILOSOPHY', href: '/genre/psychology', slugs: ['psychology', 'religion', 'education'] },
    { title: 'History that shaped us', kicker: 'HISTORY', href: '/genre/history', slugs: ['history'] },
  ];

  return (
    <main className="home">
      {spotlight && (
        <section className="hero">
          <div className="heroGlow" aria-hidden />
          <div className="heroCopy">
            <span className="kicker"><Sparkles size={14} /> BOOK OF THE DAY</span>
            <h1>{spotlight.title}</h1>
            <p className="heroAuthor">by {spotlight.author}{spotlightGenre ? <> · {spotlightGenre.icon} {spotlightGenre.name}</> : null}</p>
            <p className="heroBlurb">{spotlight.description}</p>
            <div className="heroCtas">
              <Link className="btn btnGold btnLg" href={`/read/${spotlight.id}`}><BookOpen size={18} /> Start reading</Link>
              <Link className="btn btnGhost btnLg" href={`/book/${spotlight.id}`}>Details</Link>
              <SaveBookButton bookId={spotlight.id} />
            </div>
            <form className="heroSearch" action="/explore" method="get" role="search">
              <input name="q" placeholder="Search titles, authors, topics…" aria-label="Search books" />
              <button>Search</button>
            </form>
          </div>
          <div className="heroShelf" aria-hidden>
            <Link href={`/book/${spotlight.id}`} className="heroMain" tabIndex={-1}><BookCover src={spotlight.cover_url} title={spotlight.title} author={spotlight.author} size="xl" /></Link>
            <div className="heroStack">
              {heroStack.map(b => <Link key={b.id} href={`/book/${b.id}`} tabIndex={-1}><BookCover src={b.cover_url} title={b.title} author={b.author} size="sm" /></Link>)}
            </div>
          </div>
        </section>
      )}

      <ContinueReading />

      <nav className="chipRow" aria-label="Genres">
        {genres.map(g => <Link key={g.id} href={`/genre/${g.slug}`} className="chip"><span>{g.icon}</span>{g.name}</Link>)}
      </nav>

      <section className="genz">
        <Rail title="Gen Z picks" kicker="🔥 FOR TEENS & YOUNG READERS" subtitle="Dark romance, heists, monsters and plot twists — the classics that started it all."
          href="/explore?for=teens" books={forAudience(books, 'teens').filter(b => b.vibe).slice(0, 18)} vibes />
      </section>

      <Rail title="Trending on M King Reads" kicker="TOP PICKS" href="/explore" books={featured.slice(0, 12)} ranked />

      <SponsorSlot />

      <section className="whoReads" aria-label="Books for every reader">
        <div className="railHead"><div><span className="kicker">FOR EVERY READER</span><h2>Who&apos;s reading today?</h2></div></div>
        <div className="whoGrid">
          {AUDIENCES.map(a => (
            <Link key={a.id} href={`/explore?for=${a.id}`} className={`whoCard who-${a.id}`}>
              <span className="whoEmoji">{a.emoji}</span>
              <strong>{a.label}</strong>
              <small>{a.blurb}</small>
              <em>{forAudience(books, a.id).length} books <ChevronRight size={14} /></em>
            </Link>
          ))}
        </div>
      </section>

      <section className="naijaBand">
        <div>
          <span className="kicker"><span className="ng" /> NEW · NAIJA LANGUAGES</span>
          <h2>Read and speak Yorùbá, Hausa, Igbo &amp; Pidgin</h2>
          <p>Picture storybooks in your mother tongue, audio lessons from native speakers and everyday phrases.</p>
        </div>
        <div className="naijaChips">
          {LANGS.map(l => <Link key={l.code} href={`/naija/${l.code}`} style={{ borderColor: l.tint }}><strong>{l.name}</strong><small style={{ color: l.tint }}>{l.hello}</small></Link>)}
        </div>
      </section>

      <section className="africa">
        <div className="africaCopy">
          <span className="kicker"><Globe2 size={14} /> FROM OUR CONTINENT</span>
          <h2>Stories from Africa</h2>
          <p>Voices, journeys and histories from across the continent — the collection grows every month.</p>
          <Link className="btn btnGold" href="/genre/african-literature">Explore African literature <ChevronRight size={16} /></Link>
        </div>
        <div className="railTrack">
          {bySlugs(books, ['african-literature']).map(b => (
            <Link key={b.id} href={`/book/${b.id}`} className="tile"><div className="tileCoverWrap"><BookCover src={b.cover_url} title={b.title} author={b.author} /></div><div className="tileText"><strong>{b.title}</strong><span>{b.author}</span></div></Link>
          ))}
        </div>
      </section>

      {rails.slice(0, 3).map(r => <Rail key={r.title} title={r.title} kicker={r.kicker} href={r.href} books={bySlugs(books, r.slugs).slice(0, 14)} />)}

      <section className="plusBand">
        <div>
          <span className="kicker"><Crown size={14} /> M KING READS PLUS</span>
          <h2>Read more. Pay less than a plate of jollof.</h2>
          <ul>
            <li><Download size={16} /> Download books, read with zero data</li>
            <li><Headphones size={16} /> Read-Aloud: listen while you commute</li>
            <li><Sparkles size={16} /> No ads, premium themes & reading stats</li>
          </ul>
        </div>
        <Link className="btn btnGold btnLg" href="/premium">Try Plus <ChevronRight size={17} /></Link>
      </section>

      {rails.slice(3).map(r => <Rail key={r.title} title={r.title} kicker={r.kicker} href={r.href} books={bySlugs(books, r.slugs).slice(0, 14)} />)}

      <SponsorSlot variant="inline" />

      <Rail title="The great classics" kicker="TIMELESS" href="/genre/classics" books={bySlugs(books, ['classics', 'poetry']).slice(0, 16)} />

      <section className="openShelf">
        <div className="openShelfArt" aria-hidden><span>70k</span></div>
        <div>
          <span className="kicker">OPEN COLLECTION</span>
          <h2>70,000+ more free books</h2>
          <p>Search the full Project Gutenberg collection and read any edition right here in M King Reads.</p>
          <Link className="btn btnGhost" href="/free-books">Browse the open collection <ChevronRight size={16} /></Link>
        </div>
      </section>

      <Footer />
    </main>
  );
}
