# ✦ NovaDesk

> AI-powered ticket management system — classify, summarise, auto-resolve, and respond to support tickets at scale.

[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Bun](https://img.shields.io/badge/Bun-1.3-black?logo=bun)](https://bun.sh/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)](https://react.dev/)
[![Express](https://img.shields.io/badge/Express-5-000000?logo=express)](https://expressjs.com/)
[![Prisma](https://img.shields.io/badge/Prisma-7-2D3748?logo=prisma)](https://www.prisma.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-18-336791?logo=postgresql)](https://www.postgresql.org/)

---

## 📖 Overview

NovaDesk solves the problem of high-volume support email management. Agents manually reading, classifying, and responding to hundreds of emails daily leads to slow, impersonal responses. NovaDesk automates ticket intake, classification, and reply generation using AI — and can fully auto-resolve common queries without any human involvement — freeing agents to focus on complex issues.

### Key Features

- 📧 **Email-to-Ticket** — Inbound emails automatically create support tickets via webhook
- 🤖 **AI Classification** — Auto-categorise tickets using Gemini AI (background queue)
- 📝 **AI Summaries** — One-click ticket summarisation
- 💬 **AI Suggested Replies** — Context-aware draft responses drawn from the knowledge base
- ⚡ **AI Auto-Resolution** — Tickets are automatically assigned to the AI agent and resolved without human intervention when the knowledge base contains a clear answer; escalated and unassigned otherwise
- 🎫 **Ticket Management** — Full CRUD with filtering, sorting, pagination, and status tracking
- 👥 **Role-Based Access** — Admin and Agent roles with separate permissions
- 📊 **Live Dashboard** — Real-time KPI metrics (total, open, AI-resolved, resolution rate, avg resolution time) with a 30-day tickets-per-day bar chart

---

## 🏗️ Architecture

```
NovaDesk/
├── client/          # React 19 + TypeScript + Vite 8 + Tailwind CSS v4 (port 5173)
│   └── src/
│       ├── components/ui/ # shadcn/ui components (Nova preset, Blue theme)
│       ├── layouts/       # AppLayout (sticky top navbar shell)
│       ├── lib/           # Better Auth client & utility helpers
│       └── pages/         # LoginPage, DashboardPage, TicketsPage, TicketDetailPage, UsersPage
│
└── server/          # Express 5 + TypeScript on Bun (port 3001)
    ├── prisma/      # Schema, migrations & seed script
    └── src/
        ├── config/      # Env validation (zod)
        ├── lib/         # Prisma singleton, Better Auth server, AI client, pg-boss queue
        ├── middleware/  # requireAuth, error handler, 404
        ├── routes/      # API route modules (tickets, users, agents, ai, dashboard)
        └── workers/     # pg-boss background workers (classify, auto-resolve)
```

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Runtime & Package Manager** | [Bun](https://bun.sh/) 1.3 |
| **Frontend** | React 19, TypeScript, Vite 8, Tailwind CSS v4 |
| **UI Components** | [shadcn/ui](https://ui.shadcn.com/) (Nova preset, Blue theme, `@base-ui/react` primitives) |
| **Forms & Validation** | React Hook Form + Zod (`@hookform/resolvers/zod`) |
| **Data Fetching** | TanStack Query v5 + Axios |
| **Routing** | React Router 7 |
| **Charts** | Recharts 3 |
| **Backend** | Express 5, TypeScript |
| **Auth** | [Better Auth](https://www.better-auth.com/) with Postgres sessions & RBAC roles (`ADMIN` / `AGENT`) |
| **Database** | PostgreSQL 18 |
| **ORM** | Prisma 7 with `@prisma/adapter-pg` |
| **Job Queue** | [pg-boss](https://github.com/timgit/pg-boss) (background classification & auto-resolution workers) |
| **AI** | Google Gemini via Vercel AI SDK (`@ai-sdk/google`) |

---

## 🚀 Getting Started

### Prerequisites

- [Bun](https://bun.sh/) ≥ 1.3
- [PostgreSQL](https://www.postgresql.org/) ≥ 16
- A [Google AI Studio](https://aistudio.google.com/) API key (for AI features)

### 1. Clone & Install

```bash
git clone https://github.com/Avdhut15/NovaDesk.git
cd NovaDesk
bun install
```

### 2. Configure Environment

```bash
cp server/.env.example server/.env
```

Edit `server/.env`:

```env
NODE_ENV=development
PORT=3001
CLIENT_URL=http://localhost:5173
DATABASE_URL=postgresql://postgres:your_password@localhost:5432/novadesk
BETTER_AUTH_SECRET=your-random-32-character-secret
BETTER_AUTH_URL=http://localhost:3001
GOOGLE_GENERATIVE_AI_API_KEY=your-gemini-api-key
```

### 3. Set Up Database

```bash
# Create the PostgreSQL database
psql -U postgres -c "CREATE DATABASE novadesk;"

# Run migrations
bun run --cwd server db:migrate

# Seed with sample data (creates admin, agent, AI agent & 50 demo tickets)
bun run --cwd server db:seed
```

### 4. Start Development Servers

```bash
# Terminal 1 — API server (http://localhost:3001)
bun run dev:server

# Terminal 2 — React client (http://localhost:5173)
bun run dev:client
```

Default seed credentials:
- **Admin** — `admin@example.com` / `password123`
- **Agent** — `agent1@example.com` / `password123`

---

## 📡 API Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/health` | — | Server + DB health check |
| `GET` | `/api` | — | API version info |
| `ALL` | `/api/auth/*` | — | Better Auth handlers (sign in, sign out, session) |
| `GET` | `/api/dashboard/stats` | ✅ | KPI metrics + 30-day per-day ticket counts |
| `GET` | `/api/tickets` | ✅ | List tickets (filter, sort, paginate) |
| `POST` | `/api/tickets` | ✅ | Manually create ticket |
| `POST` | `/api/tickets/ingest` | — | Inbound email webhook (creates & queues AI jobs) |
| `GET` | `/api/tickets/:id` | ✅ | Get ticket with replies & AI fields |
| `PATCH` | `/api/tickets/:id` | ✅ | Update ticket (status, agent, category…) |
| `DELETE` | `/api/tickets/:id` | 🔒 Admin | Hard-delete ticket |
| `POST` | `/api/tickets/:id/summarise` | ✅ | AI summarise ticket |
| `POST` | `/api/tickets/:id/suggest-reply` | ✅ | AI suggest reply |
| `GET` | `/api/tickets/:ticketId/replies` | ✅ | List replies |
| `POST` | `/api/tickets/:ticketId/replies` | ✅ | Post a reply |
| `GET` | `/api/agents` | ✅ | List all agents (for assignment dropdowns) |
| `GET` | `/api/users` | 🔒 Admin | List users |
| `POST` | `/api/users` | 🔒 Admin | Create user |
| `PATCH` | `/api/users/:id` | 🔒 Admin | Update user |
| `DELETE` | `/api/users/:id` | 🔒 Admin | Soft-delete user |

---

## 🗄️ Data Model

```
User          — id, email, name, emailVerified, role (ADMIN|AGENT), deletedAt
Session       — id, expiresAt, token, userId
Account       — id, accountId, providerId, userId, password (hashed)
Verification  — id, identifier, value, expiresAt
Ticket        — id, subject, body, status, category, fromEmail, fromName,
                emailThreadId, aiSummary, aiSuggestedReply,
                assignedAgentId, createdById, createdAt, updatedAt
TicketReply   — id, body, fromAgent, ticketId, createdById, createdAt
KnowledgeBase — id, title, content, category, createdAt, updatedAt
```

**Ticket Statuses:** `NEW` → `PROCESSING` → `OPEN` → `RESOLVED` → `CLOSED`

**Ticket Categories:** `GENERAL_QUESTION` · `TECHNICAL_QUESTION` · `REFUND_REQUEST`

### AI Agent Flow

When a ticket arrives (via ingest or manual creation), it is automatically assigned to the virtual **AI agent** (`ai@novadesk.internal`). A background worker attempts to resolve it using the knowledge base:

- **Resolved** → reply posted, status set to `RESOLVED`, AI agent remains assigned.
- **Escalated** → status set to `OPEN`, `assignedAgentId` cleared — ready for a human agent.

---

## 🧑‍💻 Development Scripts

```bash
# Root (runs across workspaces)
bun run dev:server      # Start Express server with hot-reload
bun run dev:client      # Start Vite dev server

# Server workspace (cd server or use --cwd server)
bun run db:migrate      # Run Prisma migrations
bun run db:push         # Push schema without migration file
bun run db:generate     # Regenerate Prisma client
bun run db:studio       # Open Prisma Studio UI
bun run db:seed         # Seed: admin, agent, AI agent, KB articles & 50 demo tickets
bun run build           # Bundle server with Bun
```

---

## 🗺️ Roadmap

- [x] Phase 1 — Project setup (monorepo, Express, React, PostgreSQL, Prisma)
- [x] Phase 2 — Authentication (Better Auth, Postgres sessions, RBAC, login/logout, route guards)
- [x] Phase 3 — User management (admin CRUD for agents, soft-delete, role enforcement)
- [x] Phase 4 — Ticket CRUD (create, list, filter, sort, paginate, detail view, replies)
- [x] Phase 5 — AI features (classification, summaries, suggested replies, auto-resolution via pg-boss queue)
- [ ] Phase 6 — Email integration (inbound webhooks, outbound replies via SendGrid / Mailgun)
- [ ] Phase 7 — Polish & deployment (Docker, CI/CD, production hardening)
