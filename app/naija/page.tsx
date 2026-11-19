import Link from 'next/link';
import type { Metadata } from 'next';
import { ChevronRight, Headphones, BookOpen, MessageCircle } from 'lucide-react';
import { LANGS, getCourseCounts, getHeritage, getStories } from '../../lib/naija';
import Rail from '../components/Rail';
import SponsorSlot from '../components/SponsorSlot';
import Footer from '../components/Footer';

export const revalidate = 600;
export const metadata: Metadata = {
  title: 'Naija Languages — Hausa, Yorùbá, Igbo, Pidgin & Enuani',
  description: 'Picture storybooks, audio courses, everyday phrases and the Enuani dictionary, alongside Nigerian heritage books.',
};

export default async function NaijaHub() {
  const [stories, counts, heritage] = await Promise.all([getStories(), getCourseCounts().catch(() => []), getHeritage('ng').catch(() => [])]);
  const lessons = (code: string) => counts.find(c => c.lang === code)?.booknest_lang_lessons?.[0]?.count ?? 0;
  return (
    <main className="page naija">
      <section className="naijaHero">
        <span className="kicker"><span className="ng" /> NAIJA LANGUAGES</span>
        <h1>Read it. Hear it. <em>Speak it.</em></h1>
        <p>Storybooks in your mother tongue, audio lessons from native speakers and language resources in Yorùbá, Hausa, Igbo, Pidgin and Enuani.</p>
        <div className="naijaHellos" aria-hidden>{LANGS.filter(l => l.hello).map(l => <span key={l.code} style={{ color: l.tint }}>{l.hello}</span>)}</div>
      </section>

      <section className="langGrid">
        {LANGS.map(l => {
          const s = stories.filter(x => x.lang === l.code).length;
          const n = lessons(l.code);
          return (
            <Link key={l.code} href={`/naija/${l.code}`} className="langCard" style={{ ['--tint' as string]: l.tint } as React.CSSProperties}>
              <span className="langNative">{l.native}</span>
              <strong>{l.name}</strong>
              {l.hello && <em>{l.hello} <small>{l.helloEn}</small></em>}
              <ul>
                {s > 0 && <li><BookOpen size={14} /> {s} storybooks</li>}
                {n > 0 && <li><Headphones size={14} /> {n} audio lessons</li>}
                <li><MessageCircle size={14} /> {l.code === 'enu' ? 'Enuani dictionary' : 'Everyday phrases'}</li>
              </ul>
              <span className="langGo">Start <ChevronRight size={15} /></span>
            </Link>
          );
        })}
      </section>

      <SponsorSlot variant="inline" />
      <Rail title="Nigerian heritage books" kicker="FOLK TALES & HISTORY" books={heritage} />
      <p className="fine">Storybooks from the African Storybook initiative and Storybooks Nigeria, used under Creative Commons Attribution licences — credits appear on every story. Audio courses from the US Foreign Service Institute (public domain).</p>
      <Footer />
    </main>
  );
}
