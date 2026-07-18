# Smoke — 验收

## Step 1 — DUAL.001（你已过）

- `土工布什么价，谁有货？` → 同轮 match + hybrid；SKU + 货源  
- `双林仓库地址是什么？` → 名录地址  

另验：**Guid 列表无「供应商名录」卡**；名录读写均在 **万鼎报价专家**。

## Step 2 — PRECIPITATE.001（learn-by-data）

### 准备

```powershell
cd D:\Projects\claude-code-best
python python\scripts\generate_learn_by_data_smoke_fixture.py
```

记下生成的 xlsx 路径（通常在 `data/smoke/`）。

### 操作

1. **新开** 万鼎报价专家 Guid（旧会话可能仍缓存旧 skill）。  
2. 输入 `/learn-by-data`（或「按数据学习」），附上 smoke xlsx。  
3. 让它跑完各批次对比表。

### 通过标准

| 检查点 | 期望 |
|--------|------|
| **Section A** | 仅「in-candidates 不一致」可沉淀；预览必须含 **规则 + 原因 + 来源**；确认后才 `append_business_rule` |
| **Section B** | 严重标记表 + 固定句：**请祐嘉诚核查下列料号异常。**；**不写库** |
| **Section C** | 缺码行：有 `price_admin` → 确认后写 **价库 draft**；无权限 → **只出表不写** |
| **Section D** | **全程不出现**映射库写入 / `append_quotation_mapping_pending` |

### 可选小测（名录写，仍在报价卡）

在报价专家会话：`把双林联系人改成测试张三`（或改备注）→ 应走 `suppliers_upsert` 预览 → 你确认 → 再写。非白名单应 403。

## Step 3 — 知识库整理（slug1 only；**CONF 前禁止 Save**）

前置与放行条件：`research/phase3-kb-review-gates.md`。

### Pre-Save（必须）

1. CONF-001 / CONF-002 书面确认并写入 `smoke-evidence.md`。  
2. Python 同义扩展（标题须含 `【字段匹配`）：

```powershell
cd D:\Projects\claude-code-best
python -c "from pathlib import Path; c=Path('data/wanding_business_knowledge.restructured.md').read_text(encoding='utf-8'); r=[]; s=False
for line in c.splitlines():
  line=line.strip()
  if '【字段匹配' in line: s=True; continue
  if s and line.startswith('【'): break
  if not s: continue
  if line.startswith('-'): line=line.lstrip('- ').strip()
  if '→' in line: L,_,R=line.partition('→')
  elif '->' in line: L,_,R=line.partition('->')
  else: continue
  src=[t for t in L.split() if t]; tgt=[t for t in R.split() if t]
  if src and tgt: r.append((src,tgt))
print('rules', len(r)); assert len(r)>=10"
```

### Save（仅门禁过）

1. `#/org-knowledge` → `wanding_business_knowledge` → 粘贴 `restructured.md` → Save。  
2. 填 `smoke-evidence.md`：center version、shadow `.org-meta.json` version、新 Guid §8 引用。

### 通过标准

| 检查点 | 期望 |
|--------|------|
| 完成口径 | **slug1 only**；7 slug deferred |
| CONF | 已确认，⚠️ 已撤或改写为正式边界 |
| Python | `rules ≥ 10` |
| 同步 | center version == shadow meta |
| Agent | 新 Guid 多候选含 § 原文引用 |
