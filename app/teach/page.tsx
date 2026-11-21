import type { Metadata } from 'next';
import TeacherLists from './TeacherLists';
import Footer from '../components/Footer';

export const metadata: Metadata = {
  title: 'Reading lists for teachers — share free books with your class',
  description: 'Pick free books, put them in a class reading list and share one link with your students on WhatsApp. Free for teachers in Nigeria and everywhere.',
  alternates: { canonical: '/teach' },
};

export default function TeachPage() {
  return (
    <main className="page">
      <div className="pageHead">
        <span className="kicker">FOR TEACHERS</span>
        <h1>Class reading lists</h1>
        <p>Pick the books, share one link with your class. Students open it on any phone and start reading free — no app download and no account needed.</p>
      </div>
      <TeacherLists />
      <Footer />
    </main>
  );
}
