/** Forbidden coupling patterns for platform path lint (SB-13). */

export const PLATFORM_SCAN_ROOTS = [
  "ccb-installer/src",
  "ccb-installer/control-plane",
];

export const PLATFORM_SCAN_EXTENSIONS = new Set([".ts", ".js", ".mjs"]);

export const PLATFORM_SCAN_SKIP_DIR_NAMES = new Set([
  "__tests__",
  "node_modules",
  "dist",
]);

export const FORBIDDEN_PATTERNS = [
  { id: "agent-wande-orchestrator", regex: /['"]wande-orchestrator['"]/ },
  { id: "agent-quotation", regex: /['"]quotation-agent['"]/ },
  { id: "agent-accurate", regex: /['"]accurate-agent['"]/ },
  { id: "agent-price-library", regex: /['"]price-library-agent['"]/ },
  { id: "brand-wanding", regex: /\bWanD\b|\bWanding\b|万鼎|VANTSING/ },
  { id: "path-ccb-wanding", regex: /CCB-Wanding/ },
  { id: "slug-wanding-knowledge", regex: /wanding_business_knowledge/ },
  { id: "path-vendor-wanding", regex: /vendor[/\\]wanding/ },
];

export function shouldSkipScanFile(relativePath) {
  const normalized = relativePath.replace(/\\/g, "/");
  if (/\.test\.(ts|js|mjs)$/.test(normalized)) return true;
  if (normalized.includes("/__tests__/")) return true;
  if (normalized.endsWith("packageRegistry.ts")) return true;
  return false;
}

export function hitKey(relativePath, lineNumber, patternId) {
  return `${relativePath.replace(/\\/g, "/")}:${lineNumber}:${patternId}`;
}
