'use client';

import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { AnimatePresence, motion } from 'framer-motion';
import { LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { signOut } from '@/lib/auth/signOut';
import { cn } from '@/lib/utils';

export interface UserMenuProps {
  email: string;
  name?: string | null;
  avatarUrl?: string | null;
}

export function UserMenu({ email, name, avatarUrl }: UserMenuProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  async function handleSignOut() {
    await signOut();
    router.replace('/sign-in');
  }

  const displayName = name?.trim() || email.split('@')[0];
  const initials = getInitials(displayName);

  return (
    <DropdownMenu.Root open={open} onOpenChange={setOpen}>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          aria-label="Open profile menu"
          className={cn(
            'inline-flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-outline-variant bg-surface-container-lowest transition-all hover:-translate-y-px hover:border-outline hover:shadow-card',
            'data-[state=open]:border-secondary data-[state=open]:shadow-card',
          )}
        >
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatarUrl}
              alt=""
              width={40}
              height={40}
              className="h-full w-full object-cover"
              referrerPolicy="no-referrer"
            />
          ) : (
            <span className="font-display text-body-md font-semibold text-on-surface">
              {initials}
            </span>
          )}
        </button>
      </DropdownMenu.Trigger>

      <AnimatePresence>
        {open && (
          <DropdownMenu.Portal forceMount>
            <DropdownMenu.Content asChild align="end" sideOffset={8}>
              <motion.div
                initial={{ opacity: 0, scale: 0.96, y: -4 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.97, y: -2 }}
                transition={{ duration: 0.15, ease: [0.22, 1, 0.36, 1] }}
                className="z-50 w-72 origin-top-right rounded-lg border border-outline-variant bg-surface-container-lowest p-2 shadow-card-hover focus:outline-none"
              >
                <div className="flex items-start gap-3 px-2 pb-2 pt-1">
                  <div className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-full border border-outline-variant bg-surface-container">
                    {avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={avatarUrl}
                        alt=""
                        width={40}
                        height={40}
                        className="h-full w-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <span className="font-display text-body-md font-semibold text-on-surface">
                        {initials}
                      </span>
                    )}
                  </div>
                  <div className="flex min-w-0 flex-col">
                    <span className="truncate text-body-md font-medium text-on-surface">
                      {displayName}
                    </span>
                    <span
                      className="truncate text-label-caps normal-case tracking-normal text-on-surface-variant"
                      title={email}
                    >
                      {email}
                    </span>
                  </div>
                </div>

                <DropdownMenu.Separator className="my-1 h-px bg-outline-variant" />

                <DropdownMenu.Item
                  onSelect={() => {
                    setOpen(false);
                    void handleSignOut();
                  }}
                  className="flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-body-md text-on-surface outline-none transition-colors data-[highlighted]:bg-error-container data-[highlighted]:text-on-error-container"
                >
                  <LogOut className="h-4 w-4" aria-hidden />
                  Sign out
                </DropdownMenu.Item>
              </motion.div>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        )}
      </AnimatePresence>
    </DropdownMenu.Root>
  );
}

function getInitials(text: string): string {
  const parts = text.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
