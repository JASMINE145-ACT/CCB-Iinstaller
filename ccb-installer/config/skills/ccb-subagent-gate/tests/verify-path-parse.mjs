import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const fixture = path.join(
  __dirname,
  'fixtures/transcripts/word-creator-good-docx.jsonl',
)
const raw = fs.readFileSync(fixture, 'utf8')
const normalized = raw.replace(/\\\\/g, '\\')
const re = /[A-Za-z]:\\[^"\s]+\.(docx|pptx|xlsx)/gi
const matches = normalized.match(re)
if (!matches?.some(m => m.includes('gate-test-good.docx'))) {
  console.error('FAIL path parse', matches)
  process.exit(1)
}
console.log('PASS path parse', matches)
