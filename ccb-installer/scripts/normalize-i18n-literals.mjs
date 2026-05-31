#!/usr/bin/env bun
// normalize-i18n-literals.mjs - Convert UTF-8 CJK in JS string literals to \uXXXX escapes.
// Bun on Windows mis-parses UTF-8 literals in bundled dist/*.js files.

import fs from "fs";
import path from "path";

const distDir = process.argv[2];
if (!distDir) {
  console.error("usage: bun normalize-i18n-literals.mjs <distDir>");
  process.exit(1);
}

// New Vite builds put chunks in dist/chunks/; old builds had chunk-*.js in dist/ directly
import { existsSync } from "fs";
const chunksDir = existsSync(path.join(distDir, "chunks"))
  ? path.join(distDir, "chunks")
  : distDir;

const CJK = /[\u4e00-\u9fff\u3000-\u303f\uff00-\uffef]/;

function listTargetFiles(dir) {
  const names = new Set();
  for (const name of fs.readdirSync(dir)) {
    if (!name.endsWith(".js")) continue;
    const filePath = path.join(dir, name);
    if (CJK.test(fs.readFileSync(filePath, "utf8"))) {
      names.add(name);
    }
  }
  return [...names].sort();
}

const files = listTargetFiles(chunksDir);

function decodeJsStringInner(inner) {
  return inner
    .replace(/\\u([0-9a-fA-F]{4})/g, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/\\x([0-9a-fA-F]{2})/g, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "\r")
    .replace(/\\t/g, "\t")
    .replace(/\\"/g, '"')
    .replace(/\\'/g, "'")
    .replace(/\\\\/g, "\\");
}

function encodeJsStringInner(value) {
  let out = "";
  for (const ch of value) {
    const cp = ch.codePointAt(0);
    if (cp > 127) {
      out += "\\u" + cp.toString(16).padStart(4, "0");
    } else if (ch === "\\") {
      out += "\\\\";
    } else if (ch === '"') {
      out += '\\"';
    } else {
      out += ch;
    }
  }
  return out;
}

function needsEscape(inner) {
  if (/\\u[0-9a-fA-F]{4}/.test(inner) && !CJK.test(inner)) {
    return false;
  }
  const decoded = decodeJsStringInner(inner);
  return CJK.test(decoded);
}

function normalizeDoubleQuoted(content) {
  return content.replace(/"((?:\\.|[^"\\\r\n])*)"/g, (full, inner) => {
    if (!needsEscape(inner)) {
      return full;
    }
    const decoded = decodeJsStringInner(inner);
    return '"' + encodeJsStringInner(decoded) + '"';
  });
}

function normalizeTemplateLiteral(content) {
  // Use dotall-style matching to handle template literals with embedded newlines
  return content.replace(/`((?:\\[\s\S]|[^`\\])*)`/g, (full, inner) => {
    const parts = inner.split(/(\$\{[^}]*\})/);
    let changed = false;
    const normalized = parts.map((part) => {
      if (part.startsWith("${")) {
        return part;
      }
      if (!needsEscape(part)) {
        return part;
      }
      changed = true;
      return encodeJsStringInner(decodeJsStringInner(part));
    });
    return changed ? "`" + normalized.join("") + "`" : full;
  });
}

function normalizeFile(filePath) {
  const before = fs.readFileSync(filePath, "utf8");
  let after = before;
  for (let i = 0; i < 5; i++) {
    const next = normalizeTemplateLiteral(normalizeDoubleQuoted(after));
    if (next === after) {
      break;
    }
    after = next;
  }
  if (after !== before) {
    fs.writeFileSync(filePath, after, "utf8");
    console.log("[updated]", path.basename(filePath));
    return true;
  }
  console.log("[unchanged]", path.basename(filePath));
  return false;
}

let changedAny = false;
for (const name of files) {
  const filePath = path.join(chunksDir, name);
  if (!fs.existsSync(filePath)) {
    console.log("[skip]", name);
    continue;
  }
  if (normalizeFile(filePath)) {
    changedAny = true;
  }
}

// Final check: warn (not fail) on remaining CJK — upstream source may have intentional
// CJK in regex literals or other non-string contexts that the normalizer doesn't process.
let warned = false;
for (const name of files) {
  const filePath = path.join(chunksDir, name);
  if (!fs.existsSync(filePath)) continue;
  const remaining = fs.readFileSync(filePath, "utf8").match(/[一-鿿]/g);
  if (remaining && remaining.length > 0) {
    console.warn("[WARN] Chinese characters remain in", name, "(count:", remaining.length + ")");
    warned = true;
  }
}

console.log("[ok] i18n literals normalized" + (warned ? " (with warnings)" : ""));
process.exit(0);
