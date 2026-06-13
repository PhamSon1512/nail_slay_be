#!/usr/bin/env node

/**
 * Interactive wizard: creates Cloudflare resources then generates wrangler.jsonc.
 *
 * What this script does:
 *   1. Asks for names / secrets (no IDs needed)
 *   2. wrangler d1 create        → if exists, fetches ID from list
 *   3. wrangler r2 bucket create → enables public r2.dev URL (or fetches existing)
 *   4. Writes .dev.vars and wrangler.jsonc
 *
 * Note: on some machines wrangler outputs to log files instead of stdout due to
 * EPERM on node_modules/.cache. This script handles that by reading the log file.
 *
 * Usage:
 *   node scripts/setup-wrangler.mjs
 *   node scripts/setup-wrangler.mjs --output ./wrangler.staging.jsonc
 */

import { input, password, confirm } from '@inquirer/prompts'
import { program } from 'commander'
import chalk from 'chalk'
import { writeFileSync, existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { resolve, join } from 'node:path'
import { spawnSync } from 'node:child_process'
import { homedir } from 'node:os'

// ─── CLI flags ────────────────────────────────────────────────────────────────
program
  .name('setup-wrangler')
  .description('Create Cloudflare resources and generate wrangler.jsonc')
  .option('-o, --output <path>', 'output file path', './wrangler.jsonc')
  .parse(process.argv)

const opts = program.opts()
const outputPath = resolve(process.cwd(), opts.output)

// Wrangler log directory (where wrangler writes debug logs when stdout is blocked by EPERM)
const WRANGLER_LOG_DIR = join(homedir(), 'Library/Preferences/.wrangler/logs')

// ─── helpers ──────────────────────────────────────────────────────────────────
const section = (label) => console.log('\n' + chalk.cyan.bold(`── ${label} ──`))

/**
 * Run a wrangler command.
 * Returns { out, alreadyExists } where out is combined stdout+stderr+log content.
 * Throws on non-zero exit unless ignoreError = true.
 */
function wrangler(args, { ignoreError = false } = {}) {
  // Snapshot log files BEFORE running to detect new ones created by this run
  const logsBefore = existsSync(WRANGLER_LOG_DIR)
    ? readdirSync(WRANGLER_LOG_DIR).sort()
    : []

  const res = spawnSync('wrangler', args, {
    encoding: 'utf-8',
    cwd: process.cwd(),
    stdio: 'pipe',
    env: {
      ...process.env,
      WRANGLER_SEND_METRICS: 'false',
      CI: 'true',
    },
  })

  const combined = (res.stdout ?? '') + (res.stderr ?? '')

  // Read any NEW log file created by this wrangler invocation
  let logContent = ''
  if (existsSync(WRANGLER_LOG_DIR)) {
    const logsAfter = readdirSync(WRANGLER_LOG_DIR).sort()
    const newLogs = logsAfter.filter((f) => !logsBefore.includes(f))
    if (newLogs.length) {
      logContent = readFileSync(join(WRANGLER_LOG_DIR, newLogs.at(-1)), 'utf-8')
    }
  }

  const out = combined + '\n' + logContent
  const alreadyExists = out.includes('already exists')

  if (!ignoreError && res.status !== 0 && !out.includes('✨ Success')) {
    throw new Error(out.trim() || 'wrangler command failed')
  }

  return { out, alreadyExists }
}

/**
 * Spinner-like step runner.
 */
async function step(label, fn) {
  process.stdout.write(`  ${chalk.dim('⟳')}  ${label}...`)
  try {
    const result = await fn()
    process.stdout.write(' ' + chalk.green('✓\n'))
    return result
  } catch (err) {
    process.stdout.write(' ' + chalk.red('✗\n'))
    console.error(chalk.red(`\n  Error: ${err.message}\n`))
    throw err
  }
}

// ─── Resource helpers ─────────────────────────────────────────────────────────
const UUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i
const R2_URL_RE = /https?:\/\/[^\s"']+\.r2\.dev[^\s"']*/i

/**
 * D1: try create → if already exists, fetch ID via `d1 info --json`.
 * --cwd /tmp prevents EPERM on node_modules/.cache.
 * Parse "uuid" key directly — avoids JSON.parse failing on EPERM error object in output.
 */
function d1CreateOrFetch(dbName) {
  // Helper: extract UUID from "uuid": "..." anywhere in the output
  const extractUuid = (text) => {
    const m = text.match(/"uuid"\s*:\s*"([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})"/i)
    return m?.[1] ?? null
  }

  // Try create
  const createRes = wrangler(['d1', 'create', dbName], { ignoreError: true })
  const createdUuid = extractUuid(createRes.out)
  if (createdUuid) return { id: createdUuid, created: true }

  // Fallback: d1 info --json --cwd /tmp
  // --cwd /tmp: wrangler looks in /tmp for node_modules → no EPERM crash
  // --json: outputs { "uuid": "...", "name": "...", ... } to stdout
  const infoRes = wrangler(['d1', 'info', dbName, '--json', '--cwd', '/tmp'], { ignoreError: true })
  const infoUuid = extractUuid(infoRes.out)
  if (infoUuid) return { id: infoUuid, created: false }

  throw new Error(
    `Could not get UUID for D1 database "${dbName}".\n` +
      `Run manually: wrangler d1 info ${dbName} --json`,
  )
}


/**
 * R2 public URL: try enable → if already enabled, try get.
 */
function r2DevUrl(bucket) {
  const { out: enableOut } = wrangler(
    ['r2', 'bucket', 'dev-url', 'enable', bucket],
    { ignoreError: true },
  )
  const fromEnable = enableOut.match(R2_URL_RE)
  if (fromEnable) return { url: fromEnable[0].replace(/[.,;:]+$/, ''), created: true }

  const { out: getOut } = wrangler(
    ['r2', 'bucket', 'dev-url', 'get', bucket],
    { ignoreError: true },
  )
  const fromGet = getOut.match(R2_URL_RE)
  if (fromGet) return { url: fromGet[0].replace(/[.,;:]+$/, ''), created: false }

  throw new Error(
    `Could not get r2.dev URL for bucket "${bucket}".\n` +
    `Run: wrangler r2 bucket dev-url enable ${bucket}`,
  )
}

// ─── guard: overwrite ─────────────────────────────────────────────────────────
if (existsSync(outputPath)) {
  const ok = await confirm({
    message: chalk.yellow(`⚠  ${opts.output} already exists. Overwrite?`),
    default: false,
  })
  if (!ok) {
    console.log(chalk.red('Aborted.'))
    process.exit(0)
  }
}

// ─── intro ────────────────────────────────────────────────────────────────────
console.log(chalk.bold('\n🚀  Wrangler Setup Wizard\n'))
console.log(
  chalk.dim(
    '  This wizard will CREATE Cloudflare resources and write wrangler.jsonc.\n' +
    '  Make sure you are already logged in: wrangler login\n',
  ),
)

// ─── 1. Collect inputs ────────────────────────────────────────────────────────
section('Worker')
const workerName = await input({
  message: 'Worker name',
  default: 'cms-fullstack',
  validate: (v) => (v.trim() ? true : 'Required'),
})

section('D1 Database')
const databaseName = await input({
  message: 'Database name  (binding = DB)',
  default: 'cms',
  validate: (v) => (v.trim() ? true : 'Required'),
})

section('R2 Bucket')
const bucketName = await input({
  message: 'Bucket name  (binding = STORAGE, public URL will be enabled)',
  default: 'cms',
  validate: (v) => (v.trim() ? true : 'Required'),
})

section('Secrets & Variables')
const jwtSecret = await password({
  message: 'JWT_SECRET  (hidden, min 32 chars)',
  validate: (v) => (v.trim().length >= 32 ? true : 'Must be at least 32 characters'),
})

// Write .dev.vars immediately after secret is captured
const devVarsPath = resolve(process.cwd(), '.dev.vars')
writeFileSync(devVarsPath, `JWT_SECRET=${jwtSecret.trim()}\n`, 'utf-8')
console.log('  ' + chalk.green('✓') + chalk.dim('  .dev.vars written'))

const environment = await input({
  message: 'ENVIRONMENT',
  default: 'production',
})

// ─── 2. Confirm ───────────────────────────────────────────────────────────────
console.log(chalk.bold('\n  Resources that will be created on Cloudflare:'))
console.log(`    D1:  ${chalk.cyan(databaseName)}`)
console.log(`    R2:  ${chalk.cyan(bucketName)}  ${chalk.dim('(public r2.dev URL enabled)')}`)

const proceed = await confirm({ message: '\nProceed?', default: true })
if (!proceed) {
  console.log(chalk.red('Aborted.'))
  process.exit(0)
}

console.log('')

// ─── 3. Create / fetch resources ──────────────────────────────────────────────

// 3a. D1
const { id: databaseId, created: d1Created } = await step(
  `D1 database "${databaseName}"`,
  () => d1CreateOrFetch(databaseName),
)
if (!d1Created) console.log(chalk.dim(`       └─ already exists, fetched existing ID`))

// 3b. R2 bucket
await step(`R2 bucket "${bucketName}"`, () => {
  wrangler(['r2', 'bucket', 'create', bucketName], { ignoreError: true })
})

// 3c. R2 public URL
const { url: r2PublicUrl, created: r2UrlCreated } = await step(
  `R2 public URL for "${bucketName}"`,
  () => r2DevUrl(bucketName),
)
if (!r2UrlCreated) console.log(chalk.dim(`       └─ already enabled, fetched existing URL`))

// ─── 4. Write wrangler.jsonc ──────────────────────────────────────────────────
const config = {
  $schema: 'node_modules/wrangler/config-schema.json',
  name: workerName,
  compatibility_date: '2025-04-04',
  main: './workers/app.ts',
  d1_databases: [
    {
      binding: 'DB',
      database_name: databaseName,
      database_id: databaseId,
      migrations_dir: 'migrations',
    },
  ],
  r2_buckets: [
    {
      binding: 'STORAGE',
      bucket_name: bucketName,
    },
  ],
  observability: {
    enabled: true,
    head_sampling_rate: 1,
  },
  vars: {
    VALUE_FROM_CLOUDFLARE: 'Hello from Cloudflare',
    ENVIRONMENT: environment,
    R2_PUBLIC_URL: r2PublicUrl,
  },
  compatibility_flags: ['nodejs_compat'],
  unsafe: {
    bindings: [
      {
        name: 'API_RATE_LIMITER',
        type: 'ratelimit',
        namespace_id: '1000',
        simple: { limit: 100, period: 60 },
      },
      {
        name: 'FREE_USER_RATE_LIMITER',
        type: 'ratelimit',
        namespace_id: '1001',
        simple: { limit: 100, period: 60 },
      },
      {
        name: 'PAID_USER_RATE_LIMITER',
        type: 'ratelimit',
        namespace_id: '1002',
        simple: { limit: 1000, period: 60 },
      },
    ],
  },
}

writeFileSync(outputPath, JSON.stringify(config, null, 2) + '\n', 'utf-8')

// Update package.json: name + d1 migration scripts
const pkgPath = resolve(process.cwd(), 'package.json')
const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'))
pkg.name = workerName
pkg.scripts['db:apply:local'] = `wrangler d1 migrations apply ${databaseName}`
pkg.scripts['db:apply:remote'] = `wrangler d1 migrations apply ${databaseName} --remote`
writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf-8')

// Set JWT_SECRET as a Cloudflare secret (not stored in wrangler.jsonc)
await step('Setting JWT_SECRET as Cloudflare secret', () => {
  const res = spawnSync('wrangler', ['secret', 'put', 'JWT_SECRET'], {
    encoding: 'utf-8',
    cwd: process.cwd(),
    stdio: ['pipe', 'pipe', 'pipe'],
    input: jwtSecret.trim(),
    env: { ...process.env, WRANGLER_SEND_METRICS: 'false', CI: 'true' },
  })
  const out = (res.stdout ?? '') + (res.stderr ?? '')
  if (res.status !== 0 && !out.includes('Success')) {
    throw new Error(out.trim() || 'wrangler secret put failed')
  }
})

console.log('\n' + chalk.green.bold(`✅  ${opts.output} written successfully!\n`))
console.log(`  ${chalk.dim('D1 database_id:')}  ${chalk.white(databaseId)}`)
console.log(`  ${chalk.dim('R2 public URL: ')}  ${chalk.white(r2PublicUrl)}`)
console.log(`  ${chalk.dim('JWT_SECRET:    ')}  ${chalk.white('set as Cloudflare secret ✓')}`)
console.log(`  ${chalk.dim('package.json:  ')}  ${chalk.white(`name → "${workerName}"`)}`)
console.log(
  chalk.dim(`\nNext steps:\n  npm run cf-typegen\n  npm run db:apply:remote\n  npm run deploy\n`),
)

