/**
 * Unit tests for Org API envelope unwrap used by work-tasks MCP.
 * Run: node --test scripts/org-phase0/work-tasks-auth-unwrap.test.mjs
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const __dirname = dirname(fileURLToPath(import.meta.url));
const mcpPath = resolve(__dirname, '../../mcp_servers/work-tasks-query-server/index.mjs');
const src = readFileSync(mcpPath, 'utf8');

test('MCP source has unwrapPayload for {user} envelope', () => {
  assert.match(src, /function unwrapPayload/);
  assert.match(src, /parsed\.user/);
  assert.match(src, /serverVersion = '2\.3\.2'/);
});

test('unwrapPayload behavior mirrors inlined contract', () => {
  // Mirror of unwrapPayload — keep in sync with MCP (cannot import ESM side-effect server).
  function unwrapPayload(parsed) {
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return parsed;
    }
    if (parsed.data !== undefined) return parsed.data;
    if (parsed.user !== undefined && typeof parsed.user === 'object') return parsed.user;
    return parsed;
  }

  const authUser = {
    success: true,
    user: { id: 'system_default_user', username: 'admin', work_task_role: 'manager' },
  };
  const fields = unwrapPayload(authUser);
  assert.equal(fields.username, 'admin');
  assert.equal(fields.work_task_role, 'manager');

  const withData = { success: true, data: { items: [1] } };
  assert.deepEqual(unwrapPayload(withData), { items: [1] });

  // Bug that caused role=employee: treating envelope as user
  assert.equal(authUser.work_task_role, undefined);
  assert.equal(unwrapPayload(authUser).work_task_role, 'manager');
});
