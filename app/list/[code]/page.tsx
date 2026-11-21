import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { BookOpen, GraduationCap } from 'lucide-react';
import BookCover from '../../components/BookCover';
import Footer from '../../components/Footer';
import ListOpenCounter from './ListOpenCounter';
import { bookHref, readHref, type PublicList } from '../../../lib/readingLists';

export const revalidate = 60;

async function getList(code: string): Promise<PublicList | null> {
  if (!/^[a-f0-9]{10}$/.test(code)) return null;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return null;
  try {
    const res = await fetch(`${url}/rest/v1/rpc/booknest_public_reading_list?p_code=${code}`, { headers: { apikey: key }, next: { revalidate: 60 } });
    if (!res.ok) return null;
    return (await res.json()) as PublicList | null;
  } catch { return null; }
}

export async function generateMetadata({ params }: { params: Promise<{ code: string }> }): Promise<Metadata> {
  const { code } = await params;
  const list = await getList(code);
  if (!list) return { title: 'Reading list', robots: { index: false } };
  const forClass = list.class_name ? ` · ${list.class_name}` : '';
  const description = `${list.items.length} free ${list.items.length === 1 ? 'book' : 'books'}${list.teacher_name ? ` picked by ${list.teacher_name}` : ''}. Tap to read on M King Reads.`;
  return {
    title: `${list.title}${forClass}`, description, robots: { index: false, follow: true },
    openGraph: { title: `📚 ${list.title}${forClass}`, description, images: list.items[0]?.cover_url ? [list.items[0].cover_url] : ['/og.png'] },
  };
}

export default async function ReadingListPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const list = await getList(code);
  if (!list) notFound();
  return (
    <main className="page">
      <ListOpenCounter code={code} />
      <div className="pageHead">
        <span className="kicker"><GraduationCap size={14} /> CLASS READING LIST{list.class_name ? ` · ${list.class_name.toUpperCase()}` : ''}</span>
        <h1>{list.title}</h1>
        {list.teacher_name && <p>From {list.teacher_name}</p>}
        {list.note && <p className="listNote">{list.note}</p>}
      </div>
      {list.items.length === 0 ? (
        <div className="emptyState"><strong>No books on this list yet</strong><p>Check back soon — your teacher is still adding books.</p></div>
      ) : (
        <ol className="classList">
          {list.items.map((b, i) => (
            <li key={b.book_ref}>
              <span className="listNo">{i + 1}</span>
              <Link href={bookHref(b.book_ref)}><BookCover src={b.cover_url} title={b.title} author={b.author} size="sm" /></Link>
              <span className="grow"><Link href={bookHref(b.book_ref)}><strong>{b.title}</strong></Link>{b.author && <small>{b.author}</small>}</span>
              <Link className="btn btnGold btnSmall" href={readHref(b.book_ref)}><BookOpen size={14} /> Read</Link>
            </li>
          ))}
        </ol>
      )}
      <section className="card">
        <p className="dim">Every book here is free. Sign in on M King Reads to keep your place across phones and track your reading streak.</p>
        <div className="row"><Link className="btn btnGhost" href="/login">Sign in (optional)</Link><Link className="btn btnGhost" href="/teach">Are you a teacher? Make your own list</Link></div>
      </section>
      <Footer />
    </main>
  );
}
