# Per-tenant control-plane deployment

P4 uses one control-plane state root per company. Do not share a writable state
directory or secret-store master key across tenants.

## Server inputs

- package catalog deployed read-only;
- tenant-specific state root;
- 32-byte base64 `CONTROL_PLANE_MASTER_KEY` supplied by the server secret
  manager;
- OIDC verifier config and public JWKS endpoint;
- admin access restricted to SSH or a private management network.

The private signing key stays with the OIDC provider. Employee clients receive
only issuer, audience, and JWKS/public-key material.

## Bootstrap

```bash
node control-plane/admin.mjs tenant-create \
  --root /var/lib/ccb-control-plane \
  --tenant tn_example_prod \
  --name "Example Company" \
  --actor bootstrap-admin

node control-plane/admin.mjs packages-set \
  --root /var/lib/ccb-control-plane \
  --tenant tn_example_prod \
  --packages com.wanding.trade \
  --actor release-admin
```

Put secret values in a protected temporary file and call `secret-put` with
`--value-file`; never pass a secret on the command line. Delete the temporary
file after the server-side encrypted record is confirmed.

## Migration gate

1. Register an OIDC client with RS256 signing.
2. Verify issuer, audience, tenant claim, roles and permissions using the
   public JWKS.
3. Confirm the client verifier config contains no `JWT_SECRET`, client secret,
   or private key.
4. Move business credentials into the server secret store and publish only
   `secret://` references.
5. Run canary login/config/MCP checks.
6. Disable legacy `org-idp` HS256 only after all clients pass.

The P4 automated suite does not perform step 6.
