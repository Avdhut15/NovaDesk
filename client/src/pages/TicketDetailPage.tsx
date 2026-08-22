import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
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

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatCategory(cat: TicketCategory | null): string {
  if (!cat) return '—';
  return {
    GENERAL_QUESTION: 'General question',
    TECHNICAL_QUESTION: 'Technical question',
    REFUND_REQUEST: 'Refund request',
  }[cat];
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

// ─── Page ─────────────────────────────────────────────────────────────────────

export function TicketDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: ticket, isLoading, error } = useQuery({
    queryKey: ['ticket', id],
    queryFn: () => fetchTicket(id!),
    enabled: !!id,
  });

  const errorMessage = isAxiosError(error)
    ? (error.response?.data as { error?: string })?.error ?? error.message
    : error?.message ?? null;

  return (
    <div className="max-w-3xl mx-auto">
      {/* ── Back button ──────────────────────────────────────────────────────── */}
      <button
        onClick={() => navigate('/tickets')}
        className="mb-5 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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

      {/* ── Loading skeleton ─────────────────────────────────────────────────── */}
      {isLoading && (
        <div className="space-y-4 animate-pulse">
          <div className="h-7 w-2/3 rounded bg-muted" />
          <div className="h-4 w-1/3 rounded bg-muted" />
          <div className="mt-6 rounded-lg border border-border bg-card p-5 space-y-3">
            <div className="h-4 w-full rounded bg-muted" />
            <div className="h-4 w-5/6 rounded bg-muted" />
            <div className="h-4 w-4/6 rounded bg-muted" />
          </div>
        </div>
      )}

      {/* ── Ticket content ───────────────────────────────────────────────────── */}
      {ticket && (
        <div className="space-y-5">
          {/* Header */}
          <div>
            <div className="flex items-start justify-between gap-4">
              <h1 className="text-xl font-bold text-foreground leading-snug">{ticket.subject}</h1>
              <StatusBadge status={ticket.status} />
            </div>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span>#{ticket.id.slice(-8).toUpperCase()}</span>
              <span>{formatCategory(ticket.category)}</span>
              <span>Opened {formatDate(ticket.createdAt)}</span>
              {ticket.assignedAgent && (
                <span>Assigned to <span className="font-medium text-foreground">{ticket.assignedAgent.name}</span></span>
              )}
            </div>
          </div>

          {/* Original message */}
          <div className="rounded-lg border border-border bg-card overflow-hidden">
            {/* Sender info */}
            <div className="flex items-center gap-3 border-b border-border px-5 py-3.5 bg-muted/30">
              <div className="size-8 shrink-0 rounded-full bg-primary/10 text-primary text-xs font-semibold flex items-center justify-center select-none">
                {ticket.fromName
                  ? getInitials(ticket.fromName)
                  : ticket.fromEmail
                  ? ticket.fromEmail[0].toUpperCase()
                  : '?'}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {ticket.fromName ?? 'Manual ticket'}
                </p>
                {ticket.fromEmail && (
                  <p className="text-xs text-muted-foreground truncate">{ticket.fromEmail}</p>
                )}
              </div>
              <span className="ml-auto text-xs text-muted-foreground whitespace-nowrap">
                {formatDate(ticket.createdAt)}
              </span>
            </div>
            {/* Body */}
            <div className="px-5 py-4">
              <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                {ticket.body}
              </p>
            </div>
          </div>

          {/* Replies */}
          {ticket.replies.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Replies ({ticket.replies.length})
              </h2>
              {ticket.replies.map((reply) => (
                <div
                  key={reply.id}
                  className={`rounded-lg border overflow-hidden ${
                    reply.fromAgent
                      ? 'border-primary/20 bg-primary/5'
                      : 'border-border bg-card'
                  }`}
                >
                  <div className="flex items-center gap-2 border-b border-inherit px-5 py-3 bg-muted/20">
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
                    <span className="ml-auto text-xs text-muted-foreground whitespace-nowrap">
                      {formatDate(reply.createdAt)}
                    </span>
                  </div>
                  <div className="px-5 py-4">
                    <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                      {reply.body}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Empty replies state */}
          {ticket.replies.length === 0 && (
            <div className="rounded-lg border border-dashed border-border py-10 text-center text-sm text-muted-foreground">
              No replies yet.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
