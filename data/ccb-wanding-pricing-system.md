# CCB-Wanding 报价系统 — 价格体系文档

本文档覆盖 **MCP Python 后端**（CCB-Wanding-1.1.1.exe）与 **浏览器离线匹配器**（docs/matcher.js）的完整价格体系，以及两者的差异对比与迁移状态。

---

## 1. 价格档位总表

| 用户说法 | `customer_level` | Excel 字段 | matcher.js 键 | 适用来源 |
|---------|-----------------|-----------|--------------|---------|
| 出厂价含税 / `INCLUDE TAX` | `出厂价_含税` | `factory_inc_tax` | `price_incl_tax`（仅PE） | LESSO管材、国标管件、RUCIKA |
| 出厂价不含税 / `EXCLUDE TAX` | `出厂价_不含税` | `factory_exc_tax` | `price_excl_tax`（仅PE） | LESSO管材、国标管件、RUCIKA |
| 采购不含税 / `PURCHASE PRICE` | `采购不含税` | `purchase_exc_tax` | — | CEILING；其他来源按出厂不含税兼容 |
| A级 / 二级代理 | `A` | `price_a` | `level_a` | LESSO管材 |
| B级 / 一级代理 / 默认 | `B` | `price_b` | `level_b`（默认选中） | LESSO管材、RUCIKA、CEILING（`GENERAL PRICE`） |
| C级 / 聚万 | `C` | `price_c` | `level_c` | LESSO管材 |
| D级 / 青山 / 孔总 | `D` | `price_d` | `level_d` | LESSO管材、RUCIKA、CEILING（`MR KONG PRICE`） |
| **D低 / 青山降低利润率** | `D_low` | `price_d_low` | **`level_d_low`（待迁移）** | LESSO管材 |
| E级 / 大唐 | `E` | `price_e` | `level_e` | LESSO管材、国标管件 |
| 其他客户价 | — | `price_b` | `level_other` | 国标管件 |
| PE出厂价（不含税） | — | `pe_factory_price` | `price_excl_tax` | PE PIPA（2026.04.15） |
| PE含税价 | — | `factory_inc_tax × 1.11` | `price_incl_tax` | PE PIPA（浏览器端计算） |

> **products.json 字段说明**：浏览器 matcher.js 的产品数据通过某转换流程从 Excel 导出。Excel 字段 `price_X` 映射到 JSON 字段 `level_X`（如 `price_b` → `level_b`）。`price_d_low` 应同样映射为 `level_d_low`。

---

## 2. 数据来源分层

| 数据源 | 档位覆盖 | 产品类型 |
|-------|---------|---------|
| LESSO管材 | A / B / C / D / D_low / E + 出厂含税/不含税 | PVC AW给水、D排水、电线管(C管)、PPR冷热水、LESSO灰管 |
| 国标管件 | 其他(`price_b`) / 大唐(`price_e`) + 出厂含税/不含税 | 国标排水管件、给水管件 |
| RUCIKA | B / D + 出厂含税/不含税 | RUCIKA STANDARD AW、RUCIKA JIS（PVC-U 印尼品牌） |
| CEILING | B(`GENERAL PRICE`) / D(`MR KONG PRICE`) + 采购价 | Main Hollow、Stelldrat、Dynabolt、Mur、Panel、Hook |
| PE PIPA | 出厂价（B/不含税/含税三者同价） | PE/HDPE 给水管（对接/电熔） |

---

## 3. 产品匹配规则（MCP 后端硬规则，§6）

### 3.1 品牌/产品线隔离
| 查询特征 | 行为 |
|---------|------|
| 含 `RUCIKA` | 只保留 RUCIKA 行；排除 LESSO AW |
| 不含 `RUCIKA` | 排除 RUCIKA 行 |
| 含 CEILING 触发词 | 只保留 CEILING 产品 |

CEILING 触发词：`ceiling`、`main hollow`、`stelldrat`、`steel drat`、`soldays`、`dynabolt`、`mur soldays`

### 3.2 材质与用途隔离
- PVC / PPR / PE / HDPE 不交叉
- 给水 vs 排水 vs 穿线管不交叉
- 热水管 vs 冷水管不交叉

### 3.3 规格规则
- cm 表示**长度**（如 50cm = 50厘米管长），不得误判为管径 DN50
- PN16 ≡ 1.6MPa，压力值不参与口径匹配
- 复合规格 A×B：主径(DN) × 副径(英寸侧)，副径映射 15/16/20→1/2"，25→3/4"，32→1"

### 3.4 特殊业务规则
- 三角阀 ≠ 角阀（查询三角阀时角阀不匹配）
- 软管：库内无货，查询含"软管"返回无匹配
- 热熔器 → 焊接机（查询热熔器时映射到焊接机）
- PE默认对接，电熔需要明确指定"电熔"关键词

---

## 4. matcher.js（浏览器端）迁移状态

### 4.1 价格档位迁移对比

| 档位 | MCP后端 | matcher.js v36.90 | 状态 |
|------|--------|------------------|------|
| A级 | ✓ | ✓ `level_a` | ✓ 已迁移 |
| B级（默认） | ✓ | ✓ `level_b`（默认） | ✓ 已迁移 |
| C级 | ✓ | ✓ `level_c` | ✓ 已迁移 |
| D级 | ✓ | ✓ `level_d` | ✓ 已迁移 |
| **D低** | ✓ | **✗ 缺失** | ❌ 待迁移 |
| E级 | ✓ | ✓ `level_e` | ✓ 已迁移 |
| 出厂含税 | ✓（全线） | ✓ PE模式 `price_incl_tax`；LESSO/国标缺失 | ⚠ 部分 |
| 出厂不含税 | ✓（全线） | ✓ PE模式 `price_excl_tax`；LESSO/国标缺失 | ⚠ 部分 |
| 采购不含税 | ✓（CEILING） | ✗ 缺失 | ❌ 待迁移 |
| 国标其他价 | ✓ | ✓ `level_other` | ✓ 已迁移 |
| 国标大唐价 | ✓ | ✓ `level_e` | ✓ 已迁移 |
| PE出厂价 | ✓ | ✓ `price_excl_tax` | ✓ 已迁移 |

### 4.2 业务硬规则迁移对比

| 规则 | MCP后端 | matcher.js v36.91 | 状态 |
|------|--------|------------------|------|
| RUCIKA 品牌隔离 | ✓ 硬规则 | ✓ 已迁移（v36.91） | ✓ |
| CEILING 产品线隔离 | ✓ 硬规则 | ✓ 已迁移（v36.91） | ✓ |
| PVC/PPR/PE 材质隔离 | ✓ | ✓ Rule 7 | ✓ |
| 给水/排水隔离 | ✓ | ✓ Rule 5.6.8 (v36.90) | ✓ |
| 角度精确匹配 | ✓ | ✓ Rule 3 | ✓ |
| 压力 PN/MPa | ✓ | ✓ Rule 9 | ✓ |
| PE 电熔默认排除 | ✓ | ✓ Rule 11 | ✓ |
| 长度过滤 | ✓ | ✓ Rule 11 | ✓ |
| **cm = 长度非管径** | ✓（§5.6） | ✓ 已修复（v36.91） | ✓ |
| **三角阀 ≠ 角阀** | ✓（§4.1） | ✓ 已迁移（v36.91） | ✓ |
| **软管 = 无货** | ✓（§4.2） | ✓ 已迁移（v36.91） | ✓ |
| **D低价格档位** | ✓ | ✓ 已迁移（v36.91） | ✓ |
| 热熔器→焊接机别名 | ✓（§4.6） | ✗ 缺失 | ❌（低优先级，UI层） |
| PPR未注明冷热询问 | ✓（§5.3） | ✗ 无UI提示 | ❌（低优先级，UX功能） |

---

## 5. 变更记录

| 日期 | 版本 | 变更 |
|------|------|------|
| 2026-06-10 | 初版 | 全面梳理价格体系；记录 matcher.js 与 MCP 后端的差异 |
| 2026-06-10 | 同步更新 | matcher.js v36.91：D低价格档位、RUCIKA/CEILING隔离、cm修复、三角阀/软管规则 |
