import {
  defineConfig,
  minimal2023Preset as preset,
} from '@vite-pwa/assets-generator/config'

/**
 * Generates every icon from the single source mark in public/logo.svg:
 *
 *   npm run generate-pwa-assets
 *
 * Output lands next to the source, in public/: pwa-64x64.png,
 * pwa-192x192.png, pwa-512x512.png, maskable-icon-512x512.png,
 * apple-touch-icon-180x180.png and favicon.ico. Re-run after editing the SVG.
 *
 * Maskable and Apple icons get a solid grass-green background: Android crops
 * maskable icons to its own shape, and iOS fills any transparency with black.
 */
const BRAND = '#58CC02'

export default defineConfig({
  headLinkOptions: { preset: '2023' },
  preset: {
    ...preset,
    maskable: {
      ...preset.maskable,
      resizeOptions: { ...preset.maskable.resizeOptions, background: BRAND },
    },
    apple: {
      ...preset.apple,
      resizeOptions: { ...preset.apple.resizeOptions, background: BRAND },
    },
  },
  images: ['public/logo.svg'],
})
