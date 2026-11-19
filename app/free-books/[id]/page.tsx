import Link from 'next/link';
import type { Metadata } from 'next';
import { ArrowLeft, BookOpen, ExternalLink } from 'lucide-react';
import { gutendexBook, personName, coverFor } from '../../../lib/gutendex';
import BookCover from '../../components/BookCover';
import ShareBookButton from '../../components/ShareBookButton';
import SponsorSlot from '../../components/SponsorSlot';
import Footer from '../../components/Footer';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const b = await gutendexBook(id);
  return { title: b ? `${b.title} — free` : 'Free book' };
}

export default async function FreeBookDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const b = await gutendexBook(id);
  const gid = id.replace(/\D/g, '');
  const title = b?.title ?? `Project Gutenberg book #${gid}`;
  const author = personName(b?.authors?.[0]?.name);
  const cover = b ? coverFor(b) : `https://www.gutenberg.org/cache/epub/${gid}/pg${gid}.cover.medium.jpg`;
  return (
    <main className="page bookPage">
      <Link href="/free-books" className="backLink"><ArrowLeft size={16} /> Open collection</Link>
      <section className="bookHero">
        <BookCover src={cover} title={title} author={author} size="xl" />
        <div className="bookInfo">
          <span className="pill">Open collection</span>
          <h1>{title}</h1>
          <p className="byline">by <strong>{author}</strong></p>
          <div className="facts">{b && <span>{b.download_count.toLocaleString()} downloads</span>}{b?.languages?.[0] && <span>{b.languages[0].toUpperCase()}</span>}<span className="free">Free</span></div>
          <div className="bookCtas">
            <Link className="btn btnGold btnLg" href={`/free-books/${gid}/read`}><BookOpen size={18} /> Read now</Link>
            <ShareBookButton title={title} />
            <a className="btn btnGhost" href={`https://www.gutenberg.org/ebooks/${gid}`} target="_blank" rel="noreferrer">Source <ExternalLink size={14} /></a>
          </div>
          {b?.summaries?.[0] && <p className="bookDesc">{b.summaries[0].replace(/\(This is an automatically generated summary\.\)/, '')}</p>}
          {b && b.subjects.length > 0 && <div className="tags">{b.subjects.slice(0, 6).map(s => <span key={s}>{s.split(' -- ')[0]}</span>)}</div>}
          <p className="fine">Provided by Project Gutenberg. Copyright status may vary by country.</p>
        </div>
      </section>
      <SponsorSlot />
      <Footer />
    </main>
  );
}
