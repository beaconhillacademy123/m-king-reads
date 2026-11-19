'use client';

import { useEffect } from 'react';
import { useAccount } from '../../../lib/account';

/** Plus members see every lesson unlocked. */
export default function LessonLocks() {
  const { plus } = useAccount();
  useEffect(() => {
    if (!plus) return;
    document.querySelectorAll<HTMLElement>('[data-lock]').forEach(el => { el.className = 'freeTag'; el.textContent = 'Plus'; });
  }, [plus]);
  return null;
}
