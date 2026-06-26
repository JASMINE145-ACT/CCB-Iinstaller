# CCB-Wanding Environment Index

## 运行时会话 persona

本会话 **不** 定义业务人设或任务路由。运行时会话 persona 由 `agents/<id>.md` 与 sidecar `claude_md` 决定；Guid 默认路由为 `wande-orchestrator`（万鼎总路由）。

业务 SOP 分册位于安装目录 `vendor/wanding/data/`。报价/账务流程 SOP 已内联在 `agents/quotation-agent.md` / `agents/accurate-agent.md` 正文，子 agent **勿**每轮 Read `ccb-wanding-quotation.md` / `ccb-wanding-accurate.md`；`wanding_business_knowledge.md` 仍在多候选/选型时按需 Read。**不**默认注入本索引。

## 语言与数据路径

- 面向用户的回复使用 **简体中文**；物料编码、规格、单位、英文品牌名、印尼文/英文表单字段保留原文。
- 万鼎业务数据目录：`D:\CCB-Wanding\vendor\wanding\data\`（或当前安装目录下的 `vendor\wanding\data\`）。

## 工具调用纪律

- 不要用空参数调用任何工具。
- MCP 工具已发现后，不要重复搜索同一工具；找到后立刻用真实参数执行。
- MCP 参数类型严格遵守 schema；整数写 JSON number，不要写成字符串。
- 不要失败后改跑 `python3`、`node -e`、PowerShell 临时脚本或本机文件脚本来绕过 MCP 工具链。
- 业务 MCP（quotation、accurate）由对应子 agent 在委派后调用；**默认路由会话** orchestrator 不直接调用业务 MCP。
- **Guid 专家卡片会话**（`quotation-agent` / `accurate-agent`）由该专家 **直接** 调用专属 MCP；上述委派规则 **不适用**。

## 文件产出默认路径（全局）

用户**未明确给出绝对路径**时，所有新建/导出文件（报价单、Word、Excel、PPT、PDF 导出、整理结果等）默认写入 **当前 AionUI 会话工作区**（侧边栏「临时空间」/ 所选项目目录），以便侧边栏直接可见。

- **Guid 附件自动工作区（2026-06-19）：** 用户在 Guid 未手动选「在项目中工作」但已挂附件/打开文件时，会话工作区自动设为**首个附件的所在目录**；底部 pill 会显示该文件夹名（如 `微信公众平台_files`）。手动选目录仍优先。

- 仅写相对路径（如 `report.xlsx`、`exports/deck.pptx`）→ 解析到工作区下对应子路径。
- 用户明确给出绝对路径（如 `D:\Downloads\x.xlsx`）→ 按用户指定位置写入。
- 禁止默认写入 `Desktop` 或猜测 `C:\Users\...\Desktop`。
- 办公 agent（cowork / word-creator / excel-creator / ppt-creator）与 MCP 填表工具均遵守此规则。

## 动态记忆规则

项目静态规则以运行时 `CLAUDE.md` 和 `vendor/wanding/data/` 分册为准。动态记忆只记录用户偏好、客户偏好、历史纠正和临时业务约定。

如果存在 `memory` 目录，会话开始时优先读取：

```text
memory/MEMORY.md
memory/personal/profile.md
memory/personal/workflow.md
```

根据任务需要读取：

```text
memory/business/customers.md
memory/business/products.md
memory/business/pricing.md
```

自动写入触发：
- 用户纠正了型号、品类或报价匹配结果，写入 `memory/business/products.md`。
- 用户提到某客户的特殊偏好、付款方式、常用等级，写入 `memory/business/customers.md`。
- 用户说明折扣、审批、含税、不含税、利润率等规则，写入 `memory/business/pricing.md`。
- 用户表达个人工作流偏好，写入 `memory/personal/workflow.md`。

写入规范：
- 写入前先读取目标文件，避免重复。
- 追加到文件末尾，不覆盖已有内容。
- 格式使用：`- [YYYY-MM-DD] 简短内容`
- 内容必须短、可执行、可复用。
- 不确定该不该记时，先询问用户。

## 知识文件更新原则

CCB-Wanding 安装后，以下文件**不会被版本升级覆盖**，由 AI 和用户共同维护：

- `ccb-wanding-claude-index.md`（本文件，仅环境说明）
- `ccb-wanding-quotation.md`
- `ccb-wanding-accurate.md`
- `wanding_business_knowledge.md`

**决策树：收到业务纠正或新规则时，写哪里？**

```
这条信息只属于当前用户？
├── 是 → 写 memory/（见"动态记忆规则"章节）
│         例：某客户折扣、个人工作习惯、历史纠正记录
└── 否（普遍适用于所有人）→ 更新对应 SOP 文件
          ├── 报价/库存/填单流程 → ccb-wanding-quotation.md
          ├── Accurate 查询规则/字段/参数 → ccb-wanding-accurate.md
          ├── 产品选型经验/品牌规则 → wanding_business_knowledge.md
          └── 路由/委派逻辑变化 → agents/wande-orchestrator.md（非本 index）
```

**更新 SOP 文件的时机**（满足任一条件即可更新）：
- 发现 SOP 描述的步骤在实际调用中出错，且错误是普遍性的
- 用户明确说"记下来以后都这样做"且不涉及个人偏好
- Accurate / 报价 MCP 的参数规则有变化（字段名、枚举值等）

**不要更新 SOP 文件的情况**：
- 只是这次对话的特殊要求（一次性，写 memory 加时间戳）
- 用户个人的客户关系、折扣习惯、交货偏好
- 对 SOP 内容不确定时（先询问用户确认再写）

**更新格式规范**：
- 修改 SOP 前先 Read 目标文件，定位要改的段落
- 用 Edit 做最小改动，不要重写整个章节
- 在改动处加简短注释说明原因，格式：`<!-- updated YYYY-MM-DD: 原因 -->`
