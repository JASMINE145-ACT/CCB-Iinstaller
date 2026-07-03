import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  compileRuntimeConfig,
  detectProjectionDrift,
  mergeConfigLayers,
} from "../lib/runtime-config-compiler.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "..", "..", "..");

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

function baseLayers() {
  return [
    {
      id: "platform",
      kind: "platform",
      values: {
        env: {
          API_URL: "https://platform.example",
          API_TOKEN: "secret://platform/api/token",
        },
        theme: "dark",
      },
      lockedPaths: ["/env/API_URL"],
      secretPaths: ["/env/API_TOKEN"],
      userOverridablePaths: ["/theme"],
      sessionOverridablePaths: [],
    },
    {
      id: "tenant",
      kind: "tenant",
      values: {
        theme: "light",
      },
    },
  ];
}

async function testMergePolicy() {
  const result = mergeConfigLayers(baseLayers());
  assert.equal(result.values.theme, "light");
  assert.equal(result.values.env.API_URL, "https://platform.example");
  assert.equal(result.provenance["/theme"].layerId, "tenant");

  assert.throws(
    () =>
      mergeConfigLayers([
        ...baseLayers(),
        {
          id: "tenant-bad",
          kind: "tenant",
          values: { env: { API_URL: "https://override.example" } },
        },
      ]),
    /locked path/i,
  );
  assert.throws(
    () =>
      mergeConfigLayers([
        {
          id: "invalid",
          kind: "platform",
          values: {},
          unknownCriticalField: true,
        },
      ]),
    /unknown config layer field/i,
  );
}

async function testSafeOverrides() {
  const allowed = mergeConfigLayers([
    ...baseLayers(),
    { id: "user", kind: "user", values: { theme: "contrast" } },
  ]);
  assert.equal(allowed.values.theme, "contrast");

  assert.throws(
    () =>
      mergeConfigLayers([
        ...baseLayers(),
        {
          id: "user",
          kind: "user",
          values: { env: { API_TOKEN: "secret://user/other" } },
        },
      ]),
    /not user-overridable/i,
  );
}

async function testSecretsAndProvenance() {
  const compiled = compileRuntimeConfig({
    layers: baseLayers(),
    registry: { agents: [], mcpServers: [], packages: [], skills: [] },
    enabledPackages: [],
    variables: {},
    secrets: {
      "secret://platform/api/token": "resolved-secret-value",
    },
  });

  assert.equal(compiled.settings.env.API_TOKEN, "resolved-secret-value");
  assert.equal(
    compiled.provenance["/env/API_TOKEN"].secretRef,
    "secret://platform/api/token",
  );
  assert.equal(
    JSON.stringify(compiled.provenance).includes("resolved-secret-value"),
    false,
  );
  assert.throws(
    () =>
      compileRuntimeConfig({
        layers: [
          {
            ...baseLayers()[0],
            values: {
              ...baseLayers()[0].values,
              env: {
                ...baseLayers()[0].values.env,
                API_TOKEN: "literal-secret",
              },
            },
          },
        ],
        registry: { agents: [], mcpServers: [], packages: [], skills: [] },
        enabledPackages: [],
        variables: {},
        secrets: {},
      }),
    /secret reference/i,
  );
}

async function testRegistryProjections() {
  const registry = await readJson(
    resolve(
      repoRoot,
      "ccb-installer/config/generated/package-registry.snapshot.json",
    ),
  );
  const packageManifest = await readJson(
    resolve(
      repoRoot,
      "ccb-installer/packages/vertical/com.wanding.trade/package.json",
    ),
  );
  const platform = await readJson(
    resolve(
      repoRoot,
      "ccb-installer/config/runtime/platform.defaults.json",
    ),
  );
  const tenant = await readJson(
    resolve(
      repoRoot,
      "ccb-installer/config/runtime/tenants/tn_wanding_prod.desired.json",
    ),
  );
  const secrets = {
    "secret://platform/llm/auth-token": "test-llm-token",
    "secret://tenant/tn_wanding_prod/aol/access-token": "test-aol-token",
    "secret://tenant/tn_wanding_prod/aol/signature-secret": "test-signature",
    "secret://tenant/tn_wanding_prod/aol/database-id": "test-db",
  };

  const compiled = compileRuntimeConfig({
    layers: [platform, tenant],
    registry,
    packageManifests: [packageManifest],
    enabledPackages: tenant.enabledPackages,
    variables: {
      installDir: "D:/CCB-Wanding",
      configDir: "D:/Config",
      appDataProfile: "AionUi",
      orgServerUrl: "https://org.example",
      orgSessionTokenFile: "D:/Config/runtime/org-session.token",
    },
    secrets,
  });

  assert.ok(compiled.settings.mcpServers.quotation);
  assert.equal(
    compiled.agentProjection.agents.find(
      (item) => item.id === "quotation-agent",
    ).mcpServers.join(","),
    "quotation,excel",
  );
  assert.ok(
    compiled.healthPlan.servers.some((item) => item.id === "quotation"),
  );
  assert.match(compiled.revision, /^sha256:[a-f0-9]{64}$/);

  const platformOnly = compileRuntimeConfig({
    layers: [platform, tenant],
    registry,
    packageManifests: [packageManifest],
    enabledPackages: [],
    variables: {
      installDir: "D:/CCB-Wanding",
      configDir: "D:/Config",
      appDataProfile: "AionUi",
      orgServerUrl: "https://org.example",
      orgSessionTokenFile: "D:/Config/runtime/org-session.token",
    },
    secrets,
  });
  assert.equal(platformOnly.settings.mcpServers.quotation, undefined);
  assert.deepEqual(platformOnly.agentProjection.agents, []);
  assert.equal(
    platformOnly.healthPlan.servers.some(
      (item) => item.packageId === "com.wanding.trade",
    ),
    false,
  );
  assert.deepEqual(
    platformOnly.healthPlan.servers.map((item) => item.id).sort(),
    ["exa", "excel", "excel-mcp", "office-word"],
  );

  const again = compileRuntimeConfig({
    layers: [platform, tenant],
    registry,
    packageManifests: [packageManifest],
    enabledPackages: tenant.enabledPackages,
    variables: {
      installDir: "D:/CCB-Wanding",
      configDir: "D:/Config",
      appDataProfile: "AionUi",
      orgServerUrl: "https://org.example",
      orgSessionTokenFile: "D:/Config/runtime/org-session.token",
    },
    secrets,
  });
  assert.deepEqual(compiled, again);

  const invalidManifest = structuredClone(packageManifest);
  invalidManifest.mcpServers.find(
    (item) => item.id === "quotation",
  ).runtime.env.AOL_ACCESS_TOKEN = "literal-aol-token";
  assert.throws(
    () =>
      compileRuntimeConfig({
        layers: [platform, tenant],
        registry,
        packageManifests: [invalidManifest],
        enabledPackages: tenant.enabledPackages,
        variables: {
          installDir: "D:/CCB-Wanding",
          configDir: "D:/Config",
          appDataProfile: "AionUi",
          orgServerUrl: "https://org.example",
          orgSessionTokenFile: "D:/Config/runtime/org-session.token",
        },
        secrets,
      }),
    /secret reference/i,
  );
}

async function testDrift() {
  const expected = { env: { A: "1" } };
  const metadata = {
    projections: {
      settings: {
        sha256:
          "sha256:cbf80b3f1e2f3dc184f29f6a3b4f09e79e33a54c1c6a431a5f7f1e9ed425f2d0",
      },
    },
  };
  const cleanMetadata = {
    projections: {
      settings: {
        sha256: detectProjectionDrift(expected, null).actualHash,
      },
    },
  };

  assert.equal(detectProjectionDrift(expected, cleanMetadata).drift, false);
  assert.equal(
    detectProjectionDrift({ env: { A: "edited" } }, cleanMetadata).drift,
    true,
  );
  assert.equal(detectProjectionDrift(expected, metadata).drift, true);
}

async function testTrackedFilesContainNoLiteralCredentials() {
  const trackedInputs = [
    ["settings template", "ccb-installer/resources/settings/settings.example.json"],
    ["wanding bootstrap", "ccb-installer/scripts/ensure-wanding-settings.ps1"],
    ["legacy bootstrap", "ccb-installer/scripts/ensure-mcp-settings.ps1"],
    ["default launcher", "ccb-installer/ccb.cmd"],
    ["lite launcher", "ccb-installer/ccb-lite.cmd"],
    ["wanding launcher", "ccb-installer/ccb-wanding.cmd"],
    ["AionUI launcher", "ccb-installer/start-aionui.cmd"],
    ["local launcher", "ccb-installer/start-local.cmd"],
    ["process manager config", "ccb-installer/deploy/ecosystem.config.js"],
  ];
  const providerPrefix = "sk" + "-cp-";
  const accuratePrefix = "aat" + "\\.NTA\\.";

  for (const [name, relativePath] of trackedInputs) {
    const text = await readFile(resolve(repoRoot, relativePath), "utf8");
    assert.equal(
      new RegExp(
        `\\b(?:${providerPrefix}|${accuratePrefix}|AOL_SIGNATURE_SECRET\\s*=\\s*"[A-Za-z0-9+/=]{20,}")`,
      ).test(text),
      false,
      `${name} contains a literal credential`,
    );
  }
}

const tests = [
  ["merge precedence and locked paths", testMergePolicy],
  ["safe user overrides", testSafeOverrides],
  ["secret references and provenance", testSecretsAndProvenance],
  ["registry-derived projections", testRegistryProjections],
  ["projection drift", testDrift],
  ["tracked files contain no literal credentials", testTrackedFilesContainNoLiteralCredentials],
];

for (const [name, run] of tests) {
  await run();
  console.log(`PASS ${name}`);
}

console.log(`PASS ${tests.length}/${tests.length} runtime config compiler tests`);
