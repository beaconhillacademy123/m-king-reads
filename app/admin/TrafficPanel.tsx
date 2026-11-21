'use client';

import { useEffect, useState } from 'react';
import { RefreshCw, Users, UserPlus } from 'lucide-react';
import { supabase } from '../../lib/supabase-browser';

type Traffic = {
  visitors_today: number; visitors_7d: number; visitors_30d: number;
  views_today: number; views_7d: number; views_30d: number;
  signups_today: number; signups_7d: number; signups_30d: number; signups_total: number;
  reading_lists: number;
  series: { day: string; visitors: number; views: number; signups: number }[] | null;
};

export default function TrafficPanel() {
  const [t, setT] = useState<Traffic | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function load() {
    setBusy(true);
    const { data, error: e } = await supabase.rpc('booknest_admin_traffic');
    setBusy(false);
    if (e) { setError(e.message.includes('booknest_admin_traffic') ? 'Visitor counts start once the latest database update is applied.' : e.message); return; }
    setError(''); setT(data as Traffic);
  }
  useEffect(() => { void load(); }, []);

  const series = t?.series ?? [];
  const max = Math.max(1, ...series.map(d => d.visitors));
  return (
    <section className="card">
      <div className="cardHead"><h3><Users size={16} className="gold" /> Visitors &amp; sign-ups</h3><button className="btn btnGhost btnSmall" onClick={load} disabled={busy}><RefreshCw size={14} /> Refresh</button></div>
      {error ? <p className="dim small">{error}</p> : !t ? <p className="dim small">Loading…</p> : (
        <>
          <div className="statRow wrap">
            <div className="stat"><strong>{t.visitors_today.toLocaleString()}</strong><span>Visitors today</span></div>
            <div className="stat"><strong>{t.visitors_7d.toLocaleString()}</strong><span>Visitors (7 days)</span></div>
            <div className="stat"><strong>{t.visitors_30d.toLocaleString()}</strong><span>Visitors (30 days)</span></div>
            <div className="stat"><strong>{t.views_7d.toLocaleString()}</strong><span>Page views (7 days)</span></div>
            <div className="stat"><strong>{t.signups_today}</strong><span><UserPlus size={12} /> Sign-ups today</span></div>
            <div className="stat"><strong>{t.signups_7d}</strong><span>Sign-ups (7 days)</span></div>
            <div className="stat"><strong>{t.signups_30d}</strong><span>Sign-ups (30 days)</span></div>
            <div className="stat"><strong>{t.signups_total.toLocaleString()}</strong><span>Reader accounts</span></div>
            <div className="stat"><strong>{t.reading_lists}</strong><span>Teacher reading lists</span></div>
          </div>
          <div className="trafficChart" role="img" aria-label="Visitors per day for the last 14 days">
            {series.map(d => (
              <div key={d.day} className="chartCol" title={`${d.day}: ${d.visitors} visitors, ${d.views} views, ${d.signups} sign-ups`}>
                <em>{d.visitors || ''}</em>
                <span className="hit" style={{ height: `${Math.max(3, (d.visitors / max) * 100)}%` }} />
                <small>{new Date(d.day + 'T12:00:00').toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })}{d.signups ? ` · +${d.signups}` : ''}</small>
              </div>
            ))}
          </div>
          <p className="fine">Visitors are counted once per browser per day (Lagos time). Bars show the last 14 days; “+N” is new sign-ups that day.</p>
        </>
      )}
    </section>
  );
}
