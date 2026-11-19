import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ArrowLeft, Globe2, Users } from 'lucide-react';
import BookCover from '../../components/BookCover';
import Footer from '../../components/Footer';
import { accessLabel, genreName, getNovel, langName } from '../../../lib/novels';
import NovelChapters from './NovelChapters';

export const revalidate = 60;

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const n = await getNovel(id);
  if (!n) return { title: 'Novel not found' };
  const by = n.booknest_authors?.pen_name ?? 'a Nigerian writer';
  return {
    title: `${n.title} by ${by}`,
    description: n.description?.slice(0, 160) ?? `A ${langName(n.language)} novel on M King Reads.`,
    openGraph: { title: `${n.title} — ${langName(n.language)} novel`, images: n.cover_url ? [n.cover_url] : ['/og.png'] },
  };
}

export default async function NovelPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const n = await getNovel(id);
  if (!n) notFound();
  const author = n.booknest_authors;
  const jsonLd = {
    '@context': 'https://schema.org', '@type': 'Book', name: n.title, author: { '@type': 'Person', name: author?.pen_name },
    image: n.cover_url ?? undefined, inLanguage: n.language === 'pcm' ? 'pcm' : n.language, genre: genreName(n.genre), isAccessibleForFree: n.access === 'free',
  };

  return (
    <main className="page bookPage">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />
      <Link href="/novels" className="backLink"><ArrowLeft size={16} /> Naija novels</Link>
      <section className="bookHero">
        <BookCover src={n.cover_url} title={n.title} author={author?.pen_name} size="xl" />
        <div className="bookInfo">
          <span className="kicker">{langName(n.language).toUpperCase()} · {genreName(n.genre).toUpperCase()}</span>
          <h1>{n.title}</h1>
          <p className="byline">by <b>{author?.pen_name}</b></p>
          <div className="facts">
            <span><Globe2 size={15} /> {langName(n.language)}</span>
            <span><Users size={15} /> {n.reads.toLocaleString()} readers</span>
            {n.mature && <span className="pill">18+</span>}
          </div>
          <p className="forLine">{accessLabel(n)}</p>
          {n.description && <p className="bookDesc">{n.description}</p>}
        </div>
      </section>

      <NovelChapters book={{ id: n.id, title: n.title, access: n.access, price_ngn: n.price_ngn, free_chapters: n.free_chapters }} />

      {author?.bio && (
        <section className="card">
          <div className="cardHead"><h3>About {author.pen_name}</h3></div>
          <p className="dim">{author.bio}</p>
        </section>
      )}
      <Footer />
    </main>
  );
}
