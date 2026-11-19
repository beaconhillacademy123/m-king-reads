'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Play, X } from 'lucide-react';
import BookCover from './BookCover';

type LastBook = { bookId: string; chapter: number; title: string; author: string; coverUrl?: string | null; resumeHref?: string; progress?: number };

const DISMISSED_KEY = 'm-king-reads-dismiss-continue-reading';

export default function ContinueReading() {
  const [book, setBook] = useState<LastBook | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('m-king-reads-last-book');
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (localStorage.getItem(DISMISSED_KEY) === String(parsed?.bookId)) return;
      if (parsed?.bookId && parsed?.title) {
        setBook({
          bookId: String(parsed.bookId), chapter: Math.max(1, Math.floor(Number(parsed.chapter) || 1)),
          title: String(parsed.title), author: String(parsed.author || ''), coverUrl: parsed.coverUrl || null,
          resumeHref: typeof parsed.resumeHref === 'string' && parsed.resumeHref.startsWith('/') ? parsed.resumeHref : undefined,
          progress: Number(parsed.progress) || 0,
        });
      }
    } catch {}
  }, []);

  if (!book) return null;
  const href = book.resumeHref || `/read/${book.bookId}${book.chapter > 1 ? `?chapter=${book.chapter}` : ''}`;

  return (
    <section className="continueCard" aria-label="Continue reading">
      <BookCover src={book.coverUrl} title={book.title} author={book.author} size="sm" />
      <div className="continueText">
        <span className="kicker">CONTINUE READING</span>
        <strong>{book.title}</strong>
        <span>{book.author} · Chapter {book.chapter}</span>
        {book.progress ? <div className="bar"><span style={{ width: `${Math.min(100, book.progress)}%` }} /></div> : null}
      </div>
      <Link className="btn btnGold continuePlay" href={href} aria-label={`Continue ${book.title}`}><Play size={16} fill="currentColor" /> <span>Resume</span></Link>
      <button className="continueDismiss" onClick={() => { try { localStorage.setItem(DISMISSED_KEY, book.bookId); } catch {} setBook(null); }} aria-label="Hide"><X size={15} /></button>
    </section>
  );
}
