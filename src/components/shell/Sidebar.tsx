'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutGrid, MapPin, Settings, Share2, Upload } from 'lucide-react';
import type { Route } from 'next';
import type { ComponentType, SVGProps } from 'react';
import { BrandMark } from './BrandMark';
import { cn } from '@/lib/utils';
import { useSession } from '@/lib/auth/useSession';

export interface SidebarProps {
  onShare: () => void;
  historyCount?: number;
}

interface NavLink {
  href: Route;
  label: string;
  Icon: ComponentType<SVGProps<SVGSVGElement>>;
  badge?: string;
}

const WORKSPACE: NavLink[] = [
  { href: '/' as Route, label: 'Reports', Icon: Upload },
  { href: '/nearby' as Route, label: 'Labs nearby', Icon: MapPin },
  { href: '/dashboard' as Route, label: 'Dashboard', Icon: LayoutGrid },
];

export function Sidebar({ onShare, historyCount }: SidebarProps) {
  const pathname = usePathname();
  const { session } = useSession();

  const displayName =
    (session?.user?.user_metadata?.full_name as string | undefined) ||
    (session?.user?.user_metadata?.name as string | undefined) ||
    (session?.user?.email ? session.user.email.split('@')[0] : 'You');
  const subText = session?.user?.email ?? 'Signed in';
  const initials = getInitials(displayName);

  return (
    <aside
      aria-label="Primary"
      className={cn(
        'flex h-screen w-sidebar shrink-0 flex-col gap-1 border-r border-line bg-surface p-3.5 pt-5',
        'max-md:h-auto max-md:w-full max-md:flex-row max-md:gap-0 max-md:overflow-x-auto max-md:border-r-0 max-md:border-t max-md:p-2',
      )}
    >
      <Link
        href="/"
        className="mb-3 flex items-center gap-2.5 px-2 pb-4 pt-1.5 max-md:hidden"
      >
        <BrandMark size={32} />
        <span className="flex flex-col">
          <span className="text-[15px] font-semibold leading-tight tracking-[-0.01em]">
            Medical Report Companion
          </span>
          <span className="-mt-0.5 text-[11px] text-muted">Plain-language summaries</span>
        </span>
      </Link>

      <p className="px-2.5 pb-1.5 pt-3 text-[11px] font-medium uppercase tracking-[0.08em] text-muted-2 max-md:hidden">
        Workspace
      </p>

      {WORKSPACE.map((item) => (
        <SidebarLink
          key={item.label}
          {...item}
          badge={item.label === 'Dashboard' && historyCount ? String(historyCount) : item.badge}
          active={pathname === item.href}
        />
      ))}

      <p className="mt-auto px-2.5 pb-1.5 pt-3 text-[11px] font-medium uppercase tracking-[0.08em] text-muted-2 max-md:hidden">
        Account
      </p>

      <SidebarButton Icon={Share2} label="Share" onClick={onShare} />
      <SidebarLink
        href={'/settings' as Route}
        label="Settings"
        Icon={Settings}
        active={pathname === '/settings'}
      />

      <div className="mt-2 flex items-center gap-2.5 border-t border-line p-2.5 max-md:hidden">
        <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gradient-to-br from-[#a7bbcb] to-[#6b7c8c] text-[12px] font-semibold text-white">
          {initials}
        </div>
        <div className="min-w-0">
          <div className="truncate text-[13px] font-medium">{displayName}</div>
          <div className="truncate text-[11px] text-muted" title={subText}>
            {subText}
          </div>
        </div>
      </div>
    </aside>
  );
}

interface SidebarLinkProps {
  href: Route;
  label: string;
  Icon: ComponentType<SVGProps<SVGSVGElement>>;
  badge?: string;
  active?: boolean;
}

function SidebarLink({ href, label, Icon, badge, active }: SidebarLinkProps) {
  return (
    <Link
      href={href}
      className={cn(
        'group relative flex items-center gap-2.5 rounded-[10px] px-2.5 py-2 text-[14px] font-medium text-ink-2 transition-colors',
        'hover:bg-surface-2',
        'max-md:flex-col max-md:gap-1 max-md:py-1.5 max-md:text-[11px]',
        active && 'bg-teal-soft text-teal-deep hover:bg-teal-soft',
      )}
      aria-current={active ? 'page' : undefined}
    >
      <Icon
        className={cn('h-[18px] w-[18px] shrink-0 text-muted', active && 'text-teal')}
        strokeWidth={1.8}
        aria-hidden
      />
      <span className="whitespace-nowrap">{label}</span>
      {badge && (
        <span
          className={cn(
            'ml-auto rounded-full bg-bg-deep px-1.5 py-px text-[11px] font-medium text-muted max-md:hidden',
            active && 'bg-white text-teal-deep',
          )}
        >
          {badge}
        </span>
      )}
    </Link>
  );
}

interface SidebarButtonProps {
  Icon: ComponentType<SVGProps<SVGSVGElement>>;
  label: string;
  onClick: () => void;
}

function SidebarButton({ Icon, label, onClick }: SidebarButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex items-center gap-2.5 rounded-[10px] px-2.5 py-2 text-left text-[14px] font-medium text-ink-2 transition-colors hover:bg-surface-2',
        'max-md:flex-col max-md:gap-1 max-md:py-1.5 max-md:text-[11px]',
      )}
    >
      <Icon className="h-[18px] w-[18px] shrink-0 text-muted" strokeWidth={1.8} aria-hidden />
      <span className="whitespace-nowrap">{label}</span>
    </button>
  );
}

function getInitials(name: string): string {
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
