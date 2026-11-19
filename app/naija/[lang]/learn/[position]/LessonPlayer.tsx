'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Check, ChevronLeft, ChevronRight, Crown, FileText, Gauge, Headphones, Lock, Repeat } from 'lucide-react';
import { supabase } from '../../../../../lib/supabase-browser';
import { useAccount } from '../../../../../lib/account';
import type { Lesson } from '../../../../../lib/naija';
import SponsorSlot from '../../../../components/SponsorSlot';

const TIPS = [
  'Listen once just for the sound. Then play again and repeat out loud after each phrase.',
  'Tones change meaning — copy the speaker’s rise and fall, not just the words.',
  'Practise 10 minutes every day. Little and often beats one long session.',
];

export default function LessonPlayer({ lang, langName, courseTitle, bookUrl, source, freeLessons, lesson, total, prev, next }: {
  lang: string; langName: string; courseTitle: string; bookUrl: string | null; source: string; freeLessons: number;
  lesson: Lesson; total: number; prev: number | null; next: number | null;
}) {
  const { plus, user, ready } = useAccount();
  const locked = lesson.position > freeLessons && !plus;
  const [track, setTrack] = useState(0);
  const [rate, setRate] = useState(1);
  const [loop, setLoop] = useState(false);
  const [done, setDone] = useState(false);
  const audio = useRef<HTMLAudioElement | null>(null);

  useEffect(() => { if (audio.current) audio.current.playbackRate = rate; }, [rate, track]);
  useEffect(() => {
    if (!user) return;
    supabase.from('booknest_lang_progress').select('lesson_id').eq('lesson_id', lesson.id).maybeSingle().then(({ data }) => setDone(!!data));
  }, [user, lesson.id]);

  async function toggleDone() {
    if (!user) { window.location.href = `/login?next=${encodeURIComponent(window.location.pathname)}`; return; }
    if (done) { await supabase.from('booknest_lang_progress').delete().eq('lesson_id', lesson.id); setDone(false); }
    else { await supabase.from('booknest_lang_progress').insert({ user_id: user.id, lesson_id: lesson.id }); setDone(true); }
  }

  const current = lesson.tracks[track];

  return (
    <main className="page narrow lesson">
      <Link href={`/naija/${lang}#learn`} className="backLink"><ArrowLeft size={16} /> {courseTitle}</Link>
      <div className="pageHead">
        <span className="kicker"><Headphones size={13} /> {langName.toUpperCase()} · LESSON {lesson.position} OF {total}</span>
        <h1>{lesson.title}</h1>
      </div>

      {!ready ? <p className="dim">Loading…</p> : locked ? (
        <div className="card lockedCard">
          <Lock size={28} className="gold" />
          <h3>This lesson is part of Plus</h3>
          <p className="dim">Lessons 1–{freeLessons} are free. Plus unlocks all {total} {langName} lessons{bookUrl ? ', the course book' : ''}, plus ad-free reading, offline books and Read-Aloud.</p>
          <div className="row"><Link className="btn btnGold" href="/premium"><Crown size={15} /> Get Plus</Link><Link className="btn btnGhost" href={`/naija/${lang}/learn/1`}>Try lesson 1</Link></div>
        </div>
      ) : (
        <>
          <section className="card player">
            <audio ref={audio} key={current?.url} src={current?.url} controls preload="metadata" loop={loop}
              onEnded={() => { if (!loop && track < lesson.tracks.length - 1) setTrack(t => t + 1); }} />
            <div className="playerTools">
              <span><Gauge size={15} /> Speed</span>
              <div className="swatches">{[0.75, 0.9, 1, 1.25].map(r => <button key={r} className={`swatch${rate === r ? ' on' : ''}`} onClick={() => setRate(r)}>{r}×</button>)}</div>
              <button className={`swatch${loop ? ' on' : ''}`} onClick={() => setLoop(v => !v)}><Repeat size={13} /> Repeat</button>
            </div>
            {lesson.tracks.length > 1 && (
              <ol className="trackList">
                {lesson.tracks.map((t, n) => <li key={t.url}><button className={n === track ? 'on' : ''} onClick={() => { setTrack(n); window.setTimeout(() => audio.current?.play(), 50); }}>Part {n + 1}<small>{t.label}</small></button></li>)}
              </ol>
            )}
          </section>
          <section className="card">
            <h3>How to practise</h3>
            <ul className="tips">{TIPS.map(t => <li key={t}>{t}</li>)}</ul>
            {bookUrl && (plus
              ? <a className="btn btnGhost" href={bookUrl} target="_blank" rel="noreferrer"><FileText size={15} /> Open the course book (PDF)</a>
              : <p className="small dim"><Crown size={12} className="gold" /> The full course book with every dialogue written out comes with <Link href="/premium">Plus</Link>.</p>)}
          </section>
          <button className={`btn ${done ? 'btnGold' : 'btnGhost'} btnBlock`} onClick={toggleDone}><Check size={16} /> {done ? 'Lesson completed' : 'Mark lesson as done'}</button>
        </>
      )}

      <nav className="chapterNav plain">
        {prev ? <Link className="btn btnGhost" href={`/naija/${lang}/learn/${prev}`}><ChevronLeft size={17} /> Lesson {prev}</Link> : <span />}
        {next ? <Link className="btn btnGold" href={`/naija/${lang}/learn/${next}`}>Lesson {next} <ChevronRight size={17} /></Link> : <span />}
      </nav>
      {!plus && <SponsorSlot variant="inline" />}
      <p className="fine">Audio: {source}.</p>
    </main>
  );
}
