'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Check, Copy, Loader2, ShieldCheck } from 'lucide-react';
import { supabase } from '../../lib/supabase-browser';
import { fetchBilling, useAccount, type Billing } from '../../lib/account';
import { naira } from '../../lib/format';

type Kind = 'plus' | 'tip' | 'sponsor' | 'book';

export default function Checkout({ kind, period = 'monthly', amount: fixedAmount, onDone, presetNote = '', bookId }: {
  kind: Kind; period?: 'monthly' | 'yearly'; amount?: number; onDone?: () => void; presetNote?: string; bookId?: string;
}) {
  const { user, ready } = useAccount();
  const [billing, setBilling] = useState<Billing | null>(null);
  const [amount, setAmount] = useState<number>(fixedAmount ?? 0);
  const [reference, setReference] = useState('');
  const [payer, setPayer] = useState('');
  const [note, setNote] = useState(presetNote);
  const [copied, setCopied] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  useEffect(() => { fetchBilling().then(setBilling); }, []);
  useEffect(() => { if (fixedAmount) setAmount(fixedAmount); }, [fixedAmount]);
  useEffect(() => { setNote(presetNote); }, [presetNote]);

  async function copy(value: string, label: string) {
    try { await navigator.clipboard.writeText(value); setCopied(label); window.setTimeout(() => setCopied(''), 1600); } catch {}
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setError('');
    if (!Number.isInteger(amount) || amount < 100) { setError('Enter the amount you sent (at least ₦100).'); return; }
    if (reference.trim().length < 3) { setError('Enter the transfer reference or session ID from your receipt.'); return; }
    setBusy(true);
    const { error: err } = await supabase.from('booknest_payment_requests').insert({
      user_id: user.id, kind, billing_period: kind === 'plus' ? period : null, amount,
      payment_reference: reference.trim(), payer_name: payer.trim() || null, note: note.trim() || null,
      ...(kind === 'book' && bookId ? { book_id: bookId } : {}),
    });
    setBusy(false);
    if (err) { setError(err.message.replace(/^.*?:\s*/, '') || 'Could not submit. Please try again.'); return; }
    setSent(true);
    onDone?.();
  }

  if (!ready || !billing) return <div className="checkout"><Loader2 className="spin" size={20} /> Loading payment details…</div>;

  if (!user) {
    return (
      <div className="checkout">
        <p>Create a free account (or sign in) first, so we can attach your payment to your profile.</p>
        <Link className="btn btnGold" href={`/login?next=${encodeURIComponent(typeof window !== 'undefined' ? window.location.pathname : '/premium')}`}>Sign in to continue</Link>
      </div>
    );
  }

  if (!billing.payment_enabled || !billing.account_number) {
    return <div className="checkout"><p>Payments are being set up. Please check back shortly.</p></div>;
  }

  if (sent) {
    return (
      <div className="checkout checkoutDone">
        <div className="checkIcon"><Check size={26} /></div>
        <h3>Thank you! Payment submitted.</h3>
        <p>{kind === 'plus' ? 'We will confirm your transfer and switch on Plus — usually within a few hours.' : kind === 'book' ? 'We will confirm your transfer and unlock every chapter — usually within a few hours.' : kind === 'sponsor' ? 'We will confirm your transfer and contact you by email to set up your placement.' : 'Your support keeps M King Reads growing. We will confirm the transfer shortly.'}</p>
        <Link className="btn btnGhost" href="/profile">View in my account</Link>
      </div>
    );
  }

  return (
    <form className="checkout" onSubmit={submit}>
      <div className="checkoutStep"><span>1</span><div>
        <strong>Transfer {fixedAmount ? naira(fixedAmount) : 'your amount'} to</strong>
        <div className="bankCard">
          <div><small>Bank</small><b>{billing.bank_name}</b></div>
          <div><small>Account number</small><b className="mono">{billing.account_number}</b>
            <button type="button" onClick={() => copy(billing.account_number!, 'acct')} className="copyBtn">{copied === 'acct' ? <Check size={14} /> : <Copy size={14} />}{copied === 'acct' ? 'Copied' : 'Copy'}</button></div>
          <div><small>Account name</small><b>{billing.account_name}</b></div>
          {fixedAmount ? <div><small>Amount</small><b>{naira(fixedAmount)}</b>
            <button type="button" onClick={() => copy(String(fixedAmount), 'amt')} className="copyBtn">{copied === 'amt' ? <Check size={14} /> : <Copy size={14} />}{copied === 'amt' ? 'Copied' : 'Copy'}</button></div> : null}
        </div>
      </div></div>
      <div className="checkoutStep"><span>2</span><div>
        <strong>Tell us about the transfer</strong>
        {!fixedAmount && <label>Amount sent (₦)<input inputMode="numeric" value={amount || ''} onChange={e => setAmount(Number(e.target.value.replace(/\D/g, '')))} placeholder="e.g. 2000" /></label>}
        <label>Transfer reference / session ID<input value={reference} onChange={e => setReference(e.target.value)} placeholder="From your bank receipt" required /></label>
        <label>Name on the sending account <em>(optional)</em><input value={payer} onChange={e => setPayer(e.target.value)} placeholder="Helps us match your payment" /></label>
        {kind !== 'plus' && kind !== 'book' && <label>{kind === 'sponsor' ? 'Your business, link and what to promote' : 'Message (optional)'}<textarea value={note} onChange={e => setNote(e.target.value)} rows={3} maxLength={1000} required={kind === 'sponsor'} /></label>}
      </div></div>
      {error && <p className="formError">{error}</p>}
      <button className="btn btnGold btnBlock" disabled={busy}>{busy ? <><Loader2 size={17} className="spin" /> Submitting…</> : 'I have sent the money'}</button>
      <p className="checkoutSafe"><ShieldCheck size={14} /> Only send to the account above. We never ask for your card PIN or OTP.</p>
    </form>
  );
}
