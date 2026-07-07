import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "..", "..", "..");
const lintScript = join(
  repoRoot,
  "ccb-installer",
  "scripts",
  "lint-platform-forbidden-coupling.mjs",
);

test("lint passes on current baseline tree", () => {
  execFileSync(process.execPath, [lintScript], {
    cwd: repoRoot,
    stdio: "pipe",
    encoding: "utf8",
  });
});

test("lint fails on novel forbidden coupling outside baseline", async () => {
  const tempRoot = await mkdtemp(join(tmpdir(), "ccb-forbidden-lint-"));
  const platformSrc = join(tempRoot, "ccb-installer", "src", "services", "acp");
  await mkdir(platformSrc, { recursive: true });
  await writeFile(
    join(platformSrc, "novel-coupling.ts"),
    `export const BAD = 'wande-orchestrator'\n`,
    "utf8",
  );
  const baseline = join(
    tempRoot,
    "ccb-installer",
    "config",
    "lint",
    "platform-forbidden-coupling.baseline.json",
  );
  await mkdir(dirname(baseline), { recursive: true });
  await writeFile(
    baseline,
    JSON.stringify({ schemaVersion: "1.0.0", entries: [] }, null, 2),
    "utf8",
  );

  assert.throws(
    () =>
      execFileSync(process.execPath, [lintScript], {
        cwd: repoRoot,
        env: { ...process.env, CCB_LINT_REPO_ROOT: tempRoot },
        stdio: "pipe",
        encoding: "utf8",
      }),
    (error) => error.status === 1,
  );
});
