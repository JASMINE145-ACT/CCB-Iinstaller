# Research — 文档助手闭环架构（已拍板）

> **Task:** `07-13-word-creator-document-toolchain`  
> **Date:** 2026-07-13  
> **Status:** **locked** — 用户 2026-07-13 增补

## 核心结论

最有效的不是继续加「文件格式工具」，而是 **读 · 写 · 转 · 检** 闭环。  
最终配置：**2 核心 MCP + 2 轻量能力**，不要再多。

---

## 一、核心 MCP

### 1. office-word（保留 + 暴露）

| 能力 | 工具/动作 |
|------|-----------|
| 创建/修改 DOCX | create_document, add_*, search_and_replace, … |
| 结构读取（二次检查） | get_document_text, get_document_outline, get_document_info |
| **出站 PDF** | **`convert_to_pdf`**（MS Word 依赖） |

**P0 关键：** 把 `convert_to_pdf` 写进 agent + 出站 Skill/工作流，用户说「发客户」自动 DOCX→检查→PDF。

### 2. pdf-toolkit（新建，小型 MCP）

| 工具 | 用途 |
|------|------|
| `inspect_pdf` | 页数、是否扫描件、文本层、表格/图片 — **必先调用** |
| `extract_text` | 普通 PDF 文本 + 页码 |
| `extract_tables` | 报价单、合同、名单、财务表 |
| `ocr_pdf` | 扫描件、图片型 PDF |
| `render_pages` | 指定页渲染图片（复杂排版/图表）— **P2** |

**编排（禁止一上来 OCR）：**

```text
inspect_pdf
  → 有文本层 → extract_text / extract_tables
  → 无文本层 → ocr_pdf
  → 复杂页 → render_pages
  → office-word 重建
```

实现可参考 Cursor `agent-jk` PDF Processor，但产品化为 `pdf-toolkit` 并打进 CCB。

---

## 二、轻量能力（首期非独立 MCP）

### 3. document-validator

建议检查项：

- 文档是否为空；标题层级；表格是否超页
- 图片缺失；空白页；页眉页脚；中文字体异常
- 转 PDF 后页数是否异常变化
- **PDF→Word：** 原抽取 vs 重建 DOCX 的数字、表格行数、关键字段对比（0/O 等 OCR 错）

工作流：`validate_docx` · `compare_extracted_content` · `check_exported_pdf`

### 4. document-template

```text
list_templates / get_template / get_brand_assets
```

内容：Logo、中英文公司名、地址、页眉页脚、字体规范、落款、邀请函/报价/新闻稿等模板。

**价值：** 员工要的是「符合公司规范、可直接对外发送的 Word」，不是随机 docx。

首期：Skill + 目录资源（`ccb-installer` seed）；不必 MCP 化。

---

## 三、PDF→Word：不做黑盒

对外一键；对内多类型分流（文本/扫描/表格/双栏/宣传册/合同/中英混排）。  
见 `prd.md` 入站工作流。

---

## 四、markitdown 定位

| 适合 | 不适合 |
|------|--------|
| 长报告、制度、说明书、纯文字 PDF、进知识库 | 报价单、财务表、宣传册、双栏、需保图位 |

**pdf-toolkit 内部可选解析器**，非 Agent 首页工具。优先级 **P3**。

---

## 五、优先级（用户表）

| 优先级 | 内容 |
|--------|------|
| **P0** | `convert_to_pdf` 接入 + 提示词/路由规则 |
| **P1** | inspect + extract_text + extract_tables + OCR + 文档质量检查 |
| **P1.5** | 模板与品牌素材 |
| **P2** | PDF MCP 打进 CCB；`render_pages` |
| **P3** | markitdown 内部策略 |

---

## 六、部署

- **架构按 B**（员工机最终具备完整能力）
- **开发顺序按 A→B 分阶段**（见 execution-plan Phase 表）

---

## 七、明确不做

- excel/ppt 并进文档助手
- officecli 写 docx
- 万能文档 MCP
- 前台黑盒 `convert_pdf_to_word`
