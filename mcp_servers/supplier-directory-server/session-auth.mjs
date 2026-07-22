/**
 * Org session JWT helpers for MCP UX (local decode only — Org still verifies).
 */

export const ORG_SESSION_EXPIRED_CODE = 'ORG_SESSION_EXPIRED';
export const ORG_SESSION_MISSING_CODE = 'ORG_SESSION_MISSING';
export const ORG_AUTH_FAILED_CODE = 'ORG_AUTH_FAILED';

const RELLOGIN_HINT =
  'Re-login to AionUI Org SSO to refresh org-session.token, then retry.';

/**
 * @param {string} token
 * @returns {{ exp?: number } | null}
 */
export function decodeJwtPayload(token) {
  const parts = String(token ?? '').trim().split('.');
  if (parts.length !== 3) return null;
  try {
    const b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4);
    const json = Buffer.from(padded, 'base64').toString('utf8');
    const payload = JSON.parse(json);
    return payload && typeof payload === 'object' ? payload : null;
  } catch {
    return null;
  }
}

/**
 * @param {string} token
 * @param {number} [nowMs]
 * @returns {boolean}
 */
export function isJwtExpired(token, nowMs = Date.now()) {
  const payload = decodeJwtPayload(token);
  if (!payload || typeof payload.exp !== 'number') return false;
  return payload.exp * 1000 <= nowMs;
}

/**
 * @param {string} message
 * @returns {boolean}
 */
export function isInvalidOrExpiredTokenMessage(message) {
  const m = String(message ?? '').toLowerCase();
  return (
    m.includes('invalid or expired token') ||
    m.includes('expired token') ||
    m.includes('token expired') ||
    m.includes('jwt expired')
  );
}

/**
 * @param {{ missing?: boolean, expired?: boolean, httpStatus?: number, upstreamMessage?: string }} input
 * @returns {string | null} actionable error message, or null if not an auth UX case
 */
export function formatOrgSessionAuthError(input) {
  if (input.missing) {
    return `${ORG_SESSION_MISSING_CODE}: Org session JWT missing — ${RELLOGIN_HINT}`;
  }
  if (input.expired) {
    return `${ORG_SESSION_EXPIRED_CODE}: Org session JWT expired — ${RELLOGIN_HINT}`;
  }
  if (input.httpStatus === 401 || isInvalidOrExpiredTokenMessage(input.upstreamMessage)) {
    const detail = input.upstreamMessage ? ` (${input.upstreamMessage})` : '';
    return `${ORG_AUTH_FAILED_CODE}: Org authentication failed${detail} — ${RELLOGIN_HINT}`;
  }
  return null;
}
