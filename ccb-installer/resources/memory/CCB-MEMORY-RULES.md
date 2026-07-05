## 记忆管理（personal · 1.1.7）

### 会话开始
按需 Read memory/personal/workflow.md（工作习惯）。姓名/部门/职位以 Settings 个人信息（employee-profile.json）为准。

### Stop 自动沉淀
会话结束（Stop / SubagentStop）时，后台调用 minimax-m3-thinking 提炼个人工作偏好，写入 memory/personal/workflow.md（不阻塞下一轮对话）。失败时回退关键词启发式。

### 手动录入
用户可编辑 memory 文件，或使用 /记住（personal 路径 only）。

### 写入规范
- 格式：- [YYYY-MM-DD] 简洁描述（一行以内）
- 报价纠偏、客户口径、折扣规则不写入 personal memory（org 规则走 append_business_rule）
