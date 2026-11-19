'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CloudDownload, LibraryBig, Trash2 } from 'lucide-react';
import { supabase } from '../../lib/supabase-browser';
import BookCover from '../components/BookCover';
import { offlineIndex, type OfflineEntry } from '../components/OfflineButton';
import Footer from '../components/Footer';

type Row = {
  book_id: string;
  booknest_books: { id: string; title: string; author: string | null; cover_url: string | null } | null;
  progress: { progress: number; chapter: number } | null;
};

export default function LibraryPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [offline, setOffline] = useState<OfflineEntry[]>([]);
  const [tab, setTab] = useState<'reading' | 'saved' | 'finished' | 'offline'>('reading');
  const [loading, setLoading] = useState(true);
  const [signedIn, setSignedIn] = useState(true);

  useEffect(() => {
    setOffline(offlineIndex());
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setSignedIn(false); setLoading(false); setTab('offline'); return; }
      const { data } = await supabase.from('booknest_library')
        .select('book_id,created_at,booknest_books(id,title,author,cover_url),booknest_reading_progress(progress,chapter)')
        .order('created_at', { ascending: false });
      const list = (data ?? []).map((r: any) => ({
        book_id: r.book_id,
        booknest_books: Array.isArray(r.booknest_books) ? r.booknest_books[0] ?? null : r.booknest_books,
        progress: Array.isArray(r.booknest_reading_progress) ? r.booknest_reading_progress[0] ?? null : r.booknest_reading_progress,
      })) as Row[];
      setRows(list);
      if (!list.some(r => r.progress && r.progress.progress > 0 && r.progress.progress < 100)) setTab('saved');
      setLoading(false);
    })();
  }, []);

  async function remove(id: string) {
    await supabase.from('booknest_library').delete().eq('book_id', id);
    setRows(r => r.filter(x => x.book_id !== id));
  }

  const pct = (r: Row) => Number(r.progress?.progress ?? 0);
  const lists = {
    reading: rows.filter(r => pct(r) > 0 && pct(r) < 100),
    saved: rows,
    finished: rows.filter(r => pct(r) >= 100),
  };

  return (
    <main className="page">
      <div className="pageHead"><span className="kicker">YOUR SHELF</span><h1>My library</h1></div>
      <div className="tabs" role="tablist">
        {signedIn && (['reading', 'saved', 'finished'] as const).map(t => <button key={t} role="tab" aria-selected={tab === t} className={tab === t ? 'on' : ''} onClick={() => setTab(t)}>{t === 'reading' ? 'Reading' : t === 'saved' ? 'Saved' : 'Finished'} <em>{lists[t].length}</em></button>)}
        <button role="tab" aria-selected={tab === 'offline'} className={tab === 'offline' ? 'on' : ''} onClick={() => setTab('offline')}><CloudDownload size={14} /> Offline <em>{offline.length}</em></button>
      </div>

      {loading ? <p className="dim">Loading your library…</p> : tab === 'offline' ? (
        offline.length ? <div className="shelf">{offline.map(o => (
          <Link key={o.bookId} href={o.urls[0] || `/read/${o.bookId}`} className="shelfItem">
            <BookCover src={o.coverUrl} title={o.title} author={o.author} size="sm" />
            <div><strong>{o.title}</strong><span>{o.author}</span><em>Available offline</em></div>
          </Link>
        ))}</div> : <div className="emptyState"><CloudDownload size={34} /><strong>No downloads yet</strong><p>Tap “Read offline” on any book to keep it on this phone.</p>{!signedIn && <Link className="btn btnGold" href="/login?next=/library">Sign in to sync your shelf</Link>}</div>
      ) : lists[tab].length ? (
        <div className="shelf">{lists[tab].map(r => {
          const b = r.booknest_books; if (!b) return null;
          const p = pct(r);
          return (
            <div key={r.book_id} className="shelfItem">
              <Link href={`/book/${b.id}`}><BookCover src={b.cover_url} title={b.title} author={b.author} size="sm" /></Link>
              <div>
                <Link href={`/book/${b.id}`}><strong>{b.title}</strong></Link><span>{b.author}</span>
                {p > 0 ? <div className="bar"><span style={{ width: `${Math.min(100, p)}%` }} /></div> : <em>Not started</em>}
                <div className="row">
                  <Link className="btn btnGold btnSmall" href={p > 0 && p < 100 ? `/read/${b.id}?chapter=${Math.max(1, r.progress?.chapter ?? 1)}` : `/read/${b.id}`}>{p >= 100 ? 'Read again' : p > 0 ? `Continue · ${Math.round(p)}%` : 'Start'}</Link>
                  <button className="btn btnGhost btnSmall btnIcon" onClick={() => remove(b.id)} aria-label="Remove"><Trash2 size={15} /></button>
                </div>
              </div>
            </div>
          );
        })}</div>
      ) : (
        <div className="emptyState"><LibraryBig size={34} /><strong>{tab === 'finished' ? 'No finished books yet' : tab === 'reading' ? 'Nothing in progress' : 'Your shelf is empty'}</strong><p>Save books with the bookmark button and they will appear here.</p><Link className="btn btnGold" href="/explore">Find a book</Link></div>
      )}
      <Footer />
    </main>
  );
}
