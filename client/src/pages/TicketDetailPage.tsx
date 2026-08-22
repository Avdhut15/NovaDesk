import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios, { isAxiosError } from 'axios';

// ─── Types ────────────────────────────────────────────────────────────────────

type TicketStatus = 'OPEN' | 'RESOLVED' | 'CLOSED';
type TicketCategory = 'GENERAL_QUESTION' | 'TECHNICAL_QUESTION' | 'REFUND_REQUEST';

interface TicketReply {
  id: string;
  body: string;
  fromAgent: boolean;
  createdAt: string;
}

interface TicketDetail {
  id: string;
  subject: string;
  body: string;
  status: TicketStatus;
  category: TicketCategory;
  fromEmail: string | null;
  fromName: string | null;
  createdAt: string;
  updatedAt: string;
  assignedAgent: { id: string; name: string; email: string } | null;
  createdBy: { id: string; name: string; email: string } | null;
  replies: TicketReply[];
  _count: { replies: number };
}

interface Agent {
  id: string;
  name: string;
  email: string;
  role: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    month: 'numeric',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
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

// ─── Data Fetching ────────────────────────────────────────────────────────────

async function fetchTicket(id: string): Promise<TicketDetail> {
  const { data } = await axios.get<{ success: boolean; data: TicketDetail }>(
    `/api/tickets/${id}`,
    { withCredentials: true },
  );
  return data.data;
}

async function fetchAgents(): Promise<Agent[]> {
  const { data } = await axios.get<{ success: boolean; data: Agent[] }>(
    '/api/users/agents',
    { withCredentials: true },
  );
  return data.data;
}

async function patchTicket(ticketId: string, payload: Record<string, unknown>): Promise<TicketDetail> {
  const { data } = await axios.patch<{ success: boolean; data: TicketDetail }>(
    `/api/tickets/${ticketId}`,
    payload,
    { withCredentials: true },
  );
  return data.data;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function TicketDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: ticket, isLoading, error } = useQuery({
    queryKey: ['ticket', id],
    queryFn: () => fetchTicket(id!),
    enabled: !!id,
  });

  const { data: agents = [] } = useQuery({
    queryKey: ['agents'],
    queryFn: fetchAgents,
  });

  const mutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) => patchTicket(id!, payload),
    onSuccess: (updated) => {
      queryClient.setQueryData(['ticket', id], updated);
    },
  });

  const errorMessage = isAxiosError(error)
    ? (error.response?.data as { error?: string })?.error ?? error.message
    : error?.message ?? null;

  return (
    <div className="max-w-3xl mx-auto">
      {/* ── Back ─────────────────────────────────────────────────────────────── */}
      <button
        onClick={() => navigate('/tickets')}
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <svg className="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 12H5M12 5l-7 7 7 7" />
        </svg>
        Back to tickets
      </button>

      {/* ── Error ────────────────────────────────────────────────────────────── */}
      {errorMessage && (
        <div className="mb-4 flex items-center gap-2 rounded-md px-3 py-2.5 text-sm text-destructive bg-destructive/5 border border-destructive/10">
          <svg className="size-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" /><path d="M12 8v4m0 4h.01" />
          </svg>
          {errorMessage}
        </div>
      )}

      {/* ── Loading ───────────────────────────────────────────────────────────── */}
      {isLoading && (
        <div className="space-y-4 animate-pulse">
          <div className="h-8 w-2/3 rounded bg-muted" />
          <div className="flex gap-2 mt-2">
            <div className="h-5 w-16 rounded-full bg-muted" />
            <div className="h-5 w-28 rounded bg-muted" />
          </div>
          <div className="mt-4 h-4 w-1/2 rounded bg-muted" />
          <div className="mt-2 h-4 w-1/2 rounded bg-muted" />
          <div className="mt-6 rounded-lg border border-border bg-card p-5 space-y-3">
            <div className="h-4 w-24 rounded bg-muted" />
            <div className="h-4 w-full rounded bg-muted" />
            <div className="h-4 w-5/6 rounded bg-muted" />
          </div>
        </div>
      )}

      {/* ── Content ───────────────────────────────────────────────────────────── */}
      {ticket && (
        <div>
          {/* Subject */}
          <h1 className="text-2xl font-bold text-foreground leading-snug">
            {ticket.subject}
          </h1>

          {/* Status + category inline tags */}
          <div className="mt-2 flex items-center gap-2 flex-wrap">
            <StatusBadge status={ticket.status} />
            {ticket.category && (
              <span className="text-xs text-muted-foreground border border-border rounded px-2 py-0.5">
                {formatCategory(ticket.category)}
              </span>
            )}
          </div>

          {/* Metadata grid */}
          <div className="mt-5 grid grid-cols-2 gap-y-2 text-sm">
            {/* From */}
            <div className="text-muted-foreground">
              <span className="font-medium text-foreground">From:</span>{' '}
              {ticket.fromName ?? 'Manual ticket'}
              {ticket.fromEmail && (
                <span className="text-muted-foreground"> ({ticket.fromEmail})</span>
              )}
            </div>

            {/* Assigned to — select dropdown inline */}
            <div className="flex items-center gap-2 justify-end">
              <span className="text-muted-foreground whitespace-nowrap">Assigned to:</span>
              <div className="relative">
                <select
                  id="assign-agent-select"
                  value={ticket.assignedAgent?.id ?? ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    mutation.mutate({ assignedAgentId: val === '' ? null : val });
                  }}
                  disabled={mutation.isPending}
                  className="h-7 appearance-none rounded-md border border-input bg-background pl-2.5 pr-7 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/50 focus:border-ring cursor-pointer disabled:opacity-50"
                >
                  <option value="">Unassigned</option>
                  {agents.map((agent) => (
                    <option key={agent.id} value={agent.id}>
                      {agent.name}
                    </option>
                  ))}
                </select>
                <svg
                  className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 size-3 text-muted-foreground"
                  viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                  strokeLinecap="round" strokeLinejoin="round"
                >
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </div>
              {mutation.isPending && (
                <svg className="size-3.5 animate-spin text-muted-foreground shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
              )}
              {mutation.isSuccess && !mutation.isPending && (
                <svg className="size-3.5 text-green-600 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
              )}
            </div>

            {/* Created */}
            <div className="text-muted-foreground">
              <span className="font-medium text-foreground">Created:</span>{' '}
              {formatDate(ticket.createdAt)}
            </div>

            {/* Updated */}
            <div className="text-muted-foreground text-right">
              <span className="font-medium text-foreground">Updated:</span>{' '}
              {formatDate(ticket.updatedAt)}
            </div>
          </div>

          {/* ── Message card ─────────────────────────────────────────────────── */}
          <div className="mt-6 rounded-lg border border-border bg-card p-5">
            <p className="font-semibold text-foreground text-sm">Message</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              From {ticket.fromName ?? 'Manual ticket'}
            </p>
            <p className="mt-4 text-sm text-foreground whitespace-pre-wrap leading-relaxed">
              {ticket.body}
            </p>
          </div>

          {/* ── Replies ──────────────────────────────────────────────────────── */}
          {ticket.replies.length > 0 && (
            <div className="mt-5 space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Replies ({ticket.replies.length})
              </p>
              {ticket.replies.map((reply) => (
                <div
                  key={reply.id}
                  className={`rounded-lg border p-5 ${
                    reply.fromAgent
                      ? 'border-primary/20 bg-primary/5'
                      : 'border-border bg-card'
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className={`size-6 shrink-0 rounded-full text-[10px] font-semibold flex items-center justify-center select-none ${
                        reply.fromAgent
                          ? 'bg-primary/15 text-primary'
                          : 'bg-muted text-muted-foreground'
                      }`}>
                        {reply.fromAgent ? 'A' : 'C'}
                      </div>
                      <span className="text-xs font-medium text-foreground">
                        {reply.fromAgent ? 'Agent' : 'Customer'}
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {formatDate(reply.createdAt)}
                    </span>
                  </div>
                  <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                    {reply.body}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* ── Empty replies ────────────────────────────────────────────────── */}
          {ticket.replies.length === 0 && (
            <div className="mt-5 rounded-lg border border-dashed border-border py-10 text-center text-sm text-muted-foreground">
              No replies yet.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
