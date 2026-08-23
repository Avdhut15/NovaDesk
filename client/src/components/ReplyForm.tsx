import { isAxiosError } from 'axios';

// ─── Component ────────────────────────────────────────────────────────────────

interface ReplyFormProps {
  replyBody: string;
  replyFromAgent: boolean;
  isPending: boolean;
  isError: boolean;
  error: Error | null;
  onBodyChange: (val: string) => void;
  onFromAgentChange: (val: boolean) => void;
  onSubmit: () => void;
}

export function ReplyForm({
  replyBody,
  replyFromAgent,
  isPending,
  isError,
  error,
  onBodyChange,
  onFromAgentChange,
  onSubmit,
}: ReplyFormProps) {
  return (
    <div className="mt-6 rounded-lg border border-border bg-card p-5">
      <p className="font-semibold text-foreground text-sm mb-3">Add a reply</p>

      <div className="mb-3">
        <textarea
          className="w-full min-h-[120px] rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/50 focus:border-ring placeholder:text-muted-foreground disabled:opacity-50 resize-y"
          placeholder="Type your reply here..."
          value={replyBody}
          onChange={(e) => onBodyChange(e.target.value)}
          disabled={isPending}
        />
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5 cursor-pointer">
            <input
              type="radio"
              className="accent-primary"
              checked={replyFromAgent}
              onChange={() => onFromAgentChange(true)}
              disabled={isPending}
            />
            Reply as Agent
          </label>
          <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5 cursor-pointer ml-3">
            <input
              type="radio"
              className="accent-primary"
              checked={!replyFromAgent}
              onChange={() => onFromAgentChange(false)}
              disabled={isPending}
            />
            Simulate Customer
          </label>
        </div>

        <div className="flex items-center gap-3">
          {isError && (
            <span className="text-xs text-destructive">
              {isAxiosError(error)
                ? (error.response?.data as { error?: string })?.error ??
                  error.message
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
