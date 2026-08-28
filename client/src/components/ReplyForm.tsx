import { useState } from 'react';
import axios, { isAxiosError } from 'axios';

// ─── Component ────────────────────────────────────────────────────────────────

interface ReplyFormProps {
  ticketId: string;
  replyBody: string;
  isPending: boolean;
  isError: boolean;
  error: Error | null;
  onBodyChange: (val: string) => void;
  onSubmit: () => void;
}

export function ReplyForm({
  ticketId,
  replyBody,
  isPending,
  isError,
  error,
  onBodyChange,
  onSubmit,
}: ReplyFormProps) {
  const [isPolishing, setIsPolishing] = useState(false);
  const [polishError, setPolishError] = useState<string | null>(null);

  async function handlePolish() {
    if (!replyBody.trim()) return;
    setIsPolishing(true);
    setPolishError(null);
    try {
      const { data } = await axios.post<{ success: boolean; data: { polished: string } }>(
        `/api/tickets/${ticketId}/polish-reply`,
        { body: replyBody },
        { withCredentials: true },
      );
      onBodyChange(data.data.polished);
    } catch (err) {
      setPolishError(
        isAxiosError(err)
          ? (err.response?.data as { error?: string })?.error ?? err.message
          : 'Failed to polish reply',
      );
    } finally {
      setIsPolishing(false);
    }
  }

  return (
    <div className="mt-6 rounded-lg border border-border bg-card p-5">
      <div className="flex items-center justify-between mb-3">
        <p className="font-semibold text-foreground text-sm">Add a reply</p>

        {/* ── Polish button ─────────────────────────────────────────────── */}
        <button
          type="button"
          onClick={handlePolish}
          disabled={!replyBody.trim() || isPolishing || isPending}
          className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted hover:border-primary/50 hover:text-primary focus:outline-none focus:ring-2 focus:ring-ring/50 disabled:opacity-40 disabled:pointer-events-none transition-all"
          title="Polish reply with AI"
        >
          {isPolishing ? (
            <>
              <svg className="size-3.5 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              Polishing…
            </>
          ) : (
            <>
              <svg className="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
                <path d="M5 3v4" />
                <path d="M19 17v4" />
                <path d="M3 5h4" />
                <path d="M17 19h4" />
              </svg>
              Polish
            </>
          )}
        </button>
      </div>

      {/* Polish error */}
      {polishError && (
        <div className="mb-3 flex items-center gap-2 rounded-md px-3 py-2 text-xs text-destructive bg-destructive/5 border border-destructive/10">
          <svg className="size-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" /><path d="M12 8v4m0 4h.01" />
          </svg>
          {polishError}
        </div>
      )}

      <div className="mb-3">
        <textarea
          className="w-full min-h-[120px] rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/50 focus:border-ring placeholder:text-muted-foreground disabled:opacity-50 resize-y transition-colors"
          placeholder="Type your reply here..."
          value={replyBody}
          onChange={(e) => onBodyChange(e.target.value)}
          disabled={isPending || isPolishing}
        />
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {/* Empty spacer / visual balance since radio buttons are removed */}
        </div>

        <div className="flex items-center gap-3">
          {isError && (
            <span className="text-xs text-destructive">
              {isAxiosError(error)
                ? (error.response?.data as { error?: string })?.error ?? error.message
                : error?.message}
            </span>
          )}
          <button
            onClick={onSubmit}
            disabled={!replyBody.trim() || isPending}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50 disabled:pointer-events-none"
          >
            {isPending ? 'Sending...' : 'Send reply'}
          </button>
        </div>
      </div>
    </div>
  );
}
