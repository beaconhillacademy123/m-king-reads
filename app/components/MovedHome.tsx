'use client';

import { useEffect } from 'react';
import { supabase } from '../../lib/supabase-browser';
import { NEW_HOME, isOldHome } from '../../lib/home';

/**
 * M King Reads now lives at mkingreads.promisevisuals.com.
 * Anyone who opens the old vercel.app address is sent to the same page there, still
 * signed in: the sign-in is handed over in the address (the same way Supabase sign-in
 * links work), so it is the same session and the one-device Plus seat carries over.
 * The old address's copy is then cleared without ending the session.
 */
export default function MovedHome() {
  useEffect(() => {
    if (!isOldHome()) return;
    const { pathname, search, hash } = window.location;
    const go = (h: string) => window.location.replace(NEW_HOME + pathname + search + h);
    // Password-reset and sign-in links already carry the sign-in; pass them on untouched.
    if (hash.includes('access_token') || hash.includes('error_description')) { go(hash); return; }
    (async () => {
      let h = hash;
      try {
        const { data } = await supabase.auth.getSession();
        const s = data.session;
        if (s) {
          const p = new URLSearchParams({
            access_token: s.access_token,
            refresh_token: s.refresh_token,
            expires_in: String(Math.max(60, (s.expires_at ?? 0) - Math.floor(Date.now() / 1000))),
            expires_at: String(s.expires_at ?? ''),
            token_type: 'bearer',
          });
          h = '#' + p.toString();
        }
      } catch {}
      try {
        Object.keys(localStorage).filter((k) => k.startsWith('sb-')).forEach((k) => localStorage.removeItem(k));
      } catch {}
      go(h);
    })();
  }, []);
  return null;
}
