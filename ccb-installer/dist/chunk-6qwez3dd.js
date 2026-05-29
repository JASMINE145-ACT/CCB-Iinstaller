// @bun
import {
  createCapacityWake
} from "./chunk-ae76ded0.js";
import {
  buildCCRv2SdkUrl,
  buildSdkUrl,
  decodeWorkSecret,
  registerWorker,
  sameSessionId
} from "./chunk-2m6jk78c.js";
import {
  getPollIntervalConfig
} from "./chunk-k2g71742.js";
import {
  createTokenRefreshScheduler
} from "./chunk-rz3rq0gt.js";
import {
  getBootstrapArgs,
  getScriptPath,
  init_cliLaunch
} from "./chunk-r5mqktt5.js";
import {
  init_server
} from "./chunk-jdgeec04.js";
import {
  BRIDGE_LOGIN_ERROR,
  BridgeFatalError,
  DEFAULT_SESSION_TIMEOUT_MS,
  createAgentWorktree,
  createBridgeApiClient,
  getRemoteSessionUrl,
  init_bridgeApi,
  init_bridgeStatusUtil,
  init_product,
  init_types4 as init_types,
  init_worktree,
  isExpiredErrorType,
  isSuppressible403,
  removeAgentWorktree,
  validateBridgeId
} from "./chunk-xg5k46jr.js";
import {
  init_rcDebugLog,
  rcLog
} from "./chunk-b0ex2qgg.js";
import"./chunk-7qc1t27a.js";
import"./chunk-qe3qr56q.js";
import {
  getTrustedDeviceToken,
  init_trustedDevice
} from "./chunk-nd9hcjys.js";
import"./chunk-et824jj8.js";
import"./chunk-e86bxpak.js";
import"./chunk-var1et7e.js";
import"./chunk-evs14mjg.js";
import"./chunk-2gzv8nrw.js";
import"./chunk-ehtwnxpg.js";
import"./chunk-0rgqsb9t.js";
import"./chunk-c0kjpr24.js";
import"./chunk-cgfdkzhb.js";
import"./chunk-2f6hs25r.js";
import"./chunk-xnt2j152.js";
import"./chunk-sv7afh51.js";
import"./chunk-j7b884wk.js";
import"./chunk-w7xjra5m.js";
import"./chunk-zttmdag3.js";
import"./chunk-smxezvfx.js";
import"./chunk-7ac6mws7.js";
import"./chunk-ps49ymvj.js";
import {
  debugTruncate,
  describeAxiosError,
  init_debugUtils,
  init_sessionIdCompat,
  toCompatSessionId
} from "./chunk-chzfw06n.js";
import"./chunk-s2x040y6.js";
import"./chunk-t4kcvmes.js";
import"./chunk-kten1z0y.js";
import"./chunk-rdh5rbpt.js";
import"./chunk-cy1z66c2.js";
import"./chunk-51pnrq77.js";
import"./chunk-wxa2hdfg.js";
import"./chunk-4jm600zv.js";
import"./chunk-kyaxezdn.js";
import"./chunk-f57cvf1d.js";
import"./chunk-rkmwx1yz.js";
import"./chunk-cg02f0wy.js";
import"./chunk-ykr5qx9v.js";
import"./chunk-dhpmxxmx.js";
import"./chunk-yg1k879b.js";
import {
  init_datadog
} from "./chunk-435qaxw3.js";
import"./chunk-c9pb40ft.js";
import"./chunk-ad6rg8vz.js";
import"./chunk-x95fhbwq.js";
import {
  getClaudeAIOAuthTokens,
  init_auth,
  init_figures,
  init_firstPartyEventLogger,
  init_growthbook
} from "./chunk-mk2vzd2n.js";
import"./chunk-mkae8zj9.js";
import"./chunk-cxmyg49v.js";
import"./chunk-zwarn9h7.js";
import"./chunk-t16fercx.js";
import"./chunk-7hmy36fh.js";
import"./chunk-6kpbgc5w.js";
import"./chunk-d57t992t.js";
import"./chunk-64c1avct.js";
import"./chunk-0knhp7v5.js";
import {
  init_sleep,
  sleep
} from "./chunk-8g5pe1gr.js";
import"./chunk-b62vj92a.js";
import"./chunk-4cp6193g.js";
import"./chunk-8g747a8x.js";
import"./chunk-d7886r6a.js";
import"./chunk-90wp6wez.js";
import"./chunk-a8ejc632.js";
import"./chunk-f5ma3nh5.js";
import"./chunk-qz2x630m.js";
import"./chunk-c7t69jmn.js";
import"./chunk-6y2wszkc.js";
import"./chunk-3c25bcsw.js";
import"./chunk-9qh5f9r3.js";
import"./chunk-xhesahm0.js";
import"./chunk-rh5a2rg9.js";
import"./chunk-p2816w9z.js";
import"./chunk-v9smspw2.js";
import"./chunk-v1kzp02e.js";
import {
  formatDuration,
  init_format,
  truncateToWidth
} from "./chunk-padf4crh.js";
import"./chunk-crmjpsqe.js";
import {
  init_src
} from "./chunk-z9bw4q7j.js";
import"./chunk-evwb3c85.js";
import {
  init_analytics,
  logEvent
} from "./chunk-h0rbjg6x.js";
import"./chunk-0vkfrmqm.js";
import"./chunk-0xjaqda8.js";
import"./chunk-78009jh9.js";
import {
  init_diagLogs,
  logForDiagnosticsNoPII
} from "./chunk-9awawyvh.js";
import"./chunk-hqpzpr71.js";
import"./chunk-zs5b1dgr.js";
import"./chunk-hnxmafvc.js";
import"./chunk-tv74hgw9.js";
import {
  init_log,
  logError
} from "./chunk-wd8mqz95.js";
import"./chunk-8tnsngw2.js";
import"./chunk-vsbyhpfy.js";
import"./chunk-p7pj6wf8.js";
import"./chunk-5z28bqne.js";
import"./chunk-qajrkk97.js";
import {
  errorMessage,
  init_debug,
  init_errors,
  init_slowOperations,
  jsonParse,
  jsonStringify,
  logForDebugging
} from "./chunk-5khwvj1z.js";
import"./chunk-fbv4apne.js";
import"./chunk-gzp6rza1.js";
import"./chunk-50dgek10.js";
import"./chunk-7wm5s02e.js";
import"./chunk-z0csm2zq.js";
import {
  init_envUtils,
  isEnvTruthy,
  isInProtectedNamespace
} from "./chunk-hxhwzgnn.js";
import"./chunk-qx8z601m.js";
import"./chunk-cgm6758j.js";
import"./chunk-9m27g5s1.js";
import"./chunk-8pn8tvgg.js";
import"./chunk-netzwgv1.js";
import {
  __require
} from "./chunk-qp2qdcda.js";

// src/daemon/workerRegistry.ts
import { resolve as resolve2 } from "path";

// src/bridge/bridgeMain.ts
init_product();
init_datadog();
init_firstPartyEventLogger();
init_growthbook();
init_analytics();
init_cliLaunch();
init_debug();
init_rcDebugLog();
init_diagLogs();
init_envUtils();
init_errors();
init_format();
init_log();
init_sleep();
init_worktree();
init_bridgeApi();
init_bridgeStatusUtil();
import { randomUUID } from "crypto";
import { hostname, tmpdir as tmpdir2 } from "os";
import { basename, join as join2, resolve } from "path";

// src/bridge/bridgeUI.ts
init_server();
init_figures();
init_src();
init_debug();
init_bridgeStatusUtil();

// src/bridge/bridgeMain.ts
init_debugUtils();
init_sessionIdCompat();

// src/bridge/sessionRunner.ts
init_slowOperations();
init_debugUtils();
import { spawn } from "child_process";
import { createWriteStream } from "fs";
import { tmpdir } from "os";
import { dirname, join } from "path";
import { createInterface } from "readline";
var MAX_ACTIVITIES = 10;
var MAX_STDERR_LINES = 10;
function safeFilenameId(id) {
  return id.replace(/[^a-zA-Z0-9_-]/g, "_");
}
var TOOL_VERBS = {
  Read: "\u8bfb\u53d6",
  Write: "\u5199\u5165",
  Edit: "\u7f16\u8f91",
  MultiEdit: "\u7f16\u8f91",
  Bash: "\u6267\u884c",
  Glob: "\u641c\u7d22",
  Grep: "\u641c\u7d22",
  WebFetch: "\u83b7\u53d6",
  WebSearch: "\u641c\u7d22",
  Task: "\u6267\u884c\u4efb\u52a1",
  FileReadTool: "\u8bfb\u53d6",
  FileWriteTool: "\u5199\u5165",
  FileEditTool: "\u7f16\u8f91",
  GlobTool: "\u641c\u7d22",
  GrepTool: "\u641c\u7d22",
  BashTool: "\u6267\u884c",
  NotebookEditTool: "\u7f16\u8f91\u7b14\u8bb0\u672c",
  LSP: "LSP"
};
function toolSummary(name, input) {
  const verb = TOOL_VERBS[name] ?? name;
  const target = input.file_path ?? input.filePath ?? input.pattern ?? input.command?.slice(0, 60) ?? input.url ?? input.query ?? "";
  if (target) {
    return `${verb} ${target}`;
  }
  return verb;
}
function extractActivities(line, sessionId, onDebug) {
  let parsed;
  try {
    parsed = jsonParse(line);
  } catch {
    return [];
  }
  if (!parsed || typeof parsed !== "object") {
    return [];
  }
  const msg = parsed;
  const activities = [];
  const now = Date.now();
  switch (msg.type) {
    case "assistant": {
      const message = msg.message;
      if (!message)
        break;
      const content = message.content;
      if (!Array.isArray(content))
        break;
      for (const block of content) {
        if (!block || typeof block !== "object")
          continue;
        const b = block;
        if (b.type === "tool_use") {
          const name = b.name ?? "Tool";
          const input = b.input ?? {};
          const summary = toolSummary(name, input);
          activities.push({
            type: "tool_start",
            summary,
            timestamp: now
          });
          onDebug(`[bridge:activity] sessionId=${sessionId} tool_use name=${name} ${inputPreview(input)}`);
        } else if (b.type === "text") {
          const text = b.text ?? "";
          if (text.length > 0) {
            activities.push({
              type: "text",
              summary: text.slice(0, 80),
              timestamp: now
            });
            onDebug(`[bridge:activity] sessionId=${sessionId} text "${text.slice(0, 100)}"`);
          }
        }
      }
      break;
    }
    case "result": {
      const subtype = msg.subtype;
      if (subtype === "success") {
        activities.push({
          type: "result",
          summary: "Session completed",
          timestamp: now
        });
        onDebug(`[bridge:activity] sessionId=${sessionId} result subtype=success`);
      } else if (subtype) {
        const errors = msg.errors;
        const errorSummary = errors?.[0] ?? `Error: ${subtype}`;
        activities.push({
          type: "error",
          summary: errorSummary,
          timestamp: now
        });
        onDebug(`[bridge:activity] sessionId=${sessionId} result subtype=${subtype} error="${errorSummary}"`);
      } else {
        onDebug(`[bridge:activity] sessionId=${sessionId} result subtype=undefined`);
      }
      break;
    }
    default:
      break;
  }
  return activities;
}
function extractUserMessageText(msg) {
  if (msg.parent_tool_use_id != null || msg.isSynthetic || msg.isReplay)
    return;
  const message = msg.message;
  const content = message?.content;
  let text;
  if (typeof content === "string") {
    text = content;
  } else if (Array.isArray(content)) {
    for (const block of content) {
      if (block && typeof block === "object" && block.type === "text") {
        text = block.text;
        break;
      }
    }
  }
  text = text?.trim();
  return text ? text : undefined;
}
function inputPreview(input) {
  const parts = [];
  for (const [key, val] of Object.entries(input)) {
    if (typeof val === "string") {
      parts.push(`${key}="${val.slice(0, 100)}"`);
    }
    if (parts.length >= 3)
      break;
  }
  return parts.join(" ");
}
function createSessionSpawner(deps) {
  return {
    spawn(opts, dir) {
      const safeId = safeFilenameId(opts.sessionId);
      let debugFile;
      if (deps.debugFile) {
        const ext = deps.debugFile.lastIndexOf(".");
        if (ext > 0) {
          debugFile = `${deps.debugFile.slice(0, ext)}-${safeId}${deps.debugFile.slice(ext)}`;
        } else {
          debugFile = `${deps.debugFile}-${safeId}`;
        }
      } else if (deps.verbose || process.env.USER_TYPE === "ant") {
        debugFile = join(tmpdir(), "claude", `bridge-session-${safeId}.log`);
      }
      let transcriptStream = null;
      let transcriptPath;
      if (deps.debugFile) {
        transcriptPath = join(dirname(deps.debugFile), `bridge-transcript-${safeId}.jsonl`);
        transcriptStream = createWriteStream(transcriptPath, { flags: "a" });
        transcriptStream.on("error", (err) => {
          deps.onDebug(`[bridge:session] Transcript write error: ${err.message}`);
          transcriptStream = null;
        });
        deps.onDebug(`[bridge:session] Transcript log: ${transcriptPath}`);
      }
      const args = [
        ...deps.scriptArgs,
        "--print",
        "--sdk-url",
        opts.sdkUrl,
        "--session-id",
        opts.sessionId,
        "--input-format",
        "stream-json",
        "--output-format",
        "stream-json",
        "--replay-user-messages",
        ...deps.verbose ? ["--verbose"] : [],
        ...debugFile ? ["--debug-file", debugFile] : [],
        ...deps.permissionMode ? ["--permission-mode", deps.permissionMode] : []
      ];
      const env = {
        ...deps.env,
        CLAUDE_CODE_OAUTH_TOKEN: undefined,
        CLAUDE_CODE_ENVIRONMENT_KIND: "bridge",
        ...deps.sandbox && { CLAUDE_CODE_FORCE_SANDBOX: "1" },
        CLAUDE_CODE_SESSION_ACCESS_TOKEN: opts.accessToken,
        CLAUDE_CODE_POST_FOR_SESSION_INGRESS_V2: "1",
        ...opts.useCcrV2 && {
          CLAUDE_CODE_USE_CCR_V2: "1",
          CLAUDE_CODE_WORKER_EPOCH: String(opts.workerEpoch)
        }
      };
      deps.onDebug(`[bridge:session] Spawning sessionId=${opts.sessionId} sdkUrl=${opts.sdkUrl} accessToken=${opts.accessToken ? "present" : "MISSING"}`);
      deps.onDebug(`[bridge:session] Child args: ${args.join(" ")}`);
      if (debugFile) {
        deps.onDebug(`[bridge:session] Debug log: ${debugFile}`);
      }
      const child = spawn(deps.execPath, args, {
        cwd: dir,
        stdio: ["pipe", "pipe", "pipe"],
        env,
        windowsHide: true
      });
      deps.onDebug(`[bridge:session] sessionId=${opts.sessionId} pid=${child.pid}`);
      const activities = [];
      let currentActivity = null;
      const lastStderr = [];
      let sigkillSent = false;
      let firstUserMessageSeen = false;
      if (child.stderr) {
        const stderrRl = createInterface({ input: child.stderr });
        stderrRl.on("line", (line) => {
          if (deps.verbose) {
            process.stderr.write(line + `
`);
          }
          if (lastStderr.length >= MAX_STDERR_LINES) {
            lastStderr.shift();
          }
          lastStderr.push(line);
        });
      }
      if (child.stdout) {
        const rl = createInterface({ input: child.stdout });
        rl.on("line", (line) => {
          if (transcriptStream) {
            transcriptStream.write(line + `
`);
          }
          deps.onDebug(`[bridge:ws] sessionId=${opts.sessionId} <<< ${debugTruncate(line)}`);
          if (deps.verbose) {
            process.stderr.write(line + `
`);
          }
          const extracted = extractActivities(line, opts.sessionId, deps.onDebug);
          for (const activity of extracted) {
            if (activities.length >= MAX_ACTIVITIES) {
              activities.shift();
            }
            activities.push(activity);
            currentActivity = activity;
            deps.onActivity?.(opts.sessionId, activity);
          }
          {
            let parsed;
            try {
              parsed = jsonParse(line);
            } catch {}
            if (parsed && typeof parsed === "object") {
              const msg = parsed;
              if (msg.type === "control_request") {
                const request = msg.request;
                if (request?.subtype === "can_use_tool" && deps.onPermissionRequest) {
                  deps.onPermissionRequest(opts.sessionId, parsed, opts.accessToken);
                }
              } else if (msg.type === "user" && !firstUserMessageSeen && opts.onFirstUserMessage) {
                const text = extractUserMessageText(msg);
                if (text) {
                  firstUserMessageSeen = true;
                  opts.onFirstUserMessage(text);
                }
              }
            }
          }
        });
      }
      const done = new Promise((resolve) => {
        child.on("close", (code, signal) => {
          if (transcriptStream) {
            transcriptStream.end();
            transcriptStream = null;
          }
          if (signal === "SIGTERM" || signal === "SIGINT") {
            deps.onDebug(`[bridge:session] sessionId=${opts.sessionId} interrupted signal=${signal} pid=${child.pid}`);
            resolve("interrupted");
          } else if (code === 0) {
            deps.onDebug(`[bridge:session] sessionId=${opts.sessionId} completed exit_code=0 pid=${child.pid}`);
            resolve("completed");
          } else {
            deps.onDebug(`[bridge:session] sessionId=${opts.sessionId} failed exit_code=${code} pid=${child.pid}`);
            resolve("failed");
          }
        });
        child.on("error", (err) => {
          deps.onDebug(`[bridge:session] sessionId=${opts.sessionId} spawn error: ${err.message}`);
          resolve("failed");
        });
      });
      const handle = {
        sessionId: opts.sessionId,
        done,
        activities,
        accessToken: opts.accessToken,
        lastStderr,
        get currentActivity() {
          return currentActivity;
        },
        kill() {
          if (!child.killed) {
            deps.onDebug(`[bridge:session] Sending SIGTERM to sessionId=${opts.sessionId} pid=${child.pid}`);
            if (process.platform === "win32") {
              child.kill();
            } else {
              child.kill("SIGTERM");
            }
          }
        },
        forceKill() {
          if (!sigkillSent && child.pid) {
            sigkillSent = true;
            deps.onDebug(`[bridge:session] Sending SIGKILL to sessionId=${opts.sessionId} pid=${child.pid}`);
            if (process.platform === "win32") {
              child.kill();
            } else {
              child.kill("SIGKILL");
            }
          }
        },
        writeStdin(data) {
          if (child.stdin && !child.stdin.destroyed) {
            deps.onDebug(`[bridge:ws] sessionId=${opts.sessionId} >>> ${debugTruncate(data)}`);
            child.stdin.write(data);
          }
        },
        updateAccessToken(token) {
          handle.accessToken = token;
          handle.writeStdin(jsonStringify({
            type: "update_environment_variables",
            variables: { CLAUDE_CODE_SESSION_ACCESS_TOKEN: token }
          }) + `
`);
          deps.onDebug(`[bridge:session] Sent token refresh via stdin for sessionId=${opts.sessionId}`);
        }
      };
      return handle;
    }
  };
}

// src/bridge/bridgeMain.ts
init_trustedDevice();
init_types();
var DEFAULT_BACKOFF = {
  connInitialMs: 2000,
  connCapMs: 120000,
  connGiveUpMs: 600000,
  generalInitialMs: 500,
  generalCapMs: 30000,
  generalGiveUpMs: 600000
};
var STATUS_UPDATE_INTERVAL_MS = 1000;
function pollSleepDetectionThresholdMs(backoff) {
  return backoff.connCapMs * 2;
}
function spawnScriptArgs() {
  const bootstrap = [...getBootstrapArgs()];
  const script = getScriptPath();
  if (script)
    bootstrap.push(script);
  return bootstrap;
}
function safeSpawn(spawner, opts, dir) {
  try {
    return spawner.spawn(opts, dir);
  } catch (err) {
    const errMsg = errorMessage(err);
    logError(new Error(`Session spawn failed: ${errMsg}`));
    return errMsg;
  }
}
async function runBridgeLoop(config, environmentId, environmentSecret, api, spawner, logger, signal, backoffConfig = DEFAULT_BACKOFF, initialSessionId, getAccessToken) {
  const controller = new AbortController;
  if (signal.aborted) {
    controller.abort();
  } else {
    signal.addEventListener("abort", () => controller.abort(), { once: true });
  }
  const loopSignal = controller.signal;
  const activeSessions = new Map;
  const sessionStartTimes = new Map;
  const sessionWorkIds = new Map;
  const sessionCompatIds = new Map;
  const sessionIngressTokens = new Map;
  const sessionTimers = new Map;
  const completedWorkIds = new Set;
  const sessionWorktrees = new Map;
  const timedOutSessions = new Set;
  const titledSessions = new Set;
  const capacityWake = createCapacityWake(loopSignal);
  async function heartbeatActiveWorkItems() {
    rcLog(`heartbeat: checking ${activeSessions.size} active session(s)`);
    let anySuccess = false;
    let anyFatal = false;
    const authFailedSessions = [];
    for (const [sessionId] of activeSessions) {
      const workId = sessionWorkIds.get(sessionId);
      const ingressToken = sessionIngressTokens.get(sessionId);
      if (!workId || !ingressToken) {
        continue;
      }
      try {
        await api.heartbeatWork(environmentId, workId, ingressToken);
        anySuccess = true;
      } catch (err) {
        logForDebugging(`[bridge:heartbeat] Failed for sessionId=${sessionId} workId=${workId}: ${errorMessage(err)}`);
        if (err instanceof BridgeFatalError) {
          logEvent("tengu_bridge_heartbeat_error", {
            status: err.status,
            error_type: err.status === 401 || err.status === 403 ? "auth_failed" : "fatal"
          });
          if (err.status === 401 || err.status === 403) {
            authFailedSessions.push(sessionId);
          } else {
            anyFatal = true;
          }
        }
      }
    }
    for (const sessionId of authFailedSessions) {
      logger.logVerbose(`Session ${sessionId} token expired \u2014 re-queuing via bridge/reconnect`);
      try {
        await api.reconnectSession(environmentId, sessionId);
        logForDebugging(`[bridge:heartbeat] Re-queued sessionId=${sessionId} via bridge/reconnect`);
      } catch (err) {
        logger.logError(`Failed to refresh session ${sessionId} token: ${errorMessage(err)}`);
        logForDebugging(`[bridge:heartbeat] reconnectSession(${sessionId}) failed: ${errorMessage(err)}`, { level: "error" });
      }
    }
    if (anyFatal) {
      return "fatal";
    }
    if (authFailedSessions.length > 0) {
      return "auth_failed";
    }
    return anySuccess ? "ok" : "failed";
  }
  const v2Sessions = new Set;
  const tokenRefresh = getAccessToken ? createTokenRefreshScheduler({
    getAccessToken,
    onRefresh: (sessionId, oauthToken) => {
      const handle = activeSessions.get(sessionId);
      if (!handle) {
        return;
      }
      if (v2Sessions.has(sessionId)) {
        logger.logVerbose(`Refreshing session ${sessionId} token via bridge/reconnect`);
        api.reconnectSession(environmentId, sessionId).catch((err) => {
          logger.logError(`Failed to refresh session ${sessionId} token: ${errorMessage(err)}`);
          logForDebugging(`[bridge:token] reconnectSession(${sessionId}) failed: ${errorMessage(err)}`, { level: "error" });
        });
      } else {
        handle.updateAccessToken(oauthToken);
      }
    },
    label: "bridge"
  }) : null;
  const loopStartTime = Date.now();
  const pendingCleanups = new Set;
  function trackCleanup(p) {
    pendingCleanups.add(p);
    p.finally(() => pendingCleanups.delete(p));
  }
  let connBackoff = 0;
  let generalBackoff = 0;
  let connErrorStart = null;
  let generalErrorStart = null;
  let lastPollErrorTime = null;
  let statusUpdateTimer = null;
  let fatalExit = false;
  logForDebugging(`[bridge:work] Starting poll loop spawnMode=${config.spawnMode} maxSessions=${config.maxSessions} environmentId=${environmentId}`);
  logForDiagnosticsNoPII("info", "bridge_loop_started", {
    max_sessions: config.maxSessions,
    spawn_mode: config.spawnMode
  });
  if (process.env.USER_TYPE === "ant") {
    let debugGlob;
    if (config.debugFile) {
      const ext = config.debugFile.lastIndexOf(".");
      debugGlob = ext > 0 ? `${config.debugFile.slice(0, ext)}-*${config.debugFile.slice(ext)}` : `${config.debugFile}-*`;
    } else {
      debugGlob = join2(tmpdir2(), "claude", "bridge-session-*.log");
    }
    logger.setDebugLogPath(debugGlob);
  }
  logger.printBanner(config, environmentId);
  logger.updateSessionCount(0, config.maxSessions, config.spawnMode);
  if (initialSessionId) {
    logger.setAttached(initialSessionId);
  }
  function updateStatusDisplay() {
    logger.updateSessionCount(activeSessions.size, config.maxSessions, config.spawnMode);
    for (const [sid, handle2] of activeSessions) {
      const act = handle2.currentActivity;
      if (act) {
        logger.updateSessionActivity(sessionCompatIds.get(sid) ?? sid, act);
      }
    }
    if (activeSessions.size === 0) {
      logger.updateIdleStatus();
      return;
    }
    const [sessionId, handle] = [...activeSessions.entries()].pop();
    const startTime = sessionStartTimes.get(sessionId);
    if (!startTime)
      return;
    const activity = handle.currentActivity;
    if (!activity || activity.type === "result" || activity.type === "error") {
      if (config.maxSessions > 1)
        logger.refreshDisplay();
      return;
    }
    const elapsed = formatDuration(Date.now() - startTime);
    const trail = handle.activities.filter((a) => a.type === "tool_start").slice(-5).map((a) => a.summary);
    logger.updateSessionStatus(sessionId, elapsed, activity, trail);
  }
  function startStatusUpdates() {
    stopStatusUpdates();
    updateStatusDisplay();
    statusUpdateTimer = setInterval(updateStatusDisplay, STATUS_UPDATE_INTERVAL_MS);
  }
  function stopStatusUpdates() {
    if (statusUpdateTimer) {
      clearInterval(statusUpdateTimer);
      statusUpdateTimer = null;
    }
  }
  function onSessionDone(sessionId, startTime, handle) {
    return (rawStatus) => {
      const workId = sessionWorkIds.get(sessionId);
      rcLog(`session done: sessionId=${sessionId} workId=${workId ?? "none"} status=${rawStatus}` + ` wasTimedOut=${timedOutSessions.has(sessionId)} duration=${Math.round((Date.now() - startTime) / 1000)}s` + ` stderr=${handle.lastStderr.length > 0 ? handle.lastStderr.join("\\n").slice(0, 500) : "(none)"}`);
      activeSessions.delete(sessionId);
      sessionStartTimes.delete(sessionId);
      sessionWorkIds.delete(sessionId);
      sessionIngressTokens.delete(sessionId);
      const compatId = sessionCompatIds.get(sessionId) ?? sessionId;
      sessionCompatIds.delete(sessionId);
      logger.removeSession(compatId);
      titledSessions.delete(compatId);
      v2Sessions.delete(sessionId);
      const timer = sessionTimers.get(sessionId);
      if (timer) {
        clearTimeout(timer);
        sessionTimers.delete(sessionId);
      }
      tokenRefresh?.cancel(sessionId);
      capacityWake.wake();
      const wasTimedOut = timedOutSessions.delete(sessionId);
      const status = wasTimedOut && rawStatus === "interrupted" ? "failed" : rawStatus;
      const durationMs = Date.now() - startTime;
      logForDebugging(`[bridge:session] sessionId=${sessionId} workId=${workId ?? "unknown"} exited status=${status} duration=${formatDuration(durationMs)}`);
      logEvent("tengu_bridge_session_done", {
        status,
        duration_ms: durationMs
      });
      logForDiagnosticsNoPII("info", "bridge_session_done", {
        status,
        duration_ms: durationMs
      });
      logger.clearStatus();
      stopStatusUpdates();
      const stderrSummary = handle.lastStderr.length > 0 ? handle.lastStderr.join(`
`) : undefined;
      let failureMessage;
      switch (status) {
        case "completed":
          logger.logSessionComplete(sessionId, durationMs);
          break;
        case "failed":
          if (!wasTimedOut && !loopSignal.aborted) {
            failureMessage = stderrSummary ?? "Process exited with error";
            logger.logSessionFailed(sessionId, failureMessage);
            logError(new Error(`Bridge session failed: ${failureMessage}`));
          }
          break;
        case "interrupted":
          logger.logVerbose(`Session ${sessionId} interrupted`);
          break;
      }
      if (status !== "interrupted" && workId) {
        trackCleanup(stopWorkWithRetry(api, environmentId, workId, logger, backoffConfig.stopWorkBaseDelayMs));
        completedWorkIds.add(workId);
      }
      const wt = sessionWorktrees.get(sessionId);
      if (wt) {
        sessionWorktrees.delete(sessionId);
        trackCleanup(removeAgentWorktree(wt.worktreePath, wt.worktreeBranch, wt.gitRoot, wt.hookBased).catch((err) => logger.logVerbose(`Failed to remove worktree ${wt.worktreePath}: ${errorMessage(err)}`)));
      }
      if (status !== "interrupted" && !loopSignal.aborted) {
        if (config.spawnMode !== "single-session") {
          trackCleanup(api.archiveSession(compatId).catch((err) => logger.logVerbose(`Failed to archive session ${sessionId}: ${errorMessage(err)}`)));
          logForDebugging(`[bridge:session] Session ${status}, returning to idle (multi-session mode)`);
        } else {
          logForDebugging(`[bridge:session] Session ${status}, aborting poll loop to tear down environment`);
          controller.abort();
          return;
        }
      }
      if (!loopSignal.aborted) {
        startStatusUpdates();
      }
    };
  }
  if (!initialSessionId) {
    startStatusUpdates();
  }
  while (!loopSignal.aborted) {
    const pollConfig = getPollIntervalConfig();
    try {
      rcLog(`poll: envId=${environmentId} activeSessions=${activeSessions.size}`);
      const work = await api.pollForWork(environmentId, environmentSecret, loopSignal, pollConfig.reclaim_older_than_ms);
      const wasDisconnected = connErrorStart !== null || generalErrorStart !== null;
      if (wasDisconnected) {
        const disconnectedMs = Date.now() - (connErrorStart ?? generalErrorStart ?? Date.now());
        logger.logReconnected(disconnectedMs);
        logForDebugging(`[bridge:poll] Reconnected after ${formatDuration(disconnectedMs)}`);
        logEvent("tengu_bridge_reconnected", {
          disconnected_ms: disconnectedMs
        });
      }
      connBackoff = 0;
      generalBackoff = 0;
      connErrorStart = null;
      generalErrorStart = null;
      lastPollErrorTime = null;
      if (!work) {
        const atCap = activeSessions.size >= config.maxSessions;
        if (atCap) {
          const atCapMs = pollConfig.multisession_poll_interval_ms_at_capacity;
          if (pollConfig.non_exclusive_heartbeat_interval_ms > 0) {
            logEvent("tengu_bridge_heartbeat_mode_entered", {
              active_sessions: activeSessions.size,
              heartbeat_interval_ms: pollConfig.non_exclusive_heartbeat_interval_ms
            });
            const pollDeadline = atCapMs > 0 ? Date.now() + atCapMs : null;
            let hbResult = "ok";
            let hbCycles = 0;
            while (!loopSignal.aborted && activeSessions.size >= config.maxSessions && (pollDeadline === null || Date.now() < pollDeadline)) {
              const hbConfig = getPollIntervalConfig();
              if (hbConfig.non_exclusive_heartbeat_interval_ms <= 0)
                break;
              const cap = capacityWake.signal();
              hbResult = await heartbeatActiveWorkItems();
              if (hbResult === "auth_failed" || hbResult === "fatal") {
                cap.cleanup();
                break;
              }
              hbCycles++;
              await sleep(hbConfig.non_exclusive_heartbeat_interval_ms, cap.signal);
              cap.cleanup();
            }
            const exitReason = hbResult === "auth_failed" || hbResult === "fatal" ? hbResult : loopSignal.aborted ? "shutdown" : activeSessions.size < config.maxSessions ? "capacity_changed" : pollDeadline !== null && Date.now() >= pollDeadline ? "poll_due" : "config_disabled";
            logEvent("tengu_bridge_heartbeat_mode_exited", {
              reason: exitReason,
              heartbeat_cycles: hbCycles,
              active_sessions: activeSessions.size
            });
            if (exitReason === "poll_due") {
              logForDebugging(`[bridge:poll] Heartbeat poll_due after ${hbCycles} cycles \u2014 falling through to pollForWork`);
            }
            if (hbResult === "auth_failed" || hbResult === "fatal") {
              const cap = capacityWake.signal();
              await sleep(atCapMs > 0 ? atCapMs : pollConfig.non_exclusive_heartbeat_interval_ms, cap.signal);
              cap.cleanup();
            }
          } else if (atCapMs > 0) {
            const cap = capacityWake.signal();
            await sleep(atCapMs, cap.signal);
            cap.cleanup();
          }
        } else {
          const interval = activeSessions.size > 0 ? pollConfig.multisession_poll_interval_ms_partial_capacity : pollConfig.multisession_poll_interval_ms_not_at_capacity;
          await sleep(interval, loopSignal);
        }
        continue;
      }
      const atCapacityBeforeSwitch = activeSessions.size >= config.maxSessions;
      if (completedWorkIds.has(work.id)) {
        logForDebugging(`[bridge:work] Skipping already-completed workId=${work.id}`);
        if (atCapacityBeforeSwitch) {
          const cap = capacityWake.signal();
          if (pollConfig.non_exclusive_heartbeat_interval_ms > 0) {
            await heartbeatActiveWorkItems();
            await sleep(pollConfig.non_exclusive_heartbeat_interval_ms, cap.signal);
          } else if (pollConfig.multisession_poll_interval_ms_at_capacity > 0) {
            await sleep(pollConfig.multisession_poll_interval_ms_at_capacity, cap.signal);
          }
          cap.cleanup();
        } else {
          await sleep(1000, loopSignal);
        }
        continue;
      }
      let secret;
      try {
        secret = decodeWorkSecret(work.secret);
      } catch (err) {
        const errMsg = errorMessage(err);
        logger.logError(`Failed to decode work secret for workId=${work.id}: ${errMsg}`);
        logEvent("tengu_bridge_work_secret_failed", {});
        completedWorkIds.add(work.id);
        trackCleanup(stopWorkWithRetry(api, environmentId, work.id, logger, backoffConfig.stopWorkBaseDelayMs));
        if (atCapacityBeforeSwitch) {
          const cap = capacityWake.signal();
          if (pollConfig.non_exclusive_heartbeat_interval_ms > 0) {
            await heartbeatActiveWorkItems();
            await sleep(pollConfig.non_exclusive_heartbeat_interval_ms, cap.signal);
          } else if (pollConfig.multisession_poll_interval_ms_at_capacity > 0) {
            await sleep(pollConfig.multisession_poll_interval_ms_at_capacity, cap.signal);
          }
          cap.cleanup();
        }
        continue;
      }
      const ackWork = async () => {
        logForDebugging(`[bridge:work] Acknowledging workId=${work.id}`);
        try {
          await api.acknowledgeWork(environmentId, work.id, secret.session_ingress_token);
        } catch (err) {
          logForDebugging(`[bridge:work] Acknowledge failed workId=${work.id}: ${errorMessage(err)}`);
        }
      };
      const workType = work.data.type;
      switch (work.data.type) {
        case "healthcheck":
          await ackWork();
          logForDebugging("[bridge:work] Healthcheck received");
          logger.logVerbose("Healthcheck received");
          break;
        case "session": {
          const sessionId = work.data.id;
          rcLog(`work received: type=session sessionId=${sessionId} workId=${work.id}`);
          try {
            validateBridgeId(sessionId, "session_id");
          } catch {
            await ackWork();
            logger.logError(`Invalid session_id received: ${sessionId}`);
            break;
          }
          const existingHandle = activeSessions.get(sessionId);
          if (existingHandle) {
            existingHandle.updateAccessToken(secret.session_ingress_token);
            sessionIngressTokens.set(sessionId, secret.session_ingress_token);
            sessionWorkIds.set(sessionId, work.id);
            tokenRefresh?.schedule(sessionId, secret.session_ingress_token);
            logForDebugging(`[bridge:work] Updated access token for existing sessionId=${sessionId} workId=${work.id}`);
            await ackWork();
            break;
          }
          if (activeSessions.size >= config.maxSessions) {
            logForDebugging(`[bridge:work] At capacity (${activeSessions.size}/${config.maxSessions}), cannot spawn new session for workId=${work.id}`);
            break;
          }
          await ackWork();
          const spawnStartTime = Date.now();
          let sdkUrl;
          let useCcrV2 = false;
          let workerEpoch;
          if (secret.use_code_sessions === true || isEnvTruthy(process.env.CLAUDE_BRIDGE_USE_CCR_V2)) {
            sdkUrl = buildCCRv2SdkUrl(config.apiBaseUrl, sessionId);
            for (let attempt = 1;attempt <= 2; attempt++) {
              try {
                workerEpoch = await registerWorker(sdkUrl, secret.session_ingress_token);
                useCcrV2 = true;
                logForDebugging(`[bridge:session] CCR v2: registered worker sessionId=${sessionId} epoch=${workerEpoch} attempt=${attempt}`);
                break;
              } catch (err) {
                const errMsg = errorMessage(err);
                if (attempt < 2) {
                  logForDebugging(`[bridge:session] CCR v2: registerWorker attempt ${attempt} failed, retrying: ${errMsg}`);
                  await sleep(2000, loopSignal);
                  if (loopSignal.aborted)
                    break;
                  continue;
                }
                logger.logError(`CCR v2 worker registration failed for session ${sessionId}: ${errMsg}`);
                logError(new Error(`registerWorker failed: ${errMsg}`));
                completedWorkIds.add(work.id);
                trackCleanup(stopWorkWithRetry(api, environmentId, work.id, logger, backoffConfig.stopWorkBaseDelayMs));
              }
            }
            if (!useCcrV2)
              break;
          } else {
            sdkUrl = buildSdkUrl(config.sessionIngressUrl, sessionId);
          }
          const spawnModeAtDecision = config.spawnMode;
          let sessionDir = config.dir;
          let worktreeCreateMs = 0;
          if (spawnModeAtDecision === "worktree" && (initialSessionId === undefined || !sameSessionId(sessionId, initialSessionId))) {
            const wtStart = Date.now();
            try {
              const wt = await createAgentWorktree(`bridge-${safeFilenameId(sessionId)}`);
              worktreeCreateMs = Date.now() - wtStart;
              sessionWorktrees.set(sessionId, {
                worktreePath: wt.worktreePath,
                worktreeBranch: wt.worktreeBranch,
                gitRoot: wt.gitRoot,
                hookBased: wt.hookBased
              });
              sessionDir = wt.worktreePath;
              logForDebugging(`[bridge:session] Created worktree for sessionId=${sessionId} at ${wt.worktreePath}`);
            } catch (err) {
              const errMsg = errorMessage(err);
              logger.logError(`Failed to create worktree for session ${sessionId}: ${errMsg}`);
              logError(new Error(`Worktree creation failed: ${errMsg}`));
              completedWorkIds.add(work.id);
              trackCleanup(stopWorkWithRetry(api, environmentId, work.id, logger, backoffConfig.stopWorkBaseDelayMs));
              break;
            }
          }
          logForDebugging(`[bridge:session] Spawning sessionId=${sessionId} sdkUrl=${sdkUrl}`);
          const compatSessionId = toCompatSessionId(sessionId);
          rcLog(`spawning session: sessionId=${sessionId} sdkUrl=${sdkUrl}` + ` useCcrV2=${useCcrV2} workerEpoch=${workerEpoch}` + ` dir=${sessionDir}` + ` accessToken=${secret.session_ingress_token ? secret.session_ingress_token.slice(0, 8) + "..." : "NONE"}`);
          const spawnResult = safeSpawn(spawner, {
            sessionId,
            sdkUrl,
            accessToken: secret.session_ingress_token,
            useCcrV2,
            workerEpoch,
            onFirstUserMessage: (text) => {
              if (titledSessions.has(compatSessionId))
                return;
              titledSessions.add(compatSessionId);
              const title = deriveSessionTitle(text);
              logger.setSessionTitle(compatSessionId, title);
              logForDebugging(`[bridge:title] derived title for ${compatSessionId}: ${title}`);
              import("./chunk-v9a6zr45.js").then(({ updateBridgeSessionTitle }) => updateBridgeSessionTitle(compatSessionId, title, {
                baseUrl: config.apiBaseUrl
              })).catch((err) => logForDebugging(`[bridge:title] failed to update title for ${compatSessionId}: ${err}`, { level: "error" }));
            }
          }, sessionDir);
          if (typeof spawnResult === "string") {
            logger.logError(`Failed to spawn session ${sessionId}: ${spawnResult}`);
            const wt = sessionWorktrees.get(sessionId);
            if (wt) {
              sessionWorktrees.delete(sessionId);
              trackCleanup(removeAgentWorktree(wt.worktreePath, wt.worktreeBranch, wt.gitRoot, wt.hookBased).catch((err) => logger.logVerbose(`Failed to remove worktree ${wt.worktreePath}: ${errorMessage(err)}`)));
            }
            completedWorkIds.add(work.id);
            trackCleanup(stopWorkWithRetry(api, environmentId, work.id, logger, backoffConfig.stopWorkBaseDelayMs));
            break;
          }
          const handle = spawnResult;
          const spawnDurationMs = Date.now() - spawnStartTime;
          logEvent("tengu_bridge_session_started", {
            active_sessions: activeSessions.size,
            spawn_mode: spawnModeAtDecision,
            in_worktree: sessionWorktrees.has(sessionId),
            spawn_duration_ms: spawnDurationMs,
            worktree_create_ms: worktreeCreateMs,
            inProtectedNamespace: isInProtectedNamespace()
          });
          logForDiagnosticsNoPII("info", "bridge_session_started", {
            spawn_mode: spawnModeAtDecision,
            in_worktree: sessionWorktrees.has(sessionId),
            spawn_duration_ms: spawnDurationMs,
            worktree_create_ms: worktreeCreateMs
          });
          activeSessions.set(sessionId, handle);
          sessionWorkIds.set(sessionId, work.id);
          sessionIngressTokens.set(sessionId, secret.session_ingress_token);
          sessionCompatIds.set(sessionId, compatSessionId);
          const startTime = Date.now();
          sessionStartTimes.set(sessionId, startTime);
          logger.logSessionStart(sessionId, `Session ${sessionId}`);
          const safeId = safeFilenameId(sessionId);
          let sessionDebugFile;
          if (config.debugFile) {
            const ext = config.debugFile.lastIndexOf(".");
            if (ext > 0) {
              sessionDebugFile = `${config.debugFile.slice(0, ext)}-${safeId}${config.debugFile.slice(ext)}`;
            } else {
              sessionDebugFile = `${config.debugFile}-${safeId}`;
            }
          } else if (config.verbose || process.env.USER_TYPE === "ant") {
            sessionDebugFile = join2(tmpdir2(), "claude", `bridge-session-${safeId}.log`);
          }
          if (sessionDebugFile) {
            logger.logVerbose(`Debug log: ${sessionDebugFile}`);
          }
          logger.addSession(compatSessionId, getRemoteSessionUrl(compatSessionId, config.sessionIngressUrl));
          startStatusUpdates();
          logger.setAttached(compatSessionId);
          fetchSessionTitle(compatSessionId, config.apiBaseUrl).then((title) => {
            if (title && activeSessions.has(sessionId)) {
              titledSessions.add(compatSessionId);
              logger.setSessionTitle(compatSessionId, title);
              logForDebugging(`[bridge:title] server title for ${compatSessionId}: ${title}`);
            }
          }).catch((err) => logForDebugging(`[bridge:title] failed to fetch title for ${compatSessionId}: ${err}`, { level: "error" }));
          const timeoutMs = config.sessionTimeoutMs ?? DEFAULT_SESSION_TIMEOUT_MS;
          if (timeoutMs > 0) {
            const timer = setTimeout(onSessionTimeout, timeoutMs, sessionId, timeoutMs, logger, timedOutSessions, handle);
            sessionTimers.set(sessionId, timer);
          }
          if (useCcrV2) {
            v2Sessions.add(sessionId);
          }
          tokenRefresh?.schedule(sessionId, secret.session_ingress_token);
          handle.done.then(onSessionDone(sessionId, startTime, handle));
          break;
        }
        default:
          await ackWork();
          logForDebugging(`[bridge:work] Unknown work type: ${workType}, skipping`);
          break;
      }
      if (atCapacityBeforeSwitch) {
        const cap = capacityWake.signal();
        if (pollConfig.non_exclusive_heartbeat_interval_ms > 0) {
          await heartbeatActiveWorkItems();
          await sleep(pollConfig.non_exclusive_heartbeat_interval_ms, cap.signal);
        } else if (pollConfig.multisession_poll_interval_ms_at_capacity > 0) {
          await sleep(pollConfig.multisession_poll_interval_ms_at_capacity, cap.signal);
        }
        cap.cleanup();
      }
    } catch (err) {
      if (loopSignal.aborted) {
        break;
      }
      if (err instanceof BridgeFatalError) {
        fatalExit = true;
        if (isExpiredErrorType(err.errorType)) {
          logger.logStatus(err.message);
        } else if (isSuppressible403(err)) {
          logForDebugging(`[bridge:work] Suppressed 403 error: ${err.message}`);
        } else {
          logger.logError(err.message);
          logError(err);
        }
        logEvent("tengu_bridge_fatal_error", {
          status: err.status,
          error_type: err.errorType
        });
        logForDiagnosticsNoPII(isExpiredErrorType(err.errorType) ? "info" : "error", "bridge_fatal_error", { status: err.status, error_type: err.errorType });
        break;
      }
      const errMsg = describeAxiosError(err);
      rcLog(`poll error: ${errMsg}` + ` isConn=${isConnectionError(err)} isServer=${isServerError(err)}` + ` activeSessions=${activeSessions.size}`);
      if (isConnectionError(err) || isServerError(err)) {
        const now = Date.now();
        if (lastPollErrorTime !== null && now - lastPollErrorTime > pollSleepDetectionThresholdMs(backoffConfig)) {
          logForDebugging(`[bridge:work] Detected system sleep (${Math.round((now - lastPollErrorTime) / 1000)}s gap), resetting error budget`);
          logForDiagnosticsNoPII("info", "bridge_poll_sleep_detected", {
            gapMs: now - lastPollErrorTime
          });
          connErrorStart = null;
          connBackoff = 0;
          generalErrorStart = null;
          generalBackoff = 0;
        }
        lastPollErrorTime = now;
        if (!connErrorStart) {
          connErrorStart = now;
        }
        const elapsed = now - connErrorStart;
        if (elapsed >= backoffConfig.connGiveUpMs) {
          logger.logError(`Server unreachable for ${Math.round(elapsed / 60000)} minutes, giving up.`);
          logEvent("tengu_bridge_poll_give_up", {
            error_type: "connection",
            elapsed_ms: elapsed
          });
          logForDiagnosticsNoPII("error", "bridge_poll_give_up", {
            error_type: "connection",
            elapsed_ms: elapsed
          });
          fatalExit = true;
          break;
        }
        generalErrorStart = null;
        generalBackoff = 0;
        connBackoff = connBackoff ? Math.min(connBackoff * 2, backoffConfig.connCapMs) : backoffConfig.connInitialMs;
        const delay = addJitter(connBackoff);
        logger.logVerbose(`Connection error, retrying in ${formatDelay(delay)} (${Math.round(elapsed / 1000)}s elapsed): ${errMsg}`);
        logger.updateReconnectingStatus(formatDelay(delay), formatDuration(elapsed));
        if (getPollIntervalConfig().non_exclusive_heartbeat_interval_ms > 0) {
          await heartbeatActiveWorkItems();
        }
        await sleep(delay, loopSignal);
      } else {
        const now = Date.now();
        if (lastPollErrorTime !== null && now - lastPollErrorTime > pollSleepDetectionThresholdMs(backoffConfig)) {
          logForDebugging(`[bridge:work] Detected system sleep (${Math.round((now - lastPollErrorTime) / 1000)}s gap), resetting error budget`);
          logForDiagnosticsNoPII("info", "bridge_poll_sleep_detected", {
            gapMs: now - lastPollErrorTime
          });
          connErrorStart = null;
          connBackoff = 0;
          generalErrorStart = null;
          generalBackoff = 0;
        }
        lastPollErrorTime = now;
        if (!generalErrorStart) {
          generalErrorStart = now;
        }
        const elapsed = now - generalErrorStart;
        if (elapsed >= backoffConfig.generalGiveUpMs) {
          logger.logError(`Persistent errors for ${Math.round(elapsed / 60000)} minutes, giving up.`);
          logEvent("tengu_bridge_poll_give_up", {
            error_type: "general",
            elapsed_ms: elapsed
          });
          logForDiagnosticsNoPII("error", "bridge_poll_give_up", {
            error_type: "general",
            elapsed_ms: elapsed
          });
          fatalExit = true;
          break;
        }
        connErrorStart = null;
        connBackoff = 0;
        generalBackoff = generalBackoff ? Math.min(generalBackoff * 2, backoffConfig.generalCapMs) : backoffConfig.generalInitialMs;
        const delay = addJitter(generalBackoff);
        logger.logVerbose(`Poll failed, retrying in ${formatDelay(delay)} (${Math.round(elapsed / 1000)}s elapsed): ${errMsg}`);
        logger.updateReconnectingStatus(formatDelay(delay), formatDuration(elapsed));
        if (getPollIntervalConfig().non_exclusive_heartbeat_interval_ms > 0) {
          await heartbeatActiveWorkItems();
        }
        await sleep(delay, loopSignal);
      }
    }
  }
  stopStatusUpdates();
  logger.clearStatus();
  const loopDurationMs = Date.now() - loopStartTime;
  logEvent("tengu_bridge_shutdown", {
    active_sessions: activeSessions.size,
    loop_duration_ms: loopDurationMs
  });
  logForDiagnosticsNoPII("info", "bridge_shutdown", {
    active_sessions: activeSessions.size,
    loop_duration_ms: loopDurationMs
  });
  const sessionsToArchive = new Set(activeSessions.keys());
  if (initialSessionId) {
    sessionsToArchive.add(initialSessionId);
  }
  const compatIdSnapshot = new Map(sessionCompatIds);
  if (activeSessions.size > 0) {
    logForDebugging(`[bridge:shutdown] Shutting down ${activeSessions.size} active session(s)`);
    logger.logStatus(`Shutting down ${activeSessions.size} active session(s)\u2026`);
    const shutdownWorkIds = new Map(sessionWorkIds);
    for (const [sessionId, handle] of activeSessions.entries()) {
      logForDebugging(`[bridge:shutdown] Sending SIGTERM to sessionId=${sessionId}`);
      handle.kill();
    }
    const timeout = new AbortController;
    await Promise.race([
      Promise.allSettled([...activeSessions.values()].map((h) => h.done)),
      sleep(backoffConfig.shutdownGraceMs ?? 30000, timeout.signal)
    ]);
    timeout.abort();
    for (const [sid, handle] of activeSessions.entries()) {
      logForDebugging(`[bridge:shutdown] Force-killing stuck sessionId=${sid}`);
      handle.forceKill();
    }
    for (const timer of sessionTimers.values()) {
      clearTimeout(timer);
    }
    sessionTimers.clear();
    tokenRefresh?.cancelAll();
    if (sessionWorktrees.size > 0) {
      const remainingWorktrees = [...sessionWorktrees.values()];
      sessionWorktrees.clear();
      logForDebugging(`[bridge:shutdown] Cleaning up ${remainingWorktrees.length} worktree(s)`);
      await Promise.allSettled(remainingWorktrees.map((wt) => removeAgentWorktree(wt.worktreePath, wt.worktreeBranch, wt.gitRoot, wt.hookBased)));
    }
    await Promise.allSettled([...shutdownWorkIds.entries()].map(([sessionId, workId]) => {
      return api.stopWork(environmentId, workId, true).catch((err) => logger.logVerbose(`Failed to stop work ${workId} for session ${sessionId}: ${errorMessage(err)}`));
    }));
  }
  if (pendingCleanups.size > 0) {
    await Promise.allSettled([...pendingCleanups]);
  }
  if (config.spawnMode === "single-session" && initialSessionId && !fatalExit) {
    logger.logStatus(`Resume this session by running \`claude remote-control --continue\``);
    logForDebugging(`[bridge:shutdown] Skipping archive+deregister to allow resume of session ${initialSessionId}`);
    return;
  }
  if (sessionsToArchive.size > 0) {
    logForDebugging(`[bridge:shutdown] Archiving ${sessionsToArchive.size} session(s)`);
    await Promise.allSettled([...sessionsToArchive].map((sessionId) => api.archiveSession(compatIdSnapshot.get(sessionId) ?? toCompatSessionId(sessionId)).catch((err) => logger.logVerbose(`Failed to archive session ${sessionId}: ${errorMessage(err)}`))));
  }
  try {
    await api.deregisterEnvironment(environmentId);
    logForDebugging(`[bridge:shutdown] Environment deregistered, bridge offline`);
    logger.logVerbose("Environment deregistered.");
  } catch (err) {
    logger.logVerbose(`Failed to deregister environment: ${errorMessage(err)}`);
  }
  const { clearBridgePointer } = await import("./chunk-fxpsa506.js");
  await clearBridgePointer(config.dir);
  logger.logVerbose("Environment offline.");
}
var CONNECTION_ERROR_CODES = new Set([
  "ECONNREFUSED",
  "ECONNRESET",
  "ETIMEDOUT",
  "ENETUNREACH",
  "EHOSTUNREACH"
]);
function isConnectionError(err) {
  if (err && typeof err === "object" && "code" in err && typeof err.code === "string" && CONNECTION_ERROR_CODES.has(err.code)) {
    return true;
  }
  return false;
}
function isServerError(err) {
  return !!err && typeof err === "object" && "code" in err && typeof err.code === "string" && err.code === "ERR_BAD_RESPONSE";
}
function addJitter(ms) {
  return Math.max(0, ms + ms * 0.25 * (2 * Math.random() - 1));
}
function formatDelay(ms) {
  return ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${Math.round(ms)}ms`;
}
async function stopWorkWithRetry(api, environmentId, workId, logger, baseDelayMs = 1000) {
  const MAX_ATTEMPTS = 3;
  for (let attempt = 1;attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      await api.stopWork(environmentId, workId, false);
      logForDebugging(`[bridge:work] stopWork succeeded for workId=${workId} on attempt ${attempt}/${MAX_ATTEMPTS}`);
      return;
    } catch (err) {
      if (err instanceof BridgeFatalError) {
        if (isSuppressible403(err)) {
          logForDebugging(`[bridge:work] Suppressed stopWork 403 for ${workId}: ${err.message}`);
        } else {
          logger.logError(`Failed to stop work ${workId}: ${err.message}`);
        }
        logForDiagnosticsNoPII("error", "bridge_stop_work_failed", {
          attempts: attempt,
          fatal: true
        });
        return;
      }
      const errMsg = errorMessage(err);
      if (attempt < MAX_ATTEMPTS) {
        const delay = addJitter(baseDelayMs * Math.pow(2, attempt - 1));
        logger.logVerbose(`Failed to stop work ${workId} (attempt ${attempt}/${MAX_ATTEMPTS}), retrying in ${formatDelay(delay)}: ${errMsg}`);
        await sleep(delay);
      } else {
        logger.logError(`Failed to stop work ${workId} after ${MAX_ATTEMPTS} attempts: ${errMsg}`);
        logForDiagnosticsNoPII("error", "bridge_stop_work_failed", {
          attempts: MAX_ATTEMPTS
        });
      }
    }
  }
}
function onSessionTimeout(sessionId, timeoutMs, logger, timedOutSessions, handle) {
  logForDebugging(`[bridge:session] sessionId=${sessionId} timed out after ${formatDuration(timeoutMs)}`);
  logEvent("tengu_bridge_session_timeout", {
    timeout_ms: timeoutMs
  });
  logger.logSessionFailed(sessionId, `Session timed out after ${formatDuration(timeoutMs)}`);
  timedOutSessions.add(sessionId);
  handle.kill();
}
var TITLE_MAX_LEN = 80;
function deriveSessionTitle(text) {
  const flat = text.replace(/\s+/g, " ").trim();
  return truncateToWidth(flat, TITLE_MAX_LEN);
}
async function fetchSessionTitle(compatSessionId, baseUrl) {
  const { getBridgeSession } = await import("./chunk-v9a6zr45.js");
  const session = await getBridgeSession(compatSessionId, { baseUrl });
  return session?.title || undefined;
}
class BridgeHeadlessPermanentError extends Error {
  constructor(message) {
    super(message);
    this.name = "BridgeHeadlessPermanentError";
  }
}
async function runBridgeHeadless(opts, signal) {
  const { dir, log } = opts;
  process.chdir(dir);
  const { setOriginalCwd, setCwdState } = await import("./chunk-m1tjr9xq.js");
  setOriginalCwd(dir);
  setCwdState(dir);
  const { enableConfigs, checkHasTrustDialogAccepted } = await import("./chunk-bykhha8t.js");
  enableConfigs();
  const { initSinks } = await import("./chunk-8tpz0j0s.js");
  initSinks();
  if (!checkHasTrustDialogAccepted()) {
    throw new BridgeHeadlessPermanentError(`Workspace not trusted: ${dir}. Run \`claude\` in that directory first to accept the trust dialog.`);
  }
  if (!opts.getAccessToken()) {
    throw new Error(BRIDGE_LOGIN_ERROR);
  }
  const { getBridgeBaseUrl } = await import("./chunk-4e3981ad.js");
  const baseUrl = getBridgeBaseUrl();
  if (baseUrl.startsWith("http://") && !baseUrl.includes("localhost") && !baseUrl.includes("127.0.0.1")) {
    throw new BridgeHeadlessPermanentError("Remote Control base URL uses HTTP. Only HTTPS or localhost HTTP is allowed.");
  }
  const sessionIngressUrl = process.env.CLAUDE_BRIDGE_SESSION_INGRESS_URL || baseUrl;
  const { getBranch, getRemoteUrl, findGitRoot } = await import("./chunk-5zbp0a48.js");
  const { hasWorktreeCreateHook } = await import("./chunk-5gx8kx8s.js");
  if (opts.spawnMode === "worktree") {
    const worktreeAvailable = hasWorktreeCreateHook() || findGitRoot(dir) !== null;
    if (!worktreeAvailable) {
      throw new BridgeHeadlessPermanentError(`Worktree mode requires a git repository or WorktreeCreate hooks. Directory ${dir} has neither.`);
    }
  }
  const branch = await getBranch();
  const gitRepoUrl = await getRemoteUrl();
  const machineName = hostname();
  const bridgeId = randomUUID();
  const config = {
    dir,
    machineName,
    branch,
    gitRepoUrl,
    maxSessions: opts.capacity,
    spawnMode: opts.spawnMode,
    verbose: false,
    sandbox: opts.sandbox,
    bridgeId,
    workerType: "claude_code",
    environmentId: randomUUID(),
    apiBaseUrl: baseUrl,
    sessionIngressUrl,
    sessionTimeoutMs: opts.sessionTimeoutMs
  };
  const api = createBridgeApiClient({
    baseUrl,
    getAccessToken: opts.getAccessToken,
    runnerVersion: "2.1.888",
    onDebug: log,
    onAuth401: opts.onAuth401,
    getTrustedDeviceToken
  });
  let environmentId;
  let environmentSecret;
  try {
    const reg = await api.registerBridgeEnvironment(config);
    environmentId = reg.environment_id;
    environmentSecret = reg.environment_secret;
  } catch (err) {
    throw new Error(`Bridge registration failed: ${errorMessage(err)}`);
  }
  const spawner = createSessionSpawner({
    execPath: process.execPath,
    scriptArgs: spawnScriptArgs(),
    env: process.env,
    verbose: false,
    sandbox: opts.sandbox,
    permissionMode: opts.permissionMode,
    onDebug: log
  });
  const logger = createHeadlessBridgeLogger(log);
  logger.printBanner(config, environmentId);
  let initialSessionId;
  if (opts.createSessionOnStart) {
    const { createBridgeSession } = await import("./chunk-v9a6zr45.js");
    try {
      const sid = await createBridgeSession({
        environmentId,
        title: opts.name,
        events: [],
        gitRepoUrl,
        branch,
        signal,
        baseUrl,
        getAccessToken: opts.getAccessToken,
        permissionMode: opts.permissionMode
      });
      if (sid) {
        initialSessionId = sid;
        log(`created initial session ${sid}`);
      }
    } catch (err) {
      log(`session pre-creation failed (non-fatal): ${errorMessage(err)}`);
    }
  }
  await runBridgeLoop(config, environmentId, environmentSecret, api, spawner, logger, signal, undefined, initialSessionId, async () => opts.getAccessToken());
}
function createHeadlessBridgeLogger(log) {
  const noop = () => {};
  return {
    printBanner: (cfg, envId) => log(`registered environmentId=${envId} dir=${cfg.dir} spawnMode=${cfg.spawnMode} capacity=${cfg.maxSessions}`),
    logSessionStart: (id, _prompt) => log(`session start ${id}`),
    logSessionComplete: (id, ms) => log(`session complete ${id} (${ms}ms)`),
    logSessionFailed: (id, err) => log(`session failed ${id}: ${err}`),
    logStatus: log,
    logVerbose: log,
    logError: (s) => log(`error: ${s}`),
    logReconnected: (ms) => log(`reconnected after ${ms}ms`),
    addSession: (id, _url) => log(`session attached ${id}`),
    removeSession: (id) => log(`session detached ${id}`),
    updateIdleStatus: noop,
    updateReconnectingStatus: noop,
    updateSessionStatus: noop,
    updateSessionActivity: noop,
    updateSessionCount: noop,
    updateFailedStatus: noop,
    setSpawnModeDisplay: noop,
    setRepoInfo: noop,
    setDebugLogPath: noop,
    setAttached: noop,
    setSessionTitle: noop,
    clearStatus: noop,
    toggleQr: noop,
    refreshDisplay: noop
  };
}

// src/daemon/workerRegistry.ts
init_auth();
init_errors();
var EXIT_CODE_PERMANENT = 78;
var EXIT_CODE_TRANSIENT = 1;
async function runDaemonWorker(kind) {
  if (!kind) {
    console.error("Error: --daemon-worker requires a worker kind");
    process.exitCode = EXIT_CODE_PERMANENT;
    return;
  }
  switch (kind) {
    case "remoteControl":
      await runRemoteControlWorker();
      break;
    default:
      console.error(`Error: unknown daemon worker kind '${kind}'`);
      process.exitCode = EXIT_CODE_PERMANENT;
  }
}
async function runRemoteControlWorker() {
  const dir = process.env.DAEMON_WORKER_DIR || resolve2(".");
  const name = process.env.DAEMON_WORKER_NAME || undefined;
  const spawnMode = process.env.DAEMON_WORKER_SPAWN_MODE || "same-dir";
  const capacity = parseInt(process.env.DAEMON_WORKER_CAPACITY || "4", 10);
  const permissionMode = process.env.DAEMON_WORKER_PERMISSION || undefined;
  const sandbox = process.env.DAEMON_WORKER_SANDBOX === "1";
  const sessionTimeoutMs = process.env.DAEMON_WORKER_TIMEOUT_MS ? parseInt(process.env.DAEMON_WORKER_TIMEOUT_MS, 10) : undefined;
  const createSessionOnStart = process.env.DAEMON_WORKER_CREATE_SESSION !== "0";
  const controller = new AbortController;
  const onSignal = () => controller.abort();
  process.on("SIGTERM", onSignal);
  process.on("SIGINT", onSignal);
  const opts = {
    dir,
    name,
    spawnMode,
    capacity,
    permissionMode,
    sandbox,
    sessionTimeoutMs,
    createSessionOnStart,
    getAccessToken: () => getClaudeAIOAuthTokens()?.accessToken,
    onAuth401: async (_failedToken) => {
      const tokens = getClaudeAIOAuthTokens();
      return !!tokens?.accessToken;
    },
    log: (s) => {
      console.log(`[remoteControl] ${s}`);
    }
  };
  try {
    await runBridgeHeadless(opts, controller.signal);
  } catch (err) {
    if (err instanceof BridgeHeadlessPermanentError) {
      console.error(`[remoteControl] permanent error: ${err.message}`);
      process.exitCode = EXIT_CODE_PERMANENT;
    } else {
      console.error(`[remoteControl] transient error: ${errorMessage(err)}`);
      process.exitCode = EXIT_CODE_TRANSIENT;
    }
  } finally {
    process.off("SIGTERM", onSignal);
    process.off("SIGINT", onSignal);
  }
}
export {
  runDaemonWorker
};
