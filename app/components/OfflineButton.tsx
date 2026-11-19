'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Check, CloudDownload, Crown, Loader2, Trash2 } from 'lucide-react';
import { useAccount } from '../../lib/account';

export const OFFLINE_CACHE = 'mkr-offline-books-v1';
const INDEX_KEY = 'mkr-offline-index';

export type OfflineEntry = { bookId: string; title: string; author: string; coverUrl: string | null; urls: string[]; savedAt: number };

export function offlineIndex(): OfflineEntry[] {
  try { return JSON.parse(localStorage.getItem(INDEX_KEY) || '[]'); } catch { return []; }
}
function writeIndex(list: OfflineEntry[]) { try { localStorage.setItem(INDEX_KEY, JSON.stringify(list)); } catch {} }

export const FREE_OFFLINE_LIMIT = 1;

export default function OfflineButton({ bookId, title, author, coverUrl, urls, compact = false }: {
  bookId: string; title: string; author: string; coverUrl: string | null; urls: string[]; compact?: boolean;
}) {
  const { plus, ready } = useAccount();
  const [state, setState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [progress, setProgress] = useState(0);
  const [gate, setGate] = useState(false);

  useEffect(() => { if (offlineIndex().some(e => e.bookId === bookId)) setState('saved'); }, [bookId]);

  async function download() {
    if (!('caches' in window)) { setState('error'); return; }
    const others = offlineIndex().filter(e => e.bookId !== bookId);
    if (!plus && others.length >= FREE_OFFLINE_LIMIT) { setGate(true); return; }
    setState('saving'); setProgress(0);
    try {
      const cache = await caches.open(OFFLINE_CACHE);
      let done = 0;
      for (const url of urls) {
        const res = await fetch(url, { credentials: 'same-origin' });
        if (res.ok) await cache.put(url, res.clone());
        done += 1; setProgress(Math.round((done / urls.length) * 100));
      }
      writeIndex([...others, { bookId, title, author, coverUrl, urls, savedAt: Date.now() }]);
      setState('saved');
    } catch { setState('error'); }
  }

  async function remove() {
    const entry = offlineIndex().find(e => e.bookId === bookId);
    if (entry && 'caches' in window) {
      const cache = await caches.open(OFFLINE_CACHE);
      await Promise.all(entry.urls.map(u => cache.delete(u)));
    }
    writeIndex(offlineIndex().filter(e => e.bookId !== bookId));
    setState('idle');
  }

  if (!ready) return null;

  return (
    <>
      {state === 'saved' ? (
        <button className={`btn btnGhost${compact ? ' btnIcon' : ''}`} onClick={remove} title="Remove download">
          <Check size={16} />{!compact && <> Downloaded <Trash2 size={14} className="dim" /></>}
        </button>
      ) : (
        <button className={`btn btnGhost${compact ? ' btnIcon' : ''}`} onClick={download} disabled={state === 'saving'} title="Download for offline reading">
          {state === 'saving' ? <Loader2 size={16} className="spin" /> : <CloudDownload size={16} />}
          {!compact && (state === 'saving' ? ` Saving ${progress}%` : state === 'error' ? ' Try again' : ' Read offline')}
        </button>
      )}
      {gate && (
        <div className="modalBack" onClick={() => setGate(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true">
            <Crown size={28} className="gold" />
            <h3>Download unlimited books with Plus</h3>
            <p>Free readers can keep {FREE_OFFLINE_LIMIT} book offline. Plus members can download as many as they like — perfect for travel and saving data.</p>
            <Link className="btn btnGold btnBlock" href="/premium">See Plus plans</Link>
            <button className="btn btnGhost btnBlock" onClick={() => setGate(false)}>Not now</button>
          </div>
        </div>
      )}
    </>
  );
}
