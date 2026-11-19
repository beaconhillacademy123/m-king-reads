import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getStory, langMeta } from '../../../../lib/naija';
import StoryReader from './StoryReader';

export const revalidate = 3600;

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const s = await getStory(id);
  if (!s) return { title: 'Story' };
  return { title: `${s.title} — ${langMeta(s.lang)?.name} storybook`, description: s.title_en ? `${s.title_en}, in ${langMeta(s.lang)?.name}. Free picture storybook.` : undefined, openGraph: { images: s.cover_url ? [s.cover_url] : [] } };
}

export default async function StoryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const s = await getStory(id);
  if (!s) notFound();
  return <StoryReader story={s} langName={langMeta(s.lang)?.name ?? s.lang} />;
}
