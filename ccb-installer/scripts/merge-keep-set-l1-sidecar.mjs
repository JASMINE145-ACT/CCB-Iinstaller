/**
 * One-shot: merge sidecar claude_md into L1 .md where body is missing content;
 * strip claude_md from all keep-set sidecars. Writes UTF-8 without BOM.
 */
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const agentsDir = join(__dirname, '..', 'config', 'agents');

const KEEP_SET = new Set([
  'wande-orchestrator',
  'quotation-agent',
  'accurate-agent',
  'cowork',
  'word-creator',
  'word-form-creator',
  'ppt-creator',
  'excel-creator',
]);

function writeUtf8NoBom(path, content) {
  writeFileSync(path, content, { encoding: 'utf8' });
}

function parseMd(raw) {
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!m) return { frontmatter: '', body: raw.trim() };
  return { frontmatter: m[1], body: (m[2] ?? '').trim() };
}

function bodyContainsSidecar(body, sidecarMd) {
  const norm = (s) => s.replace(/\s+/g, ' ').trim().slice(0, 80);
  const key = sidecarMd.split('\n').find((l) => l.startsWith('#'))?.trim();
  if (key && body.includes(key)) return true;
  return norm(body).includes(norm(sidecarMd.slice(0, 120)));
}

function mergeBody(frontmatter, body, sidecarMd) {
  if (!sidecarMd?.trim()) return { frontmatter, body };
  if (bodyContainsSidecar(body, sidecarMd)) return { frontmatter, body };
  const merged = body.trim()
    ? `${body.trim()}\n\n---\n\n${sidecarMd.trim()}`
    : sidecarMd.trim();
  return { frontmatter, body: merged };
}

let merged = 0;
let cleared = 0;

for (const file of readdirSync(agentsDir)) {
  if (!file.endsWith('.aionui.json')) continue;
  const id = file.replace(/\.aionui\.json$/, '');
  if (!KEEP_SET.has(id)) continue;

  const sidecarPath = join(agentsDir, file);
  const mdPath = join(agentsDir, `${id}.md`);
  const sidecar = JSON.parse(readFileSync(sidecarPath, 'utf8').replace(/^\uFEFF/, ''));
  const sidecarMd = typeof sidecar.claude_md === 'string' ? sidecar.claude_md.replace(/\r\n/g, '\n') : '';

  if (sidecarMd && readFileSync(mdPath, 'utf8')) {
    const rawMd = readFileSync(mdPath, 'utf8').replace(/^\uFEFF/, '');
    const { frontmatter, body } = parseMd(rawMd);
    const next = mergeBody(frontmatter, body, sidecarMd);
    if (next.body !== body) {
      writeUtf8NoBom(mdPath, `---\n${frontmatter}\n---\n\n${next.body}\n`);
      merged++;
      console.log(`[merge] ${id}.md body expanded`);
    }
  }

  if ('claude_md' in sidecar) {
    delete sidecar.claude_md;
    writeUtf8NoBom(sidecarPath, `${JSON.stringify(sidecar, null, 2)}\n`);
    cleared++;
    console.log(`[clear] ${file} claude_md removed`);
  }
}

console.log(`Done: merged=${merged} sidecars_cleared=${cleared}`);
