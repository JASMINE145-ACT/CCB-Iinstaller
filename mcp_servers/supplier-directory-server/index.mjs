/**
 * MCP proxy for Org supplier directory + logistics vehicles.
 *
 * Env:
 * - ORG_SERVER_URL 鈥?org VPS base URL (preferred)
 * - ORG_SESSION_TOKEN_FILE 鈥?JWT from desktop login
 * - AIONCORE_PORT / AIONCORE_JWT 鈥?local/dev fallback
 *
 * Writes: confirmed=false 鈫?preview only (no POST); confirmed=true 鈫?POST + CSRF.
 * Backend still enforces SUPPLIER_DIR_ADMIN_USERNAMES.
 */
import { readFileSync } from 'node:fs';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import {
  buildFieldDiff,
  isConfirmedTrue,
  previewOrApplyGate,
  SUPPLIER_COMPARE_FIELDS,
  VEHICLE_COMPARE_FIELDS,
} from './preview.mjs';

const port = process.env.AIONCORE_PORT ?? '13400';
const staticJwt = process.env.AIONCORE_JWT ?? '';
const sessionTokenFile = process.env.ORG_SESSION_TOKEN_FILE ?? '';
const serverName = 'supplier-directory';
const serverVersion = '1.1.0';
const csrfCookieName = 'aionui-csrf-token';
const csrfHeaderName = 'x-csrf-token';
let csrfTokenCache = null;

function unwrapPayload(parsed) {
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return parsed;
  }
  if (parsed.data !== undefined) return parsed.data;
  return parsed;
}

function baseUrl() {
  const org = String(process.env.ORG_SERVER_URL ?? '').trim().replace(/\/$/, '');
  if (org) return org;
  return `http://127.0.0.1:${port}`;
}

function readSessionJwt() {
  if (sessionTokenFile) {
    try {
      const fromFile = readFileSync(sessionTokenFile, 'utf8').trim();
      if (fromFile) return fromFile;
    } catch {
      // fall through
    }
  }
  return staticJwt;
}

function ensureJwt() {
  if (!readSessionJwt()) {
    throw new Error('ORG session JWT missing 鈥?log in to Org SSO first');
  }
}

async function fetchJson(method, path, body) {
  return fetchJsonAttempt(method, path, body, false);
}

async function fetchJsonAttempt(method, path, body, didRetryCsrf) {
  ensureJwt();
  const jwt = readSessionJwt();
  const needsCsrf = method !== 'GET' && method !== 'HEAD' && method !== 'OPTIONS';
  let csrfToken = null;
  if (needsCsrf) {
    csrfToken = await ensureCsrfToken();
  }
  const headers = {
    Accept: 'application/json',
    Authorization: `Bearer ${jwt}`,
  };
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }
  if (csrfToken) {
    headers[csrfHeaderName] = csrfToken;
    headers.Cookie = `${csrfCookieName}=${csrfToken}`;
  }
  const res = await fetch(`${baseUrl()}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  let parsed = null;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    parsed = { raw: text };
  }
  if (!res.ok) {
    if (needsCsrf && !didRetryCsrf && [401, 403, 419].includes(res.status)) {
      csrfTokenCache = null;
      return fetchJsonAttempt(method, path, body, true);
    }
    const msg =
      (parsed && (parsed.error || parsed.message || parsed.msg)) ||
      text ||
      res.statusText;
    throw new Error(`HTTP ${res.status}: ${msg}`);
  }
  return unwrapPayload(parsed);
}

function parseCsrfTokenFromSetCookie(headerValue) {
  if (!headerValue || typeof headerValue !== 'string') return null;
  const match = headerValue.match(new RegExp(`${csrfCookieName}=([^;]+)`));
  return match?.[1] ?? null;
}

async function ensureCsrfToken() {
  if (csrfTokenCache) return csrfTokenCache;
  const jwt = readSessionJwt();
  const res = await fetch(`${baseUrl()}/api/auth/status`, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      ...(jwt ? { Authorization: `Bearer ${jwt}` } : {}),
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`failed to bootstrap csrf token (${res.status}): ${text}`);
  }
  const parsed = parseCsrfTokenFromSetCookie(res.headers.get('set-cookie'));
  if (!parsed) {
    throw new Error('failed to parse csrf token cookie from /api/auth/status');
  }
  csrfTokenCache = parsed;
  return csrfTokenCache;
}

function qs(params) {
  const u = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === '') continue;
    u.set(k, String(v));
  }
  const s = u.toString();
  return s ? `?${s}` : '';
}

/** Expand compound queries so "閫佺鏉? hits rows mentioning 绠℃潗/pipa. */
function vehicleNeedles(query) {
  const q = String(query ?? '').trim();
  const needles = q.split(/\s+/).filter(Boolean);
  const extras = ['\u7ba1\u6750', 'pipa', 'pipe', '\u5efa\u6750'];
  const lower = q.toLowerCase();
  for (const t of extras) {
    if (lower.includes(t.toLowerCase()) && !needles.some((n) => n.toLowerCase() === t.toLowerCase())) {
      needles.push(t);
    }
  }
  return needles;
}

function matchVehiclesLocal(items, query, topN) {
  const needles = vehicleNeedles(query);
  if (!needles.length) return [];
  const scored = [];
  for (const v of items) {
    const hay = `${v.name_zh ?? ''} ${v.use_zh ?? ''} ${v.use_id ?? ''} ${v.load_zh ?? ''}`.toLowerCase();
    let score = 0;
    const hits = [];
    for (const n of needles) {
      if (hay.includes(n.toLowerCase())) {
        score += 2;
        hits.push(n);
      }
    }
    const nameL = String(v.name_zh ?? '').toLowerCase();
    if (needles.some((n) => n.includes('\u7ba1\u6750') || n.includes('pipa') || n === '\u7ba1')) {
      if (nameL.includes('\u6469\u6258') || nameL.includes('motor')) {
        score = Math.max(0, score - 5);
      } else if (score > 0) {
        score += 1;
      }
    }
    if (score > 0) {
      scored.push({ ...v, score, matched: hits });
    }
  }
  scored.sort((a, b) => b.score - a.score || String(a.name_zh).localeCompare(String(b.name_zh)));
  return scored.slice(0, topN);
}

function pickSupplierBody(args) {
  const body = { name_zh: String(args.name_zh ?? '').trim() };
  for (const f of SUPPLIER_COMPARE_FIELDS) {
    if (f === 'name_zh') continue;
    if (args[f] !== undefined) body[f] = args[f];
  }
  return body;
}

async function findSupplierByName(nameZh) {
  const listed = await fetchJson('GET', `/api/suppliers${qs({ q: nameZh })}`);
  const items = Array.isArray(listed?.items) ? listed.items : [];
  const key = String(nameZh).trim().toLowerCase().replace(/\s+/g, ' ');
  return (
    items.find((r) => String(r.name_zh ?? '').trim().toLowerCase().replace(/\s+/g, ' ') === key) ??
    null
  );
}

async function upsertSupplier(args) {
  const nameZh = String(args.name_zh ?? '').trim();
  if (!nameZh) throw new Error('name_zh is required');
  const proposed = pickSupplierBody(args);
  const existing = await findSupplierByName(nameZh);
  const preview = buildFieldDiff(existing, proposed, SUPPLIER_COMPARE_FIELDS);
  const gated = previewOrApplyGate(args.confirmed, preview);
  if (!isConfirmedTrue(args.confirmed)) {
    return gated;
  }
  const result = await fetchJson('POST', '/api/suppliers', {
    ...proposed,
    from_seed: false,
    force_overwrite: false,
  });
  return { ...gated, result };
}

function pickVehicleBody(args) {
  const body = { seed_key: String(args.seed_key ?? '').trim() };
  for (const f of VEHICLE_COMPARE_FIELDS) {
    if (f === 'seed_key') continue;
    if (args[f] !== undefined) body[f] = args[f];
  }
  return body;
}

async function findVehicleBySeedKey(seedKey) {
  const listed = await fetchJson('GET', '/api/logistics-vehicles');
  const items = Array.isArray(listed?.items) ? listed.items : [];
  return items.find((r) => String(r.seed_key ?? '') === seedKey) ?? null;
}

async function upsertVehicle(args) {
  const seedKey = String(args.seed_key ?? '').trim();
  if (!seedKey) throw new Error('seed_key is required');
  const proposed = pickVehicleBody(args);
  const existing = await findVehicleBySeedKey(seedKey);
  const preview = buildFieldDiff(existing, proposed, VEHICLE_COMPARE_FIELDS);
  const gated = previewOrApplyGate(args.confirmed, preview);
  if (!isConfirmedTrue(args.confirmed)) {
    return gated;
  }
  const result = await fetchJson('POST', '/api/logistics-vehicles', {
    ...proposed,
    from_seed: false,
    force_overwrite: false,
  });
  return { ...gated, result };
}

const TOOLS = [
  {
    name: 'suppliers_list',
    description:
      'List Org supplier directory factories. Optional q searches name/products/address/contact; optional category filter. Not price-library SKUs.',
    inputSchema: {
      type: 'object',
      properties: {
        q: { type: 'string', description: 'Search substring (e.g. 鍙屾灄)' },
        category: { type: 'string', description: 'Exact category label' },
      },
    },
  },
  {
    name: 'suppliers_get',
    description: 'Get one supplier by id.',
    inputSchema: {
      type: 'object',
      required: ['id'],
      properties: {
        id: { type: 'string' },
      },
    },
  },
  {
    name: 'suppliers_match_product',
    description:
      'Product-match factories with the shared Org scorer. Use for product keywords only, e.g. tugongbu/geotextile. Returns ranked snippets.',
    inputSchema: {
      type: 'object',
      required: ['q'],
      properties: {
        q: { type: 'string', description: 'Extracted product query, e.g. geotextile / tugongbu' },
        top_n: { type: 'number', description: 'Max hits (default 10)' },
      },
    },
  },
  {
    name: 'logistics_vehicles_list',
    description: 'List Org logistics vehicle catalog (Lalamove-style types).',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'logistics_vehicles_match',
    description:
      'Suggest vehicles for a use-case, e.g. pipe delivery. Prefers mid/heavy vehicles over motorcycle when query mentions guancai/pipa/pipe.',
    inputSchema: {
      type: 'object',
      required: ['q'],
      properties: {
        q: { type: 'string' },
        top_n: { type: 'number' },
      },
    },
  },
  {
    name: 'suppliers_upsert',
    description:
      'Create/update a factory row. confirmed=false returns field diff only (no POST). confirmed=true applies via Org API (whitelist + CSRF).',
    inputSchema: {
      type: 'object',
      required: ['name_zh'],
      properties: {
        name_zh: { type: 'string' },
        code: { type: 'string' },
        category: { type: 'string' },
        products_text: { type: 'string' },
        address: { type: 'string' },
        contact: { type: 'string' },
        phone: { type: 'string' },
        whatsapp: { type: 'string' },
        email: { type: 'string' },
        notes: { type: 'string' },
        grade: { type: 'string' },
        confirmed: {
          type: 'boolean',
          description: 'false=preview only; true=mutate',
        },
      },
    },
  },
  {
    name: 'logistics_vehicles_upsert',
    description:
      'Create/update a logistics vehicle by seed_key (e.g. lalamove:5). confirmed=false preview; confirmed=true apply.',
    inputSchema: {
      type: 'object',
      required: ['seed_key'],
      properties: {
        seed_key: { type: 'string' },
        sort_no: { type: 'number' },
        name_zh: { type: 'string' },
        name_id: { type: 'string' },
        load_zh: { type: 'string' },
        load_id: { type: 'string' },
        size_zh: { type: 'string' },
        size_id: { type: 'string' },
        use_zh: { type: 'string' },
        use_id: { type: 'string' },
        confirmed: { type: 'boolean' },
      },
    },
  },
];

const server = new Server({ name: serverName, version: serverVersion }, { capabilities: { tools: {} } });

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const name = request.params.name;
  const args = request.params.arguments ?? {};
  try {
    let data;
    if (name === 'suppliers_list') {
      data = await fetchJson(
        'GET',
        `/api/suppliers${qs({ q: args.q, category: args.category })}`,
      );
    } else if (name === 'suppliers_get') {
      if (!args.id) throw new Error('id is required');
      data = await fetchJson('GET', `/api/suppliers/${encodeURIComponent(args.id)}`);
    } else if (name === 'suppliers_match_product') {
      if (!String(args.q ?? '').trim()) throw new Error('q is required');
      data = await fetchJson(
        'GET',
        `/api/suppliers/match${qs({ q: args.q, top_n: args.top_n ?? 10 })}`,
      );
    } else if (name === 'logistics_vehicles_list') {
      data = await fetchJson('GET', '/api/logistics-vehicles');
    } else if (name === 'logistics_vehicles_match') {
      if (!String(args.q ?? '').trim()) throw new Error('q is required');
      const all = await fetchJson('GET', '/api/logistics-vehicles');
      const items = Array.isArray(all?.items) ? all.items : Array.isArray(all) ? all : [];
      const topN = Math.min(Math.max(Number(args.top_n) || 10, 1), 50);
      const matched = matchVehiclesLocal(items, args.q, topN);
      data = { query: String(args.q).trim(), total: matched.length, items: matched };
    } else if (name === 'suppliers_upsert') {
      data = await upsertSupplier(args);
    } else if (name === 'logistics_vehicles_upsert') {
      data = await upsertVehicle(args);
    } else {
      throw new Error(`Unknown tool: ${name}`);
    }
    return {
      content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      isError: true,
      content: [{ type: 'text', text: JSON.stringify({ error: message }, null, 2) }],
    };
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});



