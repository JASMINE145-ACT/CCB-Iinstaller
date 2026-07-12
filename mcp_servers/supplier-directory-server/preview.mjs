/**
 * Pure preview helpers for confirmed=false supplier-directory writes.
 * No network — used by MCP and unit tests.
 */

export const SUPPLIER_COMPARE_FIELDS = [
  'name_zh',
  'code',
  'category',
  'products_text',
  'address',
  'contact',
  'phone',
  'whatsapp',
  'email',
  'notes',
  'grade',
];

export const VEHICLE_COMPARE_FIELDS = [
  'seed_key',
  'sort_no',
  'name_zh',
  'name_id',
  'load_zh',
  'load_id',
  'size_zh',
  'size_id',
  'use_zh',
  'use_id',
];

export function isConfirmedTrue(value) {
  return value === true || value === 'true' || value === 1 || value === '1';
}

/**
 * Build a field-level diff. Does not mutate.
 * @returns {{ action: 'create'|'update'|'noop', changes: Array<{field, before, after}>, before, after }}
 */
export function buildFieldDiff(before, after, fields) {
  const beforeObj = before && typeof before === 'object' ? before : null;
  const changes = [];
  const afterNorm = {};
  for (const field of fields) {
    const next = after[field] === undefined || after[field] === null ? '' : after[field];
    afterNorm[field] = next;
    const prev = beforeObj ? (beforeObj[field] ?? '') : undefined;
    if (!beforeObj) {
      changes.push({ field, before: null, after: next });
    } else if (String(prev) !== String(next)) {
      changes.push({ field, before: prev, after: next });
    }
  }
  if (!beforeObj) {
    return { action: 'create', changes, before: null, after: afterNorm };
  }
  if (changes.length === 0) {
    return { action: 'noop', changes, before: beforeObj, after: afterNorm };
  }
  return { action: 'update', changes, before: beforeObj, after: afterNorm };
}

/**
 * Gate: confirmed=false never applies. Returns preview payload.
 */
export function previewOrApplyGate(confirmed, previewPayload) {
  if (!isConfirmedTrue(confirmed)) {
    return {
      requires_confirmation: true,
      applied: false,
      ...previewPayload,
      hint: 'Show diff to user; re-call with confirmed=true only after explicit OK.',
    };
  }
  return { requires_confirmation: false, applied: true, preview: previewPayload };
}
