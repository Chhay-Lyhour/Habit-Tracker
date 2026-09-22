# Habit Tracker — Expo app

The native port of the web app in the parent folder: sign up or sign in,
track habits with stats and streaks, edit / pause / delete them, and set a
profile photo.

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

Sign-up works in the app. With email confirmation on, the email's link opens
the app (`src/app/auth-callback.jsx`), which signs you in. For that, add these
to Supabase **Authentication > URL Configuration > Redirect URLs**:

- `exp://**` for Expo Go during development
- `habittracker://**` for a real build (the `scheme` in `app.json`)

Without them, Supabase falls back to the Site URL and the link opens the web
app instead. Open the email **on the phone**: an `exp://` link does nothing
on a laptop.

## Layout

```
src/app/_layout.jsx        Providers + Stack with Stack.Protected guards; splash until the session is read
src/app/login.jsx, signup.jsx
src/app/index.jsx          Offline banner, stats tiles, habit FlatList, tick, pull to refresh
src/app/add.jsx            New habit (modal)
src/app/habit/[id].jsx     Edit / pause / delete (modal, inline delete confirmation)
src/app/profile.jsx        Avatar upload + sign out
src/context/               AuthProvider, HabitsProvider (the native useHabits), ProfileProvider
src/lib/avatar.js          Picked photo → 512px JPEG → shared validateAvatar → upload
src/lib/supabase.js        Native Supabase client (AsyncStorage, no URL session detection)
src/lib/share.js           The ONLY Platform.select in the codebase
src/hooks/useOnlineStatus  NetInfo (the web one uses navigator.onLine)
```

## Shared with the web app

`@shared/*` → `../src/lib/*` (see `jsconfig.json` and `metro.config.js`).
Imported unchanged: `habits.js` (every query), `streaks.js`, `validation.js`,
`validateAvatar.js`, and `getProfile` / `friendlyProfileError` from `profile.js`.
Before importing anything else from there, check `../docs/platform-audit.md`:
several web files use browser-only APIs that throw on native.

## Offline

- **Adding a habit works offline.** It is saved to AsyncStorage
  (`src/lib/offlineQueue.js`, a port of the web queue with the same five rules),
  shown as "Queued", and synced on reconnect and on start-up. A replay reuses
  the item's uuid, so it can never create a duplicate.
- Ticking, editing, deleting and avatar changes are disabled while offline.
- Signing out with unsynced habits asks first, then clears them.

Ticking is optimistic: the tick shows at once and rolls back only that
habit's day if the server refuses.

## Not ported yet

The avatar picker is for iOS / Android; it is untested on the web target.

## Env

`EXPO_PUBLIC_*` values are inlined into the bundle, so they are public. The
anon key only, never service_role. `.env` is gitignored here and in the
parent repo.
