#!/usr/bin/env node
/**
 * smoke-coverage.mjs — kiểm tra xem smoke-test.mjs đã cover hết endpoints trong OpenAPI chưa.
 *
 * Đọc /openapi từ server đang chạy, so sánh với danh sách endpoints trong smoke-test.mjs.
 * In ra những endpoint CHƯA được test → reminder để dev cập nhật smoke test.
 *
 * Usage:
 *   node scripts/smoke-coverage.mjs
 *   node scripts/smoke-coverage.mjs --url https://api.you.workers.dev
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import chalk from 'chalk';
import { Command } from 'commander';

const program = new Command();
program
  .name('smoke-coverage')
  .option('--url <url>', 'Base URL', 'http://localhost:8787')
  .parse();

const { url: BASE_URL } = program.opts();
const SMOKE_FILE = resolve(import.meta.dirname, 'smoke-test.mjs');

// ─── Fetch OpenAPI spec ───────────────────────────────────────────────────────

let spec;
try {
  const res = await fetch(`${BASE_URL}/openapi`);
  spec = await res.json();
} catch {
  console.error(chalk.red(`❌ Cannot reach ${BASE_URL}/openapi — is the server running?`));
  process.exit(1);
}

// ─── Extract all endpoints from spec ─────────────────────────────────────────

const specEndpoints = [];
for (const [rawPath, methods] of Object.entries(spec.paths ?? {})) {
  for (const method of Object.keys(methods)) {
    if (['get', 'post', 'put', 'patch', 'delete'].includes(method)) {
      // Convert OpenAPI {param} style to :param style for comparison
      const normalised = rawPath.replace(/\{([^}]+)\}/g, ':$1');
      specEndpoints.push({ method: method.toUpperCase(), path: normalised, raw: rawPath });
    }
  }
}

// ─── Extract covered endpoints from smoke-test.mjs ───────────────────────────

const smokeContent = readFileSync(SMOKE_FILE, 'utf8');

// Match: req('METHOD', '/path' or `/path/${...}`)
const covered = new Set();
const reqPattern = /req\(\s*'([A-Z]+)'\s*,\s*`?'?([/][^'`),\s]+)/g;
let m;
while ((m = reqPattern.exec(smokeContent)) !== null) {
  const method = m[1];
  // Normalise dynamic segments: /rbac/roles/${...}/permissions → /rbac/roles/:slug/permissions
  const path = m[2].replace(/\$\{[^}]+\}/g, ':param');
  covered.add(`${method} ${path}`);
}

// ─── Compare ──────────────────────────────────────────────────────────────────

console.log('');
console.log(chalk.bold('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
console.log(chalk.bold.white('  📋 Smoke Test Coverage'));
console.log(chalk.bold('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
console.log(`  ${chalk.dim('OpenAPI endpoints')} : ${chalk.white(specEndpoints.length)}`);
console.log(`  ${chalk.dim('Smoke test covers')} : ${chalk.white(covered.size)}`);
console.log('');

const missing = [];
const skipped = []; // intentionally excluded (e.g. media upload needs multipart)

const SKIP_PATTERNS = [
  /^POST \/media/, // multipart/form-data — cannot easily test in smoke script
];

for (const { method, path, raw } of specEndpoints) {
  const key = `${method} ${path}`;

  // Check if covered (exact or with :param normalization)
  const isCovered = [...covered].some((c) => {
    const [cm, cp] = c.split(' ');
    if (cm !== method) return false;
    // Match :param segments loosely
    const cRe = new RegExp('^' + cp.replace(/:[^/]+/g, '[^/]+') + '$');
    return cRe.test(path);
  });

  const isSkipped = SKIP_PATTERNS.some((re) => re.test(key));

  if (!isCovered && !isSkipped) {
    missing.push({ method, path, raw });
  } else if (isSkipped) {
    skipped.push({ method, path });
  }
}

// ─── Report ───────────────────────────────────────────────────────────────────

if (missing.length === 0) {
  console.log(chalk.green('✓ All endpoints are covered by smoke tests.'));
} else {
  console.log(chalk.yellow(`⚠  ${missing.length} endpoint(s) NOT covered in smoke-test.mjs:\n`));
  for (const { method, raw } of missing) {
    const methodColor = {
      GET: chalk.blue, POST: chalk.green, PUT: chalk.yellow,
      PATCH: chalk.cyan, DELETE: chalk.red,
    }[method] ?? chalk.white;
    console.log(`   ${methodColor(method.padEnd(7))} ${chalk.white(raw)}`);
  }
  console.log('');
  console.log(chalk.dim('  → Add these to scripts/smoke-test.mjs'));
}

if (skipped.length > 0) {
  console.log('');
  console.log(chalk.dim(`  Skipped (intentional, e.g. multipart): ${skipped.map((e) => `${e.method} ${e.path}`).join(', ')}`));
}

console.log('');
console.log(chalk.bold('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
console.log('');

process.exit(missing.length > 0 ? 1 : 0);
