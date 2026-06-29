import { existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
const __dirname = dirname(fileURLToPath(import.meta.url));
function hasPythonMain(root) {
    return existsSync(resolve(root, "python", "main.py"));
}
function resolveBundledWandingRoot() {
    const distDir = __dirname;
    const candidates = [];
    if (process.env.CCB_INSTALL_DIR) {
        candidates.push(resolve(process.env.CCB_INSTALL_DIR, "vendor", "wanding"));
    }
    // vendor/mcp-servers/quotation-server/dist -> vendor/wanding
    candidates.push(resolve(distDir, "..", "..", "..", "wanding"));
    // dev repo: mcp_servers/quotation-server/dist -> repo root (python/main.py)
    candidates.push(resolve(distDir, "..", "..", "..", ".."));
    for (const candidate of candidates) {
        if (hasPythonMain(candidate)) {
            return resolve(candidate);
        }
    }
    return null;
}
function findProjectRootFromCwd() {
    const marker = "CLAUDE.md";
    let dir = process.cwd();
    while (dir !== resolve(dir, "..")) {
        if (existsSync(resolve(dir, marker)) && hasPythonMain(dir)) {
            return dir;
        }
        dir = resolve(dir, "..");
    }
    return process.cwd();
}
function resolveProjectRoot() {
    const envRoot = process.env.CCB_PROJECT_ROOT
        ? resolve(process.env.CCB_PROJECT_ROOT)
        : null;
    if (envRoot && hasPythonMain(envRoot)) {
        return envRoot;
    }
    const bundled = resolveBundledWandingRoot();
    if (bundled) {
        return bundled;
    }
    if (envRoot) {
        return envRoot;
    }
    return findProjectRootFromCwd();
}
const PROJECT_ROOT = resolveProjectRoot();
const DATA_DIR = process.env.DATA_DIR
    ? resolve(process.env.DATA_DIR)
    : resolve(PROJECT_ROOT, "data");
export const config = {
    projectRoot: PROJECT_ROOT,
    pythonEntry: resolve(PROJECT_ROOT, "python", "main.py"),
    dataDir: DATA_DIR,
    wandingPriceLib: resolve(DATA_DIR, "wanding_price_lib.xlsx"),
    mappingTable: resolve(DATA_DIR, "mapping_table.xlsx"),
    businessKnowledge: resolve(DATA_DIR, "wanding_business_knowledge.md"),
    // Compatibility fields for the older TypeScript reimplementation files that
    // are still compiled but no longer used by src/index.ts.
    llmSelectorModel: process.env.LLM_SELECTOR_MODEL ?? "gpt-4o-mini",
    llmSelectorApiKey: process.env.LLM_SELECTOR_API_KEY ?? "",
    llmSelectorBaseUrl: process.env.LLM_SELECTOR_BASE_URL ?? "https://api.openai.com/v1",
    llmSelectorTimeout: Number(process.env.LLM_SELECTOR_TIMEOUT ?? 15),
    maxCandidates: Number(process.env.QUOTATION_MAX_CANDIDATES ?? 15),
    maxBatchSize: 50,
};
