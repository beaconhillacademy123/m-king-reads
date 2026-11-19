import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getCourse, langMeta } from '../../../../../lib/naija';
import LessonPlayer from './LessonPlayer';

export const revalidate = 3600;

export async function generateMetadata({ params }: { params: Promise<{ lang: string; position: string }> }): Promise<Metadata> {
  const { lang, position } = await params;
  return { title: `${langMeta(lang)?.name ?? ''} lesson ${position}`, robots: { index: Number(position) <= 3 } };
}

export default async function LessonPage({ params }: { params: Promise<{ lang: string; position: string }> }) {
  const { lang, position } = await params;
  const l = langMeta(lang);
  const course = l ? await getCourse(lang) : null;
  const lessons = course?.booknest_lang_lessons ?? [];
  const pos = Number(position);
  const lesson = lessons.find(x => x.position === pos);
  if (!l || !course || !lesson) notFound();
  return (
    <LessonPlayer lang={lang} langName={l.name} courseTitle={course.title} bookUrl={course.book_url} source={course.source}
      freeLessons={course.free_lessons} lesson={lesson} total={lessons.length}
      prev={lessons.find(x => x.position === pos - 1)?.position ?? null} next={lessons.find(x => x.position === pos + 1)?.position ?? null} />
  );
}
