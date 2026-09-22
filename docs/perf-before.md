# Performance: before

Baseline production build, taken before any Phase G change.

| | |
| --- | --- |
| Commit | `b6a4adb` (`main`) |
| Command | `npm run build` |
| Toolchain | Vite 8.3.0 (Rolldown), Node 25.8.1, darwin-arm64 |
| Modules transformed | 2094 |
| PWA precache | 25 entries, 835.31 KiB |

## Chunk table

Sizes are exactly what Vite printed. All sizes are after minification.

| Chunk | Size | Gzip |
| --- | ---: | ---: |
| `index-DEg8TCvB.js` (entry) | 567.36 kB | 168.29 kB |
| `TrackerPage-BEL77SW2.js` | 125.97 kB | 40.27 kB |
| `workbox-window.prod.es5-Bd17z0YL.js` | 5.65 kB | 2.20 kB |
| `validation-DsTxwQwr.js` | 3.34 kB | 1.54 kB |
| `SignupPage-B8XrkvNv.js` | 3.01 kB | 1.42 kB |
| `LoginPage-F48PjD7j.js` | 1.86 kB | 0.92 kB |
| `NotFoundPage-BHAl6GIv.js` | 0.35 kB | 0.27 kB |
| `index-DUaaT-O4.css` | 70.67 kB | 12.19 kB |
| `index.html` | 1.19 kB | 0.57 kB |
| `manifest.webmanifest` | 0.52 kB | — |

Fonts: 40 Nunito files (`.woff2` and `.woff`, 5 subsets × 4 weights), 5.96–21.42 kB
each. They are already compressed, so Vite does not print a gzip size for them.
Only latin `woff2` is precached; the browser downloads the others only when
a page uses a glyph from that subset.

Vite warned: *"Some chunks are larger than 500 kB after minification"*, which
refers to the entry chunk.

## Note: every page is already lazy on this baseline

`src/App.jsx` already wraps **all four** pages in `React.lazy` + `Suspense`
(commit `df5812c`). So this table is not a "no code-splitting" baseline.
For a true before/after for Zone A, rebuild once with the pages imported
statically and record that build as the "before".

## What is in the two big chunks

Approximate per-package share, measured from a source-mapped build
(`vite build --sourcemap`). The numbers are **unminified source** bytes, so
use them for ranking only. Do not compare them with the table above.

**Entry chunk (`index-*.js`)** loads on every route, including `/login`:

| Package | Source kB |
| --- | ---: |
| react-dom | 620 |
| @supabase/auth-js | 423 |
| react-router | 367 |
| @supabase/storage-js | 113 |
| @supabase/postgrest-js | 109 |
| @supabase/realtime-js + phoenix | 155 |
| sonner | 68 |
| app source | 62 |
| cn | 42 |

**`TrackerPage-*.js`**: app source (80 kB), then Radix menu/dialog/popper and
`@floating-ui/*` (together more than the app code). These come from the
dropdown menu and dialogs.

## Dependency audit

Proposal only; nothing has been changed. Whether to apply it is a
hand-write-zone decision.

**Proposed: remove `next-themes`, and have `src/components/ui/sonner.jsx` pass a
fixed `theme="light"`.** The app never mounts a `ThemeProvider` and nothing
toggles `.dark`, so `useTheme()` always returns `undefined`. The package is
imported only to produce a value that never changes.

Expect a very small gain: after tree-shaking, `next-themes` is well under
1 kB of the entry chunk. The real benefit is one less dependency and no
dead code path. `sonner.jsx` is a generated file, so a later `shadcn add sonner`
would bring the import back. Note that in the commit.

Other findings, not proposed:

- **`shadcn` is in `dependencies`.** It is a CLI. The app uses it only for
  `@import "shadcn/tailwind.css"` at build time, so it belongs in
  `devDependencies`. Moving it changes install size, not bundle size.
- **`@supabase/realtime-js` + `phoenix` (about 155 kB source) ship unused.** The app
  never opens a channel. `supabase-js` imports realtime eagerly, so the only
  way to drop it is to replace `supabase-js` with `@supabase/auth-js` +
  `@supabase/postgrest-js` + `@supabase/storage-js` wired by hand. That would
  save the most bytes, but it rewrites `src/lib/supabase.js`, so it is not a
  one-dependency swap.
