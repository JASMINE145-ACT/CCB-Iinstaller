# Context — 第三方供应商备注

## 业务原话

> 有的客户要的产品是供应商里面的，那就在备注上加上供应商的名字

## 样例数据（采购订单明细）

```
供应商                          | 产品编码    | 产品名称（英）              | 中文规格
HENG XIN INTERNATIONAL INDONESIA | 8010012697 | PVC Water Pipe ... LESSO | PVC给水管 ...
HENG XIN INTERNATIONAL INDONESIA | 102715     | Lampu Darurat ...        | 应急灯 ...
```

同一供应商下既有 LESSO 管材也有非管材——备注写的是 **采购供应商**，不是品牌。

## 与价格库关系

`8010012697` 在 `price_library`：

- `source_sheet` = LESSO管材
- **无** supplier 字段

故供应商映射 **独立表**，不能从价库推导。

## 第三方判定（v1 简化）

**映射表里有的 = 需要写备注的第三方供应商。**

不入表的编码（典型联塑直采、无第三方）→ lookup miss → O 列留空。

无需在表里加 `is_third_party` 布尔列，靠 **表的范围** 表达业务规则。

## 技术触点

| 层 | 文件 | 改动类型 |
|----|------|----------|
| Layout | `python/quotation/layout.py` | `remark_col` |
| Fill | `python/quotation/quote_tools.py` | 写 O 列 |
| Enrich | `python/quotation/fill_enrich.py` | 可选：合并 remark |
| 新模块 | `python/quotation/supplier_mapping.py` | 查表 |
| 数据 | `data/supplier_product_mapping.xlsx` | 新建 seed |
| Agent | `quotation-agent.md` | SOP 一句 |
| 部署 | `sync-dev-wanding-vendor.ps1` | 同步 xlsx |
