import { resolve } from "node:path";

import {
  PackageLifecycle,
  readPackageState,
} from "./lib/package-lifecycle.mjs";

function value(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : null;
}

const action = process.argv[2];
const stateRoot = value("--state-root");
if (!action || !stateRoot) {
  throw new Error(
    "Usage: package-lifecycle.mjs <install|enable|disable|uninstall|upgrade|rollback|status> --state-root <path> [--source <package-root>] [--package <id>]",
  );
}

if (action === "status") {
  console.log(JSON.stringify(await readPackageState(resolve(stateRoot)), null, 2));
} else {
  const lifecycle = new PackageLifecycle({ stateRoot: resolve(stateRoot) });
  const source = value("--source");
  const packageId = value("--package");
  if (["install", "upgrade"].includes(action) && !source) {
    throw new Error(`--source is required for ${action}`);
  }
  if (
    ["enable", "disable", "uninstall", "rollback"].includes(action) &&
    !packageId
  ) {
    throw new Error(`--package is required for ${action}`);
  }
  const result =
    action === "install"
      ? await lifecycle.install(resolve(source))
      : action === "upgrade"
        ? await lifecycle.upgrade(resolve(source))
        : action === "enable"
          ? await lifecycle.enable(packageId)
          : action === "disable"
            ? await lifecycle.disable(packageId)
            : action === "uninstall"
              ? await lifecycle.uninstall(packageId)
            : action === "rollback"
              ? await lifecycle.rollback(packageId)
              : null;
  if (!result) throw new Error(`Unsupported lifecycle action: ${action}`);
  console.log(
    `Package lifecycle ${action} complete; revision=${result.revision}`,
  );
}
