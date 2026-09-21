-- ============ HABITS ============
alter table habits enable row level security;

create policy "habits: select own"
  on habits for select
  to authenticated
  using ( (select auth.uid()) = user_id );

create policy "habits: insert own"
  on habits for insert
  to authenticated
  with check ( (select auth.uid()) = user_id );

create policy "habits: update own"
  on habits for update
  to authenticated
  using ( (select auth.uid()) = user_id )
  with check ( (select auth.uid()) = user_id );

create policy "habits: delete own"
  on habits for delete
  to authenticated
  using ( (select auth.uid()) = user_id );


-- ============ DAILY_LOGS ============
alter table daily_logs enable row level security;

create policy "logs: select own"
  on daily_logs for select
  to authenticated
  using ( (select auth.uid()) = user_id );

create policy "logs: insert own"
  on daily_logs for insert
  to authenticated
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1 from habits
      where habits.id = daily_logs.habit_id
        and habits.user_id = (select auth.uid())
    )
  );

create policy "logs: update own"
  on daily_logs for update
  to authenticated
  using ( (select auth.uid()) = user_id )
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1 from habits
      where habits.id = daily_logs.habit_id
        and habits.user_id = (select auth.uid())
    )
  );

create policy "logs: delete own"
  on daily_logs for delete
  to authenticated
  using ( (select auth.uid()) = user_id );

-- ============ PROFILES ============
-- (RLS is already enabled in schema_v2.sql)

create policy "profiles: select own"
  on profiles for select
  to authenticated
  using ( (select auth.uid()) = id );

create policy "profiles: insert own"
  on profiles for insert
  to authenticated
  with check ( (select auth.uid()) = id );

create policy "profiles: update own"
  on profiles for update
  to authenticated
  using ( (select auth.uid()) = id )
  with check ( (select auth.uid()) = id );

create policy "profiles: delete own"
  on profiles for delete
  to authenticated
  using ( (select auth.uid()) = id );