import type { Metadata } from 'next';
import WriterStudio from './WriterStudio';

export const metadata: Metadata = {
  title: 'Writer Studio — publish your novel',
  description: 'Publish your Yorùbá, Hausa, Igbo, Pidgin or English novel on M King Reads, chapter by chapter, and earn from every sale.',
};

export default function WritePage() {
  return <WriterStudio />;
}
