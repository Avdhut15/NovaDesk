import { useState } from 'react';
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
  createdBy: { id: string; name: string; role: string } | null;
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

function getInitials(name: string): string {
  if (!name) return '?';
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
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

async function postReply(ticketId: string, payload: { body: string; fromAgent: boolean }): Promise<TicketReply> {
  const { data } = await axios.post<{ success: boolean; data: TicketReply }>(
    `/api/tickets/${ticketId}/replies`,
    payload,
    { withCredentials: true },
  );
  return data.data;
}

// ─── Sidebar select ───────────────────────────────────────────────────────────

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
          viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
          strokeLinecap="round" strokeLinejoin="round"
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </div>
    </div>
  );
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

  const [replyBody, setReplyBody] = useState('');
  const [replyFromAgent, setReplyFromAgent] = useState(true);

  const mutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) => patchTicket(id!, payload),
    onSuccess: (updated) => {
      // Update this ticket's cache instantly
      queryClient.setQueryData(['ticket', id], updated);
      // Invalidate the list so it's fresh when navigating back
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
    },
  });

  const replyMutation = useMutation({
    mutationFn: () => postReply(id!, { body: replyBody, fromAgent: replyFromAgent }),
    onSuccess: () => {
      setReplyBody('');
      queryClient.invalidateQueries({ queryKey: ['ticket', id] });
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
    },
  });

  const errorMessage = isAxiosError(error)
    ? (error.response?.data as { error?: string })?.error ?? error.message
    : error?.message ?? null;

  return (
    <div className="max-w-5xl mx-auto">
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
        <div className="flex gap-8 animate-pulse">
          <div className="flex-1 space-y-4">
            <div className="h-8 w-2/3 rounded bg-muted" />
            <div className="h-3.5 w-1/2 rounded bg-muted" />
            <div className="h-3.5 w-1/3 rounded bg-muted" />
            <div className="h-3.5 w-1/3 rounded bg-muted" />
            <div className="mt-4 rounded-lg border border-border bg-card p-5 space-y-3">
              <div className="h-4 w-24 rounded bg-muted" />
              <div className="h-4 w-full rounded bg-muted" />
              <div className="h-4 w-4/5 rounded bg-muted" />
            </div>
          </div>
          <div className="w-52 space-y-5">
            <div className="space-y-2"><div className="h-3 w-16 rounded bg-muted" /><div className="h-9 rounded-md bg-muted" /></div>
            <div className="space-y-2"><div className="h-3 w-16 rounded bg-muted" /><div className="h-9 rounded-md bg-muted" /></div>
            <div className="space-y-2"><div className="h-3 w-20 rounded bg-muted" /><div className="h-9 rounded-md bg-muted" /></div>
          </div>
        </div>
      )}

      {/* ── Content ───────────────────────────────────────────────────────────── */}
      {ticket && (
        <div className="flex gap-10 items-start">

          {/* ── Left: main content ──────────────────────────────────────────── */}
          <div className="flex-1 min-w-0">
            {/* Subject */}
            <h1 className="text-2xl font-bold text-foreground leading-snug">
              {ticket.subject}
            </h1>

            {/* Metadata */}
            <div className="mt-3 space-y-1 text-sm text-muted-foreground">
              <p>
                <span className="font-medium text-foreground">From:</span>{' '}
                {ticket.fromName ?? 'Manual ticket'}
                {ticket.fromEmail && <span> ({ticket.fromEmail})</span>}
              </p>
              <p>
                <span className="font-medium text-foreground">Created:</span>{' '}
                {formatDate(ticket.createdAt)}
              </p>
              <p>
                <span className="font-medium text-foreground">Updated:</span>{' '}
                {formatDate(ticket.updatedAt)}
              </p>
            </div>

            {/* Message card */}
            <div className="mt-6 rounded-lg border border-border bg-card p-5">
              <p className="font-semibold text-foreground text-sm">Message</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                From {ticket.fromName ?? 'Manual ticket'}
              </p>
              <p className="mt-4 text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                {ticket.body}
              </p>
            </div>

            {/* Replies */}
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
                          {reply.fromAgent ? (reply.createdBy ? getInitials(reply.createdBy.name) : 'A') : 'C'}
                        </div>
                        <span className="text-xs font-medium text-foreground">
                          {reply.fromAgent ? (reply.createdBy ? reply.createdBy.name : 'Agent') : 'Customer'}
                        </span>
                        {reply.fromAgent && reply.createdBy?.role === 'admin' && (
                          <span className="text-[10px] uppercase font-bold text-primary ml-1 bg-primary/10 px-1.5 py-0.5 rounded">
                            Admin
                          </span>
                        )}
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

            {ticket.replies.length === 0 && (
              <div className="mt-5 rounded-lg border border-dashed border-border py-10 text-center text-sm text-muted-foreground">
                No replies yet.
              </div>
            )}

            {/* ── Reply form ────────────────────────────────────────────────── */}
            <div className="mt-6 rounded-lg border border-border bg-card p-5">
              <p className="font-semibold text-foreground text-sm mb-3">Add a reply</p>
              
              <div className="mb-3">
                <textarea
                  className="w-full min-h-[120px] rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/50 focus:border-ring placeholder:text-muted-foreground disabled:opacity-50 resize-y"
                  placeholder="Type your reply here..."
                  value={replyBody}
                  onChange={(e) => setReplyBody(e.target.value)}
                  disabled={replyMutation.isPending}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      className="accent-primary"
                      checked={replyFromAgent}
                      onChange={() => setReplyFromAgent(true)}
                      disabled={replyMutation.isPending}
                    />
                    Reply as Agent
                  </label>
                  <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5 cursor-pointer ml-3">
                    <input
                      type="radio"
                      className="accent-primary"
                      checked={!replyFromAgent}
                      onChange={() => setReplyFromAgent(false)}
                      disabled={replyMutation.isPending}
                    />
                    Simulate Customer
                  </label>
                </div>

                <div className="flex items-center gap-3">
                  {replyMutation.isError && (
                    <span className="text-xs text-destructive">
                      {isAxiosError(replyMutation.error) 
                        ? (replyMutation.error.response?.data as { error?: string })?.error ?? replyMutation.error.message 
                        : replyMutation.error.message}
                    </span>
                  )}
                  <button
                    onClick={() => replyMutation.mutate()}
                    disabled={!replyBody.trim() || replyMutation.isPending}
                    className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50 disabled:pointer-events-none"
                  >
                    {replyMutation.isPending ? 'Sending...' : 'Send reply'}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* ── Right: sidebar ──────────────────────────────────────────────── */}
          <div className="w-52 shrink-0 space-y-5">
            {/* Status */}
            <SidebarSelect
              id="ticket-status-select"
              label="Status"
              value={ticket.status}
              onChange={(val) => mutation.mutate({ status: val })}
              disabled={mutation.isPending}
            >
              <option value="OPEN">Open</option>
              <option value="RESOLVED">Resolved</option>
              <option value="CLOSED">Closed</option>
            </SidebarSelect>

            {/* Category */}
            <SidebarSelect
              id="ticket-category-select"
              label="Category"
              value={ticket.category}
              onChange={(val) => mutation.mutate({ category: val })}
              disabled={mutation.isPending}
            >
              <option value="GENERAL_QUESTION">General question</option>
              <option value="TECHNICAL_QUESTION">Technical question</option>
              <option value="REFUND_REQUEST">Refund request</option>
            </SidebarSelect>

            {/* Assigned To */}
            <SidebarSelect
              id="ticket-assignee-select"
              label="Assigned To"
              value={ticket.assignedAgent?.id ?? ''}
              onChange={(val) => mutation.mutate({ assignedAgentId: val || null })}
              disabled={mutation.isPending}
            >
              <option value="">Unassigned</option>
              {agents.map((agent) => (
                <option key={agent.id} value={agent.id}>
                  {agent.name}
                </option>
              ))}
            </SidebarSelect>

            {/* Save indicator */}
            {mutation.isPending && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <svg className="size-3.5 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                Saving…
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
