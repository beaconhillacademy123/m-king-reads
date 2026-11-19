import Link from 'next/link';
export default function NotFound() {
  return <main className="page narrow"><div className="emptyState"><strong>We couldn&apos;t find that page.</strong><p>The book may have moved. Try searching the library.</p><div className="row"><Link className="btn btnGold" href="/explore">Search books</Link><Link className="btn btnGhost" href="/">Home</Link></div></div></main>;
}
