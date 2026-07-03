import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema, } from "@modelcontextprotocol/sdk/types.js";
import { callPythonTool } from "./python-spawner.js";
const server = new Server({ name: "price-library-server", version: "1.0.0" }, { capabilities: { tools: {} } });
const confirmedSchema = {
    type: "boolean",
    description: "Must be true after the user confirms a shared draft mutation.",
};
const materialSchema = {
    type: "string",
    description: "Material / product code (aliases: material, product_code, code).",
};
const priceFieldProperties = {
    price_a: { type: "number" },
    price_b: { type: "number" },
    price_c: { type: "number" },
    price_d: { type: "number" },
    price_e: { type: "number" },
    price_d_low: { type: "number" },
    supplier: { type: "string" },
    description: { type: "string" },
    description_cn: { type: "string" },
    description_english: { type: "string" },
    product_type: { type: "string" },
    unit: { type: "string" },
    volume: { type: "number" },
    is_preferred_price: { type: "boolean" },
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
