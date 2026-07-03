# 万鼎管件 DN 规格匹配修复（异径套 + 裸 DN 40→50）

> Task: `07-01-ppr-reducer-compound-spec-fix` | Priority: **P1** | Package: `python` | Status: **completed (2026-07-02)**

learn-by-data 复盘暴露 **两类独立 bug**，同属 `wanding_fuzzy_matcher.py` 规格解析，可同任务分两 workstream 交付。

---

## 复盘样本

| 行 | 关键词 | 实际料号 | Agent top | 分类 | 用户观感 |
|----|--------|----------|-----------|------|----------|
| 9 | LPPR Coupling 40 直接 | 8010071380 (dn40) | 8010071381 (dn50) | in-candidates | 「40 变 50」 |
| 10 | PPR Reducing 40x32 大小头 | 8010071450 (dn40x32) | 8010071449 (dn40x25) | **not-in-candidates** | 正确料号不在池 |
| 11 | PPR 90°Elbow 40 弯头 | 8010071404 (dn40) | 8010071405 (dn50) | in-candidates (#5) | 「40 变 50」 |

---

## Workstream A — 异径套 compound 误解析（行 10/13）

### 现象

`8010071450` / 正确 LESSO 异径套 **不在候选**；top 为相邻规格（小一档）。

### 根因（已复现）

```
"PPR Reducing 40x32 大小头"
  → _compound_specs 无 dn 前缀 → thread_side=True
  → 副径 32 → THREAD_SIDE_TO_INCH → {1"}
  → 查询 compound = (40, {1})   应为 (40, {32})

8010071450 dn40x32 → subs {32,1-1/4} → 与 {1} 无交 → hard_filter REJECT
8010071449 dn40x25 → subs {1,25}     → 与 {1} 有交 → 错误 PASS + top
```

### 修复 A

`_compound_specs`：reducer + 双 DN 数字 + 无螺纹语义 → `thread_side=False`。

---

## Workstream B — 裸 DN「40」被当成 dn50（行 9/11）

### 现象

关键词里**明确有 40**，top 却是 dn50；实际料号仍在候选（#2 / #5）→ **排序/硬过滤失效**，不是 not-in-candidates。

### 根因（已复现）

```
"LPPR Coupling 40 直接" / "PPR 90°Elbow 40 弯头"
        │
        ├─ _diameter_values(query) → ∅     ← 裸 "40" 未被提取
        │     （仅匹配 dn40 / Nmm / N" 等，不匹配「Coupling 40」）
        │
        └─ hard_filter 的 DN 交集检查未触发 → dn50 不被剔除
                    │
                    ▼
        search_fuzzy 打分：token "40" 经 MM_TO_INCH 扩展
                    │
                    ▼
        MM_TO_INCH["40"] = '1-1/2"'   ← 与 LESSO 标价不一致
        LESSO 产品:  dn40=(1-1/4"),  dn50=(1-1/2")
                    │
                    ▼
        查询 40 的 inch 等价命中 dn50 描述里的 1-1/2"
        dn40 / dn50 fuzzy 同分 → 稳定排序后 dn50 排前
```

本地 `match_quotation_union`：

| 关键词 | 8010071380 (dn40) | 8010071381 (dn50) |
|--------|-------------------|-------------------|
| LPPR Coupling 40 直接 | rank **2** | rank **1** |
| PPR 90 elbow 40 弯头 | rank **5** | rank **1** |

`search_fuzzy` 内 dn40/dn50 直通/弯头 **同分**（1.18 / 1.34）；问题在 **裸 DN 未进 `_diameter_values`** + **MM_TO_INCH 扩展偏向 dn50**。

对照：`THREAD_SIDE_TO_INCH` 中 `"40"→1-1/4"` 与 LESSO 标价一致；`MM_TO_INCH` 中 `"40"→1-1/2"` 与价格库文案不一致。

### 修复 B（增量，与 A 同文件）

**B1 — `_diameter_values` 提取裸 DN（主修复）**

在单径管件查询（`coupling` / `elbow` / `cap` / `tee` 等非 compound reducer）中，从 token 提取裸数字 DN：

- 匹配 `\b([0-9]+)\b`，排除 `_angle_values` 中的角度（如 90° 弯头的 `90`）
- 排除 compound `NxM` 已由 A 处理
- 提取后 `q_diameters={40}` → 现有 hard_filter `q_diameters ∩ p_diameters` 剔除 dn50

**B2 — 同分 tie-break（建议同 PR）**

当查询含裸 DN `N` 且候选描述含 `dn{N}` 字面量时，`_compat_sort_key` 或 fuzzy bonus **优先 exact dn 匹配**，避免同分仍选 dn50。

**不选**：全局改 `MM_TO_INCH` 表（影响面过大）；本任务用 B1+B2 局部约束即可。

### 回归用例（B）

| 查询 | expected top | absent |
|------|--------------|--------|
| `LPPR Coupling 40 直接` | 8010071380 | 8010071381 |
| `PPR 90 elbow 40 弯头` | 8010071404 | 8010071405 |
| `PPR elbow DN40` | 仍 top dn40 系 | （已有 DN 前缀路径不退化） |

---

## 两路 bug 关系

```
                    VANTSING 英文询价行
                           │
           ┌───────────────┴───────────────┐
           ▼                               ▼
    含 40x32 compound                 含裸 40
    (reducer)                         (coupling/elbow)
           │                               │
           ▼                               ▼
    Workstream A                    Workstream B
    _compound_specs                 _diameter_values + tie-break
    thread_side 误判                MM_TO_INCH 扩展 + 无硬过滤
           │                               │
           ▼                               ▼
    not-in-candidates               in-candidates 但 top 错档
```

---

## Requirements（合并）

1. **A** — `_compound_specs` reducer DN×DN 分支（见上）。
2. **B1** — `_diameter_values` 裸 DN + 角度排除。
3. **B2** — exact `dn{N}` tie-break（同分场景）。
4. **测试** — `test_wanding_matcher_compat.py` + 实库 smoke（LESSO 8010071380/1404/1450）。
5. **不退化** — `PPR 32*20 female thread tee`；`PPR elbow DN40`；现有 compat 全绿。

## Acceptance criteria

| # | Check | Expected |
|---|-------|----------|
| AC-A1 | `PPR Reducing 40x32 大小头` | top `8010071450` |
| AC-A2 | `PPR Reducing 40x25 大小头` | top `8010071449` |
| AC-B1 | `LPPR Coupling 40 直接` | top `8010071380` |
| AC-B2 | `PPR 90 elbow 40 弯头` | top `8010071404` |
| AC3 | `test_compound_main_sub_spec_is_enforced` | PASS |
| AC4 | vendor sync + MCP 冒烟 | 同上 |
| AC5 | learn-by-data 行 9/10/11 | 9/11 → **match**；10 → match 或 in-candidates |

## Verification

```powershell
cd D:\Projects\claude-code-best\python
python test_wanding_matcher_compat.py
pytest tests/ -k "matcher or quotation" -q

python -c "
from inventory.services.match_and_inventory import match_quotation_union as m
for kw in ['LPPR Coupling 40 直接','PPR 90 elbow 40 弯头','PPR Reducing 40x32 大小头']:
    print(kw, '->', m(kw)[0]['code'])
"
```

## Deploy

`sync-dev-wanding-vendor.ps1` / `start-dev-full.ps1` — 无 route-b / AionUI 改动。

## Out of scope

- 全局 `MM_TO_INCH` 表重订
- LESSO vs RUCIKA 品牌排序
- `mapping_table_matcher` 历史路
- learn-by-data skill 逻辑变更
