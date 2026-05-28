// @bun
import {
  attachNdjsonFramer,
  init_ndjsonFramer
} from "./chunk-r854e43q.js";
import {
  errorMessage,
  init_cleanupRegistry,
  init_debug,
  init_errors,
  init_slowOperations,
  jsonParse,
  jsonStringify,
  logForDebugging,
  registerCleanup
} from "./chunk-5khwvj1z.js";
import"./chunk-fbv4apne.js";
import"./chunk-gzp6rza1.js";
import"./chunk-50dgek10.js";
import"./chunk-z0csm2zq.js";
import"./chunk-hxhwzgnn.js";
import"./chunk-qx8z601m.js";
import"./chunk-cgm6758j.js";
import {
  __esm,
  __require
} from "./chunk-qp2qdcda.js";

// src/utils/udsMessaging.ts
import { createServer } from "net";
import { mkdir, unlink } from "fs/promises";
import { dirname, join } from "path";
import { tmpdir } from "os";
function getDefaultUdsSocketPath() {
  return join(tmpdir(), "claude-code-socks", `${process.pid}.sock`);
}
function getUdsMessagingSocketPath() {
  return socketPath ?? undefined;
}
function setOnEnqueue(cb) {
  onEnqueueCb = cb;
}
function drainInbox() {
  const pending = inbox.filter((e) => e.status === "pending");
  for (const entry of pending) {
    entry.status = "processed";
  }
  return pending;
}
async function startUdsMessaging(path, opts) {
  if (server) {
    logForDebugging("[udsMessaging] server already running, skipping start");
    return;
  }
  await mkdir(dirname(path), { recursive: true });
  try {
    await unlink(path);
  } catch {}
  socketPath = path;
  await new Promise((resolve, reject) => {
    const srv = createServer((socket) => {
      clients.add(socket);
      logForDebugging(`[udsMessaging] client connected (total: ${clients.size})`);
      attachNdjsonFramer(socket, (msg) => {
        if (msg.type === "ping") {
          const pong = {
            type: "pong",
            from: socketPath ?? undefined,
            ts: new Date().toISOString()
          };
          if (!socket.destroyed) {
            socket.write(jsonStringify(pong) + `
`);
          }
          return;
        }
        const entry = {
          id: `uds-${nextId++}`,
          message: msg,
          receivedAt: Date.now(),
          status: "pending"
        };
        inbox.push(entry);
        logForDebugging(`[udsMessaging] enqueued message type=${msg.type} from=${msg.from ?? "unknown"}`);
        onEnqueueCb?.();
      }, (text) => jsonParse(text));
      socket.on("close", () => {
        clients.delete(socket);
      });
      socket.on("error", (err) => {
        clients.delete(socket);
        logForDebugging(`[udsMessaging] client error: ${errorMessage(err)}`);
      });
    });
    srv.on("error", reject);
    srv.listen(path, () => {
      server = srv;
      process.env.CLAUDE_CODE_MESSAGING_SOCKET = path;
      logForDebugging(`[udsMessaging] server listening on ${path}${opts?.isExplicit ? " (explicit)" : ""}`);
      resolve();
    });
  });
  registerCleanup(async () => {
    await stopUdsMessaging();
  });
}
async function stopUdsMessaging() {
  if (!server)
    return;
  for (const socket of clients) {
    socket.destroy();
  }
  clients.clear();
  await new Promise((resolve) => {
    server.close(() => resolve());
  });
  server = null;
  if (socketPath) {
    try {
      await unlink(socketPath);
    } catch {}
    delete process.env.CLAUDE_CODE_MESSAGING_SOCKET;
    logForDebugging(`[udsMessaging] server stopped, socket removed: ${socketPath}`);
    socketPath = null;
  }
}
async function sendUdsMessage(targetSocketPath, message) {
  const { createConnection } = await import("net");
  message.from = message.from ?? socketPath ?? undefined;
  message.ts = message.ts ?? new Date().toISOString();
  return new Promise((resolve, reject) => {
    const conn = createConnection(targetSocketPath, () => {
      conn.write(jsonStringify(message) + `
`, (err) => {
        conn.end();
        if (err)
          reject(err);
        else
          resolve();
      });
    });
    conn.on("error", reject);
    conn.setTimeout(5000, () => {
      conn.destroy(new Error("Connection timed out"));
    });
  });
}
var server = null, socketPath = null, onEnqueueCb = null, clients, inbox, nextId = 1;
var init_udsMessaging = __esm(() => {
  init_cleanupRegistry();
  init_debug();
  init_errors();
  init_ndjsonFramer();
  init_slowOperations();
  clients = new Set;
  inbox = [];
});
init_udsMessaging();

export {
  stopUdsMessaging,
  startUdsMessaging,
  setOnEnqueue,
  sendUdsMessage,
  getUdsMessagingSocketPath,
  getDefaultUdsSocketPath,
  drainInbox
};
