import assert from "node:assert/strict";
import {
  mkdir,
  mkdtemp,
  readFile,
  unlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";

import { ControlPlane } from "../lib/control-plane.mjs";

const catalogRoot = resolve(
  import.meta.dirname,
  "..",
  "..",
  "packages",
  "vertical",
);

async function testTenantReleaseAndDrift() {
  const root = await mkdtemp(`${tmpdir()}\\ccb-control-plane-`);
  const plane = new ControlPlane({
    root,
    catalogRoot,
    platformVersion: "1.1.2",
  });
  await plane.createTenant({
    tenantId: "tn_alpha",
    displayName: "Alpha",
    actor: "admin",
    correlationId: "corr-create",
  });
  const catalog = await plane.getCatalog();
  const wandingPackage = catalog.packages.find(
    (item) => item.packageId === "com.wanding.trade",
  );
  assert.ok(wandingPackage);
  assert.match(wandingPackage.sha256, /^sha256:[a-f0-9]{64}$/);

  let tenant = await plane.getTenant("tn_alpha");
  await plane.setPackages({
    tenantId: "tn_alpha",
    packageIds: ["com.wanding.trade"],
    expectedRevision: tenant.revision,
    actor: "admin",
    correlationId: "corr-package",
  });
  tenant = await plane.getTenant("tn_alpha");
  const clientProjection = await plane.createClientProjection({
    tenantId: "tn_alpha",
    gatewayBaseUrl: "https://gateway.example/mcp/",
    oidcAudience: "ccb-mcp-gateway",
  });
  assert.equal(clientProjection.mcpServers.quotation.type, "http");
  assert.match(
    clientProjection.mcpServers.quotation.url,
    /tenants\/tn_alpha\/packages\/com\.wanding\.trade\/mcp\/quotation/,
  );
  assert.equal(clientProjection.mcpServers.quotation.command, undefined);
  assert.equal(clientProjection.mcpServers.quotation.env, undefined);
  assert.doesNotMatch(
    JSON.stringify(clientProjection),
    /AOL_ACCESS_TOKEN|AOL_SIGNATURE_SECRET|AOL_DATABASE_ID/,
  );
  const authorized = await plane.authorizeMcpCall({
    tenantId: "tn_alpha",
    claims: {
      sub: "user-1",
      tenant_id: "tn_alpha",
      permissions: ["capability.business.pricing.quote.execute"],
    },
    packageId: "com.wanding.trade",
    mcpServerId: "quotation",
    capabilityId: "business.pricing.quote",
    correlationId: "corr-mcp-allow",
  });
  assert.equal(authorized.tenant_id, "tn_alpha");
  await assert.rejects(
    () =>
      plane.authorizeMcpCall({
        tenantId: "tn_alpha",
        claims: {
          sub: "user-2",
          tenant_id: "tn_beta",
          permissions: ["capability.business.pricing.quote.execute"],
        },
        packageId: "com.wanding.trade",
        mcpServerId: "quotation",
        capabilityId: "business.pricing.quote",
        correlationId: "corr-mcp-deny",
      }),
    /tenant scope/i,
  );
  const release = await plane.publishConfig({
    tenantId: "tn_alpha",
    config: {
      environment: "prod",
      enabledPackages: ["com.wanding.trade"],
      secrets: {
        aol: "secret://tenant/tn_alpha/prod/aol/access-token",
      },
    },
    canaryTargets: ["device-01"],
    expectedRevision: tenant.revision,
    actor: "admin",
    correlationId: "corr-release",
  });
  assert.equal(release.status, "canary");

  await plane.reportObserved({
    tenantId: "tn_alpha",
    deviceId: "device-01",
    configRevision: "wrong",
    packageLockRevision: "wrong",
    health: "degraded",
    actor: "device:device-01",
    correlationId: "corr-observed",
  });
  let dashboard = await plane.getDashboard("tn_alpha");
  assert.equal(dashboard.drift, true);
  assert.equal(dashboard.devices[0].drift, true);
  assert.ok(dashboard.audit.length >= 4);
  assert.ok(dashboard.audit.every((event) => event.tenant_id === "tn_alpha"));

  tenant = await plane.getTenant("tn_alpha");
  await plane.promoteConfig({
    tenantId: "tn_alpha",
    releaseId: release.releaseId,
    expectedRevision: tenant.revision,
    actor: "admin",
    correlationId: "corr-promote",
  });
  dashboard = await plane.getDashboard("tn_alpha");
  assert.equal(dashboard.desired.releaseStatus, "published");

  tenant = await plane.getTenant("tn_alpha");
  const rollback = await plane.rollbackConfig({
    tenantId: "tn_alpha",
    targetConfigRevision: release.configRevision,
    expectedRevision: tenant.revision,
    actor: "admin",
    correlationId: "corr-rollback",
  });
  assert.equal(rollback.rollbackOf, release.configRevision);
  await plane.audit({
    tenantId: "tn_alpha",
    actor: "admin",
    correlationId: "corr-redaction",
    action: "test.redaction",
    details: { accessToken: "must-not-appear" },
  });

  const auditText = await readFile(`${root}\\audit\\events.jsonl`, "utf8");
  assert.match(auditText, /"tenant_id":"tn_alpha"/);
  assert.doesNotMatch(auditText, /access-token[^"}]{5,}/);
  assert.doesNotMatch(auditText, /must-not-appear/);
  assert.match(auditText, /"accessToken":"<redacted>"/);
}

async function testIsolationAndConcurrency() {
  const root = await mkdtemp(`${tmpdir()}\\ccb-control-plane-`);
  const plane = new ControlPlane({
    root,
    catalogRoot,
    platformVersion: "1.1.2",
  });
  await plane.createTenant({
    tenantId: "tn_alpha",
    displayName: "Alpha",
    actor: "admin",
    correlationId: "corr-a",
  });
  await plane.createTenant({
    tenantId: "tn_beta",
    displayName: "Beta",
    actor: "admin",
    correlationId: "corr-b",
  });
  const alpha = await plane.getTenant("tn_alpha");
  await assert.rejects(
    () =>
      plane.setPackages({
        tenantId: "tn_alpha",
        packageIds: ["com.wanding.trade"],
        expectedRevision: alpha.revision + 1,
        actor: "admin",
        correlationId: "corr-conflict",
      }),
    /revision conflict/i,
  );
  const lockPath = `${root}\\tenants\\tn_alpha\\.control-plane.lock`;
  await mkdir(`${root}\\tenants\\tn_alpha`, { recursive: true });
  await writeFile(lockPath, "{}");
  await assert.rejects(
    () =>
      plane.setPackages({
        tenantId: "tn_alpha",
        packageIds: [],
        expectedRevision: alpha.revision,
        actor: "admin",
        correlationId: "corr-busy",
      }),
    /busy/i,
  );
  await unlink(lockPath);
  await assert.rejects(
    () =>
      plane.publishConfig({
        tenantId: "tn_alpha",
        config: { secrets: { aol: "literal-secret-value" } },
        expectedRevision: alpha.revision,
        actor: "admin",
        correlationId: "corr-secret",
      }),
    /secret reference/i,
  );
  assert.equal((await plane.getTenant("tn_beta")).packageLock.packages.length, 0);
}

const tests = [
  ["tenant package/config release and drift", testTenantReleaseAndDrift],
  ["tenant isolation and optimistic concurrency", testIsolationAndConcurrency],
];
for (const [name, test] of tests) {
  await test();
  console.log(`PASS ${name}`);
}
console.log(`PASS ${tests.length}/${tests.length} control-plane tests`);
