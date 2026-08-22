import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
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
type CategoryFilter = 'ALL' | TicketCategory;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'numeric',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatCategory(cat: TicketCategory | null): string {
  if (!cat) return '—';
  return {
    GENERAL_QUESTION: 'general question',
    TECHNICAL_QUESTION: 'technical question',
    REFUND_REQUEST: 'refund request',
  }[cat];
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: TicketStatus }) {
  const config = {
    OPEN: { label: 'open', cls: 'bg-blue-600 text-white' },
    RESOLVED: { label: 'resolved', cls: 'bg-green-600 text-white' },
    CLOSED: { label: 'closed', cls: 'bg-muted-foreground/50 text-white' },
  }[status];

  return (
    <span className={`inline-flex items-center justify-center w-20 rounded-full px-2.5 py-0.5 text-xs font-medium ${config.cls}`}>
      {config.label}
    </span>
  );
}

function SkeletonRow({ cols }: { cols: number }) {
  return (
    <tr className="border-b border-border last:border-0">
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-4 py-3.5">
          <div className="h-4 rounded bg-muted animate-pulse" style={{ width: i === 0 ? 220 : 90 }} />
        </td>
      ))}
    </tr>
  );
}

/** Compact sort icon matching the screenshot ↑↓ style. */
function SortIcon({ direction }: { direction: 'asc' | 'desc' | false }) {
  if (!direction)
    return (
      <span className="ml-1 text-[10px] text-muted-foreground/50 group-hover:text-muted-foreground transition-colors leading-none select-none">
        ↑↓
      </span>
    );
  return (
    <span className="ml-1 text-[10px] text-foreground leading-none select-none">
      {direction === 'asc' ? '↑' : '↓'}
    </span>
  );
}

// ─── Data fetching ────────────────────────────────────────────────────────────

async function fetchTickets(params: {
  status?: TicketStatus;
  category?: TicketCategory;
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
  if (params.category) query.set('category', params.category);

  const { data } = await axios.get<{
    success: boolean;
    data: TicketRecord[];
    pagination: PaginationMeta;
  }>(`/api/tickets?${query}`, { withCredentials: true });

  return { tickets: data.data ?? [], pagination: data.pagination };
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
    cell: ({ getValue, row }) => (
      <Link
        to={`/tickets/${row.original.id}`}
        className="font-medium text-foreground hover:text-primary hover:underline transition-colors"
      >
        {getValue()}
      </Link>
    ),
  }),
  columnHelper.display({
    id: 'sender',
    header: 'Sender',
    enableSorting: false,
    cell: ({ row }) => {
      const t = row.original;
      return (
        <div className="flex flex-col min-w-0">
          <span className="text-sm text-foreground truncate">
            {t.fromName ?? 'Manual'}
          </span>
          {t.fromEmail && (
            <span className="text-xs text-muted-foreground truncate">{t.fromEmail}</span>
          )}
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
    cell: ({ getValue }) => (
      <span className="text-sm text-muted-foreground">
        {formatCategory(getValue() as TicketCategory)}
      </span>
    ),
  }),
  columnHelper.accessor('createdAt', {
    id: 'createdAt',
    header: 'Created',
    enableSorting: true,
    cell: ({ getValue }) => (
      <span className="text-sm text-muted-foreground tabular-nums whitespace-nowrap">
        {formatDate(getValue() as string)}
      </span>
    ),
  }),
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export function TicketsPage() {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('ALL');
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
    queryKey: ['tickets', statusFilter, categoryFilter, page, sortBy, sortOrder],
    queryFn: () =>
      fetchTickets({
        status: statusFilter === 'ALL' ? undefined : statusFilter,
        category: categoryFilter === 'ALL' ? undefined : categoryFilter,
        page,
        limit: LIMIT,
        sortBy,
        sortOrder,
      }),
  });

  const tickets = ticketsQuery.data?.tickets ?? [];
  const pagination = ticketsQuery.data?.pagination;

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
      setPage(1);
      setSorting(updater);
    },
    manualSorting: true,
    enableMultiSort: false,
    getCoreRowModel: getCoreRowModel(),
  });

  const handleStatusChange = (val: StatusFilter) => {
    setStatusFilter(val);
    setPage(1);
  };

  const handleCategoryChange = (val: CategoryFilter) => {
    setCategoryFilter(val);
    setPage(1);
  };

  // Shared select style
  const selectCls =
    'h-9 appearance-none rounded-md border border-input bg-background pl-3 pr-8 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/50 focus:border-ring cursor-pointer';

  return (
    <div>
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="mb-5">
        <h1 className="text-xl font-bold text-foreground">Tickets</h1>
      </div>

      {/* ── Toolbar ────────────────────────────────────────────────────────── */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {/* Search */}
        <div className="relative flex-1 min-w-[180px]">
          <svg
            className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground"
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
            placeholder="Search tickets..."
            className="h-9 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/50 focus:border-ring"
          />
        </div>

        {/* Status dropdown */}
        <div className="relative">
          <select
            id="tickets-status-filter"
            value={statusFilter}
            onChange={(e) => handleStatusChange(e.target.value as StatusFilter)}
            className={selectCls}
          >
            <option value="ALL">All statuses</option>
            <option value="OPEN">Open</option>
            <option value="RESOLVED">Resolved</option>
            <option value="CLOSED">Closed</option>
          </select>
          <svg
            className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        </div>

        {/* Category dropdown */}
        <div className="relative">
          <select
            id="tickets-category-filter"
            value={categoryFilter}
            onChange={(e) => handleCategoryChange(e.target.value as CategoryFilter)}
            className={selectCls}
          >
            <option value="ALL">All categories</option>
            <option value="GENERAL_QUESTION">General question</option>
            <option value="TECHNICAL_QUESTION">Technical question</option>
            <option value="REFUND_REQUEST">Refund request</option>
          </select>
          <svg
            className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        </div>

        {/* Total count */}
        {pagination && !ticketsQuery.isLoading && (
          <span className="ml-auto text-xs text-muted-foreground tabular-nums">
            {pagination.total} ticket{pagination.total !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* ── Error banner ───────────────────────────────────────────────────── */}
      {errorMessage && (
        <div className="mb-4 flex items-center gap-2 rounded-md px-3 py-2.5 text-sm text-destructive bg-destructive/5 border border-destructive/10">
          <svg className="size-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 8v4m0 4h.01" />
          </svg>
          {errorMessage}
        </div>
      )}

      {/* ── Table ──────────────────────────────────────────────────────────── */}
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id} className="border-b border-border">
                  {headerGroup.headers.map((header) => {
                    const canSort = header.column.getCanSort();
                    const sorted = header.column.getIsSorted();
                    return (
                      <th
                        key={header.id}
                        className="px-4 py-3 text-left text-sm font-medium text-foreground select-none"
                      >
                        {canSort ? (
                          <button
                            className="group inline-flex items-center hover:text-foreground transition-colors"
                            onClick={header.column.getToggleSortingHandler()}
                          >
                            {flexRender(header.column.columnDef.header, header.getContext())}
                            <SortIcon direction={sorted} />
                          </button>
                        ) : (
                          <span className="inline-flex items-center">
                            {flexRender(header.column.columnDef.header, header.getContext())}
                            <SortIcon direction={false} />
                          </span>
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
                Array.from({ length: 8 }).map((_, i) => (
                  <SkeletonRow key={i} cols={columns.length} />
                ))}

              {/* Data rows */}
              {!ticketsQuery.isLoading &&
                table.getRowModel().rows.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors cursor-pointer"
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="px-4 py-3.5 max-w-[260px]">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))}

              {/* Empty state */}
              {!ticketsQuery.isLoading && !errorMessage && filtered.length === 0 && (
                <tr>
                  <td colSpan={columns.length} className="px-4 py-14 text-center">
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <svg className="size-9 opacity-30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                      </svg>
                      <p className="text-sm font-medium">
                        {search ? `No tickets match "${search}"` : 'No tickets found'}
                      </p>
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
