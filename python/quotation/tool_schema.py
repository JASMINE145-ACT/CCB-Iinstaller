"""OpenAI-style quotation tool schema metadata and function declarations."""
from __future__ import annotations


def get_quote_tools_openai_format() -> list[dict]:
    """OpenAI function calling 格式：报价 Agent 工具。仅暴露 parse_excel_smart 做 Excel 解析，不再暴露 extract_quotation_data。"""
    return [
        {
            "type": "function",
            "function": {
                "name": "fill_quotation_sheet",
                "description": "【报价单导向】将数据写入报价单 Excel 指定行。Path C（查价后出单，默认）：fill_items + require_exact_codes=true，不传 file_path（服务端用内置 VANTSING 空白模板）。Path A：用户给了磁盘上已含询价行的 Excel 时传 file_path。用户已确认选型后禁止 keywords/file 自动重匹配。output_path 省略或为相对路径时 runtime 须注入 workspace_path。fill_items 每项含 row、code、quote_name、unit_price、qty、inquiry_name、specification，及可选 indonesian_name、satuan、brand、supplier。",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "file_path": {
                            "type": "string",
                            "description": "Path A only：磁盘上已存在的询价 Excel 绝对路径。Path C 禁止传占位路径（blank、Wanding-Quotation_*.xlsx 等）。",
                        },
                        "fill_items": {
                            "type": "array",
                            "items": {
                                "type": "object",
                                "properties": {
                                    "row": {"type": "integer", "description": "Excel 行号 1-based"},
                                    "code": {"type": "string", "description": "产品编码。确认态/锁定态必填；也可用 product_code 传入。"},
                                    "product_code": {"type": "string", "description": "产品编码别名。确认态/锁定态必填 code 或 product_code。"},
                                    "quote_name": {"type": "string"},
                                    "unit_price": {"type": "number"},
                                    "qty": {"type": "integer"},
                                    "inquiry_name": {
                                        "type": "string",
                                        "description": "询价名称（Nama Permintaan / B 列）：本会话 match 时用的用户原话 keywords，如「直接50」；与 quote_name 分列，禁止用报价全名代替",
                                    },
                                    "specification": {"type": "string"},
                                    "indonesian_name": {"type": "string", "description": "印尼名称（Nama Indonesia）：通常直接取 match_quotation 返回的 description_english 原文"},
                                    "satuan": {"type": "string", "description": "单位（Satuan）：如 根、pcs、set、m，从 matched_name 或 description_english 中提取"},
                                    "brand": {"type": "string", "description": "品牌（Brand/Merk）：如 LESSO、VINILON，从 description_english 末尾 ' - ' 后面的词提取"},
                                    "supplier": {"type": "string", "description": "供应商备注，写入 VANTSING O 列 Catatan"},
                                },
                                "required": ["row"],
                            },
                            "description": "Path C 要回填的项列表",
                        },
                        "items": {
                            "type": "array",
                            "description": "Path B 冷启动：[{keywords, quantity}]",
                            "items": {
                                "type": "object",
                                "properties": {
                                    "keywords": {"type": "string"},
                                    "quantity": {"type": "integer"},
                                },
                            },
                        },
                        "require_exact_codes": {"type": "boolean", "description": "确认态/锁定态设为 true；要求每行有 code/product_code，并禁止 keywords 自动重匹配。"},
                        "locked_lines": {"type": "boolean", "description": "require_exact_codes 的别名；用户确认选型后可设为 true。"},
                        "workspace_path": {"type": "string", "description": "AionUI 项目临时空间路径；output_path 省略或相对路径时必需。"},
                        "workspace_kind": {"type": "string", "description": "workspace 类型，项目临时空间为 aionui_project_temp。"},
                        "output_path": {"type": "string", "description": "可选，输出路径，默认覆盖原文件"},
                        "sheet_name": {"type": "string", "description": "工作表名，不传用第一个"},
                        "quotation_date": {"type": "string", "description": "报价日期，如 2026/03/11，不传用当天"},
                        "delivery_date": {"type": "string", "description": "交货日期（每行同一值），如 2026/03/20，不传用当天"},
                    },
                },
                "x_tool_meta": {"access_mode": "write", "risk_level": "medium", "deferred": True},
            },
        },
        {
            "type": "function",
            "function": {
                "name": "parse_excel_smart",
                "description": "【普适性，推荐】解析任意 Excel：按行读取全表（默认最多 500 行），返回完整 Markdown 表。提取/查看报价单或 Excel 数据时优先使用此工具，可拿到全表行数，不受「Total」行位置影响。",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "file_path": {"type": "string", "description": "Excel 文件完整路径（可从 context.file_path 获取）"},
                        "sheet_name": {"type": "string", "description": "工作表名称，不传则使用第一个工作表"},
                        "max_rows": {"type": "integer", "description": "最多读取行数，默认 500", "default": 500},
                    },
                    "required": ["file_path"],
                },
                "x_tool_meta": {"access_mode": "read", "risk_level": "low", "deferred": True},
            },
        },
        {
            "type": "function",
            "function": {
                "name": "edit_excel",
                "description": "【普适性】编辑任意 Excel：按单元格或区域写入，不依赖报价单列结构。edits 每项：{\"cell\": \"A1\", \"value\": 任意} 单格写入，或 {\"range\": \"A1:B2\", \"values\": [[v1,v2],[v3,v4]]} 区域按行写入。可写多格后保存到 output_path 或覆盖原文件。",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "file_path": {"type": "string", "description": "要编辑的 Excel 路径"},
                        "edits": {
                            "type": "array",
                            "items": {
                                "type": "object",
                                "properties": {
                                    "cell": {"type": "string", "description": "单格引用，如 A1"},
                                    "value": {"description": "写入的值（字符串或数字）"},
                                    "range": {"type": "string", "description": "区域引用，如 A1:B2"},
                                    "values": {
                                        "type": "array",
                                        "items": {
                                            "type": "array",
                                            "items": {
                                                "oneOf": [
                                                    {"type": "string"},
                                                    {"type": "number"},
                                                    {"type": "boolean"},
                                                    {"type": "null"},
                                                ],
                                            },
                                        },
                                        "description": "二维数组，按行写入，每个单元格为字符串/数字/布尔或 null",
                                    },
                                },
                            },
                            "description": "编辑操作列表：单格用 cell+value，区域用 range+values",
                        },
                        "sheet_name": {"type": "string", "description": "工作表名，不传用第一个"},
                        "output_path": {"type": "string", "description": "保存路径，不传则覆盖原文件"},
                    },
                    "required": ["file_path", "edits"],
                },
                "x_tool_meta": {"access_mode": "write", "risk_level": "medium", "deferred": True},
            },
        },
    ]
