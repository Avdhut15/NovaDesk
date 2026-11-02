# ✦ NovaDesk

> **Enterprise-Ready, AI-Native Customer Support & Ticket Management Platform**  
> Streamline high-volume customer inquiries with automated multi-channel ingestion, Gemini-powered triage, autonomous knowledge-base resolution, and human-in-the-loop escalation.

<div align="center">

[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Bun](https://img.shields.io/badge/Bun-1.3-000000?style=flat-square&logo=bun&logoColor=white)](https://bun.sh/)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev/)
[![Express](https://img.shields.io/badge/Express-5.0-000000?style=flat-square&logo=express&logoColor=white)](https://expressjs.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-18-4169E1?style=flat-square&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Prisma](https://img.shields.io/badge/Prisma-7-2D3748?style=flat-square&logo=prisma&logoColor=white)](https://www.prisma.io/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Google Gemini](https://img.shields.io/badge/Google_Gemini-2.5_Flash-8E75B2?style=flat-square&logo=google&logoColor=white)](https://aistudio.google.com/)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?style=flat-square&logo=docker&logoColor=white)](https://www.docker.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg?style=flat-square)](LICENSE)

</div>

---

## 📖 Executive Summary

Modern customer support teams lose hundreds of hours every week manually sorting, classifying, and replying to repetitive inbound emails. **NovaDesk** eliminates this operational bottleneck through an event-driven architecture combining asynchronous queue workers with Large Language Models (LLMs).

Incoming emails from support mailboxes or webhook providers are instantly triaged into an autonomous pipeline. Grounded by an internal Knowledge Base, NovaDesk autonomously resolves routine inquiries, drafts contextual replies, flags high-risk issues for senior staff, and keeps ticket states synchronized across customer and agent interactions.

---

## 🏛️ System Architecture

NovaDesk utilizes a decoupled monorepo architecture: a high-performance **React 19 SPA** frontend paired with an **Express 5** REST API backend running on the **Bun** runtime. Asynchronous workflows, LLM inferences, and email synchronization are decoupled from the HTTP request-response cycle using **pg-boss**, a transactional job queue built natively on PostgreSQL.

### Architecture Diagram

```mermaid
flowchart TB
    %% ─────────────────────────────────────────────────────────────
    %% Layer 1: Client and Ingestion
    %% ─────────────────────────────────────────────────────────────
    subgraph L1["1. Client and Ingestion Layer"]
        Customer["Customer<br/>(Email / Inbound Queries)"]
        AgentUI["Support Agent & Admin<br/>(React 19 SPA • Vite 8 • Tailwind CSS v4)"]
        WebhookClient["External Inbound Webhooks<br/>(SendGrid / Postmark / Mailgun)"]
    end

    %% ─────────────────────────────────────────────────────────────
    %% Layer 2: API and Security
    %% ─────────────────────────────────────────────────────────────
    subgraph L2["2. API and Security Layer (Express 5 on Bun)"]
        APIGateway["Express 5 REST API Gateway<br/>(Port 3001 • Trust Proxy Enabled)"]
        BetterAuth["Better Auth & Session Guard<br/>(PostgreSQL Session Validation)"]
        RBAC["RBAC Middleware<br/>(Role Enforcement: ADMIN / AGENT)"]
        
        subgraph Endpoints["REST Route Controllers"]
            Routes_Tickets["/api/tickets<br/>(CRUD • Sort • Filter • Ingest)"]
            Routes_AI["/api/tickets/:id<br/>(Summarize • Polish Reply)"]
            Routes_Replies["/api/tickets/:id/replies<br/>(Thread History & Post Reply)"]
            Routes_Dash["/api/dashboard<br/>(KPI Aggregation & 30-Day Trends)"]
            Routes_Users["/api/users & /api/agents<br/>(Agent Directory & Admin CRUD)"]
        end

        APIGateway --> BetterAuth
        BetterAuth --> RBAC
        RBAC --> Endpoints
    end

    %% ─────────────────────────────────────────────────────────────
    %% Layer 3: Background Job Orchestration
    %% ─────────────────────────────────────────────────────────────
    subgraph L3["3. Background Job Orchestration Layer (pg-boss)"]
        BossQueue["pg-boss Queue Engine<br/>(Transactional Job Scheduler & Queue)"]

        subgraph Workers["Asynchronous Job Workers"]
            W_IMAP["imap-poll Worker<br/>(Cron: every 60s)"]
            W_Classify["classify-ticket Worker<br/>(Event-driven AI classification)"]
            W_Resolve["auto-resolve-ticket Worker<br/>(Autonomous resolution & escalation)"]
            W_Email["send-reply-email Worker<br/>(Outbound customer dispatch)"]
            W_Close["close-resolved-tickets Worker<br/>(Scheduled cron: hourly)"]
        end

        BossQueue -.->|Dispatches jobs| Workers
    end

    %% ─────────────────────────────────────────────────────────────
    %% Layer 4: AI and External Integrations
    %% ─────────────────────────────────────────────────────────────
    subgraph L4["4. AI and External Integrations Layer"]
        GeminiAPI["Google Gemini 2.5 Flash API<br/>(Vercel AI SDK • Categorization, Resolution, Polish, Summary)"]
        IMAPService["Inbound IMAP Mail Server<br/>(Gmail / Custom IMAP • TLS 993)"]
        SMTPService["Outbound SMTP Mail Server<br/>(Nodemailer • STARTTLS 587 / SSL 465)"]
    end

    %% ─────────────────────────────────────────────────────────────
    %% Layer 5: Data Persistence
    %% ─────────────────────────────────────────────────────────────
    subgraph L5["5. Data Persistence Layer"]
        PrismaORM["Prisma 7 ORM<br/>(@prisma/adapter-pg client)"]

        subgraph PostgresStorage["PostgreSQL 18 Database"]
            AppTables[("Application Schema<br/>• tickets & ticket_replies<br/>• knowledge_base<br/>• user, session, account")]
            BossTables[("pg-boss Schema (pgboss.*)<br/>• job & archive<br/>• schedule & version")]
        end

        PrismaORM <-->|SQL Queries / Connection Pool| AppTables
        BossQueue <-->|Transactional Job State Management| BossTables
    end

    %% ─────────────────────────────────────────────────────────────
    %% Cross-Layer Flows & Connectors
    %% ─────────────────────────────────────────────────────────────
    %% Client & Ingestion Flows
    Customer -->|1. Inbound email| IMAPService
    IMAPService <-->|2. Fetches unseen emails| W_IMAP
    W_IMAP -->|3. Ingests ticket record| PrismaORM
    W_IMAP -.->|4. Enqueues classify & auto-resolve| BossQueue

    WebhookClient -->|Inbound Webhook POST /ingest| APIGateway
    AgentUI <-->|HTTPS API Requests & Cookie Auth| APIGateway

    %% API to Persistence & Queue
    Endpoints <-->|Data CRUD via Prisma| PrismaORM
    Endpoints -.->|Enqueue email & AI jobs| BossQueue
    Routes_AI -->|On-demand Summarize & Polish| GeminiAPI

    %% Worker Processing Flows
    W_Classify -->|Prompt: 4 e-commerce categories| GeminiAPI
    W_Classify -->|Persist assigned category| PrismaORM

    W_Resolve -->|1. Fetch Knowledge Base articles| PrismaORM
    W_Resolve -->|2. Evaluate resolution & guardrails| GeminiAPI
    W_Resolve -->|3. Update status to RESOLVED or OPEN| PrismaORM
    W_Resolve -.->|4. If resolved: Enqueue send-reply-email| BossQueue

    W_Email -->|Render Markdown & Send via SMTP| SMTPService
    SMTPService -->|Deliver reply email| Customer

    W_Close -->|Batch update: RESOLVED > 24h to CLOSED| PrismaORM

    %% ─────────────────────────────────────────────────────────────
    %% Diagram Legend
    %% ─────────────────────────────────────────────────────────────
    subgraph Legend["Diagram Legend"]
        direction LR
        Leg_Sync["── Solid Arrow: Synchronous HTTP / Internal Method Call"]
        Leg_Async["-.- Dashed Arrow: Asynchronous Queue Event (pg-boss)"]
        Leg_Data["<--> Double Arrow: Database Read/Write or Bidirectional Sync"]
    end

    %% Visual Styling
    style L1 fill:#f8fafc,stroke:#cbd5e1,stroke-width:1.5px
    style L2 fill:#eff6ff,stroke:#93c5fd,stroke-width:1.5px
    style L3 fill:#fef3c7,stroke:#fcd34d,stroke-width:1.5px
    style L4 fill:#f3e8ff,stroke:#d8b4fe,stroke-width:1.5px
    style L5 fill:#ecfdf5,stroke:#6ee7b7,stroke-width:1.5px
    style Legend fill:#ffffff,stroke:#e2e8f0,stroke-width:1px
```

---

## ⚡ Core Features

### 🤖 Autonomous AI Resolution & Escalation
- **Autonomous Resolution**: Evaluates incoming tickets against indexed Knowledge Base articles. If confidence is high and policies permit, NovaDesk drafts a professional response, sends it to the customer, and marks the ticket as `RESOLVED`.
- **Strict Guardrail Escalation**: Automatically routes inquiries to human agents (`OPEN` status, unassigned) when detecting:
  - Suspected package loss, courier claims, or fraud.
  - Defective or damaged high-value items.
  - Legal notices or disputes.
  - Payment chargebacks and transaction disputes.
  - Low AI confidence or out-of-scope policies.

### 🏷️ Real-Time Ticket Classification
- Asynchronously assigns newly ingested tickets to one of four domain categories via Gemini AI without delaying webhook reception or agent intake.

### 📥 Multi-Channel Ingestion & Outbound Email
- **IMAP Support Mailbox Polling**: Connects via IMAP (`imap-simple` + `mailparser`) on a scheduled interval to ingest unseen emails with automated de-duplication.
- **Email Thread Parsing**: Integrates `email-reply-parser` to strip previous thread chains, email signatures, and quoted headers.
- **Inbound Webhook API**: Accepts payloads matching major email providers (SendGrid, Postmark, Mailgun) via `/api/tickets/ingest`.
- **SMTP Reply Dispatch**: Outbound replies from human agents or the AI agent are delivered back to the customer via Nodemailer with Markdown-to-HTML rendering.

### ✍️ AI Agent Co-Pilot (Human-in-the-Loop)
- **Ticket Summarization**: Condenses long, multi-party email threads into a 3-sentence operational digest highlighting customer intent, current status, and required actions.
- **Draft Reply Polishing**: Elevates agent drafts into warm, concise, professional customer replies—automatically greeting the customer by first name and signing off with the agent's name.

### 📊 Live Analytics & KPI Dashboard
- Instant tracking of operational metrics: **Total Tickets**, **Open Queue**, **AI-Resolved Volume**, **Overall Resolution Rate**, and **Average AI Resolution Time**.
- 30-day interactive ticket volume trend chart powered by Recharts.

### 🔐 Enterprise Auth & Role-Based Access Control (RBAC)
- Backed by **Better Auth** with database-persisted sessions.
- **Admin**: Full administrative privileges—user creation, agent management, soft deletion, system statistics, and hard ticket removal.
- **Agent**: Operational access—ticket assignment, status transitions, response threads, and AI co-pilot tools.

---

## 🎫 Ticket Lifecycle & Taxonomy

### Ticket Status State Machine

```mermaid
stateDiagram-v2
    direction TB

    [*] --> NEW : Ingestion via Email (IMAP), Webhook, or Manual UI creation

    NEW --> PROCESSING : pg-boss autoResolveTicket worker acquires ticket<br/>(Status immediately set to PROCESSING)

    state PROCESSING {
        [*] --> FetchKB : Retrieve indexed Knowledge Base articles
        FetchKB --> GeminiInference : Prompt Gemini 2.5 Flash with Context & Policies
        GeminiInference --> HighConfidence : Answer found in KB & no risk triggers
        GeminiInference --> EscalationTrigger : Lost package, fraud, legal, refund dispute, or low confidence
    }

    PROCESSING --> RESOLVED : Autonomous AI Resolution<br/>[AI posts reply, sets assignedAgent = AI, enqueues outbound email]

    PROCESSING --> OPEN : Escalation to Human Queue<br/>[Guardrail triggered: AI unassigned (assignedAgent = null), routed to human backlog]

    OPEN --> OPEN : Agent Assignment<br/>[Admin / Agent claims ticket or reassigns to teammate]

    OPEN --> RESOLVED : Human Agent Resolution<br/>[Agent posts reply and marks ticket as RESOLVED]

    OPEN --> CLOSED : Manual Close<br/>[Agent / Admin manually closes ticket without reply]

    RESOLVED --> OPEN : Customer Follow-up Reply<br/>[New customer reply arrives: ticket automatically re-opens]

    RESOLVED --> CLOSED : 24-Hour Inactivity Rule<br/>[Hourly cron worker (close-resolved-tickets) archives resolved tickets > 24h old]

    CLOSED --> [*] : Archived Ticket<br/>[Ticket locked: further replies return HTTP 409 Conflict]

    note right of OPEN
        Escalation in NovaDesk:
        The database schema defines status as OPEN.
        Escalated tickets are identified by having
        status = OPEN and assignedAgentId = null,
        allowing human support agents to filter
        and claim unhandled complex inquiries.
    end note

    note left of RESOLVED
        Auto-Reopen Guarantee:
        Whenever a new reply is posted to a
        RESOLVED ticket (via email or API),
        the backend automatically transitions
        status back to OPEN for review.
    end note
```

| Status | Description |
|---|---|
| `NEW` | Ticket newly created or ingested; queued for background processing. |
| `PROCESSING` | Currently being evaluated by AI workers (`classify-ticket` and `auto-resolve-ticket`). |
| `OPEN` | Active ticket in the human queue awaiting agent action or review. |
| `RESOLVED` | Successfully answered by an agent or auto-resolved by AI. Automatically re-opens to `OPEN` if a customer sends a follow-up reply. |
| `CLOSED` | Finalized ticket; automatically archived by the 24-hour cleanup cron or closed manually. |

### Ticket Categories

NovaDesk is tuned for e-commerce customer support workflows:

| Category | Typical Inquiries Covered |
|---|---|
| `GENERAL_QUESTION` | Business hours, store policies, account access, general inquiries. |
| `SHIPPING_ISSUE` | Tracking requests, delivery delays, missing shipments, wrong delivery addresses. |
| `PRODUCT_ISSUE` | Damaged goods, defective items, missing parts, product usage instructions. |
| `REFUND_REQUEST` | Return authorizations, refund status, payment inquiries, order cancellations. |

---

## 🛠️ Tech Stack

| Layer | Technologies |
|---|---|
| **Runtime & Package Manager** | [Bun](https://bun.sh/) 1.3 (Monorepo Workspaces) |
| **Frontend Framework** | [React 19](https://react.dev/), [TypeScript 5.8](https://www.typescriptlang.org/), [Vite 8](https://vite.dev/) |
| **UI Components & Styling** | [shadcn/ui](https://ui.shadcn.com/) (Nova preset, Blue theme, `@base-ui/react` primitives), [Tailwind CSS v4](https://tailwindcss.com/) |
| **State & Data Fetching** | [TanStack Query v5](https://tanstack.com/query), [Axios](https://axios-http.com/) |
| **Forms & Validation** | React Hook Form, [Zod](https://zod.dev/) (`@hookform/resolvers/zod`) |
| **Routing & Visualizations** | React Router 7, [Recharts 3](https://recharts.org/) |
| **Backend Framework** | [Express 5](https://expressjs.com/), TypeScript |
| **Authentication & RBAC** | [Better Auth](https://www.better-auth.com/) (PostgreSQL session store, `ADMIN` & `AGENT` roles) |
| **Database & ORM** | [PostgreSQL 18](https://www.postgresql.org/), [Prisma 7](https://www.prisma.io/) (`@prisma/adapter-pg`) |
| **Job Queue & Scheduling** | [pg-boss](https://github.com/timgit/pg-boss) (transactional PostgreSQL job queue) |
| **Artificial Intelligence** | [Google Gemini 2.5 Flash](https://aistudio.google.com/) via [Vercel AI SDK](https://sdk.vercel.ai/) (`@ai-sdk/google`) |
| **Email Processing & SMTP** | `imap-simple`, `mailparser`, `email-reply-parser`, `nodemailer`, `marked` |
| **Containerization** | Docker (multi-stage Alpine Bun build) |

---

## 📁 Repository Structure

```
NovaDesk/
├── client/                     # Frontend SPA (React 19 + Vite 8 + Tailwind CSS v4)
│   ├── src/
│   │   ├── components/         # UI & ticket modules (UpdateTicket, ReplyThread, etc.)
│   │   │   └── ui/             # shadcn/ui base-ui primitive components
│   │   ├── layouts/            # AppLayout (clean sticky top navbar)
│   │   ├── lib/                # Better Auth client & Axios configuration
│   │   ├── pages/              # Dashboard, Tickets, TicketDetail, Users, Login
│   │   ├── App.tsx             # Route definitions & RBAC guards
│   │   └── main.tsx            # Application entrypoint & TanStack Query Provider
│   ├── package.json
│   └── vite.config.ts
│
├── server/                     # Backend API & Workers (Express 5 on Bun)
│   ├── prisma/
│   │   ├── schema.prisma       # Database models, enums & relations
│   │   ├── seed.ts             # Idempotent database seeder (admin, agent, AI agent, KB)
│   │   └── knowledge-base.json # E-commerce knowledge base articles
│   ├── src/
│   │   ├── config/             # Zod environment schema validation
│   │   ├── lib/                # Prisma client, Better Auth instance, AI SDK, email, pg-boss
│   │   ├── middleware/         # requireAuth, role checks, global error handler, 404
│   │   ├── routes/             # tickets, replies, aiTickets, users, agents, dashboard
│   │   ├── types/              # Input validation schemas (CreateTicket, Ingest, etc.)
│   │   ├── workers/            # pg-boss workers (classify, auto-resolve, imap, email)
│   │   └── index.ts            # Server bootstrap & worker initialization
│   ├── package.json
│   └── tsconfig.json
│
├── Dockerfile                  # Multi-stage production container build
├── docker-entrypoint.sh        # Container startup (prisma push + seed + start)
├── package.json                # Root monorepo workspace configuration
└── README.md
```

---

## 🚀 Getting Started

### Prerequisites

- [Bun](https://bun.sh/) ≥ 1.3
- [PostgreSQL](https://www.postgresql.org/) ≥ 16
- [Google AI Studio](https://aistudio.google.com/) API Key

---

### Step 1: Clone & Install Dependencies

```bash
git clone https://github.com/Avdhut15/NovaDesk.git
cd NovaDesk
bun install
```

---

### Step 2: Configure Environment Variables

Create the `.env` configuration file inside `server/`:

```bash
cp server/.env.example server/.env
```

Edit `server/.env` with your credentials:

```env
NODE_ENV=development
PORT=3001
CLIENT_URL=http://localhost:5173
DATABASE_URL=postgresql://postgres:your_password@localhost:5432/novadesk

# Better Auth — Generate a 32-character secret: openssl rand -base64 32
BETTER_AUTH_SECRET=your-secure-32-character-secret
BETTER_AUTH_URL=http://localhost:3001

# Seed Credentials (used by bun run db:seed)
SEED_ADMIN_EMAIL=admin@example.com
SEED_ADMIN_PASSWORD=password123
SEED_ADMIN_NAME=Admin

# Google AI Studio API Key
GEMINI_API_KEY=your_gemini_api_key_here

# ── Optional: Email Subsystem (IMAP + SMTP) ──────────────────────────
# Leave blank to run without email polling/sending (graceful fallback)
EMAIL_USER=your_support_email@gmail.com
EMAIL_APP_PASSWORD=your_16_char_google_app_password
EMAIL_HOST=imap.gmail.com
EMAIL_PORT=993
EMAIL_SMTP_HOST=smtp.gmail.com
EMAIL_SMTP_PORT=587
EMAIL_POLL_INTERVAL=60
```

Optionally, configure `client/.env`:

```env
VITE_API_URL=http://localhost:3001
```

---

### Step 3: Initialize Database & Seed Data

```bash
# 1. Create the PostgreSQL database (if not already created)
psql -U postgres -c "CREATE DATABASE novadesk;"

# 2. Push Prisma schema to the database
bun run --cwd server db:push

# 3. Seed administrative accounts, AI agent persona, and e-commerce KB articles
bun run --cwd server db:seed
```

> **Default Seed Accounts:**
> - **Administrator**: `admin@example.com` / `password123` (Access to User Management, KPIs, and all tickets)
> - **Support Agent**: `agent1@example.com` / `password123` (Access to Tickets & Dashboard)

---

### Step 4: Run Development Servers

Run both services concurrently from the root directory:

```bash
# Terminal 1 — Backend Express Server (http://localhost:3001)
bun run dev:server

# Terminal 2 — Frontend React App (http://localhost:5173)
bun run dev:client
```

---

## 🐳 Docker Deployment

NovaDesk includes a production-ready, multi-stage Docker build that bundles both the React frontend and Express server into a unified Alpine container.

### Build and Run with Docker

```bash
# 1. Build the Docker image
docker build -t novadesk:latest .

# 2. Run container with your database and environment settings
docker run -d \
  -p 3001:3001 \
  -e DATABASE_URL="postgresql://postgres:password@host.docker.internal:5432/novadesk" \
  -e BETTER_AUTH_SECRET="your-secure-32-character-secret" \
  -e BETTER_AUTH_URL="http://localhost:3001" \
  -e CLIENT_URL="http://localhost:3001" \
  -e GEMINI_API_KEY="your_gemini_api_key" \
  --name novadesk-app \
  novadesk:latest
```

The container automatically applies pending database schema updates and seeds essential system records on startup via `docker-entrypoint.sh`.

---

## 📡 API Reference

All protected endpoints require an authenticated session cookie managed via Better Auth.

### Health & Auth

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/health` | Public | System & database health status check |
| `GET` | `/api` | Public | API service information & version check |
| `ALL` | `/api/auth/*` | Public / Session | Better Auth authentication handlers (sign-in, sign-out, session) |

### Dashboard & Analytics

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/dashboard/stats` | Session Required | Fetch aggregated KPI counters & 30-day ticket activity data |

### Tickets & Email Ingestion

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/tickets` | Session Required | List tickets with sorting, pagination, status, and category filtering |
| `POST` | `/api/tickets` | Session Required | Create a new ticket manually |
| `POST` | `/api/tickets/ingest` | Public (Webhook) | Inbound email webhook; creates ticket & enqueues AI background triage |
| `GET` | `/api/tickets/:id` | Session Required | Retrieve ticket details including conversation history and AI fields |
| `PATCH` | `/api/tickets/:id` | Session Required | Update ticket attributes (status, category, assigned agent) |
| `DELETE` | `/api/tickets/:id` | 🔒 Admin Only | Permanently delete a ticket |

### AI Co-Pilot & Replies

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/api/tickets/:id/summarize` | Session Required | Generate a 3-sentence LLM summary of the ticket conversation thread |
| `POST` | `/api/tickets/:id/polish-reply` | Session Required | Polish an agent draft reply into a warm, professional response |
| `GET` | `/api/tickets/:ticketId/replies` | Session Required | List all conversation replies in chronological order |
| `POST` | `/api/tickets/:ticketId/replies` | Session Required | Post a reply (re-opens `RESOLVED` tickets; queues outbound SMTP email) |

### User Management & Agents

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/agents` | Session Required | List all agents for assignment select menus |
| `GET` | `/api/users` | 🔒 Admin Only | List all system users with role information |
| `POST` | `/api/users` | 🔒 Admin Only | Create a new user with `ADMIN` or `AGENT` role |
| `PATCH` | `/api/users/:id` | 🔒 Admin Only | Update user profile, password, or role |
| `DELETE` | `/api/users/:id` | 🔒 Admin Only | Soft-delete a user (`deletedAt` timestamp) |

---

## 🗄️ Database Schema Overview

```
User (user)
 ├── id, name, email, emailVerified, role (ADMIN | AGENT), deletedAt
 ├── Relations: sessions[], accounts[], assignedTickets[], createdTickets[], createdReplies[]

Session (session) & Account (account)
 └── Managed by Better Auth for secure session persistence and password hashing

Ticket (tickets)
 ├── id, subject, body, status (TicketStatus), category (TicketCategory)
 ├── fromEmail, fromName, emailThreadId
 ├── aiSummary, aiSuggestedReply
 ├── Relations: assignedAgent -> User, createdBy -> User, replies[] -> TicketReply[]

TicketReply (ticket_replies)
 ├── id, body, fromAgent, createdAt
 ├── Relations: ticket -> Ticket, createdBy -> User

KnowledgeBase (knowledge_base)
 └── id, title, content, category (TicketCategory), createdAt, updatedAt
```

---

## 🤝 Contributing

Contributions, issues, and feature requests are welcome! Feel free to open an issue or submit a pull request.

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'feat: Add AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.
