import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios, { isAxiosError } from 'axios';
import {
  useReactTable,
  getCoreRowModel,
  type SortingState,
} from '@tanstack/react-table';
import { TicketsTable, ticketColumns, type TicketRecord, type TicketStatus, type TicketCategory, type PaginationMeta } from './TicketsTable';
import { TicketsFilters } from './TicketsFilters';

// ─── Types ────────────────────────────────────────────────────────────────────

/** Columns the server accepts as sortBy values (mirrors TicketSortByEnum). */
type SortableColumn = 'createdAt' | 'updatedAt' | 'subject' | 'status' | 'category' | 'fromEmail';

export type StatusFilter = 'ALL' | TicketStatus;
export type CategoryFilter = 'ALL' | TicketCategory;

// ─── Data Fetching ────────────────────────────────────────────────────────────

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

// ─── Page ─────────────────────────────────────────────────────────────────────

export function TicketsPage() {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('ALL');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [sorting, setSorting] = useState<SortingState>([{ id: 'createdAt', desc: true }]);

  const LIMIT = 25;
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

  const table = useReactTable({
    data: filtered,
    columns: ticketColumns,
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

  return (
    <div>
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="mb-5">
        <h1 className="text-xl font-bold text-foreground">Tickets</h1>
      </div>

      {/* ── Filters ─────────────────────────────────────────────────────────── */}
      <TicketsFilters
        search={search}
        statusFilter={statusFilter}
        categoryFilter={categoryFilter}
        total={pagination?.total}
        isLoading={ticketsQuery.isLoading}
        onSearchChange={setSearch}
        onStatusChange={handleStatusChange}
        onCategoryChange={handleCategoryChange}
      />

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
      <TicketsTable
        table={table}
        isLoading={ticketsQuery.isLoading}
        errorMessage={errorMessage}
        search={search}
        page={page}
        pagination={pagination}
        onPageChange={setPage}
      />
    </div>
  );
}
