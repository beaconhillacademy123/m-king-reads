import Link from 'next/link';
import type { Metadata } from 'next';
import { Feather, PenLine } from 'lucide-react';
import BookCover from '../components/BookCover';
import Footer from '../components/Footer';
import { NOVEL_LANGS, accessLabel, genreName, getPublishedNovels, langName } from '../../lib/novels';

export const revalidate = 120;
export const metadata: Metadata = {
  title: 'Naija novels — Yorùbá, Hausa, Igbo & Pidgin',
  description: 'New novels by Nigerian writers in Yorùbá, Hausa, Igbo, Pidgin and English. First chapters free.',
};

export default async function NovelsPage({ searchParams }: { searchParams: Promise<{ lang?: string }> }) {
  const { lang } = await searchParams;
  const active = NOVEL_LANGS.some(l => l.code === lang) ? lang : undefined;
  const novels = await getPublishedNovels({ lang: active, limit: 90 });

  return (
    <main className="page">
      <section className="writeHero compact">
        <span className="kicker"><Feather size={14} /> NEW NAIJA NOVELS</span>
        <h1>Stories by Nigerian writers</h1>
        <p>Fresh novels in Yorùbá, Hausa, Igbo, Pidgin and English. The first chapter of every book is free.</p>
        <nav className="chipRow">
          <Link className={`chip ${!active ? 'on' : ''}`} href="/novels">All</Link>
          {NOVEL_LANGS.map(l => <Link key={l.code} className={`chip ${active === l.code ? 'on' : ''}`} href={`/novels?lang=${l.code}`}>{l.name}</Link>)}
        </nav>
      </section>

      {novels.length === 0 ? (
        <section className="card center emptyState">
          <Feather size={30} />
          <h3>{active ? `No ${langName(active)} novels yet. Yours could be the first.` : 'The first novels are on their way.'}</h3>
          <p className="dim">Are you a writer? Publish your story chapter by chapter and earn from every reader.</p>
          <Link className="btn btnGold" href="/write"><PenLine size={16} /> Publish your novel</Link>
        </section>
      ) : (
        <div className="grid novelGrid">
          {novels.map(n => (
            <Link key={n.id} href={`/novel/${n.id}`} className="tile">
              <div className="tileCoverWrap"><BookCover src={n.cover_url} title={n.title} author={n.booknest_authors?.pen_name} /></div>
              <div className="tileText">
                <strong>{n.title}</strong>
                <span>{n.booknest_authors?.pen_name}</span>
                <em>{langName(n.language)} · {genreName(n.genre)}</em>
                <small className={n.access === 'free' ? 'freeTag' : 'dim'}>{n.access === 'free' ? 'Free' : accessLabel(n).split(' · ')[1]}</small>
              </div>
            </Link>
          ))}
        </div>
      )}

      <section className="card writeCta">
        <div><h3>Write in your mother tongue?</h3><p className="dim">Publish on M King Reads and get paid when readers unlock your book.</p></div>
        <Link className="btn btnGold" href="/write"><PenLine size={16} /> Open Writer Studio</Link>
      </section>
      <Footer />
    </main>
  );
}
