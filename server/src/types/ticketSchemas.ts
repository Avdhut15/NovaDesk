import { z } from 'zod';

// ─── Enums (mirrors Prisma enums) ─────────────────────────────────────────────

export const TicketStatusEnum = z.enum(['NEW', 'PROCESSING', 'OPEN', 'RESOLVED', 'CLOSED']);
export const TicketCategoryEnum = z.enum([
  'GENERAL_QUESTION',
  'TECHNICAL_QUESTION',
  'REFUND_REQUEST',
]);

// ─── Create Ticket ────────────────────────────────────────────────────────────
// Used by agents/admins creating tickets manually through the UI.

export const CreateTicketSchema = z.object({
  subject: z.string().min(1, 'Subject is required').max(255),
  body: z.string().min(1, 'Body is required'),
  category: TicketCategoryEnum.optional().default('GENERAL_QUESTION'),
  fromEmail: z.string().email('Must be a valid email').optional(),
  fromName: z.string().max(128).optional(),
  assignedAgentId: z.string().optional(),
});

export type CreateTicketInput = z.infer<typeof CreateTicketSchema>;

// ─── Update Ticket ────────────────────────────────────────────────────────────
// PATCH — all fields optional; at least one must be provided.

export const UpdateTicketSchema = z
  .object({
    status: TicketStatusEnum.optional(),
    category: TicketCategoryEnum.optional(),
    subject: z.string().min(1).max(255).optional(),
    body: z.string().min(1).optional(),
    assignedAgentId: z.string().nullable().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided for update',
  });

export type UpdateTicketInput = z.infer<typeof UpdateTicketSchema>;

// ─── Ingest (Email-to-Ticket) ─────────────────────────────────────────────────
// Simulates the webhook payload an email provider (Postmark, SendGrid, etc.)
// would POST when a message arrives at the support address.
// Fields intentionally mirror common inbound-parse webhook contracts.

export const IngestEmailSchema = z.object({
  /** Sender's email address */
  fromEmail: z.string().email('fromEmail must be a valid email address'),
  /** Sender's display name (optional — not all providers include this) */
  fromName: z.string().max(128).optional(),
  /** Email subject line — becomes the ticket subject */
  subject: z.string().min(1, 'subject is required').max(255),
  /** Plain-text or HTML body — becomes the ticket body */
  body: z.string().min(1, 'body is required'),
  /**
   * Optional thread ID from the email provider (e.g. Message-ID header).
   * Stored on the ticket for future threading / de-duplication support.
   * When provided, a duplicate with the same threadId will be rejected.
   */
  emailThreadId: z.string().max(512).optional(),
});

export type IngestEmailInput = z.infer<typeof IngestEmailSchema>;

// ─── Add Reply ────────────────────────────────────────────────────────────────

export const AddReplySchema = z.object({
  body: z.string().min(1, 'Reply body is required'),
  /** true = sent by an agent, false = a customer follow-up reply (future use) */
  fromAgent: z.boolean().default(true),
});

export type AddReplyInput = z.infer<typeof AddReplySchema>;

// ─── List Tickets Query Filters ───────────────────────────────────────────────

/** Columns the client is allowed to sort by. Must be top-level Ticket scalar fields. */
export const TicketSortByEnum = z.enum([
  'createdAt',
  'updatedAt',
  'subject',
  'status',
  'category',
  'fromEmail',
]);

export type TicketSortBy = z.infer<typeof TicketSortByEnum>;

export const ListTicketsQuerySchema = z.object({
  status: TicketStatusEnum.optional(),
  category: TicketCategoryEnum.optional(),
  assignedAgentId: z.string().optional(),
  /** Paginate: page number (1-indexed) */
  page: z.coerce.number().int().min(1).optional().default(1),
  /** Paginate: results per page (max 100) */
  limit: z.coerce.number().int().min(1).max(100).optional().default(25),
  /** Column to sort by (default: createdAt) */
  sortBy: TicketSortByEnum.optional().default('createdAt'),
  /** Sort direction (default: desc — newest first) */
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

export type ListTicketsQuery = z.infer<typeof ListTicketsQuerySchema>;
