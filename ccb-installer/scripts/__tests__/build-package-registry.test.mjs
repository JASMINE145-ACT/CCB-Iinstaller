import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

import {
  buildRegistry,
  validatePackageManifest,
} from "../build-package-registry.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "..", "..", "..");

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

async function testPackageManifest() {
  const manifestPath = resolve(
    repoRoot,
    "ccb-installer/config/packages/com.wanding.trade/package.json",
  );
  const manifest = await readJson(manifestPath);

  assert.deepEqual(validatePackageManifest(manifest), []);
}

function testInvalidManifest() {
  const manifest = {
    schemaVersion: "1.0.0",
    packageId: "com.example.invalid",
    version: "1.0.0",
    capabilities: [{ id: "business.example.read" }],
    agents: [
      {
        id: "duplicate-agent",
        source: "config/agents/a.md",
        requiredCapabilities: ["business.example.missing"],
      },
      {
        id: "duplicate-agent",
        source: "config/agents/b.md",
        requiredCapabilities: [],
      },
    ],
    mcpServers: [],
    skills: [],
    knowledge: [],
    contributions: [],
    aliases: [],
  };

  const codes = validatePackageManifest(manifest).map((item) => item.code);
  assert.ok(codes.includes("duplicate-descriptor"));
  assert.ok(codes.includes("unresolved-capability"));
}

async function testRegistrySnapshot() {
  const snapshot = await buildRegistry({ repoRoot });

  assert.equal(snapshot.schemaVersion, "1.0.0");
  assert.equal(
    Object.hasOwn(snapshot, "generatedAt"),
    false,
    "snapshot must not contain wall-clock data",
  );
  assert.ok(snapshot.packages.some((item) => item.id === "com.wanding.trade"));
  assert.ok(snapshot.agents.some((item) => item.id === "quotation-agent"));
  assert.ok(snapshot.mcpServers.some((item) => item.id === "quotation"));
  assert.ok(snapshot.skills.some((item) => item.id === "quotation-learn-by-data"));
  assert.ok(
    snapshot.aliases.some(
      (item) =>
        item.legacyId === "wande-orchestrator" &&
        item.packageId === "com.wanding.trade",
    ),
  );
  assert.equal(
    snapshot.diagnostics.filter((item) => item.severity === "error").length,
    0,
  );
}

const tests = [
  ["package manifest contract", testPackageManifest],
  ["invalid manifest diagnostics", testInvalidManifest],
  ["registry snapshot graph", testRegistrySnapshot],
];

for (const [name, run] of tests) {
  await run();
  console.log(`PASS ${name}`);
}

console.log(`PASS ${tests.length}/${tests.length} package registry tests`);
