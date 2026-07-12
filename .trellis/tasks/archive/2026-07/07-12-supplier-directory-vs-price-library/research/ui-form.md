# UI form — Supplier directory in AionUI（全面 v1）

**Date:** 2026-07-12（修订：纳入产品匹配 + 运输车辆）  
**Inputs:** Sidebar；HTML prototype（三模式）；ui-ux-pro-max；`#/price-library` pattern.

## Verdict

**不像素复刻 HTML 外壳**，但 **v1 功能对齐 HTML 三模式**，并全部落到 Org（共享）+ 白名单可编辑 + Agent MCP 可读/可写。

```
侧栏：… → 价格库 → 【供应商】 → #/suppliers
页内模式：  [供应商浏览]  [产品匹配]  [运输车辆]
```

## Three modes

| Mode | UI | Org data | Agent |
|------|-----|----------|-------|
| **供应商浏览** | 搜索 + 品类 chip + 列表/卡片 + 详情抽屉 CRUD | `suppliers` | search/get/create/update |
| **产品匹配** | 独立关键词框 + 评分结果卡（命中产品高亮）→ 进详情 | 同上 + match API | `match_product` |
| **运输车辆** | 密表（车型/载重/尺寸/场景，中印）+ 行编辑 | `logistics_vehicles` | list/search/create/update |

## Shared principles

- Search / match is primary CTA（Directory pattern）
- Dense ops UI；AionUI tokens；**no emoji icons**
- Whitelist：新增/保存；非白名单只读（按钮隐藏或 disabled + 403）
- Drawer/forms：labeled fields、loading→success/error
- Same Org payload for UI and MCP — **one source of truth**

## Explicitly not deferred

- Product-match as **own mode** (not only global search)
- Vehicle catalog (seed 10 Lalamove rows; editable)
- Agent coverage for all three

## Still not cloning

- Standalone HTML CSS / logo / bilingual marketing chrome as second design system
- Real-time Lalamove pricing API
