import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getNovel } from '../../../../lib/novels';
import ChapterReader from './ChapterReader';

export const revalidate = 60;

export async function generateMetadata({ params }: { params: Promise<{ id: string; position: string }> }): Promise<Metadata> {
  const { id, position } = await params;
  const n = await getNovel(id);
  return n ? { title: `${n.title} · Chapter ${position}` } : { title: 'Chapter' };
}

export default async function ChapterPage({ params }: { params: Promise<{ id: string; position: string }> }) {
  const { id, position } = await params;
  const pos = Number(position);
  const n = await getNovel(id);
  if (!n || !Number.isInteger(pos) || pos < 1) notFound();
  return <ChapterReader book={{ id: n.id, title: n.title, language: n.language, access: n.access, price_ngn: n.price_ngn, author: n.booknest_authors?.pen_name ?? '' }} position={pos} />;
}
