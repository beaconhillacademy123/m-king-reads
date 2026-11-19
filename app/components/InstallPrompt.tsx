'use client';

import { useEffect, useState } from 'react';
import { Download, Share, SquarePlus, X } from 'lucide-react';
import Logo from './Logo';

type BIPEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }> };

const SNOOZE_KEY = 'mkr-install-snooze-until';
const VISITS_KEY = 'mkr-visits';

function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone === true || document.referrer.startsWith('android-app://');
}

export default function InstallPrompt() {
  const [deferred, setDeferred] = useState<BIPEvent | null>(null);
  const [mode, setMode] = useState<'none' | 'android' | 'ios'>('none');
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (isStandalone()) return;
    let snoozed = false;
    try {
      snoozed = Number(localStorage.getItem(SNOOZE_KEY) || 0) > Date.now();
      localStorage.setItem(VISITS_KEY, String(Number(localStorage.getItem(VISITS_KEY) || 0) + 1));
    } catch {}
    if (snoozed) return;

    const onPrompt = (event: Event) => {
      event.preventDefault();
      setDeferred(event as BIPEvent);
      setMode('android');
      window.setTimeout(() => setOpen(true), 4000);
    };
    window.addEventListener('beforeinstallprompt', onPrompt);
    const onInstalled = () => { setOpen(false); setDeferred(null); };
    window.addEventListener('appinstalled', onInstalled);

    const ua = navigator.userAgent;
    const ios = /iphone|ipad|ipod/i.test(ua) && /safari/i.test(ua) && !/crios|fxios|edgios/i.test(ua);
    let timer = 0;
    if (ios) { setMode('ios'); timer = window.setTimeout(() => setOpen(true), 6000); }

    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
      window.clearTimeout(timer);
    };
  }, []);

  function snooze(days: number) {
    try { localStorage.setItem(SNOOZE_KEY, String(Date.now() + days * 86400000)); } catch {}
    setOpen(false);
  }

  async function install() {
    if (!deferred) return;
    await deferred.prompt();
    const choice = await deferred.userChoice.catch(() => ({ outcome: 'dismissed' as const }));
    setDeferred(null);
    if (choice.outcome === 'accepted') setOpen(false); else snooze(3);
  }

  if (!open || mode === 'none') return null;

  return (
    <div className="installSheet" role="dialog" aria-modal="false" aria-labelledby="install-title">
      <button className="installClose" onClick={() => snooze(7)} aria-label="Not now"><X size={18} /></button>
      <div className="installHead">
        <Logo size={52} />
        <div>
          <strong id="install-title">Install M King Reads</strong>
          <span>Add the app to your home screen — opens full-screen, works offline, no Play Store needed.</span>
        </div>
      </div>
      {mode === 'android' ? (
        <div className="installActions">
          <button className="btn btnGold" onClick={install}><Download size={17} /> Install app</button>
          <button className="btn btnGhost" onClick={() => snooze(7)}>Not now</button>
        </div>
      ) : (
        <ol className="installSteps">
          <li><Share size={16} /> Tap the <b>Share</b> button in Safari</li>
          <li><SquarePlus size={16} /> Choose <b>Add to Home Screen</b></li>
          <li>Tap <b>Add</b> — the M King Reads icon appears on your home screen</li>
        </ol>
      )}
    </div>
  );
}
