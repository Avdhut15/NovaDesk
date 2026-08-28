import { useState } from 'react';
import axios, { isAxiosError } from 'axios';

interface TicketSummaryProps {
  ticketId: string;
}

export function TicketSummary({ ticketId }: TicketSummaryProps) {
  const [summary, setSummary] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSummarize() {
    setIsLoading(true);
    setError(null);
    try {
      const { data } = await axios.post<{ success: boolean; data: { summary: string } }>(
        `/api/tickets/${ticketId}/summarize`,
        {},
        { withCredentials: true },
      );
      setSummary(data.data.summary);
    } catch (err) {
      setError(
        isAxiosError(err)
          ? (err.response?.data as { error?: string })?.error ?? err.message
          : 'Failed to generate summary',
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="mt-4">
      {/* ── Summary card (shown once generated) ───────────────────────────── */}
      {summary && (
        <div className="mb-3 rounded-lg border border-primary/20 bg-primary/5 p-4">
          <div className="flex items-center gap-1.5 mb-2">
            {/* Sparkle icon */}
            <svg
              className="size-3.5 text-primary shrink-0"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
              <path d="M5 3v4" /><path d="M19 17v4" /><path d="M3 5h4" /><path d="M17 19h4" />
            </svg>
            <span className="text-xs font-semibold text-primary">AI Summary</span>
          </div>
          <p className="text-sm text-foreground leading-relaxed">{summary}</p>
        </div>
      )}

      {/* ── Error ──────────────────────────────────────────────────────────── */}
      {error && (
        <div className="mb-3 flex items-center gap-2 rounded-md px-3 py-2 text-xs text-destructive bg-destructive/5 border border-destructive/10">
          <svg className="size-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" /><path d="M12 8v4m0 4h.01" />
          </svg>
          {error}
        </div>
      )}

      {/* ── Button ─────────────────────────────────────────────────────────── */}
      <button
        type="button"
        onClick={handleSummarize}
        disabled={isLoading}
        className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted hover:border-primary/40 hover:text-primary focus:outline-none focus:ring-2 focus:ring-ring/50 disabled:opacity-40 disabled:pointer-events-none transition-all"
      >
        {isLoading ? (
          <>
            <svg className="size-3.5 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            Summarizing…
          </>
        ) : (
          <>
            <svg
              className="size-3.5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
              <path d="M5 3v4" /><path d="M19 17v4" /><path d="M3 5h4" /><path d="M17 19h4" />
            </svg>
            {summary ? 'Regenerate summary' : 'Summarize conversation'}
          </>
        )}
      </button>
    </div>
  );
}
