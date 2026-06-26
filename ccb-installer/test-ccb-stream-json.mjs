#!/usr/bin/env node
/**
 * Smoke test: CCB-Wanding stream-json (ACP transport path).
 * Usage: node test-ccb-stream-json.mjs
 */
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const install = "D:\\CCB-Wanding";
const bun = path.join(install, "vendor", "bun", "bun.exe");
const cli = path.join(install, "dist", "cli.js");
const configDir = path.join(os.homedir(), "AppData", "Local", "CCB-Wanding", ".claude");
const settingsRaw = fs.readFileSync(path.join(configDir, "settings.json"), "utf8").replace(/^\uFEFF/, "");
const settings = JSON.parse(settingsRaw);

const minimalDir = path.join(os.tmpdir(), "ccb-minimal-settings");
fs.mkdirSync(minimalDir, { recursive: true });
const minimalSettings = {
  env: settings.env,
  model: "minimax-m3",
  mcpServers: {},
};
const minimalConfig = path.join(minimalDir, ".claude");
fs.mkdirSync(minimalConfig, { recursive: true });
fs.writeFileSync(path.join(minimalConfig, "settings.json"), JSON.stringify(minimalSettings, null, 2));

const vendorPath = [
  path.join(install, "vendor", "bun"),
  path.join(install, "vendor", "ripgrep"),
  path.join(install, "vendor", "git", "bin"),
].join(path.delimiter);

const env = {
  ...process.env,
  CLAUDE_CONFIG_DIR: minimalConfig,
  ANTHROPIC_BASE_URL: settings.env.ANTHROPIC_BASE_URL,
  ANTHROPIC_AUTH_TOKEN: settings.env.ANTHROPIC_AUTH_TOKEN,
  ANTHROPIC_API_KEY: settings.env.ANTHROPIC_AUTH_TOKEN,
  CLAUDE_CODE_ENABLE_TELEMETRY: "0",
  NODE_TLS_REJECT_UNAUTHORIZED: "0",
  ENABLE_SEARCH_EXTRA_TOOLS: "0",
  CCB_WANDING_ACP_INCLUDE_QUOTATION: "0",
  PATH: `${vendorPath}${path.delimiter}${process.env.PATH ?? ""}`,
};

const timeoutMs = 90000;
let stdout = "";
let stderr = "";
env.CLAUDE_CODE_ENTRYPOINT = "sdk-ts";

const child = spawn(bun, [
  cli,
  "-p", "Reply with exactly: OK",
  "--model", "minimax-m3",
  "--output-format", "stream-json",
  "--verbose",
  "--setting-sources", "user",
], {
  cwd: os.tmpdir(),
  env,
  stdio: ["ignore", "pipe", "pipe"],
});

child.stdout.on("data", (d) => { stdout += d; });
child.stderr.on("data", (d) => { stderr += d; });

const timer = setTimeout(() => {
  child.kill("SIGTERM");
  console.log("RESULT: TIMEOUT");
  console.log("STDOUT tail:", stdout.slice(-2000));
  console.log("STDERR tail:", stderr.slice(-1000));
  process.exit(1);
}, timeoutMs);

child.on("close", (code) => {
  clearTimeout(timer);
  console.log("EXIT:", code);
  const lines = stdout.trim().split("\n").filter(Boolean);
  console.log("LINES:", lines.length);
  for (const line of lines.slice(0, 15)) {
    try {
      const j = JSON.parse(line);
      console.log("MSG:", j.type, j.subtype ?? "", JSON.stringify(j).slice(0, 120));
    } catch {
      console.log("RAW:", line.slice(0, 120));
    }
  }
  const hasAssistant = lines.some((l) => {
    try { return JSON.parse(l).type === "assistant"; } catch { return false; }
  });
  const hasResult = lines.some((l) => {
    try { return JSON.parse(l).type === "result"; } catch { return false; }
  });
  console.log("has assistant:", hasAssistant, "has result:", hasResult);
  if (stderr) console.log("STDERR:", stderr.slice(-800));
  process.exit(hasAssistant || hasResult ? 0 : 1);
});
