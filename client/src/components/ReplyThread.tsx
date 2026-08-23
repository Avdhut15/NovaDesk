// ─── Types ────────────────────────────────────────────────────────────────────

export interface TicketReply {
  id: string;
  body: string;
  fromAgent: boolean;
  createdAt: string;
  createdBy: { id: string; name: string; role: string } | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function formatDate(iso: string): string {
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
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ReplyThread({ replies }: { replies: TicketReply[] }) {
  if (replies.length === 0) {
    return (
      <div className="mt-5 rounded-lg border border-dashed border-border py-10 text-center text-sm text-muted-foreground">
        No replies yet.
      </div>
    );
  }

  return (
    <div className="mt-5 space-y-3">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
        Replies ({replies.length})
      </p>
      {replies.map((reply) => (
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
              <div
                className={`size-6 shrink-0 rounded-full text-[10px] font-semibold flex items-center justify-center select-none ${
                  reply.fromAgent
                    ? 'bg-primary/15 text-primary'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {reply.fromAgent
                  ? reply.createdBy
                    ? getInitials(reply.createdBy.name)
                    : 'A'
                  : 'C'}
              </div>
              <span className="text-xs font-medium text-foreground">
                {reply.fromAgent
                  ? reply.createdBy
                    ? reply.createdBy.name
                    : 'Agent'
                  : 'Customer'}
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
  );
}
