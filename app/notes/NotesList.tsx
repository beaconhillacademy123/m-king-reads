'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { BookOpen, Download, Loader2, NotebookPen, Search, Trash2 } from 'lucide-react';
import { useAccount } from '../../lib/account';
import { deleteNote, downloadNote, listCloudNotes, listLocalNotes, writeLocalNote, type Note } from '../../lib/notes';

export default function NotesList() {
  const { user, ready } = useAccount();
  const [notes, setNotes] = useState<Note[] | null>(null);
  const [q, setQ] = useState('');

  useEffect(() => {
    if (!ready) return;
    const local = listLocalNotes();
    if (!user) { setNotes(local); return; }
    void listCloudNotes().then(cloud => {
      // Merge: newest copy of each book wins; device-only notes get uploaded on next edit.
      const map = new Map<string, Note>();
      [...cloud, ...local].forEach(n => {
        const have = map.get(n.book_key);
        if (!have || n.updated_at > have.updated_at) map.set(n.book_key, n);
      });
      cloud.forEach(n => { const l = local.find(x => x.book_key === n.book_key); if (!l || n.updated_at > l.updated_at) writeLocalNote(n); });
      setNotes([...map.values()].sort((a, b) => b.updated_at.localeCompare(a.updated_at)));
    }).catch(() => setNotes(local));
  }, [ready, user]);

  const shown = useMemo(() => {
    const s = q.trim().toLowerCase();
    return (notes ?? []).filter(n => !s || `${n.title} ${n.content}`.toLowerCase().includes(s));
  }, [notes, q]);

  async function remove(n: Note) {
    if (!confirm(`Delete your notes for "${n.title}"?`)) return;
    await deleteNote(user?.id ?? null, n.book_key);
    setNotes(list => list?.filter(x => x.book_key !== n.book_key) ?? list);
  }

  return (
    <main className="page">
      <div className="pageHead">
        <div>
          <span className="kicker"><NotebookPen size={14} /> NOTEPAD</span>
          <h1>My notes</h1>
          <p className="dim">Everything you jotted down while reading. Tap the gold notepad button in any book to add more.</p>
        </div>
      </div>

      {notes === null ? (
        <div className="center pad"><Loader2 className="spin" /></div>
      ) : notes.length === 0 ? (
        <section className="card center emptyState">
          <NotebookPen size={30} />
          <h3>No notes yet</h3>
          <p className="dim">Open any book and tap the gold notepad button to write down thoughts, quotes and questions as you read.</p>
          <Link className="btn btnGold" href="/explore"><BookOpen size={16} /> Find a book</Link>
        </section>
      ) : (
        <>
          {notes.length > 3 && (
            <label className="searchBar" style={{ marginBottom: 14 }}><Search size={16} /><input value={q} onChange={e => setQ(e.target.value)} placeholder="Search your notes…" /></label>
          )}
          <div className="notesList">
            {shown.map(n => (
              <article key={n.book_key} className="noteCard">
                <header>
                  <div>
                    <h3>{n.title || 'Untitled'}</h3>
                    <small className="dim">Edited {new Date(n.updated_at).toLocaleString('en-NG', { dateStyle: 'medium', timeStyle: 'short' })}</small>
                  </div>
                  <div className="row">
                    <button className="btn btnGhost btnSmall" onClick={() => downloadNote(n)} aria-label="Download"><Download size={14} /></button>
                    <button className="btn btnGhost btnSmall" onClick={() => void remove(n)} aria-label="Delete"><Trash2 size={14} /></button>
                  </div>
                </header>
                <pre>{n.content}</pre>
                {n.href && <Link className="btn btnGold btnSmall" href={n.href} style={{ justifySelf: 'start' }}><BookOpen size={14} /> Open book &amp; notes</Link>}
              </article>
            ))}
          </div>
          {!user && <p className="dim small" style={{ marginTop: 16 }}>These notes are saved on this device. <Link className="gold" href="/login?next=/notes">Sign in</Link> to keep them on all your devices.</p>}
        </>
      )}
    </main>
  );
}
