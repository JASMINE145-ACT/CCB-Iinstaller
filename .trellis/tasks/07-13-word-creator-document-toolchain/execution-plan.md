# Execution Plan — word-creator document toolchain

| Field | Value |
|-------|--------|
| **Status** | **approved** — 用户 2026-07-13 拍板「2 MCP + 2 轻量」闭环 |
| **Scenario** | **L→A**（研究已定 → 分阶段实现） |
| **Plan depth** | **Full** |
| **Verification profile** | **Cross-repo** |
| **Repos** | ccb-installer（agents/skills/seed）；`mcp_servers/pdf-toolkit`（新建）；打包 whitelist |
| **Active phase** | **Stage 1 — P0 DONE**（出站闭环 + smoke FULL；下一阶段 Stage 2） |

---

## Skills invoked (this planning session)

| Invocation | Type | Evidence |
|------------|------|----------|
| trellis-task-execution | Read: | Contract→TDD→Verify |
| trellis-before-dev | Read: | agents-unified-model；mcp-health；word-creator MCP-only |
| explore office/PDF | Agent: | office-word convert_to_pdf；PDF Processor dev-only |
| 用户架构拍板 | — | 2 MCP + 2 轻量；B 架构 / A→B 实施 |

---

## Progress snapshot

| Stage | Phase | State | Delivery |
|-------|-------|-------|----------|
| 0 | 选型 | **done** | prd + research locked |
| 1 | P0 出站闭环 | **done** | word-creator.md + orchestrator Office 路由 |
| 1 | P0 smoke | **done** | DOCX+PDF FULL PASS (148455 B PDF) |
| 2 | P1 pdf-toolkit | pending | inspect/extract/ocr |
| 2 | P1 入站工作流 | pending | PDF→Word 编排 + 话术 |
| 2 | P1 validator | pending | compare + validate_docx |
| 3 | P1.5 templates | pending | seed + skill |
| 4 | P2 打包 | pending | install + health + render_pages |
| 5 | P3 markitdown | deferred | pdf-toolkit 内部 |

---

## Phase -1 — Capability matrix

| Capability | Preferred | Status | Fallback |
|------------|-----------|--------|----------|
| 写/改 DOCX | office-word | **shipped** | — |
| Word→PDF | office-word `convert_to_pdf` | upstream **未教** | 手动另存 |
| PDF 分型 | pdf-toolkit `inspect_pdf` | **to build** | 盲 extract（禁） |
| PDF 文本/表 | extract_text / extract_tables | to build | — |
| PDF OCR | ocr_pdf | to build | 人工 |
| 复杂页理解 | render_pages | P2 | 纯文本凑合 |
| 质量检查 | document-validator workflow | to build | 人工 |
| 公司模板 | document-template skill/seed | P1.5 | 自由发挥 |
| markitdown | pdf-toolkit 内部 P3 | deferred | — |
| Excel/PPT | 独立 agents | shipped | orchestrator 委派 |

**Risk tags:** `packaging` · `ui` · `external-api`（OCR 模型体积）

---

## Contract map

| Contract | Behavior protected | Primary code | Tests / smoke | Risk |
|----------|--------------------|--------------|---------------|------|
| **WANd.OFFICE.WORD.CLOSED_LOOP.001** | 出站：DOCX→校验→`convert_to_pdf`→双路径；用户「发客户」自动 PDF | word-creator.md；validator 工作流 | Guid smoke | ui |
| **WANd.OFFICE.PDF_TOOLKIT.001** | 入站：必先 `inspect_pdf`；禁止盲 OCR；五步工具面 | `mcp_servers/pdf-toolkit`；word-creator 编排 | unit + 样例 PDF | packaging |
| **WANd.OFFICE.DOC_VALIDATE.001** | 空文档/层级/表格/数字对比/PDF 页数 | validator skill 或 office-word 读回 | 样例对比测试 | ui |
| **WANd.OFFICE.DOC_TEMPLATE.001** | 公司规范模板与品牌素材可选用 | seed + skill | 邀请函 smoke | ui |
| **WANd.OFFICE.LANES.001** | 不吞 excel/ppt MCP | agent seeds；orchestrator | 委派回归 | ui |
| **WANd.OFFICE.MARKITDOWN.INTERNAL.001** | markitdown 仅内部长文档策略 | pdf-toolkit 可选 | P3 | — |

### Contract: WANd.OFFICE.WORD.CLOSED_LOOP.001

**Behavior protected:** 文档助手出站是闭环，不是「只给 docx 让用户自己转」。  
**Primary code:** `ccb-installer/config/agents/word-creator.md`；可选 `skills/document-outbound/`。  
**Tests:** Guid「生成报告并发客户」→ `.docx` + `.pdf` 存在。  
**Risk:** 无 MS Word → convert 失败需话术。

### Contract: WANd.OFFICE.PDF_TOOLKIT.001

**Behavior protected:** PDF 入站分型正确；`inspect_pdf` 在 extract/ocr 之前。  
**Primary code:** 新 MCP；`word-creator.md` 决策表。  
**Tests:** 文本 PDF / 扫描 PDF 各 1 fixture；禁止跳过 inspect 的 agent 路径（eval 或 gate）。  
**Risk:** OCR 质量；打包体积。

---

## Workstreams

| Stage | Priority | Workstream | touches | Risk | Tool / agent | Files | Required output | Profile |
|-------|----------|------------|---------|------|--------------|-------|-----------------|---------|
| 1 | **P0** | **word-creator 出站**：工具表 + `convert_to_pdf` + 自动双输出 | CLOSED_LOOP.001 | ui | — | word-creator.md | 路由规则 | UI |
| 1 | **P0** | **validator 最小集**（空文档 + get_document_text 交付前） | DOC_VALIDATE.001 | ui | — | skill 或 md 段 | 出站前检查 | UI |
| 1 | **P0** | orchestrator 一句：PDF/Word 文档 → word-creator | LANES.001 | ui | — | wande-orchestrator.md | 委派不变 | UI |
| 1 | **P0** | code-reviewer + Guid smoke 出站 | CLOSED_LOOP.001 | ui | Task | — | PASS | UI |
| 2 | **P1** | **实现 pdf-toolkit MCP**（inspect/extract_text/extract_tables/ocr） | PDF_TOOLKIT.001 | packaging | TDD | mcp_servers/pdf-toolkit | tools/list + unit | Cross-repo |
| 2 | **P1** | **word-creator 入站工作流** + 产品话术 | PDF_TOOLKIT.001 | ui | — | word-creator.md | 决策树 | UI |
| 2 | **P1** | **validator 增强**：compare_extracted_content | DOC_VALIDATE.001 | ui | TDD | validator | 数字/表行对比 | UI |
| 2 | **P1** | word-creator `mcpServers` + settings 接线 | PDF_TOOLKIT.001 | packaging | — | platform.defaults；install script | dev 可用 | Cross-repo |
| 3 | **P1.5** | **document-template** seed + skill | DOC_TEMPLATE.001 | ui | — | packages/vertical 或 seed | list/get_template | UI |
| 4 | **P2** | **CCB 打包** pdf-toolkit + health probe | PDF_TOOLKIT.001 | packaging | Read: wanding-release | whitelist；install-*.ps1 | 员工机 | Release |
| 4 | **P2** | `render_pages` | PDF_TOOLKIT.001 | ui | — | pdf-toolkit | 宣传册样例 | UI |
| 5 | **P3** | markitdown 内部策略 | MARKITDOWN.INTERNAL.001 | — | — | pdf-toolkit | 长文档 fixture | — |

**Close rule：** Stage 1 P0 PASS → 可内测出站；Stage 2 P1 PASS → 内测 PDF→Word；Stage 4 P2 PASS → 员工机发货。

---

## TDD contract

| Workstream | Contract | RED evidence | GREEN command | Refactor guard |
|------------|----------|--------------|---------------|----------------|
| pdf-toolkit | PDF_TOOLKIT.001 | 无 server | `bun test` / probe tools/list | 同 |
| inspect 门禁 | PDF_TOOLKIT.001 | agent 跳过 inspect | eval 或 transcript gate | 同 |
| convert_to_pdf | CLOSED_LOOP.001 | md 无工具 | Guid smoke 双文件 | 同 |
| compare 数字 | DOC_VALIDATE.001 | 无对比 | fixture PDF→docx 金额一致 | 同 |

---

## Contract Verification

| Contract | Verification | Evidence | Status |
|----------|--------------|----------|--------|
| CLOSED_LOOP.001 | outbound smoke | DOCX+PDF FULL PASS; install fix | **done** |
| PDF_TOOLKIT.001 | probe + 2 PDF fixtures | 日志 | pending (Stage 2) |
| DOC_VALIDATE.001 | P0 readback in md | word-creator 交付前校验段 | **P0 done** |
| DOC_TEMPLATE.001 | 模板 smoke | 邀请函 docx | pending (P1.5) |
| LANES.001 | orchestrator 委派 | Office 路由表 | **done** |
| plan structure | lint_execution_plan.py | PASS | pending |

---

## Verification profile and gate

**Selected:** Cross-repo

```text
每 Stage：
  1. code-reviewer（agent md + renderer 若动 UI 卡）
  2. bun test / mcp probe / Guid smoke（按 Stage）
  3. Stage 4 前读 wanding-release-standard + whitelist
  4. 更新 execution-plan Progress + spec（spec-update gate）
```

---

## 分阶段实施（架构 B / 顺序 A→B）

```text
第一阶段（当前可执行）：
  P0 convert_to_pdf + 提示词/路由 + 最小 validator
  开发机验证出站闭环

第二阶段：
  P1 pdf-toolkit（inspect/extract/ocr）+ 入站工作流 + validator 增强
  开发机验证 PDF→Word

第三阶段：
  P1.5 模板与品牌素材
  P2 打进 CCB + render_pages + health
  员工机与开发机能力对齐
```

---

## Manual smoke checklist

**Stage 1 — 出站**

- [x] MCP 出站：create → validate → docx 存在
- [x] MCP 出站：`convert_to_pdf` → PDF 存在（install-office-word-mcp stub quarantine）
- [x] Guid 替代验收：`smoke-word-creator-p0.mjs` FULL + CDP Word 卡可见（用户不手测）
- [x] LANES：excel/ppt 仍独立委派
- [x] 无 Word/pywin32 时错误话术（agent md）；环境修复后 FULL PASS

**Stage 2 — 入站**

- [ ] 文本 PDF → inspect → extract → 重建 → 关键句/金额可核对
- [ ] 扫描 PDF → inspect → ocr → 重建（允许 OCR 误差提示）
- [ ] 表格 PDF → extract_tables → add_table 行数合理

**Stage 3 — 模板 / 打包**

- [ ] 邀请函/报价类可选用模板
- [ ] 新员工机无 Cursor 也能 inspect/extract

**回归**

- [x] 「做 Excel」仍委派 excel-creator（contract/lanes smoke）

---

## Recovery / re-approval

| 触发 | 动作 |
|------|------|
| 要把 excel/ppt 并进 word-creator | **re-approve** |
| 黑盒 convert_pdf_to_word 产品承诺 | **reject** — 违背合同 |
| pdf-toolkit 工具数 >5 核心 + render | 单独立项，不膨胀 MCP |
| 无 Word 批量部署 | LibreOffice 分支需新 task |

---

## 执行口令

用户说 **「执行 task」** 时从 **Stage 1 / P0** 开始（不动 pdf-toolkit 代码，除非用户指定跳阶段）。
