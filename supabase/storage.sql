-- ============================================================================
-- Habit Tracker — storage: avatars bucket and its policies
--
-- Run in the Supabase SQL editor after schema_v2.sql.
-- Safe to re-run: the bucket upserts, and each policy is dropped first.
--
-- Object layout: avatars/<user uuid>/avatar
--   One fixed name per user, no extension, so an upsert always REPLACES the
--   previous file — uploading a png and then a jpg still leaves one object.
-- ============================================================================


-- ---------------------------------------------------------------------------
-- Bucket
--
-- These limits are the server-side backstop for validateAvatar.js. The client
-- check runs in the user's browser, so anyone can skip it by calling the
-- Storage API directly with the (public) anon key and their own JWT. Storage
-- enforces file_size_limit and allowed_mime_types on every upload regardless
-- of what the client did.
--
-- allowed_mime_types is checked against the Content-Type the uploader sends,
-- which the uploader controls — so it stops honest mistakes and lazy attacks,
-- not a determined one. The magic-byte check in the client is for UX; nothing
-- here inspects the bytes. SVG is left out because it is XML that can carry
-- <script>, and a public bucket would serve it from our storage origin.
--
-- public = true: objects can be fetched by URL without a policy or token
-- (that is how <img src> works). It does NOT allow anyone to write — writes
-- still go through the storage.objects policies below.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars',
  'avatars',
  true,
  1048576, -- 1 MB, matching the client's 1024 * 1024
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public             = excluded.public,
  file_size_limit    = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;


-- ---------------------------------------------------------------------------
-- Policies on storage.objects
--
-- storage.objects holds every file in every bucket, so each policy needs BOTH:
--   bucket_id = 'avatars'                                    — this bucket only
--   (storage.foldername(name))[1] = (select auth.uid())::text — own folder only
--
-- Drop the folder check and any signed-in user can overwrite or delete anyone's
-- avatar. Drop the bucket check and the policy leaks onto every other bucket.
--
-- The upload uses upsert: true, which needs INSERT (first upload), UPDATE
-- (every later one) and SELECT (Storage looks up the existing object first).
-- Missing any one and re-uploading fails with a 403 / RLS error.
--
-- (select auth.uid()) is wrapped in a select so Postgres evaluates it once per
-- statement instead of once per row.
-- ---------------------------------------------------------------------------

-- Blocks: listing or reading metadata of other users' avatar objects via the
-- API. (Public URLs still serve the image bytes — that is what public means.)
drop policy if exists "avatars: select own folder" on storage.objects;
create policy "avatars: select own folder"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

-- Blocks: uploading a new file into anyone else's folder, or into the bucket
-- root, or into any other bucket.
drop policy if exists "avatars: insert own folder" on storage.objects;
create policy "avatars: insert own folder"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

-- Blocks: overwriting another user's avatar (USING), and moving/renaming your
-- own object into someone else's folder (WITH CHECK).
drop policy if exists "avatars: update own folder" on storage.objects;
create policy "avatars: update own folder"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

-- Blocks: deleting another user's avatar.
drop policy if exists "avatars: delete own folder" on storage.objects;
create policy "avatars: delete own folder"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
