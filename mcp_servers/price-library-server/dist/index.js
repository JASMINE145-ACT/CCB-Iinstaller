import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema, } from "@modelcontextprotocol/sdk/types.js";
import { readFileSync } from "node:fs";
import { callPythonTool } from "./python-spawner.js";

const MUTATING_TOOLS = new Set([
    "upsert_price_library_item",
    "delete_price_library_item",
    "restore_price_library_item",
    "publish_price_library_draft",
    "apply_price_library_import",
    "revert_price_library_version",
]);

const CAP_PRICE_WRITE = "price_library.write";

function baseUrl() {
    const org = String(process.env.ORG_SERVER_URL ?? "").trim().replace(/\/$/, "");
    if (org) return org;
    const port = process.env.AIONCORE_PORT ?? "13400";
    return `http://127.0.0.1:${port}`;
}

function readSessionJwt() {
    const sessionTokenFile = process.env.ORG_SESSION_TOKEN_FILE ?? "";
    if (sessionTokenFile) {
        try {
            const fromFile = readFileSync(sessionTokenFile, "utf8").trim();
            if (fromFile) return fromFile;
        }
        catch {
            // fall through
        }
    }
    return process.env.AIONCORE_JWT ?? "";
}

function unwrapUser(parsed) {
    if (!parsed || typeof parsed !== "object") return parsed;
    if (parsed.user && typeof parsed.user === "object") return parsed.user;
    if (parsed.data && typeof parsed.data === "object") return parsed.data;
    return parsed;
}

async function assertPriceWriteAllowed(toolName) {
    const jwt = readSessionJwt();
    if (!jwt) {
        throw new Error(`${toolName} forbidden: ORG session JWT missing`);
    }
    const res = await fetch(`${baseUrl()}/api/auth/user`, {
        method: "GET",
        headers: {
            Accept: "application/json",
            Authorization: `Bearer ${jwt}`,
        },
    });
    if (!res.ok) {
        const text = await res.text();
        throw new Error(`${toolName} forbidden: auth/user ${res.status} ${text}`);
    }
    const user = unwrapUser(await res.json());
    if (user?.is_admin) return;
    const caps = Array.isArray(user?.capabilities) ? user.capabilities : [];
    if (caps.includes(CAP_PRICE_WRITE)) return;
    throw new Error(
        `${toolName} forbidden: need is_admin or capability ${CAP_PRICE_WRITE}`,
    );
}

const server = new Server({ name: "price-library-server", version: "1.0.1" }, { capabilities: { tools: {} } });

const confirmedSchema = {
    type: "boolean",
    description: "Must be true after the user confirms a shared draft mutation.",
};
const materialSchema = {
    type: "string",
    description: "Material / product code (aliases: material, product_code, code).",
};
const priceFieldProperties = {
    source_file: { type: "string", description: "Provenance workbook filename or path (learn-by-data / import)." },
    source_sheet: { type: "string", description: "Source worksheet name." },
    source_row: { type: "integer", description: "1-based row number in source_sheet." },
    is_preferred_price: { type: "boolean", description: "TRUE = default query row; FALSE = historical/superseded." },
    superseded_by_source: { type: "string", description: "When is_preferred_price=false, which source replaced this row." },
    material_code: { type: "string", description: "Material / product code." },
    description: { type: "string" },
    description_cn: { type: "string" },
    description_english: { type: "string" },
    product_type: { type: "string" },
    factory_inc_tax: { type: "number" },
    factory_exc_tax: { type: "number" },
    purchase_exc_tax: { type: "number" },
    profit_a: { type: "number" },
    price_a: { type: "number" },
    profit_b: { type: "number" },
    price_b: { type: "number" },
    profit_c: { type: "number" },
    price_c: { type: "number" },
    profit_d: { type: "number" },
    price_d: { type: "number" },
    profit_d_low: { type: "number" },
    price_d_low: { type: "number" },
    profit_e: { type: "number" },
    price_e: { type: "number" },
    local_profit: { type: "number" },
    local_exc_tax: { type: "number" },
    local_inc_tax: { type: "number" },
    rucika_pricelist_exc_vat11: { type: "number" },
    rucika_pricelist_inc_vat11: { type: "number" },
    rucika_discount: { type: "number" },
    rucika_quote_profit_1: { type: "number" },
    rucika_quote_price_1: { type: "number" },
    rucika_quote_profit_2: { type: "number" },
    rucika_quote_price_2: { type: "number" },
    pe_nominal_price: { type: "number" },
    pe_discount: { type: "number" },
    pe_factory_price: { type: "number" },
    unit: { type: "string" },
    volume: { type: "number" },
    raw_json: { type: "string" },
    supplier: { type: "string" },
};
server.setRequestHandler(ListToolsRequestSchema, () => ({
    tools: [
        {
            name: "get_price_library_active",
            description: "Fetch the published organization price library (GET /active). Read-only.",
            inputSchema: { type: "object", properties: {} },
        },
        {
            name: "get_price_library_draft",
            description: "Fetch the shared open draft and revision (price_admin only). Read-only.",
            inputSchema: { type: "object", properties: {} },
        },
        {
            name: "list_price_library_versions",
            description: "List published price library version history (version_id, version_number, published_at). Use before revert.",
            inputSchema: {
                type: "object",
                properties: {
                    limit: { type: "integer", description: "Optional max rows to return (newest first)." },
                },
            },
        },
        {
            name: "export_price_library",
            description: "Download the active price library as xlsx. Optional output_path to save on disk.",
            inputSchema: {
                type: "object",
                properties: {
                    output_path: { type: "string", description: "Optional absolute path to write the xlsx." },
                    file_path: { type: "string", description: "Alias for output_path." },
                },
            },
        },
        {
            name: "upsert_price_library_item",
            description: "Add or update one product in the shared draft by material_code. Without confirmed=true returns proposed diff only (does not mutate draft).",
            inputSchema: {
                type: "object",
                properties: {
                    material_code: materialSchema,
                    confirmed: confirmedSchema,
                    fields: { type: "object", properties: priceFieldProperties },
                    ...priceFieldProperties,
                },
                required: ["material_code"],
            },
        },
        {
            name: "delete_price_library_item",
            description: "Soft-delete one product from the shared draft (change_type delete). Requires confirmed=true to apply.",
            inputSchema: {
                type: "object",
                properties: {
                    material_code: materialSchema,
                    confirmed: confirmedSchema,
                },
                required: ["material_code"],
            },
        },
        {
            name: "restore_price_library_item",
            description: "Restore a soft-deleted product in the shared draft. Requires confirmed=true to apply.",
            inputSchema: {
                type: "object",
                properties: {
                    material_code: materialSchema,
                    confirmed: confirmedSchema,
                    fields: { type: "object", properties: priceFieldProperties },
                },
                required: ["material_code"],
            },
        },
        {
            name: "publish_price_library_draft",
            description: "Publish the shared draft to active (all users). Without confirmed=true returns revision summary only. Binds draft revision; HTTP 409 on stale revision — re-read draft, do not auto-replay.",
            inputSchema: {
                type: "object",
                properties: {
                    reason: {
                        type: "string",
                        description: "Audit reason shown in version history (optional).",
                    },
                    confirmed: confirmedSchema,
                },
            },
        },
        {
            name: "preview_price_library_import",
            description: "Preview xlsx import diff without mutating draft. Enforces path whitelist and size limit.",
            inputSchema: {
                type: "object",
                properties: {
                    file_path: { type: "string", description: "Absolute or workspace-relative .xlsx path." },
                    path: { type: "string", description: "Alias for file_path." },
                },
            },
        },
        {
            name: "apply_price_library_import",
            description: "Apply xlsx import to shared draft. Without confirmed=true returns preview summary only.",
            inputSchema: {
                type: "object",
                properties: {
                    file_path: { type: "string", description: "Absolute or workspace-relative .xlsx path." },
                    path: { type: "string", description: "Alias for file_path." },
                    confirmed: confirmedSchema,
                },
            },
        },
        {
            name: "revert_price_library_version",
            description: "Revert to a previous version by id. Creates a new active version.",
            inputSchema: {
                type: "object",
                properties: {
                    version_id: { type: "string", description: "Target historical version id to revert to." },
                    target_version_id: { type: "string", description: "Alias for version_id." },
                    reason: { type: "string", description: "Audit reason for revert." },
                    confirmed: confirmedSchema,
                },
                required: ["version_id"],
            },
        },
    ],
}));
function asRecord(value) {
    return value && typeof value === "object" ? value : {};
}
server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: rawArgs } = request.params;
    const args = asRecord(rawArgs);
    try {
        if (MUTATING_TOOLS.has(name)) {
            await assertPriceWriteAllowed(name);
        }
        const result = await callPythonTool(name, args);
        if (!result.success) {
            return {
                content: [{ type: "text", text: JSON.stringify({ error: result.error }, null, 2) }],
                isError: true,
            };
        }
        return {
            content: [{ type: "text", text: JSON.stringify(result.result, null, 2) }],
        };
    }
    catch (error) {
        return {
            content: [{ type: "text", text: JSON.stringify({ error: String(error) }, null, 2) }],
            isError: true,
        };
    }
});
const transport = new StdioServerTransport();
server.connect(transport).catch((error) => {
    console.error(error);
    process.exit(1);
});
