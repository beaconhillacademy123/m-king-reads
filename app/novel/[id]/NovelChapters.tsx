'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { BookOpen, Crown, Loader2, Lock, ShoppingBag } from 'lucide-react';
import { supabase } from '../../../lib/supabase-browser';
import { useAccount } from '../../../lib/account';
import { naira } from '../../../lib/format';
import { wordsToMinutes, type NovelAccess, type TocRow } from '../../../lib/novels';
import Checkout from '../../components/Checkout';

type BookLite = { id: string; title: string; access: NovelAccess; price_ngn: number; free_chapters: number };

export default function NovelChapters({ book }: { book: BookLite }) {
  const { user, ready, session } = useAccount();
  const [toc, setToc] = useState<TocRow[] | null>(null);
  const [buying, setBuying] = useState(false);

  const load = useCallback(async () => {
    const { data } = await supabase.rpc('booknest_author_toc', { p_book: book.id });
    setToc((data as TocRow[]) ?? []);
  }, [book.id]);

  // Reload when the session changes so purchases/Plus unlock the right chapters.
  useEffect(() => { if (ready) load(); }, [ready, session?.access_token, load]);

  if (!toc) return <section className="card center"><Loader2 className="spin" /></section>;
  if (toc.length === 0) return <section className="card center dim">Chapters are coming soon.</section>;

  const locked = toc.some(c => !c.unlocked);
  const first = toc[0];
  const totalWords = toc.reduce((a, c) => a + c.word_count, 0);
  const progressKey = `mkr-novel-${book.id}`;
  let resume = 0;
  try { resume = Number(typeof window !== 'undefined' ? localStorage.getItem(progressKey) : 0) || 0; } catch {}
  const resumeRow = toc.find(c => c.chapter_position === resume && c.unlocked);

  return (
    <>
      <div className="bookCtas">
        <Link className="btn btnGold btnLg" href={`/novel/${book.id}/${resumeRow ? resumeRow.chapter_position : first.chapter_position}`}>
          <BookOpen size={18} /> {resumeRow ? `Continue: chapter ${resumeRow.chapter_position}` : 'Start reading'}
        </Link>
        {locked && book.access === 'plus' && <Link className="btn btnGhost" href="/premium"><Crown size={16} /> Unlock all with Plus</Link>}
        {locked && book.access === 'paid' && <button className="btn btnGhost" onClick={() => setBuying(true)}><ShoppingBag size={16} /> Buy full book · {naira(book.price_ngn)}</button>}
      </div>

      <section className="card">
        <div className="cardHead"><h3>Chapters</h3><span className="dim small">{toc.length} · about {wordsToMinutes(totalWords)} min read</span></div>
        <ol className="lessonList">
          {toc.map(c => (
            <li key={c.id}>
              {c.unlocked ? (
                <Link className="lesson" href={`/novel/${book.id}/${c.chapter_position}`}>
                  <span className="lessonNo">{c.chapter_position}</span><span className="lessonTitle">{c.title}</span>
                  <span className="dim small">{wordsToMinutes(c.word_count)} min</span>
                </Link>
              ) : (
                <button className="lesson lessonLocked" onClick={() => book.access === 'paid' ? setBuying(true) : (window.location.href = '/premium')}>
                  <span className="lessonNo">{c.chapter_position}</span><span className="lessonTitle">{c.title}</span>
                  <span className="lockTag"><Lock size={12} /> {book.access === 'paid' ? 'Buy' : 'Plus'}</span>
                </button>
              )}
            </li>
          ))}
        </ol>
      </section>

      {buying && (
        <div className="modalBack" onClick={() => setBuying(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <button className="modalClose" onClick={() => setBuying(false)} aria-label="Close">×</button>
            <h2>Buy “{book.title}”</h2>
            <p className="dim">Own every chapter forever. Most of the price goes straight to the writer.</p>
            {!user && <p className="dim small">Sign in first so the book is added to your account.</p>}
            <Checkout kind="book" bookId={book.id} amount={book.price_ngn} presetNote={`Book: ${book.title}`} onDone={load} />
          </div>
        </div>
      )}
    </>
  );
}
