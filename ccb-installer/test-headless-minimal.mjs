import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const install = "D:\\CCB-Wanding";
const configDir = path.join(os.tmpdir(), "ccb-headless-minimal", ".claude");
fs.mkdirSync(configDir, { recursive: true });
const realSettings = JSON.parse(
  fs.readFileSync(path.join(os.homedir(), "AppData/Local/CCB-Wanding", ".claude", "settings.json"), "utf8").replace(/^\uFEFF/, "")
);
fs.writeFileSync(
  path.join(configDir, "settings.json"),
  JSON.stringify({ env: realSettings.env, model: "minimax-m3", mcpServers: {} }, null, 2)
);

const vendorPath = [
  path.join(install, "vendor", "bun"),
  path.join(install, "vendor", "ripgrep"),
  path.join(install, "vendor", "git", "bin"),
].join(path.delimiter);

const dbg = path.join(os.tmpdir(), "ccb-headless-minimal.log");
fs.rmSync(dbg, { force: true });

const env = {
  ...process.env,
  CLAUDE_CONFIG_DIR: configDir,
  ANTHROPIC_BASE_URL: realSettings.env.ANTHROPIC_BASE_URL,
  ANTHROPIC_AUTH_TOKEN: realSettings.env.ANTHROPIC_AUTH_TOKEN,
  ANTHROPIC_API_KEY: realSettings.env.ANTHROPIC_AUTH_TOKEN,
  CLAUDE_CODE_DISABLE_FAST_MODE: "1",
  CLAUDE_CODE_ENABLE_TELEMETRY: "0",
  NODE_TLS_REJECT_UNAUTHORIZED: "0",
  ENABLE_AUTOUPDATE_PLUGINS: "0",
  CLAUDE_CODE_ENTRYPOINT: "sdk-ts",
  CCB_WANDING_SKIP_GROVE: "1",
  CLAUDE_CODE_DISABLE_GIT_INSTRUCTIONS: "1",
  PATH: `${vendorPath}${path.delimiter}${process.env.PATH ?? ""}`,
};

const child = spawn(
  path.join(install, "vendor", "bun", "bun.exe"),
  [
    path.join(install, "dist", "cli.js"),
    "-p", "2+2",
    "--model", "minimax-m3",
    "--output-format", "stream-json",
    "--verbose",
    "--setting-sources", "user",
    "--permission-mode", "bypassPermissions",
    "--debug-file", dbg,
    "--debug", "api",
  ],
  { cwd: install, env, stdio: ["ignore", "pipe", "pipe"] }
);

let stdout = "";
child.stdout.on("data", (d) => { stdout += d; });
child.stderr.on("data", (d) => process.stderr.write(d));

setTimeout(() => child.kill("SIGTERM"), 90000);
child.on("close", (code) => {
  console.log("exit", code, "stdout bytes", stdout.length);
  if (stdout) {
    for (const line of stdout.trim().split("\n").slice(0, 8)) {
      try { console.log(JSON.parse(line).type, JSON.parse(line).subtype ?? ""); }
      catch { console.log(line.slice(0, 100)); }
    }
  }
  if (fs.existsSync(dbg)) {
    const markers = fs.readFileSync(dbg, "utf8").split("\n").filter((l) =>
      /API:request|runHeadless|before_runHeadless|Bootstrap|auto-mode|MCP/i.test(l)
    );
    console.log("markers:\n" + markers.slice(-20).join("\n"));
  }
});
