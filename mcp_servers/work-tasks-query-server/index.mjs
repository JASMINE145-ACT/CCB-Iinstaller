/**
 * Read-only MCP proxy for AionCore manager work-task query API.
 * Requires AIONCORE_PORT (default 13400) and AIONCORE_JWT (manager token).
 */
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';

const port = process.env.AIONCORE_PORT ?? '13400';
const token = process.env.AIONCORE_JWT ?? '';

async function fetchQuery(params = {}) {
  const qs = new URLSearchParams();
  if (params.status) qs.set('status', params.status);
  if (params.assignee_id) qs.set('assignee_id', params.assignee_id);
  if (params.overdue) qs.set('overdue', 'true');
  const suffix = qs.toString() ? `?${qs.toString()}` : '';
  const headers = { Accept: 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`http://127.0.0.1:${port}/api/work-tasks/query${suffix}`, { headers });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`work-tasks query failed (${res.status}): ${text}`);
  }
  const body = await res.json();
  return body.data ?? body;
}

const server = new Server({ name: 'work-tasks-query', version: '1.0.0' }, { capabilities: { tools: {} } });

server.setRequestHandler(ListToolsRequestSchema, () => ({
  tools: [
    {
      name: 'work_tasks_summary',
      description:
        'Read-only manager overview of organization work tasks from AionCore. Returns status counts and optional overdue task list. Does not create or modify tasks.',
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
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name !== 'work_tasks_summary') {
    throw new Error(`Unknown tool: ${request.params.name}`);
  }
  const args = request.params.arguments ?? {};
  const data = await fetchQuery({
    status: args.status,
    assignee_id: args.assignee_id,
    overdue: args.overdue_only ? true : undefined,
  });
  return {
    content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
  };
});

const transport = new StdioServerTransport();
await server.connect(transport);
