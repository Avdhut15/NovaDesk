import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios, { isAxiosError } from 'axios';

// ─── Types ────────────────────────────────────────────────────────────────────

type TicketStatus = 'OPEN' | 'RESOLVED' | 'CLOSED';
type TicketCategory = 'GENERAL_QUESTION' | 'TECHNICAL_QUESTION' | 'REFUND_REQUEST';

interface TicketRecord {
  id: string;
  subject: string;
  status: TicketStatus;
  category: TicketCategory;
  fromEmail: string | null;
  fromName: string | null;
  emailThreadId: string | null;
  createdAt: string;
  updatedAt: string;
  assignedAgent: { id: string; name: string; email: string } | null;
  createdBy: { id: string; name: string; email: string } | null;
  _count: { replies: number };
}

interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

type StatusFilter = 'ALL' | TicketStatus;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatCategory(cat: TicketCategory): string {
  return { GENERAL_QUESTION: 'General', TECHNICAL_QUESTION: 'Technical', REFUND_REQUEST: 'Refund' }[cat];
}

function getInitials(name: string): string {
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: TicketStatus }) {
  const config = {
    OPEN: { label: 'Open', dot: 'bg-blue-500', pill: 'bg-blue-50 text-blue-700 ring-blue-200' },
    RESOLVED: { label: 'Resolved', dot: 'bg-green-500', pill: 'bg-green-50 text-green-700 ring-green-200' },
    CLOSED: { label: 'Closed', dot: 'bg-muted-foreground/40', pill: 'bg-muted text-muted-foreground ring-border' },
  }[status];

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${config.pill}`}>
      <span className={`size-1.5 rounded-full ${config.dot}`} />
      {config.label}
    </span>
  );
}

function CategoryBadge({ category }: { category: TicketCategory }) {
  return (
    <span className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground ring-1 ring-inset ring-border">
      {formatCategory(category)}
    </span>
  );
}

function FilterTab({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
        active
          ? 'bg-accent text-accent-foreground'
          : 'text-muted-foreground hover:text-foreground hover:bg-muted'
      }`}
    >
      {label}
      <span
        className={`rounded-full px-1.5 py-px text-xs font-semibold tabular-nums ${
          active
            ? 'bg-primary/15 text-primary'
            : 'bg-muted-foreground/15 text-muted-foreground'
        }`}
      >
        {count}
      </span>
    </button>
  );
}

function SkeletonRow() {
  return (
    <tr className="border-b border-border last:border-0">
      {[280, 80, 80, 100, 80].map((w, i) => (
        <td key={i} className="px-4 py-3.5">
          <div className="h-4 rounded bg-muted animate-pulse" style={{ width: w }} />
        </td>
      ))}
    </tr>
  );
}

// ─── Data fetching ────────────────────────────────────────────────────────────

async function fetchTickets(params: {
  status?: TicketStatus;
  page: number;
  limit: number;
}): Promise<{ tickets: TicketRecord[]; pagination: PaginationMeta; counts: Record<string, number> }> {
  const query = new URLSearchParams({ page: String(params.page), limit: String(params.limit) });
  if (params.status) query.set('status', params.status);

  const { data } = await axios.get<{
    success: boolean;
    data: TicketRecord[];
    pagination: PaginationMeta;
  }>(`/api/tickets?${query}`, { withCredentials: true });

  // fetch counts for all statuses for the tab badges (only on full load, not filtered)
  let counts: Record<string, number> = {};
  if (!params.status) {
    counts.ALL = data.pagination.total;
  }

  return { tickets: data.data ?? [], pagination: data.pagination, counts };
}

async function fetchAllCounts(): Promise<Record<StatusFilter, number>> {
  const [all, open, resolved, closed] = await Promise.all([
    axios.get<{ pagination: PaginationMeta }>('/api/tickets?limit=1', { withCredentials: true }),
    axios.get<{ pagination: PaginationMeta }>('/api/tickets?limit=1&status=OPEN', { withCredentials: true }),
    axios.get<{ pagination: PaginationMeta }>('/api/tickets?limit=1&status=RESOLVED', { withCredentials: true }),
    axios.get<{ pagination: PaginationMeta }>('/api/tickets?limit=1&status=CLOSED', { withCredentials: true }),
  ]);
  return {
    ALL: all.data.pagination.total,
    OPEN: open.data.pagination.total,
    RESOLVED: resolved.data.pagination.total,
    CLOSED: closed.data.pagination.total,
  };
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function TicketsPage() {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const LIMIT = 25;

  const ticketsQuery = useQuery({
    queryKey: ['tickets', statusFilter, page],
    queryFn: () =>
      fetchTickets({
        status: statusFilter === 'ALL' ? undefined : statusFilter,
        page,
        limit: LIMIT,
      }),
  });

  const countsQuery = useQuery({
    queryKey: ['ticket-counts'],
    queryFn: fetchAllCounts,
    staleTime: 30_000,
  });

  const tickets = ticketsQuery.data?.tickets ?? [];
  const pagination = ticketsQuery.data?.pagination;
  const counts = countsQuery.data;

  const errorMessage = isAxiosError(ticketsQuery.error)
    ? (ticketsQuery.error.response?.data as { error?: string })?.error ?? ticketsQuery.error.message
    : ticketsQuery.error?.message ?? null;

  // Client-side search filter (within the current page)
  const filtered = search.trim()
    ? tickets.filter((t) => {
        const q = search.trim().toLowerCase();
        return (
          t.subject.toLowerCase().includes(q) ||
          (t.fromEmail?.toLowerCase().includes(q) ?? false) ||
          (t.fromName?.toLowerCase().includes(q) ?? false)
        );
      })
    : tickets;

  const handleFilterChange = (f: StatusFilter) => {
    setStatusFilter(f);
    setPage(1);
  };

  return (
    <div>
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Tickets</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Manage and respond to support tickets
          </p>
        </div>
        {pagination && !ticketsQuery.isLoading && (
          <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-semibold text-muted-foreground tabular-nums">
            {counts?.ALL ?? pagination.total} total
          </span>
        )}
      </div>

      {/* ── Card ───────────────────────────────────────────────────────────── */}
      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">

        {/* Toolbar */}
        <div className="flex flex-col gap-3 border-b border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          {/* Status filter tabs */}
          <div className="flex items-center gap-0.5">
            {(
              [
                { key: 'ALL', label: 'All' },
                { key: 'OPEN', label: 'Open' },
                { key: 'RESOLVED', label: 'Resolved' },
                { key: 'CLOSED', label: 'Closed' },
              ] as { key: StatusFilter; label: string }[]
            ).map(({ key, label }) => (
              <FilterTab
                key={key}
                label={label}
                count={counts?.[key] ?? 0}
                active={statusFilter === key}
                onClick={() => handleFilterChange(key)}
              />
            ))}
          </div>

          {/* Search */}
          <div className="relative">
            <svg
              className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
            <input
              id="tickets-search"
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search subject, email, name…"
              className="h-8 w-full rounded-md border border-input bg-background pl-8 pr-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/50 focus:border-ring sm:w-64"
            />
          </div>
        </div>

        {/* Error banner */}
        {errorMessage && (
          <div className="flex items-center gap-2 px-4 py-3 text-sm text-destructive bg-destructive/5 border-b border-destructive/10">
            <svg className="size-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 8v4m0 4h.01" />
            </svg>
            {errorMessage}
          </div>
        )}

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Ticket
                </th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide hidden sm:table-cell">
                  Status
                </th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide hidden md:table-cell">
                  Category
                </th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide hidden lg:table-cell">
                  Assignee
                </th>
                <th className="px-4 py-2.5 text-right text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Created
                </th>
              </tr>
            </thead>
            <tbody>
              {/* Loading skeletons */}
              {ticketsQuery.isLoading &&
                Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} />)}

              {/* Rows */}
              {!ticketsQuery.isLoading &&
                filtered.map((t) => (
                  <tr
                    key={t.id}
                    className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors cursor-pointer"
                  >
                    {/* Subject + sender */}
                    <td className="px-4 py-3.5 max-w-xs">
                      <div className="flex items-start gap-3">
                        {/* Sender avatar */}
                        <div className="size-8 shrink-0 rounded-full bg-primary/10 text-primary text-xs font-semibold flex items-center justify-center select-none mt-0.5">
                          {t.fromName
                            ? getInitials(t.fromName)
                            : t.fromEmail
                            ? t.fromEmail[0].toUpperCase()
                            : '?'}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-foreground truncate leading-snug">
                            {t.subject}
                          </p>
                          <p className="text-xs text-muted-foreground truncate mt-0.5">
                            {t.fromName
                              ? `${t.fromName}${t.fromEmail ? ` · ${t.fromEmail}` : ''}`
                              : t.fromEmail ?? 'Manual ticket'}
                          </p>
                          {/* Status badge visible on mobile */}
                          <div className="mt-1.5 flex items-center gap-1.5 sm:hidden">
                            <StatusBadge status={t.status} />
                            {t._count.replies > 0 && (
                              <span className="text-xs text-muted-foreground">
                                {t._count.replies} {t._count.replies === 1 ? 'reply' : 'replies'}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3.5 hidden sm:table-cell">
                      <div className="flex flex-col gap-1">
                        <StatusBadge status={t.status} />
                        {t._count.replies > 0 && (
                          <span className="text-xs text-muted-foreground tabular-nums">
                            {t._count.replies} {t._count.replies === 1 ? 'reply' : 'replies'}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Category */}
                    <td className="px-4 py-3.5 hidden md:table-cell">
                      <CategoryBadge category={t.category} />
                    </td>

                    {/* Assignee */}
                    <td className="px-4 py-3.5 hidden lg:table-cell">
                      {t.assignedAgent ? (
                        <div className="flex items-center gap-2">
                          <div className="size-6 shrink-0 rounded-full bg-muted text-muted-foreground text-[10px] font-semibold flex items-center justify-center">
                            {getInitials(t.assignedAgent.name)}
                          </div>
                          <span className="text-sm text-foreground truncate max-w-[120px]">
                            {t.assignedAgent.name}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">Unassigned</span>
                      )}
                    </td>

                    {/* Created */}
                    <td className="px-4 py-3.5 text-right text-xs text-muted-foreground whitespace-nowrap tabular-nums">
                      {formatRelativeTime(t.createdAt)}
                    </td>
                  </tr>
                ))}

              {/* Empty state */}
              {!ticketsQuery.isLoading && !errorMessage && filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-14 text-center">
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <svg className="size-9 opacity-30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                      </svg>
                      <p className="text-sm font-medium">
                        {search ? `No tickets match "${search}"` : `No ${statusFilter === 'ALL' ? '' : statusFilter.toLowerCase() + ' '}tickets`}
                      </p>
                      {!search && statusFilter === 'ALL' && (
                        <p className="text-xs">Tickets created via email ingest or manually will appear here.</p>
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-border px-4 py-3">
            <p className="text-xs text-muted-foreground tabular-nums">
              Showing {(pagination.page - 1) * pagination.limit + 1}–
              {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="inline-flex h-7 items-center justify-center rounded-md border border-input px-2.5 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-40 transition-colors"
              >
                ← Prev
              </button>
              {Array.from({ length: pagination.totalPages }, (_, i) => i + 1)
                .filter((p) => p === 1 || p === pagination.totalPages || Math.abs(p - page) <= 1)
                .reduce<(number | '…')[]>((acc, p, idx, arr) => {
                  if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push('…');
                  acc.push(p);
                  return acc;
                }, [])
                .map((p, i) =>
                  p === '…' ? (
                    <span key={`ellipsis-${i}`} className="px-1 text-xs text-muted-foreground">…</span>
                  ) : (
                    <button
                      key={p}
                      onClick={() => setPage(p as number)}
                      className={`inline-flex h-7 w-7 items-center justify-center rounded-md text-xs font-medium transition-colors ${
                        page === p
                          ? 'bg-primary text-primary-foreground'
                          : 'border border-input text-muted-foreground hover:bg-muted hover:text-foreground'
                      }`}
                    >
                      {p}
                    </button>
                  )
                )}
              <button
                onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                disabled={page >= pagination.totalPages}
                className="inline-flex h-7 items-center justify-center rounded-md border border-input px-2.5 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-40 transition-colors"
              >
                Next →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
