# 三工具互补性 — 研究笔记

> Task: `06-28-research-agent-toolstack`  
> Date: 2026-06-28  
> Status: 探索结论，待 Phase 1 POC 验证

## 问题

资料搜索助手能否同时使用 Agent-Reach、Scrapling、Lightpanda，还是必须选一个？

## 结论

**可以并存，且 Agent-Reach 的设计哲学本身就是「编排层 + 多后端路由」。**  
Scrapling 和 Lightpanda 应作为 **fetch 后端的备选**，而不是与 Agent-Reach 竞争同一职责。

## 职责矩阵

| 能力 | Agent-Reach | Scrapling | Lightpanda |
|------|-------------|-----------|------------|
| 全网语义搜索 | Exa via mcporter ✓ | ✗ | ✗ |
| 读普通网页 | Jina Reader ✓ | Fetcher ✓ | fetch --dump ✓ |
| 读 JS 渲染页 | 弱（依赖上游） | DynamicFetcher ✓ | 原生 ✓ |
| 反 Cloudflare | ✗ | StealthyFetcher ✓ | 部分 |
| 平台特化（B站/推特/小红书） | 多 CLI 路由 ✓ | ✗ | ✗ |
| Spider / 大规模爬取 | ✗ | Spider ✓ | ✗ |
| MCP 原生 | 间接（Exa 等） | ✓ | ✓ |
| 安装/体检 | `agent-reach doctor` ✓ | pip + scrapling install | binary/docker |
| 资源占用 | 中（多 CLI） | 高（Playwright） | 低（声称 ~1/16 Chrome 内存） |
| 许可证 | MIT | BSD-3 | **AGPL-3.0** |
| Windows | ✓ | ✓ | WSL only |

## 推荐调用链（运行时路由）

```
用户 query
    │
    ▼
① Agent-Reach / Exa — 发现 URL、语义搜索
    │
    ▼
② Jina Reader — 读静态/轻 JS 页（快、免费）
    │
    ├─ 成功 → 摘要 + 引用
    │
    └─ 失败（403 / CF / 空 body）
           │
           ▼
       ③ Scrapling stealth-fetch — 反爬 + 结构化 extract
           │
           ├─ 成功 → 摘要 + 引用
           │
           └─ 仍失败 / 纯 SPA
                  │
                  ▼
              ④ Lightpanda CDP — 最后手段（若已部署）
```

这与 Agent-Reach README 中「每个平台 = 首选 + 备选有序列表」一致；Scrapling/Lightpanda 是 **web channel 的深层备选**，不是替代 Exa/Jina/GitHub 等平台通道。

## 与 Agent-Reach 的重叠与边界

| 重叠点 | 处理方式 |
|--------|----------|
| 都「能读网页」 | Jina 优先；Scrapling 仅 fallback |
| 都有 MCP | research-agent L1 写清优先级，避免模型随机选 |
| 都面向 AI Agent | Agent-Reach 负责 **选型文档 + doctor**；Scrapling/Lightpanda 作为 **显式注册的后端** |

Agent-Reach 不必「包含」Scrapling；在 research-agent 的 L1 SOP 里写 fallback 规则即可。

## 部署建议

| 环境 | 推荐栈 |
|------|--------|
| 开发机 POC | Agent-Reach（web+exa+github）+ Scrapling MCP |
| 员工本机 | 同上；Cookie 平台按需 |
| VPS | Exa API + Jina only；**不装** Scrapling browser / Lightpanda |

## 风险

- Lightpanda Beta + AGPL：商用分发需单独评估
- Scrapling `scrapling[all]` 体积大：不适合打进 CCB 离线安装包的第一版
- 三工具都装 → `doctor`/health 需统一（可扩展 `mcp-health-manifest.json`）

## 待 POC 验证

- [ ] 同一 URL：Jina 失败 → Scrapling 成功的比例（万鼎相关站点抽样）
- [ ] Agent-Reach install 在 Windows 11 + CCB-Wanding 环境是否冲突现有 MCP
- [ ] Exa MCP 与现有 `exa-search` skill 配置是否可共用

## References

- Agent-Reach channels 架构：`channels/web.py → Jina Reader`，`exa_search.py → Exa`
- Scrapling MCP：`pip install scrapling[ai]` + MCP server
- Lightpanda MCP：`lightpanda mcp` stdio
