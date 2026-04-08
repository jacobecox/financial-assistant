# Finance Assistant

A private, mobile-first web app for paycheck-aware budgeting. Built for two users.

## Stack

- **Next.js 15** (App Router) — containerized, deployed on [Control Plane](https://controlplane.com)
- **PostgreSQL** — Control Plane postgres workload (talks to the app via internal hostname)
- **Clerk** — Auth with Google SSO
- **Anthropic Claude** — Conversational AI with tool use
- **Tailwind CSS** — Styling

## Features

- **Paycheck view** — enter income, see bills due before next pay date, suggested savings transfer, and leftover discretionary spending
- **Bills manager** — add, edit, and soft-delete recurring bills
- **AI chat** — ask natural questions like "how much can we save this paycheck?" or "what bills are due this week?"
- **PWA** — installable on iOS/Android home screen

## Getting Started

1. Copy `.env.local.example` to `.env.local` and fill in your keys:
   - [Clerk Dashboard](https://dashboard.clerk.com) — create an app, enable Google SSO
   - `DATABASE_URL` — local Postgres for dev (e.g. `postgresql://postgres:postgres@localhost:5432/finance`)
   - [Anthropic Console](https://console.anthropic.com) — get an API key

2. Install dependencies:
   ```bash
   npm install
   ```

3. Run the dev server:
   ```bash
   npm run dev
   ```

## Database Schema

Run this against your Postgres database:

```sql
create table paychecks (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  amount numeric(10,2) not null,
  pay_date date not null,
  next_pay_date date not null,
  created_at timestamptz default now()
);

create table bills (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  name text not null,
  amount numeric(10,2) not null,
  due_day integer not null check (due_day between 1 and 31),
  recurring boolean default true,
  active boolean default true,
  created_at timestamptz default now()
);

-- Indexes for user_id lookups
create index on paychecks (user_id, pay_date desc);
create index on bills (user_id, active, due_day);
```

## Project Structure

```
app/
  dashboard/          # Protected views
    page.tsx          # Paycheck overview
    bills/page.tsx    # Bills manager
    chat/page.tsx     # AI chat
  api/
    bills/            # GET, POST, PUT, DELETE
    paychecks/        # GET, POST
    chat/             # POST — Claude agentic loop
  sign-in/ sign-up/   # Clerk auth pages
lib/
  types.ts            # Shared TypeScript types
  db.ts               # postgres.js singleton (connects via DATABASE_URL)
  ai-tools.ts         # Claude tool definitions + executor
middleware.ts         # Clerk auth protection
public/manifest.json  # PWA manifest
Dockerfile            # Standalone Next.js image for Control Plane
```

## Roadmap

### Part 1 — Core (current)
- [x] Project scaffold — Next.js, Postgres, Clerk, Claude
- [ ] Postgres schema + indexes (run SQL above)
- [ ] Bills CRUD UI
- [ ] Paycheck entry form
- [ ] Paycheck overview with live data
- [ ] AI chat with working tool calls
- [ ] Control Plane deployment (app workload + postgres workload)
- [ ] PWA icons + install flow

### Part 2 — Plaid Integration (future)
- [ ] Plaid Link flow for Chase checking/savings
- [ ] `get_account_balances()` AI tool
- [ ] `get_net_worth()` AI tool (Fidelity/Vanguard via Plaid)
- [ ] Live balance shown on paycheck overview
