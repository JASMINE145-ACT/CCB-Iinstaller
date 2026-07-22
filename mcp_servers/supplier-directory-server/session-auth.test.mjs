import { describe, expect, test } from 'bun:test';
import {
  ORG_AUTH_FAILED_CODE,
  ORG_SESSION_EXPIRED_CODE,
  ORG_SESSION_MISSING_CODE,
  decodeJwtPayload,
  formatOrgSessionAuthError,
  isInvalidOrExpiredTokenMessage,
  isJwtExpired,
} from './session-auth.mjs';

function makeJwt(payload) {
  const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${header}.${body}.sig`;
}

describe('session-auth JWT UX helpers', () => {
  test('decodeJwtPayload reads exp', () => {
    const token = makeJwt({ exp: 1_700_000_000, sub: 'admin' });
    expect(decodeJwtPayload(token)?.exp).toBe(1_700_000_000);
  });

  test('isJwtExpired true when exp in the past', () => {
    const token = makeJwt({ exp: 1_700_000_000 });
    expect(isJwtExpired(token, 1_700_000_000_000 + 1)).toBe(true);
  });

  test('isJwtExpired false when exp in the future', () => {
    const token = makeJwt({ exp: 2_000_000_000 });
    expect(isJwtExpired(token, 1_700_000_000_000)).toBe(false);
  });

  test('isJwtExpired false when payload has no exp', () => {
    expect(isJwtExpired(makeJwt({ sub: 'x' }))).toBe(false);
  });

  test('formatOrgSessionAuthError missing', () => {
    const msg = formatOrgSessionAuthError({ missing: true });
    expect(msg).toContain(ORG_SESSION_MISSING_CODE);
    expect(msg).toContain('org-session.token');
    expect(msg).toContain('Re-login');
  });

  test('formatOrgSessionAuthError expired', () => {
    const msg = formatOrgSessionAuthError({ expired: true });
    expect(msg).toContain(ORG_SESSION_EXPIRED_CODE);
    expect(msg).toContain('Re-login');
  });

  test('formatOrgSessionAuthError maps 401 invalid/expired', () => {
    const msg = formatOrgSessionAuthError({
      httpStatus: 401,
      upstreamMessage: 'Invalid or expired token',
    });
    expect(msg).toContain(ORG_AUTH_FAILED_CODE);
    expect(msg).toContain('Re-login');
    expect(isInvalidOrExpiredTokenMessage('Invalid or expired token')).toBe(true);
  });

  test('formatOrgSessionAuthError returns null for unrelated errors', () => {
    expect(formatOrgSessionAuthError({ httpStatus: 500, upstreamMessage: 'boom' })).toBe(null);
  });
});
