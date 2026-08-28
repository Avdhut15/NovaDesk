import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { env } from '../config/env';

// ─── Shared AI Provider client ────────────────────────────────────────────────
// gemini-3.5-flash-lite: 500 req/day on the free tier.

export const AI_MODEL = 'gemini-3.5-flash-lite';

export const google = createGoogleGenerativeAI({ apiKey: env.GEMINI_API_KEY });
