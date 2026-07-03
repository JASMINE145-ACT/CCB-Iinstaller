import { existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
const __dirname = dirname(fileURLToPath(import.meta.url));
function hasPythonEntry(root) {
    return existsSync(resolve(root, "python", "price_library_main.py"));
}
function resolveBundledWandingRoot() {
    const distDir = __dirname;
    const candidates = [];
    if (process.env.CCB_INSTALL_DIR) {
        candidates.push(resolve(process.env.CCB_INSTALL_DIR, "vendor", "wanding"));
    }
    candidates.push(resolve(distDir, "..", "..", "..", "wanding"));
    candidates.push(resolve(distDir, "..", "..", "..", ".."));
    for (const candidate of candidates) {
        if (hasPythonEntry(candidate)) {
            return resolve(candidate);
        }
    }
    return null;
}
function findProjectRootFromCwd() {
    const marker = "CLAUDE.md";
    let dir = process.cwd();
    while (dir !== resolve(dir, "..")) {
        if (existsSync(resolve(dir, marker)) && hasPythonEntry(dir)) {
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
    if (envRoot && hasPythonEntry(envRoot)) {
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
export const config = {
    projectRoot: PROJECT_ROOT,
    pythonEntry: resolve(PROJECT_ROOT, "python", "price_library_main.py"),
};
