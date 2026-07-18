# Word 文档助手 — 读·写·转·检 闭环

> **Task:** `07-13-word-creator-document-toolchain`  
> **Date:** 2026-07-13  
> **Status:** **approved**（用户 2026-07-13 拍板架构）  
> **Related:** `word-creator` · `office-word` · Office 三分道（excel/ppt 独立）

## One-line

文档助手 = **2 核心 MCP + 2 轻量能力**，形成「能读、能写、能转、能检查」闭环；**不再增加**万能格式工具或 Excel/PPT 并卡。

## Locked architecture（用户拍板）

```text
Document Assistant (word-creator)
├── office-word          ← 核心 MCP #1：写/改 DOCX、读结构、convert_to_pdf
├── pdf-toolkit          ← 核心 MCP #2：inspect / extract / ocr / render
├── document-template    ← 轻量：模板 + 品牌素材（先 Skill/模块，非首期 MCP）
└── document-validator   ← 轻量：DOCX/PDF 质量校验（先工作流，非首期 MCP）
```

**独立 MCP 仅两个：** `office-word` · `pdf-toolkit`  
**Excel / PPT** 继续 `excel-creator` / `ppt-creator` 分卡。

## 部署策略

| 维度 | 决定 |
|------|------|
| 产品架构 | **B** — 员工机最终可离线完成 PDF↔Word（打进 CCB） |
| 实施顺序 | **分阶段**：① P0 开发机验证工作流 → ② P2 打包 → ③ OCR/模板/校验 |

## 用户可见闭环

### 出站（Word → PDF）

用户说「输出 PDF」「可直接发客户」→ Agent **自动**：

```text
生成 DOCX → validate_docx → convert_to_pdf → 返回 DOCX + PDF 路径
```

### 入站（PDF → Word）

用户说「把这个 PDF 转成 Word」→ **一键对外，内部工作流**（非黑盒 convert_pdf_to_word）：

```text
inspect_pdf
  → 有文本层：extract_text / extract_tables
  → 无文本层：ocr_pdf
  → 复杂排版：render_pages 辅助
  → office-word 重建 DOCX
  → compare_extracted_content / validate_docx
  → 输出 DOCX
```

**产品话术：** 提取文字/表格/图片并重建可编辑 Word；复杂宣传册、扫描件、特殊排版可能无法完全还原版式。

### markitdown

仅作 **pdf-toolkit 内部可选策略**（长报告、制度、纯文字 PDF → MD → Word）；**不**作为文档助手首页工具。不适合报价单、财务表、宣传册、双栏排版。

## Acceptance（分阶段）

### Phase 1 — P0（开发机）

- [ ] AC-P0-1 `word-creator.md` 含 `convert_to_pdf` + 自动出站工作流
- [ ] AC-P0-2 路由/提示词：「发客户」不追问是否转 PDF
- [ ] AC-P0-3 出站 smoke：docx + pdf 双路径

### Phase 2 — P1

- [ ] AC-P1-1 `pdf-toolkit`：`inspect_pdf` · `extract_text` · `extract_tables` · `ocr_pdf`
- [ ] AC-P1-2 PDF→Word 工作流 + 产品话术
- [ ] AC-P1-3 `document-validator`：空文档、标题层级、表格/数字对比、PDF 页数变化

### Phase 3 — P1.5 / P2

- [ ] AC-P15 模板库：邀请函/报价/新闻稿等 + 品牌素材
- [ ] AC-P2 `pdf-toolkit` 打进 CCB + health probe；`render_pages`（P2）
- [ ] AC-P3 markitdown 内部策略（可选）

## Out of scope

- Excel/PPT MCP 并入 word-creator
- officecli 写 docx
- 黑盒 `convert_pdf_to_word` 保版式承诺
- 无限增加「文件格式 MCP」
