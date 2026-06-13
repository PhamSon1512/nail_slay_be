#!/usr/bin/env node
// Seed script — create the first admin user in Cloudflare D1.
// Run: node scripts/seed-admin.mjs [options]

import { randomBytes, pbkdf2Sync } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { createId } from '@paralleldrive/cuid2';
import { execSync } from 'node:child_process';
import { Command } from 'commander';
import chalk from 'chalk';
import { password as promptPassword, input as promptInput, confirm as promptConfirm } from '@inquirer/prompts';

// Read database_name from wrangler.jsonc
// Use URL-based resolution — reliable regardless of cwd
const WRANGLER_PATH = new URL('../wrangler.jsonc', import.meta.url);
function readWranglerDbName() {
  try {
    const raw = readFileSync(WRANGLER_PATH, 'utf8');
    // Only strip lines where // is a standalone comment (starts after optional whitespace).
    // This avoids breaking JSON strings that contain "://" like schema URLs.
    const stripped = raw.replace(/^(\s*)\/\/.*$/gm, '');
    const json = JSON.parse(stripped);
    return json.d1_databases?.[0]?.database_name;
  } catch {
    return undefined;
  }
}

// ─── CLI definition ───────────────────────────────────────────────────────────

const program = new Command();

program
  .name('seed-admin')
  .description('Create the first admin user in Cloudflare D1')
  .option('-r, --remote', 'Target remote D1 (production)', false)
  .option('-e, --email <email>', 'Admin email (or set SEED_EMAIL env)', process.env.SEED_EMAIL)
  .option('-p, --password <password>', 'Admin password (or set SEED_PASSWORD env)', process.env.SEED_PASSWORD)
  .option('-d, --db <name>', 'D1 database name', readWranglerDbName())
  .option('-y, --yes', 'Skip confirmation when user already exists — force overwrite', false)
  .parse();

const opts = program.opts();

const IS_REMOTE = opts.remote;
let ADMIN_EMAIL = opts.email;
const DB_NAME = opts.db;
const FORCE_YES = opts.yes;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function hashPassword(pass) {
  const salt = randomBytes(16);
  const hash = pbkdf2Sync(pass, salt, 100_000, 32, 'sha256');
  return `${salt.toString('hex')}:${hash.toString('hex')}`;
}

function sqlEscape(str) {
  return str.replace(/'/g, "''");
}

/**
 * Run a wrangler d1 query silently (suppress wrangler warnings from stderr).
 * Returns parsed JSON result or null on error.
 */
function d1Query(sql) {
  const remoteFlag = IS_REMOTE ? ' --remote' : '';
  try {
    // stdio: pipe all streams — suppresses wrangler's stderr warnings from polluting the prompt UI
    const raw = execSync(
      `npx wrangler d1 execute ${DB_NAME} --json --command="${sql}"${remoteFlag}`,
      { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] },
    );
    return JSON.parse(raw)?.[0]?.results ?? [];
  } catch {
    return null;
  }
}

// ─── Header ───────────────────────────────────────────────────────────────────

console.log('');
console.log(chalk.bold('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
console.log(chalk.bold.white('  🌱 Seed Admin User'));
console.log(chalk.bold('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
console.log(
  `  ${chalk.dim('Target')} : ${IS_REMOTE ? chalk.yellow('☁️  Remote (Cloudflare D1)') : chalk.cyan('💻 Local (.wrangler/state)')}`,
);
console.log('');

// ─── Step 1: Resolve email ────────────────────────────────────────────────────

const isInteractive = process.stdin.isTTY;

if (!ADMIN_EMAIL) {
  if (!isInteractive) {
    console.error(chalk.red('❌ SEED_EMAIL is required in non-interactive mode.'));
    console.error(chalk.dim('   Use: SEED_EMAIL=<email> SEED_PASSWORD=<pass> node scripts/seed-admin.mjs\n'));
    process.exit(1);
  }

  ADMIN_EMAIL = await promptInput({
    message: 'Admin email:',
    default: 'admin@example.com',
    validate: (val) => (val.includes('@') ? true : 'Enter a valid email address'),
  });
}

// ─── Step 2: Check if user exists (right after email is known) ────────────────

let ADMIN_PASSWORD = opts.password;
let userExists = false;

{
  // Run silently — hide wrangler stderr warnings so they don't mix with prompt UI
  const rows = d1Query(`SELECT id FROM users WHERE email = '${sqlEscape(ADMIN_EMAIL)}' LIMIT 1;`);
  userExists = Array.isArray(rows) && rows.length > 0;
}

if (userExists) {
  console.log('');
  console.log(chalk.yellow(`⚠️  User ${chalk.white(ADMIN_EMAIL)} already exists.`));

  if (!isInteractive && !FORCE_YES) {
    console.error(chalk.red('   Aborting. Use --yes to force password update.\n'));
    process.exit(1);
  }

  if (!FORCE_YES) {
    const shouldOverwrite = await promptConfirm({
      message: "Overwrite this user's password?",
      default: false,
    });

    if (!shouldOverwrite) {
      console.log(chalk.dim('\n   Skipped — no changes made.\n'));
      process.exit(0);
    }
  }

  console.log('');
}

// ─── Step 3: Resolve password ─────────────────────────────────────────────────

if (!ADMIN_PASSWORD) {
  if (!isInteractive) {
    console.error(chalk.red('❌ SEED_PASSWORD is required in non-interactive mode.'));
    console.error(chalk.dim('   Use: SEED_PASSWORD=<pass> node scripts/seed-admin.mjs\n'));
    process.exit(1);
  }

  ADMIN_PASSWORD = await promptPassword({
    message: 'Admin password (min 8 chars):',
    default: 'Admin@123456',
    validate: (val) => (val.length >= 8 ? true : 'Password must be at least 8 characters'),
  });

  await promptPassword({
    message: 'Confirm password:',
    validate: (val) => (val === ADMIN_PASSWORD ? true : chalk.red('Passwords do not match')),
  });
}

// ─── Step 4: Build SQL (INSERT or UPDATE) ─────────────────────────────────────

const passwordHash = hashPassword(ADMIN_PASSWORD);
const now = Math.floor(Date.now() / 1000);
let userSql;
let newId;

// Seed base roles first — FK users.role -> roles.slug requires these to exist.
// INSERT OR IGNORE is idempotent — safe to run multiple times.
const rolesSql = [
  `INSERT OR IGNORE INTO roles (slug, name, description, created_at) VALUES ('user', 'User', 'Default role for all registered users', ${now});`,
  `INSERT OR IGNORE INTO roles (slug, name, description, created_at) VALUES ('admin', 'Admin', 'System administrator with full access', ${now});`,
].join(' ');

// Seed wildcard permission for admin — resource="*" action="*" grants full access via custom RBAC.
const adminPermId = createId();
const permSql = [
  `INSERT OR IGNORE INTO permissions (id, resource, action, description, created_at) VALUES ('${adminPermId}', '*', '*', 'Full access — admin wildcard', ${now});`,
  // role_permissions PK is (role_slug, permission_id). We need the actual id of the
  // wildcard permission, so select it first then insert — done via two separate d1Query calls.
].join(' ');

const assignAdminPermSql = [
  // Look up the wildcard permission id (may already exist from a prior run)
  // then insert into role_permissions if not already present.
  `INSERT OR IGNORE INTO role_permissions (role_slug, permission_id, created_at)`,
  `SELECT 'admin', id, ${now} FROM permissions WHERE resource = '*' AND action = '*' LIMIT 1;`,
].join(' ');

if (userExists) {
  userSql = `UPDATE users SET password = '${sqlEscape(passwordHash)}', role = 'admin', updated_at = ${now} WHERE email = '${sqlEscape(ADMIN_EMAIL)}';`;
} else {
  newId = createId();
  userSql = [
    `INSERT INTO users`,
    `  (id, email, password, first_name, last_name, full_name, role, created_at)`,
    `VALUES`,
    `  ('${sqlEscape(newId)}', '${sqlEscape(ADMIN_EMAIL)}', '${sqlEscape(passwordHash)}', 'System', 'Admin', 'System Admin', 'admin', ${now});`,
  ].join(' ');
}

// ─── Step 5: Summary + Execute ────────────────────────────────────────────────

console.log('');
console.log(`  ${chalk.dim('Email')}  : ${chalk.white(ADMIN_EMAIL)}`);
console.log(`  ${chalk.dim('Action')} : ${userExists ? chalk.yellow('Update password') : chalk.green('Create new admin')}`);
if (!userExists) console.log(`  ${chalk.dim('ID')}     : ${chalk.white(newId)}`);
console.log(`  ${chalk.dim('Pass')}   : ${chalk.dim('*'.repeat(12))}`);
console.log(chalk.bold('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
console.log('');

const remoteFlag = IS_REMOTE ? ' --remote' : '';

// Step 5a: Seed roles (idempotent, silent)
d1Query(rolesSql);

// Step 5b: Seed wildcard permission + assign to admin (idempotent, silent)
d1Query(permSql);
d1Query(assignAdminPermSql);

const cmd = `npx wrangler d1 execute ${DB_NAME} --command="${userSql}"${remoteFlag}`;

try {
  // Use inherit for final command — user should see wrangler output here
  execSync(cmd, { stdio: 'inherit' });
  console.log('');
  console.log(userExists ? chalk.green('✅ Password updated successfully!') : chalk.green('✅ Admin user created successfully!'));
  console.log(`   ${chalk.dim('Email:')} ${chalk.white(ADMIN_EMAIL)}`);
  console.log(`   ${chalk.dim('DB:')}    ${chalk.white(DB_NAME)} ${IS_REMOTE ? chalk.yellow('(remote)') : chalk.cyan('(local)')}`);
  console.log('');
} catch (err) {
  console.error('');
  console.error(chalk.red('❌ Seed failed:'), err.message);
  process.exit(1);
}
