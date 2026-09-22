/**
 * Deployment check — run with:
 *   npm run check:deploy -- https://<app>.vercel.app
 *   npm run check:deploy -- https://<app>.vercel.app --roundtrip
 *
 * Answers, in order: does the live site serve the SPA and its headers, was it
 * built with the same Supabase project as the local .env, and (with
 * --roundtrip) does a signed-in habit survive a brand-new client — the
 * script's stand-in for a page refresh.
 *
 * It never prints the URL or the key from .env: it only says whether the live
 * bundle matches them. The password is read with echo off and never stored.
 * The browser half (a real refresh) is manual — see docs/deploy-check.md.
 */
import { Buffer } from 'node:buffer'
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import readline from 'node:readline'

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

    let value = line.slice(eq + 1).trim()
    if (/^(['"]).*\1$/.test(value)) value = value.slice(1, -1)
    out[line.slice(0, eq).trim()] = value
  }
  return out
}

/** Prompts on the terminal; with `hidden`, typed characters are not echoed. */
function ask(question, { hidden = false } = {}) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
  if (hidden) {
    rl._writeToOutput = (s) => {
      if (s.includes(question)) rl.output.write(s)
    }
  }
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close()
      if (hidden) process.stdout.write('\n')
      resolve(answer.trim())
    })
  })
}

const args = process.argv.slice(2)
const roundtrip = args.includes('--roundtrip')
const siteArg = args.find((a) => !a.startsWith('--'))

// http only for localhost, to try the script against `npm run preview`.
if (!siteArg || !/^(https:\/\/|http:\/\/localhost[:/])/.test(siteArg)) {
  console.log('Usage: npm run check:deploy -- https://<app>.vercel.app [--roundtrip]')
  process.exit(1)
}

const site = new URL(siteArg).origin
const fileEnv = loadEnvFile(path.join(root, '.env'))
const url = process.env.VITE_SUPABASE_URL || fileEnv.VITE_SUPABASE_URL
const anonKey = process.env.VITE_SUPABASE_ANON_KEY || fileEnv.VITE_SUPABASE_ANON_KEY

let failed = false

// --- 1. the site ------------------------------------------------------------
step(`1. Serving ${site}`)

let html = ''
try {
  // Vercel Deployment Protection (on by default for preview URLs) answers
  // everything with a redirect to its login page, which would otherwise be
  // "checked" in place of the app and fail every step confusingly.
  const probe = await fetch(`${site}/`, { redirect: 'manual' })
  if (/vercel\.com\/sso-api/.test(probe.headers.get('location') ?? '')) {
    bad('This URL is behind Vercel Deployment Protection (redirects to the Vercel login).')
    warn('Open it in a browser where you are logged in to Vercel and use the manual steps in')
    warn('docs/deploy-check.md, or run this script against the production URL instead.')
    process.exit(1)
  }

  const res = await fetch(`${site}/`)
  html = await res.text()
  if (res.ok && html.includes('<div id="root">')) ok('/ serves the app shell')
  else {
    bad(`/ returned HTTP ${res.status} without the app shell`)
    failed = true
  }

  // A deep link must hit the SPA rewrite, not a 404.
  const deep = await fetch(`${site}/login`)
  if (deep.ok && (await deep.text()).includes('<div id="root">')) {
    ok('/login deep link is rewritten to index.html')
  } else {
    bad(`/login returned HTTP ${deep.status} — check the rewrite in vercel.json`)
    failed = true
  }

  const sw = await fetch(`${site}/sw.js`)
  if (sw.ok && /max-age=0|no-cache/.test(sw.headers.get('cache-control') ?? '')) {
    ok('sw.js is revalidated on every visit')
  } else {
    bad(`sw.js: HTTP ${sw.status}, Cache-Control "${sw.headers.get('cache-control')}"`)
    failed = true
  }

  const manifest = await fetch(`${site}/manifest.webmanifest`)
  if ((manifest.headers.get('content-type') ?? '').includes('application/manifest+json')) {
    ok('manifest.webmanifest has the manifest Content-Type')
  } else {
    bad(`manifest Content-Type is "${manifest.headers.get('content-type')}"`)
    failed = true
  }

  for (const header of ['x-content-type-options', 'referrer-policy', 'x-frame-options']) {
    if (deep.headers.get(header)) ok(`${header} present`)
    else warn(`${header} missing`)
  }
} catch (error) {
  bad(`Could not reach ${site} — ${error.message}`)
  process.exit(1)
}

// --- 2. build-time environment ----------------------------------------------
step('2. Environment baked into the live bundle')

// Vite inlines VITE_* at build time, so the live entry chunk either contains
// the project URL and anon key, or the Vercel env vars were missing at build.
const entry = html.match(/<script[^>]+type="module"[^>]+src="([^"]+)"/)?.[1]
let bundle = ''
if (!entry) {
  bad('No module script found in index.html')
  failed = true
} else {
  bundle = await (await fetch(new URL(entry, site))).text()
  ok('Fetched the entry chunk')
}

if (bundle) {
  // A legacy key is a JWT, so its role is base64 — decode every one found.
  const jwtRoles = (bundle.match(/eyJ[\w-]+\.eyJ[\w-]+\.[\w-]+/g) ?? []).map((jwt) => {
    try {
      return JSON.parse(Buffer.from(jwt.split('.')[1], 'base64url').toString('utf8')).role
    } catch {
      return undefined
    }
  })

  // supabase-js itself contains the bare `sb_secret_` prefix, so match a key's
  // shape rather than the prefix alone.
  if (/sb_secret_[\w-]{16,}|service_role/.test(bundle) || jwtRoles.includes('service_role')) {
    bad('The live bundle mentions service_role / a secret key — rotate it now')
    failed = true
  } else {
    ok('No service_role or secret key in the live bundle')
  }

  if (!url || !anonKey) {
    warn('No local .env values to compare against — skipped the match check')
  } else {
    const urlMatch = bundle.includes(new URL(url).host)
    const keyMatch = bundle.includes(anonKey)
    if (urlMatch) ok('VITE_SUPABASE_URL matches the local .env')
    else bad('VITE_SUPABASE_URL is missing or differs — set it in Vercel and redeploy')
    if (keyMatch) ok('VITE_SUPABASE_ANON_KEY matches the local .env')
    else bad('VITE_SUPABASE_ANON_KEY is missing or differs — set it in Vercel and redeploy')
    if (!urlMatch || !keyMatch) failed = true
  }
}

// --- 3. data round-trip -----------------------------------------------------
step('3. Sign-in and data round-trip')

if (!roundtrip) {
  warn('Skipped — pass --roundtrip to sign in with a test account')
} else if (failed) {
  warn('Skipped — earlier checks failed')
} else {
  const email = await ask('  Test account email: ')
  const password = await ask('  Password (hidden): ', { hidden: true })

  // Stands in for localStorage: survives from the first client to the second,
  // exactly as the browser's does across a refresh.
  const store = new Map()
  const storage = {
    getItem: (k) => store.get(k) ?? null,
    setItem: (k, v) => void store.set(k, v),
    removeItem: (k) => void store.delete(k),
  }
  const client = () => createClient(url, anonKey, { auth: { storage, persistSession: true } })

  const before = client()
  const { data: signIn, error: signInError } = await before.auth.signInWithPassword({
    email,
    password,
  })

  if (signInError) {
    bad(`Sign-in failed — ${signInError.message}`)
    failed = true
  } else {
    ok('Signed in')
    const title = `Deploy check ${new Date().toISOString()}`

    // No user_id: the column default and INSERT policy set it, as in the app.
    const { data: created, error: insertError } = await before
      .from('habits')
      .insert({ title })
      .select('id')
      .single()

    if (insertError) {
      bad(`Insert failed — ${insertError.code ?? ''} ${insertError.message}`)
      failed = true
    } else {
      ok('Created a habit')

      // The "refresh": a new client with nothing but the stored session.
      const after = client()
      const { data: session } = await after.auth.getSession()
      const { data: found, error: readError } = await after
        .from('habits')
        .select('id, title')
        .eq('id', created.id)
        .maybeSingle()

      if (session.session?.user.id !== signIn.user.id) {
        bad('The session did not survive into a new client')
        failed = true
      } else if (readError || found?.title !== title) {
        bad(`The habit was not readable after "refresh" — ${readError?.message ?? 'no row'}`)
        failed = true
      } else {
        ok('Session and habit both survived a fresh client')
      }

      const { error: deleteError } = await after.from('habits').delete().eq('id', created.id)
      if (deleteError) warn(`Could not delete "${title}" — remove it by hand`)
      else ok('Cleaned up the test habit')

      // Local only: a global sign-out would end this account's browser sessions too.
      await after.auth.signOut({ scope: 'local' })
    }
  }
}

step(failed ? '\u001b[31mSome checks failed.\u001b[0m' : '\u001b[32mAll checks passed.\u001b[0m')
if (!failed) console.log('  Now run the browser steps in docs/deploy-check.md.')
process.exit(failed ? 1 : 0)
