import Link from 'next/link';
import Logo from './Logo';

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footerBrand"><Logo size={34} /><div><strong>M King Reads</strong><span>A growing digital library for curious minds.</span></div></div>
      <div className="footerCols">
        <div><b>Read</b><Link href="/explore">Explore</Link><Link href="/free-books">Open collection</Link><Link href="/genre/african-literature">African literature</Link><Link href="/naija">Naija Languages</Link><Link href="/novels">Naija novels</Link><Link href="/write">Publish your novel</Link><Link href="/suggest-book">Suggest a book</Link><Link href="/teach">For teachers</Link></div>
        <div><b>Account</b><Link href="/library">My library</Link><Link href="/notes">My notes</Link><Link href="/premium">M King Reads Plus</Link><Link href="/profile">Reading stats</Link><Link href="/login">Sign in</Link></div>
        <div><b>Partner</b><Link href="/advertise">Advertise with us</Link><Link href="/support">Support the project</Link><Link href="/copyright">Copyright &amp; sources</Link><Link href="/privacy">Privacy &amp; terms</Link></div>
      </div>
      <div className="pvSignature">
        <span className="pvSigBy">A product of</span>
        <strong>PROMISEVISUALS</strong>
        <span className="pvSigMade"><span className="ng" /> Proudly made in Nigeria</span>
      </div>
      <p className="footerFine">© {new Date().getFullYear()} M King Reads · PROMISEVISUALS. Public-domain texts courtesy of Project Gutenberg volunteers.</p>
    </footer>
  );
}
