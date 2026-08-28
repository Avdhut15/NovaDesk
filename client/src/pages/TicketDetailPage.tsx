import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios, { isAxiosError } from 'axios';
import { TicketDetail } from '../components/TicketDetail';
import { UpdateTicket } from '../components/UpdateTicket';
import { ReplyThread, type TicketReply } from '../components/ReplyThread';
import { ReplyForm } from '../components/ReplyForm';

// ─── Types ────────────────────────────────────────────────────────────────────

type TicketStatus = 'OPEN' | 'RESOLVED' | 'CLOSED';
type TicketCategory = 'GENERAL_QUESTION' | 'TECHNICAL_QUESTION' | 'REFUND_REQUEST';

interface TicketDetailData {
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

// ─── Data Fetching ────────────────────────────────────────────────────────────

async function fetchTicket(id: string): Promise<TicketDetailData> {
  const { data } = await axios.get<{ success: boolean; data: TicketDetailData }>(
    `/api/tickets/${id}`,
    { withCredentials: true },
  );
  return data.data;
}

async function fetchAgents(): Promise<Agent[]> {
  const { data } = await axios.get<{ success: boolean; data: Agent[] }>(
    '/api/agents',
    { withCredentials: true },
  );
  return data.data;
}

async function patchTicket(ticketId: string, payload: Record<string, unknown>): Promise<TicketDetailData> {
  const { data } = await axios.patch<{ success: boolean; data: TicketDetailData }>(
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

  const mutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) => patchTicket(id!, payload),
    onSuccess: (updated) => {
      queryClient.setQueryData(['ticket', id], updated);
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
    },
  });

  const replyMutation = useMutation({
    mutationFn: () => postReply(id!, { body: replyBody, fromAgent: true }),
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
            <TicketDetail
              subject={ticket.subject}
              body={ticket.body}
              fromName={ticket.fromName}
              fromEmail={ticket.fromEmail}
              createdAt={ticket.createdAt}
              updatedAt={ticket.updatedAt}
            />
            <ReplyThread replies={ticket.replies} />
            <ReplyForm
              ticketId={ticket.id}
              replyBody={replyBody}
              isPending={replyMutation.isPending}
              isError={replyMutation.isError}
              error={replyMutation.error}
              onBodyChange={setReplyBody}
              onSubmit={() => replyMutation.mutate()}
            />
          </div>

          {/* ── Right: sidebar ──────────────────────────────────────────────── */}
          <UpdateTicket
            status={ticket.status}
            category={ticket.category}
            assignedAgentId={ticket.assignedAgent?.id ?? null}
            agents={agents}
            isPending={mutation.isPending}
            onUpdate={(payload) => mutation.mutate(payload)}
          />
        </div>
      )}
    </div>
  );
}
