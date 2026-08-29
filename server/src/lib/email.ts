import nodemailer from 'nodemailer';
import { env } from '../config/env';

// ─── Enabled Guard ─────────────────────────────────────────────────────────────
// The email subsystem is considered enabled only when both EMAIL_USER and
// EMAIL_APP_PASSWORD are set. All consumers must call isEmailEnabled() first.

export function isEmailEnabled(): boolean {
  return Boolean(env.EMAIL_USER && env.EMAIL_APP_PASSWORD);
}

// ─── Transporter (lazy singleton) ─────────────────────────────────────────────

let _transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter {
  if (_transporter) return _transporter;

  _transporter = nodemailer.createTransport({
    host: env.EMAIL_SMTP_HOST,
    port: env.EMAIL_SMTP_PORT,
    secure: env.EMAIL_SMTP_PORT === 465, // true for SSL (465), false for STARTTLS (587)
    auth: {
      user: env.EMAIL_USER!,
      pass: env.EMAIL_APP_PASSWORD!,
    },
  });

  return _transporter;
}

// ─── Send Reply Email ──────────────────────────────────────────────────────────
// Sends a plain-text reply email from the support address to the customer.
// Safe to call even if email is disabled — it will return early with a warning.

export interface SendReplyEmailOptions {
  /** Customer's email address */
  to: string;
  /** Customer's display name (optional) */
  toName?: string | null;
  /** Original ticket subject — will be prefixed with "Re: " */
  subject: string;
  /** Plain-text reply body */
  body: string;
}

import { marked } from 'marked';

export async function sendReplyEmail(opts: SendReplyEmailOptions): Promise<void> {
  if (!isEmailEnabled()) {
    console.warn('[email] subsystem disabled — skipping sendReplyEmail');
    return;
  }

  const { to, toName, subject, body } = opts;
  const replySubject = subject.startsWith('Re:') ? subject : `Re: ${subject}`;
  const toAddress = toName ? `"${toName}" <${to}>` : to;

  try {
    const htmlBody = await marked.parse(body);

    const info = await getTransporter().sendMail({
      from: `"NovaDesk Support" <${env.EMAIL_USER}>`,
      to: toAddress,
      subject: replySubject,
      text: body,
      html: htmlBody,
    });

    console.log(`[email] Reply sent to ${to} — messageId: ${info.messageId}`);
  } catch (err) {
    // Log but don't throw — a failed email should never crash a reply API call
    console.error('[email] Failed to send reply email:', err instanceof Error ? err.message : err);
    throw err; // Re-throw so the pg-boss worker can retry the job
  }
}

// ─── Init Log ─────────────────────────────────────────────────────────────────

export function logEmailStatus(): void {
  if (isEmailEnabled()) {
    console.log(`[email] ✅ Subsystem enabled — user: ${env.EMAIL_USER}`);
    console.log(`[email]    IMAP: ${env.EMAIL_HOST}:${env.EMAIL_PORT}`);
    console.log(`[email]    SMTP: ${env.EMAIL_SMTP_HOST}:${env.EMAIL_SMTP_PORT}`);
    console.log(`[email]    Poll interval: ${env.EMAIL_POLL_INTERVAL}s`);
  } else {
    console.log('[email] ⚠️  Subsystem disabled — set EMAIL_USER and EMAIL_APP_PASSWORD to enable');
  }
}
