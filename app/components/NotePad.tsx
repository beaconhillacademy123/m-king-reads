'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Check, Cloud, Copy, Download, Heading, NotebookPen, X } from 'lucide-react';
import { useAccount } from '../../lib/account';
import { downloadNote, fetchCloudNote, readLocalNote, saveCloudNote, writeLocalNote, type Note } from '../../lib/notes';

/**
 * Floating notepad for any reader. One note per book, saved on the device as you type
 * and to the reader's account when they're signed in.
 */
export default function NotePad({ bookKey, title, href, context, raised = false }: {
  bookKey: string; title: string; href: string; context?: string; raised?: boolean;
}) {
  const { user } = useAccount();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [loaded, setLoaded] = useState(false);
  const areaRef = useRef<HTMLTextAreaElement>(null);
  const timer = useRef<number | null>(null);
  const latest = useRef('');

  // Load: the newer of the device copy and the account copy wins.
  useEffect(() => {
    let alive = true;
    const local = readLocalNote(bookKey);
    setText(local?.content ?? '');
    latest.current = local?.content ?? '';
    setLoaded(true);
    if (user) {
      void fetchCloudNote(user.id, bookKey).then(cloud => {
        if (!alive || !cloud) return;
        if (!local || cloud.updated_at > local.updated_at) {
          setText(cloud.content);
          latest.current = cloud.content;
          writeLocalNote(cloud);
        }
      }).catch(() => undefined);
    }
    return () => { alive = false; };
  }, [bookKey, user]);

  const persist = useCallback((content: string) => {
    const note: Note = { book_key: bookKey, title, href, content, updated_at: new Date().toISOString() };
    writeLocalNote(note);
    if (!user) { setStatus('saved'); return; }
    setStatus('saving');
    void saveCloudNote(user.id, note).then(() => setStatus('saved')).catch(() => setStatus('saved'));
  }, [bookKey, title, href, user]);

  function change(value: string) {
    setText(value);
    latest.current = value;
    setStatus('saving');
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => persist(value), 700);
  }

  // Save immediately when the pad closes or the page goes away.
  useEffect(() => {
    const flush = () => { if (timer.current) { window.clearTimeout(timer.current); timer.current = null; persist(latest.current); } };
    window.addEventListener('pagehide', flush);
    return () => { window.removeEventListener('pagehide', flush); flush(); };
  }, [persist]);

  useEffect(() => {
    if (open) window.setTimeout(() => areaRef.current?.focus({ preventScroll: true }), 120);
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  function insertHeading() {
    const label = context || title;
    const el = areaRef.current;
    const pos = el?.selectionStart ?? text.length;
    const before = text.slice(0, pos);
    const insert = `${before && !before.endsWith('\n') ? '\n\n' : before ? '\n' : ''}— ${label} —\n`;
    const next = before + insert + text.slice(pos);
    change(next);
    window.setTimeout(() => { el?.focus(); el?.setSelectionRange(pos + insert.length, pos + insert.length); }, 0);
  }

  async function copy() {
    try { await navigator.clipboard.writeText(text); setStatus('saved'); } catch { /* ignore */ }
  }

  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  const hasNotes = loaded && text.trim().length > 0;

  return (
    <>
      <button
        type="button"
        className={`noteFab${raised ? ' noteFabRaised' : ''}${hasNotes ? ' hasNotes' : ''}`}
        onClick={() => setOpen(o => !o)}
        aria-label={open ? 'Close notepad' : 'Open notepad'}
        aria-expanded={open}
      >
        <NotebookPen size={21} />
        {hasNotes && <span className="noteDot" aria-hidden />}
      </button>

      {open && <div className="noteBack" onClick={() => setOpen(false)} />}
      <aside className={`notePad${open ? ' open' : ''}`} role="dialog" aria-label="Notepad" aria-hidden={!open}>
        <header className="noteHead">
          <div className="noteTitle"><NotebookPen size={17} /><div><strong>My notes</strong><small>{title}</small></div></div>
          <button type="button" className="noteIcon" onClick={() => setOpen(false)} aria-label="Close"><X size={18} /></button>
        </header>
        <textarea
          ref={areaRef}
          className="noteArea"
          value={text}
          onChange={e => change(e.target.value)}
          placeholder={'Jot down thoughts, quotes, characters, questions…\n\nYour notes save automatically.'}
          maxLength={50000}
          spellCheck
          tabIndex={open ? 0 : -1}
        />
        <footer className="noteFoot">
          <div className="noteActions">
            <button type="button" onClick={insertHeading} title="Insert chapter heading" tabIndex={open ? 0 : -1}><Heading size={16} /> {context ? 'Chapter' : 'Heading'}</button>
            <button type="button" onClick={() => void copy()} disabled={!words} tabIndex={open ? 0 : -1}><Copy size={16} /> Copy</button>
            <button type="button" onClick={() => downloadNote({ title, content: text })} disabled={!words} tabIndex={open ? 0 : -1}><Download size={16} /> Save file</button>
          </div>
          <div className="noteMeta">
            <span>{words} {words === 1 ? 'word' : 'words'}</span>
            <span className="noteStatus">
              {status === 'saving' ? 'Saving…' : status === 'saved' ? <>{user ? <Cloud size={13} /> : <Check size={13} />} {user ? 'Saved to account' : 'Saved on this device'}</> : null}
            </span>
          </div>
          {!user && <p className="noteHint"><Link href={`/login?next=${encodeURIComponent(href)}`} tabIndex={open ? 0 : -1}>Sign in</Link> to keep notes on all your devices. <Link href="/notes" tabIndex={open ? 0 : -1}>All notes</Link></p>}
          {user && <p className="noteHint"><Link href="/notes" tabIndex={open ? 0 : -1}>See all my notes</Link></p>}
        </footer>
      </aside>
    </>
  );
}
