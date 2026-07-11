/**
 * Parse employee usernames from org-phase0 env.local / env files.
 * Used by acceptance scripts — not injected into Agent runtime.
 *
 * Collects:
 * - EMPLOYEE_USERNAME (default pilot)
 * - EMPLOYEE_<slug>_USERNAME (additional employees)
 */

/**
 * @param {string} envText
 * @returns {{ slug: string, username: string }[]}
 */
export function parseEmployeesFromEnvText(envText) {
  /** @type {Map<string, { slug: string, username: string }>} */
  const byUsername = new Map();

  for (const line of envText.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const defaultMatch = trimmed.match(/^EMPLOYEE_USERNAME\s*=\s*(.+)$/);
    if (defaultMatch) {
      const username = defaultMatch[1].trim();
      if (username) {
        byUsername.set(username.toLowerCase(), { slug: 'default', username });
      }
      continue;
    }

    const extraMatch = trimmed.match(/^EMPLOYEE_([A-Za-z0-9_]+)_USERNAME\s*=\s*(.+)$/);
    if (extraMatch) {
      const slug = extraMatch[1];
      const username = extraMatch[2].trim();
      if (username) {
        byUsername.set(username.toLowerCase(), { slug, username });
      }
    }
  }

  return [...byUsername.values()];
}

/**
 * @param {string} path
 * @param {(path: string) => string} readFile
 */
export function parseEmployeesFromEnvFile(path, readFile) {
  return parseEmployeesFromEnvText(readFile(path));
}
