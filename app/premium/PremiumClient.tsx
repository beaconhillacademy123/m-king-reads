'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Check, Crown, Headphones, CloudDownload, Palette, BarChart3, Ban, HeartHandshake, X } from 'lucide-react';
import Checkout from '../components/Checkout';
import Footer from '../components/Footer';
import { DEFAULT_BILLING, fetchBilling, useAccount, type Billing } from '../../lib/account';
import { naira } from '../../lib/format';

const ICONS = [Ban, CloudDownload, Headphones, Palette, BarChart3, HeartHandshake];
const FEATURES = [
  ['No ads, ever', 'A calm, distraction-free library and reader.'],
  ['Unlimited offline books', 'Download any book and read with zero data.'],
  ['Unlimited Read-Aloud', 'Listen to any chapter, at your own speed.'],
  ['Premium themes & fonts', 'Paper, Night and Midnight themes; Classic and Easy-read fonts.'],
  ['Reading stats & goals', '30-day reading history, streaks and daily goals.'],
  ['Fund African reading', 'Your plan helps us add local books and writers.'],
];
const COMPARE: [string, boolean | string, boolean | string][] = [
  ['Read every book in the library', true, true],
  ['Save books & sync progress', true, true],
  ['Offline downloads', '1 book', 'Unlimited'],
  ['Read-Aloud', 'Preview', 'Unlimited'],
  ['Premium themes & fonts', false, true],
  ['Reading stats history', '7 days', '30 days + goals'],
  ['Ads', 'Yes', 'None'],
];

export default function PremiumClient() {
  const { plus, sub, ready } = useAccount();
  const [billing, setBilling] = useState<Billing>(DEFAULT_BILLING);
  const [period, setPeriod] = useState<'monthly' | 'yearly'>('yearly');
  const [open, setOpen] = useState(false);
  useEffect(() => { fetchBilling().then(setBilling); }, []);

  const price = period === 'yearly' ? billing.plus_yearly_ngn : billing.plus_monthly_ngn;
  const saving = Math.max(0, Math.round(100 - (billing.plus_yearly_ngn / (billing.plus_monthly_ngn * 12)) * 100));

  return (
    <main className="page premium">
      <section className="premiumHero">
        <Crown size={34} className="gold" />
        <span className="kicker">M KING READS PLUS</span>
        <h1>The royal reading experience.</h1>
        <p>Everything in M King Reads stays free. Plus makes it ad-free, offline and hands-free — for less than a bottle of Coke a week.</p>
        {ready && plus && sub?.expires_at && <div className="plusActive"><Check size={16} /> You&apos;re a Plus member until {new Date(sub.expires_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'long', year: 'numeric' })}. Renew early and the time is added on.</div>}
      </section>

      <div className="periodToggle" role="tablist">
        <button role="tab" aria-selected={period === 'monthly'} className={period === 'monthly' ? 'on' : ''} onClick={() => setPeriod('monthly')}>Monthly</button>
        <button role="tab" aria-selected={period === 'yearly'} className={period === 'yearly' ? 'on' : ''} onClick={() => setPeriod('yearly')}>Yearly {saving > 0 && <em>Save {saving}%</em>}</button>
      </div>

      <section className="plans">
        <div className="plan">
          <h3>Free</h3>
          <p className="planPrice">₦0</p>
          <p className="dim">Read, save and track — forever.</p>
          <Link href="/explore" className="btn btnGhost btnBlock">Keep reading free</Link>
        </div>
        <div className="plan planPlus">
          <span className="planBadge">Most popular</span>
          <h3><Crown size={18} /> Plus</h3>
          <p className="planPrice">{naira(price)}<small>/{period === 'yearly' ? 'year' : 'month'}</small></p>
          <p className="dim">{period === 'yearly' ? `Just ${naira(price / 12)} a month, billed once.` : 'Cancel anytime — it simply expires.'}</p>
          <button className="btn btnGold btnBlock btnLg" onClick={() => setOpen(true)}>{plus ? 'Renew / extend Plus' : 'Get Plus'}</button>
          <ul>{FEATURES.slice(0, 4).map(([t]) => <li key={t}><Check size={15} /> {t}</li>)}</ul>
        </div>
      </section>

      <section className="featureGrid">
        {FEATURES.map(([t, d], i) => { const Icon = ICONS[i]; return <div key={t} className="feature"><Icon size={22} /><strong>{t}</strong><p>{d}</p></div>; })}
      </section>

      <section className="compare">
        <h2>Free vs Plus</h2>
        <table>
          <thead><tr><th /><th>Free</th><th>Plus</th></tr></thead>
          <tbody>{COMPARE.map(([f, a, b]) => <tr key={f}><td>{f}</td>{[a, b].map((v, i) => <td key={i}>{v === true ? <Check size={16} className="ok" /> : v === false ? <X size={16} className="dim" /> : v}</td>)}</tr>)}</tbody>
        </table>
      </section>

      <section className="faq">
        <h2>Questions</h2>
        <details><summary>How do I pay?</summary><p>By bank transfer from any Nigerian bank or wallet app (Opay, Moniepoint, PalmPay, GTBank and others). After you transfer, enter the reference and we confirm it — usually within a few hours.</p></details>
        <details><summary>Does it renew automatically?</summary><p>No. Plus simply expires at the end of your period. We never take money without you sending it.</p></details>
        <details><summary>What if I renew early?</summary><p>The new time is added to the end of your current plan — you never lose days.</p></details>
        <details><summary>Can I use Plus on several phones?</summary><p>Yes. Sign in with the same account on any device.</p></details>
      </section>

      <p className="center"><Link href="/support">Prefer to make a one-off contribution? Support the project →</Link></p>

      {open && (
        <div className="modalBack" onClick={() => setOpen(false)}>
          <div className="modal modalWide" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Get Plus">
            <button className="modalClose" onClick={() => setOpen(false)} aria-label="Close"><X size={18} /></button>
            <h3><Crown size={20} className="gold" /> Plus · {period === 'yearly' ? 'Yearly' : 'Monthly'} · {naira(price)}</h3>
            <Checkout kind="plus" period={period} amount={price} />
          </div>
        </div>
      )}
      <Footer />
    </main>
  );
}
