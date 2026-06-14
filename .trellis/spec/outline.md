AionUI.exe (前端 UI)
  └─ aioncore.exe (ACP 二进制桥，闭源)
      └─ route-b/index.js (process launcher)
          └─ CCB-Wanding dist/cli.js --acp (完整 CCB-Wanding 后端)

AionUI.exe 是纯前端展示层，CCB-Wanding 是后端（带所有 MCP 工具、报价能力）。route-b 只负责用正确的环境变量启动 CCB-Wanding 进程，aioncore.exe 负责 ACP 协议的 IPC 桥接。

AionUI exe 源码位置：D:\Projects\aionui-src\packages\desktop

整体 monorepo 根在 D:\Projects\aionui-src，exe 对应的是 packages/desktop 这个包。其他包：
- packages/web-cli / packages/web-host — web 版本
- packages/shared-scripts — 共享脚本


好消息：不用每次打包。有 dev 模式，源码改了自动热更新。

方案对比：

┌──────────────────┬────────────────┬──────────────────┐
│       方式       │      速度      │       操作       │
├──────────────────┼────────────────┼──────────────────┤
│ dev 模式（推荐） │ 改代码即时刷新 │ bun run dev      │
├──────────────────┼────────────────┼──────────────────┤
│ 打包 exe         │ 每次 3-5 分钟  │ bun run dist:win │
└──────────────────┴────────────────┴──────────────────┘

dev 模式的一个前提：aioncore.exe 需要在 PATH 里（dev 模式找不到 bundled resources），在你当前 shell 里临时加一下就行：

$env:PATH += ";D:\Projects\claude-code-best\AionUi\resources\bundled-aioncore\win32-x64"
cd D:\Projects\aionui-src
bun run dev

但这里有个问题需要你确认——dev 模式启动后，它会用哪个 backend？ 需要看它是否能正确找到 route-b 的配置。


D:\claude-code-B\          ← CCB-Wanding 完整源码（可从源码改 + 重新 build）
  src\                      ← Claude Code / CCB 核心源码
  packages\
  build.ts / scripts\

          ↓ build 输出
D:\CCB-Wanding\dist\       ← 编译产物（entry-WG7IeDEv.js 等 chunk 从这里来）

D:\Projects\claude-code-best\   ← 你的定制层
  ccb-installer\src\            ← MCP、route-b、业务层
  .claude/                      ← CLAUDE.md、业务知识库


是的，完全正确。

如果早知道有 D:\claude-code-B 源码：

┌─────────────────────────────────────────┬────────────────────────────────────────┐
│           当时做的（困难路）            │            有源码的正确做法            │
├─────────────────────────────────────────┼────────────────────────────────────────┤
│ 在 minified entry-WG7IeDEv.js 里手动    │ 直接在 src/ 里加几行 TypeScript，build │
│ patch $buildMcp()                       │  一下                                  │
├─────────────────────────────────────────┼────────────────────────────────────────┤
│ 靠反向工程猜 ACP 事件流                 │ 直接读 src/entrypoints/ 或             │
│                                         │ src/coordinator/                       │
├─────────────────────────────────────────┼────────────────────────────────────────┤
│ 不知道 greeting 从哪里发                │ grep "greeting|systemPrompt|welcome"   │
│                                         │ 秒找                                   │
├─────────────────────────────────────────┼────────────────────────────────────────┤
│ 每次改都担心 minified 结构变了          │ 正常开发，TypeScript 有类型保护        │
└─────────────────────────────────────────┴────────────────────────────────────────┘

这是这次协作里一个关键信息没有及时传到我这里。以后有类似问题，先告诉我"有源码，位置在 X"，我会直接从源码入手。

现在的影响：
- 之前 patch 的 entry-WG7IeDEv.js 里的 $buildMcp() 是脆弱的，应该移到 D:\claude-code-B\src\ 里做干净的实现
- Issue 1 的 greeting 重复，应该从源码查根因，而不是在 AionUI 前端加去重补丁

1. Build pipeline 打通
从 D:\claude-code-B 改代码 → `bun run build` → `ccb-installer/scripts/deploy-claude-code-b-to-wanding.ps1` 已文档化；**注意**：纯源码 deploy 会丢失 live `$buildMcp` 补丁，直到迁到 src。

2. ACP 事件调试手段
现在 Issue 1（greeting 重复）靠猜，如果有办法在开发时看到 aioncore.exe 和 CCB-Wanding 之间实际流过的 ACP 事件，根因秒定。比如一个简单的事件日志开关。

其他的我觉得没缺口了：

┌──────────────────────┬────────────────────────────────┐
│         需求         │              状态              │
├──────────────────────┼────────────────────────────────┤
│ 前端改代码 + 热更新  │ ✅ aionui-src + dev 模式       │
├──────────────────────┼────────────────────────────────┤
│ 后端改代码 + rebuild │ ✅ claude-code-B + build 脚本  │
├──────────────────────┼────────────────────────────────┤
│ 业务层（MCP/知识库） │ ✅ ccb-installer/src           │
├──────────────────────┼────────────────────────────────┤
│ 集成运行             │ ✅ D:\CCB-Wanding + AionUI.exe │



┌────────────────────────────────────┬──────────────────────────────────────────────┐
│                场景                │                新路子是否更好                │
├────────────────────────────────────┼──────────────────────────────────────────────┤
│ 修 ACP bug（greeting               │ ✅ 明显更好——TypeScript 改，不用 patch       │
│ 重复、$buildMcp）                  │ minified JS                                  │
├────────────────────────────────────┼──────────────────────────────────────────────┤
│ 业务知识（CLAUDE.md、MCP servers） │ ➡️ 无差异——都是 config 文件注入              │
├────────────────────────────────────┼──────────────────────────────────────────────┤
│ 稳定性                             │ ⚠️ deploy 脚本已有；源码 MCP 未迁完前 rebuild 有风险 │
├────────────────────────────────────┼──────────────────────────────────────────────┤
│ 长期维护                           │ ✅ 更好——源码清晰，有类型保护                │
└────────────────────────────────────┴──────────────────────────────────────────────┘

结论：值得做，但不是"更好"，是更正确。

当前的 route-b + patch minified JS 是应急方案，源码路子是正道。两者可短暂并存，但迁移顺序以源码为准：先打通 build pipeline（claude-code-B → D:\CCB-Wanding\dist\，脚本见 `ccb-installer/scripts/deploy-claude-code-b-to-wanding.ps1`），再把 $buildMcp / greeting 等 ACP 问题迁到 src 修；AionUI 前端 symptom patch（如 chatLib 去重）仅作应急，根因修掉后删除。详见 [`backend/index.md`](./backend/index.md)（Rule 0）+ [`frontend/index.md`](./frontend/index.md) + [`integration/defensive-fix-policy.md`](./integration/defensive-fix-policy.md)。