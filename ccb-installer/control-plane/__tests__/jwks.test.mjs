import assert from "node:assert/strict";
import {
  generateKeyPairSync,
  sign,
} from "node:crypto";
import { readFile } from "node:fs/promises";

import {
  validateOidcVerifierConfig,
  verifyJwt,
} from "../lib/jwks-verifier.mjs";

function b64(value) {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

function token(privateKey, claims, header = { alg: "RS256", kid: "key-1" }) {
  const input = `${b64(header)}.${b64(claims)}`;
  return `${input}.${sign("RSA-SHA256", Buffer.from(input), privateKey).toString("base64url")}`;
}

async function testValidAndNegativeClaims() {
  const { privateKey, publicKey } = generateKeyPairSync("rsa", {
    modulusLength: 2048,
  });
  const jwk = publicKey.export({ format: "jwk" });
  const jwks = { keys: [{ ...jwk, kid: "key-1", alg: "RS256", use: "sig" }] };
  const now = 2_000_000_000;
  const claims = {
    sub: "user-1",
    tenant_id: "tn_alpha",
    iss: "https://id.example",
    aud: "ccb-platform",
    iat: now - 10,
    exp: now + 300,
    roles: ["admin"],
    permissions: ["platform.config.publish"],
  };
  const valid = token(privateKey, claims);
  const [encodedHeader, encodedClaims, encodedSignature] = valid.split(".");
  const tamperIndex = Math.floor(encodedSignature.length / 2);
  const tamperedSignature =
    encodedSignature.slice(0, tamperIndex) +
    (encodedSignature[tamperIndex] === "A" ? "B" : "A") +
    encodedSignature.slice(tamperIndex + 1);
  const tampered = `${encodedHeader}.${encodedClaims}.${tamperedSignature}`;
  const verified = verifyJwt(valid, {
    jwks,
    issuer: claims.iss,
    audience: claims.aud,
    tenantId: "tn_alpha",
    requiredPermissions: ["platform.config.publish"],
    now,
  });
  assert.equal(verified.sub, "user-1");

  for (const [name, candidate, options, pattern] of [
    ["tenant", token(privateKey, { ...claims, tenant_id: "tn_beta" }), {}, /tenant/i],
    ["issuer", token(privateKey, { ...claims, iss: "https://evil" }), {}, /issuer/i],
    ["audience", token(privateKey, { ...claims, aud: "other" }), {}, /audience/i],
    ["expiry", token(privateKey, { ...claims, exp: now - 1 }), {}, /expired/i],
    ["missing tenant", token(privateKey, { ...claims, tenant_id: undefined }), {}, /tenant_id/i],
    ["permission", valid, { requiredPermissions: ["platform.secret.read"] }, /permission/i],
    ["kid", token(privateKey, claims, { alg: "RS256", kid: "missing" }), {}, /kid/i],
    ["alg", token(privateKey, claims, { alg: "HS256", kid: "key-1" }), {}, /algorithm/i],
    ["signature", tampered, {}, /signature/i],
  ]) {
    assert.throws(
      () =>
        verifyJwt(candidate, {
          jwks,
          issuer: claims.iss,
          audience: claims.aud,
          tenantId: "tn_alpha",
          requiredPermissions: ["platform.config.publish"],
          now,
          ...options,
        }),
      pattern,
      name,
    );
  }
}

await testValidAndNegativeClaims();
const verifierConfig = JSON.parse(
  await readFile(
    new URL("../config/oidc-verifier.example.json", import.meta.url),
    "utf8",
  ),
);
assert.equal(
  validateOidcVerifierConfig(verifierConfig).algorithms[0],
  "RS256",
);
assert.equal(
  ["clientSecret", "privateKey", "jwtSecret"].some(
    (key) => verifierConfig[key],
  ),
  false,
);
assert.throws(
  () =>
    validateOidcVerifierConfig({
      ...verifierConfig,
      privateKey: "forbidden",
    }),
  /privateKey/,
);
console.log("PASS JWKS valid token and negative claim matrix");
console.log("PASS public-only OIDC verifier configuration");
console.log("PASS 2/2 JWKS verifier tests");
