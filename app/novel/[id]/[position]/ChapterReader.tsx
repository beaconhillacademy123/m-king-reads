'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ChevronLeft, ChevronRight, Crown, List, Loader2, Lock, Minus, Plus as PlusIcon, ShoppingBag } from 'lucide-react';
import { supabase } from '../../../../lib/supabase-browser';
import { useAccount } from '../../../../lib/account';
import { naira } from '../../../../lib/format';
import type { Chapter, NovelAccess, TocRow } from '../../../../lib/novels';
import SponsorSlot from '../../../components/SponsorSlot';

type BookLite = { id: string; title: string; language: string; access: NovelAccess; price_ngn: number; author: string };

export default function ChapterReader({ book, position }: { book: BookLite; position: number }) {
  const { ready, user, session } = useAccount();
  const [toc, setToc] = useState<TocRow[] | null>(null);
  const [chapter, setChapter] = useState<Chapter | null | undefined>(undefined);
  const [size, setSize] = useState(19);

  useEffect(() => {
    try { const s = Number(localStorage.getItem('mkr-novel-size')); if (s >= 15 && s <= 28) setSize(s); } catch {}
  }, []);

  useEffect(() => {
    if (!ready) return;
    let live = true;
    setChapter(undefined);
    (async () => {
      const [{ data: t }, { data: c }] = await Promise.all([
        supabase.rpc('booknest_author_toc', { p_book: book.id }),
        supabase.from('booknest_author_chapters').select('*').eq('book_id', book.id).eq('position', position).maybeSingle(),
      ]);
      if (!live) return;
      setToc((t as TocRow[]) ?? []);
      setChapter((c as Chapter) ?? null);
      if (c) {
        try { localStorage.setItem(`mkr-novel-${book.id}`, String(position)); } catch {}
        if (user) supabase.rpc('booknest_log_author_read', { p_chapter: (c as Chapter).id }).then(() => {});
      }
      window.scrollTo({ top: 0 });
    })();
    return () => { live = false; };
  }, [ready, book.id, position, user, session?.access_token]);

  function changeSize(d: number) {
    setSize(s => { const n = Math.min(28, Math.max(15, s + d)); try { localStorage.setItem('mkr-novel-size', String(n)); } catch {} return n; });
  }

  const row = toc?.find(c => c.chapter_position === position);
  const prev = toc?.filter(c => c.chapter_position < position).at(-1);
  const next = toc?.find(c => c.chapter_position > position);
  const paragraphs = chapter?.content.split(/\n\s*\n|\r\n\s*\r\n/).map(p => p.trim()).filter(Boolean) ?? [];

  return (
    <main className="page novelReader">
      <div className="novelBar">
        <Link href={`/novel/${book.id}`} className="backLink"><ArrowLeft size={16} /> {book.title}</Link>
        <div className="row">
          <button className="iconBtn" onClick={() => changeSize(-1)} aria-label="Smaller text"><Minus size={16} /></button>
          <button className="iconBtn" onClick={() => changeSize(1)} aria-label="Bigger text"><PlusIcon size={16} /></button>
          <Link className="iconBtn" href={`/novel/${book.id}`} aria-label="All chapters"><List size={16} /></Link>
        </div>
      </div>

      {chapter === undefined ? (
        <div className="center pad"><Loader2 className="spin" /></div>
      ) : chapter === null ? (
        row || (toc && toc.length) ? (
          <section className="card lockedCard center">
            <Lock size={28} />
            <h2>Chapter {position}{row ? `: ${row.title}` : ''}</h2>
            {book.access === 'plus' ? (
              <><p className="dim">Keep reading with M King Reads Plus. You get every Plus novel, and the writer earns from your reads.</p>
                <Link className="btn btnGold" href="/premium"><Crown size={16} /> Get Plus</Link></>
            ) : (
              <><p className="dim">Buy the full book to read every chapter. Most of the money goes to {book.author || 'the writer'}.</p>
                <Link className="btn btnGold" href={`/novel/${book.id}`}><ShoppingBag size={16} /> Buy · {naira(book.price_ngn)}</Link></>
            )}
            {!user && <p className="small">Already paid? <Link className="gold" href={`/login?next=/novel/${book.id}/${position}`}>Sign in</Link></p>}
          </section>
        ) : <section className="card center"><p>Chapter not found.</p></section>
      ) : (
        <article className="novelText" lang={book.language === 'pcm' ? 'pcm' : book.language} style={{ fontSize: size }}>
          <span className="kicker">CHAPTER {chapter.position}</span>
          <h1>{chapter.title}</h1>
          {paragraphs.map((p, i) => <p key={i}>{p}</p>)}
        </article>
      )}

      {chapter && position === 1 && <SponsorSlot variant="inline" />}

      <nav className="chapterNav plain">
        {prev ? <Link className="btn btnGhost" href={`/novel/${book.id}/${prev.chapter_position}`}><ChevronLeft size={16} /> Previous</Link> : <span />}
        {next ? <Link className="btn btnGold" href={`/novel/${book.id}/${next.chapter_position}`}>Next chapter {!next.unlocked && <Lock size={14} />} <ChevronRight size={16} /></Link>
          : chapter ? <Link className="btn btnGhost" href={`/novel/${book.id}`}>The end · back to book</Link> : <span />}
      </nav>
    </main>
  );
}
