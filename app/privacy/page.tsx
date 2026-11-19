import type { Metadata } from 'next';
import Footer from '../components/Footer';

export const metadata: Metadata = { title: 'Privacy & terms' };

export default function PrivacyPage() {
  return (
    <main className="page narrow prose">
      <span className="kicker">LEGAL</span>
      <h1>Privacy policy &amp; terms of use</h1>
      <p className="dim">Last updated 19 November 2026</p>
      <h2>What we collect</h2>
      <p>When you create an account we store your email address, the books you save, your reading progress, bookmarks and how many minutes you read each day. If you pay for Plus, support the project or book an advert, we store the amount, the transfer reference and any name or note you give us.</p>
      <h2>How we use it</h2>
      <p>Only to run M King Reads: syncing your library between devices, showing your reading stats, confirming payments and switching on Plus. We do not sell your data. Sponsored cards count anonymous views and clicks; if Google AdSense is enabled, Google may use cookies to show ads, as described in Google&apos;s policies.</p>
      <h2>Payments</h2>
      <p>Payments are made by bank transfer to the account shown in the app. Plus is not a recurring charge: it simply expires at the end of the period you paid for. If a payment cannot be matched we will contact you by email. Refunds for unconfirmed or mistaken transfers can be requested by email.</p>
      <h2>Books and copyright</h2>
      <p>Books come from Project Gutenberg and other lawful sources. Copyright status differs by country; you are responsible for using works lawfully where you live. See our Copyright &amp; Sources page.</p>
      <h2>Your choices</h2>
      <p>You can delete saved books at any time and ask us to delete your account and data by emailing uchepromiseok@gmail.com.</p>
      <h2>Contact</h2>
      <p>M King Reads · uchepromiseok@gmail.com</p>
      <Footer />
    </main>
  );
}
