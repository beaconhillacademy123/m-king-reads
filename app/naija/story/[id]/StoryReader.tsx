'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ChevronLeft, ChevronRight, Languages } from 'lucide-react';
import type { LangStory } from '../../../../lib/naija';
import { licenseUrl } from '../../../../lib/naija';
import SponsorSlot from '../../../components/SponsorSlot';
import ShareBookButton from '../../../components/ShareBookButton';

const THE_END: Record<string, string> = { yo: 'Ó parí', ha: 'Ƙarshe', ig: 'Ọ gwụla', pcm: 'E don finish!' };

export default function StoryReader({ story, langName }: { story: LangStory; langName: string }) {
  const pages = story.pages ?? [];
  const [i, setI] = useState(-1); // -1 = cover
  const [english, setEnglish] = useState(false);
  const last = pages.length;
  const hasEnglish = pages.some(p => p.en);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') setI(v => Math.min(last, v + 1));
      if (e.key === 'ArrowLeft') setI(v => Math.max(-1, v - 1));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [last]);

  const page = i >= 0 && i < last ? pages[i] : null;

  return (
    <main className="page storyRead">
      <div className="storyTop">
        <Link href={`/naija/${story.lang}`} className="backLink"><ArrowLeft size={16} /> {langName}</Link>
        <div className="row">
          {hasEnglish && <button className={`btn btnSmall ${english ? 'btnGold' : 'btnGhost'}`} onClick={() => setEnglish(v => !v)}><Languages size={14} /> {english ? 'English on' : 'Show English'}</button>}
          <ShareBookButton title={story.title} />
        </div>
      </div>

      <div className="storyStage">
        {i === -1 && (
          <div className="storyPage storyCoverPage">
            {story.cover_url && <img src={story.cover_url} alt="" />}
            <div className="storyText">
              <span className="kicker">{langName.toUpperCase()} STORYBOOK{story.level ? ` · LEVEL ${story.level}` : ''}</span>
              <h1 lang={story.lang}>{story.title}</h1>
              {story.title_en && <p className="dim">{story.title_en}</p>}
              <button className="btn btnGold btnLg" onClick={() => setI(0)}>Start reading <ChevronRight size={17} /></button>
            </div>
          </div>
        )}
        {page && (
          <div className="storyPage" onClick={() => setI(v => Math.min(last, v + 1))}>
            {page.image && <img src={page.image} alt="" loading="eager" />}
            <div className="storyText">
              <p lang={story.lang} className="storyNative">{page.text}</p>
              {english && page.en && <p className="storyEn">{page.en}</p>}
            </div>
          </div>
        )}
        {i === last && (
          <div className="storyPage storyEnd">
            <span className="storyEndMark">✦</span>
            <h2><span lang={story.lang}>{THE_END[story.lang] ?? 'The end'}</span> · The end</h2>
            <p className="dim">Read another story or practise speaking {langName}.</p>
            <div className="row"><button className="btn btnGhost" onClick={() => setI(-1)}>Read again</button><Link className="btn btnGold" href={`/naija/${story.lang}`}>More {langName}</Link></div>
            <SponsorSlot variant="inline" />
          </div>
        )}
      </div>

      <nav className="storyNav">
        <button className="btn btnGhost" disabled={i <= -1} onClick={() => setI(v => Math.max(-1, v - 1))}><ChevronLeft size={18} /> Back</button>
        <div className="storyDots" aria-label={`Page ${Math.max(0, i + 1)} of ${last}`}>
          {Array.from({ length: last }, (_, n) => <span key={n} className={n === i ? 'on' : n < i ? 'done' : ''} />)}
        </div>
        <button className="btn btnGold" disabled={i >= last} onClick={() => setI(v => Math.min(last, v + 1))}>Next <ChevronRight size={18} /></button>
      </nav>

      <footer className="storyCredits">
        <p>
          {story.author && <>Written by <b>{story.author}</b>. </>}
          {story.illustrator && <>Illustrated by <b>{story.illustrator}</b>. </>}
          {story.translator && <>Translated by <b>{story.translator}</b>. </>}
        </p>
        <p className="fine">From the <a href="https://africanstorybook.org" target="_blank" rel="noreferrer">African Storybook</a>{story.source === 'storybooks-nigeria' && <> via <a href="https://global-asp.github.io/storybooks-nigeria/" target="_blank" rel="noreferrer">Storybooks Nigeria</a></>}. Licensed under <a href={licenseUrl(story.license)} target="_blank" rel="noreferrer">{story.license}</a>.</p>
      </footer>
    </main>
  );
}
