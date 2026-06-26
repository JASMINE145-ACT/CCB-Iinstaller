// @bun
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

// src/ccb-api-server/SessionManager.js
import { randomUUID } from "crypto";
function createSessionManager() {
  const sessions = new Map;
  const subscribers = new Map;
  return {
    create() {
      const id = randomUUID();
      const session = {
        id,
        createdAt: Date.now(),
        lastActiveAt: Date.now(),
        messages: [],
        isRunning: false
      };
      sessions.set(id, session);
      subscribers.set(id, new Set);
      return session;
    },
    get(id) {
      return sessions.get(id);
    },
    delete(id) {
      const subs = subscribers.get(id);
      if (subs) {
        const payload = JSON.stringify({ type: "close", sessionId: id, reason: "deleted" });
        for (const client of [...subs]) {
          try {
            client.send(payload);
          } catch {
            subs.delete(client);
          }
        }
        subscribers.delete(id);
      }
      sessions.delete(id);
    },
    list() {
      return [...sessions.values()].map((s) => ({
        sessionId: s.id,
        createdAt: s.createdAt,
        lastActiveAt: s.lastActiveAt
      }));
    },
    count() {
      return sessions.size;
    },
    subscribe(sessionId, client) {
      if (!subscribers.has(sessionId))
        subscribers.set(sessionId, new Set);
      subscribers.get(sessionId).add(client);
    },
    unsubscribe(sessionId, client) {
      subscribers.get(sessionId)?.delete(client);
    },
    broadcast(sessionId, msg) {
      const subs = subscribers.get(sessionId);
      if (!subs?.size)
        return;
      const data = JSON.stringify(msg);
      for (const client of [...subs]) {
        try {
          client.send(data);
        } catch {
          subs.delete(client);
        }
      }
    }
  };
}

// src/ccb-api-server/health.js
var CCB_API_VERSION = "0.1.0";
function createHealth(deps) {
  return () => ({
    ok: true,
    version: CCB_API_VERSION,
    runtime: "ccb-runtime",
    sessions: deps.sessionManager.count()
  });
}

// src/ccb-api-server/Session.js
function createSessionRunner(id, runtime, sessionManager) {
  return {
    async runTurn(input) {
      const session = sessionManager.get(id);
      if (!session)
        throw new Error("session not found");
      if (session.isRunning)
        throw new Error("session busy");
      session.isRunning = true;
      session.lastActiveAt = Date.now();
      const history = session.messages.map((m) => ({ role: m.role, content: m.content }));
      let text = "";
      let usage = null;
      let stopReason = "end_turn";
      const stream = input.stream === true;
      try {
        for await (const ev of runtime.runTurn({
          user: input.user,
          history,
          stream,
          sessionId: id
        })) {
          sessionManager.broadcast(id, { type: "event", sessionId: id, event: ev });
          if (ev.type === "text_delta" && ev.text) {
            if (stream)
              text += ev.text;
          }
          if (ev.type === "turn_end") {
            text = ev.text || text;
            usage = ev.usage;
            stopReason = ev.stop_reason || "end_turn";
          }
          if (ev.type === "turn_aborted") {
            stopReason = "aborted";
            break;
          }
          if (ev.type === "error") {
            throw new Error(ev.error?.message || "runtime error");
          }
        }
        session.messages.push({ role: "user", content: input.user });
        if (stopReason !== "aborted") {
          session.messages.push({ role: "assistant", content: text });
        }
        session.lastActiveAt = Date.now();
        return { text, usage, stop_reason: stopReason };
      } finally {
        session.isRunning = false;
      }
    },
    abort() {
      return runtime.abort(id);
    }
  };
}

// src/ccb-api-server/http.js
var CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type"
};
function jsonResponse(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS }
  });
}
async function readJson(req) {
  try {
    return await req.json();
  } catch {
    return {};
  }
}
async function handleHttp(req, deps) {
  const url = new URL(req.url);
  const { pathname } = url;
  const method = req.method;
  if (method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS });
  }
  if (pathname === "/api/health" && method === "GET") {
    return jsonResponse(200, deps.health());
  }
  if (pathname === "/api/tools" && method === "GET") {
    const tools = await deps.tools();
    return jsonResponse(200, tools);
  }
  if (pathname === "/api/sessions" && method === "GET") {
    return jsonResponse(200, deps.sessionManager.list());
  }
  if (pathname === "/api/sessions" && method === "POST") {
    const session = deps.sessionManager.create();
    return jsonResponse(200, { sessionId: session.id, createdAt: session.createdAt });
  }
  const sessionMatch = pathname.match(/^\/api\/sessions\/([^/]+)$/);
  if (sessionMatch) {
    const sessionId = decodeURIComponent(sessionMatch[1]);
    const session = deps.sessionManager.get(sessionId);
    if (method === "GET") {
      if (!session)
        return jsonResponse(404, { error: "not_found", path: pathname });
      return jsonResponse(200, {
        sessionId: session.id,
        createdAt: session.createdAt,
        lastActiveAt: session.lastActiveAt,
        messageCount: session.messages.length
      });
    }
    if (method === "DELETE") {
      if (!session)
        return jsonResponse(404, { error: "not_found", path: pathname });
      deps.runtime.abort(sessionId);
      deps.sessionManager.delete(sessionId);
      return new Response(null, { status: 204, headers: CORS });
    }
  }
  const messagesMatch = pathname.match(/^\/api\/sessions\/([^/]+)\/messages$/);
  if (messagesMatch && method === "POST") {
    const sessionId = decodeURIComponent(messagesMatch[1]);
    const session = deps.sessionManager.get(sessionId);
    if (!session)
      return jsonResponse(404, { error: "not_found", path: pathname });
    const body = await readJson(req);
    const user = String(body.user || "").trim();
    if (!user)
      return jsonResponse(400, { error: "missing_user" });
    const runner = createSessionRunner(sessionId, deps.runtime, deps.sessionManager);
    try {
      const result = await runner.runTurn({
        user,
        stream: body.stream === true
      });
      return jsonResponse(200, result);
    } catch (err) {
      return jsonResponse(500, { error: err?.message || String(err) });
    }
  }
  const cancelMatch = pathname.match(/^\/api\/sessions\/([^/]+)\/cancel$/);
  if (cancelMatch && method === "POST") {
    const sessionId = decodeURIComponent(cancelMatch[1]);
    const session = deps.sessionManager.get(sessionId);
    if (!session)
      return jsonResponse(404, { error: "not_found", path: pathname });
    const aborted = deps.runtime.abort(sessionId);
    return jsonResponse(200, { aborted });
  }
  return jsonResponse(404, { error: "not_found", path: pathname });
}

// src/ccb-api-server/ws.js
var PING_INTERVAL_MS = 30000;
var PONG_TIMEOUT_MS = 60000;
function handleWsOpen(ws, deps) {
  const url = new URL(ws.data.url);
  const sessionId = url.searchParams.get("sessionId");
  if (!sessionId) {
    ws.close(1008, "sessionId required");
    return;
  }
  if (!deps.sessionManager.get(sessionId)) {
    ws.close(1008, "unknown session");
    return;
  }
  ws.data.sessionId = sessionId;
  ws.data.lastPongAt = Date.now();
  deps.sessionManager.subscribe(sessionId, ws);
  ws.send(JSON.stringify({ type: "subscribed", sessionId }));
  ws.data.pingTimer = setInterval(() => {
    if (Date.now() - (ws.data.lastPongAt ?? 0) >= PONG_TIMEOUT_MS) {
      if (ws.data.pingTimer)
        clearInterval(ws.data.pingTimer);
      try {
        ws.close(1000, "pong timeout");
      } catch {}
      return;
    }
    try {
      ws.send(JSON.stringify({ type: "ping" }));
    } catch {}
  }, PING_INTERVAL_MS);
}
function handleWsMessage(ws, raw, deps) {
  let msg;
  try {
    msg = JSON.parse(String(raw));
  } catch {
    return;
  }
  if (msg.type === "pong") {
    ws.data.lastPongAt = Date.now();
    return;
  }
  if (msg.type === "unsubscribe" && msg.sessionId) {
    deps.sessionManager.unsubscribe(msg.sessionId, ws);
    return;
  }
  if (msg.type === "subscribe" && msg.sessionId) {
    if (!deps.sessionManager.get(msg.sessionId))
      return;
    ws.data.sessionId = msg.sessionId;
    ws.data.lastPongAt = Date.now();
    deps.sessionManager.subscribe(msg.sessionId, ws);
    ws.send(JSON.stringify({ type: "subscribed", sessionId: msg.sessionId }));
  }
}
function handleWsClose(ws, deps) {
  if (ws.data.pingTimer)
    clearInterval(ws.data.pingTimer);
  if (ws.data.sessionId) {
    deps.sessionManager.unsubscribe(ws.data.sessionId, ws);
  }
}

// src/ccb-api-server/index.js
async function startCcbApiServer(options) {
  const port = Number(options.port);
  if (!Number.isFinite(port) || port <= 0) {
    throw new Error(`invalid port: ${options.port}`);
  }
  const host = options.host || "127.0.0.1";
  const log = options.log || ((line) => console.error(line));
  const ownsRuntime = !options.runtime;
  const runtime = options.runtime || await createRuntime({ enableMcp: options.enableMcp !== false });
  const sessionManager = createSessionManager();
  const health = createHealth({ sessionManager });
  const httpDeps = {
    runtime,
    sessionManager,
    health,
    tools: async () => runtime.getAllTools()
  };
  const wsDeps = { sessionManager };
  let server = null;
  const closePromise = new Promise((resolve2) => {
    server = Bun.serve({
      hostname: host,
      port,
      idleTimeout: 120,
      fetch(req, bunServer) {
        const url = new URL(req.url);
        if (url.pathname === "/ws") {
          const upgraded = bunServer.upgrade(req, { data: { url: req.url } });
          if (upgraded)
            return;
          return new Response("WS upgrade failed", { status: 400 });
        }
        return handleHttp(req, httpDeps);
      },
      websocket: {
        open(ws) {
          handleWsOpen(ws, wsDeps);
        },
        message(ws, raw) {
          handleWsMessage(ws, raw, wsDeps);
        },
        close(ws) {
          handleWsClose(ws, wsDeps);
        }
      }
    });
    resolve2(undefined);
  });
  await closePromise;
  log(`[ccb-api] listening on http://${host}:${port}`);
  let closed = false;
  async function shutdown() {
    if (closed)
      return;
    closed = true;
    try {
      server?.stop();
    } catch {}
    if (ownsRuntime) {
      await runtime.close();
    }
  }
  const onSignal = () => {
    shutdown().finally(() => process.exit(0));
  };
  process.on("SIGINT", onSignal);
  process.on("SIGTERM", onSignal);
  return {
    port,
    url: `http://${host}:${port}`,
    wsUrl: `ws://${host}:${port}/ws`,
    activeSessionCount: () => sessionManager.count(),
    close: shutdown
  };
}
export {
  startCcbApiServer,
  handleHttp,
  createSessionManager,
  createHealth
};
