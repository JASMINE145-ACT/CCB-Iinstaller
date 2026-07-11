import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseEmployeesFromEnvText } from './parse-env-employees.mjs';

test('parseEmployeesFromEnvText collects default and slugged employees', () => {
  const text = `
# comment
EMPLOYEE_USERNAME=yjc
EMPLOYEE_liankexin_USERNAME=liankexin
EMPLOYEE_zjz_USERNAME=zjz
EMPLOYEE_qps_USERNAME=qps
`;
  const rows = parseEmployeesFromEnvText(text);
  assert.equal(rows.length, 4);
  assert.deepEqual(
    rows.map((r) => r.username).sort(),
    ['liankexin', 'qps', 'yjc', 'zjz']
  );
});

test('parseEmployeesFromEnvText dedupes same username', () => {
  const text = `
EMPLOYEE_USERNAME=yjc
EMPLOYEE_pilot_USERNAME=yjc
`;
  const rows = parseEmployeesFromEnvText(text);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].username, 'yjc');
});
