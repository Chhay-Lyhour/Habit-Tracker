-- ============================================================================
-- Habit Tracker — sample data
--
-- Run last, after schema.sql and your policies.sql.
--
-- BEFORE RUNNING: replace both copies of 'REPLACE_ME' below with the email of
-- an account that already exists. Sign up through the app first — this file
-- cannot create auth users, it only looks one up.
--
-- Safe to re-run: habits are skipped if a habit with the same title already
-- exists for that user, and logs use `on conflict do nothing`.
-- ============================================================================


-- Fail loudly rather than inserting nothing. Without this guard, a typo in the
-- email just makes every statement below match zero rows and report success.
do $$
begin
  if not exists (select 1 from auth.users where email = 'REPLACE_ME') then
    raise exception
      'No auth user with email %. Sign up in the app first, then put that email in this file.',
      'REPLACE_ME';
  end if;
end $$;


-- ---------------------------------------------------------------------------
-- Habits
--
-- user_id is set explicitly here. The column's auth.uid() default only works
-- for requests carrying a user's JWT; in the SQL editor you are the postgres
-- role and auth.uid() is null, which would violate the not-null constraint.
-- ---------------------------------------------------------------------------
insert into public.habits (user_id, title, description, is_active)
select
  u.id,
  h.title,
  h.description,
  h.is_active
from auth.users u
cross join (values
  ('Read 20 pages',    'Any book counts',        true),
  ('Morning run',      '2km around the block',   true),
  ('Practice guitar',  '15 minutes, no excuses', true),
  ('Drink 2L water',   null,                     true),
  ('Journal',          'Paused while exams are on', false)
) as h (title, description, is_active)
where u.email = 'REPLACE_ME'
  and not exists (
    select 1
    from public.habits existing
    where existing.user_id = u.id
      and existing.title = h.title
  );


-- ---------------------------------------------------------------------------
-- Daily logs
--
-- Gives two habits a three-day streak ending today, so the streak counter and
-- the "done today" state both have something to show.
--
-- The `on conflict` clause leans on unique (habit_id, log_date) from
-- schema.sql — the same constraint the app's tick-a-habit upsert relies on.
-- ---------------------------------------------------------------------------
insert into public.daily_logs (habit_id, user_id, log_date, completed)
select
  hb.id,
  hb.user_id,
  current_date - offsets.days,
  true
from public.habits hb
join auth.users u on u.id = hb.user_id
cross join generate_series(0, 2) as offsets (days)
where u.email = 'REPLACE_ME'
  and hb.title in ('Read 20 pages', 'Morning run')
on conflict (habit_id, log_date) do nothing;


-- ---------------------------------------------------------------------------
-- What you should see afterwards
--
--   select title, is_active from public.habits
--   where user_id = (select id from auth.users where email = 'REPLACE_ME');
--   -- 5 rows, 'Journal' inactive
--
--   select h.title, count(l.id) as logged_days
--   from public.habits h
--   left join public.daily_logs l on l.habit_id = h.id
--   where h.user_id = (select id from auth.users where email = 'REPLACE_ME')
--   group by h.title order by logged_days desc;
--   -- 'Read 20 pages' and 'Morning run' at 3 days, the rest at 0
-- ---------------------------------------------------------------------------
