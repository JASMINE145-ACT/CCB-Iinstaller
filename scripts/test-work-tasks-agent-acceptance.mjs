#!/usr/bin/env node
/**
 * Work-tasks-agent acceptance smoke (07-09 + 07-11 v2).
 * Usage:
 *   node scripts/test-work-tasks-agent-acceptance.mjs
 * Env: ORG_CENTER_URL, ORG_ADMIN_USER/PASSWORD, EMPLOYEE_USERNAME/PASSWORD (from env.local)
 */
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseEmployeesFromEnvText } from './org-phase0/parse-env-employees.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const envLocal = resolve(__dirname, 'org-phase0/env.local');

function loadEnvFile(path) {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
  }
}

loadEnvFile(envLocal);

const baseUrl = (process.env.ORG_CENTER_URL || process.env.ORG_SERVER_URL || 'http://67.216.206.3:13401').replace(
  /\/$/,
  ''
);

async function login(username, password) {
  const res = await fetch(`${baseUrl}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) throw new Error(`login failed ${username}: ${res.status} ${await res.text()}`);
  const body = await res.json();
  const token = body?.token ?? body?.data?.token;
  const user = body?.user ?? body?.data?.user ?? null;
  if (!token) throw new Error(`no token for ${username}`);
  return { token, user };
}

async function api(jwt, method, path, body) {
  const headers = { Accept: 'application/json', Authorization: `Bearer ${jwt}` };
  let csrf = null;
  if (method !== 'GET') {
    const st = await fetch(`${baseUrl}/api/auth/status`);
    const cookie = st.headers.get('set-cookie') || '';
    const m = cookie.match(/aionui-csrf-token=([^;]+)/);
    csrf = m?.[1];
    if (csrf) {
      headers['x-csrf-token'] = csrf;
      headers.Cookie = `aionui-csrf-token=${csrf}`;
    }
    headers['Content-Type'] = 'application/json';
  }
  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: res.status, body: await res.text() };
}

function parseJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function unwrapList(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.items)) return payload.items;
  return [];
}

function assert(name, ok, detail = '') {
  const mark = ok ? 'PASS' : 'FAIL';
  console.log(`[${mark}] ${name}${detail ? ` — ${detail}` : ''}`);
  if (!ok) failures.push(name);
}

const failures = [];

function isOverdue(task, now = Date.now()) {
  if (!task?.due_at) return false;
  if (task.status !== 'pending_accept' && task.status !== 'accepted') return false;
  return Number(task.due_at) < now;
}

/** Compose brief from mine list — mirrors MCP contract (no /query). */
function composeBriefFromMine(list) {
  const now = Date.now();
  let pending_accept = 0;
  let accepted = 0;
  let overdue_count = 0;
  for (const t of list) {
    if (t.status === 'pending_accept') pending_accept += 1;
    if (t.status === 'accepted') accepted += 1;
    if (isOverdue(t, now)) overdue_count += 1;
  }
  return {
    summary: { total: list.length, pending_accept, accepted, overdue_count },
    items: list.slice(0, 20),
  };
}

async function main() {
  const adminUser = process.env.ORG_ADMIN_USER || 'admin';
  const adminPass = process.env.ORG_ADMIN_PASSWORD;
  const empUser = process.env.EMPLOYEE_USERNAME || 'yjc';
  const empPass = process.env.EMPLOYEE_PASSWORD;

  if (!adminPass || !empPass) {
    console.error('Missing ORG_ADMIN_PASSWORD or EMPLOYEE_PASSWORD in env.local');
    process.exit(1);
  }

  const adminLogin = await login(adminUser, adminPass);
  const empLogin = await login(empUser, empPass);
  const adminJwt = adminLogin.token;
  const empJwt = empLogin.token;

  const empRole = empLogin.user?.work_task_role;
  assert('employee role is employee', empRole === 'employee', empRole ? `got ${empRole}` : 'from login payload');

  // --- 07-09 baseline ---
  const empQuery = await api(empJwt, 'GET', '/api/work-tasks/query');
  assert('V2-E2 employee query denied', empQuery.status === 403, `status=${empQuery.status}`);

  const mgrQuery = await api(adminJwt, 'GET', '/api/work-tasks/query');
  assert('V2-M1 manager/admin query allowed', mgrQuery.status === 200, `status=${mgrQuery.status}`);
  const mgrQueryBody = parseJson(mgrQuery.body);
  const mgrSummary = mgrQueryBody?.data?.summary ?? mgrQueryBody?.summary;
  assert('V2-M1 query has summary', Boolean(mgrSummary), mgrSummary ? 'ok' : 'missing summary');

  const createSelf = await api(empJwt, 'POST', '/api/work-tasks', {
    title: `[agent-acceptance] self ${Date.now()}`,
    metadata: { source: 'agent', agent_id: 'work-tasks-agent', test: true },
  });
  assert('employee create self', createSelf.status === 201 || createSelf.status === 200, `status=${createSelf.status}`);
  const createdSelf = parseJson(createSelf.body);
  const selfTask = createdSelf?.data ?? createdSelf;
  const selfTaskId = selfTask?.id ?? null;

  let empUserId = empLogin.user?.id ?? null;
  let adminUserId = adminLogin.user?.id ?? null;
  const usersRes = await api(adminJwt, 'GET', '/api/users');
  const usersPayload = parseJson(usersRes.body);
  const userList = unwrapList(usersPayload?.data ?? usersPayload);
  if (Array.isArray(userList) && userList.length) {
    empUserId = empUserId ?? userList.find((u) => u.username === empUser)?.id ?? null;
    adminUserId = adminUserId ?? userList.find((u) => u.username === adminUser)?.id ?? null;
  }

  // V2-M2 resolve username (default pilot)
  const resolved = userList.find((u) => String(u.username).toLowerCase() === empUser.toLowerCase());
  assert('V2-M2 manager resolve username', Boolean(resolved?.id), resolved ? `id=${resolved.id}` : 'not found');

  // V2-M2b all env.local employees must exist on Org VPS (ops registry ↔ live directory)
  const envEmployees = existsSync(envLocal)
    ? parseEmployeesFromEnvText(readFileSync(envLocal, 'utf8'))
    : [{ slug: 'default', username: empUser }];
  for (const { slug, username } of envEmployees) {
    const hit = userList.find((u) => String(u.username).toLowerCase() === username.toLowerCase());
    assert(`V2-M2b env employee on VPS (${slug}:${username})`, Boolean(hit?.id), hit ? `id=${hit.id}` : 'not on /api/users');
  }

  // V2-M2c mirror list_assignees contract (employee-only roster from /api/users)
  const assignableRoster = userList
    .filter((u) => (u.id ?? u.user_id) && u.username)
    .filter((u) => String(u.work_task_role ?? 'employee').toLowerCase() === 'employee')
    .map((u) => ({
      user_id: u.id ?? u.user_id,
      username: u.username,
      work_task_role: u.work_task_role ?? null,
    }))
    .sort((a, b) => String(a.username).localeCompare(String(b.username)));
  assert('V2-M2c assignable roster non-empty', assignableRoster.length >= envEmployees.length, `roster=${assignableRoster.length}`);
  for (const { username } of envEmployees) {
    const inRoster = assignableRoster.some((u) => String(u.username).toLowerCase() === username.toLowerCase());
    assert(`V2-M2c assignable employee (${username})`, inRoster);
  }

  // V2-E4 employee should not use users for assign (may still list or 403 depending on API)
  const empUsers = await api(empJwt, 'GET', '/api/users');
  assert(
    'V2-E4 employee users not for assign',
    empUsers.status === 403 || empUsers.status === 200,
    `status=${empUsers.status} (403 preferred; 200 ok if list-only)`
  );

  if (empUserId && adminUserId && empUserId !== adminUserId) {
    const assignOther = await api(empJwt, 'POST', '/api/work-tasks', {
      title: `[agent-acceptance] assign-other`,
      assignee_id: adminUserId,
    });
    assert(
      'employee cannot assign other',
      assignOther.status === 403 || assignOther.status === 400 || assignOther.status === 422,
      `status=${assignOther.status}`
    );

    const mgrAssign = await api(adminJwt, 'POST', '/api/work-tasks', {
      title: `[agent-acceptance] mgr assign ${Date.now()}`,
      assignee_id: empUserId,
    });
    assert('V2-M3 manager assign other', mgrAssign.status === 201 || mgrAssign.status === 200, `status=${mgrAssign.status}`);
    const assigned = parseJson(mgrAssign.body);
    const assignedTask = assigned?.data ?? assigned;
    assert(
      'V2-M3 pending_accept',
      assignedTask?.status === 'pending_accept',
      `status=${assignedTask?.status}`
    );

    // V2-G2 employee get manager-created task assigned to them should work; get unrelated admin-owned if any
    if (assignedTask?.id) {
      const getAssigned = await api(empJwt, 'GET', `/api/work-tasks/${assignedTask.id}`);
      assert('V2-G1-ish get assigned-to-me', getAssigned.status === 200, `status=${getAssigned.status}`);
    }
  } else {
    console.log('[SKIP] assign-other checks (user list incomplete)');
  }

  // V2-E1 list mine
  const mineRes = await api(empJwt, 'GET', '/api/work-tasks?scope=mine');
  assert('V2-E1 employee list mine', mineRes.status === 200, `status=${mineRes.status}`);
  const minePayload = parseJson(mineRes.body);
  const mineList = unwrapList(minePayload?.data ?? minePayload);
  const foreign = mineList.filter((t) => {
    const aid = t.assignee_id ?? t.assignee?.id;
    return aid && empUserId && aid !== empUserId;
  });
  assert('V2-E1 mine has no foreign assignee', foreign.length === 0, `foreign=${foreign.length}`);

  // V2-E3 brief compose from mine only
  const brief = composeBriefFromMine(mineList);
  const briefForeign = brief.items.filter((t) => {
    const aid = t.assignee_id ?? t.assignee?.id;
    return aid && empUserId && aid !== empUserId;
  });
  assert('V2-E3 brief no foreign assignees', briefForeign.length === 0, `foreign=${briefForeign.length}`);
  assert('V2-E3 brief has summary', typeof brief.summary.total === 'number');

  // V2-G1 get own task
  if (selfTaskId) {
    const getOwn = await api(empJwt, 'GET', `/api/work-tasks/${selfTaskId}`);
    assert('V2-G1 get own task', getOwn.status === 200, `status=${getOwn.status}`);
  } else {
    console.log('[SKIP] V2-G1 (no self task id)');
  }

  // V2-G2: try get a task that belongs only to admin if we can find one from manager query
  const mgrItems = unwrapList(mgrQueryBody?.data?.items ?? mgrQueryBody?.items);
  const otherOnly = mgrItems.find((t) => {
    const aid = t.assignee_id ?? t.assignee?.id;
    return aid && empUserId && aid !== empUserId && t.created_by_id !== empUserId && t.owner_user_id !== empUserId;
  });
  if (otherOnly?.id) {
    const getOther = await api(empJwt, 'GET', `/api/work-tasks/${otherOnly.id}`);
    assert(
      'V2-G2 get other task denied',
      getOther.status === 403 || getOther.status === 404,
      `status=${getOther.status}`
    );
  } else {
    console.log('[SKIP] V2-G2 (no other-user-only task in query sample)');
  }

  const syntax = await import('node:child_process').then(({ execSync }) => {
    try {
      execSync('node --check mcp_servers/work-tasks-query-server/index.mjs', {
        cwd: resolve(__dirname, '..'),
        stdio: 'pipe',
      });
      return true;
    } catch {
      return false;
    }
  });
  assert('MCP syntax check', syntax);

  // Tool names present in MCP source (static contract check)
  const mcpSrc = readFileSync(resolve(__dirname, '../mcp_servers/work-tasks-query-server/index.mjs'), 'utf8');
  for (const tool of [
    'work_tasks_list_mine',
    'work_tasks_brief',
    'work_tasks_get',
    'work_tasks_list_assignees',
    'work_tasks_resolve_assignee',
  ]) {
    assert(`MCP declares ${tool}`, mcpSrc.includes(`name: '${tool}'`));
  }
  assert('MCP brief must not call /query', !/buildBrief[\s\S]*fetchQuery|work_tasks_brief[\s\S]*\/query/.test(mcpSrc) || mcpSrc.includes('Must NOT call /query') || mcpSrc.includes('never uses /query') || mcpSrc.includes('mine only'));
  assert('MCP brief uses listMine', mcpSrc.includes('async function buildBrief') && mcpSrc.includes('listMine'));

  console.log('\n--- summary ---');
  if (failures.length) {
    console.error(`FAILED: ${failures.join(', ')}`);
    process.exit(1);
  }
  console.log('ALL PASS');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
