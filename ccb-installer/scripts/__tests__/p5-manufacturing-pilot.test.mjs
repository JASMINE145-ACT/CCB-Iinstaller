import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import {
  cp,
  mkdtemp,
  readFile,
  stat,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { ControlPlane } from "../../control-plane/lib/control-plane.mjs";
import { buildRegistry } from "../build-package-registry.mjs";
import {
  PackageLifecycle,
  readPackageState,
} from "../lib/package-lifecycle.mjs";
import { compileRuntimeConfig } from "../lib/runtime-config-compiler.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "..", "..", "..");
const installerRoot = join(repoRoot, "ccb-installer");
const packagesRoot = join(installerRoot, "packages", "vertical");
const manufacturingRoot = join(
  packagesRoot,
  "com.example.manufacturing-scheduling",
);
const wandingRoot = join(packagesRoot, "com.wanding.trade");
const manufacturingId = "com.example.manufacturing-scheduling";
const wandingId = "com.wanding.trade";

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

function frontmatterList(markdown, field) {
  const block = markdown.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  assert.ok(block, "agent frontmatter is required");
  const lines = block[1].split(/\r?\n/);
  const index = lines.findIndex((line) => line.trim() === `${field}:`);
  if (index < 0) return [];
  const values = [];
  for (const line of lines.slice(index + 1)) {
    const match = line.match(/^\s+-\s+(.+?)\s*$/);
    if (!match) break;
    values.push(match[1]);
  }
  return values;
}

function compilationInputs() {
  return {
    variables: {
      installDir: "D:/CCB-Wanding",
      configDir: "D:/Config",
      appDataProfile: "AionUi",
      orgServerUrl: "https://org.example",
      orgSessionTokenFile: "D:/Config/runtime/org-session.token",
    },
    secrets: {
      "secret://platform/llm/auth-token": "test-llm-token",
      "secret://tenant/tn_wanding_prod/aol/access-token": "test-aol-token",
      "secret://tenant/tn_wanding_prod/aol/signature-secret": "test-signature",
      "secret://tenant/tn_wanding_prod/aol/database-id": "test-db",
    },
  };
}

test("package is complete, declarative, secret-free, and registry-owned", async () => {
  const manifest = await readJson(join(manufacturingRoot, "package.json"));
  assert.equal(manifest.packageId, manufacturingId);
  assert.deepEqual(manifest.aliases, []);
  assert.equal(/secret:\/\/|https?:\/\//i.test(JSON.stringify(manifest)), false);

  for (const descriptor of [
    ...manifest.agents,
    ...manifest.mcpServers,
    ...manifest.skills,
    ...manifest.knowledge,
    ...manifest.contributions.filter((item) => item.source),
  ]) {
    await stat(join(installerRoot, descriptor.source));
  }
  for (const file of [
    "assets.json",
    "health/install-health.json",
    "health/mcp-health-manifest.json",
    "policies/runtime.json",
    "evals/suites.json",
    "knowledge/collections.json",
    "ui/scheduling-dashboard.json",
  ]) {
    await readJson(join(manufacturingRoot, file));
  }
  const agent = await readFile(
    join(manufacturingRoot, "agents", "scheduling-agent.md"),
    "utf8",
  );
  const agentDescriptor = manifest.agents[0];
  assert.match(agent, new RegExp(`name:\\s*${agentDescriptor.id}`));
  assert.deepEqual(frontmatterList(agent, "mcpServers"), agentDescriptor.mcpServers);
  assert.deepEqual(frontmatterList(agent, "skills"), agentDescriptor.skills);
  assert.match(agent, /business\.manufacturing\.schedule/);

  const artifacts = await Promise.all(
    [
      "policies/runtime.json",
      "evals/suites.json",
      "knowledge/collections.json",
      "ui/scheduling-dashboard.json",
    ].map((file) => readJson(join(manufacturingRoot, file))),
  );
  assert.ok(
    artifacts.every((item) =>
      JSON.stringify(item).includes("business.manufacturing.schedule"),
    ),
  );

  const registry = await buildRegistry({ repoRoot });
  assert.equal(
    registry.diagnostics.filter((item) => item.severity === "error").length,
    0,
  );
  assert.deepEqual(
    registry.packages.map((item) => item.id).sort(),
    [manufacturingId, wandingId],
  );
  for (const field of ["agents", "mcpServers", "skills"]) {
    const ids = registry[field].map((item) => item.id);
    assert.equal(new Set(ids).size, ids.length, `${field} IDs must be unique`);
  }
});

test("dual-package compilation is additive and preserves WanD", async () => {
  const registry = await buildRegistry({ repoRoot });
  const [wandingManifest, manufacturingManifest, platform, tenant] =
    await Promise.all([
      readJson(join(wandingRoot, "package.json")),
      readJson(join(manufacturingRoot, "package.json")),
      readJson(join(installerRoot, "config/runtime/platform.defaults.json")),
      readJson(
        join(
          installerRoot,
          "config/runtime/tenants/tn_wanding_prod.desired.json",
        ),
      ),
    ]);
  const inputs = compilationInputs();
  const single = compileRuntimeConfig({
    layers: [platform, tenant],
    registry,
    packageManifests: [wandingManifest, manufacturingManifest],
    enabledPackages: [wandingId],
    ...inputs,
  });
  const dual = compileRuntimeConfig({
    layers: [platform, tenant],
    registry,
    packageManifests: [wandingManifest, manufacturingManifest],
    enabledPackages: [wandingId, manufacturingId],
    ...inputs,
  });

  for (const id of ["quotation", "accurate", "price-library"]) {
    assert.deepEqual(dual.settings.mcpServers[id], single.settings.mcpServers[id]);
    assert.deepEqual(
      dual.healthPlan.servers.find((item) => item.id === id),
      single.healthPlan.servers.find((item) => item.id === id),
    );
  }
  for (const id of [
    "wande-orchestrator",
    "quotation-agent",
    "accurate-agent",
    "price-library-agent",
  ]) {
    assert.deepEqual(
      dual.agentProjection.agents.find((item) => item.id === id),
      single.agentProjection.agents.find((item) => item.id === id),
    );
  }
  const singleWandingProvenance = Object.fromEntries(
    Object.entries(single.provenance).filter(([path]) =>
      /quotation|accurate|price-library|AOL_/.test(path),
    ),
  );
  const dualWandingProvenance = Object.fromEntries(
    Object.entries(dual.provenance).filter(([path]) =>
      /quotation|accurate|price-library|AOL_/.test(path),
    ),
  );
  assert.deepEqual(dualWandingProvenance, singleWandingProvenance);
  assert.ok(dual.settings.mcpServers["manufacturing-scheduling"]);
  assert.equal(
    dual.settings.mcpServers["manufacturing-scheduling"].command,
    "D:/CCB-Wanding/vendor/bun/bun.exe",
  );
  assert.ok(
    dual.agentProjection.agents.some((item) => item.id === "scheduling-agent"),
  );
  assert.ok(
    dual.healthPlan.servers.some(
      (item) =>
        item.id === "manufacturing-scheduling" &&
        item.packageId === manufacturingId,
    ),
  );
  assert.equal(JSON.stringify(dual).includes("test-aol-token"), true);
  assert.equal(JSON.stringify(dual.provenance).includes("test-aol-token"), false);
});

test("real package lifecycle coexists, upgrades, rolls back, and uninstalls", async () => {
  const root = await mkdtemp(join(tmpdir(), "ccb-p5-lifecycle-"));
  const stateRoot = join(root, "state");
  const lifecycle = new PackageLifecycle({ stateRoot });
  await lifecycle.install(wandingRoot);
  await lifecycle.enable(wandingId);
  let state = await readPackageState(stateRoot);
  const wandingBefore = structuredClone(state.packages[wandingId]);
  await lifecycle.install(manufacturingRoot);
  state = await readPackageState(stateRoot);
  assert.deepEqual(state.packages[wandingId], wandingBefore);
  await lifecycle.enable(manufacturingId);
  state = await readPackageState(stateRoot);
  assert.deepEqual(state.packages[wandingId], wandingBefore);
  assert.deepEqual(state.enabledPackages, [manufacturingId, wandingId]);

  const v2 = join(root, "manufacturing-v2");
  await cp(manufacturingRoot, v2, { recursive: true });
  const v2Manifest = await readJson(join(v2, "package.json"));
  v2Manifest.version = "0.2.0";
  await writeFile(
    join(v2, "package.json"),
    `${JSON.stringify(v2Manifest, null, 2)}\n`,
  );
  await writeFile(join(v2, "release-marker.txt"), "0.2.0\n");
  await lifecycle.upgrade(v2);
  state = await readPackageState(stateRoot);
  assert.equal(state.packages[manufacturingId].activeVersion, "0.2.0");
  assert.deepEqual(state.packages[wandingId], wandingBefore);

  await lifecycle.rollback(manufacturingId);
  state = await readPackageState(stateRoot);
  assert.equal(state.packages[manufacturingId].activeVersion, "0.1.0");
  assert.deepEqual(state.packages[wandingId], wandingBefore);

  await lifecycle.disable(manufacturingId);
  state = await readPackageState(stateRoot);
  assert.deepEqual(state.packages[wandingId], wandingBefore);
  await lifecycle.uninstall(manufacturingId);
  state = await readPackageState(stateRoot);
  assert.deepEqual(state.enabledPackages, [wandingId]);
  assert.deepEqual(state.packages[wandingId], wandingBefore);
  assert.equal(state.packages[manufacturingId], undefined);
});

test("control plane publishes both packages and reaches zero drift", async () => {
  const root = await mkdtemp(join(tmpdir(), "ccb-p5-control-"));
  const plane = new ControlPlane({
    root,
    catalogRoot: packagesRoot,
    platformVersion: "1.1.2",
  });
  await plane.createTenant({
    tenantId: "tn_factory",
    displayName: "Factory Pilot",
    actor: "admin",
    correlationId: "p5-create",
  });
  const catalog = await plane.getCatalog();
  assert.deepEqual(
    catalog.packages.map((item) => item.packageId).sort(),
    [manufacturingId, wandingId],
  );

  let tenant = await plane.getTenant("tn_factory");
  await plane.setPackages({
    tenantId: "tn_factory",
    packageIds: [wandingId, manufacturingId],
    expectedRevision: tenant.revision,
    actor: "admin",
    correlationId: "p5-lock",
  });
  tenant = await plane.getTenant("tn_factory");
  const release = await plane.publishConfig({
    tenantId: "tn_factory",
    config: {
      environment: "staging",
      enabledPackages: [wandingId, manufacturingId],
    },
    expectedRevision: tenant.revision,
    actor: "admin",
    correlationId: "p5-publish",
  });
  assert.equal(release.status, "published");

  tenant = await plane.getTenant("tn_factory");
  await plane.reportObserved({
    tenantId: "tn_factory",
    deviceId: "factory-device-01",
    configRevision: tenant.desired.configRevision,
    packageLockRevision: tenant.packageLock.revision,
    health: "healthy",
    actor: "device:factory-device-01",
    correlationId: "p5-observed",
  });
  const dashboard = await plane.getDashboard("tn_factory");
  assert.equal(dashboard.drift, false);
  assert.deepEqual(
    dashboard.packageLock.packages.map((item) => item.packageId).sort(),
    [manufacturingId, wandingId],
  );
});

test("P5 does not alter platform-core implementation", () => {
  const baseline = JSON.parse(
    execFileSync(
      process.execPath,
      [
        "-e",
        "process.stdout.write(require('fs').readFileSync(process.argv[1], 'utf8'))",
        join(
          repoRoot,
          ".trellis/tasks/07-03-p5-manufacturing-scheduling-pilot/research/p5-worktree-baseline.json",
        ),
      ],
      { encoding: "utf8" },
    ),
  );
  const tracked = execFileSync(
    "git",
    ["diff", "--name-only", baseline.commit],
    { cwd: repoRoot, encoding: "utf8" },
  )
    .trim()
    .split(/\r?\n/)
    .filter(Boolean);
  const untracked = execFileSync(
    "git",
    ["ls-files", "--others", "--exclude-standard"],
    { cwd: repoRoot, encoding: "utf8" },
  )
    .trim()
    .split(/\r?\n/)
    .filter(Boolean);
  const preExisting = new Set(baseline.preExistingPaths);
  const attributable = [...new Set([...tracked, ...untracked])]
    .map((path) => path.replaceAll("\\", "/"))
    .filter((path) => !preExisting.has(path));
  const allowedExact = new Set([
    "ccb-installer/config/generated/package-registry.snapshot.json",
    "ccb-installer/control-plane/__tests__/control-plane.test.mjs",
    "ccb-installer/control-plane/__tests__/jwks.test.mjs",
    "ccb-installer/scripts/__tests__/p5-manufacturing-pilot.test.mjs",
    ".trellis/spec/integration/platform-vertical-packages.md",
    ".trellis/tasks/07-03-platform-business-decoupling/execution-plan.md",
    ".trellis/tasks/07-03-platform-business-decoupling/manual-verification-checklist.md",
    ".trellis/tasks/07-03-platform-business-decoupling/prd.md",
    ".trellis/tasks/07-03-platform-business-decoupling/status.md",
    ".trellis/tasks/07-03-platform-business-decoupling/task.json",
  ]);
  const forbidden = attributable.filter(
    (path) =>
      !path.startsWith(
        "ccb-installer/packages/vertical/com.example.manufacturing-scheduling/",
      ) &&
      !path.startsWith(
        ".trellis/tasks/07-03-p5-manufacturing-scheduling-pilot/",
      ) &&
      !allowedExact.has(path),
  );
  assert.deepEqual(forbidden, [], `forbidden P5 paths: ${forbidden.join(", ")}`);
});
