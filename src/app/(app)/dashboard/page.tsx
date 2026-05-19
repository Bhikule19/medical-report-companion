'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LayoutGrid, Plus, Search } from 'lucide-react';
import { Topbar } from '@/components/shell/Topbar';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { DocumentCard } from '@/components/DocumentCard';
import { useSession } from '@/lib/auth/useSession';
import { getBrowserSupabase } from '@/lib/supabase/browserClient';
import {
  deleteReport,
  getReport,
  listReports,
  type ReportSummaryRow,
} from '@/lib/db/reports';
import { listMessagesForReport } from '@/lib/db/messages';
import { useReportStore } from '@/store/useReportStore';
import type { Language } from '@/lib/types';

export default function DashboardPage() {
  const router = useRouter();
  const { session } = useSession();
  const supabase = getBrowserSupabase();

  const [rows, setRows] = useState<ReportSummaryRow[]>([]);
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [pendingDelete, setPendingDelete] = useState<ReportSummaryRow | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const refresh = useCallback(
    async (userId: string) => {
      setLoading(true);
      try {
        const next = await listReports(supabase, userId);
        setRows(next);
        useReportStore.getState().setHistoryList(next);
        setError(null);
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setLoading(false);
      }
    },
    [supabase],
  );

  useEffect(() => {
    if (session?.user?.id) refresh(session.user.id);
  }, [session?.user?.id, refresh]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        (r.title ?? '').toLowerCase().includes(q) || r.target_lang.includes(q),
    );
  }, [rows, search]);

  async function openReport(id: string) {
    if (!session) return;
    try {
      const [row, msgs] = await Promise.all([
        getReport(supabase, id),
        listMessagesForReport(supabase, id),
      ]);
      useReportStore.getState().setLanguage(row.target_lang as Language);
      useReportStore.getState().loadReport(
        {
          id: row.id,
          originalText: row.extracted_text,
          pageCount: row.page_count,
          sourceLang: (row.source_lang ?? row.target_lang) as Language,
        },
        msgs.map((m) => ({ role: m.role, content: m.content })),
      );
      router.push('/');
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function confirmDelete() {
    if (!pendingDelete || !session) return;
    setDeleteBusy(true);
    setDeleteError(null);
    try {
      await deleteReport(supabase, pendingDelete.id);
      const active = useReportStore.getState().report;
      if (active?.id === pendingDelete.id) useReportStore.getState().clearReport();
      await refresh(session.user.id);
      setPendingDelete(null);
    } catch (e) {
      setDeleteError((e as Error).message);
    } finally {
      setDeleteBusy(false);
    }
  }

  return (
    <>
      <Topbar
        title={
          <>
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-teal-soft text-teal-deep">
              <LayoutGrid className="h-3.5 w-3.5" aria-hidden />
            </span>
            Dashboard
          </>
        }
        crumb="Reports"
        rightSlot={
          <button
            type="button"
            onClick={() => {
              useReportStore.getState().clearReport();
              router.push('/');
            }}
            className="inline-flex items-center gap-1.5 rounded-md bg-teal px-3 py-1.5 text-[12px] font-medium text-white hover:bg-teal-deep"
          >
            <Plus className="h-3.5 w-3.5" aria-hidden />
            New report
          </button>
        }
      />

      <div className="flex-1 overflow-y-auto px-8 py-7 max-sm:px-4 max-sm:py-4">
        <div className="mx-auto flex max-w-[1200px] flex-col gap-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-[18px] font-semibold tracking-[-0.005em]">
                Your reports
              </h2>
              <p className="mt-0.5 text-[13px] text-muted">
                {loading
                  ? 'Loading…'
                  : `${rows.length} report${rows.length === 1 ? '' : 's'} saved on this account.`}
              </p>
            </div>
            <div className="relative max-w-xs flex-1">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted"
                aria-hidden
              />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search reports…"
                aria-label="Search reports"
                className="w-full rounded-md border border-line-2 bg-surface py-2 pl-9 pr-3 text-[13px] text-ink-2 outline-none placeholder:text-muted-2 focus:border-teal"
              />
            </div>
          </div>

          {error && (
            <p role="alert" className="rounded-md bg-red-soft px-3.5 py-2 text-[13px] text-red">
              {error}
            </p>
          )}

          {loading && rows.length === 0 ? (
            <ul aria-hidden className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <li
                  key={i}
                  className="h-[240px] animate-pulse rounded-[14px] border border-line bg-surface"
                />
              ))}
            </ul>
          ) : filtered.length === 0 ? (
            <EmptyState hasFilter={search.trim().length > 0} />
          ) : (
            <ul className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {filtered.map((row) => (
                <li key={row.id}>
                  <DocumentCard
                    title={row.title ?? 'Untitled report'}
                    createdAt={row.created_at}
                    language={row.target_lang.toUpperCase()}
                    onOpen={() => openReport(row.id)}
                    onDelete={() => {
                      setDeleteError(null);
                      setPendingDelete(row);
                    }}
                  />
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={!!pendingDelete}
        title="Delete this report?"
        body={`"${pendingDelete?.title ?? 'Untitled report'}" and its conversation will be removed permanently.`}
        confirmLabel="Delete"
        confirmTone="danger"
        pending={deleteBusy}
        error={deleteError}
        onConfirm={confirmDelete}
        onCancel={() => {
          if (deleteBusy) return;
          setPendingDelete(null);
          setDeleteError(null);
        }}
      />
    </>
  );
}

function EmptyState({ hasFilter }: { hasFilter: boolean }) {
  return (
    <div className="grid place-items-center rounded-md border border-dashed border-line-2 bg-surface px-6 py-14 text-center">
      <div className="mb-3 grid h-10 w-10 place-items-center rounded-md bg-teal-soft text-teal-deep">
        <LayoutGrid className="h-5 w-5" strokeWidth={1.5} aria-hidden />
      </div>
      <p className="text-[14px] font-semibold">
        {hasFilter ? 'No matches' : 'No reports yet'}
      </p>
      <p className="mt-1 max-w-sm text-[13px] text-muted">
        {hasFilter
          ? 'Try a different keyword or clear the search.'
          : 'Upload your first report from the Reports tab. It will land here so you can come back to it.'}
      </p>
    </div>
  );
}
