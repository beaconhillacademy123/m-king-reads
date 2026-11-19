import type { Metadata } from 'next';
import NotesList from './NotesList';

export const metadata: Metadata = { title: 'My notes', robots: { index: false } };

export default function NotesPage() {
  return <NotesList />;
}
