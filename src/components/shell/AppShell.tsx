'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { ShareModal } from './ShareModal';
import { Toast } from './Toast';
import { useReportStore } from '@/store/useReportStore';

export interface AppShellProps {
  children: ReactNode;
}

/**
 * App-wide chrome: sidebar + main column. Pages render their own Topbar so
 * each route can supply its own title, breadcrumbs, and right-side controls.
 */
export function AppShell({ children }: AppShellProps) {
  const [shareOpen, setShareOpen] = useState(false);
  const [toast, setToast] = useState<string>('');
  const historyCount = useReportStore((s) => s.historyList.length);

  useEffect(() => {
    function openShare() {
      setShareOpen(true);
    }
    window.addEventListener('app:share', openShare);
    return () => window.removeEventListener('app:share', openShare);
  }, []);

  return (
    <div className="grid h-screen grid-cols-[15rem_1fr] bg-bg max-md:grid-cols-1 max-md:grid-rows-[1fr_auto]">
      <Sidebar onShare={() => setShareOpen(true)} historyCount={historyCount} />

      <div className="flex min-w-0 flex-col overflow-hidden max-md:row-start-1">{children}</div>

      {shareOpen && (
        <ShareModal
          onClose={() => setShareOpen(false)}
          onToast={(m) => setToast(m)}
        />
      )}
      <Toast message={toast} onDone={() => setToast('')} />
    </div>
  );
}
