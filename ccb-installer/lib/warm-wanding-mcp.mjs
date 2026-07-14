#!/usr/bin/env node
/**
 * Warm WanD MCP servers at app startup (quotation + accurate by default).
 * Mirrors ccb-installer/src/services/acp/wanDMcpWarmup.ts — stdio spawn only.
 *
 * Usage:
 *   node warm-wanding-mcp.mjs --servers=quotation,accurate
 * Env: CLAUDE_CONFIG_DIR, CCB_INSTALL_DIR (optional)
 */
import { spawn } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const WARMUP_CALL = {
  quotation: {
    toolName: 'match_quotation',
    arguments: { keywords: 'direct 50', customer_level: 'B' },
  },
  accurate: {
    toolName: 'accurate_summarize_records',
    arguments: {
      table_name: 'purchase-invoice',
      start_date: '01/01/2026',
      end_date: '31/01/2026',
      group_by: 'month',
      page_size: 10,
      max_pages: 1,
    },
  },
  'office-word': {},
  excel: {},
};

function resolveConfigDir() {
  if (process.env.CLAUDE_CONFIG_DIR) return process.env.CLAUDE_CONFIG_DIR;
  const local = process.env.LOCALAPPDATA;
  if (local) return join(local, 'CCB-Wanding', '.claude');
  return null;
}

function loadSettingsMcpServer(name, configDir) {
  try {
    const settingsPath = join(configDir, 'settings.json');
    const raw = readFileSync(settingsPath, 'utf8').replace(/^\uFEFF/, '');
    const settings = JSON.parse(raw);
    const cfg = settings.mcpServers?.[name];
    if (!cfg?.command || !Array.isArray(cfg.args)) return null;
    return {
      command: cfg.command,
      args: cfg.args,
      env: { ...process.env, ...(cfg.env ?? {}) },
    };
  } catch {
    return null;
  }
}

function truncateDetail(text, max = 240) {
  const oneLine = String(text || '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!oneLine) return '';
  return oneLine.length > max ? `${oneLine.slice(0, max)}…` : oneLine;
}

function warmOneMcpServer(serverName, configDir) {
  const cfg = loadSettingsMcpServer(serverName, configDir);
  const warmupCall = WARMUP_CALL[serverName];
  if (!cfg || !warmupCall) {
    return Promise.resolve({ server: serverName, ok: false, detail: 'not configured', ms: 0 });
  }

  const started = Date.now();
  return new Promise((resolve) => {
    const child = spawn(cfg.command, cfg.args, {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: cfg.env,
    });
    let settled = false;
    let stdout = '';
    let stderr = '';
    const finish = (ok, detail) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      try {
        child.kill();
      } catch {
        // ignore
      }
      resolve({ server: serverName, ok, detail, ms: Date.now() - started });
    };

    const timer = setTimeout(() => finish(false, 'timeout 120s'), 120_000);

    child.stdout?.on('data', (chunk) => {
      const text = String(chunk);
      stdout += text;
      if (text.includes('"id":2')) {
        finish(true, 'warmed');
      }
    });
    child.stderr?.on('data', (chunk) => {
      stderr += String(chunk);
    });
    child.on('error', (err) => {
      finish(false, err.message);
    });
    // Fail fast when the process dies before tools/call responds (e.g. missing pywintypes).
    child.on('close', (code, signal) => {
      if (settled) return;
      const hint =
        truncateDetail(stderr) ||
        truncateDetail(stdout) ||
        (signal ? `signal ${signal}` : `exit ${code ?? 'unknown'}`);
      finish(false, hint || `exit ${code ?? 'unknown'}`);
    });

    try {
      child.stdin.write(
        `${JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'initialize',
          params: {
            protocolVersion: '2024-11-05',
            capabilities: {},
            clientInfo: { name: 'wande-mcp-warmup', version: '1' },
          },
        })}\n`,
      );
      child.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' })}\n`);
      child.stdin.write(
        `${JSON.stringify(
          warmupCall.toolName
            ? {
                jsonrpc: '2.0',
                id: 2,
                method: 'tools/call',
                params: {
                  name: warmupCall.toolName,
                  arguments: warmupCall.arguments ?? {},
                },
              }
            : {
                jsonrpc: '2.0',
                id: 2,
                method: 'tools/list',
              },
        )}\n`,
      );
    } catch (err) {
      finish(false, err instanceof Error ? err.message : String(err));
    }
  });
}

function parseServersArg(argv) {
  const flag = argv.find((a) => a.startsWith('--servers='));
  if (!flag) return ['quotation', 'accurate'];
  return flag
    .slice('--servers='.length)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

async function main() {
  const configDir = resolveConfigDir();
  if (!configDir || !existsSync(join(configDir, 'settings.json'))) {
    console.error('[warm-wanding-mcp] missing settings.json');
    process.exit(1);
  }

  const servers = parseServersArg(process.argv.slice(2));
  const results = [];
  for (const name of servers) {
    const result = await warmOneMcpServer(name, configDir);
    results.push(result);
    const status = result.ok ? 'PASS' : 'FAIL';
    console.log(`[warm-wanding-mcp] ${status} ${name} ${result.ms}ms ${result.detail}`);
  }

  const ok = results.every((r) => r.ok);
  process.exit(ok ? 0 : 2);
}

main().catch((err) => {
  console.error('[warm-wanding-mcp] fatal:', err);
  process.exit(1);
});
