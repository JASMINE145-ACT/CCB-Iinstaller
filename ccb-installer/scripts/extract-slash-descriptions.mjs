#!/usr/bin/env bun
/**
 * Extract slash command name + description pairs from chunk-xg5k46jr.js
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const distDir = join(scriptDir, "..", "dist");
const chunkPath = join(distDir, "chunk-xg5k46jr.js");
const content = readFileSync(chunkPath, "utf8");

const blockRe = /\/\/ src\/commands\/([^\n]+)\n[\s\S]*?name: "([^"]+)"[\s\S]*?description: ([^\n]+)/g;
const pairs = [];
const seen = new Set();

for (const m of content.matchAll(blockRe)) {
  const [, srcPath, name, descRaw] = m;
  const key = `${name}::${descRaw}`;
  if (seen.has(key)) continue;
  seen.add(key);
  pairs.push({ srcPath: srcPath.trim(), name, descriptionRaw: descRaw.trim() });
}

// Also static description: "..." near name: in command objects (fallback)
const staticRe = /name: "([^"]+)",\n\s+description: "([^"]+)"/g;
for (const m of content.matchAll(staticRe)) {
  const [, name, desc] = m;
  const key = `${name}::"${desc}"`;
  if (seen.has(key)) continue;
  seen.add(key);
  pairs.push({ srcPath: "", name, descriptionRaw: `"${desc}"` });
}

pairs.sort((a, b) => a.name.localeCompare(b.name));

const outPath = join(scriptDir, "slash-command-descriptions.json");
writeFileSync(outPath, JSON.stringify(pairs, null, 2), "utf8");

console.log(`Extracted ${pairs.length} command descriptions -> ${outPath}`);
for (const p of pairs.slice(0, 15)) {
  console.log(`${p.name}: ${p.descriptionRaw}`);
}
