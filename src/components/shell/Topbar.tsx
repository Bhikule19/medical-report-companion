'use client';

import type { ReactNode } from 'react';
import { Folder } from 'lucide-react';
import { LanguagePicker } from '@/components/LanguagePicker';
import { UserMenu } from '@/components/UserMenu';
import { useSession } from '@/lib/auth/useSession';
import type { Language } from '@/lib/types';
import { cn } from '@/lib/utils';

export interface TopbarProps {
  title: ReactNode;
  crumb?: string;
  /** Extra controls rendered before language picker + user menu. */
  rightSlot?: ReactNode;
  /** Called when the user picks a different display language. */
  onLanguageChange?: (lang: Language) => void;
  /** Disables the language picker while a stream is in flight. */
  langDisabled?: boolean;
  className?: string;
}

export function Topbar({
  title,
  crumb,
  rightSlot,
  onLanguageChange,
  langDisabled,
  className,
}: TopbarProps) {
  const { session } = useSession();

  return (
    <header
      className={cn(
        'flex h-topbar flex-shrink-0 items-center gap-4 border-b border-line bg-surface px-6 max-sm:px-4',
        className,
      )}
    >
      <div className="min-w-0">
        <div className="flex items-center gap-2 text-[16px] font-semibold tracking-[-0.005em]">
          {title}
        </div>
        {crumb && (
          <div className="mt-0.5 flex items-center gap-1.5 text-[12px] text-muted">
            <Folder className="h-[11px] w-[11px]" aria-hidden />
            <span>Home</span>
            <span className="text-line-2">/</span>
            <span className="text-ink-2">{crumb}</span>
          </div>
        )}
      </div>

      <div className="topbar-right ml-auto flex items-center gap-2">
        {rightSlot}
        <LanguagePicker onChange={onLanguageChange} disabled={langDisabled} />
        {session?.user?.email && (
          <UserMenu
            email={session.user.email}
            name={
              (session.user.user_metadata?.full_name as string | undefined) ??
              (session.user.user_metadata?.name as string | undefined) ??
              null
            }
            avatarUrl={(session.user.user_metadata?.avatar_url as string | undefined) ?? null}
          />
        )}
      </div>
    </header>
  );
}
