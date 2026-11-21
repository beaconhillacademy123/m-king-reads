import Link from 'next/link';
import type { Metadata } from 'next';
import { ArrowLeft, BookOpen, ExternalLink } from 'lucide-react';
import { gutendexBook, personName, coverFor, type GutenbergBook } from '../../../lib/gutendex';
import { loadGutenbergChapters } from '../../../lib/ebook';
import { getBookByGutenbergId } from '../../../lib/booknest';
import BookCover from '../../components/BookCover';
import ShareBookButton from '../../components/ShareBookButton';
import AddToListButton from '../../components/AddToListButton';
import SponsorSlot from '../../components/SponsorSlot';
import Footer from '../../components/Footer';

const SITE = process.env.NEXT_PUBLIC_SITE_URL || 'https://mkingreads.promisevisuals.com';
// Public-domain pages rarely change; refresh weekly so crawls stay cheap.
export const revalidate = 604800;

function summaryOf(b: GutenbergBook | null) {
  return b?.summaries?.[0]?.replace(/\(This is an automatically generated summary\.\)/, '').trim() || null;
}

function plain(html: string) {
  return html
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ')
    // Source HTML is hard-wrapped: line breaks inside a paragraph are just spaces.
    .replace(/\s+/g, ' ')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<\/(p|div|h\d|li|blockquote)>/gi, '\n')
    // Inline tags (drop caps, emphasis) join their text without a gap.
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ').replace(/&amp;/gi, '&').replace(/&lt;/gi, '<').replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"').replace(/&#39;|&rsquo;|&#8217;/gi, '’').replace(/&lsquo;|&#8216;/gi, '‘')
    .replace(/&ldquo;|&#8220;/gi, '“').replace(/&rdquo;|&#8221;/gi, '”').replace(/&mdash;|&#8212;/gi, '—').replace(/&[a-z]+;/gi, ' ');
}

/** The opening paragraphs, so the page carries real text from the book (and search engines see it). */
async function openingLines(gid: string) {
  const timeout = new Promise<null>(resolve => setTimeout(() => resolve(null), 9000));
  const chapters = await Promise.race([loadGutenbergChapters(gid).catch(() => null), timeout]);
  if (!chapters?.length) return null;
  for (const chapter of chapters.slice(0, 4)) {
    const paragraphs = plain(chapter.content).split(/\n+/).map(p => p.replace(/\s+/g, ' ').trim()).filter(p => p.length > 60);
    if (!paragraphs.length) continue;
    const out: string[] = [];
    let total = 0;
    for (const p of paragraphs) {
      out.push(p.length > 700 ? `${p.slice(0, 700).replace(/\s+\S*$/, '')}…` : p);
      total += p.length;
      if (total > 1100 || out.length >= 3) break;
    }
    return { label: chapter.label, paragraphs: out };
  }
  return null;
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const gid = id.replace(/\D/g, '');
  const [b, curated] = await Promise.all([gutendexBook(gid), getBookByGutenbergId(gid)]);
  if (!b) return { title: `Free book #${gid}`, robots: { index: false } };
  const author = personName(b.authors?.[0]?.name);
  const summary = summaryOf(b);
  const description = (summary ? summary.slice(0, 155).replace(/\s+\S*$/, '') + '…' : `Read ${b.title} by ${author} free online — no download, no sign-up. On your phone with M King Reads.`);
  const canonical = curated ? `/book/${curated.id}` : `/free-books/${gid}`;
  return {
    title: `${b.title} by ${author} — read free online`,
    description,
    alternates: { canonical },
    openGraph: {
      type: 'book', title: `${b.title} — read free on M King Reads`, description, url: canonical,
      images: [coverFor(b)], authors: [author],
    },
    twitter: { card: 'summary_large_image', title: `${b.title} by ${author}`, description, images: [coverFor(b)] },
  };
}

export default async function FreeBookDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const gid = id.replace(/\D/g, '');
  const [b, excerpt] = await Promise.all([gutendexBook(gid), openingLines(gid)]);
  const title = b?.title ?? `Project Gutenberg book #${gid}`;
  const author = personName(b?.authors?.[0]?.name);
  const cover = b ? coverFor(b) : `https://www.gutenberg.org/cache/epub/${gid}/pg${gid}.cover.medium.jpg`;
  const summary = summaryOf(b);
  const subjects = Array.from(new Set((b?.subjects ?? []).map(s => s.split(' -- ')[0]))).slice(0, 6);
  const a = b?.authors?.[0];
  const jsonLd = b ? {
    '@context': 'https://schema.org', '@type': 'Book', name: title, url: `${SITE}/free-books/${gid}`,
    author: { '@type': 'Person', name: author, ...(a?.birth_year ? { birthDate: String(a.birth_year) } : {}), ...(a?.death_year ? { deathDate: String(a.death_year) } : {}) },
    image: cover, inLanguage: b.languages?.[0] ?? 'en', isAccessibleForFree: true, genre: subjects.slice(0, 3),
    description: summary ?? undefined, bookFormat: 'https://schema.org/EBook',
    potentialAction: { '@type': 'ReadAction', target: `${SITE}/free-books/${gid}/read` },
    publisher: { '@type': 'Organization', name: 'M King Reads' },
  } : null;
  const crumbs = {
    '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'M King Reads', item: SITE },
      { '@type': 'ListItem', position: 2, name: 'Free books', item: `${SITE}/free-books` },
      { '@type': 'ListItem', position: 3, name: title, item: `${SITE}/free-books/${gid}` },
    ],
  };

  return (
    <main className="page bookPage">
      {jsonLd && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(crumbs).replace(/</g, '\\u003c') }} />
      <Link href="/free-books" className="backLink"><ArrowLeft size={16} /> Open collection</Link>
      <section className="bookHero">
        <BookCover src={cover} title={title} author={author} size="xl" />
        <div className="bookInfo">
          <span className="pill">Free book · Open collection</span>
          <h1>{title}</h1>
          <p className="byline">by <Link href={`/free-books?q=${encodeURIComponent(author)}`}><strong>{author}</strong></Link>{a?.birth_year || a?.death_year ? <span className="dim"> ({a?.birth_year ?? '?'}–{a?.death_year ?? ''})</span> : null}</p>
          <div className="facts">{b && <span>{b.download_count.toLocaleString()} downloads</span>}{b?.languages?.[0] && <span>{b.languages[0].toUpperCase()}</span>}<span className="free">Free</span></div>
          <div className="bookCtas">
            <Link className="btn btnGold btnLg" href={`/free-books/${gid}/read`}><BookOpen size={18} /> Read now</Link>
            <ShareBookButton title={title} />
            <AddToListButton book={{ ref: `gut:${gid}`, title, author, cover }} />
            <a className="btn btnGhost" href={`https://www.gutenberg.org/ebooks/${gid}`} target="_blank" rel="noreferrer">Source <ExternalLink size={14} /></a>
          </div>
          {summary && <p className="bookDesc">{summary}</p>}
          {subjects.length > 0 && <div className="tags">{subjects.map(s => <Link key={s} href={`/free-books?q=${encodeURIComponent(s)}`}>{s}</Link>)}</div>}
          <p className="fine">Provided by Project Gutenberg. Copyright status may vary by country.</p>
        </div>
      </section>

      {excerpt && (
        <section className="card excerpt">
          <span className="kicker">START READING · {excerpt.label === 'Full book' ? 'THE OPENING' : excerpt.label.toUpperCase().slice(0, 60)}</span>
          {excerpt.paragraphs.map((p, i) => <p key={i}>{p}</p>)}
          <Link className="btn btnGold" href={`/free-books/${gid}/read`}><BookOpen size={16} /> Keep reading free</Link>
        </section>
      )}

      <section className="card">
        <h2 className="sectionTitle">Read {title} free on your phone</h2>
        <p className="dim">{title}{author !== 'Unknown author' ? ` by ${author}` : ''} is in the public domain, so you can read every chapter here at no cost — no download and no sign-up. M King Reads keeps your place, reads aloud and works offline once installed.</p>
        <div className="row"><Link className="btn btnGhost" href={`/free-books?q=${encodeURIComponent(author)}`}>More by {author}</Link><Link className="btn btnGhost" href="/teach">Add it to a class reading list</Link></div>
      </section>
      <SponsorSlot />
      <Footer />
    </main>
  );
}
