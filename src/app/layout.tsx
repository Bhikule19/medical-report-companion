import type { Metadata } from 'next';
import { Inter, Manrope } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const manrope = Manrope({
  subsets: ['latin'],
  variable: '--font-manrope',
  display: 'swap',
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
        className={`${inter.variable} ${manrope.variable} min-h-screen bg-surface text-on-surface antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
