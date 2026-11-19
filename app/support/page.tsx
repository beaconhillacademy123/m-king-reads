'use client';

import { useState } from 'react';
import { HeartHandshake } from 'lucide-react';
import Checkout from '../components/Checkout';
import Footer from '../components/Footer';
import { naira } from '../../lib/format';

const AMOUNTS = [500, 1000, 2000, 5000, 10000];

export default function SupportPage() {
  const [amount, setAmount] = useState(1000);
  const [custom, setCustom] = useState(false);
  return (
    <main className="page narrow">
      <div className="pageHead center">
        <HeartHandshake size={34} className="gold" />
        <span className="kicker">SUPPORT M KING READS</span>
        <h1>Keep free books free.</h1>
        <p>Every contribution pays for hosting, new books and our African literature collection. Thank you for being part of it.</p>
      </div>
      <div className="amountPick">
        {AMOUNTS.map(a => <button key={a} className={!custom && amount === a ? 'on' : ''} onClick={() => { setCustom(false); setAmount(a); }}>{naira(a)}</button>)}
        <button className={custom ? 'on' : ''} onClick={() => setCustom(true)}>Other</button>
      </div>
      <div className="card"><Checkout kind="tip" amount={custom ? undefined : amount} /></div>
      <Footer />
    </main>
  );
}
