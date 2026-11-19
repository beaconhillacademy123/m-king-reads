'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { BookOpen, Coins, Crown, Feather, Loader2, PenLine, Plus, Sparkles, Users } from 'lucide-react';
import { supabase } from '../../lib/supabase-browser';
import { fetchBilling, useAccount } from '../../lib/account';
import { naira } from '../../lib/format';
import { genreName, langName, type Novel } from '../../lib/novels';

type Author = { user_id: string; pen_name: string; bio: string | null; phone: string | null; payout_bank: string | null; payout_account_name: string | null; payout_account_number: string | null; status: string };
type Stats = { books: number; published: number; readers: number; plus_reads_30d: number; sales: number; earned: number; unpaid: number };

const STATUS_LABEL: Record<string, string> = { draft: 'Draft', pending: 'In review', published: 'Live', rejected: 'Needs changes' };

export default function WriterStudio() {
  const { user, ready } = useAccount();
  const router = useRouter();
  const [author, setAuthor] = useState<Author | null | undefined>(undefined);
  const [books, setBooks] = useState<Novel[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [share, setShare] = useState(60);
  const [editing, setEditing] = useState(false);
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase.rpc('booknest_my_author');
    const me = (Array.isArray(data) ? data[0] : data) as Author | undefined;
    setAuthor(me ?? null);
    if (me) {
      const [{ data: b }, { data: s }] = await Promise.all([
        supabase.from('booknest_author_books').select('*').eq('author_id', user.id).order('updated_at', { ascending: false }),
        supabase.rpc('booknest_author_stats'),
      ]);
      setBooks((b as Novel[]) ?? []);
      setStats(s as Stats);
    }
  }, [user]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { fetchBilling().then(b => setShare(b.author_share_pct ?? 60)); }, []);

  async function newBook() {
    if (!user) return;
    setCreating(true);
    const { data, error } = await supabase.from('booknest_author_books')
      .insert({ author_id: user.id, title: 'Untitled novel', language: 'yo', genre: 'drama', access: 'plus' })
      .select('id').single();
    setCreating(false);
    if (!error && data) router.push(`/write/book/${data.id}`);
  }

  if (!ready || (user && author === undefined)) {
    return <main className="page"><div className="center pad"><Loader2 className="spin" /></div></main>;
  }

  if (!user || !author || editing) {
    return (
      <main className="page writePage">
        <section className="writeHero">
          <span className="kicker"><Feather size={14} /> WRITER STUDIO</span>
          <h1>Your story, in your language.</h1>
          <p>Publish novels in Yorùbá, Hausa, Igbo, Pidgin or English. Readers anywhere can find you, and you earn from every sale.</p>
          <div className="writePerks">
            <div><BookOpen size={20} /><strong>Write chapter by chapter</strong><span>Release as you go. Readers follow along.</span></div>
            <div><Coins size={20} /><strong>Keep {share}% of every sale</strong><span>Paid to your Nigerian bank account.</span></div>
            <div><Crown size={20} /><strong>Plus reader bonus</strong><span>A share of Plus income, based on chapters read.</span></div>
            <div><Sparkles size={20} /><strong>Edited, not filtered</strong><span>An editor checks each book before it goes live.</span></div>
          </div>
        </section>
        {!user ? (
          <section className="card center">
            <h3>Create a free account to start writing</h3>
            <div className="row center"><Link className="btn btnGold" href="/login?mode=signup&next=/write">Sign up</Link><Link className="btn btnGhost" href="/login?next=/write">Sign in</Link></div>
          </section>
        ) : (
          <AuthorForm userId={user.id} existing={author ?? null} onSaved={() => { setEditing(false); load(); }} onCancel={author ? () => setEditing(false) : undefined} />
        )}
      </main>
    );
  }

  return (
    <main className="page writePage">
      <div className="pageHead">
        <div>
          <span className="kicker"><Feather size={14} /> WRITER STUDIO</span>
          <h1>Welcome, {author.pen_name}</h1>
          {author.status === 'suspended' && <p className="formError">Your writer account is paused. Contact support for help.</p>}
        </div>
        <div className="row">
          <button className="btn btnGhost btnSmall" onClick={() => setEditing(true)}><PenLine size={15} /> Profile & payouts</button>
          <button className="btn btnGold" onClick={newBook} disabled={creating || author.status !== 'active'}>{creating ? <Loader2 className="spin" size={16} /> : <Plus size={16} />} New novel</button>
        </div>
      </div>

      {stats && (
        <div className="statRow writeStats">
          <div className="stat"><strong>{stats.published}</strong><span>Live books</span></div>
          <div className="stat"><strong><Users size={16} /> {stats.readers}</strong><span>Readers</span></div>
          <div className="stat"><strong>{stats.sales}</strong><span>Sales</span></div>
          <div className="stat"><strong>{stats.plus_reads_30d}</strong><span>Plus reads (30 days)</span></div>
          <div className="stat"><strong className="gold">{naira(stats.unpaid)}</strong><span>To be paid</span></div>
          <div className="stat"><strong>{naira(stats.earned)}</strong><span>Earned all-time</span></div>
        </div>
      )}

      <section className="card">
        <div className="cardHead"><h3>My novels</h3><span className="dim small">{books.length} total</span></div>
        {books.length === 0 ? (
          <div className="emptyState"><Feather size={28} /><p>No novels yet. Start your first one. You can save drafts and come back any time.</p>
            <button className="btn btnGold" onClick={newBook} disabled={creating}>Start writing</button></div>
        ) : (
          <div className="writeBooks">
            {books.map(b => (
              <Link key={b.id} href={`/write/book/${b.id}`} className="writeBook">
                <div className="writeBookCover">{b.cover_url ? <img src={b.cover_url} alt="" /> : <span>{b.title.slice(0, 1)}</span>}</div>
                <div className="writeBookText">
                  <strong>{b.title}</strong>
                  <span className="dim small">{langName(b.language)} · {genreName(b.genre)} · {b.access === 'paid' ? naira(b.price_ngn) : b.access === 'plus' ? 'Plus' : 'Free'}</span>
                  <span className="dim small">{b.reads} readers</span>
                </div>
                <span className={`statusTag st-${b.status}`}>{STATUS_LABEL[b.status]}</span>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="card fine">
        <h3>How you get paid</h3>
        <ul>
          <li><b>Book sales:</b> you keep {share}% of the price of every copy sold.</li>
          <li><b>Plus readers:</b> each month, part of Plus income is shared among writers based on chapters read by Plus members.</li>
          <li>Payouts go to the bank account in your profile, once a month, when you have at least ₦1,000 waiting.</li>
          <li>Only publish work you wrote yourself, or have the rights to. Copied books will be removed.</li>
        </ul>
      </section>
    </main>
  );
}

function AuthorForm({ userId, existing, onSaved, onCancel }: { userId: string; existing: Author | null; onSaved: () => void; onCancel?: () => void }) {
  const [penName, setPenName] = useState(existing?.pen_name ?? '');
  const [bio, setBio] = useState(existing?.bio ?? '');
  const [phone, setPhone] = useState(existing?.phone ?? '');
  const [bank, setBank] = useState(existing?.payout_bank ?? '');
  const [acctName, setAcctName] = useState(existing?.payout_account_name ?? '');
  const [acctNo, setAcctNo] = useState(existing?.payout_account_number ?? '');
  const [agree, setAgree] = useState(!!existing);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (penName.trim().length < 2) return setError('Choose a pen name (at least 2 letters).');
    if (acctNo && !/^\d{10}$/.test(acctNo)) return setError('Account number must be 10 digits.');
    if (!agree) return setError('Please accept the writer terms.');
    setBusy(true);
    const row = {
      user_id: userId, pen_name: penName.trim(), bio: bio.trim() || null, phone: phone.trim() || null,
      payout_bank: bank.trim() || null, payout_account_name: acctName.trim() || null, payout_account_number: acctNo || null,
    };
    const { error: err } = existing
      ? await supabase.from('booknest_authors').update(row).eq('user_id', userId)
      : await supabase.from('booknest_authors').insert(row);
    setBusy(false);
    if (err) return setError(err.message.includes('pen_name') || err.code === '23505' ? 'That pen name is taken. Try another.' : 'Could not save. Please check your details.');
    onSaved();
  }

  return (
    <form className="card writeForm" onSubmit={save}>
      <h3>{existing ? 'Profile & payouts' : 'Become a writer'}</h3>
      <label>Pen name<input value={penName} onChange={e => setPenName(e.target.value)} maxLength={60} placeholder="The name readers will see" required /></label>
      <label>Short bio <em>(optional)</em><textarea value={bio} onChange={e => setBio(e.target.value)} rows={3} maxLength={600} placeholder="Where you are from, what you write about" /></label>
      <label>Phone / WhatsApp <em>(private)</em><input value={phone} onChange={e => setPhone(e.target.value)} maxLength={30} inputMode="tel" /></label>
      <p className="dim small">Payout details are private. Only you and the M King Reads team can see them. You can add them later.</p>
      <label>Bank<input value={bank} onChange={e => setBank(e.target.value)} maxLength={80} placeholder="e.g. Opay, GTBank, Access" /></label>
      <label>Account name<input value={acctName} onChange={e => setAcctName(e.target.value)} maxLength={120} /></label>
      <label>Account number<input value={acctNo} onChange={e => setAcctNo(e.target.value.replace(/\D/g, '').slice(0, 10))} inputMode="numeric" placeholder="10 digits" /></label>
      {!existing && (
        <label className="checkLine"><input type="checkbox" checked={agree} onChange={e => setAgree(e.target.checked)} />
          <span>I will only publish work I wrote or have the rights to. I understand an editor reviews each book before it goes live.</span></label>
      )}
      {error && <p className="formError">{error}</p>}
      <div className="row">
        <button className="btn btnGold" disabled={busy}>{busy ? <Loader2 className="spin" size={16} /> : null} {existing ? 'Save' : 'Create my writer account'}</button>
        {onCancel && <button type="button" className="btn btnGhost" onClick={onCancel}>Cancel</button>}
      </div>
    </form>
  );
}
