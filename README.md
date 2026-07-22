# ✦ NovaDesk

> AI-powered ticket management system — classify, summarise, and respond to support tickets at scale.

[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Bun](https://img.shields.io/badge/Bun-1.3-black?logo=bun)](https://bun.sh/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)](https://react.dev/)
[![Express](https://img.shields.io/badge/Express-5-000000?logo=express)](https://expressjs.com/)
[![Prisma](https://img.shields.io/badge/Prisma-7-2D3748?logo=prisma)](https://www.prisma.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-18-336791?logo=postgresql)](https://www.postgresql.org/)

---

## 📖 Overview

NovaDesk solves the problem of high-volume support email management. Agents manually reading, classifying, and responding to hundreds of emails daily leads to slow, impersonal responses. NovaDesk automates ticket intake, classification, and reply generation using AI — freeing agents to focus on complex issues.

### Key Features

- 📧 **Email-to-Ticket** — Inbound emails automatically create support tickets
- 🤖 **AI Classification** — Auto-categorise tickets using Gemini AI
- 📝 **AI Summaries** — One-click ticket summarisation
- 💬 **AI Suggested Replies** — Context-aware draft responses from a knowledge base
- 🎫 **Ticket Management** — Full CRUD with filtering, sorting, and status tracking
- 👥 **Role-Based Access** — Admin and Agent roles with separate permissions
- 📊 **Dashboard** — Real-time overview of open, resolved, and closed tickets

---

## 🏗️ Architecture

```
NovaDesk/
├── client/          # React 19 + TypeScript + Vite (port 5173)
│   └── src/
│       ├── layouts/ # AppLayout (sidebar shell)
│       └── pages/   # LoginPage, DashboardPage, TicketsPage
│
└── server/          # Express 5 + TypeScript on Bun (port 3001)
    ├── prisma/      # Schema & migrations
    └── src/
        ├── config/      # Env validation
        ├── lib/         # Prisma client singleton
        ├── middleware/  # Error handler, 404
        └── routes/      # API route modules
```

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Runtime & Package Manager** | [Bun](https://bun.sh/) 1.3 |
| **Frontend** | React 19, TypeScript, Vite 8 |
| **Routing** | React Router 7 |
| **Backend** | Express 5, TypeScript |
| **Auth** | Session-based (`express-session`) |
| **Database** | PostgreSQL 18 |
| **ORM** | Prisma 7 with `@prisma/adapter-pg` |
| **AI** | Gemini API (Google AI Studio) |
| **Email** | SendGrid / Mailgun |
| **Deployment** | Docker + cloud (AWS / Railway / Fly.io) |

---

## 🚀 Getting Started

### Prerequisites

- [Bun](https://bun.sh/) ≥ 1.3
- [PostgreSQL](https://www.postgresql.org/) ≥ 16
- Node.js ≥ 20 (optional, Bun handles everything)

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
SESSION_SECRET=your-random-secret-here
DATABASE_URL=postgresql://postgres:your_password@localhost:5432/novadesk
```

### 3. Set Up Database

```bash
# Create the PostgreSQL database
psql -U postgres -c "CREATE DATABASE novadesk;"

# Run migrations
bun run --cwd server db:migrate

# (Optional) Seed with sample data
bun run --cwd server db:seed
```

### 4. Start Development Servers

```bash
# Terminal 1 — API server (http://localhost:3001)
bun run dev:server

# Terminal 2 — React client (http://localhost:5173)
bun run dev:client
```

---

## 📡 API Endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/health` | Server + DB health check |
| `GET` | `/api` | API version info |
| `POST` | `/api/auth/login` | *(Phase 2)* Session login |
| `POST` | `/api/auth/logout` | *(Phase 2)* Session logout |
| `GET` | `/api/tickets` | *(Phase 4)* List tickets |
| `POST` | `/api/tickets` | *(Phase 4)* Create ticket |
| `GET` | `/api/tickets/:id` | *(Phase 4)* Get ticket |
| `PATCH` | `/api/tickets/:id` | *(Phase 4)* Update ticket |

---

## 🗄️ Data Model

```
User        — id, email, passwordHash, name, Role (ADMIN|AGENT)
Ticket      — id, subject, body, TicketStatus, TicketCategory, AI fields
TicketReply — id, body, fromAgent, ticketId
KnowledgeBase — id, title, content, category
```

**Ticket Statuses:** `OPEN` → `RESOLVED` → `CLOSED`

**Ticket Categories:** `GENERAL_QUESTION` · `TECHNICAL_QUESTION` · `REFUND_REQUEST`

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
bun run db:seed         # Seed the database
bun run build           # Bundle server with Bun
```

---

## 🗺️ Roadmap

- [x] Phase 1 — Project setup (monorepo, Express, React, PostgreSQL, Prisma)
- [ ] Phase 2 — Authentication (login/logout, sessions, route guards)
- [ ] Phase 3 — User management (admin: CRUD agents, RBAC)
- [ ] Phase 4 — Ticket CRUD (create, list, filter, sort, detail view)
- [ ] Phase 5 — AI features (classification, summaries, suggested replies)
- [ ] Phase 6 — Email integration (inbound webhooks, outbound replies)
- [ ] Phase 7 — Dashboard (stats, charts, quick filters)
- [ ] Phase 8 — Polish & deployment (Docker, CI/CD)

---

## 📄 License

MIT © 2026 NovaDesk
