'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { supabase } from '../../lib/supabase-browser';

const KEY = 'mkr-visitor';

/** A random id this browser keeps for itself. No personal details are sent. */
function visitorId() {
  try {
    let id = localStorage.getItem(KEY);
    if (!id || !/^[A-Za-z0-9_-]{8,64}$/.test(id)) {
      id = (crypto.randomUUID?.() ?? `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`).replace(/[^A-Za-z0-9]/g, '').slice(0, 32);
      localStorage.setItem(KEY, id);
    }
    return id;
  } catch { return null; }
}

/** Counts one page view per route change for the admin visitor counts. */
export default function VisitTracker() {
  const path = usePathname();
  useEffect(() => {
    if (typeof navigator !== 'undefined' && navigator.webdriver) return;
    const id = visitorId();
    if (!id) return;
    const t = window.setTimeout(() => { void supabase.rpc('booknest_track_visit', { p_visitor: id }).then(() => {}, () => {}); }, 800);
    return () => window.clearTimeout(t);
  }, [path]);
  return null;
}
