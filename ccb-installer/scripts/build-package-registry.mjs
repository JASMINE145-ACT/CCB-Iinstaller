import {
  mkdir,
  readFile,
  readdir,
  writeFile,
} from "node:fs/promises";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const PACKAGE_ID = /^[a-z0-9]+(?:\.[a-z0-9-]+)+$/;
const CAPABILITY_ID = /^(platform|business)(?:\.[a-z0-9-]+)+$/;
const SEMVER = /^\d+\.\d+\.\d+$/;

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

async function listFiles(path, suffix = "") {
  try {
    return (await readdir(path, { withFileTypes: true }))
      .filter((item) => item.isFile() && item.name.endsWith(suffix))
      .map((item) => item.name)
      .sort();
  } catch (error) {
    if (error.code === "ENOENT") return [];
    throw error;
  }
}

async function listDirectories(path) {
  try {
    return (await readdir(path, { withFileTypes: true }))
      .filter((item) => item.isDirectory())
      .map((item) => item.name)
      .sort();
  } catch (error) {
    if (error.code === "ENOENT") return [];
    throw error;
  }
}

function duplicateDiagnostics(items, kind) {
  const seen = new Set();
  const diagnostics = [];
  for (const item of items) {
    if (seen.has(item.id)) {
      diagnostics.push({
        severity: "error",
        code: "duplicate-descriptor",
        message: `Duplicate ${kind} id: ${item.id}`,
      });
    }
    seen.add(item.id);
  }
  return diagnostics;
}

export function validatePackageManifest(manifest) {
  const diagnostics = [];
  const requiredArrays = [
    "capabilities",
    "agents",
    "mcpServers",
    "skills",
    "knowledge",
    "contributions",
    "aliases",
  ];

  if (manifest?.schemaVersion !== "1.0.0") {
    diagnostics.push({
      severity: "error",
      code: "invalid-schema-version",
      message: "schemaVersion must be 1.0.0",
    });
  }
  if (!PACKAGE_ID.test(manifest?.packageId ?? "")) {
    diagnostics.push({
      severity: "error",
      code: "invalid-package-id",
      message: `Invalid packageId: ${manifest?.packageId ?? "<missing>"}`,
    });
  }
  if (!SEMVER.test(manifest?.version ?? "")) {
    diagnostics.push({
      severity: "error",
      code: "invalid-package-version",
      message: `Invalid package version: ${manifest?.version ?? "<missing>"}`,
    });
  }
  for (const field of requiredArrays) {
    if (!Array.isArray(manifest?.[field])) {
      diagnostics.push({
        severity: "error",
        code: "missing-array",
        message: `${field} must be an array`,
      });
    }
  }
  if (diagnostics.some((item) => item.code === "missing-array")) {
    return diagnostics;
  }

  for (const capability of manifest.capabilities) {
    if (!CAPABILITY_ID.test(capability.id ?? "")) {
      diagnostics.push({
        severity: "error",
        code: "invalid-capability-id",
        message: `Invalid capability id: ${capability.id ?? "<missing>"}`,
      });
    }
  }
  for (const [field, kind] of [
    ["capabilities", "capability"],
    ["agents", "agent"],
    ["mcpServers", "MCP server"],
    ["skills", "skill"],
    ["knowledge", "knowledge"],
    ["contributions", "contribution"],
  ]) {
    diagnostics.push(...duplicateDiagnostics(manifest[field], kind));
  }

  const capabilityIds = new Set(manifest.capabilities.map((item) => item.id));
  for (const agent of manifest.agents) {
    for (const id of agent.requiredCapabilities ?? []) {
      if (!capabilityIds.has(id)) {
        diagnostics.push({
          severity: "error",
          code: "unresolved-capability",
          message: `Agent ${agent.id} references undeclared capability ${id}`,
        });
      }
    }
  }

  return diagnostics;
}

function parseFrontmatterList(markdown, field) {
  const block = markdown.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!block) return [];
  const lines = block[1].split(/\r?\n/);
  const index = lines.findIndex((line) => line.trim() === `${field}:`);
  if (index < 0) return [];
  const values = [];
  for (const line of lines.slice(index + 1)) {
    const match = line.match(/^\s+-\s+(.+?)\s*$/);
    if (!match) break;
    values.push(match[1].replace(/^["']|["']$/g, ""));
  }
  return values;
}

function ownerIndex(packages, field) {
  const index = new Map();
  for (const manifest of packages) {
    for (const descriptor of manifest[field]) {
      const owners = index.get(descriptor.id) ?? [];
      owners.push({ packageId: manifest.packageId, descriptor });
      index.set(descriptor.id, owners);
    }
  }
  return index;
}

function ownerDiagnostics(index, kind) {
  const diagnostics = [];
  for (const [id, owners] of index) {
    if (owners.length > 1) {
      diagnostics.push({
        severity: "error",
        code: "duplicate-owner",
        message: `${kind} ${id} is declared by ${owners.map((item) => item.packageId).join(", ")}`,
      });
    }
  }
  return diagnostics;
}

export async function buildRegistry({ repoRoot }) {
  const installerRoot = resolve(repoRoot, "ccb-installer");
  const packageRoots = [
    join(installerRoot, "packages", "vertical"),
    join(installerRoot, "config", "packages"),
  ];
  const manifests = [];
  const diagnostics = [];

  for (const packagesRoot of packageRoots) {
    const packageDirs = await listDirectories(packagesRoot);
    for (const directory of packageDirs) {
      const path = join(packagesRoot, directory, "package.json");
      let manifest;
      try {
        manifest = await readJson(path);
      } catch (error) {
        if (error.code === "ENOENT") continue;
        throw error;
      }
      if (manifests.some((item) => item.packageId === manifest.packageId)) {
        diagnostics.push({
          severity: "error",
          code: "duplicate-package",
          message: `Package ${manifest.packageId} has more than one canonical manifest`,
          source: relative(repoRoot, path).replaceAll("\\", "/"),
        });
        continue;
      }
      manifests.push(manifest);
      diagnostics.push(
        ...validatePackageManifest(manifest).map((item) => ({
          ...item,
          source: relative(repoRoot, path).replaceAll("\\", "/"),
        })),
      );
    }
  }

  const agentOwners = ownerIndex(manifests, "agents");
  const mcpOwners = ownerIndex(manifests, "mcpServers");
  const skillOwners = ownerIndex(manifests, "skills");
  diagnostics.push(
    ...ownerDiagnostics(agentOwners, "Agent"),
    ...ownerDiagnostics(mcpOwners, "MCP server"),
    ...ownerDiagnostics(skillOwners, "Skill"),
  );

  const agentsRoot = join(installerRoot, "config", "agents");
  const packageAgentSources = new Map(
    manifests.flatMap((manifest) =>
      manifest.agents.map((agent) => [agent.id, agent.source]),
    ),
  );
  const agentSources = new Map(packageAgentSources);
  for (const file of (await listFiles(agentsRoot, ".md")).filter(
    (name) => name !== "README.md",
  )) {
    const id = file.slice(0, -3);
    if (!agentSources.has(id)) {
      agentSources.set(id, `config/agents/${file}`);
    }
  }
  const agents = [];
  for (const [id, source] of [...agentSources].sort(([a], [b]) =>
    a.localeCompare(b),
  )) {
    const sourcePath = join(installerRoot, source);
    const markdown = await readFile(sourcePath, "utf8");
    const owners = agentOwners.get(id) ?? [];
    const sidecarPath = join(dirname(sourcePath), `${id}.aionui.json`);
    let sidecar = {};
    try {
      sidecar = await readJson(sidecarPath);
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
    const mcpServers = parseFrontmatterList(markdown, "mcpServers");
    const skills = parseFrontmatterList(markdown, "skills");
    agents.push({
      id,
      packageId: owners[0]?.packageId ?? null,
      source: relative(repoRoot, sourcePath).replaceAll("\\", "/"),
      displayName: sidecar.display_name ?? null,
      mcpServers,
      skills,
      requiredCapabilities:
        owners[0]?.descriptor.requiredCapabilities ?? [],
    });
    if (owners.length === 0) {
      diagnostics.push({
        severity: "warning",
        code: "orphan-agent",
        message: `Agent ${id} is not assigned to a package`,
      });
    }
    const declared = owners[0]?.descriptor;
    if (
      declared &&
      (JSON.stringify(declared.mcpServers ?? []) !== JSON.stringify(mcpServers) ||
        JSON.stringify(declared.skills ?? []) !== JSON.stringify(skills))
    ) {
      diagnostics.push({
        severity: "error",
        code: "agent-manifest-drift",
        message: `Agent ${id} frontmatter does not match its package descriptor`,
      });
    }
  }

  const healthManifest = await readJson(
    join(installerRoot, "config", "mcp-health-manifest.json"),
  );
  const healthIds = new Set(Object.keys(healthManifest.mcp_servers));
  for (const manifest of manifests) {
    for (const descriptor of manifest.mcpServers) {
      healthIds.add(descriptor.id);
    }
  }
  const mcpServers = [...healthIds]
    .sort()
    .map((id) => {
      const owners = mcpOwners.get(id) ?? [];
      if (owners.length === 0) {
        diagnostics.push({
          severity: "warning",
          code: "orphan-mcp-server",
          message: `MCP server ${id} is not assigned to a package`,
        });
      }
      return {
        id,
        packageId: owners[0]?.packageId ?? null,
        source:
          owners[0]?.descriptor.source ??
          "ccb-installer/config/mcp-health-manifest.json",
        providesCapabilities:
          owners[0]?.descriptor.providesCapabilities ?? [],
      };
    });

  const skillsRoot = join(installerRoot, "config", "skills");
  const skillIds = new Set(await listDirectories(skillsRoot));
  for (const manifest of manifests) {
    for (const descriptor of manifest.skills) {
      skillIds.add(descriptor.id);
    }
  }
  const skills = [...skillIds].sort().map((id) => {
    const owners = skillOwners.get(id) ?? [];
    if (owners.length === 0) {
      diagnostics.push({
        severity: "warning",
        code: "orphan-skill",
        message: `Skill ${id} is not assigned to a package`,
      });
    }
    return {
      id,
      packageId: owners[0]?.packageId ?? null,
      source:
        owners[0]?.descriptor.source ??
        `ccb-installer/config/skills/${id}/SKILL.md`,
      providesCapabilities:
        owners[0]?.descriptor.providesCapabilities ?? [],
    };
  });

  const aliases = manifests.flatMap((manifest) =>
    manifest.aliases.map((alias) => ({
      ...alias,
      packageId: manifest.packageId,
    })),
  );

  return {
    schemaVersion: "1.0.0",
    readOnly: true,
    packages: manifests.map((manifest) => ({
      id: manifest.packageId,
      version: manifest.version,
      displayName: manifest.displayName ?? manifest.packageId,
      capabilities: manifest.capabilities,
      contributions: manifest.contributions,
    })),
    agents,
    mcpServers,
    skills,
    aliases,
    diagnostics: diagnostics.sort((a, b) =>
      `${a.severity}:${a.code}:${a.message}`.localeCompare(
        `${b.severity}:${b.code}:${b.message}`,
      ),
    ),
  };
}

async function main() {
  const here = dirname(fileURLToPath(import.meta.url));
  const repoRoot = resolve(here, "..", "..");
  const outputArg = process.argv.indexOf("--output");
  const outputPath =
    outputArg >= 0
      ? resolve(repoRoot, process.argv[outputArg + 1])
      : resolve(
          repoRoot,
          "ccb-installer/config/generated/package-registry.snapshot.json",
        );
  const checkOnly = process.argv.includes("--check");
  const snapshot = await buildRegistry({ repoRoot });
  const errors = snapshot.diagnostics.filter(
    (item) => item.severity === "error",
  );

  if (!checkOnly) {
    await mkdir(dirname(outputPath), { recursive: true });
    await writeFile(outputPath, `${JSON.stringify(snapshot, null, 2)}\n`, "utf8");
    console.log(`Registry snapshot: ${relative(repoRoot, outputPath)}`);
  }
  for (const diagnostic of snapshot.diagnostics) {
    console.log(
      `[${diagnostic.severity.toUpperCase()}] ${diagnostic.code}: ${diagnostic.message}`,
    );
  }
  console.log(
    `Registry: ${snapshot.packages.length} package(s), ${snapshot.agents.length} agent(s), ${snapshot.mcpServers.length} MCP server(s), ${snapshot.skills.length} skill(s), ${errors.length} error(s)`,
  );
  if (errors.length > 0) process.exitCode = 1;
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  await main();
}
