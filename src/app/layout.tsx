import type { Metadata } from 'next';
import { Geist, IBM_Plex_Mono } from 'next/font/google';
import './globals.css';

const geist = Geist({
  subsets: ['latin'],
  variable: '--font-geist',
  weight: ['400', '500', '600', '700'],
  display: 'swap',
});

const plexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  weight: ['400', '500'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Medical Report Companion',
  description: 'Upload your medical report and understand it in your language.',
};

// Set the global font-scale before paint so resized text doesn't flash. The
// scale is consumed by `html { font-size: calc(16px * var(--font-scale)); }`.
const TEXT_SCALE_INIT = `
(function() {
  try {
    var v = localStorage.getItem('text-scale');
    var map = { standard: '1', large: '1.125', 'extra-large': '1.25' };
    var value = map[v] || '1';
    document.documentElement.style.setProperty('--font-scale', value);
  } catch (e) {}
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <script dangerouslySetInnerHTML={{ __html: TEXT_SCALE_INIT }} />
      </head>
      <body
        className={`${geist.variable} ${plexMono.variable} min-h-screen bg-bg text-ink antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
