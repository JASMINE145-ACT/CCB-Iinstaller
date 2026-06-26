import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const install = "D:\\CCB-Wanding";
const configDir = path.join(os.homedir(), "AppData", "Local", "CCB-Wanding", ".claude");
const settings = JSON.parse(
  fs.readFileSync(path.join(configDir, "settings.json"), "utf8").replace(/^\uFEFF/, "")
);

const vendorPath = [
  path.join(install, "vendor", "bun"),
  path.join(install, "vendor", "ripgrep"),
  path.join(install, "vendor", "git", "bin"),
].join(path.delimiter);

const env = {
  ...process.env,
  CLAUDE_CONFIG_DIR: configDir,
  ANTHROPIC_BASE_URL: settings.env.ANTHROPIC_BASE_URL,
  ANTHROPIC_AUTH_TOKEN: settings.env.ANTHROPIC_AUTH_TOKEN,
  ANTHROPIC_API_KEY: settings.env.ANTHROPIC_AUTH_TOKEN,
  CLAUDE_CODE_DISABLE_FAST_MODE: "1",
  CLAUDE_CODE_ENABLE_TELEMETRY: "0",
  NODE_TLS_REJECT_UNAUTHORIZED: "0",
  ENABLE_AUTOUPDATE_PLUGINS: "0",
  PATH: `${vendorPath}${path.delimiter}${process.env.PATH ?? ""}`,
};

const dbg = path.join(os.tmpdir(), "ccb-headless-native.log");
fs.rmSync(dbg, { force: true });

const bun = path.join(install, "vendor", "bun", "bun.exe");
const cli = path.join(install, "dist", "cli.js");

const child = spawn(
  bun,
  [
    cli,
    "-p",
    "2+2",
    "--model",
    "minimax-m3",
    "--bare",
    "--setting-sources",
    "user",
    "--permission-mode",
    "bypassPermissions",
    "--debug-file",
    dbg,
    "--debug",
    "api",
  ],
  { cwd: install, env, stdio: ["ignore", "pipe", "pipe"] }
);

let stdout = "";
let stderr = "";
child.stdout.on("data", (d) => { stdout += d; });
child.stderr.on("data", (d) => { stderr += d; });

const timeoutMs = 120000;
const timer = setTimeout(() => {
  child.kill("SIGTERM");
  console.log("RESULT: TIMEOUT");
  dump();
  process.exit(1);
}, timeoutMs);

child.on("close", (code) => {
  clearTimeout(timer);
  console.log("EXIT:", code);
  console.log("STDOUT:", stdout.slice(0, 500));
  if (stderr) console.log("STDERR:", stderr.slice(-500));
  dump();
  process.exit(code === 0 && stdout.trim() ? 0 : 1);
});

function dump() {
  if (!fs.existsSync(dbg)) return;
  const lines = fs.readFileSync(dbg, "utf8").split("\n");
  const markers = lines.filter((l) =>
    /Bootstrap|runHeadless|API:request|auto-mode|Skipped|before_runHeadless|after_grove|ERROR|plugin/i.test(l)
  );
  console.log("DEBUG markers:", markers.slice(-20).join("\n"));
}
