'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Check, Eye, ImagePlus, Loader2, Plus, Send, Trash2 } from 'lucide-react';
import { supabase } from '../../../../lib/supabase-browser';
import { useAccount } from '../../../../lib/account';
import { NOVEL_GENRES, NOVEL_LANGS, type Chapter, type Novel } from '../../../../lib/novels';

type ChapterRow = Pick<Chapter, 'id' | 'position' | 'title' | 'word_count'>;

const STATUS_NOTE: Record<string, string> = {
  draft: 'Draft. Only you can see it.',
  pending: 'Sent for review. An editor will check it soon. You can keep adding chapters.',
  published: 'Live. Readers can find it now. New chapters go live as soon as you save them.',
  rejected: 'The editor asked for changes. See the note, fix it and send again.',
};

export default function BookEditor({ id }: { id: string }) {
  const { user, ready } = useAccount();
  const router = useRouter();
  const [book, setBook] = useState<Novel | null | undefined>(undefined);
  const [chapters, setChapters] = useState<ChapterRow[]>([]);
  const [current, setCurrent] = useState<Chapter | null>(null);
  const [saving, setSaving] = useState('');
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    const [{ data: b }, { data: c }] = await Promise.all([
      supabase.from('booknest_author_books').select('*').eq('id', id).maybeSingle(),
      supabase.from('booknest_author_chapters').select('id,position,title,word_count').eq('book_id', id).order('position'),
    ]);
    setBook((b as Novel) ?? null);
    setChapters((c as ChapterRow[]) ?? []);
  }, [id]);

  useEffect(() => { if (user) load(); }, [user, load]);

  function flash(m: string) { setMsg(m); window.setTimeout(() => setMsg(''), 2200); }

  async function saveDetails(patch: Partial<Novel> = {}) {
    if (!book) return false;
    setError(''); setSaving('details');
    const next = { ...book, ...patch };
    const { data, error: err } = await supabase.from('booknest_author_books').update({
      title: next.title.trim() || 'Untitled novel', description: next.description?.trim() || null, language: next.language, genre: next.genre,
      cover_url: next.cover_url, access: next.access, price_ngn: next.access === 'paid' ? next.price_ngn : 0,
      free_chapters: next.free_chapters, mature: next.mature, status: next.status,
    }).eq('id', book.id).select('*').single();
    setSaving('');
    if (err) { setError(err.message.includes('price') || err.message.includes('check') ? 'Paid books need a price of at least ₦100.' : err.message); return false; }
    setBook(data as Novel); flash('Saved');
    return true;
  }

  async function uploadCover(file: File) {
    if (!user || !book) return;
    if (file.size > 2 * 1024 * 1024) return setError('Cover must be under 2 MB.');
    setSaving('cover');
    const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg';
    const path = `${user.id}/${book.id}-${Date.now()}.${ext}`;
    const { error: err } = await supabase.storage.from('author-covers').upload(path, file, { contentType: file.type, upsert: true });
    if (err) { setSaving(''); return setError('Upload failed. Use a JPG, PNG or WEBP image.'); }
    const { data } = supabase.storage.from('author-covers').getPublicUrl(path);
    setSaving('');
    await saveDetails({ cover_url: data.publicUrl });
  }

  async function addChapter() {
    if (!book) return;
    const position = (chapters.at(-1)?.position ?? 0) + 1;
    const { data, error: err } = await supabase.from('booknest_author_chapters')
      .insert({ book_id: book.id, position, title: `Chapter ${position}`, content: '' }).select('*').single();
    if (err) return setError(err.message);
    await load();
    setCurrent(data as Chapter);
  }

  async function openChapter(cid: string) {
    const { data } = await supabase.from('booknest_author_chapters').select('*').eq('id', cid).single();
    setCurrent(data as Chapter);
  }

  async function saveChapter() {
    if (!current) return;
    setSaving('chapter'); setError('');
    const { data, error: err } = await supabase.from('booknest_author_chapters')
      .update({ title: current.title.trim() || `Chapter ${current.position}`, content: current.content }).eq('id', current.id).select('*').single();
    setSaving('');
    if (err) return setError('Could not save the chapter. ' + err.message);
    setCurrent(data as Chapter); flash('Chapter saved'); load();
  }

  async function deleteLastChapter() {
    const last = chapters.at(-1);
    if (!last || !confirm(`Delete "${last.title}"? This cannot be undone.`)) return;
    await supabase.from('booknest_author_chapters').delete().eq('id', last.id);
    if (current?.id === last.id) setCurrent(null);
    load();
  }

  async function submitForReview() {
    const words = chapters.reduce((a, c) => a + c.word_count, 0);
    if (!book?.title || book.title === 'Untitled novel') return setError('Give your novel a title first.');
    if (!book.description || book.description.length < 40) return setError('Add a description of at least 40 characters, so readers know what it is about.');
    if (chapters.length < 1 || words < 300) return setError('Write at least one chapter (300+ words) before sending for review.');
    if (await saveDetails({ status: 'pending' })) flash('Sent for review');
  }

  async function deleteBook() {
    if (!book || !confirm('Delete this novel and all its chapters?')) return;
    const { error: err } = await supabase.from('booknest_author_books').delete().eq('id', book.id);
    if (err) return setError('Live books cannot be deleted here. Contact support.');
    router.push('/write');
  }

  if (!ready || (user && book === undefined)) return <main className="page"><div className="center pad"><Loader2 className="spin" /></div></main>;
  if (!user) return <main className="page"><div className="card center"><p>Please sign in.</p><Link className="btn btnGold" href={`/login?next=/write/book/${id}`}>Sign in</Link></div></main>;
  if (!book) return <main className="page"><div className="card center"><p>Novel not found.</p><Link className="btn btnGhost" href="/write">Back to studio</Link></div></main>;

  const totalWords = chapters.reduce((a, c) => a + c.word_count, 0);
  const liveWords = current ? (current.content.trim() ? current.content.trim().split(/\s+/).length : 0) : 0;

  return (
    <main className="page writePage">
      <Link href="/write" className="backLink"><ArrowLeft size={16} /> Writer Studio</Link>
      <div className="pageHead">
        <div><h1>{book.title}</h1><p className={`statusNote st-${book.status}`}>{STATUS_NOTE[book.status]}</p>
          {book.review_note && <p className="reviewNote"><b>Editor&apos;s note:</b> {book.review_note}</p>}</div>
        <div className="row">
          {book.status === 'published' && <Link className="btn btnGhost btnSmall" href={`/novel/${book.id}`}><Eye size={15} /> View</Link>}
          {(book.status === 'draft' || book.status === 'rejected') && <button className="btn btnGold" onClick={submitForReview} disabled={!!saving}><Send size={16} /> Send for review</button>}
        </div>
      </div>
      {msg && <div className="toast"><Check size={15} /> {msg}</div>}
      {error && <p className="formError">{error}</p>}

      <div className="editorGrid">
        <section className="card writeForm">
          <h3>Book details</h3>
          <div className="coverPick">
            <button type="button" className="writeBookCover big" onClick={() => fileRef.current?.click()}>
              {book.cover_url ? <img src={book.cover_url} alt="Cover" /> : <span><ImagePlus size={22} /><small>Add cover</small></span>}
              {saving === 'cover' && <Loader2 className="spin coverSpin" />}
            </button>
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={e => e.target.files?.[0] && uploadCover(e.target.files[0])} />
            <p className="dim small">Portrait image, 2 MB max. A clear title on the cover helps readers.</p>
          </div>
          <label>Title<input value={book.title} maxLength={120} onChange={e => setBook({ ...book, title: e.target.value })} /></label>
          <label>Description<textarea rows={4} maxLength={1500} value={book.description ?? ''} onChange={e => setBook({ ...book, description: e.target.value })} placeholder="What is the story about? Hook the reader." /></label>
          <div className="two">
            <label>Language<select value={book.language} onChange={e => setBook({ ...book, language: e.target.value as Novel['language'] })}>
              {NOVEL_LANGS.map(l => <option key={l.code} value={l.code}>{l.name}</option>)}</select></label>
            <label>Genre<select value={book.genre} onChange={e => setBook({ ...book, genre: e.target.value })}>
              {NOVEL_GENRES.map(g => <option key={g.slug} value={g.slug}>{g.name}</option>)}</select></label>
          </div>
          <fieldset className="accessPick">
            <legend>How readers unlock it</legend>
            {([['plus', 'Plus members', 'Readers with Plus read everything. You earn from the monthly Plus pool.'],
               ['paid', 'Sell it', 'Readers buy the full book. You keep your share of every sale.'],
               ['free', 'Free', 'Everyone reads everything. Good for growing an audience.']] as const).map(([v, t, d]) => (
              <label key={v} className={`accessOpt ${book.access === v ? 'on' : ''}`}>
                <input type="radio" name="access" checked={book.access === v} onChange={() => setBook({ ...book, access: v, price_ngn: v === 'paid' ? Math.max(book.price_ngn, 500) : 0 })} />
                <b>{t}</b><span>{d}</span>
              </label>
            ))}
          </fieldset>
          <div className="two">
            {book.access === 'paid' && <label>Price (₦)<input inputMode="numeric" value={book.price_ngn || ''} onChange={e => setBook({ ...book, price_ngn: Number(e.target.value.replace(/\D/g, '')) })} /></label>}
            {book.access !== 'free' && <label>Free chapters<select value={book.free_chapters} onChange={e => setBook({ ...book, free_chapters: Number(e.target.value) })}>
              {[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n}</option>)}</select></label>}
          </div>
          <label className="checkLine"><input type="checkbox" checked={book.mature} onChange={e => setBook({ ...book, mature: e.target.checked })} /><span>Contains adult themes (18+)</span></label>
          <div className="row">
            <button className="btn btnGold" onClick={() => saveDetails()} disabled={!!saving}>{saving === 'details' ? <Loader2 className="spin" size={16} /> : null} Save details</button>
            {book.status !== 'published' && <button className="btn btnGhost btnSmall dangerText" onClick={deleteBook}><Trash2 size={14} /> Delete</button>}
          </div>
        </section>

        <section className="card">
          <div className="cardHead"><h3>Chapters</h3><span className="dim small">{chapters.length} · {totalWords.toLocaleString()} words</span></div>
          <ol className="chapterEdit">
            {chapters.map(c => (
              <li key={c.id}><button className={current?.id === c.id ? 'on' : ''} onClick={() => openChapter(c.id)}>
                <span className="lessonNo">{c.position}</span><span className="grow">{c.title}</span><span className="dim small">{c.word_count} w</span>
              </button></li>
            ))}
          </ol>
          <div className="row">
            <button className="btn btnGhost btnSmall" onClick={addChapter}><Plus size={15} /> Add chapter</button>
            {chapters.length > 0 && <button className="btn btnGhost btnSmall dangerText" onClick={deleteLastChapter}><Trash2 size={14} /> Remove last</button>}
          </div>
        </section>
      </div>

      {current && (
        <section className="card chapterWriter">
          <div className="cardHead">
            <input className="chapterTitleInput" value={current.title} maxLength={120} onChange={e => setCurrent({ ...current, title: e.target.value })} aria-label="Chapter title" />
            <span className="dim small">{liveWords.toLocaleString()} words</span>
          </div>
          <textarea className="chapterText" lang={book.language === 'pcm' ? 'en' : book.language} value={current.content}
            onChange={e => setCurrent({ ...current, content: e.target.value })} placeholder="Start writing… Leave an empty line between paragraphs." spellCheck />
          <div className="row">
            <button className="btn btnGold" onClick={saveChapter} disabled={saving === 'chapter'}>{saving === 'chapter' ? <Loader2 className="spin" size={16} /> : <Check size={16} />} Save chapter</button>
            <span className="dim small">Tip: write in a notes app and paste here. Tone marks (ẹ, ọ, ṣ, ụ, ị) are kept.</span>
          </div>
        </section>
      )}
    </main>
  );
}
