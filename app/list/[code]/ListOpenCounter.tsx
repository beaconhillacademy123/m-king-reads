'use client';

import { useEffect } from 'react';
import { supabase } from '../../../lib/supabase-browser';

/** Counts each student's first open of a list on this device, so teachers see it was opened. */
export default function ListOpenCounter({ code }: { code: string }) {
  useEffect(() => {
    const key = `mkr-list-open-${code}`;
    try { if (localStorage.getItem(key)) return; localStorage.setItem(key, '1'); } catch {}
    void supabase.rpc('booknest_count_list_open', { p_code: code }).then(() => {}, () => {});
  }, [code]);
  return null;
}
