#!/usr/bin/env node
/**
 * Layer B — renderer review smoke (icon exports + optional full module load).
 *
 * Default: verify @icon-park/react (and heroicons) named exports in changed files — fast, catches white-screen icon bugs.
 * --full-module: additionally bun-import each changed renderer file (slow; 60s timeout per file).
 *
 * Usage:
 *   node scripts/review/smoke-renderer-imports.mjs --file path/to/Component.tsx
 *   node scripts/review/smoke-renderer-imports.mjs --git-diff
 *   node scripts/review/smoke-renderer-imports.mjs --git-diff --full-module
 *
 * Env: AIONUI_SRC (default D:/Projects/aionui-src)
 */
import { execSync, spawnSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { pathToFileURL } from 'node:url';

const AIONUI_SRC = process.env.AIONUI_SRC || 'D:/Projects/aionui-src';
const MODULE_TIMEOUT_MS = Number(process.env.SMOKE_MODULE_TIMEOUT_MS || 60_000);
const ICON_TIMEOUT_MS = Number(process.env.SMOKE_ICON_TIMEOUT_MS || 60_000);

const ICON_PACKAGES = ['@icon-park/react', '@heroicons/react/24/outline', '@heroicons/react/24/solid'];

function log(msg) {
  console.log(`[smoke-renderer] ${msg}`);
}

function fail(msg) {
  console.error(`[smoke-renderer] FAIL: ${msg}`);
  process.exitCode = 1;
}

function parseArgs(argv) {
  const opts = { files: [], gitDiff: false, base: 'HEAD', fullModule: false };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--git-diff') opts.gitDiff = true;
    else if (arg === '--full-module') opts.fullModule = true;
    else if (arg === '--base') opts.base = argv[++i] || 'HEAD';
    else if (arg === '--file') opts.files.push(argv[++i]);
    else if (!arg.startsWith('-')) opts.files.push(arg);
  }
  return opts;
}

function gitChangedRendererFiles(base) {
  const repoRoot = path.resolve(AIONUI_SRC);
  let out = '';
  try {
    out = execSync(`git diff --name-only ${base} -- "packages/desktop/src/renderer"`, {
      cwd: repoRoot,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    }).trim();
  } catch {
    try {
      out = execSync('git diff --name-only HEAD -- "packages/desktop/src/renderer"', {
        cwd: repoRoot,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
      }).trim();
    } catch {
      return [];
    }
  }
  return out
    .split(/\r?\n/)
    .filter((f) => f.endsWith('.tsx') || f.endsWith('.ts'))
    .map((f) => path.join(repoRoot, f));
}

function extractNamedImports(content, pkg) {
  const names = new Set();
  for (const quote of ["'", '"']) {
    const fromPat = `from ${quote}${pkg}${quote}`;
    let searchFrom = 0;
    while (searchFrom < content.length) {
      const fromIdx = content.indexOf(fromPat, searchFrom);
      if (fromIdx === -1) break;
      const importIdx = content.lastIndexOf('import {', fromIdx);
      if (importIdx !== -1) {
        const braceStart = importIdx + 'import {'.length;
        const braceEnd = content.lastIndexOf('}', fromIdx);
        if (braceEnd > braceStart) {
          const block = content.slice(braceStart, braceEnd);
          for (const part of block.split(',')) {
            const trimmed = part.trim();
            if (!trimmed || trimmed.startsWith('type ')) continue;
            const name = trimmed.replace(/^type\s+/, '').split(/\s+as\s+/)[0].trim();
            if (name) names.add(name);
          }
        }
      }
      searchFrom = fromIdx + fromPat.length;
    }
  }
  return [...names];
}

function bunRunScript(script, cwd, timeoutMs) {
  return spawnSync('bun', ['-e', script], {
    cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    timeout: timeoutMs,
  });
}

function verifyIconExports(filePath, content) {
  let ok = true;
  for (const pkg of ICON_PACKAGES) {
    const names = extractNamedImports(content, pkg);
    if (names.length === 0) continue;
    log(`icons in ${path.basename(filePath)} from ${pkg}: ${names.join(', ')}`);
    const importList = names.join(', ');
    const checks = names.map((n) => `if (typeof ${n} === 'undefined') throw new Error('missing ${n}');`).join(' ');
    const script = `import { ${importList} } from '${pkg}'; ${checks} console.log('ok ${names.join(' ')}');`;
    const result = bunRunScript(script, AIONUI_SRC, ICON_TIMEOUT_MS);
    if (result.status !== 0) {
      ok = false;
      const err = result.stderr || result.stdout || (result.error && result.error.message) || 'unknown';
      fail(`${pkg} export(s) missing in ${path.basename(filePath)}: ${names.join(', ')}\n${err}`);
    }
  }
  return ok;
}

function smokeImportFile(absPath) {
  if (!existsSync(absPath)) {
    fail(`file not found: ${absPath}`);
    return false;
  }
  const normalized = absPath.replace(/\\/g, '/');
  if (!normalized.includes('/packages/desktop/src/renderer/')) {
    log(`skip (not under renderer): ${absPath}`);
    return true;
  }
  const content = readFileSync(absPath, 'utf8');
  const iconsOk = verifyIconExports(absPath, content);
  return iconsOk;
}

function smokeFullModule(absPath) {
  const relFromAionui = path.relative(AIONUI_SRC, absPath).replace(/\\/g, '/');
  const fileUrl = pathToFileURL(absPath).href;
  log(`full module smoke (${MODULE_TIMEOUT_MS}ms max): ${relFromAionui}`);
  const script = `import '${fileUrl}'; console.log('OK ${relFromAionui}');`;
  const result = bunRunScript(script, AIONUI_SRC, MODULE_TIMEOUT_MS);
  if (result.status !== 0) {
    const err = result.stderr || result.stdout || (result.error && result.error.message) || 'unknown';
    fail(`module import failed: ${relFromAionui}\n${err}`);
    return false;
  }
  return true;
}

function main() {
  const opts = parseArgs(process.argv.slice(2));
  let files = opts.files.map((f) => path.resolve(f));

  if (opts.gitDiff) {
    const fromGit = gitChangedRendererFiles(opts.base);
    files = [...new Set([...files, ...fromGit])];
    log(`git-diff (${opts.base}): ${fromGit.length} renderer file(s)`);
  }

  if (opts.gitDiff && files.length === 0) {
    fail(`git-diff (${opts.base}): no changed renderer .ts/.tsx files`);
    process.exit(1);
  }

  if (files.length === 0) {
    log('no files — pass --file <path> or --git-diff');
    process.exit(0);
  }

  if (!existsSync(path.join(AIONUI_SRC, 'package.json'))) {
    fail(`AIONUI_SRC invalid: ${AIONUI_SRC}`);
    return;
  }

  let allOk = true;
  for (const file of files) {
    if (!smokeImportFile(file)) allOk = false;
    if (opts.fullModule && allOk) {
      if (!smokeFullModule(file)) allOk = false;
    }
  }

  if (allOk) {
    log(`PASS (${files.length} file(s), mode=${opts.fullModule ? 'icons+full-module' : 'icons-only'})`);
    process.exit(0);
  }
  process.exit(1);
}

main();
