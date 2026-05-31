#!/usr/bin/env bun
/**
 * Apply slash command description translations.
 * Supports both old (double-quote) and new (backtick) Vite output formats.
 */
import { readFileSync, writeFileSync, readdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const distDir = process.argv[2] ? process.argv[2] : join(scriptDir, "..", "dist");

// Support both old (dist/chunk-*.js) and new (dist/chunks/*.js) layouts
const chunksDir = existsSync(join(distDir, "chunks")) ? join(distDir, "chunks") : distDir;

const zhPath = join(scriptDir, "slash-commands-zh-by-name.json");
const zhByName = JSON.parse(readFileSync(zhPath, "utf8"));
delete zhByName._meta;

function escJsDouble(s) {
  return s.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

// Escape for backtick template literal - converts all non-ASCII to \uXXXX
// so Bun on Windows doesn't mojibake the literals
function escJsBacktick(s) {
  let out = "";
  for (const ch of s) {
    const cp = ch.codePointAt(0);
    if (cp > 127) out += "\\u" + cp.toString(16).padStart(4, "0");
    else if (ch === "\\") out += "\\\\";
    else if (ch === "`") out += "\\`";
    else out += ch;
  }
  return out;
}

function cleanupUnsafeRuntimeTemplateVars(content) {
  return content
    .replace(/。\\u8be6\\u89c1 \$\{CCR_TERMS_URL\}/g, "")
    .replace(/。\\u8be6\\u89c1 \$\{CCR_TERMS_URL2\}/g, "")
    .replace(/\\u3002\\u8be6\\u89c1 \$\{CCR_TERMS_URL\}/g, "")
    .replace(/\\u3002\\u8be6\\u89c1 \$\{CCR_TERMS_URL2\}/g, "")
    .replace(/详见 \$\{CCR_TERMS_URL\}/g, "")
    .replace(/详见 \$\{CCR_TERMS_URL2\}/g, "")
    .replace(/See \$\{CCR_TERMS_URL\}/g, "")
    .replace(/See \$\{CCR_TERMS_URL2\}/g, "")
    .replace(/\$\{CCR_TERMS_URL\}/g, "https://code.claude.com/docs/en/claude-code-on-the-web")
    .replace(/\$\{CCR_TERMS_URL2\}/g, "https://code.claude.com/docs/en/claude-code-on-the-web");
}

// Scan all chunks and patch command descriptions by name
// Handles both:
//   name: "cmd", ... description: "English text"   (old double-quote format)
//   name:`cmd`,...description:`English text`        (new backtick format)
const files = readdirSync(chunksDir).filter(f => f.endsWith(".js"));
let totalPatched = 0;
let totalFiles = 0;

for (const fname of files) {
  const fpath = join(chunksDir, fname);
  let content = readFileSync(fpath, "utf8");
  const beforeCleanup = content;
  content = cleanupUnsafeRuntimeTemplateVars(content);
  let changed = false;
  if (content !== beforeCleanup) changed = true;

  for (const [name, zh] of Object.entries(zhByName)) {
    if (typeof zh !== "string" || !zh) continue;
    const zhDouble = escJsDouble(zh);

    // Skip if already translated (contains the zh value in any form)
    const alreadyDone =
      content.includes(`"${zhDouble}"`) ||
      content.includes(`\`${zh}\``) ||
      content.includes(`\\u${zh.codePointAt(0).toString(16).padStart(4,"0")}`);

    if (alreadyDone) continue;

    // Pattern 1: name: "cmd", ... description: "English"  (old format)
    const re1 = new RegExp(
      `(name: "${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"[\\s\\S]{0,300}?description: )"([^"]*)"`,
      "m"
    );
    // Pattern 2: name:`cmd`,...description:`English`  (new format, description right after name)
    const re2 = new RegExp(
      `(name:\`${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\`[^}]{0,300}?description:)\`([^\`]*)\``,
      "m"
    );

    const m1 = content.match(re1);
    const m2 = content.match(re2);

    if (m2) {
      content = content.replace(re2, `$1\`${escJsBacktick(zh)}\``);
      changed = true;
      totalPatched++;
    } else if (m1) {
      content = content.replace(re1, `$1"${zhDouble}"`);
      changed = true;
      totalPatched++;
    }
  }

  if (changed) {
    writeFileSync(fpath, content, "utf8");
    totalFiles++;
  }
}

console.log(`[slash-i18n] patched ${totalPatched} commands across ${totalFiles} files`);

// Verify add-dir was patched (accept literal Chinese, JS-escaped, or \uXXXX form)
const allContent = files.map(f => readFileSync(join(chunksDir, f), "utf8")).join("");
const addDirZh = zhByName["add-dir"]; // "添加新的工作目录"
const addDirUnicode = [...addDirZh].map(c => "\\u" + c.codePointAt(0).toString(16).padStart(4,"0")).join("");
if (!allContent.includes(addDirZh) && !allContent.includes(escJsDouble(addDirZh)) && !allContent.includes(addDirUnicode)) {
  console.error("[slash-i18n] FAIL: add-dir description not patched");
  process.exit(2);
}
console.log("[slash-i18n] OK");
