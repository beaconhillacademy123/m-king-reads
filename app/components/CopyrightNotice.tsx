'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ShieldCheck, X } from 'lucide-react';

const STORAGE_KEY = 'm-king-reads-copyright-notice-ack';

/** A slim, one-time notice instead of a blocking modal. */
export default function CopyrightNotice() {
  const [open, setOpen] = useState(false);
  useEffect(() => { try { setOpen(localStorage.getItem(STORAGE_KEY) !== '1'); } catch {} }, []);
  function acknowledge() { try { localStorage.setItem(STORAGE_KEY, '1'); } catch {} setOpen(false); }
  if (!open) return null;
  return (
    <div className="noticeBar" role="note">
      <ShieldCheck size={18} />
      <p>Books come from Project Gutenberg and other lawful sources. Copyright can differ by country. <Link href="/copyright">Learn more</Link></p>
      <button onClick={acknowledge} aria-label="Dismiss"><X size={16} /></button>
    </div>
  );
}
