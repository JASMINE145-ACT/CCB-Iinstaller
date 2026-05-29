#!/usr/bin/env bun
/**
 * Extract unique slash command description literals from chunk-xg5k46jr.js
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const chunkPath = join(scriptDir, "..", "dist", "chunk-xg5k46jr.js");
const content = readFileSync(chunkPath, "utf8");

const literals = new Set();

// description: "..."
for (const m of content.matchAll(/description: "((?:\\.|[^"\\])*)"/g)) {
  literals.add(m[1]);
}

// description: `...`
for (const m of content.matchAll(/description: `((?:\\.|[^`\\])*)`/g)) {
  literals.add(m[1]);
}

// ternary description strings in login etc.
for (const m of content.matchAll(/description: [^,\n]+ \? "((?:\\.|[^"\\])*)" : "((?:\\.|[^"\\])*)"/g)) {
  literals.add(m[1]);
  literals.add(m[2]);
}

// get description() { return `...`; }
for (const m of content.matchAll(/get description\(\) \{\s*return `((?:\\.|[^`\\])*)`;/g)) {
  literals.add(m[1]);
}

const sorted = [...literals].sort();
writeFileSync(join(scriptDir, "slash-description-literals.json"), JSON.stringify(sorted, null, 2), "utf8");
console.log(`Unique description literals: ${sorted.length}`);
for (const s of sorted) console.log(s);
