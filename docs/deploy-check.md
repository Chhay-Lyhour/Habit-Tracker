# Deploy check (Vercel)

Do these steps in order after any deploy, and always after changing an
environment variable. Never paste a key or URL value into a terminal
command, a log, a screenshot or a commit message.

## 1. `vercel.json`: re-verified in Phase G

No changes were needed. It still matches the build output:

- `buildCommand` `npm run build`, `outputDirectory` `dist`, `framework` `vite`.
- The SPA rewrite `/(.*)` → `/index.html` still covers every route. Vercel
  serves real files (`sw.js`, `workbox-*.js`, `/assets/*`, icons,
  `robots.txt`) before the rewrite applies.
- `sw.js`, `manifest.webmanifest` and `index.html` are served with
  `max-age=0, must-revalidate`. Vite and vite-plugin-pwa still emit those
  exact filenames.
- The lazy page chunks land in `/assets/` with content hashes, so the
  one-year `immutable` rule is safe for them.

## 2. Environment variables

In Vercel, open **Project > Settings > Environment Variables**. There should be
exactly two, both ticked for **Production** (also tick **Preview** if you use
preview deploys):

| Name | Holds |
| --- | --- |
| `VITE_SUPABASE_URL` | Supabase Project URL |
| `VITE_SUPABASE_ANON_KEY` | anon / publishable key, **never** service_role or `sb_secret_` |

Copy the values from Supabase **Settings > API**, not from a chat, doc or
screenshot. You can also use the CLI, which asks for the value in a prompt so it
never enters your shell history:

```
npx vercel env ls
npx vercel env add VITE_SUPABASE_URL production
npx vercel env add VITE_SUPABASE_ANON_KEY production
```

## 3. Redeploy after any variable change

Vite writes `VITE_*` values into the JS bundle **at build time**. Until you
redeploy, a changed variable has no effect on the live site.

**Deployments** → latest production deployment → **⋯ → Redeploy**, or:

```
npx vercel --prod
```

Also confirm Supabase **Authentication > URL Configuration** has the live URL
as Site URL and `https://<app>.vercel.app/**` under Redirect URLs.

## 4. Automated check

```
npm run check:deploy -- https://<app>.vercel.app --roundtrip
```

- Checks the live site: shell, deep-link rewrite, `sw.js` and manifest
  headers, security headers.
- Checks the live bundle was built with the **same** URL and anon key as your
  local `.env`, and contains no service_role or secret key. It reports only
  match / no match and never prints the values.
- `--roundtrip`: prompts for a test account (password hidden) and signs in.
  It creates a habit, then opens a **new** client that has only the stored
  session and reads the habit back. This is the script's stand-in for a
  refresh. It then deletes the habit and signs out locally only, so your
  browser sessions stay signed in.

The round-trip talks to Supabase directly. Step 2 of the script is what ties
the result to the deployed build.

## 5. Browser check (manual, needed for the audit)

Use an **incognito** window so no old service worker or session interferes.

1. Open `https://<app>.vercel.app/`. You land on `/login`.
2. Sign in with a real account. You land on `/` and the habit list loads
   (skeleton → list or empty state, **not** an error).
3. Add a habit, e.g. "Deploy check". Toast: "Nice! Habit added."
4. **Hard refresh** (Cmd+Shift+R). There should be no bounce to `/login`, no
   login-page flicker, and the habit is still there. This checks both the
   session and the data round-trip.
5. DevTools > **Network**, filter `rest/v1/habits`. The request goes to your
   Supabase host and returns 200.
6. Open `https://<app>.vercel.app/login` directly while signed in. You
   are redirected to `/` (the deep link works and `PublicOnlyRoute` runs).
7. Delete the "Deploy check" habit.
8. Screenshot step 4 for the deliverables.

If step 2 fails with a network or "Invalid API key" error, the variables
were missing or wrong **at build time**: fix them (§2) and redeploy (§3).
If step 4 bounces to `/login`, check the Supabase URL Configuration (§3).
