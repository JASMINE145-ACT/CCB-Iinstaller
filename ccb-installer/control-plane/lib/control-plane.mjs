import {
  appendFile,
  mkdir,
  open,
  readFile,
  readdir,
  rename,
  unlink,
  writeFile,
} from "node:fs/promises";
import { createHash } from "node:crypto";
import { dirname, join, relative, resolve } from "node:path";

const TENANT_ID = /^(?:tn_[a-z0-9][a-z0-9_-]*|[0-9a-f]{8}-[0-9a-f-]{27,})$/;
const PACKAGE_ID = /^[a-z0-9]+(?:\.[a-z0-9-]+)+$/;

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, stable(value[key])]),
    );
  }
  return value;
}

function stableJson(value) {
  return JSON.stringify(stable(value));
}

function hash(value) {
  return `sha256:${createHash("sha256").update(value).digest("hex")}`;
}

async function readJson(path) {
  return JSON.parse((await readFile(path, "utf8")).replace(/^\uFEFF/, ""));
}

async function atomicWriteJson(path, value) {
  await mkdir(dirname(path), { recursive: true });
  const temporary = `${path}.tmp-${Date.now()}-${Math.random()
    .toString(16)
    .slice(2)}`;
  await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  await rename(temporary, path);
}

async function listFiles(root, current = root) {
  const entries = await readdir(current, { withFileTypes: true });
  const files = [];
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    const path = join(current, entry.name);
    if (entry.isDirectory()) files.push(...(await listFiles(root, path)));
    else if (entry.isFile()) files.push(path);
  }
  return files;
}

async function hashDirectory(root) {
  const digest = createHash("sha256");
  for (const path of await listFiles(root)) {
    const rel = relative(root, path).replaceAll("\\", "/");
    digest.update(rel);
    digest.update("\0");
    digest.update(await readFile(path));
    digest.update("\0");
  }
  return `sha256:${digest.digest("hex")}`;
}

function requireTenantId(tenantId) {
  if (!TENANT_ID.test(tenantId ?? "")) {
    throw new Error(`Invalid tenant_id: ${tenantId ?? "<missing>"}`);
  }
}

function requireAuditContext({ actor, correlationId }) {
  if (!actor?.trim()) throw new Error("actor is required");
  if (!correlationId?.trim()) throw new Error("correlation_id is required");
}

function assertSecretReferences(value, path = "") {
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      assertSecretReferences(item, `${path}/${index}`),
    );
    return;
  }
  if (!value || typeof value !== "object") return;
  for (const [key, child] of Object.entries(value)) {
    const pointer = `${path}/${key}`;
    const secretContext =
      /\/(?:secrets?|credentials?)(?:\/|$)/i.test(pointer);
    if (
      (/(token|secret|password|credential|private.?key|api.?key|signature)/i.test(
        key,
      ) ||
        secretContext) &&
      (typeof child !== "object" || child === null)
    ) {
      if (typeof child !== "string" || !child.startsWith("secret://")) {
        throw new Error(`${pointer} must be a secret reference`);
      }
    }
    if (
      typeof child === "string" &&
      /(?:sk-[A-Za-z0-9_-]{16,}|aat\.[A-Za-z0-9._/+=-]{16,})/.test(child)
    ) {
      throw new Error(`${pointer} must be a secret reference`);
    }
    assertSecretReferences(child, pointer);
  }
}

function redactAudit(value, key = "") {
  if (/(token|secret|password|credential|private.?key)/i.test(key)) {
    return "<redacted>";
  }
  if (Array.isArray(value)) {
    return value.map((item) => redactAudit(item));
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([childKey, child]) => [
        childKey,
        redactAudit(child, childKey),
      ]),
    );
  }
  if (
    typeof value === "string" &&
    /(?:sk-[A-Za-z0-9_-]{16,}|aat\.[A-Za-z0-9._/+=-]{16,})/.test(value)
  ) {
    return "<redacted>";
  }
  return value;
}

export class ControlPlane {
  constructor({ root, catalogRoot, platformVersion }) {
    if (!root || !catalogRoot || !platformVersion) {
      throw new Error("root, catalogRoot, and platformVersion are required");
    }
    this.root = resolve(root);
    this.catalogRoot = resolve(catalogRoot);
    this.platformVersion = platformVersion;
  }

  tenantPath(tenantId) {
    requireTenantId(tenantId);
    return join(this.root, "tenants", tenantId, "tenant.json");
  }

  async withTenantLock(tenantId, operation) {
    requireTenantId(tenantId);
    const lockPath = join(this.root, "tenants", tenantId, ".control-plane.lock");
    await mkdir(dirname(lockPath), { recursive: true });
    let handle;
    try {
      handle = await open(lockPath, "wx");
      await handle.writeFile(
        `${JSON.stringify({ pid: process.pid, createdAt: new Date().toISOString() })}\n`,
      );
    } catch (error) {
      if (error.code === "EEXIST") {
        throw new Error(`Tenant ${tenantId} is busy; control-plane lock exists`);
      }
      throw error;
    }
    try {
      return await operation();
    } finally {
      await handle.close();
      await unlink(lockPath).catch((error) => {
        if (error.code !== "ENOENT") throw error;
      });
    }
  }

  async audit({
    tenantId,
    actor,
    correlationId,
    action,
    result = "success",
    packageId = null,
    configRevision = null,
    details = {},
  }) {
    requireTenantId(tenantId);
    requireAuditContext({ actor, correlationId });
    const event = {
      schemaVersion: "1.0.0",
      timestamp: new Date().toISOString(),
      tenant_id: tenantId,
      actor,
      correlation_id: correlationId,
      action,
      result,
      package_id: packageId,
      config_revision: configRevision,
      details: redactAudit(details),
    };
    const path = join(this.root, "audit", "events.jsonl");
    await mkdir(dirname(path), { recursive: true });
    await appendFile(path, `${JSON.stringify(event)}\n`, "utf8");
    return event;
  }

  async createTenant({
    tenantId,
    displayName,
    actor,
    correlationId,
  }) {
    requireTenantId(tenantId);
    requireAuditContext({ actor, correlationId });
    if (!displayName?.trim()) throw new Error("displayName is required");
    const tenant = await this.withTenantLock(tenantId, async () => {
      const path = this.tenantPath(tenantId);
      try {
        await readFile(path);
        throw new Error(`Tenant ${tenantId} already exists`);
      } catch (error) {
        if (error.code !== "ENOENT") throw error;
      }
      const next = {
      schemaVersion: "1.0.0",
      tenant_id: tenantId,
      displayName,
      revision: 0,
      environment: "prod",
      packageLock: {
        schemaVersion: "1.0.0",
        revision: null,
        platformVersion: this.platformVersion,
        configRevision: null,
        packages: [],
      },
      desired: {
        configRevision: null,
        releaseId: null,
        releaseStatus: null,
      },
      releases: [],
      observed: {},
      };
      next.packageLock.revision = hash(stableJson(next.packageLock));
      await atomicWriteJson(path, next);
      return next;
    });
    await this.audit({
      tenantId,
      actor,
      correlationId,
      action: "tenant.create",
      details: { displayName },
    });
    return tenant;
  }

  async getTenant(tenantId) {
    requireTenantId(tenantId);
    try {
      return await readJson(this.tenantPath(tenantId));
    } catch (error) {
      if (error.code === "ENOENT") {
        throw new Error(`Tenant ${tenantId} not found`);
      }
      throw error;
    }
  }

  async mutateTenant({
    tenantId,
    expectedRevision,
    actor,
    correlationId,
    action,
    mutate,
    auditDetails = {},
  }) {
    requireAuditContext({ actor, correlationId });
    let next;
    let result;
    await this.withTenantLock(tenantId, async () => {
      const current = await this.getTenant(tenantId);
      if (
        expectedRevision !== undefined &&
        current.revision !== expectedRevision
      ) {
        throw new Error(
          `Revision conflict for ${tenantId}: expected ${expectedRevision}, actual ${current.revision}`,
        );
      }
      next = structuredClone(current);
      result = await mutate(next, current);
      next.revision = current.revision + 1;
      await atomicWriteJson(this.tenantPath(tenantId), next);
    });
    await this.audit({
      tenantId,
      actor,
      correlationId,
      action,
      configRevision: next.desired.configRevision,
      details: auditDetails,
    });
    return result ?? next;
  }

  async getCatalog() {
    const packages = [];
    for (const entry of (
      await readdir(this.catalogRoot, { withFileTypes: true })
    )
      .filter((item) => item.isDirectory())
      .sort((a, b) => a.name.localeCompare(b.name))) {
      const packageRoot = join(this.catalogRoot, entry.name);
      const manifest = await readJson(join(packageRoot, "package.json"));
      if (!PACKAGE_ID.test(manifest.packageId ?? "")) {
        throw new Error(`Invalid catalog package: ${manifest.packageId}`);
      }
      packages.push({
        packageId: manifest.packageId,
        version: manifest.version,
        sha256: await hashDirectory(packageRoot),
        capabilities: manifest.capabilities.map((item) => item.id).sort(),
        mcpServers: manifest.mcpServers
          .map((item) => ({
            id: item.id,
            capabilities: [...(item.providesCapabilities ?? [])].sort(),
          }))
          .sort((a, b) => a.id.localeCompare(b.id)),
      });
    }
    return {
      schemaVersion: "1.0.0",
      platformVersion: this.platformVersion,
      packages,
      revision: hash(stableJson(packages)),
    };
  }

  async setPackages({
    tenantId,
    packageIds,
    expectedRevision,
    actor,
    correlationId,
  }) {
    const catalog = await this.getCatalog();
    const byId = new Map(catalog.packages.map((item) => [item.packageId, item]));
    const packages = [...new Set(packageIds)].sort().map((id) => {
      const descriptor = byId.get(id);
      if (!descriptor) throw new Error(`Unknown package ${id}`);
      return {
        packageId: id,
        version: descriptor.version,
        sha256: descriptor.sha256,
      };
    });
    return this.mutateTenant({
      tenantId,
      expectedRevision,
      actor,
      correlationId,
      action: "package.lock.update",
      auditDetails: { packageIds: packages.map((item) => item.packageId) },
      mutate: (tenant) => {
        tenant.packageLock = {
          schemaVersion: "1.0.0",
          revision: null,
          platformVersion: this.platformVersion,
          configRevision: tenant.desired.configRevision,
          packages,
        };
        tenant.packageLock.revision = hash(
          stableJson({ ...tenant.packageLock, revision: null }),
        );
        return tenant.packageLock;
      },
    });
  }

  async publishConfig({
    tenantId,
    config,
    canaryTargets = [],
    expectedRevision,
    actor,
    correlationId,
  }) {
    assertSecretReferences(config);
    return this.mutateTenant({
      tenantId,
      expectedRevision,
      actor,
      correlationId,
      action: "config.release.create",
      auditDetails: { canaryTargetCount: canaryTargets.length },
      mutate: async (tenant) => {
        const configRevision = hash(stableJson(config));
        const releaseId = `rel-${tenant.revision + 1}-${configRevision.slice(7, 19)}`;
        const status = canaryTargets.length ? "canary" : "published";
        const release = {
          releaseId,
          configRevision,
          status,
          canaryTargets: [...new Set(canaryTargets)].sort(),
          rollbackOf: null,
        };
        const revisionPath = join(
          this.root,
          "tenants",
          tenantId,
          "config-revisions",
          `${configRevision.slice(7)}.json`,
        );
        try {
          await readFile(revisionPath);
        } catch (error) {
          if (error.code !== "ENOENT") throw error;
          await atomicWriteJson(revisionPath, {
            schemaVersion: "1.0.0",
            tenant_id: tenantId,
            configRevision,
            config,
          });
        }
        tenant.releases.push(release);
        tenant.desired = {
          configRevision,
          releaseId,
          releaseStatus: status,
        };
        tenant.packageLock.configRevision = configRevision;
        tenant.packageLock.revision = hash(
          stableJson({ ...tenant.packageLock, revision: null }),
        );
        return release;
      },
    });
  }

  async promoteConfig({
    tenantId,
    releaseId,
    expectedRevision,
    actor,
    correlationId,
  }) {
    return this.mutateTenant({
      tenantId,
      expectedRevision,
      actor,
      correlationId,
      action: "config.release.promote",
      auditDetails: { releaseId },
      mutate: (tenant) => {
        const release = tenant.releases.find(
          (item) => item.releaseId === releaseId,
        );
        if (!release) throw new Error(`Release ${releaseId} not found`);
        release.status = "published";
        tenant.desired = {
          configRevision: release.configRevision,
          releaseId,
          releaseStatus: "published",
        };
        return release;
      },
    });
  }

  async rollbackConfig({
    tenantId,
    targetConfigRevision,
    expectedRevision,
    actor,
    correlationId,
  }) {
    const targetPath = join(
      this.root,
      "tenants",
      tenantId,
      "config-revisions",
      `${targetConfigRevision.replace(/^sha256:/, "")}.json`,
    );
    const target = await readJson(targetPath);
    const rollbackConfig = {
      ...target.config,
      controlPlane: {
        ...(target.config.controlPlane ?? {}),
        rollbackOf: targetConfigRevision,
      },
    };
    const release = await this.publishConfig({
      tenantId,
      config: rollbackConfig,
      expectedRevision,
      actor,
      correlationId,
    });
    release.rollbackOf = targetConfigRevision;
    await this.mutateTenant({
      tenantId,
      expectedRevision: expectedRevision + 1,
      actor,
      correlationId: `${correlationId}:mark`,
      action: "config.release.rollback",
      auditDetails: { targetConfigRevision },
      mutate: (tenant) => {
        const stored = tenant.releases.find(
          (item) => item.releaseId === release.releaseId,
        );
        stored.rollbackOf = targetConfigRevision;
        return stored;
      },
    });
    return release;
  }

  async reportObserved({
    tenantId,
    deviceId,
    configRevision,
    packageLockRevision,
    health,
    actor,
    correlationId,
  }) {
    if (!deviceId?.trim()) throw new Error("deviceId is required");
    return this.mutateTenant({
      tenantId,
      actor,
      correlationId,
      action: "observed.report",
      auditDetails: { deviceId, health },
      mutate: (tenant) => {
        tenant.observed[deviceId] = {
          deviceId,
          configRevision,
          packageLockRevision,
          health,
          reportedAt: new Date().toISOString(),
        };
        return tenant.observed[deviceId];
      },
    });
  }

  async createClientProjection({
    tenantId,
    gatewayBaseUrl,
    oidcAudience,
  }) {
    const tenant = await this.getTenant(tenantId);
    let gateway;
    try {
      gateway = new URL(gatewayBaseUrl);
    } catch {
      throw new Error("gatewayBaseUrl must be a valid HTTPS URL");
    }
    if (gateway.protocol !== "https:") {
      throw new Error("gatewayBaseUrl must use HTTPS");
    }
    if (!oidcAudience?.trim()) throw new Error("oidcAudience is required");
    const catalog = await this.getCatalog();
    const byId = new Map(catalog.packages.map((item) => [item.packageId, item]));
    const mcpServers = {};
    for (const locked of tenant.packageLock.packages) {
      const descriptor = byId.get(locked.packageId);
      if (!descriptor) {
        throw new Error(`Locked package ${locked.packageId} is absent from catalog`);
      }
      for (const mcp of descriptor.mcpServers) {
        mcpServers[mcp.id] = {
          type: "http",
          url: new URL(
            `tenants/${tenantId}/packages/${locked.packageId}/mcp/${mcp.id}`,
            gateway.href.endsWith("/") ? gateway.href : `${gateway.href}/`,
          ).href,
          auth: {
            mode: "oidc-bearer",
            audience: oidcAudience,
            tenantClaim: "tenant_id",
          },
          requiredPermissions: mcp.capabilities.map(
            (capability) => `capability.${capability}.execute`,
          ),
        };
      }
    }
    return {
      schemaVersion: "1.0.0",
      tenant_id: tenantId,
      configRevision: tenant.desired.configRevision,
      packageLockRevision: tenant.packageLock.revision,
      mcpServers,
    };
  }

  async authorizeMcpCall({
    tenantId,
    claims,
    packageId,
    mcpServerId,
    capabilityId,
    correlationId,
  }) {
    requireTenantId(tenantId);
    const actor = `user:${claims?.sub ?? "unknown"}`;
    requireAuditContext({ actor, correlationId });
    let denial = null;
    const tenant = await this.getTenant(tenantId);
    const locked = tenant.packageLock.packages.find(
      (item) => item.packageId === packageId,
    );
    if (claims?.tenant_id !== tenantId) denial = "tenant scope mismatch";
    else if (!locked) denial = "package is not locked for tenant";
    const catalog = await this.getCatalog();
    const packageDescriptor = catalog.packages.find(
      (item) => item.packageId === packageId,
    );
    const mcp = packageDescriptor?.mcpServers.find(
      (item) => item.id === mcpServerId,
    );
    if (!denial && !mcp) denial = "MCP server is not declared by package";
    if (!denial && !mcp.capabilities.includes(capabilityId)) {
      denial = "capability is not provided by MCP server";
    }
    const permission = `capability.${capabilityId}.execute`;
    if (!denial && !(claims.permissions ?? []).includes(permission)) {
      denial = `permission missing: ${permission}`;
    }
    if (denial) {
      await this.audit({
        tenantId,
        actor,
        correlationId,
        action: "mcp.call.authorize",
        result: "denied",
        packageId,
        details: { mcpServerId, capabilityId, reason: denial },
      });
      throw new Error(`MCP authorization denied: ${denial}`);
    }
    await this.audit({
      tenantId,
      actor,
      correlationId,
      action: "mcp.call.authorize",
      packageId,
      details: { mcpServerId, capabilityId, permission },
    });
    return {
      tenant_id: tenantId,
      package_id: packageId,
      mcp_server_id: mcpServerId,
      capability_id: capabilityId,
      actor,
      correlation_id: correlationId,
    };
  }

  async getAuditEvents(tenantId, limit = 50) {
    requireTenantId(tenantId);
    try {
      return (await readFile(join(this.root, "audit", "events.jsonl"), "utf8"))
        .split(/\r?\n/)
        .filter(Boolean)
        .map((line) => JSON.parse(line))
        .filter((event) => event.tenant_id === tenantId)
        .slice(-limit);
    } catch (error) {
      if (error.code === "ENOENT") return [];
      throw error;
    }
  }

  async getDashboard(tenantId) {
    const tenant = await this.getTenant(tenantId);
    const devices = Object.values(tenant.observed)
      .map((item) => ({
        ...item,
        drift:
          item.configRevision !== tenant.desired.configRevision ||
          item.packageLockRevision !== tenant.packageLock.revision,
      }))
      .sort((a, b) => a.deviceId.localeCompare(b.deviceId));
    return {
      schemaVersion: "1.0.0",
      tenant_id: tenant.tenant_id,
      displayName: tenant.displayName,
      revision: tenant.revision,
      desired: tenant.desired,
      packageLock: tenant.packageLock,
      devices,
      drift: devices.some((item) => item.drift),
      audit: await this.getAuditEvents(tenantId),
    };
  }
}
