// ─── Types ────────────────────────────────────────────────────────────────────

type TicketStatus = 'NEW' | 'PROCESSING' | 'OPEN' | 'RESOLVED' | 'CLOSED';
type TicketCategory = 'GENERAL_QUESTION' | 'TECHNICAL_QUESTION' | 'REFUND_REQUEST';

interface Agent {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface UpdateTicketProps {
  status: TicketStatus;
  category: TicketCategory;
  assignedAgentId: string | null;
  agents: Agent[];
  isPending: boolean;
  onUpdate: (payload: Record<string, unknown>) => void;
}

// ─── Sub-component ────────────────────────────────────────────────────────────

function SidebarSelect({
  id,
  label,
  value,
  onChange,
  disabled,
  children,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (val: string) => void;
  disabled: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="mb-1 text-xs font-medium text-muted-foreground">{label}</p>
      <div className="relative">
        <select
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className="w-full h-9 appearance-none rounded-md border border-input bg-background pl-3 pr-8 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/50 focus:border-ring cursor-pointer disabled:opacity-50"
        >
          {children}
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
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function UpdateTicket({
  status,
  category,
  assignedAgentId,
  agents,
  isPending,
  onUpdate,
}: UpdateTicketProps) {
  return (
    <div className="w-52 shrink-0 space-y-5">
      {/* Status */}
      <SidebarSelect
        id="ticket-status-select"
        label="Status"
        value={status}
        onChange={(val) => onUpdate({ status: val })}
        disabled={isPending}
      >
        <option value="OPEN">Open</option>
        <option value="RESOLVED">Resolved</option>
        <option value="CLOSED">Closed</option>
      </SidebarSelect>

      {/* Category */}
      <SidebarSelect
        id="ticket-category-select"
        label="Category"
        value={category}
        onChange={(val) => onUpdate({ category: val })}
        disabled={isPending}
      >
        <option value="GENERAL_QUESTION">General question</option>
        <option value="TECHNICAL_QUESTION">Technical question</option>
        <option value="REFUND_REQUEST">Refund request</option>
      </SidebarSelect>

      {/* Assigned To */}
      <SidebarSelect
        id="ticket-assignee-select"
        label="Assigned To"
        value={assignedAgentId ?? ''}
        onChange={(val) => onUpdate({ assignedAgentId: val || null })}
        disabled={isPending}
      >
        <option value="">Unassigned</option>
        {agents.map((agent) => (
          <option key={agent.id} value={agent.id}>
            {agent.name}
          </option>
        ))}
      </SidebarSelect>

      {/* Save indicator */}
      {isPending && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <svg
            className="size-3.5 animate-spin"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8v8H4z"
            />
          </svg>
          Saving…
        </div>
      )}
    </div>
  );
}
