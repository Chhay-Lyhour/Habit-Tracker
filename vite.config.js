import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      // 'prompt', not 'autoUpdate': a new service worker waits until the user
      // presses Refresh in UpdateToast, so a deploy never reloads the page
      // under someone mid-way through typing a habit.
      registerType: 'prompt',

      // UpdateToast registers the worker through virtual:pwa-register/react,
      // so the plugin must not inject a second registration script.
      injectRegister: false,

      // Off in `npm run dev`. A dev-server service worker caches modules that
      // Vite is hot-reloading and serves stale code. Test PWA behaviour with
      // `npm run build && npm run preview` only.
      devOptions: { enabled: false },

      manifest: {
        name: 'Habit Tracker',
        short_name: 'Habits',
        description: 'Build habits one day at a time — track your daily streak.',
        theme_color: '#58CC02', // --grass-bright
        background_color: '#F7F7F7', // --background
        display: 'standalone',
        start_url: '/',
        scope: '/',
        lang: 'en',
        icons: [
          { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'maskable-icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },

      workbox: {
        // The app shell: everything needed to boot with no network. Only the
        // latin Nunito files are precached — the other subsets (cyrillic,
        // vietnamese…) are only downloaded if a page uses those characters.
        globPatterns: [
          '**/*.{js,css,html,ico,png,svg}',
          '**/nunito-latin-[0-9]*.woff2',
        ],

        // Deep links offline: any navigation the cache has not seen gets the
        // cached index.html, and react-router takes it from there.
        navigateFallback: 'index.html',

        // Drop precaches left behind by older builds.
        cleanupOutdatedCaches: true,

        /**
         * ====================================================================
         * HAND-WRITE ZONE 3a — runtime caching (graded; write these yourself)
         * ====================================================================
         *
         * Everything NOT precached above is decided here: requests made at
         * runtime. Each rule is one object in this array:
         *
         *   {
         *     urlPattern: ({ url, request, sameOrigin }) => boolean,
         *     handler: 'CacheFirst' | 'NetworkFirst'
         *            | 'StaleWhileRevalidate' | 'NetworkOnly',
         *     method: 'GET',                        // default; only GETs cache
         *     options: {
         *       cacheName: 'something-descriptive',
         *       expiration: { maxEntries: N, maxAgeSeconds: S },
         *       cacheableResponse: { statuses: [0, 200] },
         *       networkTimeoutSeconds: N,            // NetworkFirst only
         *     },
         *   }
         *
         * Rules match top to bottom; the first match wins. Anything that
         * matches no rule goes straight to the network (it is not cached).
         * Supabase is cross-origin: match on url.hostname / url.pathname, not
         * on sameOrigin.
         *
         * Decide, for each, the strategy, cache name, expiration, and what the
         * user sees OFFLINE:
         *
         *   1. Images, including avatars (Supabase Storage
         *      /storage/v1/object/public/avatars/...).
         *        CacheFirst is fast and works offline but never notices a
         *        change; StaleWhileRevalidate shows the old image once then
         *        updates. Avatar URLs carry a ?v=<timestamp> cache-buster, so
         *        a changed avatar is a NEW URL — which changes how much a
         *        "never re-check" strategy actually costs you. Cap maxEntries:
         *        every old ?v= URL is a separate entry.
         *
         *   2. Supabase REST — /rest/v1/ (habits, daily_logs, profiles).
         *        Caching these makes the list load offline, but the responses
         *        are AUTHENTICATED and PRIVATE. A service-worker cache is keyed
         *        by URL, not by who asked, and it PERSISTS AFTER SIGN-OUT: on
         *        a shared device user B could be shown user A's habits.
         *        (Sign-out clears runtime caches — src/lib/pwa.js — but a tab
         *        that is closed without signing out never gets there.) Weigh
         *        offline reading against that. If you cache at all,
         *        NetworkFirst with a short networkTimeoutSeconds and a short
         *        maxAgeSeconds; never CacheFirst for data that changes.
         *
         *   3. Supabase auth — /auth/v1/ (token refresh, sign-in, sign-out).
         *        These must NEVER be cached. A cached token response can hand
         *        out a stale or someone else's session, and a cached sign-out
         *        does not sign anyone out. Write the rule explicitly (so the
         *        intent is on record) rather than relying on "no rule = not
         *        cached". Offline, these fail — and supabase-js keeps the
         *        stored session until it can refresh.
         *
         *   4. Google Fonts or other third-party static assets (the
         *      non-latin Nunito subsets above, any future CDN file).
         *        Nunito is self-hosted, so today this is mostly the extra
         *        font subsets. Static, versioned files rarely change: long
         *        maxAgeSeconds is cheap here. Note cross-origin responses
         *        without CORS are "opaque" (status 0) — decide whether to
         *        accept status 0 in cacheableResponse, knowing an opaque
         *        error looks the same as a success.
         *
         * Then write one sentence per rule in README.md (zone 3c): why that
         * asset earns its strategy.
         * ====================================================================
         */
        runtimeCaching: [
          {
            urlPattern: ({ url }) =>
              url.hostname.endsWith('.supabase.co') &&
              url.pathname.startsWith('/storage/v1/object/public/avatars/'),
            handler: 'CacheFirst',
            method: 'GET',
            options: {
              cacheName: 'avatar-images',
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: ({ url }) =>
              url.hostname.endsWith('.supabase.co') &&
              url.pathname.startsWith('/auth/v1/'),
            handler: 'NetworkOnly',
          },
          {
            urlPattern: ({ url }) =>
              url.hostname.endsWith('.supabase.co') &&
              url.pathname.startsWith('/rest/v1/'),
            handler: 'NetworkFirst',
            method: 'GET',
            options: {
              cacheName: 'supabase-rest',
              networkTimeoutSeconds: 3,
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 5 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: ({ request, url }) =>
              request.destination === 'font' || url.pathname.startsWith('/assets/'),
            handler: 'CacheFirst',
            method: 'GET',
            options: {
              cacheName: 'static-assets',
              expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [200] },
            },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
})
