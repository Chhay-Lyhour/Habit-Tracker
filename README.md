# Habit Tracker

A habit tracker built with React + Vite and Supabase (auth + Postgres). Sign up,
create habits, tick them off each day, and build a streak.

## Stack

- React 19 + Vite 8 (JavaScript, JSX)
- react-router-dom 7
- Supabase — auth and Postgres, with Row Level Security
- Tailwind + shadcn/ui

## Setup

### 1. Install

```bash
npm install
```

### 2. Create a Supabase project

Go to [supabase.com/dashboard](https://supabase.com/dashboard) and create a new
project. Wait for it to finish provisioning.

### 3. Get your keys

In the dashboard, open **Project Settings > API**. You need two values:

| Dashboard label | Goes in |
| --- | --- |
| **Project URL** | `VITE_SUPABASE_URL` |
| **Project API keys > `anon` `public`** | `VITE_SUPABASE_ANON_KEY` |

Copy the **anon** key, not the `service_role` key. The anon key is meant to be
public and ships inside the browser bundle; `service_role` bypasses Row Level
Security and must never leave the server side.

### 4. Configure the environment

```bash
cp .env.example .env
```

Then fill in both values in `.env`. It is gitignored — `.env.example` is the
tracked template and stays empty.

### 5. Set up the database

In the dashboard, open the **SQL Editor** and run, in this order:

1. `supabase/schema.sql` — tables, indexes, foreign keys
2. `supabase/policies.sql` — Row Level Security (hand-written, see below)
3. `supabase/seed.sql` — optional sample data; replace the `REPLACE_ME` email
   placeholder with your own account's email first

### 6. Run it

```bash
npm run dev
```

Vite reads `.env` only at startup, so restart the dev server after changing it.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server with HMR |
| `npm run build` | Production build into `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run lint` | ESLint |

## Hand-written zones

Two parts of this project are deliberately written by hand rather than
generated, because they are the parts worth understanding:

- **RLS policies** in `supabase/policies.sql`
- **Query filters** — the `.eq(...)` targets in `src/lib/habits.js`, marked with
  `// HAND-WRITE:` comments

See `AGENTS.md` for the full contributor notes.
