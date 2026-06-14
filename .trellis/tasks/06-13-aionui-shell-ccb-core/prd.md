# AionUI 壳子化：最大化展现 CCB-Wanding 核心能力

## Goal

把 AionUI 的 `/command` 和能力入口从“前端本地命令 + 后端补充”的模式，升级为 **CCB-Wanding 权威 capability manifest 驱动**。

最终目标：

```text
AionUI = 壳子 / 展示层 / 交互承载层
CCB-Wanding = 核心 / 能力源 / 命令与工具的权威定义
```

AionUI 不应该用自己的一套 slash command 定义占据、裁剪或替代 CCB-Wanding 的能力。AionUI 应该尽可能完整地展示 CCB-Wanding 的能力边界：能执行的直接执行，暂时不能执行的也要明确展示“来自 CCB，但当前壳子不支持”。

## Background

2026-06-13 已完成第一阶段修复：

- CCB-Wanding ACP `available_commands_update` 从只暴露 `prompt` 命令，扩展为暴露 headless-safe 的 `prompt` + `local` 命令。
- AionUI slash command merge 改成 backend command 优先，AionUI builtin command 只补充。
- 已避免 AionUI 本地 `/btw`、`/copy` 等定义 shadow CCB-Wanding 后端命令。
- live `D:\CCB-Wanding\dist\cli.js --acp` 已验证能返回 42 个命令。

但这只是“减少冲突”，还不是完整的“壳子 / 核心”架构：

- AionUI 仍然有自己的 builtin slash command 定义。
- CCB-Wanding 的 `local-jsx` / TUI / 需要特殊 UI 合约的能力没有被完整表达。
- AionUI 展示的是“它能处理的命令”，不是“CCB-Wanding 拥有哪些能力”。
- 用户无法看清哪些能力是 CCB 核心能力、哪些只是 AionUI 壳子能力、哪些能力当前壳子暂不支持。

## Product Principle

### 1. CCB-Wanding owns the capability universe

所有用户可感知的 CCB 能力都应该由 CCB-Wanding 发布，包括：

- slash commands
- MCP/tool-backed capabilities
- Trellis commands
- prompt commands
- local commands
- local-jsx commands
- 需要 TUI 或 renderer UI 合约的命令
- 当前 AionUI 暂不支持但 CCB-Wanding 确实拥有的能力

### 2. AionUI renders capability state, not its own worldview

AionUI 只负责：

- 拉取 CCB-Wanding capability manifest
- 展示能力
- 按 capability metadata 决定如何转发、禁用、提示或打开壳子 UI
- 提供必要的 shell-only 操作

AionUI 不应该：

- 靠本地列表定义 CCB 命令
- 隐式覆盖同名 CCB 命令
- 静默隐藏 CCB 具备但 AionUI 暂不能执行的能力
- 把 shell-only 命令伪装成 CCB 核心命令

### 3. 不可执行也要展示

如果 CCB-Wanding 有某个能力，但 AionUI 当前无法执行，AionUI 应显示为：

```text
来自 CCB-Wanding
当前 AionUI 壳子暂不支持执行
原因：requires_renderer_ui / requires_tui / unsupported_transport / ...
```

这能避免用户误以为“CCB 没有这个能力”。

## Requirements

## Task Breakdown

这个父任务不直接一次性实现所有内容。实际执行拆成 5 个可验收子任务：

1. `06-13-command-capability-manifest`
   - CCB-Wanding command/capability manifest
   - AionUI `/` 面板以 CCB manifest 为主
   - unsupported / needs_mapping 能力可见但不可误执行

2. `06-13-ccb-skills-authority`
   - AionUI 打开 Skills 页面时展示 CCB-Wanding 配置的 skills
   - import/delete/enable/disable 写回 CCB-Wanding
   - AionUI legacy skills 只做迁移或只读提示

3. `06-13-ccb-mcp-authority`
   - AionUI 打开 MCP 页面时展示 CCB-Wanding 配置的 MCP servers/tools
   - add/edit/delete/import/test 写回 CCB-Wanding
   - quotation MCP 等业务 MCP 以 CCB-Wanding 实际加载状态为准

4. `06-13-ccb-assistant-templates`
   - 保留 AionUI 助手模板 UI
   - 模板定义、持久化、应用到新会话的逻辑迁移到 CCB-Wanding
   - 模板绑定的 skills/MCP/model/mode 来自 CCB-Wanding 权威配置

5. `06-13-aionui-legacy-config-migration`
   - 盘点 AionUI `agent.config` / conversation snapshot 中的 legacy 配置
   - runtime-authoritative 配置迁移到 CCB-Wanding
   - AionUI 只保留主题、语言、窗口、通知、文件选择等壳子体验配置

推荐执行顺序：

```text
legacy config inventory
  -> MCP authority
  -> skills authority
  -> assistant templates
  -> command/capability manifest polish
  -> full AionUI shell verification
```

原因：MCP 和 skills 是 CCB-Wanding 真实执行能力的基础；assistant templates 会引用 skills/MCP；command/capability 面板最后可以完整呈现所有能力状态。

### R1. CCB-Wanding 增加权威 capability manifest

在 CCB-Wanding 后端定义并通过 ACP 暴露完整能力清单。

建议 manifest 字段：

```ts
type CapabilitySource = "ccb-wanding" | "aionui-shell";

type CapabilityKind =
  | "slash_command"
  | "tool"
  | "mcp_tool"
  | "workflow"
  | "shell_action";

type CapabilityExecution =
  | "backend_prompt"
  | "backend_local"
  | "backend_local_jsx"
  | "mcp_tool"
  | "tui_only"
  | "renderer_ui_required"
  | "unsupported_in_aionui"
  | "aionui_shell";

type CapabilityStatus =
  | "ready"
  | "disabled"
  | "unsupported"
  | "needs_mapping"
  | "hidden";

type CcbCapability = {
  id: string;
  title: string;
  description?: string;
  source: CapabilitySource;
  kind: CapabilityKind;
  execution: CapabilityExecution;
  status: CapabilityStatus;
  commandName?: string;
  aliases?: string[];
  userInvocable: boolean;
  hidden: boolean;
  reason?: string;
  requires?: string[];
};
```

最低要求：

- CCB-Wanding command registry 中所有用户可感知命令都能映射进 manifest。
- `prompt` / `local` 命令标记为 `ready`。
- `local-jsx` 命令不能简单隐藏，应标记为 `needs_mapping` 或 `unsupported`。
- `userInvocable === false` 和 hidden 命令仍可在 manifest 内保留，但默认不在普通 `/` 列表展示；调试视图可查看。
- manifest 必须可被 AionUI 直接消费，避免 AionUI 猜测 command type。

### R2. ACP event 层传递 capability manifest

在现有 `available_commands_update` 基础上选择一种兼容策略：

Option A：扩展现有 event payload，增加 `capabilities` 字段。

Option B：新增 `available_capabilities_update` event，同时保留 `available_commands_update` 给旧客户端。

推荐 Option B，因为它能避免把 “command list” 和 “完整能力 manifest” 混成一个语义。

### R3. AionUI `/` 面板以 CCB capability manifest 为主

AionUI slash command 面板改为：

1. 默认展示 CCB-Wanding manifest 中 `source = "ccb-wanding"` 且用户可见的能力。
2. `status = ready` 的能力可执行。
3. `status = needs_mapping` / `unsupported` 的能力可展示但禁用，并显示原因。
4. AionUI shell-only 能力必须明确标记 `source = "aionui-shell"`。
5. 同名冲突时 CCB-Wanding 永远优先。

### R4. AionUI 本地 slash command 降级

AionUI 现有 builtin slash command 不能继续作为同级 command source。

处理策略：

- `/open` 这类 shell-only 能力改为 toolbar/button 优先。
- 如果必须保留在 `/` 中，必须显示为 `source = "aionui-shell"`。
- AionUI 不允许定义与 CCB-Wanding 同名的 command。
- AionUI 本地命令文件只能保存 shell action adapter，不能保存 CCB command 语义。

### R5. local-jsx / TUI 能力要显式建模

当前第一阶段为了安全排除了 `local-jsx`。第二阶段不能继续静默排除。

要求：

- CCB-Wanding manifest 暴露 `local-jsx` 能力。
- AionUI 标记为 `needs_mapping`，除非已有明确 renderer adapter。
- 对每个 `local-jsx` 命令建立映射表：
  - command id
  - 需要的 UI contract
  - AionUI 当前状态
  - 是否可替代为 ACP prompt/tool flow

### R6. 文档和部署 repo 同步

完成后更新：

- `.trellis/spec/backend/acp-session-flow.md`
- `.trellis/spec/backend/route-b-status.md`
- `.trellis/spec/integration/aionui-ccb-boundary.md`
- `.trellis/spec/frontend/chat-acp-flow.md`
- `Crazy-Version/docs/command-sync.md`
- `Crazy-Version/manifest.json`

## Acceptance Criteria

- [ ] CCB-Wanding 有一个可测试的 capability manifest 生成器。
- [ ] manifest 覆盖 CCB-Wanding command registry 的所有用户可感知命令。
- [ ] `local-jsx` / TUI / renderer-required 命令不再被静默隐藏，而是带状态展示。
- [ ] ACP 能向 AionUI 发送完整 capability manifest。
- [ ] AionUI `/` 面板默认以 CCB-Wanding manifest 为主。
- [ ] AionUI 本地 shell-only 能力明确标记为 `aionui-shell`，不能覆盖 CCB-Wanding 同名能力。
- [ ] 旧的 `available_commands_update` 兼容路径仍可工作，或有明确迁移说明。
- [ ] 新会话中 `/` 能展示 CCB-Wanding 全部用户可见能力，包括 ready 和 unsupported/needs_mapping 状态。
- [ ] 点击 ready 命令能正确转发到后端执行。
- [ ] 点击 unsupported/needs_mapping 命令不会误执行，并能显示不可执行原因。
- [ ] quotation MCP 主流程仍可用：`查询直接50价格`。
- [ ] AionUI typecheck / targeted tests / backend ACP tests 通过，或记录明确外部阻塞。

## Definition of Done

- 后端 manifest 生成、ACP 发送、AionUI 消费链路完整。
- AionUI 不再用本地命令列表定义 CCB-Wanding command 语义。
- CCB-Wanding 的核心能力边界在 AionUI 中可见。
- 不能执行的能力有明确状态和原因，不再表现为“没有这个能力”。
- build / deploy / route-b sync / native ACP smoke / AionUI 手工验收全部完成。
- Trellis spec 和 Crazy-Version 部署文档同步完成。

## Technical Approach

### Backend: CCB-Wanding

目标文件：

- `D:\claude-code-B\src\commands.ts`
- `D:\claude-code-B\src\types\command.ts`
- `D:\claude-code-B\src\services\acp\agent.ts`
- 可能新增：`D:\claude-code-B\src\services\acp\capabilities.ts`

建议步骤：

1. 从 `getCommands()` 输出建立 command -> capability 的映射。
2. 不直接复用 legacy `available_commands_update` 的扁平结构，先建立内部完整 manifest。
3. 保留旧 command list：从 manifest 派生 ready command list，兼容旧 AionUI。
4. 新增 capability event 或扩展 ACP initialize/session event。
5. 增加单元测试：
   - prompt/local => ready
   - local-jsx => needs_mapping
   - hidden/userInvocable false => 默认不展示但 manifest 可追踪
   - dynamic/project commands 被包含

### Frontend: AionUI

目标文件：

- `D:\Projects\aionui-src\packages\desktop\src\renderer\hooks\chat\useSlashCommands.ts`
- `D:\Projects\aionui-src\packages\desktop\src\common\chat\slash`
- `D:\Projects\aionui-src\packages\desktop\src\renderer\components\chat\SendBox\index.tsx`
- `D:\Projects\aionui-src\packages\desktop\src\common\types\platform\acpTypes.ts`

建议步骤：

1. 在 ACP 类型中新增 capability manifest payload。
2. 建立 capability -> slash UI item adapter。
3. `/` 面板按 capability source/status 渲染：
   - ready：可执行
   - needs_mapping/unsupported：可见但禁用
   - aionui-shell：视觉上与 CCB 能力区分
4. 移除或降级 AionUI builtin command 的同级地位。
5. 增加测试：
   - CCB 同名命令永远优先
   - unsupported CCB capability 可见但不可执行
   - shell-only `/open` 不覆盖 CCB 命令

### Integration / Deploy

完成后：

1. `D:\claude-code-B` 运行 backend tests。
2. `D:\claude-code-B` 执行 `bun run build`。
3. deploy 到 `D:\CCB-Wanding\dist`。
4. route-b sync。
5. AionUI 新会话验收：
   - `/` 列表展示 CCB ready + unsupported 能力。
   - `/env` 或 `/version` 后端执行。
   - local-jsx 显示为 needs_mapping。
   - shell-only `/open` 不污染 CCB namespace。
6. 验 quotation MCP 主流程。

## Out of Scope

- 不把 AionUI 变成新的 command source of truth。
- 不要求一次性实现所有 `local-jsx` renderer UI。
- 不把 exe/dist 产物提交进普通 git。
- 不在 AionUI 中复制 CCB-Wanding command registry。
- 不为追求展示完整性而允许误执行 unsupported 命令。

## Risks

- ACP 协议字段扩展可能影响旧客户端，需要兼容路径。
- CCB-Wanding command registry 中动态命令、project commands、plugin commands 的来源不完全一致，需要统一 manifest 入口。
- AionUI 当前类型检查已有独立阻塞，可能影响最终 build gate。
- 如果 unsupported 能力展示太多，UI 需要分组/筛选，否则 `/` 面板会噪音过大。

## Open Questions

- capability manifest 是新增 `available_capabilities_update`，还是扩展 `available_commands_update`？
- `/open` 是否应该继续作为 slash command，还是迁移到 toolbar/file attach UI？
- `local-jsx` 的长期方向是 AionUI renderer adapter，还是后端改造成 ACP prompt/tool flow？
- 是否需要一个 debug view 展示 hidden / non-invocable capabilities？
- Crazy-Version 是否记录每次 manifest 的 command count 和 checksum？

## Verification Checklist

- [ ] Backend unit test: manifest generation.
- [ ] Backend ACP test: capability event is emitted.
- [ ] AionUI unit test: capability merge/render adapter.
- [ ] AionUI manual: `/` shows CCB ready + unsupported states.
- [ ] AionUI manual: CCB command execution works.
- [ ] AionUI manual: shell-only command is visually distinct.
- [ ] Native ACP smoke succeeds.
- [ ] Quotation MCP smoke succeeds.
- [ ] Trellis docs updated.
- [ ] Crazy-Version manifest/docs updated.
