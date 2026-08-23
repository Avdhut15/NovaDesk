import { formatDate } from './ReplyThread';

// ─── Types ────────────────────────────────────────────────────────────────────

interface TicketDetailProps {
  subject: string;
  body: string;
  fromName: string | null;
  fromEmail: string | null;
  createdAt: string;
  updatedAt: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function TicketDetail({
  subject,
  body,
  fromName,
  fromEmail,
  createdAt,
  updatedAt,
}: TicketDetailProps) {
  return (
    <>
      {/* Subject */}
      <h1 className="text-2xl font-bold text-foreground leading-snug">{subject}</h1>

      {/* Metadata */}
      <div className="mt-3 space-y-1 text-sm text-muted-foreground">
        <p>
          <span className="font-medium text-foreground">From:</span>{' '}
          {fromName ?? 'Manual ticket'}
          {fromEmail && <span> ({fromEmail})</span>}
        </p>
        <p>
          <span className="font-medium text-foreground">Created:</span>{' '}
          {formatDate(createdAt)}
        </p>
        <p>
          <span className="font-medium text-foreground">Updated:</span>{' '}
          {formatDate(updatedAt)}
        </p>
      </div>

      {/* Message card */}
      <div className="mt-6 rounded-lg border border-border bg-card p-5">
        <p className="font-semibold text-foreground text-sm">Message</p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          From {fromName ?? 'Manual ticket'}
        </p>
        <p className="mt-4 text-sm text-foreground whitespace-pre-wrap leading-relaxed">
          {body}
        </p>
      </div>
    </>
  );
}
