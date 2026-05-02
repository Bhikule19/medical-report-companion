import Link from 'next/link';

export function Footer() {
  return (
    <footer className="mx-auto mt-12 flex max-w-7xl flex-wrap items-center justify-center gap-4 border-t border-slate-200 px-6 py-4 text-xs text-slate-500">
      <Link href="/privacy" className="underline hover:text-slate-700">
        Privacy
      </Link>
      <Link href="/terms" className="underline hover:text-slate-700">
        Terms
      </Link>
    </footer>
  );
}
