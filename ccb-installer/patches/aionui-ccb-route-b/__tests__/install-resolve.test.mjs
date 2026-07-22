/**
 * Unit checks for route-b install resolution helpers
 * (logic mirrored from patches/aionui-ccb-route-b/index.js).
 */
import assert from 'node:assert/strict'
import test from 'node:test'

function isDevTreeInstall(dir) {
  const normalized = String(dir || '')
    .replace(/[\\/]+$/, '')
    .replace(/\\/g, '/')
  return /\/ccb-installer$/i.test(normalized)
}

test('isDevTreeInstall rejects monorepo package tree', () => {
  assert.equal(isDevTreeInstall('d:\\Projects\\claude-code-best\\ccb-installer'), true)
  assert.equal(isDevTreeInstall('D:/Projects/claude-code-best/ccb-installer/'), true)
  assert.equal(isDevTreeInstall('D:\\CCB-Wanding'), false)
  assert.equal(isDevTreeInstall('C:\\Users\\x\\AppData\\Local\\Programs\\CCB-Wanding'), false)
})
