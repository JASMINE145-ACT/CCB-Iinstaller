import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { ControlPlane } from "./lib/control-plane.mjs";
import {
  validateOidcVerifierConfig,
  verifyJwt,
} from "./lib/jwks-verifier.mjs";
import { SecretStore } from "./lib/secret-store.mjs";

function value(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : null;
}

function required(name) {
  const result = value(name);
  if (!result) throw new Error(`${name} is required`);
  return result;
}

async function jsonFile(name) {
  return JSON.parse(await readFile(resolve(required(name)), "utf8"));
}

const command = process.argv[2];
const here = dirname(fileURLToPath(import.meta.url));
const root = value("--root");
if (!command) throw new Error("Control-plane command is required");

if (command === "verify-token") {
  const config = validateOidcVerifierConfig(await jsonFile("--oidc-config"));
  const claims = verifyJwt(
    (await readFile(resolve(required("--token-file")), "utf8")).trim(),
    {
      jwks: await jsonFile("--jwks"),
      issuer: config.issuer,
      audience: config.audience,
      tenantId: required("--tenant"),
      requiredPermissions: (value("--permissions") ?? "")
        .split(",")
        .filter(Boolean),
    },
  );
  console.log(JSON.stringify(claims, null, 2));
} else if (command === "secret-put") {
  if (!root) throw new Error("--root is required");
  const plane = new ControlPlane({
    root: resolve(root),
    catalogRoot: resolve(joinCatalogRoot(here)),
    platformVersion: value("--platform-version") ?? "1.1.2",
  });
  const store = new SecretStore({
    root: resolve(root, "secrets"),
    masterKey: process.env.CONTROL_PLANE_MASTER_KEY,
    audit: (event) => plane.audit(event),
  });
  const secretTenantId = required("--tenant");
  await plane.getTenant(secretTenantId);
  const reference = await store.put({
    tenantId: secretTenantId,
    environment: required("--environment"),
    name: required("--name"),
    value: (await readFile(resolve(required("--value-file")), "utf8")).trim(),
    actor: value("--actor") ?? "admin-cli",
    correlationId:
      value("--correlation-id") ?? `cli-${Date.now().toString(36)}`,
  });
  console.log(JSON.stringify({ secretRef: reference }, null, 2));
} else {
  if (!root) throw new Error("--root is required");
  const plane = new ControlPlane({
    root: resolve(root),
    catalogRoot: resolve(
      value("--catalog-root") ?? joinCatalogRoot(here),
    ),
    platformVersion: value("--platform-version") ?? "1.1.2",
  });
  const tenantId = value("--tenant");
  const actor = value("--actor") ?? "admin-cli";
  const correlationId =
    value("--correlation-id") ?? `cli-${Date.now().toString(36)}`;
  let result;
  if (command === "tenant-create") {
    result = await plane.createTenant({
      tenantId: required("--tenant"),
      displayName: required("--name"),
      actor,
      correlationId,
    });
  } else if (command === "catalog") {
    result = await plane.getCatalog();
  } else if (command === "dashboard") {
    result = await plane.getDashboard(required("--tenant"));
  } else if (command === "client-projection") {
    result = await plane.createClientProjection({
      tenantId: required("--tenant"),
      gatewayBaseUrl: required("--gateway-url"),
      oidcAudience: required("--oidc-audience"),
    });
  } else if (command === "packages-set") {
    const tenant = await plane.getTenant(required("--tenant"));
    result = await plane.setPackages({
      tenantId,
      packageIds: required("--packages").split(",").filter(Boolean),
      expectedRevision: Number(value("--expected-revision") ?? tenant.revision),
      actor,
      correlationId,
    });
  } else if (command === "config-publish") {
    const tenant = await plane.getTenant(required("--tenant"));
    result = await plane.publishConfig({
      tenantId,
      config: await jsonFile("--config"),
      canaryTargets: (value("--canary-targets") ?? "")
        .split(",")
        .filter(Boolean),
      expectedRevision: Number(value("--expected-revision") ?? tenant.revision),
      actor,
      correlationId,
    });
  } else if (command === "config-promote") {
    const tenant = await plane.getTenant(required("--tenant"));
    result = await plane.promoteConfig({
      tenantId,
      releaseId: required("--release"),
      expectedRevision: Number(value("--expected-revision") ?? tenant.revision),
      actor,
      correlationId,
    });
  } else if (command === "config-rollback") {
    const tenant = await plane.getTenant(required("--tenant"));
    result = await plane.rollbackConfig({
      tenantId,
      targetConfigRevision: required("--config-revision"),
      expectedRevision: Number(value("--expected-revision") ?? tenant.revision),
      actor,
      correlationId,
    });
  } else if (command === "observed-report") {
    result = await plane.reportObserved({
      tenantId: required("--tenant"),
      deviceId: required("--device"),
      configRevision: required("--config-revision"),
      packageLockRevision: required("--package-lock-revision"),
      health: required("--health"),
      actor,
      correlationId,
    });
  } else {
    throw new Error(`Unknown control-plane command: ${command}`);
  }
  console.log(JSON.stringify(result, null, 2));
}

function joinCatalogRoot(base) {
  return resolve(base, "..", "packages", "vertical");
}
