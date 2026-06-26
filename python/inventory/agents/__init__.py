"""
Inventory Agent - Agents 子模块

按需导入：缺失的可选 Agent（例如已下线的 plan_agent）不应让整个库存子系统
无法导入。get_inventory_by_code 等查库存功能只依赖 TableAgent，必须始终可用。
"""

from inventory.agents.table_agent import InventoryTableAgent

__all__ = ["InventoryTableAgent"]

try:
    from inventory.agents.sql_agent import InventorySQLAgent

    __all__.append("InventorySQLAgent")
except Exception:  # pragma: no cover - optional agent
    InventorySQLAgent = None  # type: ignore[assignment]
