'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Crown, Megaphone } from 'lucide-react';
import { supabase } from '../../lib/supabase-browser';
import { useAccount } from '../../lib/account';

type Sponsor = { id: string; title: string; body: string | null; cta: string; image_url: string | null; link_url: string };

const ADSENSE_CLIENT = process.env.NEXT_PUBLIC_ADSENSE_CLIENT;
const ADSENSE_SLOT = process.env.NEXT_PUBLIC_ADSENSE_SLOT;

let sponsorCache: Promise<Sponsor[]> | null = null;
function loadSponsors() {
  if (!sponsorCache) {
    sponsorCache = Promise.resolve(
      supabase.from('booknest_sponsors').select('id,title,body,cta,image_url,link_url').limit(10)
    ).then(({ data }) => (data as Sponsor[]) ?? []).catch(() => []);
  }
  return sponsorCache;
}

/** One ad placement. Plus members never see it. Order: paid sponsor → AdSense → house promo. */
export default function SponsorSlot({ variant = 'banner' }: { variant?: 'banner' | 'inline' }) {
  const { plus, ready } = useAccount();
  const [sponsor, setSponsor] = useState<Sponsor | null>(null);
  const [loaded, setLoaded] = useState(false);
  const tracked = useRef(false);
  const adRef = useRef<HTMLModElement | null>(null);

  useEffect(() => {
    let alive = true;
    loadSponsors().then(list => {
      if (!alive) return;
      if (list.length) setSponsor(list[Math.floor(Math.random() * list.length)]);
      setLoaded(true);
    });
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    if (sponsor && !plus && ready && !tracked.current) {
      tracked.current = true;
      void supabase.rpc('booknest_track_sponsor', { p_id: sponsor.id, p_click: false });
    }
  }, [sponsor, plus, ready]);

  useEffect(() => {
    if (!loaded || sponsor || plus || !ready || !ADSENSE_CLIENT || !adRef.current) return;
    try { ((window as any).adsbygoogle = (window as any).adsbygoogle || []).push({}); } catch {}
  }, [loaded, sponsor, plus, ready]);

  if (!ready || plus || !loaded) return null;

  if (sponsor) {
    return (
      <aside className={`adSlot adSponsor adSlot-${variant}`} aria-label="Sponsored">
        <span className="adTag">Sponsored</span>
        {sponsor.image_url && <img src={sponsor.image_url} alt="" loading="lazy" />}
        <div><strong>{sponsor.title}</strong>{sponsor.body && <p>{sponsor.body}</p>}</div>
        <a className="btn btnSmall" href={sponsor.link_url} target="_blank" rel="noopener sponsored"
          onClick={() => { void supabase.rpc('booknest_track_sponsor', { p_id: sponsor.id, p_click: true }); }}>{sponsor.cta}</a>
      </aside>
    );
  }

  if (ADSENSE_CLIENT && ADSENSE_SLOT) {
    return (
      <aside className={`adSlot adSlot-${variant}`} aria-label="Advertisement">
        <span className="adTag">Ad</span>
        <ins ref={adRef} className="adsbygoogle" style={{ display: 'block', width: '100%' }}
          data-ad-client={ADSENSE_CLIENT} data-ad-slot={ADSENSE_SLOT} data-ad-format="auto" data-full-width-responsive="true" />
      </aside>
    );
  }

  return (
    <aside className={`adSlot adHouse adSlot-${variant}`}>
      <div className="adHouseIcon"><Crown size={20} /></div>
      <div><strong>Go ad-free with M King Reads Plus</strong><p>Offline books, Read-Aloud and premium themes.</p></div>
      <div className="adHouseActions">
        <Link className="btn btnSmall btnGold" href="/premium">See Plus</Link>
        <Link className="adAdvertise" href="/advertise"><Megaphone size={13} /> Advertise here</Link>
      </div>
    </aside>
  );
}
