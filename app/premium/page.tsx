import type { Metadata } from 'next';
import PremiumClient from './PremiumClient';

export const metadata: Metadata = {
  title: 'M King Reads Plus',
  description: 'Ad-free reading, offline downloads, Read-Aloud, premium themes and reading stats. From ₦1,000 a month.',
};

export default function PremiumPage() {
  return <PremiumClient />;
}
