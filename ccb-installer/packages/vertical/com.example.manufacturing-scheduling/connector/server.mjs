import { createInterface } from "node:readline";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const protocolVersion = "2024-11-05";
const windowStart = Date.parse("2026-07-06T08:00:00Z");
const windowEnd = Date.parse("2026-07-06T16:00:00Z");
const minute = 60_000;
const utcTimestamp = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/;

const workCenters = Object.freeze([
  {
    id: "ASM",
    windowStart: new Date(windowStart).toISOString(),
    windowEnd: new Date(windowEnd).toISOString(),
    capacityMinutes: 480,
  },
  {
    id: "CUT",
    windowStart: new Date(windowStart).toISOString(),
    windowEnd: new Date(windowEnd).toISOString(),
    capacityMinutes: 480,
  },
]);

const fixtureWorkOrders = Object.freeze([
  {
    id: "WO-100",
    due: "2026-07-06T14:00:00Z",
    operations: [
      { sequence: 10, workCenterId: "CUT", durationMinutes: 120 },
      { sequence: 20, workCenterId: "ASM", durationMinutes: 90 },
    ],
  },
  {
    id: "WO-200",
    due: "2026-07-06T16:00:00Z",
    operations: [
      { sequence: 10, workCenterId: "CUT", durationMinutes: 60 },
      { sequence: 20, workCenterId: "ASM", durationMinutes: 120 },
    ],
  },
]);

const tools = Object.freeze([
  {
    name: "get_work_center_capacity",
    description: "Return deterministic work-center capacity windows.",
    inputSchema: {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: "list_work_orders",
    description: "Return deterministic manufacturing work orders.",
    inputSchema: {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: "build_schedule",
    description: "Build an earliest-due-date finite-capacity schedule.",
    inputSchema: {
      type: "object",
      properties: {
        workOrders: {
          type: "array",
          minItems: 1,
          items: {
            type: "object",
            required: ["id", "due", "operations"],
            properties: {
              id: { type: "string", minLength: 1 },
              due: {
                type: "string",
                pattern: "^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}Z$",
              },
              operations: {
                type: "array",
                minItems: 1,
                items: {
                  type: "object",
                  required: [
                    "sequence",
                    "workCenterId",
                    "durationMinutes",
                  ],
                  properties: {
                    sequence: { type: "integer" },
                    workCenterId: { enum: ["ASM", "CUT"] },
                    durationMinutes: { type: "integer", minimum: 1 },
                  },
                  additionalProperties: false,
                },
              },
            },
            additionalProperties: false,
          },
        },
      },
      additionalProperties: false,
    },
  },
]);

class SchedulingError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function validateArguments(args, allowed = []) {
  if (!args || typeof args !== "object" || Array.isArray(args)) {
    throw new SchedulingError("INVALID_ARGUMENT", "arguments must be an object");
  }
  const unknown = Object.keys(args).filter((key) => !allowed.includes(key));
  if (unknown.length) {
    throw new SchedulingError(
      "INVALID_ARGUMENT",
      `unknown argument: ${unknown[0]}`,
    );
  }
}

function validateWorkOrders(value) {
  if (!Array.isArray(value)) {
    throw new SchedulingError("INVALID_ARGUMENT", "workOrders must be an array");
  }
  if (value.length === 0) {
    throw new SchedulingError("INVALID_ARGUMENT", "workOrders cannot be empty");
  }
  const workOrderIds = new Set();
  for (const order of value) {
    const orderKeys = Object.keys(order ?? {});
    if (
      !order ||
      typeof order.id !== "string" ||
      order.id.trim().length === 0 ||
      workOrderIds.has(order.id) ||
      typeof order.due !== "string" ||
      !utcTimestamp.test(order.due) ||
      !Number.isFinite(Date.parse(order.due)) ||
      new Date(order.due).toISOString() !== order.due.replace("Z", ".000Z") ||
      !Array.isArray(order.operations) ||
      order.operations.length === 0 ||
      orderKeys.some((key) => !["id", "due", "operations"].includes(key))
    ) {
      throw new SchedulingError("INVALID_ARGUMENT", "invalid work order");
    }
    workOrderIds.add(order.id);
    const sequences = new Set();
    for (const operation of order.operations) {
      const operationKeys = Object.keys(operation ?? {});
      if (
        !Number.isInteger(operation.sequence) ||
        sequences.has(operation.sequence) ||
        !workCenters.some((item) => item.id === operation.workCenterId) ||
        !Number.isInteger(operation.durationMinutes) ||
        operation.durationMinutes <= 0 ||
        operationKeys.some(
          (key) =>
            !["sequence", "workCenterId", "durationMinutes"].includes(key),
        )
      ) {
        throw new SchedulingError("INVALID_ARGUMENT", "invalid operation");
      }
      sequences.add(operation.sequence);
    }
  }
}

export function buildSchedule(workOrders = fixtureWorkOrders) {
  validateWorkOrders(workOrders);
  const ordered = clone(workOrders).sort(
    (left, right) =>
      Date.parse(left.due) - Date.parse(right.due) ||
      left.id.localeCompare(right.id),
  );
  const centerAvailable = new Map(
    workCenters.map((item) => [item.id, windowStart]),
  );
  const operations = [];

  for (const workOrder of ordered) {
    let predecessorEnd = windowStart;
    const orderedOperations = [...workOrder.operations].sort(
      (left, right) => left.sequence - right.sequence,
    );
    for (const operation of orderedOperations) {
      const start = Math.max(
        predecessorEnd,
        centerAvailable.get(operation.workCenterId),
      );
      const end = start + operation.durationMinutes * minute;
      if (end > windowEnd) {
        throw new SchedulingError(
          "CAPACITY_EXCEEDED",
          `${workOrder.id}/${operation.sequence} does not fit in capacity window`,
        );
      }
      operations.push({
        workOrderId: workOrder.id,
        due: new Date(workOrder.due).toISOString(),
        sequence: operation.sequence,
        workCenterId: operation.workCenterId,
        durationMinutes: operation.durationMinutes,
        start: new Date(start).toISOString(),
        end: new Date(end).toISOString(),
      });
      centerAvailable.set(operation.workCenterId, end);
      predecessorEnd = end;
    }
  }
  return {
    algorithm: "earliest-due-date",
    planningDate: "2026-07-06",
    operations,
  };
}

function toolResult(value) {
  return {
    content: [{ type: "text", text: JSON.stringify(value) }],
    isError: false,
  };
}

function callTool(params) {
  if (!params || typeof params.name !== "string") {
    throw new SchedulingError("INVALID_ARGUMENT", "tool name is required");
  }
  const args = params.arguments ?? {};
  if (params.name === "get_work_center_capacity") {
    validateArguments(args);
    return toolResult({ workCenters: clone(workCenters) });
  }
  if (params.name === "list_work_orders") {
    validateArguments(args);
    return toolResult({ workOrders: clone(fixtureWorkOrders) });
  }
  if (params.name === "build_schedule") {
    validateArguments(args, ["workOrders"]);
    return toolResult(buildSchedule(args.workOrders ?? fixtureWorkOrders));
  }
  const error = new SchedulingError("METHOD_NOT_FOUND", `unknown tool: ${params.name}`);
  error.rpcCode = -32601;
  throw error;
}

function handle(request) {
  if (
    request?.jsonrpc === "2.0" &&
    !Object.hasOwn(request, "id")
  ) {
    return null;
  }
  if (
    !request ||
    request.jsonrpc !== "2.0" ||
    !Object.hasOwn(request, "id") ||
    typeof request.method !== "string"
  ) {
    return {
      jsonrpc: "2.0",
      id: request?.id ?? null,
      error: { code: -32602, message: "Invalid Request" },
    };
  }
  try {
    let result;
    if (request.method === "initialize") {
      result = {
        protocolVersion,
        capabilities: { tools: {} },
        serverInfo: { name: "manufacturing-scheduling", version: "0.1.0" },
      };
    } else if (request.method === "tools/list") {
      result = { tools: clone(tools) };
    } else if (request.method === "tools/call") {
      result = callTool(request.params);
    } else {
      return {
        jsonrpc: "2.0",
        id: request.id,
        error: { code: -32601, message: "Method not found" },
      };
    }
    return { jsonrpc: "2.0", id: request.id, result };
  } catch (error) {
    return {
      jsonrpc: "2.0",
      id: request.id,
      error: {
        code: error.rpcCode ?? -32602,
        message: error.message,
        data: { code: error.code ?? "INVALID_ARGUMENT" },
      },
    };
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  const input = createInterface({ input: process.stdin, crlfDelay: Infinity });
  input.on("line", (line) => {
    let response;
    try {
      response = handle(JSON.parse(line));
    } catch {
      response = {
        jsonrpc: "2.0",
        id: null,
        error: { code: -32700, message: "Parse error" },
      };
    }
    if (response) process.stdout.write(`${JSON.stringify(response)}\n`);
  });
}
