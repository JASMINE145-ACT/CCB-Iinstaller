import assert from "node:assert/strict";
import { once } from "node:events";
import { spawn } from "node:child_process";
import { createInterface } from "node:readline";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import test from "node:test";

const serverPath = new URL("./server.mjs", import.meta.url);

function startClient(runtime = process.execPath) {
  const child = spawn(runtime, [fileURLToPath(serverPath)], {
    stdio: ["pipe", "pipe", "pipe"],
  });
  const lines = createInterface({ input: child.stdout });
  const responses = [];
  const waiters = [];
  lines.on("line", (line) => {
    const value = JSON.parse(line);
    const waiter = waiters.shift();
    if (waiter) waiter(value);
    else responses.push(value);
  });
  child.on("exit", (code) => {
    while (waiters.length) {
      waiters.shift()({
        error: {
          code: "PROCESS_EXIT",
          message: `connector exited before responding (${code})`,
        },
      });
    }
  });

  return {
    child,
    async send(value, { raw = false } = {}) {
      child.stdin.write(`${raw ? value : JSON.stringify(value)}\n`);
      if (responses.length) return responses.shift();
      return new Promise((resolve) => waiters.push(resolve));
    },
    notify(value) {
      child.stdin.write(`${JSON.stringify(value)}\n`);
    },
    async close() {
      child.stdin.end();
      if (child.exitCode === null) await once(child, "exit");
    },
  };
}

function request(id, method, params = {}) {
  return { jsonrpc: "2.0", id, method, params };
}

function toolCall(id, name, args = {}) {
  return request(id, "tools/call", { name, arguments: args });
}

function contentJson(response) {
  assert.equal(response.result.isError, false);
  return JSON.parse(response.result.content[0].text);
}

test("MCP initialize, tools/list, and deterministic fixture tools", async (t) => {
  const client = startClient();
  t.after(() => client.close());

  const initialized = await client.send(request(1, "initialize", {}));
  assert.equal(initialized.result.protocolVersion, "2024-11-05");
  assert.equal(initialized.result.serverInfo.name, "manufacturing-scheduling");
  client.notify({ jsonrpc: "2.0", method: "notifications/initialized" });

  const listed = await client.send(request(2, "tools/list", {}));
  assert.deepEqual(
    listed.result.tools.map((item) => item.name),
    [
      "get_work_center_capacity",
      "list_work_orders",
      "build_schedule",
    ],
  );
  assert.ok(
    listed.result.tools.every(
      (item) =>
        item.inputSchema.type === "object" &&
        item.inputSchema.additionalProperties === false,
    ),
  );

  const capacity = contentJson(
    await client.send(toolCall(3, "get_work_center_capacity")),
  );
  assert.deepEqual(
    capacity.workCenters.map((item) => item.id),
    ["ASM", "CUT"],
  );
  assert.ok(capacity.workCenters.every((item) => item.capacityMinutes === 480));

  const orders = contentJson(await client.send(toolCall(4, "list_work_orders")));
  assert.deepEqual(
    orders.workOrders.map((item) => item.id),
    ["WO-100", "WO-200"],
  );

  const first = contentJson(await client.send(toolCall(5, "build_schedule")));
  const second = contentJson(await client.send(toolCall(6, "build_schedule")));
  assert.deepEqual(first, second);
  assert.deepEqual(
    first.operations.map(({ workOrderId, sequence, start, end }) => ({
      workOrderId,
      sequence,
      start,
      end,
    })),
    [
      {
        workOrderId: "WO-100",
        sequence: 10,
        start: "2026-07-06T08:00:00.000Z",
        end: "2026-07-06T10:00:00.000Z",
      },
      {
        workOrderId: "WO-100",
        sequence: 20,
        start: "2026-07-06T10:00:00.000Z",
        end: "2026-07-06T11:30:00.000Z",
      },
      {
        workOrderId: "WO-200",
        sequence: 10,
        start: "2026-07-06T10:00:00.000Z",
        end: "2026-07-06T11:00:00.000Z",
      },
      {
        workOrderId: "WO-200",
        sequence: 20,
        start: "2026-07-06T11:30:00.000Z",
        end: "2026-07-06T13:30:00.000Z",
      },
    ],
  );

  for (const centerId of ["CUT", "ASM"]) {
    const operations = first.operations
      .filter((item) => item.workCenterId === centerId)
      .sort((a, b) => a.start.localeCompare(b.start));
    for (let index = 1; index < operations.length; index += 1) {
      assert.ok(operations[index].start >= operations[index - 1].end);
    }
    assert.ok(
      operations.every(
        (item) =>
          item.start >= "2026-07-06T08:00:00.000Z" &&
          item.end <= "2026-07-06T16:00:00.000Z",
      ),
    );
  }
  for (const workOrderId of ["WO-100", "WO-200"]) {
    const operations = first.operations
      .filter((item) => item.workOrderId === workOrderId)
      .sort((a, b) => a.sequence - b.sequence);
    assert.ok(operations[1].start >= operations[0].end);
  }
});

test("bundled Bun runtime can execute the declared connector", async (t) => {
  const connectorDir = dirname(fileURLToPath(import.meta.url));
  const bun = resolve(connectorDir, "..", "..", "..", "..", "vendor", "bun", "bun.exe");
  const client = startClient(bun);
  t.after(() => client.close());
  const listed = await client.send(request(1, "tools/list"));
  assert.equal(listed.result.tools.length, 3);
});

test("protocol errors are stable and the process continues", async (t) => {
  const client = startClient();
  t.after(() => client.close());

  assert.equal((await client.send("{", { raw: true })).error.code, -32700);
  assert.equal(
    (await client.send(request(1, "unknown/method"))).error.code,
    -32601,
  );
  assert.equal(
    (await client.send(toolCall(2, "unknown_tool"))).error.code,
    -32601,
  );
  assert.equal(
    (
      await client.send(
        toolCall(3, "build_schedule", { workOrders: "not-an-array" }),
      )
    ).error.code,
    -32602,
  );
  for (const invalidWorkOrders of [
    [],
    [
      {
        id: "",
        due: "2026-07-06T16:00:00Z",
        operations: [
          { sequence: 10, workCenterId: "CUT", durationMinutes: 10 },
        ],
      },
    ],
    [
      {
        id: "WO-BAD-DATE",
        due: "0",
        operations: [
          { sequence: 10, workCenterId: "CUT", durationMinutes: 10 },
        ],
      },
    ],
    [
      {
        id: "WO-DUP-SEQ",
        due: "2026-07-06T16:00:00Z",
        operations: [
          { sequence: 10, workCenterId: "CUT", durationMinutes: 10 },
          { sequence: 10, workCenterId: "ASM", durationMinutes: 10 },
        ],
      },
    ],
  ]) {
    const invalid = await client.send(
      toolCall(30, "build_schedule", { workOrders: invalidWorkOrders }),
    );
    assert.equal(invalid.error.code, -32602);
    assert.equal(invalid.error.data.code, "INVALID_ARGUMENT");
  }
  const infeasible = await client.send(
    toolCall(4, "build_schedule", {
      workOrders: [
        {
          id: "WO-LONG",
          due: "2026-07-06T16:00:00Z",
          operations: [
            { sequence: 10, workCenterId: "CUT", durationMinutes: 500 },
          ],
        },
      ],
    }),
  );
  assert.equal(infeasible.error.code, -32602);
  assert.equal(infeasible.error.data.code, "CAPACITY_EXCEEDED");

  const continued = await client.send(request(5, "tools/list"));
  assert.equal(continued.result.tools.length, 3);
});
