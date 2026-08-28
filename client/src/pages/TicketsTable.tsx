import { Link } from 'react-router-dom';
import {
  flexRender,
  type Table as TanstackTable,
} from '@tanstack/react-table';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TicketRecord {
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

export type TicketStatus = 'NEW' | 'PROCESSING' | 'OPEN' | 'RESOLVED' | 'CLOSED';
export type TicketCategory = 'GENERAL_QUESTION' | 'TECHNICAL_QUESTION' | 'REFUND_REQUEST';

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// ─── Helpers (exported for reuse) ────────────────────────────────────────────

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'numeric',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatCategory(cat: TicketCategory | null): string {
  if (!cat) return '—';
  return {
    GENERAL_QUESTION: 'general question',
    TECHNICAL_QUESTION: 'technical question',
    REFUND_REQUEST: 'refund request',
  }[cat];
}

// ─── Sub-components ───────────────────────────────────────────────────────────

export function StatusBadge({ status }: { status: TicketStatus }) {
  const config = {
    NEW: { label: 'new', cls: 'bg-slate-500 text-white' },
    PROCESSING: { label: 'processing', cls: 'bg-amber-500 text-white animate-pulse' },
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

export function SortIcon({ direction }: { direction: 'asc' | 'desc' | false }) {
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

// ─── Column helper exports ────────────────────────────────────────────────────

export { createColumnHelper } from '@tanstack/react-table';

// ─── Table component ──────────────────────────────────────────────────────────

interface TicketsTableProps {
  table: TanstackTable<TicketRecord>;
  isLoading: boolean;
  errorMessage: string | null;
  search: string;
  page: number;
  pagination: PaginationMeta | undefined;
  onPageChange: (page: number) => void;
}

export function TicketsTable({
  table,
  isLoading,
  errorMessage,
  search,
  page,
  pagination,
  onPageChange,
}: TicketsTableProps) {
  const colCount = table.getAllColumns().length;

  return (
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
            {isLoading &&
              Array.from({ length: 8 }).map((_, i) => (
                <SkeletonRow key={i} cols={colCount} />
              ))}

            {/* Data rows */}
            {!isLoading &&
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
            {!isLoading && !errorMessage && table.getRowModel().rows.length === 0 && (
              <tr>
                <td colSpan={colCount} className="px-4 py-14 text-center">
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
              onClick={() => onPageChange(Math.max(1, page - 1))}
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
                    onClick={() => onPageChange(p as number)}
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
              onClick={() => onPageChange(Math.min(pagination.totalPages, page + 1))}
              disabled={page >= pagination.totalPages}
              className="inline-flex h-7 items-center justify-center rounded-md border border-input px-2.5 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-40 transition-colors"
            >
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Column definitions (used by TicketsPage) ─────────────────────────────────
// Defined here so they are co-located with the table and stable across renders.

import { createColumnHelper as _createColumnHelper } from '@tanstack/react-table';
const columnHelper = _createColumnHelper<TicketRecord>();

export const ticketColumns = [
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
          <span className="text-sm text-foreground truncate">{t.fromName ?? 'Manual'}</span>
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
