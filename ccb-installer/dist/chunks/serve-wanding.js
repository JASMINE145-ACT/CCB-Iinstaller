// @bun
// src/serve-wanding/index.js
import { existsSync as existsSync5 } from "fs";
import { join as join5 } from "path";
import { networkInterfaces } from "os";

// src/ccb-runtime/Config.js
import { existsSync, readFileSync } from "fs";
import { join, resolve, dirname } from "path";
import { fileURLToPath } from "url";
var DEFAULT_API_BASE = "https://api.minimaxi.com/anthropic";
var DEFAULT_MODEL = "minimax-m3";
var DEFAULT_MAX_TOKENS = 1024;
var AGENT_MAX_TOKENS = 8192;
var DEFAULT_TIMEOUT_MS = 30000;
var DEFAULT_MCP_ALLOW_LIST = ["quotation", "accurate"];
var RUNTIME_DIR = dirname(fileURLToPath(import.meta.url));
var DEFAULT_INSTALLER_DIR = resolve(RUNTIME_DIR, "../..");

class ConfigError extends Error {
  constructor(message) {
    super(message);
    this.name = "ConfigError";
  }
}
function resolvePaths(env = process.env) {
  const installerDir = env.CCB_INSTALLER_DIR || DEFAULT_INSTALLER_DIR;
  const claudeConfigDir = env.CLAUDE_CONFIG_DIR || (env.LOCALAPPDATA ? join(env.LOCALAPPDATA, "CCB-Wanding", ".claude") : "");
  return { installerDir, claudeConfigDir };
}
function loadConfig(env = process.env) {
  const apiKey = env.ANTHROPIC_AUTH_TOKEN || "";
  if (apiKey.length < 20) {
    throw new ConfigError("ANTHROPIC_AUTH_TOKEN missing or too short");
  }
  const apiBase = env.ANTHROPIC_BASE_URL || DEFAULT_API_BASE;
  if (!apiBase.startsWith("http://") && !apiBase.startsWith("https://")) {
    throw new ConfigError("ANTHROPIC_BASE_URL must be absolute");
  }
  const model = env.ANTHROPIC_DEFAULT_SONNET_MODEL || DEFAULT_MODEL;
  const maxTokens = Number(env.CCB_RUNTIME_MAX_TOKENS || DEFAULT_MAX_TOKENS);
  const timeoutMs = Number(env.CCB_RUNTIME_TIMEOUT_MS || DEFAULT_TIMEOUT_MS);
  return {
    apiBase,
    apiKey,
    model,
    maxTokens: Number.isFinite(maxTokens) && maxTokens > 0 ? maxTokens : DEFAULT_MAX_TOKENS,
    timeoutMs: Number.isFinite(timeoutMs) && timeoutMs > 0 ? timeoutMs : DEFAULT_TIMEOUT_MS
  };
}
function loadMcpConfigs(env = process.env, allowList = DEFAULT_MCP_ALLOW_LIST) {
  const { claudeConfigDir } = resolvePaths(env);
  if (!claudeConfigDir)
    return {};
  const settingsPath = join(claudeConfigDir, "settings.json");
  if (!existsSync(settingsPath))
    return {};
  try {
    const raw = readFileSync(settingsPath, "utf-8").replace(/^\uFEFF/, "").replace(/^\u9518\?/, "");
    const parsed = JSON.parse(raw);
    const all = parsed.mcpServers || {};
    const allowed = new Set(allowList);
    return Object.fromEntries(Object.entries(all).filter(([name]) => allowed.has(name)));
  } catch {
    return {};
  }
}

// src/ccb-runtime/ModelClient.js
class ApiError extends Error {
  constructor(status, body) {
    super(status === 0 ? body : `API ${status}: ${body}`);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}
function throwIfAborted(signal) {
  if (signal?.aborted) {
    throw Object.assign(new Error("Aborted"), { name: "AbortError" });
  }
}
function linkAbortSignal(external, timeoutMs) {
  const controller = new AbortController;
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  if (external) {
    if (external.aborted) {
      clearTimeout(timer);
      controller.abort();
    } else {
      external.addEventListener("abort", () => controller.abort(), { once: true });
    }
  }
  return {
    signal: controller.signal,
    cleanup: () => clearTimeout(timer)
  };
}
async function callApiSync(input) {
  const {
    apiBase,
    apiKey,
    model,
    maxTokens,
    system,
    messages,
    tools,
    signal,
    timeoutMs = 30000
  } = input;
  throwIfAborted(signal);
  const url = `${apiBase.replace(/\/$/, "")}/v1/messages`;
  const body = {
    model,
    max_tokens: maxTokens,
    stream: false,
    messages,
    ...system ? { system } : {},
    ...tools?.length ? { tools } : {}
  };
  const { signal: fetchSignal, cleanup } = linkAbortSignal(signal, timeoutMs);
  let res;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify(body),
      signal: fetchSignal
    });
  } catch (err) {
    if (err?.name === "AbortError") {
      throw Object.assign(new Error(err.message || "Aborted"), { name: "AbortError" });
    }
    throw err;
  } finally {
    cleanup();
  }
  const text = await res.text().catch(() => "");
  if (!res.ok) {
    throw new ApiError(res.status, text.slice(0, 300));
  }
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new ApiError(res.status, `invalid JSON: ${text.slice(0, 200)}`);
  }
  return {
    content: Array.isArray(data.content) ? data.content : [],
    usage: data.usage || { input_tokens: 0, output_tokens: 0 },
    stop_reason: data.stop_reason || "unknown",
    model: data.model || model
  };
}
function normalizeStreamPayload(data) {
  if (!data || typeof data !== "object") {
    return { type: "error", error: { type: "parse", message: "invalid stream payload" } };
  }
  const t = data.type;
  if (t === "ping")
    return { type: "ping" };
  if (t === "message_start") {
    return { type: "message_start", message: data.message };
  }
  if (t === "content_block_start") {
    return {
      type: "content_block_start",
      index: data.index,
      content_block: data.content_block
    };
  }
  if (t === "content_block_delta") {
    return {
      type: "content_block_delta",
      index: data.index,
      delta: data.delta
    };
  }
  if (t === "content_block_stop") {
    return { type: "content_block_stop", index: data.index };
  }
  if (t === "message_delta") {
    return {
      type: "message_delta",
      delta: data.delta,
      usage: data.usage
    };
  }
  if (t === "message_stop") {
    return { type: "message_stop" };
  }
  if (t === "error") {
    return { type: "error", error: data.error || { type: "unknown", message: "stream error" } };
  }
  return data;
}
async function* callApiStream(input) {
  const {
    apiBase,
    apiKey,
    model,
    maxTokens,
    system,
    messages,
    tools,
    signal,
    timeoutMs = 30000
  } = input;
  throwIfAborted(signal);
  const url = `${apiBase.replace(/\/$/, "")}/v1/messages`;
  const body = {
    model,
    max_tokens: maxTokens,
    stream: true,
    messages,
    ...system ? { system } : {},
    ...tools?.length ? { tools } : {}
  };
  const { signal: fetchSignal, cleanup } = linkAbortSignal(signal, timeoutMs);
  let res;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify(body),
      signal: fetchSignal
    });
  } catch (err) {
    cleanup();
    if (err?.name === "AbortError") {
      throw new ApiError(0, "aborted by session");
    }
    throw err;
  }
  if (!res.ok) {
    cleanup();
    const text = await res.text().catch(() => "");
    throw new ApiError(res.status, text.slice(0, 300));
  }
  if (!res.body) {
    cleanup();
    throw new ApiError(0, "empty stream body");
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder;
  let buffer = "";
  try {
    while (true) {
      throwIfAborted(signal);
      const { done, value } = await reader.read();
      if (done)
        break;
      buffer += decoder.decode(value, { stream: true });
      while (true) {
        const nl = buffer.indexOf(`
`);
        if (nl === -1)
          break;
        const line = buffer.slice(0, nl).replace(/\r$/, "");
        buffer = buffer.slice(nl + 1);
        if (!line.trim())
          continue;
        if (line.startsWith("event:"))
          continue;
        if (!line.startsWith("data:"))
          continue;
        const payload = line.slice(5).trim();
        if (!payload || payload === "[DONE]")
          continue;
        try {
          yield normalizeStreamPayload(JSON.parse(payload));
        } catch (e) {
          yield {
            type: "error",
            error: { type: "parse", message: e?.message || String(e) }
          };
        }
      }
    }
  } catch (err) {
    if (err?.name === "AbortError") {
      throw new ApiError(0, "aborted by session");
    }
    throw err;
  } finally {
    cleanup();
    try {
      reader.releaseLock();
    } catch {}
  }
}

// src/ccb-runtime/PromptAssembler.js
import { existsSync as existsSync2, readFileSync as readFileSync2 } from "fs";
import { join as join2 } from "path";
var DEFAULT_SYSTEM = "\u4F60\u662F CCB-Wanding\uFF0C\u4E07\u9F0E\u4E1A\u52A1 AI \u52A9\u624B\uFF0C\u4E13\u6CE8\u62A5\u4EF7\u3001\u5E93\u5B58\u3001Accurate \u6570\u636E\u3002";
function loadSystemPrompt(paths, options = {}) {
  if (options.override) {
    return { text: options.override, sources: ["override"] };
  }
  const candidates = [
    join2(paths.installerDir, "CLAUDE.md"),
    join2(paths.claudeConfigDir, "CLAUDE.md"),
    join2(paths.claudeConfigDir, "..", "CLAUDE.md")
  ];
  const parts = [];
  const sources = [];
  for (const p of candidates) {
    try {
      if (existsSync2(p)) {
        parts.push(readFileSync2(p, "utf-8").trim());
        sources.push(p);
      }
    } catch {}
  }
  let text = parts.join(`

`) || DEFAULT_SYSTEM;
  if (!parts.length)
    sources.push("fallback");
  if (options.prefix) {
    text = `${options.prefix.trim()}

${text}`;
  }
  return { text, sources };
}

// src/ccb-runtime/McpTransport.js
import { spawn } from "child_process";
function createMcpTransport(name, config) {
  const transport = {
    name,
    get framing() {
      return config.framing || "ndjson";
    },
    proc: null,
    buf: Buffer.alloc(0),
    pending: new Map,
    _nextId: 0,
    tools: null,
    _id() {
      return ++this._nextId;
    },
    _send(msg) {
      if (!this.proc?.stdin?.writable)
        return;
      try {
        this.proc.stdin.write(JSON.stringify(msg) + `
`);
      } catch {}
    },
    _handleMessage(msg) {
      if (msg.id != null && this.pending.has(msg.id)) {
        const { resolve: resolve2, reject } = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        if (msg.error) {
          reject(new Error(msg.error.message || JSON.stringify(msg.error)));
        } else {
          resolve2(msg.result);
        }
      }
    },
    _onData(chunk) {
      this.buf = Buffer.concat([this.buf, chunk]);
      while (true) {
        const idx = this.buf.indexOf(10);
        if (idx === -1)
          break;
        const line = this.buf.slice(0, idx).toString("utf-8").replace(/\r$/, "").trim();
        this.buf = this.buf.slice(idx + 1);
        if (!line)
          continue;
        try {
          this._handleMessage(JSON.parse(line));
        } catch {}
      }
    },
    async connect() {
      if (config.type === "http")
        return false;
      if (this.proc)
        return true;
      const env = { ...process.env, ...config.env || {} };
      this.proc = spawn(config.command, config.args || [], {
        env,
        cwd: config.cwd,
        stdio: ["pipe", "pipe", "pipe"]
      });
      this.proc.stdout.on("data", (c) => this._onData(c));
      this.proc.stderr.on("data", () => {});
      this.proc.on("exit", () => {
        this.proc = null;
        this.tools = null;
        for (const [, { reject }] of this.pending) {
          reject(new Error("MCP process exited"));
        }
        this.pending.clear();
      });
      try {
        await this._rpc("initialize", {
          protocolVersion: "2024-11-05",
          capabilities: { tools: {} },
          clientInfo: { name: "ccb-runtime", version: "1.0.0" }
        }, config.startupTimeoutMs || 30000);
        this._send({ jsonrpc: "2.0", method: "notifications/initialized", params: {} });
        return true;
      } catch {
        await this.close();
        return false;
      }
    },
    _rpc(method, params, timeout = 30000) {
      return new Promise((resolve2, reject) => {
        if (!this.proc) {
          reject(new Error("not connected"));
          return;
        }
        const id = this._id();
        const t = setTimeout(() => {
          this.pending.delete(id);
          reject(new Error(`timeout: ${method}`));
        }, timeout);
        this.pending.set(id, {
          resolve: (v) => {
            clearTimeout(t);
            resolve2(v);
          },
          reject: (e) => {
            clearTimeout(t);
            reject(e);
          }
        });
        this._send({ jsonrpc: "2.0", id, method, params });
      });
    },
    async ensureConnected() {
      if (this.proc)
        return true;
      return this.connect();
    },
    async listTools() {
      if (this.tools)
        return this.tools;
      if (!await this.ensureConnected())
        return [];
      try {
        const r = await this._rpc("tools/list", {});
        this.tools = r.tools || [];
        return this.tools;
      } catch {
        return [];
      }
    },
    async callTool(toolName, args, timeoutMs = 60000) {
      if (!await this.ensureConnected()) {
        throw new Error(`${name} unavailable`);
      }
      const r = await this._rpc("tools/call", { name: toolName, arguments: args }, timeoutMs);
      if (r.content) {
        return r.content.map((b) => b.text ?? JSON.stringify(b)).join(`
`);
      }
      return JSON.stringify(r);
    },
    async close() {
      if (this.proc) {
        try {
          this.proc.kill();
        } catch {}
        this.proc = null;
      }
      this.tools = null;
      this.buf = Buffer.alloc(0);
      for (const [, { reject }] of this.pending) {
        reject(new Error("MCP closed"));
      }
      this.pending.clear();
    }
  };
  return transport;
}

// src/ccb-runtime/McpManager.js
function createMcpManager() {
  const clients = new Map;
  return {
    init(configs) {
      clients.clear();
      for (const [name, cfg] of Object.entries(configs)) {
        if (cfg.type === "http")
          continue;
        clients.set(name, createMcpTransport(name, cfg));
      }
    },
    async getAllTools() {
      const all = [];
      for (const c of clients.values()) {
        try {
          all.push(...await c.listTools());
        } catch {}
      }
      return all;
    },
    findClient(toolName) {
      for (const c of clients.values()) {
        if (c.tools?.some((t) => t.name === toolName))
          return c;
      }
      return null;
    },
    async callTool(toolName, args) {
      if ([...clients.values()].some((c2) => c2.tools === null)) {
        await this.getAllTools();
      }
      const c = this.findClient(toolName);
      if (!c)
        throw new Error(`unknown tool: ${toolName}`);
      return c.callTool(toolName, args);
    },
    getStatus() {
      const result = {};
      for (const [name, c] of clients.entries()) {
        result[name] = {
          connected: !!c.proc,
          tools: c.tools?.map((t) => t.name) ?? null,
          framing: c.framing || "ndjson"
        };
      }
      return result;
    },
    async close() {
      for (const c of clients.values()) {
        await c.close();
      }
      clients.clear();
    }
  };
}

// src/ccb-runtime/ToolBridge.js
function toAnthropicTools(mcpTools) {
  return mcpTools.map((t) => ({
    name: t.name,
    description: t.description || "",
    input_schema: t.input_schema || t.inputSchema || { type: "object", properties: {} }
  }));
}

// src/ccb-runtime/AgentLoop.js
var MAX_ROUNDS_DEFAULT = 10;
var OVER_LIMIT_TEXT = "\uFF08\u5DE5\u5177\u8C03\u7528\u8F6E\u6B21\u8D85\u9650\uFF09";
function abortEvent(signal, sessionId, usage) {
  if (sessionId && signal?.aborted) {
    return { type: "turn_aborted", sessionId, usage };
  }
  return { type: "error", error: { name: "AbortError", message: "Aborted" } };
}
function asAbortEvent(err, signal, sessionId, usage) {
  if (err instanceof ApiError && err.status === 0 && String(err.body).includes("aborted")) {
    return abortEvent(signal, sessionId, usage);
  }
  if (err?.name === "AbortError") {
    return abortEvent(signal, sessionId, usage);
  }
  return null;
}
function blocksToContent(blocks) {
  const content = [];
  for (const idx of [...blocks.keys()].sort((a, b) => a - b)) {
    const b = blocks.get(idx);
    if (b.type === "text") {
      content.push({ type: "text", text: b.text || "" });
    } else if (b.type === "tool_use") {
      let input = {};
      try {
        input = JSON.parse(b.inputJson || "{}");
      } catch (e) {
        throw new Error(`tool input JSON parse failed: ${e?.message || String(e)}`);
      }
      content.push({ type: "tool_use", id: b.id, name: b.name, input });
    }
  }
  return content;
}
async function* streamApiRound(apiBase, loop, tools, signal, sessionId, usage) {
  const blocks = new Map;
  let stopReason = "end_turn";
  try {
    for await (const ev of callApiStream({
      ...apiBase,
      messages: loop,
      tools: tools.length ? tools : undefined
    })) {
      if (signal?.aborted) {
        yield { type: "turn_aborted", sessionId, usage };
        return;
      }
      if (ev.type === "message_start" && ev.message?.usage?.input_tokens) {
        usage.input_tokens += ev.message.usage.input_tokens;
      }
      if (ev.type === "content_block_start") {
        const cb = ev.content_block || {};
        blocks.set(ev.index, {
          type: cb.type,
          text: cb.text || "",
          inputJson: "",
          id: cb.id,
          name: cb.name
        });
      }
      if (ev.type === "content_block_delta") {
        const block = blocks.get(ev.index);
        if (!block)
          continue;
        if (ev.delta?.type === "text_delta" && ev.delta.text) {
          block.text = (block.text || "") + ev.delta.text;
          yield { type: "text_delta", text: ev.delta.text };
        }
        if (ev.delta?.type === "input_json_delta") {
          block.inputJson = (block.inputJson || "") + (ev.delta.partial_json || "");
        }
      }
      if (ev.type === "message_delta") {
        if (ev.delta?.stop_reason)
          stopReason = ev.delta.stop_reason;
        if (ev.usage?.output_tokens)
          usage.output_tokens += ev.usage.output_tokens;
      }
    }
  } catch (err) {
    const ev = asAbortEvent(err, signal, sessionId, usage);
    if (ev) {
      yield ev;
      return;
    }
    throw err;
  }
  let content;
  try {
    content = blocksToContent(blocks);
  } catch (e) {
    yield { type: "error", error: { name: "Error", message: e?.message || String(e) } };
    return;
  }
  yield {
    type: "__round_result__",
    resp: {
      content,
      stop_reason: stopReason,
      usage: { input_tokens: 0, output_tokens: 0 }
    }
  };
}
async function* runAgentLoop(input, options) {
  const {
    config,
    tools = [],
    mcpManager,
    signal,
    stream = false,
    sessionId
  } = options;
  const maxRounds = input.maxRounds ?? MAX_ROUNDS_DEFAULT;
  const system = input.system;
  let loop = [...input.history || [], { role: "user", content: input.user }];
  let tries = 0;
  let usage = { input_tokens: 0, output_tokens: 0 };
  const apiBase = {
    apiBase: config.apiBase,
    apiKey: config.apiKey,
    model: config.model,
    maxTokens: AGENT_MAX_TOKENS,
    timeoutMs: config.timeoutMs,
    system,
    signal
  };
  while (tries < maxRounds) {
    tries++;
    if (signal?.aborted) {
      yield abortEvent(signal, sessionId, usage);
      return;
    }
    let resp;
    if (stream) {
      let roundResp = null;
      for await (const ev of streamApiRound(apiBase, loop, tools, signal, sessionId, usage)) {
        if (ev.type === "__round_result__") {
          roundResp = ev.resp;
          continue;
        }
        if (ev.type === "turn_aborted" || ev.type === "error") {
          yield ev;
          return;
        }
        yield ev;
      }
      if (!roundResp)
        return;
      resp = roundResp;
    } else {
      try {
        resp = await callApiSync({
          ...apiBase,
          messages: loop,
          tools: tools.length ? tools : undefined
        });
      } catch (e) {
        const ev = asAbortEvent(e, signal, sessionId, usage);
        if (ev) {
          yield ev;
          return;
        }
        if (tools.length && tries === 1) {
          try {
            resp = await callApiSync({ ...apiBase, messages: loop });
          } catch (e2) {
            const ev2 = asAbortEvent(e2, signal, sessionId, usage);
            if (ev2) {
              yield ev2;
              return;
            }
            yield {
              type: "error",
              error: { name: e2?.name || "Error", message: e2?.message || String(e2) }
            };
            return;
          }
        } else {
          yield {
            type: "error",
            error: { name: e?.name || "Error", message: e?.message || String(e) }
          };
          return;
        }
      }
      usage = {
        input_tokens: usage.input_tokens + (resp.usage?.input_tokens || 0),
        output_tokens: usage.output_tokens + (resp.usage?.output_tokens || 0)
      };
    }
    const content = resp.content || [];
    const toolUses = content.filter((b) => b.type === "tool_use");
    if (!toolUses.length || resp.stop_reason !== "tool_use") {
      const text = content.filter((b) => b.type === "text").map((b) => b.text).join("");
      if (!stream) {
        yield { type: "text_delta", text };
      }
      yield { type: "turn_end", stop_reason: resp.stop_reason || "end_turn", text, usage };
      return;
    }
    const names = toolUses.map((t) => t.name).join(", ");
    yield { type: "tool_call_batch", names };
    for (const tu of toolUses) {
      yield { type: "tool_call_start", id: tu.id, name: tu.name, input: tu.input };
    }
    loop.push({ role: "assistant", content });
    const results = await Promise.all(toolUses.map(async (tu) => {
      try {
        if (!mcpManager)
          throw new Error("MCP not enabled");
        const text = await mcpManager.callTool(tu.name, tu.input || {});
        return {
          type: "tool_result",
          tool_use_id: tu.id,
          content: [{ type: "text", text }]
        };
      } catch (e) {
        const msg = e?.message || String(e);
        return {
          type: "tool_result",
          tool_use_id: tu.id,
          is_error: true,
          content: [{ type: "text", text: `\u5DE5\u5177\u9519\u8BEF: ${msg}` }]
        };
      }
    }));
    for (let i = 0;i < toolUses.length; i++) {
      const tu = toolUses[i];
      const r = results[i];
      const text = r.content?.[0]?.text ?? "";
      yield {
        type: "tool_result",
        toolUseId: tu.id,
        name: tu.name,
        text,
        isError: !!r.is_error
      };
    }
    loop.push({ role: "user", content: results });
  }
  yield { type: "text_delta", text: OVER_LIMIT_TEXT };
  yield { type: "turn_end", stop_reason: "max_rounds", text: OVER_LIMIT_TEXT, usage };
}

// src/ccb-runtime/AbortRegistry.js
function createAbortRegistry() {
  const sessions = new Map;
  return {
    register(sessionId, controller) {
      const prev = sessions.get(sessionId);
      if (prev && prev !== controller) {
        try {
          prev.abort();
        } catch {}
      }
      sessions.set(sessionId, controller);
    },
    abort(sessionId) {
      const controller = sessions.get(sessionId);
      if (!controller)
        return false;
      controller.abort();
      return true;
    },
    unregister(sessionId) {
      sessions.delete(sessionId);
    },
    activeCount() {
      return sessions.size;
    },
    abortAll() {
      for (const controller of sessions.values()) {
        try {
          controller.abort();
        } catch {}
      }
      sessions.clear();
    }
  };
}

// src/ccb-runtime/index.js
async function createRuntime(options = {}) {
  let config = { ...loadConfig(), ...options.config || {} };
  const paths = resolvePaths();
  if (options.installerDir)
    paths.installerDir = options.installerDir;
  const enableMcp = options.enableMcp === true;
  const allowList = options.mcpServerAllowList || DEFAULT_MCP_ALLOW_LIST;
  const systemPromptPrefix = options.systemPromptPrefix;
  const abortRegistry = createAbortRegistry();
  let mcpManager = null;
  let anthropicTools = [];
  if (enableMcp) {
    mcpManager = createMcpManager();
    const mcpConfigs = loadMcpConfigs(process.env, allowList);
    mcpManager.init(mcpConfigs);
    if (config.timeoutMs < 120000) {
      config = { ...config, timeoutMs: 120000 };
    }
  }
  async function resolveSystem(inputSystem) {
    if (inputSystem)
      return inputSystem;
    const { text } = loadSystemPrompt(paths, { prefix: systemPromptPrefix });
    return text;
  }
  async function ensureTools() {
    if (!mcpManager)
      return [];
    if (anthropicTools.length)
      return anthropicTools;
    const mcpTools = await mcpManager.getAllTools();
    anthropicTools = toAnthropicTools(mcpTools);
    return anthropicTools;
  }
  return {
    get mcpStatus() {
      return mcpManager?.getStatus() ?? {};
    },
    async listMcp() {
      if (!mcpManager)
        return { status: {}, tools: [] };
      const tools = await ensureTools();
      return { status: mcpManager.getStatus(), tools };
    },
    async getAllTools() {
      if (!mcpManager)
        return [];
      return mcpManager.getAllTools();
    },
    async runTextTurn({ user, history = [], system }) {
      const messages = [...history, { role: "user", content: user }];
      const resp = await callApiSync({
        apiBase: config.apiBase,
        apiKey: config.apiKey,
        model: config.model,
        maxTokens: config.maxTokens,
        timeoutMs: config.timeoutMs,
        system: system ?? await resolveSystem(),
        messages
      });
      const textBlock = resp.content.find((b) => b.type === "text");
      const text = textBlock?.text ?? "";
      return {
        text,
        usage: resp.usage,
        stop_reason: resp.stop_reason
      };
    },
    async* runTurn({
      user,
      history = [],
      system,
      maxRounds,
      stream = false,
      sessionId
    }) {
      const controller = sessionId ? new AbortController : null;
      if (sessionId && controller) {
        abortRegistry.register(sessionId, controller);
      }
      try {
        const resolvedSystem = await resolveSystem(system);
        const tools = enableMcp ? await ensureTools() : [];
        yield* runAgentLoop({ user, history, system: resolvedSystem, maxRounds, sessionId }, {
          config,
          tools,
          mcpManager: mcpManager ?? undefined,
          signal: controller?.signal,
          stream,
          sessionId
        });
      } finally {
        if (sessionId)
          abortRegistry.unregister(sessionId);
      }
    },
    abort(sessionId) {
      return abortRegistry.abort(sessionId);
    },
    activeAbortCount() {
      return abortRegistry.activeCount();
    },
    async close() {
      abortRegistry.abortAll();
      if (mcpManager) {
        await mcpManager.close();
        mcpManager = null;
      }
      anthropicTools = [];
    }
  };
}

// src/serve-wanding/config.js
import { join as join3, resolve as resolve2 } from "path";
var INSTALLER_DIR = resolve2(import.meta.dir, "../..");
var DATA_DIR = join3(INSTALLER_DIR, "web-data");
var SESSIONS_FILE = join3(DATA_DIR, "sessions.json");
var STATIC_DIR = process.env.CCB_WEB_DIST || resolve2(INSTALLER_DIR, "..", "ccb-wanding-web", "dist");
var CCB_STAGE = process.env.CCB_STAGE || "minimax";
var FAKE_REPLY = "\u4F60\u597D\uFF0C\u6211\u662F CCB-Wanding\u3002";
var MODEL = process.env.ANTHROPIC_DEFAULT_SONNET_MODEL || "minimax-m3";
var API_BASE = process.env.ANTHROPIC_BASE_URL || "https://api.minimaxi.com/anthropic";
var CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, x-user-id"
};
function enableMcpForStage(stage = CCB_STAGE) {
  return stage === "agent";
}

// src/serve-wanding/store.js
import { randomUUID } from "crypto";
import { mkdirSync, writeFileSync, readFileSync as readFileSync3, existsSync as existsSync3 } from "fs";
function idleRuntime() {
  return { is_processing: false, can_send_message: true, phase: "idle" };
}
function activeRuntime() {
  return { is_processing: true, can_send_message: false, phase: "validating" };
}
function defaultModel() {
  return { platform: "ccb-wanding", use_model: MODEL };
}
function createConversationStore() {
  let store = {};
  function load() {
    try {
      if (existsSync3(SESSIONS_FILE)) {
        store = JSON.parse(readFileSync3(SESSIONS_FILE, "utf-8"));
      }
    } catch {
      store = {};
    }
  }
  function save() {
    mkdirSync(DATA_DIR, { recursive: true });
    writeFileSync(SESSIONS_FILE, JSON.stringify(store, null, 2), "utf-8");
  }
  load();
  return {
    get(id) {
      return store[id];
    },
    create({ title = "\u65B0\u4F1A\u8BDD", userId = "local", type = "aionrs", model } = {}) {
      const now = new Date().toISOString();
      const conv = {
        id: randomUUID().replace(/-/g, "").slice(0, 16),
        title,
        userId,
        type,
        createdAt: now,
        updatedAt: now,
        messages: [],
        model: model || defaultModel(),
        runtime: idleRuntime()
      };
      store[conv.id] = conv;
      save();
      return conv;
    },
    delete(id) {
      delete store[id];
      save();
    },
    list({ userId } = {}) {
      return Object.values(store).filter((c) => !userId || c.userId === userId).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    },
    touch(conv) {
      conv.updatedAt = new Date().toISOString();
      save();
    },
    save
  };
}

// src/serve-wanding/aionui-events.js
function createEventEmitter(sendLegacy, sendAionUI) {
  return {
    userCreated(convId, message) {
      sendAionUI("message.userCreated", { conversation_id: convId, message });
    },
    runtimeStatus(convId, runtime) {
      sendAionUI("runtime.statusChanged", { conversation_id: convId, runtime });
    },
    streamStart(convId) {
      sendAionUI("message.stream", { conversation_id: convId, type: "start" });
      sendLegacy({ type: "start", sessionId: convId });
    },
    streamCommands(convId) {
      sendAionUI("message.stream", {
        conversation_id: convId,
        type: "available_commands",
        commands: []
      });
    },
    streamText(convId, content) {
      sendAionUI("message.stream", {
        conversation_id: convId,
        type: "text",
        content
      });
      sendLegacy({ type: "chunk", sessionId: convId, content });
    },
    streamFinish(convId) {
      sendAionUI("message.stream", { conversation_id: convId, type: "finish" });
    },
    agentCreated(convId, message) {
      sendAionUI("message.agentCreated", { conversation_id: convId, message });
    },
    turnCompleted(convId, runtime) {
      sendAionUI("turn.completed", { conversation_id: convId, runtime });
      sendLegacy({
        type: "done",
        sessionId: convId,
        duration: runtime?.duration_ms
      });
    },
    toolCalling(convId, tools) {
      sendLegacy({ type: "tool_calling", sessionId: convId, tools });
    },
    error(convId, error) {
      sendLegacy({ type: "error", sessionId: convId, error });
      sendAionUI("message.stream", { conversation_id: convId, type: "finish" });
    }
  };
}

// src/serve-wanding/turn-processor.js
async function processTurn(deps, convId, userText) {
  const { runtime, store, events } = deps;
  const conv = store.get(convId);
  if (!conv)
    throw new Error("conversation not found");
  conv.runtime = activeRuntime();
  store.touch(conv);
  const userMsg = {
    id: `u-${Date.now()}`,
    role: "user",
    type: "text",
    content: { content: userText, type: "text" },
    status: "finish",
    created_at: new Date().toISOString()
  };
  conv.messages.push(userMsg);
  events.userCreated(convId, userMsg);
  events.runtimeStatus(convId, { ...activeRuntime(), phase: "validating" });
  events.runtimeStatus(convId, { ...activeRuntime(), phase: "ready" });
  events.streamStart(convId);
  events.streamCommands(convId);
  const startTs = Date.now();
  let fullText = "";
  try {
    if (CCB_STAGE === "fake") {
      await new Promise((r) => setTimeout(r, 200));
      fullText = FAKE_REPLY;
      events.streamText(convId, fullText);
    } else {
      const history = conv.messages.slice(0, -1).map((m) => ({
        role: m.role,
        content: typeof m.content === "string" ? m.content : m.content?.content || ""
      }));
      for await (const ev of runtime.runTurn({
        user: userText,
        history,
        stream: true,
        sessionId: convId
      })) {
        if (ev.type === "text_delta" && ev.text) {
          fullText += ev.text;
          events.streamText(convId, ev.text);
        }
        if (ev.type === "tool_call_batch") {
          events.toolCalling(convId, ev.names);
        }
        if (ev.type === "turn_aborted") {
          events.streamFinish(convId);
          conv.runtime = idleRuntime();
          store.touch(conv);
          events.turnCompleted(convId, idleRuntime());
          return;
        }
        if (ev.type === "error") {
          throw new Error(ev.error?.message || "runtime error");
        }
      }
    }
  } catch (e) {
    events.error(convId, e?.message || String(e));
    conv.runtime = idleRuntime();
    store.touch(conv);
    events.streamFinish(convId);
    events.turnCompleted(convId, idleRuntime());
    return;
  }
  events.streamFinish(convId);
  const asstMsg = {
    id: `a-${Date.now()}`,
    role: "assistant",
    type: "text",
    content: { content: fullText, type: "text" },
    status: "finish",
    created_at: new Date().toISOString()
  };
  conv.messages.push(asstMsg);
  events.agentCreated(convId, asstMsg);
  if (conv.messages.filter((m) => m.role === "user").length === 1 && fullText) {
    conv.title = fullText.slice(0, 40) + (fullText.length > 40 ? "\u2026" : "");
  }
  conv.runtime = idleRuntime();
  store.touch(conv);
  events.turnCompleted(convId, {
    ...idleRuntime(),
    duration_ms: Date.now() - startTs
  });
}
function runtimeOptions(enableMcp) {
  return { enableMcp: enableMcp ?? enableMcpForStage() };
}

// src/serve-wanding/stubs.js
function authUser() {
  return {
    id: "system_default_user",
    name: "CCB-Wanding User",
    email: "local@ccb-wanding"
  };
}
function agentsList() {
  return [
    {
      id: "ccb-wanding",
      name: "CCB-Wanding",
      agent_type: "aionrs",
      handshake: {
        available_models: {
          current_model_id: MODEL,
          models: [{ id: MODEL, name: MODEL }]
        }
      }
    }
  ];
}
function providersList() {
  return [
    {
      id: "ccb-wanding",
      name: "CCB-Wanding",
      models: [MODEL],
      model_enabled: { [MODEL]: true },
      model_protocols: { [MODEL]: "anthropic" }
    }
  ];
}
function clientSettings() {
  return {
    aionrs: {
      defaultModel: { id: "ccb-wanding", use_model: MODEL },
      config: { preferredMode: "default" }
    },
    acp: {
      config: {
        "ccb-wanding": { preferredModelId: MODEL }
      }
    }
  };
}
function emptyArrayStub() {
  return [];
}
function emptyObjectStub() {
  return {};
}

// src/serve-wanding/http.js
function jsonOk(data, status = 200) {
  return Response.json(data, { status, headers: CORS });
}
function jsonData(data, status = 200) {
  return jsonOk({ data }, status);
}
function jsonErr(message, status = 404) {
  return jsonOk({ error: message }, status);
}
function convSummary(c) {
  const { messages, ...rest } = c;
  return {
    ...rest,
    model: c.model || defaultModel(),
    runtime: c.runtime || idleRuntime(),
    messageCount: messages?.length ?? 0
  };
}
function normalizeMessage(m) {
  const content = m.content;
  if (typeof content === "string") {
    return { ...m, content: { content, type: "text" } };
  }
  if (content && typeof content.content !== "string") {
    return { ...m, content: { content: String(content.content ?? ""), type: "text" } };
  }
  return m;
}
async function handleHTTP(req, url, ctx) {
  const p = url.pathname;
  const method = req.method;
  if (p === "/api/auth/user" && method === "GET")
    return jsonData(authUser());
  if (p === "/api/agents" && method === "GET")
    return jsonOk(agentsList());
  if (p === "/api/providers" && method === "GET")
    return jsonOk(providersList());
  if (p === "/api/settings/client" && method === "GET")
    return jsonOk(clientSettings());
  const emptyListPaths = [
    "/api/mcp/servers",
    "/api/mcp/agent-configs",
    "/api/mcp/oauth/authenticated",
    "/api/extensions/acp-adapters",
    "/api/extensions",
    "/api/skills",
    "/api/skills/builtin-auto",
    "/api/remote-agents",
    "/api/channel/plugins",
    "/api/cron/jobs",
    "/api/assistants"
  ];
  if (emptyListPaths.includes(p) && method === "GET")
    return jsonOk(emptyArrayStub());
  if (p === "/api/teams" && method === "GET")
    return jsonOk(emptyArrayStub());
  if (p === "/api/conversations" && method === "GET") {
    const items = ctx.store.list().map(convSummary);
    return jsonData({ items, total: items.length });
  }
  if (p === "/api/conversations" && method === "POST") {
    const body = await req.json().catch(() => ({}));
    const conv = ctx.store.create({
      title: body.name || body.title || "\u65B0\u4F1A\u8BDD",
      type: body.type || "aionrs",
      model: body.model || defaultModel()
    });
    return jsonData(convSummary(conv));
  }
  const convMatch = p.match(/^\/api\/conversations\/([^/]+)$/);
  if (convMatch) {
    const id = decodeURIComponent(convMatch[1]);
    const conv = ctx.store.get(id);
    if (!conv && method !== "DELETE")
      return jsonErr("not found", 404);
    if (method === "GET") {
      return jsonData({
        ...convSummary(conv),
        messages: conv.messages.map(normalizeMessage)
      });
    }
    if (method === "PATCH") {
      const body = await req.json().catch(() => ({}));
      if (body.title)
        conv.title = body.title;
      ctx.store.touch(conv);
      return jsonData(convSummary(conv));
    }
    if (method === "DELETE") {
      ctx.runtime.abort(id);
      ctx.store.delete(id);
      return jsonData({});
    }
  }
  const msgMatch = p.match(/^\/api\/conversations\/([^/]+)\/messages$/);
  if (msgMatch) {
    const id = decodeURIComponent(msgMatch[1]);
    const conv = ctx.store.get(id);
    if (!conv)
      return jsonErr("not found", 404);
    if (method === "GET") {
      return jsonData({
        items: conv.messages.map(normalizeMessage),
        total: conv.messages.length
      });
    }
    if (method === "POST") {
      const body = await req.json().catch(() => ({}));
      const text = String(body.content || "").trim();
      if (!text)
        return jsonErr("missing content", 400);
      if (conv.runtime?.is_processing)
        return jsonErr("busy", 409);
      conv.runtime = { ...activeRuntime(), is_processing: true, can_send_message: false };
      ctx.store.touch(conv);
      ctx.processTurn(id, text).catch((e) => console.error("[turn]", e?.message || e));
      return jsonData({
        runtime: conv.runtime,
        accepted: true
      });
    }
  }
  const cancelMatch = p.match(/^\/api\/conversations\/([^/]+)\/cancel$/);
  if (cancelMatch && method === "POST") {
    const id = decodeURIComponent(cancelMatch[1]);
    const conv = ctx.store.get(id);
    if (!conv)
      return jsonErr("not found", 404);
    ctx.runtime.abort(id);
    conv.runtime = idleRuntime();
    ctx.store.touch(conv);
    ctx.emitTurnCompleted(id);
    return jsonData({ cancelled: true, runtime: idleRuntime() });
  }
  const modelMatch = p.match(/^\/api\/conversations\/([^/]+)\/model$/);
  if (modelMatch && (method === "GET" || method === "PATCH" || method === "PUT" || method === "POST")) {
    const id = decodeURIComponent(modelMatch[1]);
    const conv = ctx.store.get(id);
    if (!conv)
      return jsonErr("not found", 404);
    if (method !== "GET") {
      const body = await req.json().catch(() => ({}));
      if (body.use_model)
        conv.model = { ...defaultModel(), ...conv.model, use_model: body.use_model };
    }
    return jsonData({
      use_model: conv.model?.use_model || MODEL,
      model_info: {
        current_model_id: conv.model?.use_model || MODEL,
        available_models: [MODEL]
      }
    });
  }
  const emptyConvSub = p.match(/^\/api\/conversations\/([^/]+)\/(artifacts|confirmations|approvals|side-question)$/);
  if (emptyConvSub && method === "GET")
    return jsonOk([]);
  if (p === "/api/sessions" && method === "GET") {
    return jsonOk(ctx.store.list().map(convSummary));
  }
  if (p === "/api/sessions" && method === "POST") {
    const body = await req.json().catch(() => ({}));
    const conv = ctx.store.create({ title: body.title || "\u65B0\u4F1A\u8BDD" });
    return jsonOk(convSummary(conv));
  }
  const sessionMatch = p.match(/^\/api\/sessions\/([^/]+)$/);
  if (sessionMatch) {
    const id = sessionMatch[1];
    const conv = ctx.store.get(id);
    if (method === "GET") {
      if (!conv)
        return jsonErr("not found", 404);
      return jsonOk({
        ...conv,
        messages: conv.messages.map((m) => ({
          role: m.role,
          content: typeof m.content === "string" ? m.content : m.content?.content ?? "",
          ts: m.created_at || m.ts
        }))
      });
    }
    if (method === "DELETE") {
      ctx.runtime.abort(id);
      ctx.store.delete(id);
      return jsonOk({});
    }
  }
  if (p === "/api/mcp/status" && method === "GET") {
    return jsonOk((await ctx.runtime.listMcp()).status);
  }
  if (p === "/api/mcp/tools" && method === "GET") {
    return jsonOk(await ctx.runtime.getAllTools());
  }
  if (p === "/api/system/info") {
    return jsonOk({ version: "1.0.0", model: MODEL, stage: CCB_STAGE });
  }
  if (p === "/debug/stage") {
    return jsonOk({
      stage: CCB_STAGE,
      model: MODEL,
      api_base: API_BASE,
      mcp_enabled: enableMcpForStage()
    });
  }
  const debugMcpMatch = p.match(/^\/debug\/mcp\/([^/]+)\/tools$/);
  if (debugMcpMatch && method === "GET") {
    const name = decodeURIComponent(debugMcpMatch[1]);
    const status = (await ctx.runtime.listMcp()).status;
    if (!status[name]) {
      return jsonOk({ name, ok: false, error: "not configured", tools: [] });
    }
    const tools = await ctx.runtime.getAllTools();
    return jsonOk({ name, ok: tools.length > 0, tools });
  }
  if (p.startsWith("/api/"))
    return jsonOk(emptyObjectStub());
  return null;
}

// src/serve-wanding/static.js
import { join as join4, extname } from "path";
import { existsSync as existsSync4, readFileSync as readFileSync4 } from "fs";
var MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2"
};
function serveStatic(pathname) {
  const safe = pathname === "/" ? "/index.html" : pathname;
  const file = join4(STATIC_DIR, safe.replace(/^\/+/, ""));
  if (!file.startsWith(STATIC_DIR) || !existsSync4(file)) {
    return new Response("Not Found", { status: 404 });
  }
  const body = readFileSync4(file);
  const type = MIME[extname(file)] || "application/octet-stream";
  return new Response(body, {
    headers: {
      "Content-Type": type,
      "Cache-Control": "no-store, max-age=0"
    }
  });
}

// src/serve-wanding/index.js
var wsClients = new Set;
function broadcastLegacy(payload) {
  const data = JSON.stringify(payload);
  for (const ws of wsClients) {
    try {
      ws.send(data);
    } catch {}
  }
}
function broadcastAionUI(name, data) {
  const payload = JSON.stringify({ name, data });
  for (const ws of wsClients) {
    try {
      ws.send(payload);
    } catch {}
  }
}
var events = createEventEmitter(broadcastLegacy, broadcastAionUI);
async function serveMain(args) {
  const port = Number(args.find((a) => a.startsWith("--port="))?.split("=")[1] ?? 3000);
  const host = args.find((a) => a.startsWith("--host="))?.split("=")[1] ?? "0.0.0.0";
  const store = createConversationStore();
  const runtime = await createRuntime(runtimeOptions());
  const stageLabel = CCB_STAGE === "fake" ? "fake \u2014 no MiniMax, no MCP" : CCB_STAGE === "minimax" ? "minimax \u2014 MiniMax enabled, MCP disabled" : "agent \u2014 MiniMax + MCP enabled";
  console.log(`[stage] ${stageLabel}`);
  function emitTurnCompleted(convId) {
    events.turnCompleted(convId, idleRuntime());
  }
  async function runTurn(convId, userText) {
    await processTurn({ runtime, store, events }, convId, userText);
  }
  const httpCtx = {
    store,
    runtime,
    processTurn: runTurn,
    emitTurnCompleted
  };
  Bun.serve({
    port,
    hostname: host,
    idleTimeout: 120,
    fetch(req, server) {
      const url = new URL(req.url);
      if (req.method === "OPTIONS") {
        return new Response(null, { status: 204, headers: CORS });
      }
      if (url.pathname === "/ws") {
        if (server.upgrade(req, { data: {} }))
          return;
        return new Response("WS upgrade failed", { status: 400 });
      }
      if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/debug/")) {
        return handleHTTP(req, url, httpCtx);
      }
      return serveStatic(url.pathname);
    },
    websocket: {
      open(ws) {
        wsClients.add(ws);
      },
      message(ws, raw) {
        let msg;
        try {
          msg = JSON.parse(String(raw));
        } catch {
          return;
        }
        if (msg.type === "ping") {
          ws.send(JSON.stringify({ type: "pong" }));
          return;
        }
        if (msg.type === "chat") {
          const conv = store.get(msg.sessionId);
          if (!conv) {
            broadcastLegacy({
              type: "error",
              error: "session not found",
              sessionId: msg.sessionId
            });
            return;
          }
          if (conv.runtime?.is_processing) {
            broadcastLegacy({
              type: "error",
              error: "session busy",
              sessionId: msg.sessionId
            });
            return;
          }
          runTurn(msg.sessionId, msg.message).catch((e) => console.error("[chat]", e?.message || e));
        }
        if (msg.type === "interrupt") {
          runtime.abort(msg.sessionId);
          const conv = store.get(msg.sessionId);
          if (conv) {
            conv.runtime = idleRuntime();
            store.touch(conv);
            emitTurnCompleted(msg.sessionId);
          }
        }
      },
      close(ws) {
        wsClients.delete(ws);
      }
    }
  });
  const uiOk = existsSync5(join5(STATIC_DIR, "index.html"));
  console.log(`
  CCB-Wanding Web`);
  console.log(`  \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500`);
  console.log(`  Local  : http://localhost:${port}`);
  console.log(`  Network: http://${getLocalIP()}:${port}`);
  console.log(`  Model  : ${MODEL}`);
  console.log(`  Stage  : ${CCB_STAGE}`);
  console.log(`  UI     : ${uiOk ? STATIC_DIR : "MISSING \u2014 run: ccb-wanding-web build"}`);
  console.log(`  \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500`);
  console.log(`  Press Ctrl+C to stop
`);
  await new Promise(() => {});
}
function getLocalIP() {
  try {
    for (const iface of Object.values(networkInterfaces()).flat()) {
      if (iface?.family === "IPv4" && !iface.internal)
        return iface.address;
    }
  } catch {}
  return "0.0.0.0";
}
export {
  serveMain
};
