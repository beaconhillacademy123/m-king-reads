import Link from 'next/link';
import BookCover from './BookCover';

export type MarqueeItem = {
  key: string;
  href: string;
  title: string;
  author?: string | null;
  cover: string | null;
  tag: string;
  /** Illustrated storybooks: the cover is a picture without a printed title, so we overlay one. */
  picture?: boolean;
  lang?: string;
};

function Tile({ item, hidden }: { item: MarqueeItem; hidden?: boolean }) {
  return (
    <Link href={item.href} className="mqTile" tabIndex={hidden ? -1 : undefined} aria-hidden={hidden || undefined} title={item.title}>
      {item.picture ? (
        <span className="mqPicture">
          {item.cover ? <img src={item.cover} alt="" loading="lazy" decoding="async" /> : null}
          <span className="mqPictureTitle" lang={item.lang}>{item.title}</span>
        </span>
      ) : (
        <BookCover src={item.cover} title={item.title} author={item.author} />
      )}
      <span className="mqTag">{item.tag}</span>
    </Link>
  );
}

/** Two rows of covers drifting in opposite directions. Each book appears once; the copy exists only to loop seamlessly. */
export default function HeroMarquee({ rows }: { rows: MarqueeItem[][] }) {
  return (
    <div className="marquee" aria-label="Books on M King Reads">
      {rows.map((row, r) => (
        <div key={r} className={`mqRow${r % 2 ? ' mqReverse' : ''}`} style={{ ['--mq-dur' as string]: `${Math.max(40, row.length * 4.2)}s` } as React.CSSProperties}>
          <div className="mqTrack">
            {row.map(item => <Tile key={item.key} item={item} />)}
            {row.map(item => <Tile key={`${item.key}-loop`} item={item} hidden />)}
          </div>
        </div>
      ))}
    </div>
  );
}
