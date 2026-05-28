// @bun
import {
  init_genericProcessUtils,
  isProcessRunning
} from "./chunk-b62vj92a.js";
import"./chunk-hnxmafvc.js";
import"./chunk-tv74hgw9.js";
import"./chunk-wd8mqz95.js";
import"./chunk-8tnsngw2.js";
import"./chunk-5z28bqne.js";
import"./chunk-qajrkk97.js";
import {
  errorMessage,
  init_debug,
  init_errors,
  init_slowOperations,
  isFsInaccessible,
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
  getClaudeConfigHomeDir,
  init_envUtils
} from "./chunk-hxhwzgnn.js";
import"./chunk-qx8z601m.js";
import"./chunk-cgm6758j.js";
import {
  __esm,
  __require
} from "./chunk-qp2qdcda.js";

// src/utils/udsClient.ts
import { createConnection } from "net";
import { readdir, readFile } from "fs/promises";
import { join } from "path";
function getSessionsDir() {
  return join(getClaudeConfigHomeDir(), "sessions");
}
async function listAllLiveSessions() {
  const dir = getSessionsDir();
  let files;
  try {
    files = await readdir(dir);
  } catch (e) {
    if (!isFsInaccessible(e)) {
      logForDebugging(`[udsClient] readdir failed: ${errorMessage(e)}`);
    }
    return [];
  }
  const results = [];
  for (const file of files) {
    if (!/^\d+\.json$/.test(file))
      continue;
    const pid = parseInt(file.slice(0, -5), 10);
    if (!isProcessRunning(pid)) {
      continue;
    }
    try {
      const raw = await readFile(join(dir, file), "utf8");
      const data = jsonParse(raw);
      results.push({
        pid,
        sessionId: data.sessionId,
        cwd: data.cwd,
        startedAt: data.startedAt,
        kind: data.kind,
        name: data.name,
        messagingSocketPath: data.messagingSocketPath,
        entrypoint: data.entrypoint,
        bridgeSessionId: data.bridgeSessionId,
        alive: true
      });
    } catch {}
  }
  return results;
}
async function listPeers() {
  const all = await listAllLiveSessions();
  return all.filter((s) => s.pid !== process.pid && s.messagingSocketPath != null);
}
async function isPeerAlive(socketPath, timeoutMs = 3000) {
  return new Promise((resolve) => {
    const conn = createConnection(socketPath, () => {
      const ping = { type: "ping", ts: new Date().toISOString() };
      conn.write(jsonStringify(ping) + `
`);
    });
    let resolved = false;
    const timer = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        conn.destroy();
        resolve(false);
      }
    }, timeoutMs);
    let buffer = "";
    conn.on("data", (chunk) => {
      buffer += chunk.toString();
      if (buffer.includes('"pong"')) {
        if (!resolved) {
          resolved = true;
          clearTimeout(timer);
          conn.end();
          resolve(true);
        }
      }
    });
    conn.on("error", () => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timer);
        resolve(false);
      }
    });
  });
}
async function sendToUdsSocket(targetSocketPath, message) {
  const data = typeof message === "string" ? message : jsonStringify(message);
  const udsMsg = {
    type: "text",
    data,
    ts: new Date().toISOString()
  };
  const { getUdsMessagingSocketPath } = await import("./chunk-b7kfr260.js");
  udsMsg.from = getUdsMessagingSocketPath();
  return new Promise((resolve, reject) => {
    const conn = createConnection(targetSocketPath, () => {
      conn.write(jsonStringify(udsMsg) + `
`, (err) => {
        conn.end();
        if (err)
          reject(err);
        else
          resolve();
      });
    });
    conn.on("error", (err) => {
      reject(new Error(`Failed to connect to peer at ${targetSocketPath}: ${errorMessage(err)}`));
    });
    conn.setTimeout(5000, () => {
      conn.destroy(new Error("Connection timed out"));
    });
  });
}
function connectToPeer(socketPath) {
  return new Promise((resolve, reject) => {
    const conn = createConnection(socketPath, () => {
      resolve(conn);
    });
    conn.on("error", reject);
    conn.setTimeout(5000, () => {
      conn.destroy(new Error("Connection timed out"));
    });
  });
}
function disconnectPeer(socket) {
  if (!socket.destroyed) {
    socket.end();
  }
}
var init_udsClient = __esm(() => {
  init_envUtils();
  init_debug();
  init_errors();
  init_genericProcessUtils();
  init_slowOperations();
});
init_udsClient();

export {
  sendToUdsSocket,
  listPeers,
  listAllLiveSessions,
  isPeerAlive,
  disconnectPeer,
  connectToPeer
};
