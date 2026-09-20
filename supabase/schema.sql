-- ============================================================================
-- Habit Tracker — schema
--
-- Run in the Supabase SQL editor in this order:
--   1. schema.sql    (this file)
--   2. policies.sql  (your hand-written RLS — the tables are NOT protected
--                     until you run it)
--   3. seed.sql      (optional sample data)
--
-- WARNING: between step 1 and step 2 these tables have no Row Level Security.
-- The anon key ships inside the browser bundle, so in that window anyone who
-- has it can read and write every row through the REST API. Do not point the
-- app at this database until policies.sql has run.
--
-- Safe to re-run: everything is `if not exists`.
-- ============================================================================


-- ---------------------------------------------------------------------------
-- habits
--
-- user_id defaults to auth.uid() so the client never has to send it. An insert
-- from the browser omits the column entirely and Postgres fills in whoever is
-- signed in — a client that tries to claim another user's id has to be stopped
-- by the INSERT policy's WITH CHECK.
--
-- on delete cascade: deleting the auth user removes their habits, and (through
-- the habit_id foreign key below) their logs along with them.
-- ---------------------------------------------------------------------------
create table if not exists public.habits (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid()
                references auth.users (id) on delete cascade,
  title       text not null check (length(btrim(title)) between 1 and 80),
  description text check (description is null or length(description) <= 280),
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);


-- ---------------------------------------------------------------------------
-- daily_logs
--
-- One row per habit per day. The unique constraint is what makes "tick today"
-- idempotent: ticking twice raises a conflict instead of writing a duplicate,
-- which the client handles with an upsert.
--
-- user_id is denormalised onto this table on purpose. It duplicates what could
-- be reached through habit_id, but it lets an RLS policy check ownership
-- without joining back to habits on every row.
-- ---------------------------------------------------------------------------
create table if not exists public.daily_logs (
  id        uuid primary key default gen_random_uuid(),
  habit_id  uuid not null references public.habits (id) on delete cascade,
  user_id   uuid not null default auth.uid()
              references auth.users (id) on delete cascade,
  log_date  date not null default current_date,
  completed boolean not null default true,

  unique (habit_id, log_date)
);


-- ---------------------------------------------------------------------------
-- Indexes
--
-- Every query the app makes is filtered by user_id, so both tables get one.
--
-- Note: the `unique (habit_id, log_date)` constraint above already creates an
-- index with habit_id as its leading column, so daily_logs_habit_id_idx below
-- is largely redundant — Postgres can use the unique index for habit_id-only
-- lookups. It is here because the spec asks for it; dropping it costs nothing
-- in query speed and saves a little on every write.
-- ---------------------------------------------------------------------------
create index if not exists habits_user_id_idx
  on public.habits (user_id);

create index if not exists daily_logs_user_id_idx
  on public.daily_logs (user_id);

create index if not exists daily_logs_habit_id_idx
  on public.daily_logs (habit_id);


-- Reminder: run policies.sql next. Without it, the tables above are public.
