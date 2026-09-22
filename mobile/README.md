# Habit Tracker — Expo app

The native port of the web app in the parent folder: sign in, see your
habits with today's ticks and streaks, tick them off, add new ones.

| Piece | Choice |
| --- | --- |
| SDK | Expo 57 (React Native 0.86, React 19.2) |
| Navigation | Expo Router (file-based, built on React Navigation). Routes in `src/app/` |
| Styling | NativeWind 4.2.7 on **Tailwind 3.4** (NativeWind 4 does not run on Tailwind 4) |
| Tokens | `tailwind.config.js` restates the web `:root` tokens: `grass`, `sky`, `streak`, `danger` (+ `-bright`/`-edge`), `rounded-card`, `rounded-control` |
| Data | Supabase, with the session in AsyncStorage |

## Running it

```
cd mobile
npm install
cp .env.example .env
npx expo start
```

Fill in `.env` with the same project URL and anon key as the web app, under
`EXPO_PUBLIC_` names. Then scan the QR code with **Expo Go** on your phone
(same Wi-Fi), or press `a` / `i` for an emulator or simulator. Restart
`expo start` after editing `.env`.

Sign-up is web-only for now: create the account on the web app, then sign
in here.

## Layout

```
src/app/_layout.jsx        AuthProvider + Stack with Stack.Protected guards; splash until the session is read
src/app/login.jsx          Sign in (reuses the web validators)
src/app/index.jsx          List: FlatList, skeleton / error / empty, tick, pull to refresh
src/app/add.jsx            Add (modal): form → createHabit → router.back()
src/components/            Button (3D), HabitRow, StreakBadge, States
src/context/AuthProvider   Session context (same shape as the web one)
src/lib/supabase.js        Native Supabase client (AsyncStorage, no URL session detection)
src/lib/share.js           The ONLY Platform.select in the codebase
```

## Shared with the web app

`@shared/*` → `../src/lib/*` (see `jsconfig.json` and `metro.config.js`).
Imported unchanged: `habits.js` (every query), `streaks.js`, `validation.js`.
Before importing anything else from there, check `../docs/platform-audit.md`:
several web files use browser-only APIs that throw on native.

## Not ported yet

Offline queue, edit/delete, avatars, sign-up. Ticking is not optimistic
here: the tick shows a spinner until the server confirms it.

## Env

`EXPO_PUBLIC_*` values are inlined into the bundle, so they are public. The
anon key only, never service_role. `.env` is gitignored here and in the
parent repo.
