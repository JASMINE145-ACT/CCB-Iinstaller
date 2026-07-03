import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema, } from "@modelcontextprotocol/sdk/types.js";
import { callPythonTool } from "./python-spawner";
const server = new Server({ name: "quotation-server", version: "1.0.0" }, { capabilities: { tools: {} } });
const customerLevelSchema = {
    type: "string",
    enum: ["A", "B", "C", "D", "E"],
    default: "B",
    description: "Customer price level. Claude Code uses returned candidates and selection context to choose.",
};
server.setRequestHandler(ListToolsRequestSchema, () => ({
    tools: [
        {
            name: "match_quotation",
            description: "Match quotation items using migrated agent-jk Python logic. Default behavior is Claude Code auto-selection: the tool returns candidates plus wanding business knowledge as selection context; Claude Code must choose one result and not show candidates unless requested. No internal selector model is called.",
            inputSchema: {
                type: "object",
                properties: {
                    keywords: { type: "string", description: "Product name/spec, e.g. PVC-U pipe DN25." },
                    customer_level: customerLevelSchema,
                    product_type: { type: "string", description: "Optional product type hint for filtering." },
                    price_library_path: { type: "string", description: "Optional price library path. Defaults to data/wanding_price_lib.xlsx." },
                    show_candidates: { type: "boolean", description: "Set true only when the user explicitly asks to see the candidate list." },
                },
                required: ["keywords"],
            },
        },
        {
            name: "match_quotation_batch",
            description: "Match up to 50 quotation queries. Default behavior is Claude Code auto-selection per item using the returned selection context; do not show candidate lists unless requested. No internal selector model is called.",
            inputSchema: {
                type: "object",
                properties: {
                    keywords_list: { type: "array", items: { type: "string" }, maxItems: 50 },
                    customer_level: customerLevelSchema,
                    product_type: { type: "string" },
                    price_library_path: { type: "string" },
                    show_candidates: { type: "boolean", description: "Set true only when the user explicitly asks to see candidate lists." },
                },
                required: ["keywords_list"],
            },
        },
        {
            name: "get_inventory_by_code",
            description: "Query inventory by product code. In standalone MCP mode this returns null unless Accurate API credentials are configured.",
            inputSchema: {
                type: "object",
                properties: { code: { type: "string", description: "Product code / Item Code." } },
                required: ["code"],
            },
        },
        {
            name: "get_inventory_by_code_batch",
            description: "Query inventory for up to 50 product codes.",
            inputSchema: {
                type: "object",
                properties: { codes: { type: "array", items: { type: "string" }, maxItems: 50 } },
                required: ["codes"],
            },
        },
        {
            name: "fill_quotation_sheet",
            description: "Write quotation lines to Excel. Path C (default after match in session): pass fill_items + require_exact_codes=true; omit file_path — server uses bundled VANTSING blank template. Path A: user supplied an existing inquiry Excel on disk — pass file_path only (no fill_items). Path B cold-start: items=[{keywords, quantity}]. Never pass placeholder file_path (blank, template) or future Wanding-Quotation_*.xlsx output names as input.",
            inputSchema: {
                type: "object",
                properties: {
                    fill_items: {
                        type: "array",
                        description: "Path C direct fill rows from session match. Each row: row, code, quote_name, unit_price, qty, inquiry_name, specification; optional indonesian_name, satuan, brand, supplier.",
                        items: {
                            type: "object",
                            properties: {
                                row: { type: "integer", description: "Excel row 1-based (VANTSING data starts at 8)." },
                                code: { type: "string", description: "Product code (or product_code)." },
                                product_code: { type: "string" },
                                quote_name: { type: "string" },
                                unit_price: { type: "number" },
                                qty: { type: "integer" },
                                inquiry_name: { type: "string", description: "User keywords from match (B column)." },
                                specification: { type: "string" },
                                indonesian_name: { type: "string" },
                                satuan: { type: "string" },
                                brand: { type: "string" },
                                supplier: { type: "string", description: "VANTSING O Catatan when present on match." },
                            },
                            required: ["row"],
                        },
                    },
                    items: {
                        type: "array",
                        description: "Path B cold-start: [{keywords, quantity}].",
                        items: {
                            type: "object",
                            properties: {
                                keywords: { type: "string" },
                                quantity: { type: "integer" },
                            },
                        },
                    },
                    require_exact_codes: {
                        type: "boolean",
                        description: "Set true after user confirmed selection / post-match fill (Path C).",
                    },
                    locked_lines: { type: "boolean", description: "Alias for require_exact_codes." },
                    file_path: {
                        type: "string",
                        description: "Path A only: absolute path to an existing inquiry Excel on disk. Omit for Path C.",
                    },
                    template_path: { type: "string", description: "Optional custom template override for Path C." },
                    output_path: { type: "string", description: "Optional output path; relative paths need workspace_path." },
                    workspace_path: { type: "string", description: "AionUI project temp dir when output_path omitted or relative." },
                    sheet_name: { type: "string", description: "Optional worksheet name." },
                    customer_level: customerLevelSchema,
                    price_library_path: { type: "string" },
                    quotation_date: { type: "string" },
                    delivery_date: { type: "string" },
                },
            },
        },
        {
            name: "parse_excel_smart",
            description: "Parse an Excel file using the migrated agent-jk quote_tools.parse_excel_smart logic.",
            inputSchema: {
                type: "object",
                properties: {
                    file_path: { type: "string", description: "Excel absolute path." },
                    sheet_name: { type: "string", description: "Optional worksheet name." },
                    max_rows: { type: "number", description: "Maximum rows to return." },
                },
                required: ["file_path"],
            },
        },
        {
            name: "ask_clarification",
            description: "Return a clarification prompt/options object for quotation ambiguity.",
            inputSchema: {
                type: "object",
                properties: {
                    question: { type: "string" },
                    reason: { type: "string" },
                    options: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: { id: { type: "string" }, name: { type: "string" } },
                            required: ["id", "name"],
                        },
                    },
                },
            },
        },
        {
            name: "get_product_price_tiers",
            description: "List all non-zero price tiers for one product code from org price library (factory/A/B/C/D/E/LOCAL/RUCIKA/PE etc.). Use when user asks what price types exist, compares tiers, or questions tier meaning. Agent MUST Read vendor data.Md (same turn) before explaining labels — per-source semantics differ (RUCIKA price_d ≠ 青山). Returns tiers[] + product_type + data_md_path.",
            inputSchema: {
                type: "object",
                properties: {
                    code: { type: "string", description: "Material / product code (aliases: material_code, product_code)." },
                    price_library_path: { type: "string", description: "Optional local xlsx override; omit to use org API." },
                },
                required: ["code"],
            },
        },
        {
            name: "append_business_rule",
            description: "Append a confirmed business rule to the shared organization knowledge doc (center VPS wanding_business_knowledge). Without confirmed=true returns requires_confirmation only. Do NOT edit the local shadow md file for shared updates.",
            inputSchema: {
                type: "object",
                properties: {
                    rule_text: { type: "string", description: "Rule text to append (aliases: rule, content, text)." },
                    confirmed: { type: "boolean", description: "Must be true after user confirms the shared update." },
                    section: { type: "string", description: "Optional markdown section heading (default: 业务规则补充)." },
                    reason: { type: "string", description: "Optional note stored with the rule block." },
                    slug: { type: "string", description: "Org knowledge slug (default: wanding_business_knowledge)." },
                },
                required: ["rule_text"],
            },
        },
    ],
}));
function asRecord(value) {
    return value && typeof value === "object" ? value : {};
}
function normalizeArgs(args) {
    const normalized = { ...args };
    if (typeof normalized.customerLevel === "string" && typeof normalized.customer_level !== "string") {
        normalized.customer_level = normalized.customerLevel;
    }
    return normalized;
}
server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: rawArgs } = request.params;
    const args = normalizeArgs(asRecord(rawArgs));
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
