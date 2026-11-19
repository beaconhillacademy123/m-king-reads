import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import type { Book } from '../../lib/booknest';
import BookTile from './BookTile';

export default function Rail({ title, kicker, href, books, ranked = false, vibes = false, subtitle }: {
  title: string; kicker?: string; href?: string; books: Book[]; ranked?: boolean; vibes?: boolean; subtitle?: string;
}) {
  if (!books.length) return null;
  return (
    <section className="rail">
      <div className="railHead">
        <div>{kicker && <span className="kicker">{kicker}</span>}<h2>{title}</h2>{subtitle && <p className="railSub">{subtitle}</p>}</div>
        {href && <Link href={href} className="railMore">See all <ChevronRight size={16} /></Link>}
      </div>
      <div className="railTrack">
        {books.map((b, i) => <BookTile key={b.id} book={b} rank={ranked ? i + 1 : undefined} vibe={vibes} />)}
      </div>
    </section>
  );
}
