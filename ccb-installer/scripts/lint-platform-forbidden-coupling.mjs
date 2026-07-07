#!/usr/bin/env node
/**
 * Lint platform paths for forbidden WanD / business coupling (SB-13).
 *
 * Usage:
 *   node ccb-installer/scripts/lint-platform-forbidden-coupling.mjs
 *   node ccb-installer/scripts/lint-platform-forbidden-coupling.mjs --update-baseline
 */
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  FORBIDDEN_PATTERNS,
  PLATFORM_SCAN_EXTENSIONS,
  PLATFORM_SCAN_ROOTS,
  PLATFORM_SCAN_SKIP_DIR_NAMES,
  hitKey,
  shouldSkipScanFile,
} from "./lib/platform-forbidden-patterns.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = process.env.CCB_LINT_REPO_ROOT
  ? resolve(process.env.CCB_LINT_REPO_ROOT)
  : resolve(here, "..", "..");
const baselinePath = join(
  repoRoot,
  "ccb-installer",
  "config",
  "lint",
  "platform-forbidden-coupling.baseline.json",
);

async function listFiles(root) {
  const out = [];
  async function walk(dir) {
    let entries;
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        if (PLATFORM_SCAN_SKIP_DIR_NAMES.has(entry.name)) continue;
        await walk(full);
        continue;
      }
      const ext = entry.name.slice(entry.name.lastIndexOf("."));
      if (!PLATFORM_SCAN_EXTENSIONS.has(ext)) continue;
      out.push(full);
    }
  }
  await walk(root);
  return out.sort();
}

async function scanRepo() {
  const hits = [];
  for (const rootRel of PLATFORM_SCAN_ROOTS) {
    const root = join(repoRoot, rootRel);
    const files = await listFiles(root);
    for (const file of files) {
      const rel = relative(repoRoot, file).replace(/\\/g, "/");
      if (shouldSkipScanFile(rel)) continue;
      const content = await readFile(file, "utf8");
      const lines = content.split(/\r?\n/);
      for (let i = 0; i < lines.length; i += 1) {
        const line = lines[i];
        for (const pattern of FORBIDDEN_PATTERNS) {
          if (pattern.regex.test(line)) {
            hits.push({
              file: rel,
              line: i + 1,
              patternId: pattern.id,
              text: line.trim().slice(0, 120),
            });
          }
        }
      }
    }
  }
  return hits;
}

async function loadBaseline() {
  try {
    const raw = JSON.parse(await readFile(baselinePath, "utf8"));
    return new Set(raw.entries ?? []);
  } catch {
    return new Set();
  }
}

async function main() {
  const updateBaseline = process.argv.includes("--update-baseline");
  const hits = await scanRepo();
  const entries = hits.map((h) => hitKey(h.file, h.line, h.patternId));

  if (updateBaseline) {
    const payload = {
      schemaVersion: "1.0.0",
      description:
        "Allowlisted forbidden-coupling hits in platform paths; CI fails on new hits only.",
      entries: [...new Set(entries)].sort(),
    };
    await mkdir(dirname(baselinePath), { recursive: true });
    await writeFile(baselinePath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
    console.log(
      `Updated baseline: ${payload.entries.length} entries -> ${relative(repoRoot, baselinePath)}`,
    );
    return;
  }

  const baseline = await loadBaseline();
  const novel = hits.filter(
    (h) => !baseline.has(hitKey(h.file, h.line, h.patternId)),
  );

  if (novel.length === 0) {
    console.log(
      `PASS forbidden-coupling lint: ${hits.length} known hits, 0 new violations`,
    );
    return;
  }

  console.error(
    `FAIL forbidden-coupling lint: ${novel.length} new violation(s)`,
  );
  for (const hit of novel) {
    console.error(
      `  ${hit.file}:${hit.line} [${hit.patternId}] ${hit.text}`,
    );
  }
  console.error(
    "If intentional (transition), run with --update-baseline and document in PR.",
  );
  process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
