'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft, Bookmark, ChevronLeft, ChevronRight, Crown, Headphones, List, Pause, Play, Search, Square, Type, X,
} from 'lucide-react';
import { supabase } from '../../../lib/supabase-browser';
import { useAccount } from '../../../lib/account';
import NotePad from '../../components/NotePad';
import ShareReaderButton from '../../components/ShareReaderButton';
import OfflineButton from '../../components/OfflineButton';
import SponsorSlot from '../../components/SponsorSlot';
import QuoteShare from '../../components/QuoteShare';

type ChapterItem = { number: number; label: string; href: string };

type Props = {
  bookId: string; title: string; author: string; coverUrl: string | null;
  chapter: number; chapterCount: number; content: string; sourceUrl: string | null;
  chapterLabel: string; chapterItems: ChapterItem[]; resumeBookmark?: boolean;
  nextHref?: string; prevHref?: string; backHref?: string; persistToCloud?: boolean; sourceLabel?: string; resumeHref?: string;
};

type ThemeId = 'light' | 'sepia' | 'dark' | 'paper' | 'night' | 'midnight';
type FontId = 'serif' | 'sans' | 'classic' | 'readable';

const THEMES: { id: ThemeId; label: string; plus: boolean }[] = [
  { id: 'light', label: 'Light', plus: false }, { id: 'sepia', label: 'Sepia', plus: false }, { id: 'dark', label: 'Dark', plus: false },
  { id: 'paper', label: 'Paper', plus: true }, { id: 'night', label: 'Night', plus: true }, { id: 'midnight', label: 'Midnight', plus: true },
];
const FONTS: { id: FontId; label: string; plus: boolean }[] = [
  { id: 'serif', label: 'Serif', plus: false }, { id: 'sans', label: 'Sans', plus: false },
  { id: 'classic', label: 'Classic', plus: true }, { id: 'readable', label: 'Easy-read', plus: true },
];

const FREE_TTS_PARAGRAPHS = 6;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function readNum(key: string, fallback: number) {
  try { const v = Number(localStorage.getItem(key)); return Number.isFinite(v) && v > 0 ? v : fallback; } catch { return fallback; }
}

export default function Reader({
  bookId, title, author, coverUrl, chapter, chapterCount, content, sourceUrl, chapterLabel, chapterItems,
  resumeBookmark = false, nextHref, prevHref, backHref, persistToCloud = true, sourceLabel = 'View source', resumeHref,
}: Props) {
  const storageKey = `booknest-progress-${bookId}-${chapter}`;
  const lastReaderKey = `booknest-last-reader-${bookId}`;
  const canPersistToCloud = persistToCloud && UUID.test(bookId);
  const { user, plus } = useAccount();
  const userId = user?.id ?? null;

  const [fontSize, setFontSize] = useState(19);
  const [lineHeight, setLineHeight] = useState(1.75);
  const [theme, setTheme] = useState<ThemeId>('light');
  const [font, setFont] = useState<FontId>('serif');
  const [saved, setSaved] = useState(false);
  const [progress, setProgress] = useState(0);
  const [overallProgress, setOverallProgress] = useState(0);
  const [panel, setPanel] = useState<'none' | 'contents' | 'settings'>('none');
  const [contentsSearch, setContentsSearch] = useState('');
  const [chrome, setChrome] = useState(true);
  const [gate, setGate] = useState<string | null>(null);
  const [tts, setTts] = useState<'off' | 'playing' | 'paused'>('off');
  const [ttsRate, setTtsRate] = useState(1);
  const [ttsSupported, setTtsSupported] = useState(false);
  const bodyRef = useRef<HTMLDivElement | null>(null);
  const ttsIndex = useRef(0);
  const ttsParagraphs = useRef<HTMLElement[]>([]);
  const lastScroll = useRef(0);

  /* ---------- preferences ---------- */
  useEffect(() => {
    setFontSize(Math.min(30, Math.max(14, readNum('booknest-font-size', 19))));
    setLineHeight(Math.min(2.2, Math.max(1.4, readNum('mkr-line-height', 1.75))));
    try {
      const t = (localStorage.getItem('booknest-reader-theme') || 'light') as ThemeId;
      const f = (localStorage.getItem('mkr-reader-font') || 'serif') as FontId;
      setTheme(THEMES.some(x => x.id === t) ? t : 'light');
      setFont(FONTS.some(x => x.id === f) ? f : 'serif');
      setSaved(localStorage.getItem(`booknest-bookmark-${bookId}-${chapter}`) === '1');
    } catch {}
    setTtsSupported(typeof window !== 'undefined' && 'speechSynthesis' in window);
  }, [bookId, chapter]);

  // Premium looks fall back to free ones if Plus lapses.
  const effectiveTheme: ThemeId = !plus && THEMES.find(t => t.id === theme)?.plus ? 'dark' : theme;
  const effectiveFont: FontId = !plus && FONTS.find(f => f.id === font)?.plus ? 'serif' : font;

  /* ---------- restore position ---------- */
  useEffect(() => {
    let attempts = 0; let done = false;
    const restore = () => {
      if (done) return;
      const bookmarkY = resumeBookmark ? readNum(`booknest-bookmark-position-${bookId}-${chapter}`, 0) : 0;
      const y = bookmarkY > 0 ? bookmarkY : readNum(storageKey, 0);
      if (y <= 0) { done = true; return; }
      window.scrollTo(0, y);
      if (Math.abs(window.scrollY - y) < 3 || attempts >= 12) { done = true; return; }
      attempts += 1; window.setTimeout(restore, 100);
    };
    const timer = window.setTimeout(restore, 120);
    return () => window.clearTimeout(timer);
  }, [bookId, chapter, storageKey, resumeBookmark]);

  /* ---------- cloud progress ---------- */
  useEffect(() => {
    if (!userId || !canPersistToCloud) return;
    supabase.from('booknest_reading_progress').select('progress').eq('user_id', userId).eq('book_id', bookId).maybeSingle()
      .then(({ data }) => { if (data) setOverallProgress(p => Math.max(p, Math.min(100, Number(data.progress) || 0))); });
  }, [userId, bookId, canPersistToCloud]);

  /* ---------- progress tracking (throttled cloud writes) ---------- */
  useEffect(() => {
    let lastCloud = 0;
    const compute = () => {
      const doc = document.documentElement;
      const max = Math.max(1, doc.scrollHeight - window.innerHeight);
      const pct = Math.min(100, Math.max(0, (window.scrollY / max) * 100));
      const overall = Math.min(100, Math.max(0, ((chapter - 1) + pct / 100) / Math.max(1, chapterCount) * 100));
      return { pct, overall };
    };
    const saveLocal = (overall: number) => {
      try {
        const position = Math.round(window.scrollY);
        localStorage.setItem(storageKey, String(position));
        localStorage.setItem(lastReaderKey, JSON.stringify({ chapter, position, title, author, coverUrl }));
        localStorage.setItem('m-king-reads-last-book', JSON.stringify({
          bookId, chapter, position, title, author, coverUrl, progress: Math.round(overall),
          resumeHref: resumeHref || ((backHref || `/read/${bookId}`) + (chapter > 1 ? `?chapter=${chapter}` : '')),
        }));
      } catch {}
    };
    const saveCloud = (overall: number, force = false) => {
      if (!userId || !canPersistToCloud) return;
      const now = Date.now();
      if (!force && now - lastCloud < 4000) return;
      lastCloud = now;
      void supabase.from('booknest_reading_progress').upsert({
        user_id: userId, book_id: bookId, progress: Number(overall.toFixed(2)), chapter,
        position: Math.round(window.scrollY), updated_at: new Date().toISOString(),
      });
    };
    const onScroll = () => {
      const { pct, overall } = compute();
      setProgress(pct); setOverallProgress(overall);
      saveLocal(overall); saveCloud(overall);
      const y = window.scrollY;
      if (Math.abs(y - lastScroll.current) > 40) { setChrome(y < lastScroll.current || y < 80); lastScroll.current = y; }
    };
    const flush = () => { const { overall } = compute(); saveLocal(overall); saveCloud(overall, true); };
    const onVis = () => { if (document.visibilityState === 'hidden') flush(); };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('pagehide', flush);
    document.addEventListener('visibilitychange', onVis);
    const t = window.setTimeout(onScroll, 250);
    return () => {
      window.removeEventListener('scroll', onScroll); window.removeEventListener('pagehide', flush);
      document.removeEventListener('visibilitychange', onVis); window.clearTimeout(t); flush();
    };
  }, [storageKey, lastReaderKey, content, userId, bookId, chapter, chapterCount, canPersistToCloud, resumeHref, backHref, title, author, coverUrl]);

  /* ---------- reading-time log for streaks ---------- */
  useEffect(() => {
    if (!userId) return;
    let active = 0; let lastActivity = Date.now();
    const bump = () => { lastActivity = Date.now(); };
    const tick = window.setInterval(() => {
      if (document.visibilityState === 'visible' && Date.now() - lastActivity < 120000) active += 15;
      if (active >= 60) { void supabase.rpc('booknest_log_reading', { p_seconds: active }); active = 0; }
    }, 15000);
    window.addEventListener('scroll', bump, { passive: true });
    window.addEventListener('pointerdown', bump);
    return () => {
      window.clearInterval(tick); window.removeEventListener('scroll', bump); window.removeEventListener('pointerdown', bump);
      if (active >= 15) void supabase.rpc('booknest_log_reading', { p_seconds: active });
    };
  }, [userId]);

  /* ---------- preferences setters ---------- */
  const persist = (k: string, v: string) => { try { localStorage.setItem(k, v); } catch {} };
  function changeFont(delta: number) { setFontSize(c => { const n = Math.min(30, Math.max(14, c + delta)); persist('booknest-font-size', String(n)); return n; }); }
  function changeLine(delta: number) { setLineHeight(c => { const n = Math.round(Math.min(2.2, Math.max(1.4, c + delta)) * 100) / 100; persist('mkr-line-height', String(n)); return n; }); }
  function pickTheme(t: (typeof THEMES)[number]) { if (t.plus && !plus) { setGate('Premium themes'); return; } setTheme(t.id); persist('booknest-reader-theme', t.id); }
  function pickFont(f: (typeof FONTS)[number]) { if (f.plus && !plus) { setGate('Premium fonts'); return; } setFont(f.id); persist('mkr-reader-font', f.id); }

  function toggleBookmark() {
    const key = `booknest-bookmark-${bookId}-${chapter}`;
    const posKey = `booknest-bookmark-position-${bookId}-${chapter}`;
    if (saved) {
      try { localStorage.removeItem(key); localStorage.removeItem(posKey); } catch {}
      setSaved(false);
      if (userId && canPersistToCloud) void supabase.from('booknest_bookmarks').delete().eq('user_id', userId).eq('book_id', bookId).eq('location', `chapter-${chapter}`);
    } else {
      persist(key, '1'); persist(posKey, String(Math.round(window.scrollY)));
      setSaved(true);
      if (userId && canPersistToCloud) void supabase.from('booknest_bookmarks').upsert({ user_id: userId, book_id: bookId, location: `chapter-${chapter}` });
    }
  }

  /* ---------- Read-Aloud ---------- */
  const stopTts = useCallback(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.cancel();
    ttsParagraphs.current.forEach(p => p.classList.remove('ttsActive'));
    setTts('off');
  }, []);

  useEffect(() => () => stopTts(), [stopTts, content]);

  const speakFrom = useCallback((index: number) => {
    const list = ttsParagraphs.current;
    if (index >= list.length) {
      stopTts();
      if (nextHref) window.location.href = nextHref + (nextHref.includes('?') ? '&' : '?') + 'listen=1';
      return;
    }
    if (!plus && index >= FREE_TTS_PARAGRAPHS) { stopTts(); setGate('Read-Aloud'); return; }
    ttsIndex.current = index;
    list.forEach(p => p.classList.remove('ttsActive'));
    const el = list[index];
    el.classList.add('ttsActive');
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    const u = new SpeechSynthesisUtterance(el.innerText);
    u.rate = ttsRate; u.lang = 'en-GB';
    u.onend = () => { if (ttsIndex.current === index) speakFrom(index + 1); };
    u.onerror = () => {};
    window.speechSynthesis.speak(u);
  }, [plus, ttsRate, nextHref, stopTts]);

  function startTts() {
    if (!ttsSupported || !bodyRef.current) return;
    window.speechSynthesis.cancel();
    const list = Array.from(bodyRef.current.querySelectorAll<HTMLElement>('p, h2, h3, h4, blockquote, li')).filter(p => p.innerText.trim().length > 1);
    ttsParagraphs.current = list;
    // Start at the first paragraph that is on screen.
    const first = Math.max(0, list.findIndex(p => p.getBoundingClientRect().bottom > 80));
    setTts('playing');
    speakFrom(first);
  }
  function pauseTts() { window.speechSynthesis.pause(); setTts('paused'); }
  function resumeTts() { window.speechSynthesis.resume(); setTts('playing'); }

  useEffect(() => {
    if (tts === 'playing') { window.speechSynthesis.cancel(); speakFrom(ttsIndex.current); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ttsRate]);

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('listen') === '1' && plus) { const t = window.setTimeout(startTts, 900); return () => window.clearTimeout(t); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plus, content]);

  const filtered = useMemo(() => {
    const q = contentsSearch.trim().toLowerCase();
    return chapterItems.filter(i => !q || i.label.toLowerCase().includes(q) || String(i.number).includes(q));
  }, [chapterItems, contentsSearch]);

  const offlineUrls = useMemo(() => chapterItems.map(i => i.href), [chapterItems]);
  const minutesLeft = Math.max(1, Math.round(((100 - progress) / 100) * (content.length / 5 / 230)));
  const finished = !nextHref && overallProgress >= 99.5;

  return (
    <main className={`reader reader-${effectiveTheme} font-${effectiveFont}${chrome ? '' : ' chromeHidden'}`}>
      <div className="readerProgress" aria-hidden><span style={{ width: `${progress}%` }} /></div>

      <header className="readerBar">
        <Link href={backHref || `/book/${bookId}`} className="rIcon" aria-label="Back to book"><ArrowLeft size={20} /></Link>
        <div className="readerTitle"><strong>{title}</strong><small>{chapterLabel}</small></div>
        <div className="readerTools">
          {ttsSupported && <button className={`rIcon${tts !== 'off' ? ' on' : ''}`} onClick={() => (tts === 'off' ? startTts() : stopTts())} aria-label="Read aloud" title="Read-Aloud"><Headphones size={19} /></button>}
          <button className="rIcon" onClick={() => setPanel(p => (p === 'contents' ? 'none' : 'contents'))} aria-label="Contents"><List size={19} /></button>
          <button className="rIcon" onClick={() => setPanel(p => (p === 'settings' ? 'none' : 'settings'))} aria-label="Text settings"><Type size={19} /></button>
          <button className={`rIcon${saved ? ' on' : ''}`} onClick={toggleBookmark} aria-label="Bookmark"><Bookmark size={19} fill={saved ? 'currentColor' : 'none'} /></button>
          <ShareReaderButton title={title} chapter={chapter} />
        </div>
      </header>

      {panel !== 'none' && <div className="sheetBack" onClick={() => setPanel('none')} />}

      {panel === 'contents' && (
        <div className="sheet" role="dialog" aria-label="Contents">
          <div className="sheetHead"><strong>Contents</strong><span>{chapter} of {chapterCount}</span><button onClick={() => setPanel('none')} aria-label="Close"><X size={18} /></button></div>
          {chapterItems.length > 8 && <label className="sheetSearch"><Search size={15} /><input value={contentsSearch} onChange={e => setContentsSearch(e.target.value)} placeholder="Find a chapter…" /></label>}
          <div className="chapterList">
            {filtered.map(i => (
              <Link key={i.number} href={i.href} onClick={() => setPanel('none')} className={i.number === chapter ? 'current' : ''} aria-current={i.number === chapter ? 'page' : undefined}>
                <span>{i.number}</span><strong>{i.label}</strong>
              </Link>
            ))}
            {!filtered.length && <p className="dim">No matching chapters.</p>}
          </div>
          <div className="sheetFoot"><OfflineButton bookId={bookId} title={title} author={author} coverUrl={coverUrl} urls={offlineUrls} /></div>
        </div>
      )}

      {panel === 'settings' && (
        <div className="sheet" role="dialog" aria-label="Text settings">
          <div className="sheetHead"><strong>Display</strong><button onClick={() => setPanel('none')} aria-label="Close"><X size={18} /></button></div>
          <div className="setRow"><span>Text size</span><div className="stepper"><button onClick={() => changeFont(-1)} aria-label="Smaller">A−</button><b>{fontSize}</b><button onClick={() => changeFont(1)} aria-label="Bigger">A+</button></div></div>
          <div className="setRow"><span>Line spacing</span><div className="stepper"><button onClick={() => changeLine(-0.1)} aria-label="Tighter">−</button><b>{lineHeight.toFixed(1)}</b><button onClick={() => changeLine(0.1)} aria-label="Looser">+</button></div></div>
          <span className="setLabel">Theme</span>
          <div className="swatches">
            {THEMES.map(t => <button key={t.id} className={`swatch sw-${t.id}${effectiveTheme === t.id ? ' on' : ''}`} onClick={() => pickTheme(t)}>{t.label}{t.plus && !plus && <Crown size={11} />}</button>)}
          </div>
          <span className="setLabel">Font</span>
          <div className="fontPick">
            {FONTS.map(f => <button key={f.id} className={`fp-${f.id}${effectiveFont === f.id ? ' on' : ''}`} onClick={() => pickFont(f)}>Aa<small>{f.label}{f.plus && !plus && <Crown size={10} />}</small></button>)}
          </div>
          {ttsSupported && <><span className="setLabel">Read-Aloud speed</span>
            <div className="swatches">{[0.8, 1, 1.25, 1.5].map(r => <button key={r} className={`swatch${ttsRate === r ? ' on' : ''}`} onClick={() => setTtsRate(r)}>{r}×</button>)}</div></>}
        </div>
      )}

      {tts !== 'off' && (
        <div className="ttsBar" role="region" aria-label="Read-Aloud controls">
          <Headphones size={17} /><span>Reading aloud{!plus && ' · preview'}</span>
          {tts === 'playing' ? <button onClick={pauseTts} aria-label="Pause"><Pause size={17} /></button> : <button onClick={resumeTts} aria-label="Resume"><Play size={17} /></button>}
          <button onClick={stopTts} aria-label="Stop"><Square size={15} /></button>
        </div>
      )}

      <article className="readerPage" onClick={e => { if ((e.target as HTMLElement).closest('a,button')) return; setChrome(c => !c); }}>
        <div className="chapterHead">
          <span>{chapterCount > 1 ? `CHAPTER ${chapter} OF ${chapterCount}` : author.toUpperCase()}</span>
          <h1>{chapterLabel === 'Full book' ? title : chapterLabel}</h1>
        </div>
        <div ref={bodyRef} className="readerBody" style={{ fontSize: `${fontSize}px`, lineHeight }} dangerouslySetInnerHTML={{ __html: content }} />

        {finished && (
          <div className="finishCard" role="status">
            <span>🎉</span><strong>You finished {title}!</strong>
            <p>Share it with a friend, or find your next read.</p>
            <div><ShareReaderButton title={title} chapter={chapter} /><Link className="btn btnGold btnSmall" href={backHref || `/book/${bookId}`}>More like this</Link></div>
          </div>
        )}

        <div className="readerAd"><SponsorSlot variant="inline" /></div>

        <nav className="chapterNav" aria-label="Chapters">
          {prevHref ? <Link href={prevHref} className="btn btnGhost"><ChevronLeft size={18} /> Previous</Link> : <span />}
          <span className="dim">{chapter} / {chapterCount}</span>
          {nextHref ? <Link href={nextHref} className="btn btnGold">Next chapter <ChevronRight size={18} /></Link> : <span />}
        </nav>
        {sourceUrl && <p className="readerSource">Open-source edition. <a href={sourceUrl} target="_blank" rel="noreferrer">{sourceLabel}</a></p>}
      </article>

      <footer className="readerFoot" aria-hidden>
        <span>{Math.round(overallProgress)}% of book</span>
        <span>~{minutesLeft} min left in {chapterCount > 1 ? 'chapter' : 'book'}</span>
      </footer>

      <QuoteShare containerRef={bodyRef} title={title} author={author} sharePath={backHref || `/book/${bookId}`} />

      <NotePad bookKey={`book:${bookId}`} title={title} href={`/read/${bookId}${chapter > 1 ? `?chapter=${chapter}` : ''}`} context={chapterLabel} />

      {gate && (
        <div className="modalBack" onClick={() => setGate(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true">
            <Crown size={28} className="gold" />
            <h3>{gate} is a Plus feature</h3>
            <p>Upgrade to M King Reads Plus for unlimited Read-Aloud, offline downloads, premium themes and fonts — and no ads.</p>
            <Link className="btn btnGold btnBlock" href="/premium">See Plus plans</Link>
            <button className="btn btnGhost btnBlock" onClick={() => setGate(null)}>Keep reading</button>
          </div>
        </div>
      )}
    </main>
  );
}
