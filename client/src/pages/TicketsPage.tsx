import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios, { isAxiosError } from 'axios';
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  createColumnHelper,
  type SortingState,
} from '@tanstack/react-table';

// ─── Types ────────────────────────────────────────────────────────────────────

type TicketStatus = 'OPEN' | 'RESOLVED' | 'CLOSED';
type TicketCategory = 'GENERAL_QUESTION' | 'TECHNICAL_QUESTION' | 'REFUND_REQUEST';

/** Columns the server accepts as sortBy values (mirrors TicketSortByEnum). */
type SortableColumn = 'createdAt' | 'updatedAt' | 'subject' | 'status' | 'category' | 'fromEmail';

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
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatCategory(cat: TicketCategory): string {
  return { GENERAL_QUESTION: 'General', TECHNICAL_QUESTION: 'Technical', REFUND_REQUEST: 'Refund' }[cat];
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: TicketStatus }) {
  const config = {
    OPEN: { label: 'Open', dot: 'bg-blue-500', pill: 'bg-blue-50 text-blue-700 ring-blue-200' },
    RESOLVED: { label: 'Resolved', dot: 'bg-green-500', pill: 'bg-green-50 text-green-700 ring-green-200' },
    CLOSED: { label: 'Closed', dot: 'bg-muted-foreground/40', pill: 'bg-muted text-muted-foreground ring-border' },
  }[status];

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${config.pill}`}
    >
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

/** Sort direction indicator rendered in column headers. */
function SortIcon({ direction }: { direction: 'asc' | 'desc' | false }) {
  if (!direction)
    return <span className="ml-1 text-[10px] text-muted-foreground/40 group-hover:text-muted-foreground transition-colors leading-none">⇅</span>;
  return (
    <span className="ml-1 text-[10px] text-foreground leading-none">
      {direction === 'asc' ? '↑' : '↓'}
    </span>
  );
}

function SkeletonRow({ cols }: { cols: number }) {
  return (
    <tr className="border-b border-border last:border-0">
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-4 py-3.5">
          <div
            className="h-4 rounded bg-muted animate-pulse"
            style={{ width: i === 0 ? 280 : i === cols - 1 ? 80 : 100 }}
          />
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
  sortBy: SortableColumn;
  sortOrder: 'asc' | 'desc';
}): Promise<{ tickets: TicketRecord[]; pagination: PaginationMeta }> {
  const query = new URLSearchParams({
    page: String(params.page),
    limit: String(params.limit),
    sortBy: params.sortBy,
    sortOrder: params.sortOrder,
  });
  if (params.status) query.set('status', params.status);

  const { data } = await axios.get<{
    success: boolean;
    data: TicketRecord[];
    pagination: PaginationMeta;
  }>(`/api/tickets?${query}`, { withCredentials: true });

  return { tickets: data.data ?? [], pagination: data.pagination };
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

// ─── Column definitions ───────────────────────────────────────────────────────

const columnHelper = createColumnHelper<TicketRecord>();

// Columns defined outside the component for stable reference.
// No explicit array type — createColumnHelper infers each column's value type
// correctly; annotating as ColumnDef<T, unknown>[] causes contravariance errors.
const columns = [
  columnHelper.accessor('subject', {
    id: 'subject',
    header: 'Subject',
    enableSorting: true,
    cell: ({ getValue }) => (
      <p className="font-medium text-foreground truncate">{getValue()}</p>
    ),
  }),
  columnHelper.display({
    id: 'sender',
    header: 'Sender',
    enableSorting: false,
    cell: ({ row }) => {
      const t = row.original;
      const initials = t.fromName
        ? getInitials(t.fromName)
        : t.fromEmail
        ? t.fromEmail[0].toUpperCase()
        : '?';
      return (
        <div className="flex items-center gap-2">
          <div className="size-7 shrink-0 rounded-full bg-primary/10 text-primary text-xs font-semibold flex items-center justify-center select-none">
            {initials}
          </div>
          <div className="min-w-0">
            <p className="text-sm text-foreground truncate leading-snug">
              {t.fromName ?? 'Manual'}
            </p>
            {t.fromEmail && (
              <p className="text-xs text-muted-foreground truncate">{t.fromEmail}</p>
            )}
          </div>
        </div>
      );
    },
  }),
  columnHelper.accessor('status', {
    id: 'status',
    header: 'Status',
    enableSorting: true,
    cell: ({ getValue }) => <StatusBadge status={getValue() as TicketStatus} />,
  }),
  columnHelper.accessor('category', {
    id: 'category',
    header: 'Category',
    enableSorting: true,
    cell: ({ getValue }) => <CategoryBadge category={getValue() as TicketCategory} />,
  }),
  columnHelper.accessor('createdAt', {
    id: 'createdAt',
    header: 'Created',
    enableSorting: true,
    cell: ({ getValue }) => (
      <span className="text-xs text-muted-foreground whitespace-nowrap tabular-nums">
        {formatRelativeTime(getValue() as string)}
      </span>
    ),
  }),
];

// Column visibility: responsive — hidden on smaller viewports via CSS classes
const columnVisibilityClasses: Record<string, string> = {
  subject: 'max-w-xs',
  sender: 'hidden md:table-cell',
  status: 'hidden sm:table-cell',
  category: 'hidden lg:table-cell',
  createdAt: '',
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export function TicketsPage() {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  // TanStack Table sorting state — single-column sort, server-driven.
  // Default: createdAt desc (newest first).
  const [sorting, setSorting] = useState<SortingState>([{ id: 'createdAt', desc: true }]);

  const LIMIT = 25;

  // Derive the server sort params from TanStack Table's sorting state.
  const sortBy = (sorting[0]?.id ?? 'createdAt') as SortableColumn;
  const sortOrder = sorting[0]?.desc === false ? 'asc' : 'desc';

  const ticketsQuery = useQuery({
    queryKey: ['tickets', statusFilter, page, sortBy, sortOrder],
    queryFn: () =>
      fetchTickets({
        status: statusFilter === 'ALL' ? undefined : statusFilter,
        page,
        limit: LIMIT,
        sortBy,
        sortOrder,
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

  // Client-side search within the current page
  const filtered = useMemo(
    () =>
      search.trim()
        ? tickets.filter((t) => {
            const q = search.trim().toLowerCase();
            return (
              t.subject.toLowerCase().includes(q) ||
              (t.fromEmail?.toLowerCase().includes(q) ?? false) ||
              (t.fromName?.toLowerCase().includes(q) ?? false)
            );
          })
        : tickets,
    [tickets, search],
  );

  // TanStack Table instance — sorting managed here, data comes from the server.
  const table = useReactTable({
    data: filtered,
    columns,
    state: { sorting },
    onSortingChange: (updater) => {
      // Reset to page 1 whenever sort changes
      setPage(1);
      setSorting(updater);
    },
    // Disable client-side sorting — the server handles it.
    manualSorting: true,
    // Only one column at a time.
    enableMultiSort: false,
    getCoreRowModel: getCoreRowModel(),
  });

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
            <svg
              className="size-4 shrink-0"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
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
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id} className="border-b border-border bg-muted/40">
                  {headerGroup.headers.map((header) => {
                    const canSort = header.column.getCanSort();
                    const sorted = header.column.getIsSorted(); // false | 'asc' | 'desc'
                    const visClass = columnVisibilityClasses[header.column.id] ?? '';
                    return (
                      <th
                        key={header.id}
                        className={`px-4 py-2.5 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide select-none ${
                          header.column.id === 'createdAt' ? 'text-right' : ''
                        } ${visClass}`}
                      >
                        {canSort ? (
                          <button
                            className="group inline-flex items-center gap-0.5 hover:text-foreground transition-colors"
                            onClick={header.column.getToggleSortingHandler()}
                            title={
                              sorted === false
                                ? 'Sort ascending'
                                : sorted === 'asc'
                                ? 'Sort descending'
                                : 'Clear sort'
                            }
                          >
                            {flexRender(header.column.columnDef.header, header.getContext())}
                            <SortIcon direction={sorted} />
                          </button>
                        ) : (
                          flexRender(header.column.columnDef.header, header.getContext())
                        )}
                      </th>
                    );
                  })}
                </tr>
              ))}
            </thead>
            <tbody>
              {/* Loading skeletons */}
              {ticketsQuery.isLoading &&
                Array.from({ length: 6 }).map((_, i) => (
                  <SkeletonRow key={i} cols={table.getAllColumns().length} />
                ))}

              {/* Data rows */}
              {!ticketsQuery.isLoading &&
                table.getRowModel().rows.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors cursor-pointer"
                  >
                    {row.getVisibleCells().map((cell) => {
                      const visClass = columnVisibilityClasses[cell.column.id] ?? '';
                      return (
                        <td
                          key={cell.id}
                          className={`px-4 py-3.5 ${cell.column.id === 'createdAt' ? 'text-right' : ''} ${visClass}`}
                        >
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      );
                    })}
                  </tr>
                ))}

              {/* Empty state */}
              {!ticketsQuery.isLoading && !errorMessage && filtered.length === 0 && (
                <tr>
                  <td colSpan={table.getAllColumns().length} className="px-4 py-14 text-center">
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <svg
                        className="size-9 opacity-30"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                      >
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                      </svg>
                      <p className="text-sm font-medium">
                        {search
                          ? `No tickets match "${search}"`
                          : `No ${statusFilter === 'ALL' ? '' : statusFilter.toLowerCase() + ' '}tickets`}
                      </p>
                      {!search && statusFilter === 'ALL' && (
                        <p className="text-xs">
                          Tickets created via email ingest or manually will appear here.
                        </p>
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
                .filter(
                  (p) => p === 1 || p === pagination.totalPages || Math.abs(p - page) <= 1,
                )
                .reduce<(number | '…')[]>((acc, p, idx, arr) => {
                  if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push('…');
                  acc.push(p);
                  return acc;
                }, [])
                .map((p, i) =>
                  p === '…' ? (
                    <span key={`ellipsis-${i}`} className="px-1 text-xs text-muted-foreground">
                      …
                    </span>
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
                  ),
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
