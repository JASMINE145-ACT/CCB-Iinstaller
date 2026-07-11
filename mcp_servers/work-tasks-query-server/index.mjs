/**
 * MCP proxy for AionCore work-task APIs with role-based tool permissions.
 *
 * Env (AionUI / CCB):
 * - ORG_SERVER_URL — org VPS base URL (preferred)
 * - ORG_SESSION_TOKEN_FILE — JWT refreshed by desktop login
 *
 * Env (dev / fallback):
 * - AIONCORE_PORT (default 13400) with http://127.0.0.1:{port}
 * - AIONCORE_JWT — static JWT
 *
 * Optional:
 * - WORK_TASKS_AGENT_ROLE: employee | manager (overrides /api/auth/user)
 *
 * v2 tools: list_mine, brief (mine-only), get, resolve_assignee (manager).
 * Legacy: username===admin maps to manager until EIL is_admin (P4).
 */
import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';

const port = process.env.AIONCORE_PORT ?? '13400';
const staticJwt = process.env.AIONCORE_JWT ?? '';
const sessionTokenFile = process.env.ORG_SESSION_TOKEN_FILE ?? '';
const serverName = 'work-tasks-agent';
const serverVersion = '2.3.2';
const csrfCookieName = 'aionui-csrf-token';
const csrfHeaderName = 'x-csrf-token';
const BRIEF_ITEMS_CAP = 20;
let csrfTokenCache = null;

/**
 * Unwrap Org API envelopes. /api/auth/user returns { success, user };
 * many list endpoints return { success, data }.
 */
function unwrapPayload(parsed) {
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return parsed;
  }
  if (parsed.data !== undefined) return parsed.data;
  if (parsed.user !== undefined && typeof parsed.user === 'object') return parsed.user;
  return parsed;
}

function readUserFields(user) {
  const body = unwrapPayload(user) ?? user;
  return {
    id: body?.id ?? body?.user_id ?? null,
    username: body?.username ?? null,
    work_task_role: body?.work_task_role ?? null,
  };
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
    throw new Error('ORG session JWT missing — log in to Org SSO first');
  }
}

function roleCanQuery(role) {
  const normalized = String(role ?? 'employee').trim().toLowerCase();
  return normalized === 'admin' || normalized === 'manager';
}

async function resolveRole() {
  const forced = String(process.env.WORK_TASKS_AGENT_ROLE ?? '').trim().toLowerCase();
  if (forced) return forced;
  const fields = readUserFields(await fetchJson('GET', '/api/auth/user'));
  const stored = String(fields.work_task_role ?? 'employee').trim().toLowerCase();
  const username = String(fields.username ?? '').trim();
  // Legacy fallback until EIL is_admin (P4): admin username acts as manager for tool gates.
  return username.toLowerCase() === 'admin' ? 'manager' : stored;
}

function assertQueryPermission(role) {
  if (!roleCanQuery(role)) {
    throw new Error(`work_tasks_query forbidden for role=${role}`);
  }
}

function assertManagerPermission(role, toolName) {
  if (!roleCanQuery(role)) {
    throw new Error(`${toolName} forbidden for role=${role}`);
  }
}

async function resolveActor() {
  const fields = readUserFields(await fetchJson('GET', '/api/auth/user'));
  return {
    actor_user_id: fields.id,
    actor_username: fields.username,
    work_task_role: fields.work_task_role,
  };
}

function auditLog(payload) {
  const entry = {
    event: 'work_tasks_tool_audit',
    timestamp: new Date().toISOString(),
    agent_id: serverName,
    session_id: process.env.WORK_TASKS_AGENT_SESSION_ID ?? process.env.MCP_SESSION_ID ?? null,
    request_id: payload.request_id ?? randomUUID(),
    ...payload,
  };
  console.error(JSON.stringify(entry));
}

function mergeAgentMetadata(existing, action) {
  const base =
    existing && typeof existing === 'object' && !Array.isArray(existing) ? { ...existing } : {};
  return {
    ...base,
    source: base.source ?? 'agent',
    agent_id: base.agent_id ?? serverName,
    [action]: serverName,
  };
}

async function fetchJson(method, path, body) {
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
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`work-tasks request failed (${res.status}) ${method} ${path}: ${text}`);
  }
  const parsed = await res.json();
  return unwrapPayload(parsed);
}

function parseCsrfTokenFromSetCookie(headerValue) {
  if (!headerValue || typeof headerValue !== 'string') {
    return null;
  }
  const match = headerValue.match(new RegExp(`${csrfCookieName}=([^;]+)`));
  return match?.[1] ?? null;
}

async function ensureCsrfToken() {
  if (csrfTokenCache) {
    return csrfTokenCache;
  }
  const res = await fetch(`${baseUrl()}/api/auth/status`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`failed to bootstrap csrf token (${res.status}): ${text}`);
  }
  const setCookie = res.headers.get('set-cookie');
  const parsed = parseCsrfTokenFromSetCookie(setCookie);
  if (!parsed) {
    throw new Error('failed to parse csrf token cookie from /api/auth/status');
  }
  csrfTokenCache = parsed;
  return csrfTokenCache;
}

async function fetchQuery(params = {}) {
  const qs = new URLSearchParams();
  if (params.status) qs.set('status', params.status);
  if (params.assignee_id) qs.set('assignee_id', params.assignee_id);
  if (params.overdue) qs.set('overdue', 'true');
  const suffix = qs.toString() ? `?${qs.toString()}` : '';
  return fetchJson('GET', `/api/work-tasks/query${suffix}`);
}

/** Own tasks only — never uses /query. */
async function listMine(params = {}) {
  const qs = new URLSearchParams();
  qs.set('scope', 'mine');
  if (params.status) qs.set('status', params.status);
  return fetchJson('GET', `/api/work-tasks?${qs.toString()}`);
}

function isOverdueTask(task, now = Date.now()) {
  if (!task?.due_at) return false;
  if (task.status !== 'pending_accept' && task.status !== 'accepted') return false;
  return Number(task.due_at) < now;
}

/**
 * Brief from mine only (contract: must NOT call /query).
 * @param {object} [args]
 * @param {boolean} [args.overdue_only]
 */
async function buildBrief(args = {}) {
  const raw = await listMine({});
  const list = Array.isArray(raw) ? raw : Array.isArray(raw?.items) ? raw.items : [];
  const now = Date.now();
  let pending_accept = 0;
  let accepted = 0;
  let overdue_count = 0;
  for (const t of list) {
    if (t.status === 'pending_accept') pending_accept += 1;
    if (t.status === 'accepted') accepted += 1;
    if (isOverdueTask(t, now)) overdue_count += 1;
  }
  let items = list;
  if (args.overdue_only) {
    items = list.filter((t) => isOverdueTask(t, now));
  }
  items = items.slice(0, BRIEF_ITEMS_CAP);
  return {
    summary: {
      total: list.length,
      pending_accept,
      accepted,
      overdue_count,
    },
    items,
    capped: list.length > BRIEF_ITEMS_CAP && !args.overdue_only,
  };
}

async function getTask(id) {
  if (!id || typeof id !== 'string') {
    throw new Error('work_tasks_get requires id');
  }
  return fetchJson('GET', `/api/work-tasks/${encodeURIComponent(id)}`);
}

function normalizeUserList(raw) {
  const list = Array.isArray(raw) ? raw : Array.isArray(raw?.items) ? raw.items : [];
  return list.map((u) => ({
    user_id: u?.id ?? u?.user_id ?? null,
    username: u?.username ?? null,
    work_task_role: u?.work_task_role ?? null,
  }));
}

async function fetchUserList() {
  const raw = await fetchJson('GET', '/api/users');
  return normalizeUserList(raw);
}

async function resolveAssignee(username) {
  const name = String(username ?? '').trim();
  if (!name) {
    throw new Error('work_tasks_resolve_assignee requires username');
  }
  const list = await fetchUserList();
  const hit = list.find((u) => String(u?.username ?? '').toLowerCase() === name.toLowerCase());
  if (!hit) {
    throw new Error(`assignee not found for username=${name}`);
  }
  return {
    user_id: hit.user_id,
    username: hit.username,
    work_task_role: hit.work_task_role ?? null,
  };
}

/**
 * Manager roster for assignment — live Org directory, not env.local.
 * @param {{ role?: string, assignable_only?: boolean }} [args]
 */
async function listAssignees(args = {}) {
  const list = await fetchUserList();
  let items = list.filter((u) => u.user_id && u.username);
  const assignableOnly = args.assignable_only !== false;
  if (assignableOnly) {
    items = items.filter((u) => String(u.work_task_role ?? 'employee').toLowerCase() === 'employee');
  }
  const roleFilter = String(args.role ?? '').trim().toLowerCase();
  if (roleFilter) {
    items = items.filter((u) => String(u.work_task_role ?? '').toLowerCase() === roleFilter);
  }
  items.sort((a, b) => String(a.username).localeCompare(String(b.username)));
  return { items, count: items.length };
}

async function createTask(args = {}) {
  return fetchJson('POST', '/api/work-tasks', {
    title: args.title,
    description: args.description,
    status: args.status,
    assignee_id: args.assignee_id,
    due_at: args.due_at,
    metadata: mergeAgentMetadata(args.metadata, 'created_via'),
  });
}

async function editTask(args = {}) {
  if (!args.id || typeof args.id !== 'string') {
    throw new Error('work_tasks_edit requires id');
  }
  const body = {
    title: args.title,
    description: args.description,
    status: args.status,
    assignee_id: args.assignee_id,
    due_at: args.due_at,
  };
  if (args.metadata !== undefined) {
    body.metadata = mergeAgentMetadata(args.metadata, 'edited_via');
  }
  return fetchJson('PUT', `/api/work-tasks/${encodeURIComponent(args.id)}`, body);
}

function buildTools(canQuery) {
  const tools = [
    {
      name: 'work_tasks_create',
      description: 'Create a work task using current actor identity (JWT-derived).',
      inputSchema: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'Task title.' },
          description: { type: 'string', description: 'Optional task description.' },
          status: {
            type: 'string',
            description: 'Optional initial status (normally pending_accept).',
          },
          assignee_id: { type: 'string', description: 'Optional assignee user id.' },
          due_at: {
            type: 'integer',
            description: 'Optional due timestamp in milliseconds.',
          },
          metadata: {
            type: 'object',
            description: 'Optional structured metadata JSON object.',
          },
        },
        required: ['title'],
      },
    },
    {
      name: 'work_tasks_edit',
      description: 'Edit an existing work task using existing backend ACL rules.',
      inputSchema: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'Task id.' },
          title: { type: 'string', description: 'Optional new title.' },
          description: {
            oneOf: [{ type: 'string' }, { type: 'null' }],
            description: 'Optional description update; use null to clear.',
          },
          status: { type: 'string', description: 'Optional status update.' },
          assignee_id: {
            oneOf: [{ type: 'string' }, { type: 'null' }],
            description: 'Optional assignee update; null to unassign.',
          },
          due_at: {
            oneOf: [{ type: 'integer' }, { type: 'null' }],
            description: 'Optional due timestamp update; null to clear.',
          },
          metadata: {
            type: 'object',
            description: 'Optional metadata replacement object.',
          },
        },
        required: ['id'],
      },
    },
    {
      name: 'work_tasks_list_mine',
      description:
        'List the current actor own work tasks (GET scope=mine). Use for “我的任务”; never org-wide.',
      inputSchema: {
        type: 'object',
        properties: {
          status: {
            type: 'string',
            description: 'Optional status filter.',
          },
        },
      },
    },
    {
      name: 'work_tasks_brief',
      description:
        'Own-task brief summary (mine only). Must not use org query. Caps items at 20.',
      inputSchema: {
        type: 'object',
        properties: {
          overdue_only: {
            type: 'boolean',
            description: 'When true, items list only overdue own tasks.',
          },
        },
      },
    },
    {
      name: 'work_tasks_get',
      description: 'Get one work task by id (backend ACL enforced).',
      inputSchema: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'Task id.' },
        },
        required: ['id'],
      },
    },
  ];
  if (canQuery) {
    tools.push({
      name: 'work_tasks_query',
      description:
        'Manager-only organization query with status summary and optional overdue list.',
      inputSchema: {
        type: 'object',
        properties: {
          status: {
            type: 'string',
            description: 'Optional filter: pending_accept | accepted | completed | incomplete | deferred',
          },
          assignee_id: { type: 'string', description: 'Optional assignee user id filter.' },
          overdue_only: {
            type: 'boolean',
            description: 'When true, list only overdue items (summary still reflects full set).',
          },
        },
      },
    });
    tools.push({
      name: 'work_tasks_list_assignees',
      description:
        'Manager-only: list org users available for assignment (live /api/users). Default: employees only.',
      inputSchema: {
        type: 'object',
        properties: {
          role: {
            type: 'string',
            description: 'Optional filter: employee | manager | admin.',
          },
          assignable_only: {
            type: 'boolean',
            description: 'When true (default), only employees who can receive tasks.',
          },
        },
      },
    });
    tools.push({
      name: 'work_tasks_resolve_assignee',
      description: 'Manager-only: resolve username to user_id for assignment.',
      inputSchema: {
        type: 'object',
        properties: {
          username: { type: 'string', description: 'Exact org username to resolve.' },
        },
        required: ['username'],
      },
    });
  }
  return tools;
}

const server = new Server({ name: serverName, version: serverVersion }, { capabilities: { tools: {} } });

server.setRequestHandler(ListToolsRequestSchema, async () => {
  // Always advertise full catalog; RBAC enforced on CallTool (employees must see list_assignees exists).
  return { tools: buildTools(true) };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const name = request.params.name;
  const args = request.params.arguments ?? {};
  const role = await resolveRole();
  const requestId = randomUUID();
  let actor = null;
  try {
    actor = await resolveActor();
  } catch {
    actor = { actor_user_id: null, actor_username: null, work_task_role: role };
  }

  const auditBase = {
    request_id: requestId,
    tool_name: name,
    actor_user_id: actor.actor_user_id,
    actor_username: actor.actor_username,
    work_task_role: role,
    target_task_id: typeof args.id === 'string' ? args.id : null,
    target_assignee_id: typeof args.assignee_id === 'string' ? args.assignee_id : null,
  };

  try {
    if (name === 'work_tasks_create') {
      const data = await createTask(args);
      auditLog({ ...auditBase, result: 'ok', result_count: 1, task_id: data?.id ?? null });
      return {
        content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
      };
    }
    if (name === 'work_tasks_edit') {
      const data = await editTask(args);
      auditLog({ ...auditBase, result: 'ok', result_count: 1, task_id: data?.id ?? args.id ?? null });
      return {
        content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
      };
    }
    if (name === 'work_tasks_list_mine') {
      const data = await listMine({ status: args.status });
      const list = Array.isArray(data) ? data : Array.isArray(data?.items) ? data.items : [];
      auditLog({ ...auditBase, result: 'ok', result_count: list.length });
      return {
        content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
      };
    }
    if (name === 'work_tasks_brief') {
      const data = await buildBrief({ overdue_only: Boolean(args.overdue_only) });
      auditLog({ ...auditBase, result: 'ok', result_count: data.items.length });
      return {
        content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
      };
    }
    if (name === 'work_tasks_get') {
      const data = await getTask(args.id);
      auditLog({ ...auditBase, result: 'ok', result_count: 1, task_id: data?.id ?? args.id });
      return {
        content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
      };
    }
    if (name === 'work_tasks_list_assignees') {
      assertManagerPermission(role, 'work_tasks_list_assignees');
      const data = await listAssignees({
        role: args.role,
        assignable_only: args.assignable_only,
      });
      auditLog({ ...auditBase, result: 'ok', result_count: data.count });
      return {
        content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
      };
    }
    if (name === 'work_tasks_resolve_assignee') {
      assertManagerPermission(role, 'work_tasks_resolve_assignee');
      const data = await resolveAssignee(args.username);
      auditLog({
        ...auditBase,
        result: 'ok',
        result_count: 1,
        target_assignee_id: data.user_id,
      });
      return {
        content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
      };
    }
    if (name === 'work_tasks_query' || name === 'work_tasks_summary') {
      assertQueryPermission(role);
      const data = await fetchQuery({
        status: args.status,
        assignee_id: args.assignee_id,
        overdue: args.overdue_only ? true : undefined,
      });
      const count = Array.isArray(data?.items) ? data.items.length : 0;
      auditLog({ ...auditBase, result: 'ok', result_count: count });
      return {
        content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
      };
    }
    throw new Error(`Unknown tool: ${request.params.name}`);
  } catch (error) {
    auditLog({
      ...auditBase,
      result: 'error',
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
});

const transport = new StdioServerTransport();
await server.connect(transport);
