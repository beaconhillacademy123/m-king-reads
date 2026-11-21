import './globals.css';
import type { Metadata, Viewport } from 'next';
import Script from 'next/script';
import { Fraunces, Inter } from 'next/font/google';
import OfflineStatus from './components/OfflineStatus';
import InstallPrompt from './components/InstallPrompt';
import CopyrightNotice from './components/CopyrightNotice';
import AppNav from './components/AppNav';
import BrandSplash from './components/BrandSplash';
import MovedHome from './components/MovedHome';

const display = Fraunces({ subsets: ['latin'], variable: '--font-display', display: 'swap', axes: ['opsz'] });
const sans = Inter({ subsets: ['latin'], variable: '--font-sans', display: 'swap' });

const SITE = process.env.NEXT_PUBLIC_SITE_URL || 'https://mkingreads.promisevisuals.com';
const ADSENSE = process.env.NEXT_PUBLIC_ADSENSE_CLIENT;

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: { default: 'M King Reads — Free books, beautifully read', template: '%s · M King Reads' },
  description: 'Read thousands of free classic and African books on your phone. Save your shelf, keep your place, read offline and listen with Read-Aloud.',
  applicationName: 'M King Reads',
  authors: [{ name: 'PROMISEVISUALS' }],
  creator: 'PROMISEVISUALS',
  publisher: 'PROMISEVISUALS',
  manifest: '/manifest.webmanifest',
  appleWebApp: { capable: true, title: 'M King Reads', statusBarStyle: 'black-translucent' },
  formatDetection: { telephone: false },
  icons: {
    icon: [{ url: '/icon-192.png', sizes: '192x192', type: 'image/png' }, { url: '/icon-512.svg', type: 'image/svg+xml' }],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180' }],
  },
  openGraph: {
    type: 'website', siteName: 'M King Reads', title: 'M King Reads — Free books, beautifully read',
    description: 'Thousands of free books. One beautiful reader. Install it on your phone.', images: ['/og.png'],
  },
  twitter: { card: 'summary_large_image', images: ['/og.png'] },
};

export const viewport: Viewport = {
  themeColor: [{ media: '(prefers-color-scheme: dark)', color: '#0d0e15' }, { media: '(prefers-color-scheme: light)', color: '#0d0e15' }],
  width: 'device-width', initialScale: 1, viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${sans.variable}`} suppressHydrationWarning>
      <body>
        <MovedHome />
        <BrandSplash />
        <AppNav />
        <OfflineStatus />
        <div className="appMain">{children}</div>
        <InstallPrompt />
        <CopyrightNotice />
        <Script id="pwa-register" strategy="afterInteractive">{`if('serviceWorker' in navigator){window.addEventListener('load',function(){navigator.serviceWorker.register('/sw.js').catch(function(){})})}`}</Script>
        {ADSENSE && <Script id="adsense" async strategy="afterInteractive" crossOrigin="anonymous" src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE}`} />}
      </body>
    </html>
  );
}
