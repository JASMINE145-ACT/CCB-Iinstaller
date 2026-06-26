# Skill 指南

CCB 集成了丰富的 Skills（技能）和 MCP 工具），让你在日常开发中如虎添翼。本指南介绍如何使用这些工具，并通过实例演示它们的能力。

---

## 什么是 Skill？

Skill 是 CCB 的增强模块，通过 `/` 命令或 `Skill` 工具调用。每个 Skill 封装了特定领域的最佳实践和工作流程。

**调用方式：**
```bash
/prd                    # 生成 PRD
/interview              # 需求访谈
/review-plan           # 多轮审查
/teach-me Python       # 学习 Python
/markitdown            # 文件转换
```

---

## Skill 分类

### 需求与分析

| Skill | 用途 | 调用命令 |
|-------|------|----------|
| [prd](#prd-生成产品需求文档) | 生成产品需求文档 | `/prd` |
| [interview](#interview-需求访谈) | 深度访谈挖掘需求 | `/interview` |
| [review-plan](#review-plan-多轮审查) | 4 轮迭代审查计划 | `/review-plan` |

### 学习与知识

| Skill | 用途 | 调用命令 |
|-------|------|----------|
| [teach-me](#teach-me-个性化学习辅导) | 一对一 AI 导师 | `/teach-me <主题>` |
| [markitdown](#markitdown-文档转换) | PDF/Excel 转 Markdown | `/markitdown` |

### 项目管理

| Skill | 用途 | 调用命令 |
|-------|------|----------|
| [openspec](#openspec-规范驱动开发) | 规范驱动的开发系统 | `/openspec` |

---

## 详细使用指南

---

## PRD — 生成产品需求文档

### 功能

自动生成结构化的产品需求文档（PRD），包含用户故事、功能需求、验收标准等。

### 使用示例

```
/prd
```

CCB 会询问几个关键问题来明确需求，然后生成完整 PRD：

```
1. 这个功能的主要目标是什么？
   A. 提升用户体验
   B. 提高转化率
   C. 减少运维负担

2. 目标用户是谁？
   A. 仅新用户
   B. 仅老用户
   C. 所有用户
```

回答后，生成 `tasks/prd-[功能名].md`。

### 生成结果示例

```markdown
# PRD: 用户通知系统

## 目标
- 支持多种通知渠道（邮件、短信、站内信）
- 提供通知偏好设置
- 记录通知送达状态

## 用户故事

### US-001: 接收邮件通知
**描述：** 作为用户，我希望收到邮件通知，这样在未登录时也能了解重要动态。

**验收标准：**
- [ ] 邮件包含通知标题和摘要
- [ ] 支持退订链接
- [ ] 发送成功率 > 99%

### US-002: 管理通知偏好
**描述：** 作为用户，我希望设置通知偏好，这样只收到关心的通知。

**验收标准：**
- [ ] 提供通知类型开关
- [ ] 支持免打扰时间段
- [ ] 偏好自动保存
```

---

## Interview — 需求访谈

### 功能

通过深度访谈挖掘真实需求，采用引导式提问而非开放式问题，让用户快速明确想法。

### 使用示例

```
/interview
```

### 访谈特点

- **多选题优先**：每个问题提供选项，降低回答门槛
- **逐步深入**：从宏观目标到具体实现
- **推荐选项**：选项前标注"推荐"，帮助用户快速决策

### 示例对话

```
CCB: 让我们开始需求访谈。

1. 这个项目的主要目标是什么？
   A. 自动化日常工作流程 ✓ [推荐]
   B. 改善团队协作效率
   C. 降低运营成本
   D. 其他

用户: 1A

2. 当前最大的痛点是什么？
   A. 重复性任务太多
   B. 信息分散难以查找
   C. 审批流程繁琐
   ...

用户: 1A, 2C
```

---

## Review Plan — 多轮审查

### 功能

对 Plan 或 Spec 文件进行 4 轮迭代审查：需求对齐、可行性、一致性、最终扫描。

### 使用示例

```bash
/review-plan plan.md requirements.md
```

### 审查流程

| 轮次 | 内容 | 输出 |
|------|------|------|
| Round 1 | 需求对齐 | 检查是否覆盖所有需求 |
| Round 2 | 可行性审查 | 识别技术风险 |
| Round 3 | 一致性审查 | 验证内部一致性 |
| Round 4 | 最终扫描 | 汇总遗留问题 |

### 中止控制

```bash
# 暂停审查
sed -i 's/mode: "active"/mode: "paused"/' .claude/review-plan/state.yaml

# 恢复审查
sed -i 's/mode: "paused"/mode: "active"/' .claude/review-plan/state.yaml
```

---

## Teach Me — 个性化学习辅导

### 功能

一对一 AI 导师，诊断你的水平、构建学习路径、追踪理解偏差。

### 使用示例

```bash
/teach-me Python decorators
/teach-me 量子力学 --level beginner
/teach-me React hooks --resume
```

### 学习流程

1. **诊断水平**：通过选择题探测当前理解程度
2. **构建概念图**：分解主题为 5-15 个原子概念
3. **循环辅导**：每个概念通过提问引导理解
4. **进度追踪**：记录学习状态，支持断点续学

### 示例诊断问题

```
header: "Level check"
question: "Python 装饰器你熟悉哪些概念？"
multiSelect: true
options:
  - label: "函数作为一等公民"
  - label: "闭包"
  - label: "@ 语法糖
  - label: "自定义装饰器"
```

### 生成的笔记示例

```markdown
# Python 装饰器核心笔记

## 1. 装饰器基础
* **一句话**: 装饰器是一个接收函数并返回新函数的函数
* **为什么存在**: 在不修改原函数的情况下增强功能
* **示例**:
```python
def my_decorator(func):
    def wrapper():
        print("Before")
        func()
        print("After")
    return wrapper

@my_decorator
def say_hello():
    print("Hello!")
```
```

---

## MarkItDown — 文档转换

### 功能

将 PDF、Excel、CSV 文件转换为 Markdown 格式，支持大文件分批处理和数据库落库。

### 使用示例

```
# 转换 PDF 为 Markdown
/markitdown convert D:\data\report.pdf

# 转换 Excel 并落库
/markitdown ingest D:\data\sales.xlsx --db postgresql://localhost/mydb

# 转换 CSV 为 Markdown
/markitdown convert D:\data\log.csv
```

### 支持格式

| 格式 | 转换 | 落库 | 大文件处理 |
|------|------|------|------------|
| PDF | ✅ | ✅ | 分批提取 |
| Excel (.xlsx) | ✅ | ✅ | 按 Sheet 分批 |
| CSV | ✅ | ✅ | 流式读取 |

### 环境变量

```bash
# 落库目标（默认 SQLite）
export DATABASE_URL="postgresql://user:pass@localhost/mydb"

# 扫描件 PDF OCR（可选）
export GLM_VISION_API_KEY="your-api-key"
```

### 转换示例

```
[Excel] 转换：D:\data\sales.xlsx
  处理 Sheet: 销售报表 ...
    批次 1/3（行 1–500）
    批次 2/3（行 501–1000）
    批次 3/3（行 1001–1500）
[OK] 转换完成
输出文件: D:\data\sales.md
总行数: 1500 行
```

---

## OpenSpec — 规范驱动开发

### 功能

AI 原生的规范驱动开发系统，管理规格文档、变更提案和产出物工作流。

### 使用示例

```bash
# 初始化项目
openspec init --tools claude

# 创建规格文档
openspec spec new

# 创建变更提案
openspec change new my-feature

# 应用变更
openspec change apply my-feature

# 归档完成
openspec archive my-feature
```

### 目录结构

```
.
├── specs/                    # 规格文档目录
│   └── my-feature.md
├── changes/                 # 变更提案目录
│   └── my-feature/
│       ├── agents.md        # AI 执行指令
│       └── artifacts.md     # 产出物清单
└── .archive/                # 已完成变更归档
```

### 工作流

```
openspec init
  → 创建 specs/ 和 changes/ 目录

编辑 specs/my-feature.md
  → 编写规格文档

openspec change new my-feature
  → 创建变更提案

编辑 changes/my-feature/agents.md
  → 添加 AI 执行指令

openspec change apply my-feature
  → AI 执行变更

openspec archive my-feature
  → 归档到 .archive/
```

---

## MCP 内置工具

除了 Skill，CCB 还内置了多个 MCP 工具，可直接通过自然语言调用。输入 `/mcp` 可查看所有已连接的 MCP 服务器。

### Excel MCP

通过 `excel-mcp` 操作 Excel 文件，支持读取、写入、图表、数据透视表等：

**读取数据：**
```
读取 D:\data\sales.xlsx，告诉我 Q1 总销售额是多少

打开这份报表，统计每个销售区域的订单数量
```

**写入数据：**
```
把这些数据写入 D:\output\report.xlsx，按月份分组

在 Sheet2 添加一个汇总表格，包含合计行
```

**图表操作：**
```
根据销售数据创建一个柱状图展示各月业绩对比

生成一个饼图显示各产品类别的销售占比
```

**数据透视表：**
```
创建一个透视表，按地区汇总销售额

添加一个计算字段，显示同比增长率
```

**格式化：**
```
设置第一行的字体为粗体，背景色为蓝色

给数据区域添加斑马条纹
```

> **注意**：excel-mcp 需要 Excel 桌面应用关闭状态才能操作。

### Exa 搜索

通过 `exa` 进行神经网络语义搜索和网页内容抓取：

**网络搜索：**
```
用 exa 搜索 Next.js 15 的最新特性

搜索最近一周关于 AI 编程工具的新闻

查找 React 19 的性能优化最佳实践
```

**内容抓取：**
```
抓取 https://docs.python.org/3/library/asyncio.html 的内容

提取这篇博客文章的核心观点

读取这个 GitHub 仓库的 README 文件
```

### Word MCP

通过 `word-mcp` 操作 Word 文档，支持创建、编辑、格式化、转换等操作：

**创建和打开文档：**
```
创建一个新的 Word 文档，标题为"项目报告"

打开 D:\docs\template.docx 作为模板

新建一个空白文档，保存到 D:\docs\周报.docx
```

**添加内容：**
```
在文档开头添加标题"2024年度总结"

添加一个 3 行 4 列的表格

插入一个分页符

添加页脚显示页码
```

**查找和替换：**
```
搜索并替换所有"旧名称"为"新名称"

查找文档中所有加粗的文本

找到包含"重要"的段落
```

**格式化：**
```
设置标题 1 的字体大小为 18pt

设置表格第一行为加粗

给段落添加项目符号列表

添加目录到文档开头
```

**文档操作：**
```
将文档转换为 PDF

接受所有修订

删除所有批注

添加水印"草稿"
```

**文档信息：**
```
获取文档的标题和作者信息

列出文档中的所有标题

查看文档大纲结构
```

### Quotation MCP（报价助手）

通过 `quotation-mcp` 进行询价和库存匹配：

**库存查询：**
```
查询物料编码 ABC123 的库存数量

批量查询这批物料的库存：ABC001, ABC002, ABC003
```

**智能匹配报价：**
```
根据这份需求清单匹配最优惠的报价

输入参数：数量 100，交期 2 周，获取最优方案
```

**解析 Excel 需求：**
```
解析 D:\data\requirements.xlsx 中的物料清单

提取这份报价单里的所有物料编码
```

---

## 常见问题

### Skill 怎么调用？

使用 `/` 命令直接调用，例如 `/prd`、`/teach-me Python`。

### 可以组合使用吗？

可以！例如：
1. 用 `/interview` 挖掘需求
2. 用 `/prd` 生成需求文档
3. 用 `/review-plan` 审查需求
4. 用 `/openspec` 管理开发流程

### Skill 会保存状态吗？

部分 Skill 支持断点续传：
- `teach-me --resume`：继续上次学习
- `review-plan`：通过 state.yaml 控制状态

### MCP 工具需要配置吗？

CCB 内置的 MCP 工具开箱即用：
- `excel-mcp`：需要本地安装 Excel
- `exa`：无需配置，直接使用
- `word-mcp`：需要本地安装 Word

---

## 更多资源

- [MCP 配置指南](04-MCP配置.md) — 配置外部 MCP 服务器
- [常见问题](06-常见问题.md) — 使用中的常见问题
- [用户留言板](/feedback) — 分享你的使用经验