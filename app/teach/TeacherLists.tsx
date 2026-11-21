'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  ArrowDown, ArrowLeft, ArrowUp, Check, Copy, Eye, GraduationCap, Loader2, MessageCircle, Plus, Search, Share2, Trash2, X,
} from 'lucide-react';
import { useAccount } from '../../lib/account';
import {
  addToList, bookHref, createList, deleteList, listItems, listUrl, myLists, removeItem, reorder, shareMessage, updateList,
  type ListBook, type ListItem, type ReadingList,
} from '../../lib/readingLists';

function msg(e: unknown) { return (e as { message?: string })?.message ?? 'Something went wrong.'; }

export default function TeacherLists() {
  const { user, ready } = useAccount();
  const [lists, setLists] = useState<ReadingList[] | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try { setLists(await myLists()); } catch (e) { setError(msg(e)); setLists([]); }
  }, []);
  useEffect(() => { if (user) void load(); }, [user, load]);

  if (!ready) return <p className="dim">Loading…</p>;
  if (!user) {
    return (
      <>
        <section className="featureGrid teachSteps">
          <div className="feature"><b>1</b><strong>Pick books</strong><span>Search 70,000+ free classics and African books.</span></div>
          <div className="feature"><b>2</b><strong>Share one link</strong><span>Post it in the class WhatsApp group.</span></div>
          <div className="feature"><b>3</b><strong>Students read</strong><span>On any phone, free, and they keep their place.</span></div>
        </section>
        <div className="emptyState">
          <GraduationCap size={30} />
          <strong>Sign in to make your first list</strong>
          <p>A free teacher account keeps your lists safe. Students don&apos;t need one.</p>
          <div className="row"><Link className="btn btnGold" href="/login?next=/teach">Sign in or create account</Link></div>
        </div>
      </>
    );
  }

  const open = lists?.find(l => l.id === openId) ?? null;
  if (open) return <ListEditor list={open} onBack={() => { setOpenId(null); void load(); }} onChange={next => setLists(ls => ls?.map(l => (l.id === next.id ? next : l)) ?? null)} onDeleted={() => { setOpenId(null); void load(); }} />;

  return (
    <>
      <NewList onCreated={list => { setLists(ls => [list, ...(ls ?? [])]); setOpenId(list.id); }} />
      {error && <p className="formError">{error}</p>}
      {lists === null ? <p className="dim">Loading your lists…</p> : lists.length === 0 ? (
        <p className="dim">No lists yet. Make one above — you can add books straight away.</p>
      ) : (
        <section className="teachLists">
          {lists.map(l => (
            <button key={l.id} type="button" className="card teachListCard" onClick={() => setOpenId(l.id)}>
              <span className="kicker">{l.class_name || 'Reading list'}</span>
              <strong>{l.title}</strong>
              <small className="dim"><Eye size={13} /> Opened {l.opens} {l.opens === 1 ? 'time' : 'times'} · updated {new Date(l.updated_at).toLocaleDateString('en-NG', { dateStyle: 'medium' })}</small>
            </button>
          ))}
        </section>
      )}
    </>
  );
}

function NewList({ onCreated }: { onCreated: (l: ReadingList) => void }) {
  const [title, setTitle] = useState('');
  const [className, setClassName] = useState('');
  const [teacher, setTeacher] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => { try { setTeacher(localStorage.getItem('mkr-teacher-name') || ''); } catch {} }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setBusy(true); setError('');
    try {
      try { localStorage.setItem('mkr-teacher-name', teacher.trim()); } catch {}
      onCreated(await createList({ title, class_name: className, teacher_name: teacher }));
      setTitle(''); setClassName('');
    } catch (err) { setError(msg(err)); }
    finally { setBusy(false); }
  }

  return (
    <form className="card formGrid" onSubmit={submit}>
      <div className="cardHead"><h3><Plus size={16} className="gold" /> New reading list</h3></div>
      <label>List name<input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. First term novels" maxLength={120} required /></label>
      <label>Class (optional)<input value={className} onChange={e => setClassName(e.target.value)} placeholder="e.g. JSS 2B" maxLength={80} /></label>
      <label>Your name as students see it<input value={teacher} onChange={e => setTeacher(e.target.value)} placeholder="e.g. Mrs Okafor" maxLength={80} /></label>
      <button className="btn btnGold" disabled={busy}>{busy ? <Loader2 size={15} className="spin" /> : <Plus size={15} />} Create list</button>
      {error && <p className="formError span">{error}</p>}
    </form>
  );
}

function ListEditor({ list, onBack, onChange, onDeleted }: { list: ReadingList; onBack: () => void; onChange: (l: ReadingList) => void; onDeleted: () => void }) {
  const [items, setItems] = useState<ListItem[] | null>(null);
  const [form, setForm] = useState({ title: list.title, class_name: list.class_name ?? '', teacher_name: list.teacher_name ?? '', note: list.note ?? '' });
  const [saved, setSaved] = useState('');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const link = listUrl(list.share_code);
  const message = shareMessage({ ...list, ...form });

  const loadItems = useCallback(async () => { try { setItems(await listItems(list.id)); } catch (e) { setError(msg(e)); setItems([]); } }, [list.id]);
  useEffect(() => { void loadItems(); }, [loadItems]);

  async function save(e?: React.FormEvent) {
    e?.preventDefault();
    if (!form.title.trim()) return;
    setError('');
    try { await updateList(list.id, form); onChange({ ...list, ...form, class_name: form.class_name || null, teacher_name: form.teacher_name || null, note: form.note || null }); setSaved('Saved ✔'); window.setTimeout(() => setSaved(''), 1800); }
    catch (err) { setError(msg(err)); }
  }

  async function move(index: number, dir: -1 | 1) {
    if (!items) return;
    const next = items.slice();
    const j = index + dir;
    if (j < 0 || j >= next.length) return;
    [next[index], next[j]] = [next[j], next[index]];
    setItems(next);
    try { await reorder(next); } catch (e) { setError(msg(e)); }
  }

  async function remove(item: ListItem) {
    setItems(cur => cur?.filter(i => i.id !== item.id) ?? null);
    try { await removeItem(item.id); } catch (e) { setError(msg(e)); void loadItems(); }
  }

  async function copy() {
    try { await navigator.clipboard.writeText(message); setCopied(true); window.setTimeout(() => setCopied(false), 1800); } catch { setError(link); }
  }
  async function share() {
    if (navigator.share) { try { await navigator.share({ title: form.title, text: message }); } catch {} } else void copy();
  }
  async function destroy() {
    if (!window.confirm(`Delete “${list.title}”? Students with the link will no longer see it.`)) return;
    try { await deleteList(list.id); onDeleted(); } catch (e) { setError(msg(e)); }
  }

  return (
    <>
      <button className="backLink" onClick={onBack}><ArrowLeft size={16} /> All my lists</button>

      <section className="card shareCard">
        <div className="cardHead"><h3><Share2 size={16} className="gold" /> Share with your class</h3><span className="dim small"><Eye size={13} /> Opened {list.opens} times</span></div>
        <p className="mono shareLink">{link}</p>
        <div className="row">
          <a className="btn btnGold" href={`https://wa.me/?text=${encodeURIComponent(message)}`} target="_blank" rel="noreferrer"><MessageCircle size={16} /> Send on WhatsApp</a>
          <button className="btn btnGhost" onClick={copy}>{copied ? <Check size={16} /> : <Copy size={16} />} {copied ? 'Copied' : 'Copy link'}</button>
          <button className="btn btnGhost" onClick={share}><Share2 size={16} /> Share</button>
          <Link className="btn btnGhost" href={`/list/${list.share_code}`} target="_blank"><Eye size={16} /> Student view</Link>
        </div>
      </section>

      <form className="card formGrid" onSubmit={save}>
        <div className="cardHead"><h3>List details</h3>{saved && <span className="small gold">{saved}</span>}</div>
        <label>List name<input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} maxLength={120} required /></label>
        <label>Class<input value={form.class_name} onChange={e => setForm({ ...form, class_name: e.target.value })} maxLength={80} /></label>
        <label>Teacher name<input value={form.teacher_name} onChange={e => setForm({ ...form, teacher_name: e.target.value })} maxLength={80} /></label>
        <label className="span">Note to students (optional)<textarea value={form.note} onChange={e => setForm({ ...form, note: e.target.value })} rows={2} maxLength={600} placeholder="e.g. Read chapters 1–3 before Friday." /></label>
        <button className="btn btnGhost">Save details</button>
      </form>

      <BookSearch onAdd={async book => {
        const r = await addToList(list.id, book);
        if (r === 'added') void loadItems();
        return r;
      }} />

      <section className="card">
        <div className="cardHead"><h3>Books on this list {items ? `(${items.length})` : ''}</h3></div>
        {items === null ? <Loader2 size={18} className="spin" /> : items.length === 0 ? <p className="dim">No books yet. Search above and tap Add.</p> : (
          <ol className="listItems">
            {items.map((item, i) => (
              <li key={item.id}>
                <span className="listNo">{i + 1}</span>
                {item.cover_url ? <img src={item.cover_url} alt="" loading="lazy" /> : <span className="listCoverBlank" />}
                <span className="grow"><Link href={bookHref(item.book_ref)} target="_blank"><strong>{item.title}</strong></Link>{item.author && <small>{item.author}</small>}</span>
                <span className="row">
                  <button className="iconBtn" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Move up"><ArrowUp size={16} /></button>
                  <button className="iconBtn" onClick={() => move(i, 1)} disabled={i === items.length - 1} aria-label="Move down"><ArrowDown size={16} /></button>
                  <button className="iconBtn" onClick={() => remove(item)} aria-label={`Remove ${item.title}`}><X size={16} /></button>
                </span>
              </li>
            ))}
          </ol>
        )}
      </section>

      {error && <p className="formError">{error}</p>}
      <button className="btn btnGhost" onClick={destroy}><Trash2 size={15} /> Delete this list</button>
    </>
  );
}

type Result = ListBook & { source: string };

function BookSearch({ onAdd }: { onAdd: (b: ListBook) => Promise<'added' | 'exists'> }) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState<Result[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [state, setState] = useState<Record<string, string>>({});
  const seq = useRef(0);

  async function search(e?: React.FormEvent) {
    e?.preventDefault();
    const term = q.trim();
    if (term.length < 2) return;
    const n = ++seq.current;
    setBusy(true);
    try {
      const res = await fetch(`/api/book-search?q=${encodeURIComponent(term)}`);
      const data = (await res.json()) as { results: Result[] };
      if (n === seq.current) setResults(data.results ?? []);
    } catch { if (n === seq.current) setResults([]); }
    finally { if (n === seq.current) setBusy(false); }
  }

  async function add(r: Result) {
    setState(s => ({ ...s, [r.ref]: 'busy' }));
    try { const out = await onAdd(r); setState(s => ({ ...s, [r.ref]: out === 'exists' ? 'On list' : 'Added' })); }
    catch (e) { setState(s => ({ ...s, [r.ref]: '' })); window.alert(msg(e)); }
  }

  return (
    <section className="card">
      <div className="cardHead"><h3><Search size={16} className="gold" /> Add books</h3></div>
      <form className="searchBar" onSubmit={search} role="search">
        <Search size={18} /><input value={q} onChange={e => setQ(e.target.value)} placeholder="Title or author, e.g. Things Fall Apart, Dickens" aria-label="Search books" />
        <button className="btn btnGold btnSmall" disabled={busy}>{busy ? <Loader2 size={14} className="spin" /> : 'Search'}</button>
      </form>
      {results && (results.length === 0 ? <p className="dim">No free books found for that search.</p> : (
        <ul className="listItems searchResults">
          {results.map(r => (
            <li key={r.ref}>
              {r.cover ? <img src={r.cover} alt="" loading="lazy" /> : <span className="listCoverBlank" />}
              <span className="grow"><strong>{r.title}</strong><small>{r.author} · {r.source}</small></span>
              <button className="btn btnSmall btnGhost" onClick={() => add(r)} disabled={!!state[r.ref]}>
                {state[r.ref] === 'busy' ? <Loader2 size={14} className="spin" /> : state[r.ref] ? <><Check size={14} /> {state[r.ref]}</> : <><Plus size={14} /> Add</>}
              </button>
            </li>
          ))}
        </ul>
      ))}
    </section>
  );
}
