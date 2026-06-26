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

const dbg = path.join(os.tmpdir(), "ccb-stream-test.log");
fs.rmSync(dbg, { force: true });

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
  CLAUDE_CODE_ENTRYPOINT: "sdk-ts",
  PATH: `${vendorPath}${path.delimiter}${process.env.PATH ?? ""}`,
};

const cases = [
  {
    name: "stream-json-bare",
    args: ["-p", "Reply OK", "--model", "minimax-m3", "--bare", "--output-format", "stream-json", "--verbose", "--setting-sources", "user", "--permission-mode", "bypassPermissions", "--debug-file", dbg, "--debug", "api"],
  },
  {
    name: "stream-json-full",
    args: ["-p", "Reply OK", "--model", "minimax-m3", "--output-format", "stream-json", "--verbose", "--setting-sources", "user", "--permission-mode", "bypassPermissions", "--debug-file", dbg, "--debug", "api"],
  },
];

for (const tc of cases) {
  console.log("\n===", tc.name, "===");
  await run(tc.args);
}

function run(args) {
  return new Promise((resolve) => {
    let stdout = "";
    let stderr = "";
    const child = spawn(path.join(install, "vendor", "bun", "bun.exe"), [path.join(install, "dist", "cli.js"), ...args], {
      cwd: install,
      env,
      stdio: ["ignore", "pipe", "pipe"],
    });
    child.stdout.on("data", (d) => { stdout += d; });
    child.stderr.on("data", (d) => { stderr += d; });
    const timer = setTimeout(() => {
      child.kill("SIGTERM");
      console.log("TIMEOUT");
      finish(-1);
    }, 90000);
    child.on("close", (code) => {
      clearTimeout(timer);
      console.log("exit", code, "stdout bytes", stdout.length, "stderr bytes", stderr.length);
      if (stdout) console.log("stdout tail:", stdout.slice(-500));
      if (stderr) console.log("stderr tail:", stderr.slice(-300));
      finish(code);
    });
    function finish(code) {
      if (fs.existsSync(dbg)) {
        const markers = fs.readFileSync(dbg, "utf8").split("\n").filter((l) =>
          /runHeadless|API:request|Bootstrap|auto-mode|before_print|action_handler|Skipped/i.test(l)
        );
        console.log("debug markers:", markers.slice(-12).join("\n"));
      }
      resolve(code);
    }
  });
}
