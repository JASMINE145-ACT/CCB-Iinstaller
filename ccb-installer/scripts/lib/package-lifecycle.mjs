import {
  cp,
  mkdir,
  readFile,
  rename,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import { dirname, join, relative, resolve } from "node:path";

const PACKAGE_ID = /^[a-z0-9]+(?:\.[a-z0-9-]+)+$/;
const SEMVER = /^\d+\.\d+\.\d+$/;

async function pathExists(path) {
  try {
    await stat(path);
    return true;
  } catch (error) {
    if (error.code === "ENOENT") return false;
    throw error;
  }
}

async function readJson(path) {
  return JSON.parse((await readFile(path, "utf8")).replace(/^\uFEFF/, ""));
}

function emptyState() {
  return {
    schemaVersion: "1.0.0",
    revision: 0,
    enabledPackages: [],
    packages: {},
  };
}

function assertWithin(root, candidate, label) {
  const rel = relative(resolve(root), resolve(candidate));
  if (rel.startsWith("..") || rel === ".." || /^[A-Za-z]:/.test(rel)) {
    throw new Error(`${label} escapes its package boundary`);
  }
}

function validateManifest(manifest) {
  if (!PACKAGE_ID.test(manifest?.packageId ?? "")) {
    throw new Error("Invalid packageId");
  }
  if (!SEMVER.test(manifest?.version ?? "")) {
    throw new Error("Invalid package version");
  }
}

export async function readPackageState(stateRoot) {
  try {
    return await readJson(join(resolve(stateRoot), "state.json"));
  } catch (error) {
    if (error.code === "ENOENT") return emptyState();
    throw error;
  }
}

async function atomicWriteJson(path, value) {
  await mkdir(dirname(path), { recursive: true });
  const temporary = `${path}.tmp-${Date.now()}-${Math.random()
    .toString(16)
    .slice(2)}`;
  await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  await rename(temporary, path);
}

export class PackageLifecycle {
  constructor({ stateRoot }) {
    if (!stateRoot) throw new Error("stateRoot is required");
    this.stateRoot = resolve(stateRoot);
    this.installedRoot = join(this.stateRoot, "installed");
    this.projectionsRoot = join(this.stateRoot, "projections");
  }

  async stagePackage(sourceRoot) {
    const source = resolve(sourceRoot);
    const manifest = await readJson(join(source, "package.json"));
    validateManifest(manifest);
    const packageRoot = join(this.installedRoot, manifest.packageId);
    const destination = join(packageRoot, manifest.version);
    if (!(await pathExists(destination))) {
      await mkdir(packageRoot, { recursive: true });
      const temporary = join(
        packageRoot,
        `.tmp-${manifest.version}-${Date.now()}`,
      );
      await cp(source, temporary, { recursive: true, errorOnExist: true });
      await rename(temporary, destination);
    }
    return { manifest, destination };
  }

  async commitState(nextState, previousState) {
    const temporary = join(
      this.stateRoot,
      `.projections-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    );
    await mkdir(temporary, { recursive: true });
    const projectedTargets = new Set();

    try {
      const runtimePackages = [];
      for (const packageId of nextState.enabledPackages) {
        const entry = nextState.packages[packageId];
        const packageRoot = join(
          this.installedRoot,
          packageId,
          entry.activeVersion,
        );
        runtimePackages.push({
          packageId,
          version: entry.activeVersion,
          manifest: join(packageRoot, "package.json"),
          installHealth: join(packageRoot, "health", "install-health.json"),
          mcpHealth: join(packageRoot, "health", "mcp-health-manifest.json"),
        });
        let assets = { legacyProjections: [] };
        try {
          assets = await readJson(join(packageRoot, "assets.json"));
        } catch (error) {
          if (error.code !== "ENOENT") throw error;
        }
        for (const projection of assets.legacyProjections ?? []) {
          const source = resolve(packageRoot, projection.source);
          const target = resolve(temporary, projection.target);
          assertWithin(packageRoot, source, "Projection source");
          assertWithin(temporary, target, "Projection target");
          const targetKey = target.toLowerCase();
          if (projectedTargets.has(targetKey)) {
            throw new Error(`Projection collision at ${projection.target}`);
          }
          projectedTargets.add(targetKey);
          await mkdir(dirname(target), { recursive: true });
          await cp(source, target, { recursive: true, errorOnExist: true });
        }
      }
      await writeFile(
        join(temporary, "package-runtime.json"),
        `${JSON.stringify(
          {
            schemaVersion: "1.0.0",
            enabledPackages: runtimePackages,
          },
          null,
          2,
        )}\n`,
        "utf8",
      );

      const backup = `${this.projectionsRoot}.previous`;
      await rm(backup, { recursive: true, force: true });
      const hadProjection = await pathExists(this.projectionsRoot);
      if (hadProjection) await rename(this.projectionsRoot, backup);
      try {
        await rename(temporary, this.projectionsRoot);
        await atomicWriteJson(join(this.stateRoot, "state.json"), nextState);
        await rm(backup, { recursive: true, force: true });
      } catch (error) {
        await rm(this.projectionsRoot, { recursive: true, force: true });
        if (hadProjection && (await pathExists(backup))) {
          await rename(backup, this.projectionsRoot);
        }
        if (previousState) {
          await atomicWriteJson(
            join(this.stateRoot, "state.json"),
            previousState,
          );
        }
        throw error;
      }
    } finally {
      await rm(temporary, { recursive: true, force: true });
    }
  }

  async transition(mutator) {
    const previous = await readPackageState(this.stateRoot);
    const next = structuredClone(previous);
    await mutator(next);
    next.enabledPackages = Object.entries(next.packages)
      .filter(([, entry]) => entry.enabled)
      .map(([id]) => id)
      .sort();
    next.revision = previous.revision + 1;
    await this.commitState(next, previous);
    return next;
  }

  async install(sourceRoot) {
    const { manifest } = await this.stagePackage(sourceRoot);
    return this.transition((state) => {
      const existing = state.packages[manifest.packageId];
      if (existing) {
        if (!existing.installedVersions.includes(manifest.version)) {
          existing.installedVersions.push(manifest.version);
          existing.installedVersions.sort();
        }
        return;
      }
      state.packages[manifest.packageId] = {
        activeVersion: manifest.version,
        enabled: false,
        installedVersions: [manifest.version],
        previousVersions: [],
      };
    });
  }

  async enable(packageId) {
    return this.transition((state) => {
      const entry = state.packages[packageId];
      if (!entry) throw new Error(`Package ${packageId} is not installed`);
      entry.enabled = true;
    });
  }

  async disable(packageId) {
    return this.transition((state) => {
      const entry = state.packages[packageId];
      if (!entry) throw new Error(`Package ${packageId} is not installed`);
      entry.enabled = false;
    });
  }

  async uninstall(packageId) {
    const next = await this.transition((state) => {
      const entry = state.packages[packageId];
      if (!entry) throw new Error(`Package ${packageId} is not installed`);
      if (entry.enabled) {
        throw new Error(`Package ${packageId} must be disabled before uninstall`);
      }
      delete state.packages[packageId];
    });
    await rm(join(this.installedRoot, packageId), {
      recursive: true,
      force: true,
    });
    return next;
  }

  async upgrade(sourceRoot) {
    const { manifest } = await this.stagePackage(sourceRoot);
    return this.transition((state) => {
      const entry = state.packages[manifest.packageId];
      if (!entry) {
        throw new Error(
          `Package ${manifest.packageId} is not installed; install it first`,
        );
      }
      if (entry.activeVersion === manifest.version) return;
      entry.previousVersions.push(entry.activeVersion);
      entry.previousVersions = [...new Set(entry.previousVersions)];
      entry.activeVersion = manifest.version;
      if (!entry.installedVersions.includes(manifest.version)) {
        entry.installedVersions.push(manifest.version);
        entry.installedVersions.sort();
      }
    });
  }

  async rollback(packageId) {
    return this.transition((state) => {
      const entry = state.packages[packageId];
      if (!entry) throw new Error(`Package ${packageId} is not installed`);
      const previous = entry.previousVersions.pop();
      if (!previous) {
        throw new Error(`Package ${packageId} has no rollback version`);
      }
      const current = entry.activeVersion;
      entry.activeVersion = previous;
      if (current !== previous) entry.previousVersions.unshift(current);
    });
  }
}
