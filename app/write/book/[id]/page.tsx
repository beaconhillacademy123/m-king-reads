import type { Metadata } from 'next';
import BookEditor from './BookEditor';

export const metadata: Metadata = { title: 'Edit novel — Writer Studio', robots: { index: false } };

export default async function EditBookPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <BookEditor id={id} />;
}
