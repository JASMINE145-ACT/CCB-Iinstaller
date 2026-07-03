import { createHash } from "node:crypto";

const LAYER_ORDER = new Map([
  ["platform", 0],
  ["environment", 1],
  ["package", 2],
  ["tenant", 3],
  ["user", 4],
  ["session", 5],
]);
const LAYER_FIELDS = new Set([
  "$schema",
  "schemaVersion",
  "id",
  "kind",
  "tenantId",
  "revision",
  "enabledPackages",
  "values",
  "lockedPaths",
  "secretPaths",
  "userOverridablePaths",
  "sessionOverridablePaths",
  "_index",
]);

function clone(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

function escapePointer(value) {
  return value.replaceAll("~", "~0").replaceAll("/", "~1");
}

function leafEntries(value, prefix = "") {
  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    return [[prefix || "/", value]];
  }
  if (Object.keys(value).length === 0) return [];
  return Object.keys(value)
    .sort()
    .flatMap((key) =>
      leafEntries(value[key], `${prefix}/${escapePointer(key)}`),
    );
}

function pointerParts(pointer) {
  if (pointer === "/") return [];
  return pointer
    .slice(1)
    .split("/")
    .map((part) => part.replaceAll("~1", "/").replaceAll("~0", "~"));
}

function setPointer(target, pointer, value) {
  const parts = pointerParts(pointer);
  if (parts.length === 0) return clone(value);
  let current = target;
  for (const part of parts.slice(0, -1)) {
    if (
      current[part] === null ||
      typeof current[part] !== "object" ||
      Array.isArray(current[part])
    ) {
      current[part] = {};
    }
    current = current[part];
  }
  current[parts.at(-1)] = clone(value);
  return target;
}

function getPointer(target, pointer) {
  let current = target;
  for (const part of pointerParts(pointer)) {
    if (current === null || typeof current !== "object") return undefined;
    current = current[part];
  }
  return current;
}

function pathAllowed(pointer, allowed) {
  return allowed.some(
    (candidate) =>
      pointer === candidate || pointer.startsWith(`${candidate}/`),
  );
}

export function canonicalStringify(value) {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map(canonicalStringify).join(",")}]`;
  }
  return `{${Object.keys(value)
    .sort()
    .map(
      (key) =>
        `${JSON.stringify(key)}:${canonicalStringify(value[key])}`,
    )
    .join(",")}}`;
}

function hashProjection(value) {
  return `sha256:${createHash("sha256")
    .update(canonicalStringify(value))
    .digest("hex")}`;
}

export function mergeConfigLayers(inputLayers) {
  const layers = inputLayers
    .map((layer, index) => ({ ...layer, _index: index }))
    .sort(
      (a, b) =>
        (LAYER_ORDER.get(a.kind) ?? 99) -
          (LAYER_ORDER.get(b.kind) ?? 99) ||
        a._index - b._index,
    );
  let values = {};
  const provenance = {};
  const locked = new Map();
  const secretPaths = new Set();
  const userAllowed = new Set();
  const sessionAllowed = new Set();

  for (const layer of layers) {
    const unknownFields = Object.keys(layer).filter(
      (field) => !LAYER_FIELDS.has(field),
    );
    if (unknownFields.length > 0) {
      throw new Error(
        `Unknown config layer field(s) in ${layer.id ?? "<missing>"}: ${unknownFields.join(", ")}`,
      );
    }
    if (
      layer.schemaVersion !== undefined &&
      layer.schemaVersion !== "1.0.0"
    ) {
      throw new Error(
        `Unsupported config layer schemaVersion in ${layer.id}: ${layer.schemaVersion}`,
      );
    }
    if (
      !layer.id ||
      !LAYER_ORDER.has(layer.kind) ||
      !layer.values ||
      typeof layer.values !== "object" ||
      Array.isArray(layer.values)
    ) {
      throw new Error(`Invalid config layer: ${layer.id ?? "<missing>"}`);
    }
    for (const [pointer, value] of leafEntries(layer.values ?? {})) {
      const lockOwner = [...locked.entries()].find(
        ([lockedPath]) =>
          pointer === lockedPath || pointer.startsWith(`${lockedPath}/`),
      );
      if (lockOwner && provenance[pointer]?.layerId !== layer.id) {
        throw new Error(
          `Cannot override locked path ${pointer}; owned by ${lockOwner[1]}`,
        );
      }
      if (layer.kind === "user" && !pathAllowed(pointer, [...userAllowed])) {
        throw new Error(`Path ${pointer} is not user-overridable`);
      }
      if (
        layer.kind === "session" &&
        !pathAllowed(pointer, [...sessionAllowed])
      ) {
        throw new Error(`Path ${pointer} is not session-overridable`);
      }
      values = setPointer(values, pointer, value);
      provenance[pointer] = {
        layerId: layer.id,
        layerKind: layer.kind,
      };
    }
    for (const pointer of layer.lockedPaths ?? []) {
      locked.set(pointer, layer.id);
    }
    for (const pointer of layer.secretPaths ?? []) secretPaths.add(pointer);
    for (const pointer of layer.userOverridablePaths ?? [])
      userAllowed.add(pointer);
    for (const pointer of layer.sessionOverridablePaths ?? [])
      sessionAllowed.add(pointer);
  }

  for (const pointer of secretPaths) {
    const value = getPointer(values, pointer);
    if (
      typeof value !== "string" ||
      !value.startsWith("secret://")
    ) {
      throw new Error(`Secret path ${pointer} must contain a secret reference`);
    }
  }

  return {
    values,
    provenance,
    policy: {
      lockedPaths: Object.fromEntries(locked),
      secretPaths: [...secretPaths].sort(),
      userOverridablePaths: [...userAllowed].sort(),
      sessionOverridablePaths: [...sessionAllowed].sort(),
    },
  };
}

function interpolate(value, variables) {
  if (typeof value === "string") {
    const template = value;
    let resolved = value.replace(/\$\{([A-Za-z][A-Za-z0-9_]*)\}/g, (_, key) => {
      if (!(key in variables)) {
        throw new Error(`Missing template variable: ${key}`);
      }
      return variables[key];
    });
    if (
      (template.includes("${installDir}") &&
        String(variables.installDir).includes("\\")) ||
      (template.includes("${configDir}") &&
        String(variables.configDir).includes("\\"))
    ) {
      resolved = resolved.replaceAll("/", "\\");
    }
    return resolved;
  }
  if (Array.isArray(value)) return value.map((item) => interpolate(item, variables));
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        key,
        interpolate(item, variables),
      ]),
    );
  }
  return value;
}

function resolveSecrets(value, secrets, provenance, prefix = "") {
  if (typeof value === "string" && value.startsWith("secret://")) {
    if (!(value in secrets) || secrets[value] === "") {
      throw new Error(`Unresolved secret reference: ${value}`);
    }
    const entry = provenance[prefix || "/"] ?? {
      layerId: "package",
      layerKind: "package",
    };
    provenance[prefix || "/"] = {
      ...entry,
      secretRef: value,
      redacted: true,
    };
    return secrets[value];
  }
  if (Array.isArray(value)) {
    return value.map((item, index) =>
      resolveSecrets(item, secrets, provenance, `${prefix}/${index}`),
    );
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        key,
        resolveSecrets(
          item,
          secrets,
          provenance,
          `${prefix}/${escapePointer(key)}`,
        ),
      ]),
    );
  }
  return value;
}

function packageLayers(packageManifests, enabledPackages) {
  const byId = new Map(
    (packageManifests ?? []).map((manifest) => [manifest.packageId, manifest]),
  );
  return enabledPackages.map((packageId) => {
    const manifest = byId.get(packageId);
    if (!manifest) throw new Error(`Enabled package not found: ${packageId}`);
    const mcpServers = {};
    const secretPaths = [];
    for (const descriptor of manifest.mcpServers ?? []) {
      if (descriptor.runtime) {
        mcpServers[descriptor.id] = descriptor.runtime;
        for (const pointer of descriptor.runtimeSecretPaths ?? []) {
          secretPaths.push(
            `/mcpServers/${escapePointer(descriptor.id)}${pointer}`,
          );
        }
      }
    }
    return {
      id: `package:${packageId}`,
      kind: "package",
      values: { mcpServers },
      secretPaths,
    };
  });
}

function buildAgentProjection(registry, enabledPackages) {
  const enabled = new Set(enabledPackages);
  return {
    schemaVersion: "1.0.0",
    agents: (registry.agents ?? [])
      .filter((agent) => agent.packageId && enabled.has(agent.packageId))
      .map((agent) => ({
        id: agent.id,
        packageId: agent.packageId,
        mcpServers: agent.mcpServers,
        skills: agent.skills,
        requiredCapabilities: agent.requiredCapabilities,
      }))
      .sort((a, b) => a.id.localeCompare(b.id)),
  };
}

function buildHealthPlan(registry, settings) {
  const configured = new Set(Object.keys(settings.mcpServers ?? {}));
  return {
    schemaVersion: "1.0.0",
    servers: (registry.mcpServers ?? [])
      .filter((server) => configured.has(server.id))
      .map((server) => ({
        id: server.id,
        packageId: server.packageId,
        required: server.packageId !== null,
      }))
      .sort((a, b) => a.id.localeCompare(b.id)),
  };
}

export function compileRuntimeConfig({
  layers,
  registry,
  packageManifests = [],
  enabledPackages,
  variables,
  secrets,
}) {
  const packageConfigLayers = packageLayers(
    packageManifests,
    enabledPackages ?? [],
  );
  const merged = mergeConfigLayers([...layers, ...packageConfigLayers]);
  const interpolated = interpolate(merged.values, variables);
  const provenance = clone(merged.provenance);
  const settings = resolveSecrets(
    interpolated,
    secrets,
    provenance,
  );
  const agentProjection = buildAgentProjection(
    registry,
    enabledPackages ?? [],
  );
  const healthPlan = buildHealthPlan(registry, settings);
  const revision = hashProjection({
    desired: interpolated,
    enabledPackages: [...(enabledPackages ?? [])].sort(),
    agentProjection,
    healthPlan,
  });

  const metadata = {
    schemaVersion: "1.0.0",
    revision,
    projections: {
      settings: { sha256: hashProjection(settings) },
      agents: { sha256: hashProjection(agentProjection) },
      healthPlan: { sha256: hashProjection(healthPlan) },
    },
  };

  return {
    schemaVersion: "1.0.0",
    revision,
    settings,
    agentProjection,
    healthPlan,
    provenance,
    policy: merged.policy,
    metadata,
  };
}

export function detectProjectionDrift(projection, metadata, name = "settings") {
  const actualHash = hashProjection(projection);
  const expectedHash = metadata?.projections?.[name]?.sha256 ?? null;
  return {
    projection: name,
    expectedHash,
    actualHash,
    drift: expectedHash !== actualHash,
  };
}
