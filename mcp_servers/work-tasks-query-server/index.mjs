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
const serverVersion = '2.1.0';
const csrfCookieName = 'aionui-csrf-token';
const csrfHeaderName = 'x-csrf-token';
let csrfTokenCache = null;
let cachedRole = null;

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
  if (cachedRole) return cachedRole;
  const user = await fetchJson('GET', '/api/auth/user');
  const stored = String(user?.work_task_role ?? 'employee').trim().toLowerCase();
  const username = String(user?.username ?? '').trim();
  cachedRole = username.toLowerCase() === 'admin' ? 'manager' : stored;
  return cachedRole;
}

function assertQueryPermission(role) {
  if (!roleCanQuery(role)) {
    throw new Error(`work_tasks_query forbidden for role=${role}`);
  }
}

async function resolveActor() {
  const user = await fetchJson('GET', '/api/auth/user');
  return {
    actor_user_id: user?.id ?? user?.user_id ?? null,
    actor_username: user?.username ?? null,
    work_task_role: user?.work_task_role ?? null,
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
  return parsed?.data ?? parsed;
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
  }
  return tools;
}

const server = new Server({ name: serverName, version: serverVersion }, { capabilities: { tools: {} } });

server.setRequestHandler(ListToolsRequestSchema, async () => {
  const role = await resolveRole();
  return { tools: buildTools(roleCanQuery(role)) };
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
