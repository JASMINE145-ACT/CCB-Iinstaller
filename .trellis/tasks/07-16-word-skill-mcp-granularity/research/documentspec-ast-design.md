# DocumentSpec / AST 设计草案（Route A · Phase 1）

> **Purpose:** bulk MCP 不是 opaque blob；中间层必须可观察、可精准 patch、可校验、可恢复。

## 问题陈述

| 路径 | 调用数 | 可控性 | 可 patch | 可校验 |
|------|--------|--------|----------|--------|
| 113× atomic MCP | 高 | 低（慢） | 高（逐段） | 低（无结构契约） |
| 10× opaque bulk | 低 | **更低**（黑盒） | 低 | 低 |
| **DocumentSpec → render → validate** | 低 | **高** | **高**（by id） | **高** |

## DocumentSpec（JSON AST）

Orchestrator / research agent 产出；word-creator **只**通过 MCP 消费 DocumentSpec，不逐段即兴编写。

```json
{
  "spec_version": "1.0",
  "document_id": "doc-2026-07-16-ai-report",
  "title": "AI 技术调研报告",
  "sections": [
    {
      "section_id": "sec-executive-summary",
      "level": 1,
      "title": "执行摘要",
      "blocks": [
        {
          "block_id": "blk-exec-p1",
          "type": "paragraph",
          "text": "..."
        }
      ]
    },
    {
      "section_id": "sec-findings",
      "level": 1,
      "title": "主要发现",
      "blocks": [
        {
          "block_id": "blk-findings-table",
          "type": "table",
          "headers": ["维度", "结论"],
          "rows": [["...", "..."]]
        }
      ]
    }
  ]
}
```

### Block types (P0 minimum)

- `paragraph` · `heading` (inline in section) · `table` · `page_break` · `list`

### ID rules

- `section_id` / `block_id`：**stable within document_id**；重渲染同 id → 幂等覆盖，不 duplicate。
- Format: `sec-*` / `blk-*`；禁止随机 UUID 每次 render（否则无法 patch）。

## DOCX 锚点映射（section_id / block_id）

Bulk render 必须在 docx 内留下 **可寻址锚点**，供 micro MCP patch：

| 策略 | P0 推荐 | 备注 |
|------|---------|------|
| Custom document properties | optional metadata | 整 doc 级，不够 block 级 |
| **Bookmark** per section/block | **P0** | `get_document_outline` / find 可定位 |
| Content control (SDT) | P1 | 更强结构，实现成本高 |
| Comment anchor | defer | 污染 UX |

MCP bulk tool `render_document_spec` 输出时：

1. 写入 bookmark `WANd:sec:<section_id>` 于 section 首段
2. 写入 bookmark `WANd:blk:<block_id>` 于 block 首元素
3. 返回 **render manifest**：`[{ section_id, block_id, bookmark_name, paragraph_index }]`

Micro patch 路由：`patch_block_by_id(block_id, new_content)` → 解析 manifest 或 scan bookmark → `search_and_replace` / block replace **一次**。

## 事务 · 幂等 · 失败恢复

### Apply envelope（每次 bulk/micro 调用）

```json
{
  "apply_id": "apply-20260716-001",
  "document_id": "doc-2026-07-16-ai-report",
  "mode": "upsert",
  "spec_hash": "sha256:...",
  "backup_before": true
}
```

| 字段 | 行为 |
|------|------|
| `apply_id` | 同 apply_id 重试 → **no-op 或相同结果**（幂等） |
| `mode: upsert` | 同 block_id 存在则 replace，不存在则 insert |
| `backup_before` | 写前复制 `.docx` → `.docx.bak.<apply_id>` |
| `spec_hash` | 校验 DocumentSpec 与 manifest 一致 |

### 失败恢复

1. **Pre-write backup** — 每次 mutating MCP 可选强制
2. **Partial failure** — bulk render 按 section 分批（≤5 sections/call）；失败 section 不影响已 commit sections（manifest 增量）
3. **Rollback** — `restore_document_backup(apply_id)` 或复制 `.bak` 回主文件
4. **Observability** — 写 `run-report.json`：`apply_id`, sections_ok, sections_failed, manifest_path

## 校验双层（结构 + 渲染）

### Gate S — 结构校验（render 前 / patch 前）

对 DocumentSpec JSON：

- schema 合法（required fields, level 1–3, block types）
- `section_id` / `block_id` 唯一
- 表格 rows 矩形、headers 非空
- 禁止 placeholder tokens（`$xxx$`, `{{name}}`, `lorem`）— 借 officecli-docx 原则

命令形态：`validate_document_spec(spec_path)` → PASS/FAIL + 行号

### Gate R — 渲染校验（render 后 / 交付前）

对 docx 产物：

1. **Manifest 对齐** — 每个 spec block_id 在 docx 有对应 bookmark + 非空 text/table
2. **Outline 对齐** — `get_document_outline` 标题层级与 spec sections 一致
3. **Content 抽样** — 关键 block_id 文本 hash 与 spec 一致
4. **Render 视觉（P1）** — `convert_to_pdf` + 页数/非空页（07-13 已有 MS Word 依赖）

命令形态：`validate_rendered_document(spec_path, docx_path, manifest_path)` → PASS/FAIL + diff summary

**禁止：** 仅 `create_document` 成功即 declare done。

## MCP 工具映射（Phase 1 最小集）

| Tool | 粒度 | 输入 |
|------|------|------|
| `validate_document_spec` | macro-prep | DocumentSpec JSON |
| `render_document_spec` | macro | spec + filename + apply envelope |
| `patch_block_by_id` | micro | block_id + new block payload + apply envelope |
| `get_document_manifest` | read | filename → manifest |
| `restore_document_backup` | recovery | apply_id |

现有 atomic tools（`add_paragraph` 等）降级为 **escape hatch**，SOP 禁止用于 >3 block 的 compose。

## 与 113→10 的关系

```text
research.md + outline
    → DocumentSpec JSON (可 diff、可 review)
    → validate_document_spec (Gate S)
    → render_document_spec (1–3 MCP calls, 分批)
    → validate_rendered_document (Gate R)
    → [optional] patch_block_by_id × k (k≤5, 精准)
    → get_document_text + convert_to_pdf
```

典型报告：**8–15 MCP calls**，且每次调用 **可观察**（manifest + run-report）。
