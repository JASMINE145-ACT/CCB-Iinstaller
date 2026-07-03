import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  PackageLifecycle,
  readPackageState,
} from "../lib/package-lifecycle.mjs";

async function writePackage(root, version) {
  const packageRoot = join(root, `source-${version}`);
  await mkdir(join(packageRoot, "agents"), { recursive: true });
  await writeFile(
    join(packageRoot, "package.json"),
    `${JSON.stringify({
      schemaVersion: "1.0.0",
      packageId: "com.wanding.trade",
      version,
      capabilities: [],
      agents: [],
      mcpServers: [],
      skills: [],
      knowledge: [],
      contributions: [],
      aliases: [],
    })}\n`,
  );
  await writeFile(
    join(packageRoot, "assets.json"),
    `${JSON.stringify({
      schemaVersion: "1.0.0",
      packageId: "com.wanding.trade",
      legacyProjections: [{ source: "agents", target: "seed/agents" }],
      retainOnDisable: ["runtime/tenant-state"],
    })}\n`,
  );
  await writeFile(join(packageRoot, "agents", "marker.txt"), version);
  return packageRoot;
}

async function testLifecycleAndRollback() {
  const root = await mkdtemp(join(tmpdir(), "ccb-package-lifecycle-"));
  const sourceV1 = await writePackage(root, "1.0.0");
  const sourceV2 = await writePackage(root, "1.1.0");
  const lifecycle = new PackageLifecycle({ stateRoot: join(root, "state") });

  await lifecycle.install(sourceV1);
  let state = await readPackageState(join(root, "state"));
  assert.equal(state.packages["com.wanding.trade"].activeVersion, "1.0.0");
  assert.equal(state.packages["com.wanding.trade"].enabled, false);

  await lifecycle.enable("com.wanding.trade");
  state = await readPackageState(join(root, "state"));
  assert.equal(state.packages["com.wanding.trade"].enabled, true);
  assert.deepEqual(state.enabledPackages, ["com.wanding.trade"]);
  const runtimeProjection = JSON.parse(
    await readFile(
      join(root, "state", "projections", "package-runtime.json"),
      "utf8",
    ),
  );
  assert.equal(
    runtimeProjection.enabledPackages[0].packageId,
    "com.wanding.trade",
  );
  assert.equal(
    await readFile(
      join(root, "state", "projections", "seed", "agents", "marker.txt"),
      "utf8",
    ),
    "1.0.0",
  );

  await lifecycle.upgrade(sourceV2);
  state = await readPackageState(join(root, "state"));
  assert.equal(state.packages["com.wanding.trade"].activeVersion, "1.1.0");
  assert.deepEqual(
    state.packages["com.wanding.trade"].previousVersions,
    ["1.0.0"],
  );

  await lifecycle.rollback("com.wanding.trade");
  state = await readPackageState(join(root, "state"));
  assert.equal(state.packages["com.wanding.trade"].activeVersion, "1.0.0");
  assert.equal(
    await readFile(
      join(root, "state", "projections", "seed", "agents", "marker.txt"),
      "utf8",
    ),
    "1.0.0",
  );

  await lifecycle.disable("com.wanding.trade");
  state = await readPackageState(join(root, "state"));
  assert.equal(state.packages["com.wanding.trade"].enabled, false);
  assert.deepEqual(state.enabledPackages, []);

  await lifecycle.uninstall("com.wanding.trade");
  state = await readPackageState(join(root, "state"));
  assert.equal(state.packages["com.wanding.trade"], undefined);
}

async function testRejectsUnsafeTransitions() {
  const root = await mkdtemp(join(tmpdir(), "ccb-package-lifecycle-"));
  const lifecycle = new PackageLifecycle({ stateRoot: join(root, "state") });
  await assert.rejects(
    () => lifecycle.enable("com.wanding.trade"),
    /not installed/i,
  );
  await assert.rejects(
    () => lifecycle.rollback("com.wanding.trade"),
    /not installed/i,
  );
}

async function testCanonicalWandingPackage() {
  const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
  const packageRoot = join(
    repoRoot,
    "ccb-installer",
    "packages",
    "vertical",
    "com.wanding.trade",
  );
  const manifest = JSON.parse(
    await readFile(join(packageRoot, "package.json"), "utf8"),
  );
  assert.equal(manifest.packageId, "com.wanding.trade");
  assert.deepEqual(
    manifest.agents.map((item) => item.id).sort(),
    [
      "accurate-agent",
      "price-library-agent",
      "quotation-agent",
      "wande-orchestrator",
    ],
  );
  for (const descriptor of [
    ...manifest.agents,
    ...manifest.skills,
    ...manifest.knowledge,
  ]) {
    const source = join(repoRoot, "ccb-installer", descriptor.source);
    await readFile(source);
  }

  const stateRoot = await mkdtemp(join(tmpdir(), "ccb-real-package-"));
  const lifecycle = new PackageLifecycle({ stateRoot });
  await lifecycle.install(packageRoot);
  await lifecycle.enable("com.wanding.trade");
  const state = await readPackageState(stateRoot);
  assert.deepEqual(state.enabledPackages, ["com.wanding.trade"]);
  assert.equal(
    await readFile(
      join(stateRoot, "projections", "seed", "agents", "quotation-agent.md"),
      "utf8",
    ).then((text) => text.startsWith("---")),
    true,
  );
}

const tests = [
  ["install, enable, upgrade, rollback, disable, uninstall", testLifecycleAndRollback],
  ["unsafe transitions", testRejectsUnsafeTransitions],
  ["canonical WanD package", testCanonicalWandingPackage],
];

for (const [name, test] of tests) {
  await test();
  console.log(`PASS ${name}`);
}
console.log(`PASS ${tests.length}/${tests.length} package lifecycle tests`);
