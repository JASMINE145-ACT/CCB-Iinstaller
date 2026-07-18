# PRD — Org Structure Chart Redesign (设置 → 组织 → 架构)

## Background

用户反馈（交接文档）：架构 Tab 的组织架构图达不到 Rudder 参考实现（`docs/reference/rudder/ui/src/pages/OrgChart.tsx`）的效果：

1. 看不到父子连线（截图卡片散落）。
2. 卡片尺寸偏小 / 空白过多。
3. 混合场景（少数人设了 manager_user_id、多数没设）表现崩坏。

## Root-cause analysis（代码核实）

- `orgChartLayout.ts` 的 `isFlatForest` 只有在**所有**根都无下级时才走网格；只要任何一人设了上级，
  全部根（含几十个无下级单根）被排成一条超宽横排。初始 pan 固定左上角 → 树和连线在视口外右侧，
  用户看到的正是"散卡片、无连线"。
- `ACTIVE_EDGE_NODE_GAP = 12` 让 active 边两端各缩进 12px，连线与卡片脱节，视觉上是断线。
- 网格 `FLAT_WRAP_COLS = 3` 固定 3 列，人多时纵向极长，空白多。

## Goals

接近 Rudder 组织架构图，且在"混合场景"下必须同时看得到树 + 线：

1. **混合布局**：有下级的树（森林）置顶居中，正交连线；无上级且无下级的用户归入下方
   「未设上级」分区（自适应列数网格 + 分区标签），两块整体水平居中。
2. **连线质量**：父→子圆角正交折线；同一父亲的所有子边共享 midY（汇合成总线）；父节点底部
   出线处加 junction 圆点；去掉 ACTIVE_EDGE_NODE_GAP 断线效果，active 边只变色。
3. **初始视图锚定**：有树时初始视图水平居中在树块中心、顶部留边；整图能在 ≥0.85 缩放放下时
   直接整图居中。永不把卡片缩成蚂蚁（可读优先保留）。
4. **卡片升级**：保持 260×112 可读尺寸；头像按用户名哈希着色；有下级的卡片显示「直属 N」徽标。
5. **画布质感**：视口点阵背景随 pan/zoom 移动；缩放控件 = 放大 / 缩小 / 适应 / 100%。
6. i18n（zh-CN / en-US）补 `structure.unassigned`、`structure.reports`、`structure.resetZoom`，
   更新 fit 文案。

## Non-goals

- 不做折叠/展开、minimap、拖拽改上级。
- 不改数据层（useOrgUsersList / OrgUser 类型）与权限门禁（OrgStructurePanel 逻辑不变）。

## Files (all in D:\Projects\aionui-src)

- `packages/desktop/src/renderer/pages/orgUsers/orgChartLayout.ts` — 重写为混合布局，
  单入口 `computeOrgChartLayout()` 返回 nodes/edges/bounds/focus/unassigned 元数据。
- `packages/desktop/src/renderer/pages/orgUsers/OrgStructureChart.tsx` — 渲染重构。
- `packages/desktop/src/renderer/pages/orgUsers/orgStructureChart.css` — 新样式。
- `packages/desktop/src/renderer/services/i18n/locales/{zh-CN,en-US}/orgUsers.json` — 文案。

## Acceptance

- 只要有人设置 manager_user_id：能看到树 + 连线在首屏（初始视图锚定树），无上级用户在下方网格分区。
- 全员无上级：纯网格（列数 ≈ √n，3–8 列间自适应），无连线（预期行为）。
- 连线为圆角正交折线且两端贴卡片边缘，无断口。
- typecheck 通过。
