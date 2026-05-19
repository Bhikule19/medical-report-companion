'use client';

import { motion, type Transition } from 'framer-motion';
import { Calendar, FileText, Globe2, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface DocumentCardProps {
  title: string;
  /** ISO date string. */
  createdAt: string;
  /** Language code (e.g. "en"). */
  language: string;
  /** Short snippet shown on the front paper. Optional. */
  preview?: string | null;
  onOpen: () => void;
  onDelete?: () => void;
}

/**
 * Animated folder card. Idle: closed folder with two paper sheets peeking out;
 * hover: top sheet rises, the back tab tilts slightly forward, shadow deepens.
 * The whole card is clickable to open; the trash icon is a separate target.
 */
export function DocumentCard({
  title,
  createdAt,
  language,
  preview,
  onOpen,
  onDelete,
}: DocumentCardProps) {
  return (
    <motion.article
      initial="rest"
      whileHover="hover"
      whileFocus="hover"
      animate="rest"
      className="group relative h-[240px] cursor-pointer select-none"
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpen();
        }
      }}
      tabIndex={0}
      role="button"
      aria-label={`Open ${title}`}
    >
      <FolderBack />
      <PaperSheet
        depth={2}
        variants={{
          rest: { y: 8, x: 6, rotate: 2, opacity: 0.85 },
          hover: { y: -2, x: 10, rotate: 4, opacity: 1 },
        }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] as const }}
      />
      <PaperSheet
        depth={1}
        variants={{
          rest: { y: 4, x: -6, rotate: -2, opacity: 0.92 },
          hover: { y: -6, x: -10, rotate: -4, opacity: 1 },
        }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] as const, delay: 0.02 }}
      />
      <FrontDocument
        title={title}
        createdAt={createdAt}
        language={language}
        preview={preview}
      />
      <FolderFlap />

      {onDelete && (
        <button
          type="button"
          aria-label={`Delete ${title}`}
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="absolute right-3 top-3 z-30 grid h-7 w-7 place-items-center rounded-md bg-white/80 text-muted opacity-0 shadow-sm transition-opacity hover:bg-red-soft hover:text-red group-hover:opacity-100 group-focus-within:opacity-100"
        >
          <Trash2 className="h-3.5 w-3.5" aria-hidden />
        </button>
      )}
    </motion.article>
  );
}

/** Back panel — folder body. Tilts back slightly on hover. */
function FolderBack() {
  return (
    <motion.div
      aria-hidden
      variants={{
        rest: { rotateX: 0, y: 0 },
        hover: { rotateX: -4, y: -2 },
      }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] as const }}
      style={{ transformOrigin: 'bottom center', transformStyle: 'preserve-3d' }}
      className="absolute inset-x-0 bottom-0 top-3 rounded-[14px] border border-teal-tint bg-gradient-to-b from-teal-soft to-teal-tint shadow-sm"
    >
      {/* Folder tab on the back (lighter than the front flap). */}
      <span className="absolute -top-3 left-6 h-6 w-24 rounded-t-[10px] border-x border-t border-teal-tint bg-teal-soft" />
      {/* Inner shadow lip — gives the folder a sense of depth. */}
      <span className="absolute inset-x-2 top-2 h-1 rounded-full bg-teal-deep/10" />
    </motion.div>
  );
}

interface PaperSheetProps {
  depth: 1 | 2;
  variants: {
    rest: { y: number; x: number; rotate: number; opacity: number };
    hover: { y: number; x: number; rotate: number; opacity: number };
  };
  transition: Transition;
}

/** Off-white paper that peeks out from inside the folder. */
function PaperSheet({ depth, variants, transition }: PaperSheetProps) {
  return (
    <motion.div
      aria-hidden
      variants={variants}
      transition={transition}
      className={cn(
        'absolute inset-x-6 top-7 h-[160px] rounded-[10px] border border-line bg-surface',
        depth === 1 ? 'shadow-sm' : 'shadow-none',
      )}
    >
      {/* Faint text lines on the peeking paper to read as a document. */}
      <span className="absolute left-4 right-10 top-5 h-[3px] rounded-full bg-line-2" />
      <span className="absolute left-4 right-16 top-10 h-[3px] rounded-full bg-line" />
      <span className="absolute left-4 right-8 top-14 h-[3px] rounded-full bg-line" />
    </motion.div>
  );
}

interface FrontDocumentProps {
  title: string;
  createdAt: string;
  language: string;
  preview?: string | null;
}

/** The headline document — content the user actually reads. */
function FrontDocument({ title, createdAt, language, preview }: FrontDocumentProps) {
  return (
    <motion.div
      variants={{
        rest: { y: 0, rotate: 0 },
        hover: { y: -14, rotate: 0 },
      }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] as const }}
      className="absolute inset-x-4 top-6 z-20 flex h-[190px] flex-col gap-2.5 rounded-[12px] border border-line bg-white p-4 shadow-sm transition-shadow group-hover:shadow-lg"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-teal-soft text-teal-deep">
          <FileText className="h-4 w-4" strokeWidth={1.8} aria-hidden />
        </div>
        <span className="inline-flex items-center gap-1 rounded-md bg-teal-soft px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-teal-deep">
          <Globe2 className="h-3 w-3" aria-hidden />
          {language}
        </span>
      </div>

      <h3 className="line-clamp-2 text-[14.5px] font-semibold leading-snug tracking-[-0.005em] text-ink">
        {title}
      </h3>

      {preview && (
        <p className="line-clamp-3 text-[12px] leading-snug text-muted">{preview}</p>
      )}

      <p className="mt-auto inline-flex items-center gap-1.5 text-[11px] text-muted-2">
        <Calendar className="h-3 w-3" aria-hidden />
        <time dateTime={createdAt}>{formatDate(createdAt)}</time>
      </p>
    </motion.div>
  );
}

/** Front flap of the folder — sits above the front document at the bottom. */
function FolderFlap() {
  return (
    <motion.div
      aria-hidden
      variants={{
        rest: { y: 0 },
        hover: { y: 6 },
      }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] as const }}
      className="pointer-events-none absolute inset-x-0 bottom-0 z-30 h-[42px] rounded-b-[14px] border-x border-b border-teal-tint bg-gradient-to-b from-teal-tint/70 to-teal-tint shadow-[0_-4px_8px_rgb(15_31_42/0.04)]"
    >
      <span className="absolute inset-x-0 top-0 h-px bg-teal/15" />
    </motion.div>
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}
