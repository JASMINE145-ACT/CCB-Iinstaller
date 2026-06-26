#!/usr/bin/env bun
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const entry = join(ROOT, 'src/ccb-acp-agent/index.js')

const result = await Bun.build({
  entrypoints: [entry],
  outdir: join(ROOT, 'dist/chunks'),
  naming: 'ccb-acp-agent.js',
  target: 'bun',
  format: 'esm',
})

if (!result.success) {
  console.error('[build] FAIL', result.logs)
  process.exit(1)
}

console.log(`[build] OK ${join(ROOT, 'dist/chunks/ccb-acp-agent.js')}`)
