import { describe, expect, test } from 'bun:test';
import {
  buildFieldDiff,
  isConfirmedTrue,
  previewOrApplyGate,
  SUPPLIER_COMPARE_FIELDS,
} from './preview.mjs';

describe('CRUD.001 confirmed gate', () => {
  test('confirmed=false never applied', () => {
    const preview = buildFieldDiff(
      { name_zh: '双林', address: 'old' },
      { name_zh: '双林', address: 'new KITIC' },
      SUPPLIER_COMPARE_FIELDS,
    );
    const gated = previewOrApplyGate(false, preview);
    expect(gated.applied).toBe(false);
    expect(gated.requires_confirmation).toBe(true);
    expect(gated.changes.some((c) => c.field === 'address')).toBe(true);
  });

  test('confirmed=true marks apply path', () => {
    const gated = previewOrApplyGate(true, { action: 'update', changes: [] });
    expect(gated.applied).toBe(true);
    expect(gated.requires_confirmation).toBe(false);
  });

  test('isConfirmedTrue only true-ish', () => {
    expect(isConfirmedTrue(true)).toBe(true);
    expect(isConfirmedTrue('true')).toBe(true);
    expect(isConfirmedTrue(false)).toBe(false);
    expect(isConfirmedTrue(undefined)).toBe(false);
    expect(isConfirmedTrue('yes')).toBe(false);
  });

  test('create when no before row', () => {
    const d = buildFieldDiff(null, { name_zh: 'HAKUNA', address: 'PIK' }, ['name_zh', 'address']);
    expect(d.action).toBe('create');
    expect(d.changes).toHaveLength(2);
  });
});
