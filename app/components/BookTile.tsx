import Link from 'next/link';
import BookCover from './BookCover';
import type { Book } from '../../lib/booknest';
import { getGenre } from '../../lib/booknest';

export default function BookTile({ book, rank, wide = false, vibe = false }: { book: Book; rank?: number; wide?: boolean; vibe?: boolean }) {
  const genre = getGenre(book);
  return (
    <Link href={`/book/${book.id}`} className={`tile${wide ? ' tileWide' : ''}`} aria-label={`${book.title} by ${book.author}`}>
      <div className="tileCoverWrap">
        {typeof rank === 'number' && <span className="tileRank">{rank}</span>}
        <BookCover src={book.cover_url} title={book.title} author={book.author} />
      </div>
      <div className="tileText">
        <strong>{book.title}</strong>
        <span>{book.author}</span>
        {vibe && book.vibe && <em className="vibe">{book.vibe}</em>}
        {wide && genre && <em>{genre.icon} {genre.name}</em>}
      </div>
    </Link>
  );
}
