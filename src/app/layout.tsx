import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Medical Report Companion',
  description: 'Upload your medical report and understand it in your language.',
};

const TEXT_SCALE_INIT = `
(function() {
  try {
    var v = localStorage.getItem('text-scale');
    var map = { standard: '1.125', large: '1.4', 'extra-large': '1.625' };
    var value = map[v] || '1.125';
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
        className={`${geistSans.variable} ${geistMono.variable} min-h-screen bg-slate-50 text-slate-900 antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
