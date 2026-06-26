# price_library 清洗与兼容规则

本文档是 `price_library_cleaned_2026_05_15.xlsx` 的数据契约。Agent、导入脚本、Neon 表结构都应按这里的规则理解字段。

## 输出文件

- 标准价格库：`data/price_library_cleaned_2026_05_15.xlsx`
- 标准价格库 CSV：`data/price_library_cleaned_2026_05_15.csv`
- 原始行备份 CSV：`data/price_library_raw_rows_2026_05_15.csv`
- 清洗脚本：`python/tools/clean_wanding_price_library.py`

`price_library` 用于查询和入库。`raw_rows` 保存每个来源工作簿的非空原始行，`raw_json` 保存原始单元格值，保证可回溯。

## 主流字段

所有来源尽量兼容到这些字段：

- `material`：产品编码。来自 SAP/Material/编号/Product code。
- `description`：主查询名称。优先中文产品名称；RUCIKA 会把名称和规格合并，便于检索。
- `description_cn`：中文辅助名称。中文来源等于中文名称；RUCIKA 由规则翻译生成。
- `description_english`：英文/印尼文描述。
- `product_type`：产品类型、sheet 类型或业务分类。
- `is_preferred_price`：默认查询是否使用该行价格。`TRUE` 表示主价格；`FALSE` 表示保留历史/对比但默认查询不用。
- `superseded_by_source`：当 `is_preferred_price = FALSE` 时，说明被哪个来源替代。
- `factory_inc_tax`：出厂价含税。
- `factory_exc_tax`：出厂价不含税。
- `purchase_exc_tax`：采购不含税。没有独立采购价时，按该来源最接近的出厂不含税价兼容。
- `profit_a` / `price_a`：A 档利润率/报价。
- `profit_b` / `price_b`：B 档或默认查询报价。
- `profit_c` / `price_c`：C 档利润率/报价。
- `profit_d` / `price_d`：D 档或第二组报价。
- `profit_d_low` / `price_d_low`：D 低利润率/报价。
- `profit_e` / `price_e`：E 档或大唐报价。

## 价格口径与原始字段映射

Agent、MCP 和代码都应把用户口头说法、原表字段名统一到下列标准字段。用户只说原表字段时，也必须能定位到正确报价档位。

| 用户说法 / 原表字段 | `customer_level` | 标准价格字段 | 标准利润字段 | 适用来源 |
|------|------|------|------|------|
| `INCLUDE TAX 出厂价_含税`、`出厂价含税`、`含税出厂价` | `出厂价_含税` | `factory_inc_tax` | - | LESSO管材、LESSO GREY PIPE、国标管件、RUCIKA |
| `EXCLUDE TAX 出厂价_不含税`、`出厂价不含税`、`不含税出厂价` | `出厂价_不含税` | `factory_exc_tax` | - | LESSO管材、LESSO GREY PIPE、国标管件、RUCIKA |
| `PURCHASE PRICE`、`采购价`、`采购不含税` | `采购不含税` | `purchase_exc_tax` | - | CEILING；其他来源用最接近采购口径兼容 |
| `（二级代理）A级别`、`A档`、`A价格` | `A` | `price_a` | `profit_a` | LESSO管材 |
| `（一级代理）B级别`、`B档`、`默认价格` | `B` | `price_b` | `profit_b` | LESSO管材、RUCIKA；也是默认查询档 |
| `GENERAL PRICE`、`其他客户价`、`其他` | `B` | `price_b` | `profit_b` | CEILING 的 `GENERAL PRICE`；国标管件的 `其他` |
| `（聚万大客户）C级别`、`聚万`、`C档` | `C` | `price_c` | `profit_c` | LESSO管材 |
| `（青山大客户）D级别`、`青山`、`青山价格`、`D档` | `D` | `price_d` | `profit_d` | LESSO管材、RUCIKA |
| `MR KONG PRICE 孔总`、`孔总价格` | `D` | `price_d` | - | CEILING |
| `（青山大客户）D级别` 降低利润率、`D低`、`D_low` | `D_low` | `price_d_low` | `profit_d_low` | LESSO管材 |
| `（大唐大客户）E级别（包运费）`、`大唐`、`大唐价格`、`E档` | `E` | `price_e` | `profit_e` | LESSO管材、国标管件 |
| `LOCAL`、`LOCAL EXC TAX`、`LOCAL不含税`、`本地价` | `LOCAL` / `LOCAL_EXC_TAX` | `local_exc_tax` | `local_profit` | LESSO管材 |
| `LOCAL INC TAX`、`LOCAL含税`、`本地含税价` | `LOCAL_INC_TAX` | `local_inc_tax` | `local_profit` | LESSO管材 |
| `Pricelist Baru (5%) / Exc Vat 11%` | `RUCIKA_PRICELIST_EXC` / `RUCIKA目录价不含税` | `rucika_pricelist_exc_vat11` | - | RUCIKA |
| `Pricelist Baru (5%) / Inc Vat 11%` | `RUCIKA_PRICELIST_INC` / `RUCIKA目录价含税` | `rucika_pricelist_inc_vat11` | - | RUCIKA |
| RUCIKA 第一组报单价格 | `RUCIKA_QUOTE_1` | `rucika_quote_price_1` | `rucika_quote_profit_1` | RUCIKA |
| RUCIKA 第二组报单价格 | `RUCIKA_QUOTE_2` | `rucika_quote_price_2` | `rucika_quote_profit_2` | RUCIKA |
| `20260415出厂价/条/IDR` | `B` 或 `PE_FACTORY` | `price_b` / `pe_factory_price` | - | PE PIPA，三者同价兼容 |
| PE 面价 / `印尼盾/条（面价）` | `PE_NOMINAL` | `pe_nominal_price` | - | PE PIPA |

注意：

- `customer_level` 控制最终返回 `unit_price` 的优先价格字段；产品匹配文本不要混入“青山价格”“大唐价格”等价格口径词。
- 若某来源没有对应档位字段，代码按 `_fallback_price_fields_for_level()` 的档位专属链 fallback：**LOCAL 仅在 `local_exc_tax` ↔ `local_inc_tax` 间切换，不回退 B**；RUCIKA/PE 有专属链后再回 B 或出厂/采购；A–E 与出厂/采购仍走 `price_b` → 出厂 → 采购 通用链。

## 来源映射

### LESSO管材

- `material` = `Material`
- `description` = `Describrition`
- `description_english` = `Describrition_English`
- `product_type` = 根据描述推断，日标/国标/LESSO管材
- `factory_inc_tax` = `INCLUDE TAX 出厂价_含税`
- `factory_exc_tax` = `EXCLUDE TAX 出厂价_不含税`
- `purchase_exc_tax` = `EXCLUDE TAX 出厂价_不含税`
- A/B/C/D/D低/E 档利润率和报单价格分别映射到标准档位字段
- 新增字段：
  - `local_profit` = `LOCAL %`
  - `local_exc_tax` = `LOCAL EXC TAX`
  - `local_inc_tax` = `LOCAL INC TAX`

### LESSO GREY PIPE

- `material` = `产品SAP编码`
- `description` = `产品中文名称`
- `description_english` = `PRODUCT NAME 产品名称`
- `product_type` = `LESSO灰管`
- `factory_inc_tax` = `INCLUDE TAX 出厂价_含税`
- `factory_exc_tax` = `EXCLUDE TAX 出厂价_不含税`
- `purchase_exc_tax` = `EXCLUDE TAX 出厂价_不含税`
- `price_b` = `INCLUDE TAX 出厂价_含税`，作为默认查询价

### 国标管件 1

- `material` = `编号`
- `description` = `China`
- `description_english` = `English`
- `product_type` = `国标管件`
- `factory_inc_tax` = `INCLUDE TAX 出厂价_含税`
- `factory_exc_tax` = `EXCLUDE TAX 出厂价_不含税`
- `purchase_exc_tax` = `EXCLUDE TAX 出厂价_不含税`
- `profit_b` / `price_b` = `其他` 利润率/报单价格
- `profit_e` / `price_e` = `大唐` 利润率/报单价格

### 产品信息 (CEILING)

- `material` = `Product code 产品编码`
- `description` = `Pruduct name 货物名称 + Size 规格型号`
- `description_english` = `Name in the Indonesian market`
- `product_type` = `CEILING + Category 产品系列`
- `purchase_exc_tax` = `PURCHASE PRICE`
- `price_d` = `MR KONG PRICE 孔总`
- `profit_b` / `price_b` = `利润率` / `GENERAL PRICE`
- `unit` = `Unit 单位`
- `volume` = `Volume`

### RUCIKA

- `material` = `PRODUCT CODE 产品编码`
- `description` = `PRODUCT NAME 产品名称 + SIZE 规格`
- `description_cn` = 规则翻译后的中文辅助名称，并保留原文括号
- `description_english` = `PRODUCT NAME 产品名称 + SIZE 规格`
- `product_type` = RUCIKA 分组行，例如 `RUCIKA STANDARD`
- `rucika_pricelist_exc_vat11` = `Pricelist Baru (5%) / Exc Vat 11%`
- `rucika_pricelist_inc_vat11` = `Pricelist Baru (5%) / Inc Vat 11%`
- `rucika_discount` = `DISCOUNT 目录折扣`
- `factory_exc_tax` = `EXCLUDE TAX 出厂价_不含税`
- `factory_inc_tax` = `INCLUDE TAX 出厂价_含税`
- `purchase_exc_tax` = `EXCLUDE TAX 出厂价_不含税`
- `profit_b` / `price_b` = 第一组 `利润率` / `报单价格`
- `profit_d` / `price_d` = 第二组 `利润率` / `报单价格`
- 同时保留：
  - `rucika_quote_profit_1`
  - `rucika_quote_price_1`
  - `rucika_quote_profit_2`
  - `rucika_quote_price_2`

RUCIKA 中文翻译是辅助字段，不覆盖原始英文/印尼文。没有精确规则时，以 `RUCIKA产品` 兜底，确保 Agent 可识别。

### PE PIPA

来源：`data/【2026.4.13更新】PE给水管价格维护PE PIPA.xlsx`

- `material` = `MATNR/SAP`
- `description` = `MAKTX_IDNH/产品名称`
- `description_cn` = `MAKTX_IDNH/产品名称`
- `description_english` = `Deskripsi Material`
- `product_type` = `Gudang`
- `factory_exc_tax` = `20260415出厂价/条/IDR`
- `purchase_exc_tax` = `20260415出厂价/条/IDR`
- `price_b` = `20260415出厂价/条/IDR`
- 新增字段：
  - `pe_nominal_price` = `印尼盾/条（面价）20250601`
  - `pe_discount` = `维护折扣 Diskon`
  - `pe_factory_price` = `20260415出厂价/条/IDR`

## 重复编码优先规则

PE PIPA 与 05.15 综合价格库的 `LESSO管材` 有 752 个重合编码，且价格口径不同。不得去重删除，也不得直接覆盖原始行。

优先规则：

- 重合编码优先使用 PE PIPA 里的价格。
- PE PIPA 重合行：`is_preferred_price = TRUE`，`superseded_by_source = ''`
- 被 PE PIPA 替代的综合表行：
  - `is_preferred_price = FALSE`
  - `superseded_by_source = 'PE PIPA'`
- 非重合正常行：`is_preferred_price = TRUE`

入 Neon 后，业务默认查询必须使用 `is_preferred_price = TRUE`。如需历史/对比查询，可不加该条件并展示 `superseded_by_source`。

## 代码兼容规则

默认数据源改为：

`data/price_library_cleaned_2026_05_15.xlsx`

旧库保留为 fallback：

`data/wanding_price_lib.xlsx`

匹配器读取新版 `price_library` sheet 时，会适配到旧代码需要的列：

- `Material` = `material`
- `Describrition` = `description_cn` 优先，否则 `description`
- `Describrition_English` = `description_english`
- `Product_Type` = `product_type`
- `unit_price` = 按 `customer_level` 走档位专属 fallback 链（见上文）；A–E 默认链为 `price_*` → `price_b` → 出厂/采购；LOCAL 仅 local 列互备

匹配文本包含：

- `description`
- `description_cn`
- `description_english`
- `product_type`

默认只加载 `is_preferred_price = TRUE` 的行，因此 PE PIPA 与综合表重合时会自动使用 PE PIPA。

## 入库建议

不要把 `material` 单独设为唯一键。推荐唯一键：

`source_file + source_sheet + source_row`

查询索引建议：

- `material`
- `description`
- `description_cn`
- `description_english`
- `product_type`
- `is_preferred_price`

`raw_json` 建议用 `jsonb` 保存。

## 最新校验结果

- `price_library`：3867 行
- `raw_rows`：6922 行
- PE PIPA 重合编码：752 个
- PE PIPA preferred 异常：0
- 被 PE 替代的综合表行：752 行
- RUCIKA 行数：694
- RUCIKA `description_cn` 非空：694
- RUCIKA `description_cn` 含中文：694
- DB 必需字段空值行：0
- 数字字段类型异常：0
## 2026-06-08 compatibility notes

- `source_sheet` for the PE workbook is normalized to `PE PIPA` in `price_library`; `raw_rows` still preserves the original workbook sheet rows.
- Default matching uses only `is_preferred_price = TRUE`; PE duplicate codes supersede the old LESSO rows through `superseded_by_source = 'PE PIPA'`.
- Pressure expressions are normalized for matching:
  - `1.6MPa` is treated as pressure `1.6`.
  - `PN16` is treated as pressure `1.6`.
  - Pressure-derived tokens such as `1.6` and `16` are not treated as ordinary diameter/size requirements.
- CEILING-specific English queries such as `Main hollow`, `Stelldrat`, `Steel drat`, `SOLDAYS`, `Dynabolt`, or `ceiling` are constrained to CEILING products and further split by sub-category (main hollow / stelldrat / dynabolt / mur / panel / hook) so they do not compete with unrelated PVC electrical products that share sizes like `H38`.
- RUCIKA brand queries containing `RUCIKA` are constrained to `product_type` rows whose type includes `RUCIKA` (STANDARD/JIS). Non-RUCIKA queries exclude those brand rows so LESSO AW pipes are not confused with RUCIKA STANDARD AW pipes that share `AW` and inch sizes.
- Material-code shaped inputs (for example `8010036428` or `CP-UPMH-001`) short-circuit to exact code lookup before fuzzy matching.
- Full price/profit lookup cache is path-scoped, so the new `price_library_cleaned_2026_05_15.xlsx` and legacy `wanding_price_lib.xlsx` can be queried in the same process without cache contamination.
