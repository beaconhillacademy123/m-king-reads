'use client';

import { useEffect, useState } from 'react';
import { BarChart3, Megaphone, Target, Users } from 'lucide-react';
import Checkout from '../components/Checkout';
import Footer from '../components/Footer';
import { DEFAULT_BILLING, fetchBilling, type Billing } from '../../lib/account';
import { naira } from '../../lib/format';

export default function AdvertisePage() {
  const [billing, setBilling] = useState<Billing>(DEFAULT_BILLING);
  const [weeks, setWeeks] = useState(1);
  useEffect(() => { fetchBilling().then(setBilling); }, []);
  const total = billing.sponsor_weekly_ngn * weeks;
  return (
    <main className="page narrow">
      <div className="pageHead center">
        <Megaphone size={34} className="gold" />
        <span className="kicker">ADVERTISE WITH M KING READS</span>
        <h1>Put your brand in front of readers.</h1>
        <p>Students, professionals and families read on M King Reads every day. Sponsored cards appear on the home page, book pages and between chapters.</p>
      </div>
      <section className="featureGrid three">
        <div className="feature"><Users size={22} /><strong>Engaged audience</strong><p>Readers spend long, focused sessions in the app.</p></div>
        <div className="feature"><Target size={22} /><strong>Tasteful placement</strong><p>One clear card with your image, message and link.</p></div>
        <div className="feature"><BarChart3 size={22} /><strong>Real numbers</strong><p>We share impressions and clicks at the end of your run.</p></div>
      </section>
      <div className="card">
        <h3>Book a placement</h3>
        <div className="setRow"><span>Duration</span><div className="stepper"><button onClick={() => setWeeks(w => Math.max(1, w - 1))}>−</button><b>{weeks} week{weeks > 1 ? 's' : ''}</b><button onClick={() => setWeeks(w => Math.min(12, w + 1))}>+</button></div></div>
        <p className="planPrice">{naira(total)} <small>({naira(billing.sponsor_weekly_ngn)} per week)</small></p>
        <Checkout kind="sponsor" amount={total} presetNote={`${weeks} week placement. Business name: \nWebsite / WhatsApp link: \nWhat to promote: `} />
      </div>
      <Footer />
    </main>
  );
}
