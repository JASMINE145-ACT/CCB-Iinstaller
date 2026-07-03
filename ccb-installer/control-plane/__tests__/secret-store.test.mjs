import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";

import { SecretStore } from "../lib/secret-store.mjs";

const root = await mkdtemp(`${tmpdir()}\\ccb-secret-store-`);
const auditEvents = [];
const store = new SecretStore({
  root,
  masterKey: randomBytes(32).toString("base64"),
  audit: async (event) => auditEvents.push(event),
});
const reference = await store.put({
  tenantId: "tn_alpha",
  environment: "prod",
  name: "erp/access-token",
  value: "super-private-value",
  actor: "admin",
  correlationId: "corr-secret",
});
assert.equal(
  reference,
  "secret://tenant/tn_alpha/prod/erp/access-token",
);
assert.equal(
  await store.resolve(reference, {
    tenantId: "tn_alpha",
    environment: "prod",
  }),
  "super-private-value",
);
await assert.rejects(
  () =>
    store.resolve(reference, {
      tenantId: "tn_beta",
      environment: "prod",
    }),
  /tenant scope/i,
);
const stored = await readFile(`${root}\\tn_alpha\\prod\\erp\\access-token.json`, "utf8");
assert.doesNotMatch(stored, /super-private-value/);
assert.match(stored, /"ciphertext"/);
assert.equal(auditEvents[0].tenantId, "tn_alpha");
assert.equal(auditEvents[0].action, "secret.put");
assert.doesNotMatch(JSON.stringify(auditEvents), /super-private-value/);
console.log("PASS encrypted secret storage and tenant isolation");
console.log("PASS 1/1 secret-store tests");
