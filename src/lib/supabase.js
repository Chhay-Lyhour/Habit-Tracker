import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Fail loudly at startup rather than letting every query die with a vague
// network error later. Never print the values themselves — only their names.
if (!url || !anonKey) {
  const missing = [
    !url && 'VITE_SUPABASE_URL',
    !anonKey && 'VITE_SUPABASE_ANON_KEY',
  ].filter(Boolean)

  throw new Error(
    `Supabase is not configured — missing ${missing.join(' and ')}.\n\n` +
      'Copy .env.example to .env and paste in your project URL and anon key\n' +
      '(Supabase dashboard > Project Settings > API).\n' +
      'Vite only reads .env at startup, so restart `npm run dev` afterwards.'
  )
}

export const supabase = createClient(url, anonKey)
