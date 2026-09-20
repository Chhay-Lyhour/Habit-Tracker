-- ============================================================================
-- Habit Tracker — Row Level Security
--
-- HAND-WRITE ZONE. The two `alter table` lines below are done. The policies
-- are yours to write: eight of them, four per table.
--
-- Run this file after schema.sql and before pointing the app at the database.
-- ============================================================================


-- Turning RLS on is a default-deny switch. From this moment the tables answer
-- nothing to the anon and authenticated roles until a policy says otherwise —
-- so right after running these two lines and before adding policies, the app
-- will show empty lists and every write will fail. That is the correct state
-- to start from.
alter table public.habits     enable row level security;
alter table public.daily_logs enable row level security;


-- ---------------------------------------------------------------------------
-- What you are writing
--
-- A policy has up to two expressions, and which one applies depends on the
-- operation:
--
--   USING       filters rows that ALREADY EXIST. Postgres evaluates it against
--               each candidate row and silently skips the ones that fail. It
--               applies to SELECT, UPDATE and DELETE.
--
--   WITH CHECK  validates the row as it WILL BE after the write. A row that
--               fails raises an error rather than being skipped. It applies to
--               INSERT and UPDATE.
--
-- Both expressions compare the row's owner against auth.uid(), the id of the
-- user whose JWT came with the request.
--
-- Write them `to authenticated`. Anything left to the anon role is reachable
-- by anyone holding the public anon key.
-- ---------------------------------------------------------------------------


-- ---------------------------------------------------------------------------
-- public.habits — four policies
--
--   SELECT  Which habits may this user read? Only their own. Needs USING.
--
--   INSERT  Has no existing row, so USING is meaningless here — an INSERT
--           policy takes WITH CHECK only. The row arriving has user_id filled
--           in by the column default auth.uid(), but a client is free to send
--           the column explicitly and put someone else's id in it. Your WITH
--           CHECK is the thing that rejects that.
--
--   UPDATE  Needs BOTH, and this is the one that catches people out:
--             - USING decides which rows the user is allowed to touch
--             - WITH CHECK decides what those rows are allowed to become
--           With only USING, a user could take a row they legitimately own and
--           rewrite its user_id to another account — handing their habit to
--           someone else, or planting a row in a stranger's list. The row
--           passes USING on the way in and there is nothing checking it on the
--           way out.
--
--   DELETE  Which rows may this user remove? Only their own. Needs USING.
--           There is no WITH CHECK for DELETE: no row survives to validate.
-- ---------------------------------------------------------------------------

-- your habits policies go here


-- ---------------------------------------------------------------------------
-- public.daily_logs — four policies
--
-- Same four operations, same shape, same reasoning. Each log row carries its
-- own user_id, so you can scope it directly against auth.uid() without joining
-- back to habits.
--
-- Two things worth deciding as you write these:
--
--   * INSERT — the app upserts a log to tick a habit for today. Your WITH
--     CHECK has to let a user create a log for a habit they own, and no one
--     else's. Think about whether checking daily_logs.user_id alone is enough,
--     or whether you also want to confirm the referenced habit belongs to
--     them. Both are defensible; know which you chose and why.
--
--   * DELETE — when a habit is deleted its logs go too, but that happens
--     through the `on delete cascade` in schema.sql, not through this policy.
--     A cascade runs with the privileges of the deleting statement, so your
--     habits DELETE policy is what actually authorises it.
-- ---------------------------------------------------------------------------

-- your daily_logs policies go here


-- ---------------------------------------------------------------------------
-- Checking your work
--
-- 1. In the dashboard: Authentication > Policies should list four policies per
--    table, and neither table should say "RLS disabled".
--
-- 2. Sign in as a second account in an incognito window. It should see an
--    EMPTY habit list — not an error. An error means a policy is missing;
--    an empty list means SELECT is correctly filtering rows it cannot see.
--
-- 3. Confirm you cannot reassign a row. With your own session, try updating
--    one of your habits and setting user_id to another account's id. If it
--    succeeds, your UPDATE policy is missing its WITH CHECK.
-- ---------------------------------------------------------------------------
