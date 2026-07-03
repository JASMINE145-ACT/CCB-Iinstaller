import { createPublicKey, verify } from "node:crypto";

function decodeJson(value, label) {
  try {
    return JSON.parse(Buffer.from(value, "base64url").toString("utf8"));
  } catch {
    throw new Error(`Invalid JWT ${label}`);
  }
}

function audienceMatches(actual, expected) {
  return Array.isArray(actual)
    ? actual.includes(expected)
    : actual === expected;
}

export function verifyJwt(
  token,
  {
    jwks,
    issuer,
    audience,
    tenantId,
    requiredPermissions = [],
    now = Math.floor(Date.now() / 1000),
  },
) {
  const parts = token.split(".");
  if (parts.length !== 3) throw new Error("Invalid JWT format");
  const [encodedHeader, encodedPayload, encodedSignature] = parts;
  const header = decodeJson(encodedHeader, "header");
  const claims = decodeJson(encodedPayload, "payload");
  if (header.alg !== "RS256") {
    throw new Error("Unsupported JWT algorithm; RS256 required");
  }
  const jwk = jwks?.keys?.find((item) => item.kid === header.kid);
  if (!jwk) throw new Error(`Unknown JWKS kid: ${header.kid}`);
  if (jwk.kty !== "RSA" || (jwk.use && jwk.use !== "sig")) {
    throw new Error("JWKS key is not an RSA signing key");
  }
  const input = Buffer.from(`${encodedHeader}.${encodedPayload}`);
  const signature = Buffer.from(encodedSignature, "base64url");
  const publicKey = createPublicKey({ key: jwk, format: "jwk" });
  if (!verify("RSA-SHA256", input, publicKey, signature)) {
    throw new Error("JWT signature verification failed");
  }
  if (claims.iss !== issuer) throw new Error("JWT issuer mismatch");
  if (!audienceMatches(claims.aud, audience)) {
    throw new Error("JWT audience mismatch");
  }
  if (!claims.sub) throw new Error("JWT subject is required");
  if (!claims.exp || claims.exp <= now) throw new Error("JWT expired");
  if (claims.nbf && claims.nbf > now) throw new Error("JWT not active");
  if (!claims.tenant_id) throw new Error("JWT tenant_id is required");
  if (claims.tenant_id !== tenantId) throw new Error("JWT tenant scope mismatch");
  const permissions = new Set(claims.permissions ?? []);
  for (const permission of requiredPermissions) {
    if (!permissions.has(permission)) {
      throw new Error(`JWT permission missing: ${permission}`);
    }
  }
  return {
    ...claims,
    roles: Array.isArray(claims.roles) ? claims.roles : [],
    permissions: [...permissions],
  };
}

export function validateOidcVerifierConfig(config) {
  for (const key of ["issuer", "jwksUri", "audience"]) {
    if (!config?.[key]) throw new Error(`OIDC verifier ${key} is required`);
  }
  for (const forbidden of ["clientSecret", "privateKey", "jwtSecret"]) {
    if (config[forbidden]) {
      throw new Error(`Client verifier must not contain ${forbidden}`);
    }
  }
  return {
    schemaVersion: "1.0.0",
    issuer: config.issuer,
    jwksUri: config.jwksUri,
    audience: config.audience,
    algorithms: ["RS256"],
  };
}
