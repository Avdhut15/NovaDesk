import type { StatusFilter, CategoryFilter } from './TicketsPage';

// ─── Shared select style ──────────────────────────────────────────────────────

const selectCls =
  'h-9 appearance-none rounded-md border border-input bg-background pl-3 pr-8 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/50 focus:border-ring cursor-pointer';

const ChevronDown = () => (
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
);

// ─── Component ────────────────────────────────────────────────────────────────

interface TicketsFiltersProps {
  search: string;
  statusFilter: StatusFilter;
  categoryFilter: CategoryFilter;
  total: number | undefined;
  isLoading: boolean;
  onSearchChange: (val: string) => void;
  onStatusChange: (val: StatusFilter) => void;
  onCategoryChange: (val: CategoryFilter) => void;
}

export function TicketsFilters({
  search,
  statusFilter,
  categoryFilter,
  total,
  isLoading,
  onSearchChange,
  onStatusChange,
  onCategoryChange,
}: TicketsFiltersProps) {
  return (
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
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search tickets..."
          className="h-9 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/50 focus:border-ring"
        />
      </div>

      {/* Status dropdown */}
      <div className="relative">
        <select
          id="tickets-status-filter"
          value={statusFilter}
          onChange={(e) => onStatusChange(e.target.value as StatusFilter)}
          className={selectCls}
        >
          <option value="ALL">All statuses</option>
          <option value="NEW">New</option>
          <option value="PROCESSING">Processing</option>
          <option value="OPEN">Open</option>
          <option value="RESOLVED">Resolved</option>
          <option value="CLOSED">Closed</option>
        </select>
        <ChevronDown />
      </div>

      {/* Category dropdown */}
      <div className="relative">
        <select
          id="tickets-category-filter"
          value={categoryFilter}
          onChange={(e) => onCategoryChange(e.target.value as CategoryFilter)}
          className={selectCls}
        >
          <option value="ALL">All categories</option>
          <option value="GENERAL_QUESTION">General question</option>
          <option value="TECHNICAL_QUESTION">Technical question</option>
          <option value="REFUND_REQUEST">Refund request</option>
        </select>
        <ChevronDown />
      </div>

      {/* Total count */}
      {total !== undefined && !isLoading && (
        <span className="ml-auto text-xs text-muted-foreground tabular-nums">
          {total} ticket{total !== 1 ? 's' : ''}
        </span>
      )}
    </div>
  );
}
