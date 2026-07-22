import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..')
const prompt = readFileSync(
  join(
    repoRoot,
    'ccb-installer',
    'packages',
    'vertical',
    'com.wanding.trade',
    'agents',
    'quotation-agent.md',
  ),
  'utf8',
)
const sidecar = JSON.parse(
  readFileSync(
    join(
      repoRoot,
      'ccb-installer',
      'packages',
      'vertical',
      'com.wanding.trade',
      'agents',
      'quotation-agent.aionui.json',
    ),
    'utf8',
  ),
)

function frontmatter() {
  const match = prompt.match(/^---\r?\n([\s\S]*?)\r?\n---/u)
  assert.ok(match, 'quotation-agent prompt must have YAML frontmatter')
  return match[1]
}

function section(title) {
  const start = prompt.indexOf(`### ${title}`)
  assert.notEqual(start, -1, `missing section: ${title}`)
  const end = prompt.indexOf('\n### ', start + 4)
  return prompt.slice(start, end === -1 ? undefined : end)
}

test('learn-by-data is available on demand without preloading its full prompt', () => {
  assert.doesNotMatch(
    frontmatter(),
    /^skills\s*:/mu,
    'agent frontmatter skills preloads the entire SKILL.md into every delegated lookup',
  )
  assert.deepEqual(sidecar.skills.enabled, ['quotation-learn-by-data'])
  assert.match(prompt, /`\/learn-by-data` \/ 按数据学习 \/ 复盘报价/u)
  assert.match(prompt, /`Skill\(quotation-learn-by-data\)`/u)
})

test('selection API is primary with knowledge Read as fallback only', () => {
  const contract = section('选型 — API 主流 + 知识库 Read fallback（WANd.QUOTE.SELECT_API.001）')
  assert.match(contract, /select_quotation_candidates/u)
  assert.match(contract, /status: ok/u)
  assert.match(contract, /unable_to_select/u)
  assert.match(contract, /锁码/u)
  assert.match(contract, /不得探查后丢弃/u)
})

test('single-item price and inventory prompt has a fixed evidence-bearing table contract', () => {
  const contract = section('单品价 + 库存 — 固定执行与输出契约')

  assert.match(contract, /select_quotation_candidates/u)
  assert.match(contract, /match_quotation.*suppliers_hybrid_match/u)
  assert.match(contract, /get_inventory_by_code/u)
  assert.match(contract, /禁止.*get_product_price_tiers/u)
  assert.match(contract, /结果表必须且仅使用/u)
  assert.match(contract, /表外.*双调用合成.*货源说明/u)
  assert.match(
    contract,
    /编码 \| 中文名称 \| 英文\/印尼名 \| 规格 \| 单价\(B级\) \| 在仓库存 \| 可用库存 \| 单位 \| 备注/u,
  )
  assert.match(contract, /在仓库存.*qty_warehouse.*业务判断依据/u)
  assert.match(contract, /可用库存.*qty_available.*附加运营字段/u)
  assert.match(contract, /禁止互换、合并或只展示其中一种/u)
  assert.match(contract, /备注.*reason|选型理由/u)
})

test('multi-item price and inventory prompt requires batch tools for two or more products', () => {
  const contract = section('多品价 + 库存 — 强制批量契约')

  assert.match(contract, /1 个产品.*match_quotation.*select_quotation_candidates.*get_inventory_by_code/su)
  assert.match(contract, /2 个及以上产品.*不得拆成多个单品调用/su)
  assert.match(contract, /只调用一次 `match_quotation_batch`/u)
  assert.match(contract, /keywords_list.*用户原始产品顺序.*全部产品/u)
  assert.match(contract, /select_quotation_candidates/u)
  assert.match(contract, /禁止用多个 `match_quotation` 代替首轮 batch/u)
  assert.match(contract, /只调用一次 `get_inventory_by_code_batch`/u)
  assert.match(contract, /batch 成功时禁止逐行 `get_inventory_by_code`/u)
  assert.match(contract, /batch 明确超时、报错或返回 `success:false`.*允许.*各单查一次/su)
  assert.match(contract, /每个输入产品输出且只输出一行/u)
  assert.match(contract, /B 级场景.*固定九列完全一致/u)
  assert.match(contract, /非 B 档.*仅将 `单价\(B级\)` 改为.*`单价\(X级\)`/u)
})

test('inventory-only multi-code requires get_inventory_by_code_batch', () => {
  assert.match(prompt, /WANd\.INV\.BATCH\.MULTI_CODE\.001/u)
  const tableRow = prompt.match(/仅查库存（有编码）[^\n]+/u)
  assert.ok(tableRow, 'decision table must have 仅查库存（有编码） row')
  assert.match(tableRow[0], /get_inventory_by_code_batch/u)
  assert.match(tableRow[0], /≥2/u)
  const section = prompt.match(
    /### 仅查库存 · 多编码 batch[\s\S]*?(?=\n### |\n## |$)/u,
  )
  assert.ok(section, 'must have 仅查库存 · 多编码 batch section')
  assert.match(section[0], /只调用一次.*get_inventory_by_code_batch/su)
  assert.match(section[0], /batch 成功时\*\*禁止\*\*.*get_inventory_by_code/su)
})

const learnSkill = readFileSync(
  join(
    repoRoot,
    'ccb-installer',
    'packages',
    'vertical',
    'com.wanding.trade',
    'skills',
    'quotation-learn-by-data',
    'SKILL.md',
  ),
  'utf8',
)

test('learn-by-data skill is select-first API-first (WANd.LEARN.SELECT_FIRST.001)', () => {
  assert.match(learnSkill, /WANd\.LEARN\.SELECT_FIRST\.001/u)
  assert.match(learnSkill, /select_quotation_candidates/u)
  assert.match(
    learnSkill,
    /match_quotation_batch[\s\S]*select_quotation_candidates[\s\S]*results/su,
  )
  assert.match(learnSkill, /一次.*select_quotation_candidates|select_quotation_candidates.*一次/su)
  assert.doesNotMatch(
    learnSkill,
    /第一次 batch 前 Read/u,
    'must not require Read before first batch (dual doctrine)',
  )
  assert.doesNotMatch(
    learnSkill,
    /在 \*\*已 Read 知识库\*\* 前提下/u,
    'per-row algorithm must not mandate pre-Read self-select',
  )
  assert.match(learnSkill, /unable_to_select/u)
  const learnRow = prompt.match(/`\/learn-by-data` \/ 按数据学习 \/ 复盘报价[^\n]+/u)
  assert.ok(learnRow, 'decision table must have learn-by-data row')
  assert.match(learnRow[0], /select_quotation_candidates/u)
  assert.match(learnRow[0], /完整 `results`|完整 \*\*`results`\*\*/u)
  assert.match(learnRow[0], /batch 前 Read/u)
})

test('learn-by-data skill pins KB path and forbids Bash DIY (WANd.LEARN.KB_PATH.001)', () => {
  assert.match(learnSkill, /WANd\.LEARN\.KB_PATH\.001/u)
  assert.match(
    learnSkill,
    /D:\\CCB-Wanding\\vendor\\wanding\\data\\wanding_business_knowledge\.md/u,
  )
  assert.match(learnSkill, /selection_context\.knowledge_source/u)
  assert.match(learnSkill, /\.claude\\vendor|禁止.*\.claude/u)
  assert.match(learnSkill, /No Bash|禁止.*Bash/u)
  assert.match(learnSkill, /禁止.*find|禁止 Bash/u)
})
