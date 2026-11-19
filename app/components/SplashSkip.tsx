'use client';

import { useEffect } from 'react';

/** Lets people tap the opening screen to skip it, and removes it once it has faded. */
export default function SplashSkip() {
  useEffect(() => {
    const el = document.getElementById('pvSplash');
    if (!el) return;
    const hide = () => el.classList.add('pvGone');
    el.addEventListener('click', hide);
    const t = window.setTimeout(hide, 2600);
    return () => { el.removeEventListener('click', hide); window.clearTimeout(t); };
  }, []);
  return null;
}
