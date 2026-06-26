#!/usr/bin/env bun
/**
 * Rebuild dist/chunks/ccb-api-server.js from src (run after ccb-api-server or ccb-runtime changes).
 */
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const entry = join(ROOT, 'src/ccb-api-server/index.js')
const out = join(ROOT, 'dist/chunks/ccb-api-server.js')

const result = await Bun.build({
  entrypoints: [entry],
  outdir: join(ROOT, 'dist/chunks'),
  naming: 'ccb-api-server.js',
  target: 'bun',
  format: 'esm',
})

if (!result.success) {
  console.error('[build] FAIL', result.logs)
  process.exit(1)
}

console.log(`[build] OK ${out}`)
