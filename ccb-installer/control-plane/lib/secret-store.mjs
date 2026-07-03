import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
} from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";

const TENANT_ID = /^(?:tn_[a-z0-9][a-z0-9_-]*|[0-9a-f]{8}-[0-9a-f-]{27,})$/;
const ENVIRONMENT = /^[a-z][a-z0-9-]*$/;
const SECRET_NAME = /^[a-z0-9][a-z0-9/_-]*$/;

async function atomicWrite(path, value) {
  await mkdir(dirname(path), { recursive: true });
  const temporary = `${path}.tmp-${Date.now()}`;
  await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  await rename(temporary, path);
}

function parseReference(reference) {
  const match = reference.match(
    /^secret:\/\/tenant\/([^/]+)\/([^/]+)\/(.+)$/,
  );
  if (!match) throw new Error("Invalid tenant secret reference");
  return { tenantId: match[1], environment: match[2], name: match[3] };
}

export class SecretStore {
  constructor({ root, masterKey, audit }) {
    this.root = resolve(root);
    this.key = Buffer.from(masterKey ?? "", "base64");
    if (this.key.length !== 32) {
      throw new Error("Secret store master key must be 32 bytes base64");
    }
    if (typeof audit !== "function") {
      throw new Error("Secret store audit callback is required");
    }
    this.audit = audit;
  }

  validate({ tenantId, environment, name }) {
    if (!TENANT_ID.test(tenantId ?? "")) throw new Error("Invalid tenant_id");
    if (!ENVIRONMENT.test(environment ?? "")) {
      throw new Error("Invalid environment");
    }
    if (
      !SECRET_NAME.test(name ?? "") ||
      name.includes("..") ||
      name.includes("//") ||
      name.startsWith("/")
    ) {
      throw new Error("Invalid secret name");
    }
  }

  path({ tenantId, environment, name }) {
    this.validate({ tenantId, environment, name });
    return join(this.root, tenantId, environment, `${name}.json`);
  }

  async put({
    tenantId,
    environment,
    name,
    value,
    actor,
    correlationId,
  }) {
    this.validate({ tenantId, environment, name });
    if (typeof value !== "string" || !value) {
      throw new Error("Secret value must be a non-empty string");
    }
    if (!actor?.trim() || !correlationId?.trim()) {
      throw new Error("Secret mutation actor and correlationId are required");
    }
    const iv = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", this.key, iv);
    const aad = Buffer.from(`${tenantId}\0${environment}\0${name}`);
    cipher.setAAD(aad);
    const ciphertext = Buffer.concat([
      cipher.update(value, "utf8"),
      cipher.final(),
    ]);
    const record = {
      schemaVersion: "1.0.0",
      algorithm: "A256GCM",
      tenant_id: tenantId,
      environment,
      name,
      iv: iv.toString("base64"),
      authTag: cipher.getAuthTag().toString("base64"),
      ciphertext: ciphertext.toString("base64"),
    };
    await atomicWrite(this.path({ tenantId, environment, name }), record);
    const reference = `secret://tenant/${tenantId}/${environment}/${name}`;
    await this.audit({
      tenantId,
      actor,
      correlationId,
      action: "secret.put",
      details: { environment, name, secretRef: reference },
    });
    return reference;
  }

  async resolve(reference, { tenantId, environment }) {
    const parsed = parseReference(reference);
    if (
      parsed.tenantId !== tenantId ||
      parsed.environment !== environment
    ) {
      throw new Error("Secret reference tenant scope mismatch");
    }
    const record = JSON.parse(
      await readFile(this.path(parsed), "utf8"),
    );
    if (
      record.tenant_id !== tenantId ||
      record.environment !== environment ||
      record.name !== parsed.name
    ) {
      throw new Error("Encrypted secret metadata scope mismatch");
    }
    const decipher = createDecipheriv(
      "aes-256-gcm",
      this.key,
      Buffer.from(record.iv, "base64"),
    );
    decipher.setAAD(Buffer.from(`${tenantId}\0${environment}\0${parsed.name}`));
    decipher.setAuthTag(Buffer.from(record.authTag, "base64"));
    return Buffer.concat([
      decipher.update(Buffer.from(record.ciphertext, "base64")),
      decipher.final(),
    ]).toString("utf8");
  }
}
