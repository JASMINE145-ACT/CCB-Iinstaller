#!/usr/bin/env bun
/**
 * Apply slash command description translations using exact, name-scoped replacements.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const distDir = process.argv[2] ? process.argv[2] : join(scriptDir, "..", "dist");
const chunkPath = join(distDir, "chunk-xg5k46jr.js");
const efPath = join(distDir, "chunk-ef8yfaty.js");
const registryPath = join(scriptDir, "slash-commands-registry.json");
const zhPath = join(scriptDir, "slash-commands-zh-by-name.json");

const registry = JSON.parse(readFileSync(registryPath, "utf8"));
const zhByName = JSON.parse(readFileSync(zhPath, "utf8"));
delete zhByName._meta;

const BUNDLED_LITERALS = {
  "Create, update, list, or run scheduled remote agents (triggers) that execute on a cron schedule.":
    zhByName["bundled:schedule"],
  "Research and plan a large-scale change, then execute it in parallel across 5\u201330 isolated worktree agents that each open a PR.":
    zhByName["bundled:ultrawork"],
  "Automates your Chrome browser to interact with web pages - clicking elements, filling forms, capturing screenshots, reading console logs, and navigating sites. Opens pages in new tabs within your existing Chrome session. Requires site-level permissions before executing (configured in the extension).":
    zhByName["bundled:claude-in-chrome"],
  "Generate filler text for long context testing. Specify token count as argument (e.g., /lorem-ipsum 50000). Outputs approximately the requested number of tokens. Ant-only.":
    zhByName["bundled:lorem-ipsum"],
  "Review auto-memory entries and propose promotions to CLAUDE.md, CLAUDE.local.md, or shared memory. Also detects outdated, conflicting, and duplicate entries across memory layers.":
    zhByName["bundled:memory-review"],
  "Review changed code for reuse, quality, and efficiency, then fix any issues found.":
    zhByName["bundled:code-review"],
  "Capture this session's repeatable process into a skill. Call at end of the process you want to capture with an optional description.":
    zhByName["bundled:skillify"],
  "List all scheduled cron jobs in this session": zhByName["bundled:cron-list"],
  "Cancel a scheduled cron job by ID": zhByName["bundled:cron-cancel"],
  "Run a prompt or slash command on a recurring interval (e.g. /loop 5m /foo, defaults to 10m)":
    zhByName["bundled:loop"],
  "Manually trigger memory consolidation \u2014 review, organize, and prune your auto-memory files.":
    zhByName["bundled:memory-consolidate"],
};

function escRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function escJsDouble(s) {
  return s.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function replaceOnce(content, pattern, replacement) {
  const re = new RegExp(pattern, "m");
  const m = content.match(re);
  if (!m) return { content, ok: false };
  return { content: content.replace(re, replacement), ok: true };
}

function isDescriptionLocalizedAtName(content, name, zh) {
  const window = "[\\s\\S]{0,240}?";
  const z = escJsDouble(zh);
  const patterns = [
    new RegExp(`name: "${escRe(name)}",${window}description: "${escRe(z)}"`, "m"),
    new RegExp(`name: "${escRe(name)}",${window}description: \`${escRe(zh)}\``, "m"),
    new RegExp(`name: "${escRe(name)}",${window}description: "[^"]*\\\\u[0-9a-f]{4}`, "im"),
    new RegExp(`name: "${escRe(name)}",${window}description: \`[^\`]*\\\\u[0-9a-f]{4}`, "im"),
    new RegExp(`name: "${escRe(name)}",${window}get description\\(\\)[\\s\\S]{0,80}?\\\\u[0-9a-f]{4}`, "im"),
    new RegExp(`name: "${escRe(name)}",${window}description:[\\s\\S]{0,200}?\\\\u[0-9a-f]{4}`, "im"),
  ];
  return patterns.some((re) => re.test(content));
}

function patchTemplateRaw(content, name, rawEn, zh) {
  const window = "[\\s\\S]{0,240}?";
  const r = replaceOnce(
    content,
    `(name: "${escRe(name)}",${window}description: )\`${escRe(rawEn)}\``,
    `$1\`${zh}\``
  );
  return r.ok ? r.content : content;
}

function patchByName(content, name, en, zh, kind) {
  const z = escJsDouble(zh);
  const window = "[\\s\\S]{0,240}?";

  if (kind === "static") {
    const tries = [
      `(name: "${escRe(name)}",${window}description: )"${escRe(en)}"`,
      `(description: )"${escRe(en)}"(${window}name: "${escRe(name)}")`,
    ];
    for (const p of tries) {
      const r = replaceOnce(content, p, `$1"${z}"`);
      if (r.ok) return r.content;
    }
  }

  if (kind === "template") {
    const tries = [
      `(name: "${escRe(name)}",${window}description: )\`${escRe(en)}\``,
      `(description: )\`${escRe(en)}\`(${window}name: "${escRe(name)}")`,
    ];
    for (const p of tries) {
      const r = replaceOnce(content, p, `$1\`${zh}\``);
      if (r.ok) return r.content;
    }
  }

  if (kind === "getter-template") {
    const r = replaceOnce(
      content,
      `(name: "${escRe(name)}",${window}get description\\(\\) \\{\\s*return )\`${escRe(en)}\`;`,
      `$1\`${zh}\`;`
    );
    if (r.ok) return r.content;
  }

  if (kind === "getter-static") {
    const r = replaceOnce(
      content,
      `(name: "${escRe(name)}",${window}get description\\(\\) \\{\\s*return )"${escRe(en)}";`,
      `$1"${z}";`
    );
    if (r.ok) return r.content;
  }

  return content;
}

const SKIP_NAMES = new Set(["stub", "Explanatory", "claude-native-installer"]);

function isCommandDefinitionPath(srcPath) {
  if (!srcPath || srcPath.includes("validation")) return false;
  return /(?:^|\/)(index\.tsx?|gate\.tsx?|[a-z0-9-]+\.tsx?)$/i.test(srcPath);
}

let content = readFileSync(chunkPath, "utf8");
let patched = 0;
const misses = [];

for (const cmd of registry) {
  if (SKIP_NAMES.has(cmd.name)) continue;
  if (!isCommandDefinitionPath(cmd.srcPath)) continue;
  if (cmd.descriptionKind === "ternary") continue;
  if (!content.includes(`name: "${cmd.name}"`)) continue;

  const zh = zhByName[cmd.name];
  if (!zh) {
    misses.push(cmd.name);
    continue;
  }

  const before = content;
  content = patchByName(content, cmd.name, cmd.description, zh, cmd.descriptionKind);
  if (content !== before) patched++;
  else if (isDescriptionLocalizedAtName(content, cmd.name, zh)) patched++;
  else if (cmd.descriptionKind !== "ternary") misses.push(`${cmd.name}`);
}

// login ternary (factory function body)
{
  const r = replaceOnce(
    content,
    `description: hasAnthropicApiKeyAuth\\(\\) \\? "${escRe("Switch Anthropic accounts")}" : "${escRe("Sign in with your Anthropic account")}"`,
    `description: hasAnthropicApiKeyAuth() ? "${escJsDouble(zhByName["login:Switch Anthropic accounts"])}" : "${escJsDouble(zhByName["login:Sign in with your Anthropic account"])}"`
  );
  if (r.ok) {
    content = r.content;
    patched++;
  } else if (isDescriptionLocalizedAtName(content, "login", zhByName["login:Switch Anthropic accounts"])) {
    patched++;
  } else {
    misses.push("login");
  }
}

// terminal-setup ternary
{
  const r = replaceOnce(
    content,
    `description: env\\.terminal === "Apple_Terminal" \\? "${escRe("Enable Option+Enter key binding for newlines and visual bell")}" : "${escRe("Install Shift+Enter key binding for newlines")}"`,
    `description: env.terminal === "Apple_Terminal" ? "${escJsDouble(zhByName["terminal-setup:Enable Option+Enter key binding for newlines and visual bell"])}" : "${escJsDouble(zhByName["terminal-setup:Install Shift+Enter key binding for newlines"])}"`
  );
  if (r.ok) {
    content = r.content;
    patched++;
  } else if (isDescriptionLocalizedAtName(content, "terminal-setup", zhByName["terminal-setup:Install Shift+Enter key binding for newlines"])) {
    patched++;
  } else {
    misses.push("terminal-setup");
  }
}

// init getter
{
  const before = content;
  content = patchByName(
    content,
    "init",
    "Initialize a new CLAUDE.md file with codebase documentation",
    zhByName["init"],
    "getter-static"
  );
  if (content !== before) patched++;
  else if (isDescriptionLocalizedAtName(content, "init", zhByName["init"])) patched++;
  else misses.push("init");
}

// passes getter (two return strings)
if (content.includes('return "Share a free week of Claude Code with friends and earn extra usage";')) {
  content = content.replace(
    'return "Share a free week of Claude Code with friends and earn extra usage";',
    `return "${escJsDouble(zhByName["passes:reward"])}";`
  );
  patched++;
}
if (content.includes('return "Share a free week of Claude Code with friends";')) {
  content = content.replace(
    'return "Share a free week of Claude Code with friends";',
    `return "${escJsDouble(zhByName["passes:default"])}";`
  );
  patched++;
}

// extra-usage (registry misclassified; static)
{
  const before = content;
  content = patchByName(
    content,
    "extra-usage",
    "Configure extra usage to keep working when limits are hit",
    zhByName["extra-usage"],
    "static"
  );
  if (content !== before) patched++;
}

// review + ultrareview share a section; registry mis-parsed review
{
  const before = content;
  content = patchByName(content, "review", "Review a pull request", zhByName["review"], "static");
  content = patchByName(
    content,
    "ultrareview",
    "~10\u201320 min \xB7 Finds and verifies bugs in your branch. Runs in Claude Code on the web. See ${CCR_TERMS_URL}",
    zhByName["ultrareview"],
    "template"
  );
  content = patchTemplateRaw(
    content,
    "ultraplan",
    "~10\\u201330 min \\xB7 Claude Code on the web drafts an advanced plan you can edit and approve. See ${CCR_TERMS_URL2}",
    zhByName["ultraplan"]
  );
  if (content !== before) patched++;
}

// force-snip registry entry is wrong; patch explicitly
{
  const before = content;
  content = patchByName(
    content,
    "force-snip",
    "Force snip conversation history at current point",
    zhByName["force-snip"],
    "static"
  );
  if (content === before) {
    content = replaceOnce(
      content,
      `(name: "force-snip",[\\s\\S]{0,120}?description: ")[^"]*"`,
      `$1${escJsDouble(zhByName["force-snip"])}"`
    ).content;
  }
  if (content !== before) patched++;
}

writeFileSync(chunkPath, content, "utf8");

let efContent = readFileSync(efPath, "utf8");
let bundledCount = 0;
for (const [en, zh] of Object.entries(BUNDLED_LITERALS)) {
  if (!zh) continue;
  const needles = [
    `description: "${en}"`,
    `description: "${en.replace(/\u2013/g, "\\u2013").replace(/\u2014/g, "\\u2014")}"`,
  ];
  const repl = `description: "${escJsDouble(zh)}"`;
  for (const needle of needles) {
    if (efContent.includes(needle)) {
      efContent = efContent.replaceAll(needle, repl);
      bundledCount++;
      break;
    }
  }
}
writeFileSync(efPath, efContent, "utf8");

console.log(`[slash-i18n] patched commands: ${patched}`);
console.log(`[slash-i18n] bundled skills: ${bundledCount}`);
if (misses.length) console.log(`[slash-i18n] misses: ${[...new Set(misses)].join(", ")}`);

if (
  !content.includes("添加新的工作目录") &&
  !content.includes("\\u6dfb\\u52a0\\u65b0\\u7684\\u5de5\\u4f5c\\u76ee\\u5f55")
) {
  console.error("[slash-i18n] FAIL: add-dir description not patched");
  process.exit(2);
}
console.log("[slash-i18n] OK");
