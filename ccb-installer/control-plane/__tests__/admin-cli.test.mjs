import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

const exec = promisify(execFile);
const root = await mkdtemp(`${tmpdir()}\\ccb-admin-cli-`);
const cli = fileURLToPath(new URL("../admin.mjs", import.meta.url));
await exec(process.execPath, [
  cli,
  "tenant-create",
  "--root",
  root,
  "--tenant",
  "tn_cli",
  "--name",
  "CLI Tenant",
  "--actor",
  "admin",
]);
const { stdout } = await exec(process.execPath, [
  cli,
  "dashboard",
  "--root",
  root,
  "--tenant",
  "tn_cli",
]);
const dashboard = JSON.parse(stdout);
assert.equal(dashboard.tenant_id, "tn_cli");
assert.equal(dashboard.drift, false);
console.log("PASS admin CLI tenant-create and dashboard");
console.log("PASS 1/1 admin CLI tests");
