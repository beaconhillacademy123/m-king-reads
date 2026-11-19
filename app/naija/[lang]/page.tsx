import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ArrowLeft, BookOpen, Crown, Feather, Headphones, Lock, PenLine, Play } from 'lucide-react';
import { LANGS, PHRASES, getCourse, getDictionaryEntries, getHeritage, getStories, langMeta, type LangCode } from '../../../lib/naija';
import DictionarySearch from './DictionarySearch';
import Rail from '../../components/Rail';
import SponsorSlot from '../../components/SponsorSlot';
import Footer from '../../components/Footer';
import BookCover from '../../components/BookCover';
import LessonLocks from './LessonLocks';
import { getPublishedNovels } from '../../../lib/novels';

export const revalidate = 600;
export function generateStaticParams() { return LANGS.map(l => ({ lang: l.code })); }

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params;
  const l = langMeta(lang);
  return l ? { title: lang === 'enu' ? 'Enuani Dictionary & Language Guide' : `Learn & read ${l.name}`, description: lang === 'enu' ? 'Explore Enuani words, English meanings, pronunciation notes and examples, with attention to Aniocha and Oshimili varieties.' : `${l.name} storybooks, audio lessons and everyday phrases on M King Reads.` } : {};
}

export default async function LangPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  const l = langMeta(lang);
  if (!l) notFound();
  const [stories, course, heritage, novels, dictionary] = await Promise.all([getStories(lang), getCourse(lang).catch(() => null), getHeritage(lang).catch(() => []), getPublishedNovels({ lang, limit: 24 }), lang === 'enu' ? getDictionaryEntries(lang).catch(() => []) : Promise.resolve([])]);
  const lessons = course?.booknest_lang_lessons ?? [];
  const phrases = PHRASES[lang as LangCode];

  return (
    <main className="page naija" style={{ ['--tint' as string]: l.tint } as React.CSSProperties}>
      <Link href="/naija" className="backLink"><ArrowLeft size={16} /> Naija Languages</Link>
      <section className="langHead">
        <span className="kicker">{l.native.toUpperCase()}</span>
        <h1>{l.name}</h1>
        {l.hello && <p className="langHello">{l.hello} <span>— {l.helloEn}</span></p>}
        <nav className="row">
          {lang === 'enu' ? <><a className="pill" href="#dictionary">Dictionary</a><a className="pill" href="#kitchen">Kitchen dictionary</a></> : <a className="pill" href="#phrases">Phrases</a>}
          {stories.length > 0 && <a className="pill" href="#stories">Storybooks ({stories.length})</a>}
          {lessons.length > 0 && <a className="pill" href="#learn">Learn to speak ({lessons.length})</a>}
          {heritage.length > 0 && <a className="pill" href="#heritage">Heritage books</a>}
          <a className="pill" href="#novels">Novels{novels.length ? ` (${novels.length})` : ''}</a>
        </nav>
      </section>

      {lang === 'enu' ? (
        <section id="dictionary" className="card">
          <div className="cardHead"><h3>Enuani–English dictionary & sayings</h3><span className="dim small">{dictionary.filter(entry => entry.category !== 'kitchen').length} sourced entries</span></div>
          <p className="dim dictionaryIntro">Search in either direction: Enuani to English or English to Enuani. Explore sourced vocabulary, proverbs and real-life usage examples.</p>
          <DictionarySearch entries={dictionary.filter(entry => entry.category !== 'kitchen')} />
          <div className="enuaniGuide">
            <h3>Enuani pronunciation & writing notes</h3>
            <p>Enuani is tonal, and local speech varies between communities. These starter notes follow the Atụtụ inu Enuani reference; they are not a substitute for a speaker’s pronunciation.</p>
            <ul>
              <li>The vowel <strong>a</strong> is short, while <strong>e, i, o</strong> and <strong>u</strong> each have short and long forms.</li>
              <li>Pay attention to consonant combinations such as <strong>gb, gw, kw, kp, nw</strong> and <strong>ny</strong>.</li>
              <li>Tone can change meaning. The reference contrasts <strong>àkwà</strong> (bed) with <strong>ákwá</strong> (cry).</li>
            </ul>
            <p className="fine">Reference: <a href="https://enuani.squarespace.com/content" target="_blank" rel="noreferrer">Atụtụ inu — Enuani phonetics and orthography</a>. Spellings and usage can vary by town.</p>
          </div>
        </section>
          <section id="kitchen" className="card enuaniKitchen">
            <div className="cardHead"><h3>Enuani kitchen dictionary</h3><span className="dim small">{dictionary.filter(entry => entry.category === 'kitchen').length} sourced terms</span></div>
            <p className="dim dictionaryIntro">Food, ingredients, traditional dishes and the words used when preparing and eating food. Search in Enuani or English.</p>
            <div className="kitchenGroups">
              <span className="pill">Food & ingredients</span>
              <span className="pill">Soups & dishes</span>
              <span className="pill">Cooking actions</span>
            </div>
            <DictionarySearch entries={dictionary.filter(entry => entry.category === 'kitchen')} />
            <p className="fine">Entries are drawn from Enuani cultural and linguistic references. Kitchen-tool names will be added only when their Enuani forms can be checked.</p>
          </section>
      ) : (
              <section id="phrases" className="card">
        <div className="cardHead"><h3>Everyday phrases</h3><span className="dim small">Free for everyone</span></div>
        <div className="phraseGrid">
          {phrases.map(([p, e]) => <div key={p} className="phrase"><strong lang={lang}>{p}</strong><span>{e}</span></div>)}
        </div>
      </section>
      )}

      {stories.length > 0 && (
        <section id="stories" className="sectionTitle">
          <h2><BookOpen size={20} /> Picture storybooks</h2>
          <p className="dim">Read in {l.name} and tap to see the English. Free to read.</p>
          <div className="storyGrid">
            {stories.map(s => (
              <Link key={s.id} href={`/naija/story/${s.id}`} className="tile tileWide">
                <div className="tileCoverWrap storyCover"><BookCover src={s.cover_url} title={s.title} /></div>
                <div className="tileText"><strong lang={lang}>{s.title}</strong><span>{s.title_en}</span>{s.level && <em>Level {s.level}</em>}</div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {lang !== 'pcm' && stories.length === 0 && (
        <div className="emptyState"><strong>{l.name} storybooks are coming.</strong><p>Open-licence {l.name} picture books are not yet available — we&apos;re working with writers and translators to add them.</p></div>
      )}

      <SponsorSlot variant="inline" />

      {course && lessons.length > 0 && (
        <section id="learn" className="card">
          <div className="cardHead"><h3><Headphones size={18} /> {course.title}</h3><span className="dim small">{lessons.length} lessons</span></div>
          <p className="dim">{course.description}</p>
          <p className="small"><Play size={12} /> The first {course.free_lessons} lessons are free. <Crown size={12} className="gold" /> <Link href="/premium">Plus</Link> unlocks every lesson{course.book_url ? ' and the full course book' : ''}.</p>
          <ol className="lessonList">
            {lessons.map(x => (
              <li key={x.id}>
                <Link href={`/naija/${lang}/learn/${x.position}`}>
                  <span className="lessonNo">{x.position}</span>
                  <span className="lessonTitle">{x.title}<small>{x.tracks.length} recording{x.tracks.length === 1 ? '' : 's'}</small></span>
                  {x.position <= course.free_lessons ? <span className="freeTag">Free</span> : <span className="lockTag" data-lock><Lock size={13} /></span>}
                </Link>
              </li>
            ))}
          </ol>
          <LessonLocks />
          <p className="fine">Course: {course.source}.</p>
        </section>
      )}

      {lang === 'pcm' && (
        <div className="card"><h3>Learn Pidgin through stories</h3><p className="dim">There&apos;s no formal Pidgin course yet — the fastest way in is the storybooks above: every page has the English beside the Pidgin.</p></div>
      )}

      <section id="novels" className="sectionTitle">
        <h2><Feather size={20} /> {l.name} novels</h2>
        <p className="dim">New novels by Nigerian writers. The first chapter is always free.</p>
        {novels.length > 0 ? (
          <div className="railTrack">
            {novels.map(n => (
              <Link key={n.id} href={`/novel/${n.id}`} className="tile"><div className="tileCoverWrap"><BookCover src={n.cover_url} title={n.title} author={n.booknest_authors?.pen_name} /></div>
                <div className="tileText"><strong lang={lang}>{n.title}</strong><span>{n.booknest_authors?.pen_name}</span></div></Link>
            ))}
          </div>
        ) : (
          <div className="card writeCta"><div><h3>Be the first {l.name} novelist here</h3><p className="dim">Publish your story chapter by chapter and earn from every reader.</p></div>
            <Link className="btn btnGold" href="/write"><PenLine size={16} /> Publish your novel</Link></div>
        )}
      </section>

      {heritage.length > 0 && <div id="heritage"><Rail title="Heritage books" kicker="HISTORY & FOLK TALES" books={heritage} /></div>}
      <Footer />
    </main>
  );
}
