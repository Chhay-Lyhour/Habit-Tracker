# Habit Tracker — Expo app

The native port of the web app in the parent folder. This folder is currently
a **shell**: navigation, styling and the share branch work, and the screens
are empty placeholders for hand-write Zone C.

| Piece | Choice |
| --- | --- |
| SDK | Expo 57 (React Native 0.86, React 19.2) |
| Navigation | Expo Router (file-based, built on React Navigation). Routes in `src/app/` |
| Styling | NativeWind 4.2.7 on **Tailwind 3.4** (NativeWind 4 does not run on Tailwind 4) |
| Tokens | `tailwind.config.js` restates the web `:root` tokens: `grass`, `sky`, `streak`, `danger` (+ `-bright`/`-edge`), `rounded-card`, `rounded-control` |

## Running it

```
cd mobile
npm install
cp .env.example .env
npx expo start
```

Then press `i` (iOS simulator) or `a` (Android emulator), or scan the QR code
with Expo Go on a phone. Everything here is in Expo Go's bundled modules, so
you do not need a development build yet.

## Layout

```
src/app/_layout.jsx   Stack navigator + header Share button; imports global.css
src/app/index.jsx     List screen (shell). Zone C: FlatList of habits
src/app/add.jsx       Add screen (shell, modal). Zone C: the form
src/lib/share.js      The ONLY Platform.select in the codebase
```

Before importing anything from the web app's `src/`, read
`../docs/platform-audit.md`. Several of those files use browser-only APIs
that throw on native.

## Env

`EXPO_PUBLIC_*` values are inlined into the bundle, so they are public. The
anon key only, never service_role. `.env` is gitignored here and in the
parent repo.
