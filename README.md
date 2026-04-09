# Financial Assistant

A private, mobile-first web app for paycheck-aware budgeting. Built for two users.

## Stack

| | Why |
|---|---|
| **Next.js 15 (App Router)** | Full-stack React framework — handles routing, API routes, and server-side logic in one repo. Route groups `(app)/` give shared layouts without affecting URLs. |
| **PostgreSQL** | Relational DB via [postgres.js](https://github.com/porsager/postgres). All financial data is user-scoped by `user_id` in every table. |
| **Clerk** | Drop-in auth with Google SSO. Middleware protects all routes; `auth()` in API routes scopes every DB query to the signed-in user. |
| **Anthropic Claude** | Agentic AI chat — Claude decides which financial tools to call, runs multi-step reasoning, and streams responses back in real time. |
| **Tailwind CSS** | Utility-first styling. Dark theme throughout (`slate-*` palette). |

## Features

- **Overview** — monthly income vs bills vs buffer vs savings breakdown with animated bar chart and upcoming bills widget
- **Bills** — add/edit/delete recurring bills with drag-to-reorder categories; all frequencies supported (weekly → annual)
- **Planned Expenses** — one-time expenses per month that factor into the overview and calendar
- **Income** — pay schedule manager with support for biweekly, twice-monthly, monthly, and one-time income; optional end dates for raise tracking
- **Buffer** — discretionary amounts reserved each paycheck before savings
- **Calendar** — monthly view showing paychecks, bills, and planned expenses on their due dates
- **Ask AI** — streaming conversational AI with access to all your financial data via tools; chat is preserved while navigating between pages
- **Global month context** — `‹ April 2026 ›` nav bar syncs all pages to the same month; persisted in localStorage

## Architecture

### Routing

```
app/
  (app)/              # Route group — shared layout (nav, MonthBar, auth)
    page.tsx          # Overview
    bills/            # Bills + Planned Expenses + Buffer
    income/           # Pay schedules
    calendar/         # Monthly calendar
    ask/              # AI chat
  api/                # API routes (all require auth)
    bills/
    pay-schedule/
    planned-expenses/
    discretionary/
    chat/             # Claude agentic streaming loop
  sign-in/            # Clerk-hosted sign-in page
```

The `(app)` route group lets all pages share a layout (header, MonthBar) without adding `/app` to URLs.

### Auth (Clerk)

- **[middleware.ts](middleware.ts)** — runs before every request; redirects unauthenticated users to `/sign-in`
- **[app/layout.tsx](app/layout.tsx)** — `<ClerkProvider>` injects session context into React
- **Every API route** — calls `auth()` and returns 401 if no session; uses `userId` in all SQL queries for data isolation
- **`<UserButton />`** — Clerk's pre-built avatar dropdown handles sign-out and profile

### AI Chat (Anthropic)

- **[app/api/chat/route.ts](app/api/chat/route.ts)** — receives message history, calls `anthropic.messages.stream()` in an agentic loop, streams text deltas back as a `ReadableStream`
- **[lib/ai-tools.ts](lib/ai-tools.ts)** — defines tool schemas (what Claude can call) and executes them against the DB when Claude requests them
- **Loop:** Claude → tool request → your server hits DB → result back to Claude → Claude responds → repeat until `stop_reason === "end_turn"`
- **[components/ChatContext.tsx](components/ChatContext.tsx)** — chat state lives in layout-level context so navigating away and back preserves the conversation

Current tools: `get_upcoming_bills`, `get_current_paycheck`, `get_expenses_summary`, `get_income_summary`, `get_buffer_summary`, `get_planned_expenses`, `suggest_savings_transfer`

### Month Context

- **[components/MonthContext.tsx](components/MonthContext.tsx)** — React context + localStorage persistence; all pages (`overview`, `bills`, `calendar`, `ask`) read from this to filter data to the selected month

## Getting Started

1. Copy `.env.local.example` to `.env.local` and fill in:
   - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` + `CLERK_SECRET_KEY` — [Clerk Dashboard](https://dashboard.clerk.com), enable Google SSO
   - `DATABASE_URL` — local Postgres (e.g. `postgresql://postgres:postgres@localhost:5432/finance`)
   - `ANTHROPIC_API_KEY` — [Anthropic Console](https://console.anthropic.com)

2. Install and run:
   ```bash
   npm install
   npm run dev
   ```

## Database Schema

```sql
create table pay_schedules (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  name text not null,
  amount numeric(10,2) not null,
  frequency text not null check (frequency in ('once', 'monthly', 'twice_monthly', 'biweekly')),
  anchor_date date,
  pay_day_1 integer check (pay_day_1 between 1 and 31),
  pay_day_2 integer check (pay_day_2 between 1 and 31),
  end_date date,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table bills (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  name text not null,
  amount numeric(10,2) not null,
  category text not null default 'General',
  frequency text not null default 'monthly',
  due_day integer check (due_day between 1 and 31),
  due_day_2 integer check (due_day_2 between 1 and 31),
  anchor_date date,
  recurring boolean default true,
  active boolean default true,
  sort_order integer default 0,
  created_at timestamptz default now()
);

create table discretionary_items (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  name text not null,
  amount numeric(10,2) not null,
  frequency text not null default 'monthly',
  active boolean default true,
  created_at timestamptz default now()
);

create table planned_expenses (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  name text not null,
  amount numeric(10,2) not null,
  planned_date date not null,
  notes text,
  active boolean default true,
  created_at timestamptz default now()
);

create index on pay_schedules (user_id);
create index on bills (user_id, active);
create index on discretionary_items (user_id, active);
create index on planned_expenses (user_id, active, planned_date);
```

## Roadmap

### Part 1 — Core ✓
- [x] Bills CRUD with drag-to-reorder categories
- [x] Pay schedule manager (biweekly, twice-monthly, monthly, one-time) with end dates
- [x] Planned one-time expenses per month
- [x] Buffer/discretionary amounts
- [x] Overview with income/bills/buffer/savings breakdown
- [x] Upcoming bills widget (next 14 days)
- [x] Monthly calendar view
- [x] AI chat with agentic tool use + streaming
- [x] Global month context synced across all pages
- [x] Mobile-friendly, responsive layout
- [x] Clerk auth with Google SSO

### Part 2 — Plaid Integration (future)
- [ ] Plaid Link flow for bank accounts
- [ ] `get_account_balances()` AI tool
- [ ] Live balance on overview
- [ ] Transaction history
