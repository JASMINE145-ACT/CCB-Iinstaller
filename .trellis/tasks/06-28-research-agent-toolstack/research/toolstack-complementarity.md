# 三工具互补性 — 研究笔记

> Task: `06-28-research-agent-toolstack`  
> Date: 2026-06-28  
> Status: 探索结论，待 Phase 1 POC 验证

## 问题

资料搜索助手能否同时使用 Agent-Reach、Scrapling、Lightpanda，还是必须选一个？

## 结论

**可以并存，但不能无条件全部注册。** Agent-Reach 是安装、配置和健康检查工具；实际运行时编排属于 `research-agent` L1。Scrapling 是增强抓取能力，Lightpanda 是仍需验证的实验浏览器引擎。

## 职责矩阵

| 能力 | Agent-Reach | Scrapling | Lightpanda |
|------|-------------|-----------|------------|
| 全网语义搜索 | Exa via mcporter ✓ | ✗ | ✗ |
| 读普通网页 | Jina Reader ✓ | Fetcher ✓ | fetch --dump ✓ |
| 读 JS 渲染页 | 弱（依赖上游） | DynamicFetcher ✓ | 原生 ✓ |
| 反 Cloudflare | ✗ | StealthyFetcher ✓ | 部分 |
| 平台特化（B站/推特/小红书） | 多 CLI 路由 ✓ | ✗ | ✗ |
| Spider / 大规模爬取 | ✗ | Spider ✓ | ✗ |
| MCP 原生 | 否；配置/检查上游 MCP | ✓ | ✓ |
| 安装/体检 | `agent-reach doctor` ✓ | pip + scrapling install | binary/docker |
| 资源占用 | 中（多 CLI） | 高（Playwright） | 低（声称 ~1/16 Chrome 内存） |
| 许可证 | MIT | BSD-3 | **AGPL-3.0** |
| Windows | ✓ | ✓ | WSL only |

## 推荐路由（按失败类型）

```
发现 URL → Exa / 平台上游
普通页读取 → Jina
正文为空 / JS 必需 → 已安装的 Dynamic browser
403 / block → 仅在站点策略允许时使用 Scrapling Stealth
404 / timeout / 登录墙 / CAPTCHA → 停止或报告，不盲目升级
结构化批量提取 → Scrapling Spider（独立任务类型，不混入普通问答）
```

这与 Agent-Reach README 中「每个平台 = 首选 + 备选有序列表」一致；Scrapling/Lightpanda 是 **web channel 的深层备选**，不是替代 Exa/Jina/GitHub 等平台通道。

## 与 Agent-Reach 的重叠与边界

| 重叠点 | 处理方式 |
|--------|----------|
| 都「能读网页」 | Jina 优先；Scrapling 仅 fallback |
| 都有 MCP | research-agent L1 写清优先级，避免模型随机选 |
| 都面向 AI Agent | Agent-Reach 负责 **选型文档 + doctor**；Scrapling/Lightpanda 作为 **显式注册的后端** |

Agent-Reach 不必“包含”Scrapling。`research-agent` 根据 capability manifest 和失败分类选择实际工具。

## 部署建议

| 环境 | 推荐栈 |
|------|--------|
| 开发机 POC | Agent-Reach（web+exa+github）+ Scrapling MCP |
| 员工本机 | Base 默认；Scrapling 按能力启用；Cookie 平台默认关闭 |
| VPS | Exa API + Jina only；**不装** Scrapling browser / Lightpanda |

## 风险

- Lightpanda Beta + AGPL：商用分发需单独评估
- Scrapling `scrapling[all]` 体积大：不适合打进 CCB 离线安装包的第一版
- 三工具都装 → `doctor`/health 需统一（可扩展 `mcp-health-manifest.json`）
- Cookie、反爬、下载和网页 prompt injection 需要独立安全策略
- 同时存在多个浏览器 MCP 会扩大工具面并增加模型误选，应按 profile 隔离

## 待 POC 验证

- [ ] 固定 URL corpus 上 Base / Scrapling / Lightpanda 的成功率、有效正文率、P95、内存与失败分类
- [ ] Agent-Reach install 在 Windows 11 + CCB-Wanding 环境是否冲突现有 MCP
- [ ] Exa MCP 与现有 `exa-search` skill 配置是否可共用
- [ ] direct Guid 与 orchestrator 委派是否共享 cwd 和 `research/` 交付路径
- [ ] 缺失 Extended/Experimental 工具时 Base session 是否仍可正常创建

## References

- Agent-Reach channels 架构：`channels/web.py → Jina Reader`，`exa_search.py → Exa`
- Scrapling MCP：`pip install scrapling[ai]` + MCP server
- Lightpanda MCP：`lightpanda mcp` stdio
