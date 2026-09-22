/**
 * NativeWind 4 runs on Tailwind 3 (the web app is on Tailwind 4), so the
 * tokens from the web `src/index.css` :root are restated here as a theme.
 * Same names, same rules: `*-bright` is never behind text, the plain hue is
 * for anything carrying a label, `*-edge` is the 3D press edge.
 *
 * @type {import('tailwindcss').Config}
 */
module.exports = {
  content: ['./src/**/*.{js,jsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        grass: { bright: '#58CC02', DEFAULT: '#428407', edge: '#2F6100' },
        sky: { bright: '#1CB0F6', DEFAULT: '#0C7CB8', edge: '#095C89' },
        streak: { bright: '#FF9600', DEFAULT: '#B35F00', edge: '#8A4900' },
        danger: { bright: '#FF4B4B', DEFAULT: '#D63B3B', edge: '#A62B2B' },
        background: '#F7F7F7',
        foreground: '#4B4B4B',
        card: '#FFFFFF',
        muted: { DEFAULT: '#F0F0F0', foreground: '#767676' },
        accent: { DEFAULT: '#EAF7DC', foreground: '#2F6100' },
        border: '#E5E5E5',
      },
      borderRadius: {
        card: '16px',
        control: '12px',
      },
    },
  },
  plugins: [],
}
