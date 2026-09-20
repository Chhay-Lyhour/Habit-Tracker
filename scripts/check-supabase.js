/**
 * Connection check — run with: npm run check:supabase
 *
 * Answers, in order: is .env filled in, is that the right kind of key, can we
 * reach the project, and do the tables exist yet.
 *
 * It never prints the key. The only thing it reveals about it is which role it
 * claims, which is exactly what you want to know.
 */
import { Buffer } from 'node:buffer'
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'

import { createClient } from '@supabase/supabase-js'

const root = path.resolve(import.meta.dirname, '..')

const ok = (msg) => console.log(`  \u001b[32m✓\u001b[0m ${msg}`)
const bad = (msg) => console.log(`  \u001b[31m✗\u001b[0m ${msg}`)
const warn = (msg) => console.log(`  \u001b[33m!\u001b[0m ${msg}`)
const step = (msg) => console.log(`\n${msg}`)

function loadEnvFile(file) {
  if (!fs.existsSync(file)) return {}

  const out = {}
  for (const raw of fs.readFileSync(file, 'utf8').split('\n')) {
    const line = raw.trim()
    if (!line || line.startsWith('#')) continue

    const eq = line.indexOf('=')
    if (eq === -1) continue

    const key = line.slice(0, eq).trim()
    let value = line.slice(eq + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    out[key] = value
  }
  return out
}

/** Works out what role a key claims, without ever echoing the key itself. */
function describeKey(key) {
  if (key.startsWith('sb_secret_')) return 'secret'
  if (key.startsWith('sb_publishable_')) return 'publishable'

  const parts = key.split('.')
  if (parts.length === 3) {
    try {
      const payload = JSON.parse(
        Buffer.from(parts[1], 'base64url').toString('utf8')
      )
      return payload.role ?? 'unknown'
    } catch {
      return 'unreadable'
    }
  }
  return 'unknown'
}

const fileEnv = loadEnvFile(path.join(root, '.env'))
const url = process.env.VITE_SUPABASE_URL || fileEnv.VITE_SUPABASE_URL
const anonKey =
  process.env.VITE_SUPABASE_ANON_KEY || fileEnv.VITE_SUPABASE_ANON_KEY

let failed = false

// --- 1. environment ---------------------------------------------------------
step('1. Environment')

if (!url) {
  bad('VITE_SUPABASE_URL is missing — copy .env.example to .env and fill it in')
  failed = true
} else if (!/^https:\/\/[a-z0-9-]+\.supabase\.(co|in)$/.test(url)) {
  warn(`VITE_SUPABASE_URL is set but looks unusual: ${url}`)
  warn('Expected something like https://abcdefgh.supabase.co')
} else {
  ok(`VITE_SUPABASE_URL -> ${new URL(url).host}`)
}

if (!anonKey) {
  bad('VITE_SUPABASE_ANON_KEY is missing')
  failed = true
} else {
  const role = describeKey(anonKey)

  if (role === 'service_role' || role === 'secret') {
    bad(`This is a ${role} key. It bypasses Row Level Security.`)
    bad('Replace it with the anon / publishable key before running the app.')
    failed = true
  } else if (role === 'anon' || role === 'publishable') {
    ok(`VITE_SUPABASE_ANON_KEY is ${role} — correct for the browser`)
  } else {
    warn(`Could not tell what role this key claims (${role}) — double-check it`)
  }
}

if (failed) {
  step('Stopping here — fix the above and run again.')
  process.exit(1)
}

// --- 2. reachability --------------------------------------------------------
step('2. Reaching the project')

try {
  const res = await fetch(`${url}/auth/v1/health`, {
    headers: { apikey: anonKey },
  })
  if (res.ok) {
    ok('Auth endpoint responded')
  } else {
    bad(`Auth endpoint returned HTTP ${res.status}`)
    if (res.status === 401) bad('That usually means the key does not match this project')
    failed = true
  }
} catch (error) {
  bad(`Could not reach ${url} — ${error.message}`)
  failed = true
}

// --- 3. tables --------------------------------------------------------------
step('3. Tables')

const supabase = createClient(url, anonKey)

for (const table of ['habits', 'daily_logs']) {
  const { error } = await supabase.from(table).select('id').limit(1)

  if (!error) {
    ok(`public.${table} exists and is readable`)
    continue
  }

  // 42P01 is Postgres' "undefined table"; PGRST205 is PostgREST saying the
  // table is not in its schema cache, which is what you get on a fresh project.
  if (error.code === '42P01' || error.code === 'PGRST205') {
    bad(`public.${table} does not exist — run supabase/schema.sql first`)
  } else if (error.code === 'PGRST301' || error.message.includes('JWT')) {
    bad(`public.${table}: key rejected — ${error.message}`)
  } else {
    bad(`public.${table}: ${error.code ?? 'error'} — ${error.message}`)
  }
  failed = true
}

// --- 4. RLS sanity ----------------------------------------------------------
step('4. Row Level Security')

if (!failed) {
  // Signed out, the anon role should see nothing. Rows coming back here mean
  // the tables are readable by anyone holding the public key.
  const { data, error } = await supabase.from('habits').select('id').limit(1)

  if (error) {
    warn(`Could not check: ${error.message}`)
  } else if (data.length > 0) {
    bad(`Signed out, anon can read ${data.length} habit row(s).`)
    bad('RLS is off or a policy is too broad — write and run supabase/policies.sql.')
    failed = true
  } else {
    ok('Signed out, anon sees no rows')
    warn('An empty table looks the same as RLS working — confirm with seed data present')
  }
} else {
  warn('Skipped — earlier checks failed')
}

step(failed ? '\u001b[31mSome checks failed.\u001b[0m' : '\u001b[32mAll checks passed.\u001b[0m')
process.exit(failed ? 1 : 0)
