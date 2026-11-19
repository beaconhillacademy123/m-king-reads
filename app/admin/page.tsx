'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Check, Crown, Loader2, Plus, RefreshCw, Star, Trash2, X } from 'lucide-react';
import { supabase } from '../../lib/supabase-browser';
import { naira } from '../../lib/format';

type Stats = { readers: number; plus_active: number; revenue_30d: number; revenue_total: number; pending: number; books: number; reading_minutes_7d: number };
type Payment = { id: string; email: string; kind: string; billing_period: string | null; amount: number; payment_reference: string; payer_name: string | null; note: string | null; status: string; created_at: string; book_title?: string | null };
type Sponsor = { id: string; title: string; body: string | null; cta: string; image_url: string | null; link_url: string; active: boolean; starts_at: string; ends_at: string; impressions: number; clicks: number };
type BookRow = { id: string; title: string; author: string; is_featured: boolean; gutenberg_id: number | null; genre_id: string | null };
type Genre = { id: string; name: string };
type Suggestion = { id: string; title: string; author: string | null; source_url: string | null; reason: string | null; status: string; created_at: string };
type BillingRow = { plus_monthly_ngn: number; plus_yearly_ngn: number; sponsor_weekly_ngn: number; payment_enabled: boolean; bank_name: string | null; account_name: string | null; account_number: string | null; support_email: string | null };

const TABS = ['Overview', 'Payments', 'Writers', 'Sponsors', 'Catalogue', 'Suggestions', 'Settings'] as const;
type Tab = (typeof TABS)[number];

function msg(e: unknown) { return (e as { message?: string })?.message ?? 'Something went wrong.'; }

export default function AdminPage() {
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [tab, setTab] = useState<Tab>('Overview');
  const [stats, setStats] = useState<Stats | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [busy, setBusy] = useState('');
  const [toast, setToast] = useState('');

  const flash = (t: string) => { setToast(t); window.setTimeout(() => setToast(''), 2600); };

  const loadCore = useCallback(async () => {
    const [{ data: s }, { data: p }] = await Promise.all([supabase.rpc('booknest_admin_stats'), supabase.rpc('booknest_admin_payment_overview')]);
    setStats(s as Stats); setPayments((p as Payment[]) ?? []);
  }, []);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { window.location.href = '/login?next=/admin'; return; }
      const { data } = await supabase.rpc('booknest_is_admin');
      setAllowed(data === true);
      if (data === true) void loadCore();
    })();
  }, [loadCore]);

  async function review(id: string, decision: 'approved' | 'rejected') {
    setBusy(id);
    const { error } = await supabase.rpc('booknest_admin_review_payment', { p_id: id, p_decision: decision });
    setBusy('');
    if (error) { flash(error.message); return; }
    flash(decision === 'approved' ? 'Approved ✔' : 'Rejected');
    void loadCore();
  }

  if (allowed === null) return <main className="page"><p className="dim">Checking access…</p></main>;
  if (!allowed) return <main className="page narrow"><div className="emptyState"><strong>Administrator access required</strong><p>This account is not an M King Reads administrator.</p><Link className="btn btnGhost" href="/">Back home</Link></div></main>;

  const pending = payments.filter(p => p.status === 'pending');

  return (
    <main className="page admin">
      <div className="pageHead"><span className="kicker">CONTROL CENTRE</span><h1>M King Reads admin</h1></div>
      <div className="tabs">{TABS.map(t => <button key={t} className={tab === t ? 'on' : ''} onClick={() => setTab(t)}>{t}{t === 'Payments' && pending.length ? <em className="hot">{pending.length}</em> : null}</button>)}</div>
      {toast && <div className="toast">{toast}</div>}

      {tab === 'Overview' && stats && (
        <>
          <section className="statRow wrap">
            <div className="stat"><strong>{naira(stats.revenue_30d)}</strong><span>Revenue (30 days)</span></div>
            <div className="stat"><strong>{naira(stats.revenue_total)}</strong><span>Revenue (all time)</span></div>
            <div className="stat"><strong>{stats.plus_active}</strong><span>Active Plus members</span></div>
            <div className="stat"><strong>{stats.pending}</strong><span>Payments to confirm</span></div>
            <div className="stat"><strong>{stats.readers}</strong><span>Active readers</span></div>
            <div className="stat"><strong>{stats.books}</strong><span>Books in catalogue</span></div>
            <div className="stat"><strong>{stats.reading_minutes_7d.toLocaleString()}</strong><span>Minutes read (7 days)</span></div>
          </section>
          <GrantPlus flash={flash} />
        </>
      )}

      {tab === 'Payments' && (
        <section className="card">
          <div className="cardHead"><h3>Payment requests</h3><button className="btn btnGhost btnSmall" onClick={() => loadCore()}><RefreshCw size={14} /> Refresh</button></div>
          <p className="dim small">Check your Opay app for each transfer, then approve. Approving a Plus payment switches Plus on instantly (renewals are added to the end of the current period).</p>
          {payments.length === 0 ? <p className="dim">No payments yet.</p> : (
            <div className="tableWrap"><table className="adminTable">
              <thead><tr><th>Date</th><th>Reader</th><th>For</th><th>Amount</th><th>Reference</th><th>Status</th><th /></tr></thead>
              <tbody>{payments.map(p => (
                <tr key={p.id} className={p.status === 'pending' ? 'rowHot' : ''}>
                  <td>{new Date(p.created_at).toLocaleString('en-NG', { dateStyle: 'medium', timeStyle: 'short' })}</td>
                  <td>{p.email}{p.payer_name && <small>Sender: {p.payer_name}</small>}</td>
                  <td>{p.kind === 'plus' ? `Plus · ${p.billing_period}` : p.kind === 'book' ? `Book · ${p.book_title ?? ''}` : p.kind === 'tip' ? 'Support' : 'Sponsor'}{p.note && <small>{p.note}</small>}</td>
                  <td><b>{naira(p.amount)}</b></td>
                  <td className="mono">{p.payment_reference}</td>
                  <td><span className={`status status-${p.status}`}>{p.status}</span></td>
                  <td>{p.status === 'pending' && <div className="row">
                    <button className="btn btnGold btnSmall" disabled={busy === p.id} onClick={() => review(p.id, 'approved')}>{busy === p.id ? <Loader2 size={14} className="spin" /> : <Check size={14} />} Approve</button>
                    <button className="btn btnGhost btnSmall" disabled={busy === p.id} onClick={() => review(p.id, 'rejected')}><X size={14} /></button>
                  </div>}</td>
                </tr>
              ))}</tbody>
            </table></div>
          )}
        </section>
      )}

      {tab === 'Writers' && <Writers flash={flash} />}
      {tab === 'Sponsors' && <Sponsors flash={flash} />}
      {tab === 'Catalogue' && <Catalogue flash={flash} />}
      {tab === 'Suggestions' && <Suggestions flash={flash} />}
      {tab === 'Settings' && <Settings flash={flash} />}
    </main>
  );
}

function GrantPlus({ flash }: { flash: (t: string) => void }) {
  const [email, setEmail] = useState('');
  const [days, setDays] = useState(30);
  async function go(e: React.FormEvent) {
    e.preventDefault();
    const { data, error } = await supabase.rpc('booknest_admin_set_plus', { p_email: email, p_days: days });
    if (error) flash(error.message); else { flash(days > 0 ? `Plus active until ${new Date(data as string).toLocaleDateString()}` : 'Plus removed'); setEmail(''); }
  }
  return (
    <form className="card formGrid" onSubmit={go}>
      <div className="cardHead"><h3><Crown size={16} className="gold" /> Give or remove Plus manually</h3></div>
      <label>Reader email<input type="email" value={email} onChange={e => setEmail(e.target.value)} required /></label>
      <label>Days (0 removes)<input type="number" min={0} max={3650} value={days} onChange={e => setDays(Number(e.target.value))} /></label>
      <button className="btn btnGold">Apply</button>
    </form>
  );
}

function Sponsors({ flash }: { flash: (t: string) => void }) {
  const [list, setList] = useState<Sponsor[]>([]);
  const empty = { title: '', body: '', cta: 'Learn more', image_url: '', link_url: 'https://', weeks: 1 };
  const [form, setForm] = useState(empty);
  const load = useCallback(async () => {
    const { data } = await supabase.from('booknest_sponsors').select('*').order('created_at', { ascending: false });
    setList((data as Sponsor[]) ?? []);
  }, []);
  useEffect(() => { void load(); }, [load]);
  async function create(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await supabase.from('booknest_sponsors').insert({
      title: form.title, body: form.body || null, cta: form.cta || 'Learn more', image_url: form.image_url || null, link_url: form.link_url,
      ends_at: new Date(Date.now() + form.weeks * 7 * 86400000).toISOString(),
    });
    if (error) { flash(error.message); return; }
    setForm(empty); flash('Sponsor is live'); void load();
  }
  async function toggle(s: Sponsor) { await supabase.from('booknest_sponsors').update({ active: !s.active }).eq('id', s.id); void load(); }
  async function remove(s: Sponsor) { if (!confirm(`Delete “${s.title}”?`)) return; await supabase.from('booknest_sponsors').delete().eq('id', s.id); void load(); }
  const live = (s: Sponsor) => s.active && new Date(s.ends_at) > new Date() && new Date(s.starts_at) <= new Date();
  return (
    <>
      <form className="card formGrid" onSubmit={create}>
        <div className="cardHead"><h3>New sponsored card</h3></div>
        <label>Headline<input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} maxLength={80} required /></label>
        <label>Message<input value={form.body} onChange={e => setForm({ ...form, body: e.target.value })} maxLength={200} /></label>
        <label>Button text<input value={form.cta} onChange={e => setForm({ ...form, cta: e.target.value })} maxLength={30} /></label>
        <label>Link (website or https://wa.me/…)<input value={form.link_url} onChange={e => setForm({ ...form, link_url: e.target.value })} required pattern="https?://.+" /></label>
        <label>Image URL (optional)<input value={form.image_url} onChange={e => setForm({ ...form, image_url: e.target.value })} /></label>
        <label>Run for (weeks)<input type="number" min={1} max={52} value={form.weeks} onChange={e => setForm({ ...form, weeks: Number(e.target.value) })} /></label>
        <button className="btn btnGold"><Plus size={15} /> Publish sponsor</button>
      </form>
      <section className="card">
        <div className="cardHead"><h3>Sponsors</h3></div>
        {list.length === 0 ? <p className="dim">No sponsors yet. When a business pays for a placement, add their card here.</p> : (
          <div className="tableWrap"><table className="adminTable"><thead><tr><th>Sponsor</th><th>Ends</th><th>Views</th><th>Clicks</th><th>Status</th><th /></tr></thead>
            <tbody>{list.map(s => <tr key={s.id}><td><b>{s.title}</b><small>{s.link_url}</small></td><td>{new Date(s.ends_at).toLocaleDateString()}</td><td>{s.impressions}</td><td>{s.clicks}</td>
              <td><span className={`status ${live(s) ? 'status-approved' : 'status-rejected'}`}>{live(s) ? 'Live' : s.active ? 'Ended' : 'Paused'}</span></td>
              <td><div className="row"><button className="btn btnGhost btnSmall" onClick={() => toggle(s)}>{s.active ? 'Pause' : 'Resume'}</button><button className="btn btnGhost btnSmall btnIcon" onClick={() => remove(s)}><Trash2 size={14} /></button></div></td></tr>)}</tbody></table></div>
        )}
      </section>
    </>
  );
}

function Catalogue({ flash }: { flash: (t: string) => void }) {
  const [books, setBooks] = useState<BookRow[]>([]);
  const [genres, setGenres] = useState<Genre[]>([]);
  const [filter, setFilter] = useState('');
  const [gid, setGid] = useState('');
  const [draft, setDraft] = useState<{ title: string; author: string; cover: string; description: string; genre_id: string; featured: boolean; year: string; deathYear: number | null; vibe: string; aud: string[] } | null>(null);
  const [looking, setLooking] = useState(false);
  const load = useCallback(async () => {
    const [{ data: b }, { data: g }] = await Promise.all([
      supabase.from('booknest_books').select('id,title,author,is_featured,gutenberg_id,genre_id').order('created_at', { ascending: false }).limit(1000),
      supabase.from('booknest_genres').select('id,name').order('name'),
    ]);
    setBooks((b as BookRow[]) ?? []); setGenres((g as Genre[]) ?? []);
  }, []);
  useEffect(() => { void load(); }, [load]);

  async function lookup(e: React.FormEvent) {
    e.preventDefault();
    const id = gid.replace(/\D/g, '');
    if (!id) return;
    setLooking(true);
    try {
      const r = await fetch(`/api/gutenberg?id=${id}`).then(x => x.json());
      setDraft({ title: r.title ?? '', author: r.author ?? '', cover: r.cover ?? '', description: r.summary ?? '', genre_id: genres[0]?.id ?? '', featured: false, year: '', deathYear: r.deathYear ?? null, vibe: '', aud: [] });
      if (!r.found) flash('Catalogue lookup timed out — fill in the title and author yourself.');
    } catch (err) { flash(msg(err)); }
    setLooking(false);
  }

  async function add() {
    if (!draft) return;
    const id = Number(gid.replace(/\D/g, ''));
    const { error } = await supabase.from('booknest_books').insert({
      gutenberg_id: id, title: draft.title.trim(), author: draft.author.trim(), cover_url: draft.cover || null,
      description: draft.description.trim().slice(0, 600) || null, genre_id: draft.genre_id || null, is_featured: draft.featured,
      publication_year: Number(draft.year) || null, vibe: draft.vibe.trim() || null, audience: draft.aud, source_name: 'Project Gutenberg', source_url: `https://www.gutenberg.org/ebooks/${id}`,
      read_url: `https://www.gutenberg.org/ebooks/${id}`, download_url: `https://www.gutenberg.org/ebooks/${id}`, language: 'English',
      license: 'Project Gutenberg item: verify Nigerian/local copyright status before redistribution',
    });
    if (error) { flash(error.message); return; }
    flash('Book added — it appears on the site within 5 minutes'); setDraft(null); setGid(''); void load();
  }
  async function feature(b: BookRow) { await supabase.from('booknest_books').update({ is_featured: !b.is_featured }).eq('id', b.id); void load(); }
  async function remove(b: BookRow) { if (!confirm(`Remove “${b.title}” from the catalogue?`)) return; const { error } = await supabase.from('booknest_books').delete().eq('id', b.id); if (error) flash(error.message); else void load(); }

  const nigeriaPD = draft?.deathYear ? draft.deathYear + 70 < new Date().getFullYear() : null;
  const shown = books.filter(b => !filter || (b.title + b.author).toLowerCase().includes(filter.toLowerCase()));
  return (
    <>
      <form className="card formGrid" onSubmit={lookup}>
        <div className="cardHead"><h3>Add a Project Gutenberg book</h3></div>
        <p className="dim small span">Find the book on gutenberg.org — the number in its link (e.g. gutenberg.org/ebooks/<b>1342</b>) is the ID.</p>
        <label>Gutenberg ID<input value={gid} onChange={e => setGid(e.target.value)} inputMode="numeric" required /></label>
        <button className="btn btnGhost" disabled={looking}>{looking ? <Loader2 size={15} className="spin" /> : null} Look up</button>
      </form>
      {draft && (
        <section className="card formGrid">
          <div className="cardHead"><h3>Check details</h3></div>
          {nigeriaPD === false && <p className="formError span">⚠ The author died less than 70 years ago — this book may still be under copyright in Nigeria.</p>}
          <label>Title<input value={draft.title} onChange={e => setDraft({ ...draft, title: e.target.value })} required /></label>
          <label>Author<input value={draft.author} onChange={e => setDraft({ ...draft, author: e.target.value })} required /></label>
          <label>Genre<select value={draft.genre_id} onChange={e => setDraft({ ...draft, genre_id: e.target.value })}>{genres.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}</select></label>
          <label>First published (year)<input value={draft.year} onChange={e => setDraft({ ...draft, year: e.target.value })} inputMode="numeric" /></label>
          <label className="span">Cover URL<input value={draft.cover} onChange={e => setDraft({ ...draft, cover: e.target.value })} /></label>
          <label className="span">Short description<textarea rows={3} value={draft.description} onChange={e => setDraft({ ...draft, description: e.target.value })} /></label>
          <label>Gen Z hook (optional, e.g. “Enemies to lovers 💘”)<input value={draft.vibe} maxLength={60} onChange={e => setDraft({ ...draft, vibe: e.target.value })} /></label>
          <div className="span row">{[['kids', 'Kids'], ['teens', 'Teens'], ['young-adult', 'Young adults'], ['grown-ups', 'Grown-ups']].map(([id, label]) => (
            <label key={id} className="check"><input type="checkbox" checked={draft.aud.includes(id)} onChange={e => setDraft({ ...draft, aud: e.target.checked ? [...draft.aud, id] : draft.aud.filter(x => x !== id) })} /> {label}</label>
          ))}</div>
          <label className="check"><input type="checkbox" checked={draft.featured} onChange={e => setDraft({ ...draft, featured: e.target.checked })} /> Feature on home page</label>
          <div className="row"><button className="btn btnGold" onClick={add} disabled={!draft.title || !draft.author}><Plus size={15} /> Add to catalogue</button><button className="btn btnGhost" onClick={() => setDraft(null)}>Cancel</button></div>
        </section>
      )}
      <section className="card">
        <div className="cardHead"><h3>Catalogue ({books.length})</h3><input className="miniSearch" placeholder="Filter…" value={filter} onChange={e => setFilter(e.target.value)} /></div>
        <div className="tableWrap"><table className="adminTable"><thead><tr><th>Title</th><th>Genre</th><th>Featured</th><th /></tr></thead>
          <tbody>{shown.slice(0, 300).map(b => <tr key={b.id}><td><Link href={`/book/${b.id}`}><b>{b.title}</b></Link><small>{b.author}{b.gutenberg_id ? ` · #${b.gutenberg_id}` : ''}</small></td>
            <td>{genres.find(g => g.id === b.genre_id)?.name ?? '—'}</td>
            <td><button className={`btn btnSmall btnIcon ${b.is_featured ? 'btnGold' : 'btnGhost'}`} onClick={() => feature(b)} aria-label="Toggle featured"><Star size={14} fill={b.is_featured ? 'currentColor' : 'none'} /></button></td>
            <td><button className="btn btnGhost btnSmall btnIcon" onClick={() => remove(b)} aria-label="Remove"><Trash2 size={14} /></button></td></tr>)}</tbody></table></div>
      </section>
    </>
  );
}

function Suggestions({ flash }: { flash: (t: string) => void }) {
  const [rows, setRows] = useState<Suggestion[]>([]);
  const [genres, setGenres] = useState<Genre[]>([]);
  const [genreFor, setGenreFor] = useState<Record<string, string>>({});
  const [coverFor, setCoverFor] = useState<Record<string, string>>({});
  const load = useCallback(async () => {
    const [{ data }, { data: g }] = await Promise.all([
      supabase.from('booknest_book_requests').select('id,title,author,source_url,reason,status,created_at').order('created_at', { ascending: false }),
      supabase.from('booknest_genres').select('id,name').order('name'),
    ]);
    setRows((data as Suggestion[]) ?? []); setGenres((g as Genre[]) ?? []);
  }, []);
  useEffect(() => { void load(); }, [load]);
  async function decide(id: string, status: 'approved' | 'rejected') {
    if (status === 'rejected') { await supabase.from('booknest_book_requests').update({ status }).eq('id', id); void load(); return; }
    if (!genreFor[id]) { flash('Choose a genre first.'); return; }
    const { error } = await supabase.rpc('approve_book_request', { request_id: id, selected_genre_id: genreFor[id], book_cover_url: coverFor[id] || null, mark_featured: false });
    if (error) flash(error.message); else { flash('Added to catalogue'); void load(); }
  }
  return (
    <section className="card">
      <div className="cardHead"><h3>Reader suggestions</h3></div>
      {rows.length === 0 ? <p className="dim">No suggestions yet.</p> : rows.map(r => (
        <div key={r.id} className="suggestRow">
          <div><b>{r.title}</b><small>{r.author || 'Unknown author'} · <span className={`status status-${r.status}`}>{r.status}</span></small>{r.reason && <p>{r.reason}</p>}{r.source_url && <a href={r.source_url} target="_blank" rel="noreferrer">Source</a>}</div>
          {r.status === 'pending' && <div className="row">
            <select value={genreFor[r.id] ?? ''} onChange={e => setGenreFor(v => ({ ...v, [r.id]: e.target.value }))}><option value="">Genre…</option>{genres.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}</select>
            <input placeholder="Cover URL" value={coverFor[r.id] ?? ''} onChange={e => setCoverFor(v => ({ ...v, [r.id]: e.target.value }))} />
            <button className="btn btnGold btnSmall" onClick={() => decide(r.id, 'approved')}><Check size={14} /> Add</button>
            <button className="btn btnGhost btnSmall" onClick={() => decide(r.id, 'rejected')}><X size={14} /></button>
          </div>}
        </div>
      ))}
    </section>
  );
}

function Settings({ flash }: { flash: (t: string) => void }) {
  const [b, setB] = useState<BillingRow | null>(null);
  useEffect(() => {
    supabase.rpc('booknest_public_billing').then(({ data }) => setB((Array.isArray(data) ? data[0] : data) as BillingRow));
  }, []);
  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!b) return;
    const { error } = await supabase.rpc('booknest_admin_update_billing', {
      p_plus_monthly: b.plus_monthly_ngn, p_plus_yearly: b.plus_yearly_ngn, p_sponsor_weekly: b.sponsor_weekly_ngn, p_enabled: b.payment_enabled,
      p_bank: b.bank_name ?? '', p_account_name: b.account_name ?? '', p_account_number: b.account_number ?? '', p_support_email: b.support_email ?? '',
    });
    flash(error ? error.message : 'Settings saved');
  }
  if (!b) return <p className="dim">Loading…</p>;
  const num = (k: keyof BillingRow) => (e: React.ChangeEvent<HTMLInputElement>) => setB({ ...b, [k]: Number(e.target.value.replace(/\D/g, '')) });
  const txt = (k: keyof BillingRow) => (e: React.ChangeEvent<HTMLInputElement>) => setB({ ...b, [k]: e.target.value });
  return (
    <form className="card formGrid" onSubmit={save}>
      <div className="cardHead"><h3>Prices &amp; payout account</h3></div>
      <label>Plus monthly (₦)<input value={b.plus_monthly_ngn} onChange={num('plus_monthly_ngn')} inputMode="numeric" /></label>
      <label>Plus yearly (₦)<input value={b.plus_yearly_ngn} onChange={num('plus_yearly_ngn')} inputMode="numeric" /></label>
      <label>Sponsor per week (₦)<input value={b.sponsor_weekly_ngn} onChange={num('sponsor_weekly_ngn')} inputMode="numeric" /></label>
      <label>Bank<input value={b.bank_name ?? ''} onChange={txt('bank_name')} /></label>
      <label>Account name<input value={b.account_name ?? ''} onChange={txt('account_name')} /></label>
      <label>Account number<input value={b.account_number ?? ''} onChange={txt('account_number')} inputMode="numeric" /></label>
      <label>Support email<input value={b.support_email ?? ''} onChange={txt('support_email')} /></label>
      <label className="check"><input type="checkbox" checked={b.payment_enabled} onChange={e => setB({ ...b, payment_enabled: e.target.checked })} /> Accept payments</label>
      <button className="btn btnGold">Save settings</button>
    </form>
  );
}

type PendingBook = { id: string; title: string; description: string | null; language: string; genre: string; access: string; price_ngn: number; status: string; cover_url: string | null; mature: boolean; updated_at: string; author_id: string; booknest_authors: { pen_name: string } | null };
type WriterRow = { user_id: string; pen_name: string; email: string; phone: string | null; payout_bank: string | null; payout_account_name: string | null; payout_account_number: string | null; status: string; books: number; published: number; readers: number; plus_reads_30d: number; unpaid: number; earned: number };

function Writers({ flash }: { flash: (t: string) => void }) {
  const [books, setBooks] = useState<PendingBook[]>([]);
  const [writers, setWriters] = useState<WriterRow[]>([]);
  const [preview, setPreview] = useState<{ book: PendingBook; chapters: { position: number; title: string; content: string; word_count: number }[] } | null>(null);
  const [note, setNote] = useState('');
  const [pool, setPool] = useState<Record<string, string>>({});
  const [showLive, setShowLive] = useState(false);

  const load = useCallback(async () => {
    const q = supabase.from('booknest_author_books').select('id,title,description,language,genre,access,price_ngn,status,cover_url,mature,updated_at,author_id,booknest_authors(pen_name)').order('updated_at', { ascending: false }).limit(100);
    const [{ data: b }, { data: w }] = await Promise.all([showLive ? q.neq('status', 'draft') : q.eq('status', 'pending'), supabase.rpc('booknest_admin_author_overview')]);
    setBooks((b as unknown as PendingBook[]) ?? []);
    setWriters((w as WriterRow[]) ?? []);
  }, [showLive]);
  useEffect(() => { void load(); }, [load]);

  async function open(book: PendingBook) {
    const { data } = await supabase.from('booknest_author_chapters').select('position,title,content,word_count').eq('book_id', book.id).order('position');
    setNote(''); setPreview({ book, chapters: (data as { position: number; title: string; content: string; word_count: number }[]) ?? [] });
  }
  async function decide(id: string, decision: 'published' | 'rejected' | 'draft') {
    if (decision === 'rejected' && !note.trim()) { flash('Add a note telling the writer what to fix.'); return; }
    const { error } = await supabase.rpc('booknest_admin_review_book', { p_book: id, p_decision: decision, p_note: note });
    if (error) { flash(msg(error)); return; }
    flash(decision === 'published' ? 'Book is live' : decision === 'rejected' ? 'Sent back to the writer' : 'Unpublished');
    setPreview(null); void load();
  }
  async function addPool(w: WriterRow) {
    const amount = Number(pool[w.user_id] || 0);
    if (!amount) return;
    const { error } = await supabase.rpc('booknest_admin_add_earning', { p_author: w.user_id, p_amount: amount, p_note: `Plus pool ${new Date().toLocaleDateString('en-NG', { month: 'long', year: 'numeric' })}` });
    if (error) { flash(msg(error)); return; }
    setPool({ ...pool, [w.user_id]: '' }); flash('Earning added'); void load();
  }
  async function markPaid(w: WriterRow) {
    if (!confirm(`Confirm you have sent ${naira(w.unpaid)} to ${w.pen_name} (${w.payout_bank ?? '?'} ${w.payout_account_number ?? ''})?`)) return;
    const { data, error } = await supabase.rpc('booknest_admin_mark_paid', { p_author: w.user_id });
    if (error) { flash(msg(error)); return; }
    flash(`Marked ${naira(Number(data) || 0)} as paid`); void load();
  }
  async function setStatus(w: WriterRow) {
    const next = w.status === 'active' ? 'suspended' : 'active';
    if (next === 'suspended' && !confirm(`Suspend ${w.pen_name}? Their live books will be hidden.`)) return;
    const { error } = await supabase.rpc('booknest_admin_set_author_status', { p_author: w.user_id, p_status: next });
    if (error) flash(msg(error)); else void load();
  }

  const plusReads = writers.reduce((a, w) => a + Number(w.plus_reads_30d), 0);

  return (
    <>
      <section className="card">
        <div className="cardHead"><h3>{showLive ? 'All submitted books' : 'Books waiting for review'}</h3>
          <div className="row"><button className="btn btnGhost btnSmall" onClick={() => setShowLive(!showLive)}>{showLive ? 'Show waiting only' : 'Show all'}</button><button className="btn btnGhost btnSmall" onClick={() => load()}><RefreshCw size={14} /></button></div></div>
        <p className="dim small">Read the first chapters before publishing. Check that it is original, readable and in the language chosen. Reject with a clear note when changes are needed.</p>
        {books.length === 0 ? <p className="dim">Nothing waiting. 🎉</p> : (
          <div className="tableWrap"><table className="adminTable"><thead><tr><th>Book</th><th>Writer</th><th>Lang</th><th>Access</th><th>Status</th><th /></tr></thead>
            <tbody>{books.map(b => <tr key={b.id} className={b.status === 'pending' ? 'rowHot' : ''}><td><b>{b.title}</b>{b.mature && <small>18+</small>}</td><td>{b.booknest_authors?.pen_name}</td><td>{b.language}</td>
              <td>{b.access === 'paid' ? naira(b.price_ngn) : b.access}</td><td><span className={`status status-${b.status === 'published' ? 'approved' : b.status}`}>{b.status}</span></td>
              <td><button className="btn btnGhost btnSmall" onClick={() => open(b)}>Review</button></td></tr>)}</tbody></table></div>
        )}
      </section>

      {preview && (
        <div className="modalBack" onClick={() => setPreview(null)}>
          <div className="modal modalWide" onClick={e => e.stopPropagation()}>
            <button className="modalClose" onClick={() => setPreview(null)} aria-label="Close">×</button>
            <h3>{preview.book.title}</h3>
            <p className="dim small">by {preview.book.booknest_authors?.pen_name} · {preview.book.language} · {preview.book.genre} · {preview.chapters.length} chapters · {preview.chapters.reduce((a, c) => a + c.word_count, 0).toLocaleString()} words</p>
            {preview.book.description && <p>{preview.book.description}</p>}
            <div className="reviewChapters">
              {preview.chapters.slice(0, 3).map(c => <details key={c.position} open={c.position === 1}><summary>{c.position}. {c.title} <small>({c.word_count} words)</small></summary><div className="reviewText">{c.content.slice(0, 6000)}{c.content.length > 6000 ? '…' : ''}</div></details>)}
            </div>
            <label className="dim small">Note to writer (required to reject)<textarea rows={2} value={note} onChange={e => setNote(e.target.value)} maxLength={500} /></label>
            <div className="row">
              {preview.book.status !== 'published' && <button className="btn btnGold" onClick={() => decide(preview.book.id, 'published')}><Check size={15} /> Publish</button>}
              {preview.book.status !== 'rejected' && <button className="btn btnGhost" onClick={() => decide(preview.book.id, 'rejected')}><X size={15} /> Needs changes</button>}
              {preview.book.status === 'published' && <button className="btn btnGhost" onClick={() => decide(preview.book.id, 'draft')}>Unpublish</button>}
            </div>
          </div>
        </div>
      )}

      <section className="card">
        <div className="cardHead"><h3>Writers & payouts</h3><span className="dim small">{writers.length} writers · {plusReads} Plus chapter reads in 30 days</span></div>
        <p className="dim small">Sales earnings are added automatically when you approve a book payment. Each month, decide how much Plus income to share and split it by Plus reads, then add each writer&apos;s share below. Pay them by bank transfer, then tap “Mark paid”.</p>
        {writers.length === 0 ? <p className="dim">No writers yet. Share the /write page to invite them.</p> : (
          <div className="tableWrap"><table className="adminTable"><thead><tr><th>Writer</th><th>Books</th><th>Plus reads (30d)</th><th>To pay</th><th>Bank</th><th>Add Plus share</th><th /></tr></thead>
            <tbody>{writers.map(w => <tr key={w.user_id}>
              <td><b>{w.pen_name}</b><small>{w.email}{w.phone ? ` · ${w.phone}` : ''}</small>{w.status !== 'active' && <small className="dangerText">Suspended</small>}</td>
              <td>{w.published}/{w.books}<small>{w.readers} readers</small></td>
              <td>{w.plus_reads_30d}{plusReads > 0 && <small>{Math.round((Number(w.plus_reads_30d) / plusReads) * 100)}% of pool</small>}</td>
              <td><b>{naira(Number(w.unpaid))}</b><small>{naira(Number(w.earned))} all-time</small></td>
              <td>{w.payout_bank ?? '—'}<small className="mono">{w.payout_account_number ?? ''} {w.payout_account_name ?? ''}</small></td>
              <td><div className="row"><input className="miniInput" inputMode="numeric" placeholder="₦" value={pool[w.user_id] ?? ''} onChange={e => setPool({ ...pool, [w.user_id]: e.target.value.replace(/\D/g, '') })} /><button className="btn btnGhost btnSmall" onClick={() => addPool(w)}><Plus size={14} /></button></div></td>
              <td><div className="row">{Number(w.unpaid) > 0 && <button className="btn btnGold btnSmall" onClick={() => markPaid(w)}>Mark paid</button>}<button className="btn btnGhost btnSmall" onClick={() => setStatus(w)}>{w.status === 'active' ? 'Suspend' : 'Restore'}</button></div></td>
            </tr>)}</tbody></table></div>
        )}
      </section>
    </>
  );
}
