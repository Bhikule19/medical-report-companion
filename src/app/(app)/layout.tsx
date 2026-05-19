import type { ReactNode } from 'react';
import { AppShell } from '@/components/shell/AppShell';
import { AuthGate } from '@/components/AuthGate';

export default function AuthedShellLayout({ children }: { children: ReactNode }) {
  return (
    <AuthGate>
      <AppShell>{children}</AppShell>
    </AuthGate>
  );
}
