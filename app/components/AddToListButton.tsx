'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Check, GraduationCap, Loader2, Plus, X } from 'lucide-react';
import { supabase } from '../../lib/supabase-browser';
import { addToList, createList, myLists, type ListBook, type ReadingList } from '../../lib/readingLists';

/** "Add to class list" — lets a teacher drop this book into one of their reading lists. */
export default function AddToListButton({ book }: { book: ListBook }) {
  const [open, setOpen] = useState(false);
  const [lists, setLists] = useState<ReadingList[] | null>(null);
  const [busy, setBusy] = useState('');
  const [done, setDone] = useState<Record<string, string>>({});
  const [title, setTitle] = useState('');
  const [error, setError] = useState('');

  async function start() {
    const { data } = await supabase.auth.getSession();
    if (!data.session) { window.location.href = '/login?next=' + encodeURIComponent(window.location.pathname); return; }
    setOpen(true); setError('');
    try { setLists(await myLists()); } catch (e) { setError((e as Error).message); setLists([]); }
  }

  async function add(list: ReadingList) {
    setBusy(list.id); setError('');
    try { const r = await addToList(list.id, book); setDone(d => ({ ...d, [list.id]: r === 'exists' ? 'Already on this list' : 'Added' })); }
    catch (e) { setError((e as Error).message); }
    finally { setBusy(''); }
  }

  async function createAndAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setBusy('new'); setError('');
    try {
      const list = await createList({ title });
      await addToList(list.id, book);
      setLists(l => [list, ...(l ?? [])]); setDone(d => ({ ...d, [list.id]: 'Added' })); setTitle('');
    } catch (err) { setError((err as Error).message); }
    finally { setBusy(''); }
  }

  return (
    <>
      <button className="btn btnGhost" onClick={start}><GraduationCap size={16} /> Class list</button>
      {open && (
        <div className="modalBack" onClick={() => setOpen(false)}>
          <div className="modal" role="dialog" aria-modal="true" aria-label="Add to a class reading list" onClick={e => e.stopPropagation()}>
            <button className="modalClose" onClick={() => setOpen(false)} aria-label="Close"><X size={18} /></button>
            <h3><GraduationCap size={20} className="gold" /> Add to a reading list</h3>
            <p>Pick a list for your class. Students open it with one link.</p>
            {lists === null ? <Loader2 size={20} className="spin" /> : (
              <div className="pickList">
                {lists.map(l => (
                  <button key={l.id} type="button" onClick={() => add(l)} disabled={!!busy || !!done[l.id]}>
                    <span><strong>{l.title}</strong>{l.class_name && <small>{l.class_name}</small>}</span>
                    {busy === l.id ? <Loader2 size={16} className="spin" /> : done[l.id] ? <em><Check size={14} /> {done[l.id]}</em> : <Plus size={16} />}
                  </button>
                ))}
                {!lists.length && <p className="dim small">You have no lists yet. Start one below.</p>}
              </div>
            )}
            <form className="row" onSubmit={createAndAdd}>
              <input value={title} onChange={e => setTitle(e.target.value)} placeholder="New list, e.g. JSS2 Term 1" maxLength={120} aria-label="New list name" style={{ flex: 1, minWidth: 0 }} />
              <button className="btn btnGold" disabled={busy === 'new' || !title.trim()}>{busy === 'new' ? <Loader2 size={15} className="spin" /> : 'Create'}</button>
            </form>
            {error && <p className="formError">{error}</p>}
            <Link className="btn btnGhost btnBlock" href="/teach">Manage and share my lists</Link>
          </div>
        </div>
      )}
    </>
  );
}
