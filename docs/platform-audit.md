# Platform audit (Phase G, task 3)

## The one platform branch

[`mobile/src/lib/share.js`](../mobile/src/lib/share.js) is the only place in
the codebase that uses `Platform`:

```js
export const shareApp = Platform.select({ web: shareOnWeb, default: shareOnNative })
```

- **web**: `navigator.share({ title, text, url })`. Resolves `'unsupported'`
  when the browser has no share sheet, and `'dismissed'` on `AbortError`.
- **native**: `Share.share({ title, message })`, with the link inside
  `message`. Android ignores `url`, so one field covers both OSes without a
  second `Platform.OS` check.
- Shares only the public app URL (`EXPO_PUBLIC_APP_URL`) and fixed copy,
  under the same rule as the web `ShareButton`.
- Its one caller is the header button in `mobile/src/app/_layout.jsx`.

Verify:

```
grep -rn "Platform" mobile/src
```

Expected: hits only in `mobile/src/lib/share.js`. The `navigator` references
in that file are inside `shareOnWeb`, which only runs when `Platform.OS === 'web'`.

The web app (`src/`) has **no** platform branch. Vite builds it only for the
browser, so its `ShareButton` calls `navigator.share` directly and keeps its
clipboard and dialog fallbacks. It is not shared code.

## Leaks: web-only APIs in code the port would reuse

None of these files was wrapped or patched. The Expo app (Zone C) imports
**only** the three portable files below, through the `@shared/*` alias
(`mobile/jsconfig.json` + `watchFolders` in `mobile/metro.config.js`). Leaks
1–3 are solved by substitution: `habits.js` imports `@/lib/supabase`, and in
the Expo project `@/` points at `mobile/src`, so it gets the native client
(`mobile/src/lib/supabase.js`: AsyncStorage, `detectSessionInUrl: false`).
The web build is untouched. Leaks 4–11 are in files the Expo app never
imports. The port has native twins instead: its own `AuthProvider` (leak 4),
`useOnlineStatus` on NetInfo (leaks 7 and 9), an AsyncStorage `offlineQueue`
with `expo-crypto` uuids (leaks 7 and 8), and `lib/avatar.js`, which reads
the picked photo's bytes and hands the unchanged web `validateAvatar` the
shape it expects (leak 11).

### Portable as-is

| File | Why it is safe |
| --- | --- |
| `src/lib/streaks.js` | Pure functions over strings and `Date`. |
| `src/lib/validation.js` | Pure functions and regexes. |
| `src/lib/habits.js` (the helpers) | `todayISO`, `isoDaysAgo` and `friendlyDataError` are pure. `isNetworkError` already recognises RN's `"Network request failed"`. |

### Leaks found

| # | Where | Web-only API | What happens on native |
| --- | --- | --- | --- |
| 1 | `src/lib/supabase.js:3-4` | `import.meta.env.VITE_*` | Metro does not provide `import.meta.env`, so both values are `undefined` and the file throws at import. Expo uses `process.env.EXPO_PUBLIC_*`. |
| 2 | `src/lib/supabase.js:22` | **Implicit** `localStorage` through `createClient()` default auth storage, plus `detectSessionInUrl`, which reads `window.location` | Nothing is persisted, so the session is lost on every app restart. A native client needs `auth: { storage: AsyncStorage or SecureStore, detectSessionInUrl: false }`. |
| 3 | `src/lib/habits.js:1` | Imports `@/lib/supabase` | Inherits 1 and 2. The query functions themselves are portable. |
| 4 | `src/context/AuthProvider.jsx:71` | `window.location.origin` in `emailRedirectTo` | Throws a TypeError on sign-up (`window.location` is undefined in RN). |
| 5 | `src/context/AuthProvider.jsx` sign-out | `clearRuntimeCaches()` and `clearQueue()` | See 7 and 8. |
| 6 | `src/hooks/useHabits.js:37-41, 241-242` | `window.addEventListener` for `QUEUE_EVENT`, `storage` and `online` | `window.addEventListener` is undefined on native, so the effect throws on mount. |
| 7 | `src/hooks/useHabits.js:196-226` | `navigator.onLine`, `crypto.randomUUID()` | `navigator.onLine` is `undefined`, so `!navigator.onLine` is **true** and every create would be queued as "offline". `crypto.randomUUID` is missing on Hermes (use `expo-crypto`). |
| 8 | `src/lib/offlineQueue.js:60-146` | `localStorage`, `window.dispatchEvent(new CustomEvent(...))`, `crypto.randomUUID()` | Throws on the first queue read or write. |
| 9 | `src/hooks/useOnlineStatus.js` | `navigator.onLine`, `window` `online`/`offline` events | Throws on mount. The native equivalent is `@react-native-community/netinfo`. (Hand-write zone 7, so flagged only.) |
| 10 | `src/lib/pwa.js` | `window.caches` | Guarded by `typeof window` / `'caches' in window`, so it returns 0 and does not crash. It is also meaningless on native: there is no service worker. |
| 11 | `src/lib/validateAvatar.js:46`, `src/lib/profile.js:122` | `File`/`Blob` (`file.slice().arrayBuffer()`, `file.type`, `file.size`) | An image picker returns a `{ uri, mimeType, fileSize }` asset, not a `File`, so validation and upload need a different input shape. (Zone 3, so flagged only.) |

### Takeaway for the port

The **logic** moves across for free: streaks, validation, date handling,
error mapping, and the shape of every query. What does **not** move is
everything that touches the environment: env loading, session storage,
connectivity, local persistence, IDs and files. On the web the browser
provides those implicitly (`localStorage`, `navigator`, `window`); on
native each one must be supplied explicitly.
