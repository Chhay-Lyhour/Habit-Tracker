-- ============================================================================
-- Habit Tracker — schema v2: profiles
--
-- Run in the Supabase SQL editor, after schema.sql and policies.sql:
--   1. schema_v2.sql  (this file)
--   2. your hand-written profiles policies (see the block at the bottom)
--   3. storage.sql    (avatars bucket + storage policies)
--
-- WARNING: this file turns RLS ON for profiles but creates no policies. With
-- RLS on and no policies, every client query is denied — safe, but the app
-- will see no profile row until step 2 has run.
--
-- Safe to re-run: `if not exists`, `create or replace`, `on conflict`.
-- ============================================================================


-- ---------------------------------------------------------------------------
-- profiles
--
-- One row per auth user, keyed by the user's own id — there is no separate
-- user_id column, so ownership checks compare auth.uid() with `id`.
--
-- on delete cascade: deleting the auth user removes their profile.
-- avatar_url holds the public URL of <uid>/avatar in the avatars bucket, with
-- a ?v=<timestamp> cache-buster appended by the client on each upload.
-- ----------------------`-----------------------------------------------------
create table if not exists public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  avatar_url text,
  updated_at timestamptz default now()
);


-- ---------------------------------------------------------------------------
-- Auto-create a profile on signup
--
-- security definer: the function runs as its owner, not as the signing-up
-- user, because at signup time there is no session yet and the insert would
-- otherwise hit RLS. That is also why the client never needs an INSERT path
-- for its own profile.
--
-- set search_path = '': a security definer function must not resolve names
-- through a search_path the caller could influence, so every name below is
-- schema-qualified.
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id)
  values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- ---------------------------------------------------------------------------
-- One-time backfill for accounts that existed before the trigger.
-- Re-running is harmless: existing rows are skipped.
-- ---------------------------------------------------------------------------
insert into public.profiles (id)
select id from auth.users
on conflict (id) do nothing;


-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;

-- ============================================================================
-- HAND-WRITE ZONE — profiles policies (graded; write these yourself)
--
-- Same rule as habits: a user may touch their own row only. The table is keyed
-- by `id`, so every check compares (select auth.uid()) with id — not user_id.
-- Target role: authenticated. Four policies:
--
--   SELECT  USING      — only the row whose id is the caller's uid is visible.
--                        Another user's profile must come back as no row, not
--                        an error.
--   INSERT  WITH CHECK — a new row's id must equal the caller's uid. The trigger
--                        above does the real inserting (and bypasses RLS), so
--                        this only matters if a client tries to insert directly
--                        — it must not be able to create a row for someone else.
--   UPDATE  USING      — can only target the caller's own row …
--           WITH CHECK — … and cannot rewrite id to someone else's uid. Both
--                        halves are needed: USING picks the rows, WITH CHECK
--                        vets the result.
--   DELETE  USING      — own row only. (The auth.users cascade removes it when
--                        the account goes; a client delete is rarely needed,
--                        but if permitted it must be scoped.)
--
-- After writing them, run them in the SQL editor and confirm
-- Authentication > Policies shows 4 policies on profiles.
-- ============================================================================
