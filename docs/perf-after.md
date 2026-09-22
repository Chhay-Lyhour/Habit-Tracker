# Performance: after

Every build below was made with `npm run build` (Vite 8.3.0), from the same
commit, with only the change named in each section applied. Sizes are after
minification, as Vite prints them. CSS (70.71 kB, 12.20 kB gzip) and
`workbox-window` (5.65 kB, 2.20 kB gzip) are the same in every build and are
left out of the tables.

## Zone A: lazy-split decision

**Decision: only `TrackerPage` is `React.lazy` + `Suspense`. Login, signup
and 404 are imported statically.**

| Build | Entry chunk | Gzip | Tracker chunk | Gzip | JS for `/login` (gzip) |
| --- | ---: | ---: | ---: | ---: | ---: |
| All pages static (true baseline) | 700.15 kB | 208.57 kB | — | — | 208.57 kB, 1 request |
| All pages lazy (`main` at `b6a4adb`) | 567.36 kB | 168.29 kB | 125.97 kB | 40.27 kB | 170.75 kB (entry + LoginPage + shared `validation` chunk), 2 round trips |
| **Only TrackerPage lazy (Zone A)** | **574.61 kB** | **170.20 kB** | **125.96 kB** | **40.25 kB** | **170.20 kB, 1 request** |

Why the tracker:

- **Size.** The tracker accounts for almost all of the split: 126 kB, or 40 kB gzip.
  It holds the dropdown menu, the dialogs (Radix + Floating UI), avatar upload
  and the offline queue. Login, signup and 404 together are under 6 kB
  (2.6 kB gzip).
- **Who visits it.** Only signed-in users. A signed-out visitor, including
  every new user, lands on `/login` and should never pay for the tracker.
- **First paint.** `/login` is the first screen a new user sees. As a
  separate chunk it had to wait for the entry chunk to run before its own
  request could even start. That second round trip saved nothing: split
  out, `/login` needed 170.75 kB gzip across three files, and merged back
  it needs 170.20 kB in one, because each extra chunk carries its own
  overhead. On a slow mobile connection, that removed round trip is worth
  hundreds of milliseconds.
- **The tracker's own delay is hidden.** `App.jsx` starts downloading the tracker chunk at
  startup when the path is `/`, in parallel with reading the session.
  The Suspense fallback is the same `TrackerSkeleton` that
  `ProtectedRoute` shows, so the hand-off is invisible.

Compared with the all-static baseline, a signed-out visitor downloads **38.4 kB
less gzipped JS (−18%)** before the login form can render.

## Dependency swap: `next-themes` removed

`useTheme()` was called without a `ThemeProvider` anywhere, so it always
returned `undefined`. `sonner.jsx` now passes `theme="light"` and the package
is uninstalled.

| Build | Entry chunk | Gzip |
| --- | ---: | ---: |
| Before (Zone A applied) | 574.61 kB | 170.20 kB |
| After removing `next-themes` | 573.64 kB | 169.80 kB |
| **Saved** | **0.97 kB** | **0.40 kB** |

The saving is small, as `perf-before.md` predicted. The gain is one fewer
dependency and no dead code path. The package is now absent from
`package.json`, but `sonner.jsx` is a generated file, so re-running
`shadcn add sonner` would bring the import back.

## Zone B: below-the-fold images

The app renders one kind of image, `UserAvatar`, in two places: the header
account menu and the first card on the tracker (`AvatarUploader`). **Both
are above the fold, so neither is lazy-loaded.** `loading="lazy"` on an
above-the-fold image delays it and hurts LCP. It would also have no effect
here: Radix's `AvatarImage` preloads the URL with `new Image()` and renders
the `<img>` only after it has loaded.

The `<img>` now gets explicit `width`/`height` (40 in the header, 80 in the
uploader). **Explicit dimensions matter because the browser can reserve the
image's box before the file downloads, so the content below does not jump
when it arrives (Cumulative Layout Shift).**

## Addendum: `/profile` route (after Phase G)

The avatar uploader moved from the tracker to its own `/profile` page,
matching the Expo app. That page is lazy-loaded too, for the same Zone A
reasons: it is signed-in only, and it carries upload and validation code that
`/login` must not pay for. Rolldown puts the header and account menu (Radix,
Floating UI) that both signed-in pages share into their own chunk.

| Chunk | Size | Gzip |
| --- | ---: | ---: |
| `index-*.js` (entry) | 574.28 kB | 170.01 kB |
| `UserMenu-*.js` (shared: AppShell, account menu, Radix) | 99.14 kB | 32.51 kB |
| `TrackerPage-*.js` | 22.70 kB | 7.87 kB |
| `ProfilePage-*.js` | 5.71 kB | 2.51 kB |

`/login` is unchanged (+0.21 kB gzip for the route config). `/` now needs
40.38 kB gzip beyond the entry chunk, where it needed 40.26 kB before. The
browser fetches the two files in parallel. `/profile` reuses the shared chunk,
so opening it from the tracker downloads only 2.51 kB.

## Final build (Phase G, before the addendum)

| Chunk | Size | Gzip |
| --- | ---: | ---: |
| `index-*.js` (entry) | 573.64 kB | 169.80 kB |
| `TrackerPage-*.js` | 125.99 kB | 40.26 kB |
