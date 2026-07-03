import {
  mkdir,
  readFile,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  compileRuntimeConfig,
  detectProjectionDrift,
} from "./lib/runtime-config-compiler.mjs";

async function readJson(path) {
  return JSON.parse((await readFile(path, "utf8")).replace(/^\uFEFF/, ""));
}

async function writeJson(path, value) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function argValue(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : null;
}

function fixtureSecrets() {
  return {
    "secret://platform/llm/auth-token": "TEST_ONLY_LLM_TOKEN",
    "secret://tenant/tn_wanding_prod/aol/access-token":
      "TEST_ONLY_AOL_ACCESS_TOKEN",
    "secret://tenant/tn_wanding_prod/aol/signature-secret":
      "TEST_ONLY_AOL_SIGNATURE_SECRET",
    "secret://tenant/tn_wanding_prod/aol/database-id":
      "TEST_ONLY_AOL_DATABASE_ID",
  };
}

function redactValue(pointer, value, sensitivePaths) {
  return (
    /(token|secret|password|authorization)/i.test(pointer) ||
    [...sensitivePaths].some(
      (sensitive) =>
        pointer === sensitive || pointer.startsWith(`${sensitive}/`),
    )
  )
    ? "<redacted>"
    : value;
}

function flatten(value, prefix = "") {
  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    return [[prefix || "/", value]];
  }
  return Object.keys(value).flatMap((key) =>
    flatten(value[key], `${prefix}/${key}`),
  );
}

function parityDiff(expected, observed, sensitivePaths = new Set()) {
  const expectedMap = new Map(flatten(expected));
  const observedMap = new Map(flatten(observed));
  const paths = new Set([...expectedMap.keys(), ...observedMap.keys()]);
  return [...paths]
    .sort()
    .flatMap((pointer) => {
      const expectedValue = expectedMap.get(pointer);
      const observedValue = observedMap.get(pointer);
      if (JSON.stringify(expectedValue) === JSON.stringify(observedValue)) {
        return [];
      }
      return [
        {
          path: pointer,
          expected: redactValue(pointer, expectedValue, sensitivePaths),
          observed: redactValue(pointer, observedValue, sensitivePaths),
          kind:
            expectedValue === undefined
              ? "observed-only"
              : observedValue === undefined
                ? "expected-only"
                : "changed",
        },
      ];
    });
}

async function checkDrift(outputDir) {
  const metadata = await readJson(join(outputDir, "metadata.json"));
  const projections = {
    settings: await readJson(join(outputDir, "settings.json")),
    agents: await readJson(join(outputDir, "agents.json")),
    healthPlan: await readJson(join(outputDir, "health-plan.json")),
  };
  const results = Object.entries(projections).map(([name, value]) =>
    detectProjectionDrift(value, metadata, name),
  );
  for (const result of results) {
    console.log(
      `[${result.drift ? "DRIFT" : "OK"}] ${result.projection} expected=${result.expectedHash} actual=${result.actualHash}`,
    );
  }
  if (results.some((item) => item.drift)) process.exitCode = 2;
}

async function compile(repoRoot) {
  const fixture = process.argv.includes("--fixture");
  const outputDir = resolve(
    argValue("--output-dir") ??
      join(tmpdir(), "ccb-runtime-config-fixture"),
  );
  const installDir = argValue("--install-dir") ?? "D:/CCB-Wanding";
  const configDir = argValue("--config-dir") ?? "D:/CCB-Wanding/.claude";
  const configRoot = join(repoRoot, "config");
  const platform = await readJson(
    join(configRoot, "runtime/platform.defaults.json"),
  );
  const tenant = await readJson(
    join(
      configRoot,
      "runtime/tenants/tn_wanding_prod.desired.json",
    ),
  );
  const registry = await readJson(
    join(
      configRoot,
      "generated/package-registry.snapshot.json",
    ),
  );
  const packageStatePath = argValue("--package-state");
  let enabledPackages = tenant.enabledPackages;
  let packageManifests;
  if (packageStatePath) {
    const packageState = await readJson(resolve(packageStatePath));
    enabledPackages = packageState.enabledPackages ?? [];
    const stateRoot = dirname(resolve(packageStatePath));
    packageManifests = await Promise.all(
      enabledPackages.map((packageId) => {
        const entry = packageState.packages?.[packageId];
        if (!entry?.activeVersion) {
          throw new Error(`Enabled package ${packageId} has no active version`);
        }
        return readJson(
          join(
            stateRoot,
            "installed",
            packageId,
            entry.activeVersion,
            "package.json",
          ),
        );
      }),
    );
  } else {
    packageManifests = [
      await readJson(
        join(
          repoRoot,
          "packages/vertical/com.wanding.trade/package.json",
        ),
      ),
    ];
  }
  const secretFile = argValue("--secrets");
  if (!fixture && !secretFile) {
    throw new Error(
      "Provide --secrets <gitignored-json> or use --fixture for safe test values",
    );
  }
  const secrets = fixture
    ? fixtureSecrets()
    : await readJson(resolve(secretFile));
  const compiled = compileRuntimeConfig({
    layers: [platform, tenant],
    registry,
    packageManifests,
    enabledPackages,
    variables: {
      installDir,
      configDir,
      appDataProfile: argValue("--appdata-profile") ?? "AionUi",
      orgServerUrl: argValue("--org-server-url") ?? "http://127.0.0.1:13401",
      orgSessionTokenFile:
        argValue("--org-session-token-file") ??
        `${configDir}/runtime/org-session.token`,
    },
    secrets,
  });

  await writeJson(join(outputDir, "settings.json"), compiled.settings);
  await writeJson(join(outputDir, "agents.json"), compiled.agentProjection);
  await writeJson(join(outputDir, "health-plan.json"), compiled.healthPlan);
  await writeJson(join(outputDir, "provenance.json"), {
    schemaVersion: compiled.schemaVersion,
    revision: compiled.revision,
    fields: compiled.provenance,
    policy: compiled.policy,
  });
  await writeJson(join(outputDir, "metadata.json"), compiled.metadata);
  await writeJson(join(outputDir, "observed-state.json"), {
    schemaVersion: "1.0.0",
    desiredRevision: compiled.revision,
    observedRevision: compiled.revision,
    drift: false,
    projections: compiled.metadata.projections,
  });

  const comparePath = argValue("--compare-settings");
  if (comparePath) {
    const observed = await readJson(resolve(comparePath));
    const sensitivePaths = new Set(
      Object.entries(compiled.provenance)
        .filter(([, entry]) => entry.secretRef)
        .map(([pointer]) => pointer),
    );
    const diff = parityDiff(compiled.settings, observed, sensitivePaths);
    await writeJson(join(outputDir, "legacy-parity-report.json"), {
      schemaVersion: "1.0.0",
      comparedWith: resolve(comparePath),
      differences: diff,
    });
    console.log(`Legacy parity: ${diff.length} difference(s)`);
  }

  console.log(`Resolved revision: ${compiled.revision}`);
  console.log(`Output: ${relative(repoRoot, outputDir) || outputDir}`);
  console.log(
    `Projections: settings=${Object.keys(compiled.settings.mcpServers ?? {}).length} MCP, agents=${compiled.agentProjection.agents.length}, health=${compiled.healthPlan.servers.length}`,
  );
  return outputDir;
}

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "..");
const driftDir = argValue("--check-drift");
if (driftDir) {
  await checkDrift(resolve(driftDir));
} else {
  const outputDir = await compile(repoRoot);
  if (process.argv.includes("--verify-after-write")) {
    await checkDrift(outputDir);
  }
}
