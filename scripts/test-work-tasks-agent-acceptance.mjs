#!/usr/bin/env node
/**
 * 07-09 work-tasks-agent acceptance smoke (API + role gates).
 * Usage:
 *   node scripts/test-work-tasks-agent-acceptance.mjs
 * Env: ORG_CENTER_URL, ORG_ADMIN_USER/PASSWORD, EMPLOYEE_USERNAME/PASSWORD (from env.local)
 */
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

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

function assert(name, ok, detail = '') {
  const mark = ok ? 'PASS' : 'FAIL';
  console.log(`[${mark}] ${name}${detail ? ` — ${detail}` : ''}`);
  if (!ok) failures.push(name);
}

const failures = [];

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

  const empQuery = await api(empJwt, 'GET', '/api/work-tasks/query');
  assert('employee query denied', empQuery.status === 403, `status=${empQuery.status}`);

  const mgrQuery = await api(adminJwt, 'GET', '/api/work-tasks/query');
  assert('manager/admin query allowed', mgrQuery.status === 200, `status=${mgrQuery.status}`);

  const createSelf = await api(empJwt, 'POST', '/api/work-tasks', {
    title: `[agent-acceptance] self ${Date.now()}`,
    metadata: { source: 'agent', agent_id: 'work-tasks-agent', test: true },
  });
  assert('employee create self', createSelf.status === 201 || createSelf.status === 200, `status=${createSelf.status}`);

  let empUserId = empLogin.user?.id ?? null;
  let adminUserId = adminLogin.user?.id ?? null;
  if (!empUserId || !adminUserId) {
    try {
      const users = JSON.parse((await api(adminJwt, 'GET', '/api/users')).body);
      const list = users?.data ?? users;
      if (Array.isArray(list)) {
        empUserId = empUserId ?? list.find((u) => u.username === empUser)?.id ?? null;
        adminUserId = adminUserId ?? list.find((u) => u.username === adminUser)?.id ?? null;
      }
    } catch {
      /* optional */
    }
  }

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
    assert('manager assign other', mgrAssign.status === 201 || mgrAssign.status === 200, `status=${mgrAssign.status}`);
  } else {
    console.log('[SKIP] assign-other checks (user list incomplete)');
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
