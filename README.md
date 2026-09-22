# Habit Tracker

A habit tracker built with React + Vite and Supabase (auth + Postgres). Sign up,
create habits, tick them off each day, and build a streak. Installable as a
Progressive Web App: it opens offline, and habits added offline sync when the
connection comes back.

## Stack

- React 19 + Vite 8 (JavaScript, JSX)
- react-router-dom 7
- Supabase — auth, Postgres and Storage, with Row Level Security
- Tailwind + shadcn/ui
- vite-plugin-pwa (Workbox) for the service worker and manifest

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
4. `supabase/schema_v2.sql` — the `profiles` table and signup trigger
5. Your `profiles` policies (hand-written)
6. `supabase/storage.sql` — the `avatars` bucket and its storage policies

### 6. Run it

```bash
npm run dev
```

Vite reads `.env` only at startup, so restart the dev server after changing it.
The service worker is **off** in the dev server — see
[Testing the PWA](#testing-the-pwa).

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server with HMR (no service worker) |
| `npm run build` | Production build into `dist/`, including `sw.js` and the manifest |
| `npm run preview` | Serve the production build locally — use this for PWA tests |
| `npm run lint` | ESLint |
| `npm run check:supabase` | Env, key role, connectivity and table checks |
| `npm run generate-pwa-assets` | Regenerate every icon from `public/logo.svg` |

## Deploying to Vercel

1. Import the repository in Vercel. `vercel.json` sets the Vite build, the
   `dist/` output and the headers below; no other build settings are needed.
2. In **Project Settings > Environment Variables**, add exactly two:

   | Name | Value |
   | --- | --- |
   | `VITE_SUPABASE_URL` | your Project URL |
   | `VITE_SUPABASE_ANON_KEY` | your **anon** key |

   Nothing else — never `service_role`. Vite bakes these in at build time, so
   redeploy after changing them.
3. After the first deploy, in Supabase open **Authentication > URL
   Configuration**:
   - **Site URL** — your deployed URL, e.g. `https://your-app.vercel.app`
   - **Redirect URLs** — add `https://your-app.vercel.app/**` (and keep
     `http://localhost:5173/**` for local work)

   Without this, sign-up confirmation emails link back to localhost.

What `vercel.json` does:

| Rule | Why |
| --- | --- |
| Rewrite `/(.*)` → `/index.html` | Deep links such as `/login` load the SPA instead of a 404. Real files are served first, so `sw.js` and assets are unaffected. |
| `sw.js`: `max-age=0, must-revalidate` | The browser must re-check the service worker on every visit, or users stay on an old build. |
| `manifest.webmanifest`: correct `Content-Type`, not cached | Install prompts read it; stale icons or names otherwise linger. |
| `/assets/*`: `immutable`, one year | Vite puts a content hash in every file name, so a changed file is a new URL. |
| `nosniff`, `Referrer-Policy`, `X-Frame-Options` | Baseline security headers. |

## Testing the PWA

- **Always** test PWA and offline behaviour with
  `npm run build && npm run preview` — **never** `npm run dev`. The dev server
  does not register a service worker, so install, offline and update prompts
  cannot be tested there.
- **Lighthouse**: run it in an **incognito** window against the production
  build (preview or the deployed URL). Extensions and a stale service worker in
  a normal window skew the scores.
- **Offline**: DevTools > **Application > Service Workers** > tick
  **Offline**, then reload. The app shell should load, the offline banner
  should appear, and adding a habit should queue it.
- **Update toast**: with the old version open in a tab, make a visible change,
  run `npm run build` again (the preview server can keep running), then
  **reload the open tab twice** — the first reload fetches the new worker, the
  second shows "New version available". Refresh applies it.
- **Sign-out clears caches**: DevTools > Application > Cache Storage, sign out,
  and only the `workbox-precache-…` cache should remain.

## Lighthouse

Incognito, production build, mobile preset.

| Category | Before perf fix | After perf fix |
| --- | --- | --- |
| Performance | 73 | 88|
| Accessibility | 96 | 98 |
| Best Practices | 100| 100 |
| SEO | 100| 100 |

## Caching decisions

One sentence per rule in `runtimeCaching` (`vite.config.js`): why that asset
earns its strategy. _Hand-written._

- Avatars use CacheFirst because a changed avatar is a new URL, so there's nothing to invalidate.
- Auth is NetworkOnly, stated explicitly, because caching a token or sign-out response would be a security bug.
- REST uses NetworkFirst with a short timeout and short max age, trading a small staleness window for offline reads of your own data.
- Fonts use CacheFirst with a long max age because hashed filenames never change content.

## Hand-written zones

Parts of this project are deliberately written by hand rather than
generated, because they are the parts worth understanding:

- **RLS policies** in `supabase/policies.sql`, and the `profiles` policies
- **Query filters** — the `.eq(...)` targets in `src/lib/habits.js` and
  `src/lib/profile.js`
- **Avatar validation** — `src/lib/validateAvatar.js`
- **Error boundary** — `src/components/app/ErrorBoundary.jsx`
- **Runtime caching rules** — `runtimeCaching` in `vite.config.js`
- **Online status + offline banner** — `src/hooks/useOnlineStatus.js`,
  `src/components/app/OfflineBanner.jsx`
- **Caching sentences** — the section above

See `AGENTS.md` for the full contributor notes.
