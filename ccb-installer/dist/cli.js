#!/usr/bin/env bun
// @bun
import {
  init_envUtils,
  isEnvTruthy
} from "./chunk-hxhwzgnn.js";
import"./chunk-qx8z601m.js";
import"./chunk-cgm6758j.js";
import {
  __require
} from "./chunk-qp2qdcda.js";

// src/entrypoints/cli.tsx
init_envUtils();
if (typeof globalThis.MACRO === "undefined") {
  globalThis.MACRO = {
    VERSION: process.env.CLAUDE_CODE_VERSION || "2.1.888",
    BUILD_TIME: new Date().toISOString(),
    FEEDBACK_CHANNEL: "",
    ISSUES_EXPLAINER: "",
    NATIVE_PACKAGE_URL: "",
    PACKAGE_URL: "",
    VERSION_CHANGELOG: ""
  };
}
if (isEnvTruthy(process.env.CLAUDE_CODE_FORCE_INTERACTIVE)) {
  for (const stream of [process.stdin, process.stdout, process.stderr]) {
    if (!stream.isTTY) {
      try {
        Object.defineProperty(stream, "isTTY", {
          value: true,
          configurable: true
        });
      } catch {}
    }
  }
}
process.env.COREPACK_ENABLE_AUTO_PIN = "0";
if (process.env.CLAUDE_CODE_REMOTE === "true") {
  const existing = process.env.NODE_OPTIONS || "";
  process.env.NODE_OPTIONS = existing ? `${existing} --max-old-space-size=8192` : "--max-old-space-size=8192";
}
if (false) {}
async function main() {
  const args = process.argv.slice(2);
  if (args.length === 1 && (args[0] === "--version" || args[0] === "-v" || args[0] === "-V")) {
    console.log(`${"2.1.888"} (Claude Code)`);
    return;
  }
  const { profileCheckpoint } = await import("./chunk-k7ee7bfx.js");
  profileCheckpoint("cli_entry");
  if (false) {}
  if (process.argv[2] === "--claude-in-chrome-mcp") {
    profileCheckpoint("cli_claude_in_chrome_mcp_path");
    const { runClaudeInChromeMcpServer } = await import("./chunk-nx9qjbh5.js");
    await runClaudeInChromeMcpServer();
    return;
  } else if (process.argv[2] === "--chrome-native-host") {
    profileCheckpoint("cli_chrome_native_host_path");
    const { runChromeNativeHost } = await import("./chunk-cstkqpd5.js");
    await runChromeNativeHost();
    return;
  } else if (process.argv[2] === "--computer-use-mcp") {
    profileCheckpoint("cli_computer_use_mcp_path");
    const { runComputerUseMcpServer } = await import("./chunk-b8902dny.js");
    await runComputerUseMcpServer();
    return;
  }
  if (process.argv[2] === "--acp") {
    profileCheckpoint("cli_acp_path");
    const { runAcpAgent } = await import("./chunk-wv0vyew1.js");
    await runAcpAgent();
    return;
  }
  if (args[0] === "--daemon-worker" || args[0]?.startsWith("--daemon-worker=")) {
    const kind = args[0] === "--daemon-worker" ? args[1] : args[0].split("=")[1];
    const { runDaemonWorker } = await import("./chunk-6qwez3dd.js");
    await runDaemonWorker(kind);
    return;
  }
  if (false) {}
  if (args[0] === "daemon") {
    profileCheckpoint("cli_daemon_path");
    const { enableConfigs } = await import("./chunk-bykhha8t.js");
    enableConfigs();
    const { setShellIfWindows } = await import("./chunk-6356tyx5.js");
    setShellIfWindows();
    const { initSinks } = await import("./chunk-8tpz0j0s.js");
    initSinks();
    const { daemonMain } = await import("./chunk-8h7bg6q9.js");
    await daemonMain(args.slice(1));
    return;
  }
  if (args.includes("--bg") || args.includes("--background")) {
    profileCheckpoint("cli_daemon_path");
    const { enableConfigs } = await import("./chunk-bykhha8t.js");
    enableConfigs();
    const { setShellIfWindows } = await import("./chunk-6356tyx5.js");
    setShellIfWindows();
    const bg = await import("./chunk-m089kb0s.js");
    await bg.handleBgStart(args.filter((a) => a !== "--bg" && a !== "--background"));
    return;
  }
  if (args[0] === "ps" || args[0] === "logs" || args[0] === "attach" || args[0] === "kill") {
    const mapped = args[0] === "ps" ? "status" : args[0];
    console.error(`[deprecated] Use: claude daemon ${mapped}${args[1] ? " " + args[1] : ""}`);
    profileCheckpoint("cli_daemon_path");
    const { enableConfigs } = await import("./chunk-bykhha8t.js");
    enableConfigs();
    const { setShellIfWindows } = await import("./chunk-6356tyx5.js");
    setShellIfWindows();
    const { initSinks } = await import("./chunk-8tpz0j0s.js");
    initSinks();
    const { daemonMain } = await import("./chunk-8h7bg6q9.js");
    await daemonMain([args[0] === "ps" ? "status" : args[0], ...args.slice(1)]);
    return;
  }
  if (args[0] === "job") {
    profileCheckpoint("cli_templates_path");
    const { templatesMain } = await import("./chunk-h6a353s6.js");
    await templatesMain(args.slice(1));
    process.exit(0);
  }
  if (args[0] === "new" || args[0] === "list" || args[0] === "reply") {
    console.error(`[deprecated] Use: claude job ${args[0]} ${args.slice(1).join(" ")}`.trim());
    profileCheckpoint("cli_templates_path");
    const { templatesMain } = await import("./chunk-h6a353s6.js");
    await templatesMain(args);
    process.exit(0);
  }
  if (false) {}
  if (false) {}
  const hasTmuxFlag = args.includes("--tmux") || args.includes("--tmux=classic");
  if (hasTmuxFlag && (args.includes("-w") || args.includes("--worktree") || args.some((a) => a.startsWith("--worktree=")))) {
    profileCheckpoint("cli_tmux_worktree_fast_path");
    const { enableConfigs } = await import("./chunk-bykhha8t.js");
    enableConfigs();
    const { isWorktreeModeEnabled } = await import("./chunk-pwwa7s62.js");
    if (isWorktreeModeEnabled()) {
      const { execIntoTmuxWorktree } = await import("./chunk-p79mdcjm.js");
      const result = await execIntoTmuxWorktree(args);
      if (result.handled) {
        return;
      }
      if (result.error) {
        const { exitWithError } = await import("./chunk-y1784krc.js");
        exitWithError(result.error);
      }
    }
  }
  if (args.length === 1 && (args[0] === "--update" || args[0] === "--upgrade")) {
    process.argv = [process.argv[0], process.argv[1], "update"];
  }
  if (args.includes("--bare")) {
    process.env.CLAUDE_CODE_SIMPLE = "1";
  }
  const { startCapturingEarlyInput } = await import("./chunk-qtfc6wdh.js");
  startCapturingEarlyInput();
  profileCheckpoint("cli_before_main_import");
  const { main: cliMain } = await import("./chunk-ef8yfaty.js");
  profileCheckpoint("cli_after_main_import");
  await cliMain();
  profileCheckpoint("cli_after_main_complete");
}
main();
