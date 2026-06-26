╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌
 CCB-Wanding 业务记忆架构

 Context

 CCB-Wanding 目前的"记忆"只有两种形式：
 1. CLAUDE.md —— 静态规则，安装时写死，AI 不会更新
 2. wanding_business_knowledge.md —— 静态业务知识库，同上

 没有跨会话的动态记忆。每次对话 Claude
 不记得：上次用户纠正了什么、某个客户有什么偏好、哪个型号有什么坑。

 目标：建立结构化的动态记忆层，支持 AI 自动写入 +
 员工手动录入，两者共用同一套文件，无需同步机制。

 ---
 目录结构设计

 安装时在用户配置目录下创建：

 %LOCALAPPDATA%\CCB-Wanding\.claude\memory\
 ├── MEMORY.md              ← 分区索引（始终注入）
 ├── personal\              ← 个人设定（仅当前用户）
 │   ├── profile.md         ← 姓名、角色、工作习惯、偏好
 │   └── workflow.md        ← 常用流程偏好（报价顺序、格式等）
 └── business\              ← 业务知识（可团队共享）
     ├── customers.md       ← 客户档案：偏好、历史、特殊要求
     ├── products.md        ← 产品型号特殊知识、纠正记录
     └── pricing.md         ← 报价规则、折扣、审批阈值

 员工可自行在 memory\ 下新建子文件夹（如 suppliers\、projects\），并在 MEMORY.md    
 中追加对应区块。

 ---
 MEMORY.md 分区格式

 ## personal/
 - [profile](personal/profile.md) — 用户基本信息、角色、工作偏好
 - [workflow](personal/workflow.md) — 报价/查库习惯、常用格式偏好

 ## business/
 - [customers](business/customers.md) — 客户历史偏好、付款方式、特殊要求
 - [products](business/products.md) — 型号纠正记录、规格特殊知识
 - [pricing](business/pricing.md) — 折扣规则、审批阈值、特殊定价记忆

 ---
 AI 自动写入规则（加入 CLAUDE.md）

 在 ensure-wanding-settings.ps1 生成的 CLAUDE.md 中追加以下规则块：

 <!-- CCB-MEMORY-RULES:START -->
 ## 记忆管理

 ### 会话开始
 每次会话开始时，主动 Read `memory\personal\profile.md`（体积小，始终相关）。       
 其他文件按对话内容按需 Read。

 ### 自动写入触发条件
 以下情况发生时，主动写入对应文件，不需要用户提示：
 | 触发 | 写入目标 |
 |------|---------|
 | 用户纠正了选型或报价结果 | business\products.md |
 | 用户提到某客户的特殊偏好/要求 | business\customers.md |
 | 用户说明了某项折扣或审批规则 | business\pricing.md |
 | 用户表达了工作流偏好（如"我习惯先查库存"）| personal\workflow.md |

 ### 写入规范
 1. 先 Read 目标文件，检查是否已有相同条目，避免重复
 2. 追加到文件末尾，不覆盖已有内容
 3. 格式：`- [YYYY-MM-DD] 简洁描述（一行以内）`
 4. 写入后同步更新 MEMORY.md 对应条目的 description（保持简短）
 5. 不确定放哪个文件时，放 business\products.md 或询问用户

 ### 手动录入
 用户可直接编辑任意 memory\ 下的 .md 文件。
 使用 /记住 命令可引导结构化录入。
 <!-- CCB-MEMORY-RULES:END -->

 ---
 /记住 斜杠命令

 新增 resources\commands\记住.md：

 ---
 description: 把当前对话中的知识保存到对应记忆文件
 ---

 请用户确认要记住的内容，然后：
 1. 判断分类：personal（个人偏好/习惯）还是 business（业务知识）
 2. business 中再判断：customers / products / pricing / 其他
 3. Read 目标文件，检查是否重复
 4. 追加写入，格式：`- [今日日期] 内容`
 5. 更新 MEMORY.md 索引
 6. 告知用户已保存到哪个文件

 ---
 实现步骤

 1. scripts\ensure-wanding-settings.ps1（主要改动）

 - 安装时创建 memory 目录结构
 - 写入初始模板文件（personal\profile.md 含引导注释，business\ 各文件含格式示例）   
 - 在生成的 CLAUDE.md 末尾追加 <!-- CCB-MEMORY-RULES --> 块
 - 升级保护：已存在的 memory 文件不覆盖（与现有 settings.json 保护逻辑一致）        

 2. resources\commands\记住.md（新增文件）

 手动录入入口，见上方内容。

 3. installer-wanding.nsi（小改动）

 在 commands 安装段落加上 记住.md。

 4. resources\memory\（新增，作为模板）

 安装时复制到用户 .claude\memory\：
 - MEMORY.md — 初始分区索引
 - personal\profile.md — 含引导注释（"请在此填写您的姓名、角色..."）
 - personal\workflow.md — 空文件 + 格式示例
 - business\customers.md — 空文件 + 格式示例
 - business\products.md — 空文件 + 格式示例
 - business\pricing.md — 空文件 + 格式示例

 ---
 关键文件

 ┌─────────────────────────────────────┬────────────────────────────────────────┐   
 │                文件                 │                改动类型                │   
 ├─────────────────────────────────────┼────────────────────────────────────────┤   
 │ scripts\ensure-wanding-settings.ps1 │ 修改：创建 memory 目录 + 追加          │   
 │                                     │ CLAUDE.md 规则                         │   
 ├─────────────────────────────────────┼────────────────────────────────────────┤   
 │ resources\commands\记住.md          │ 新增                                   │   
 ├─────────────────────────────────────┼────────────────────────────────────────┤   
 │ installer-wanding.nsi               │ 小改：安装 记住.md                     │   
 ├─────────────────────────────────────┼────────────────────────────────────────┤   
 │ resources\memory\*                  │ 新增：模板文件目录                     │   
 └─────────────────────────────────────┴────────────────────────────────────────┘   


 ---
 验证方式

 1. 运行安装包 → 确认 %LOCALAPPDATA%\CCB-Wanding\.claude\memory\ 目录结构已创建       
 2. 启动 CCB-Wanding → 确认 profile.md 在 session start 被 Read
 3. 进行报价对话，故意输入需要纠正的型号 → 确认 Claude 自动写入 business\products.md  
 4. 使用 /记住 命令手动添加一条客户偏好 → 确认写入 business\customers.md 并更新索引   
 5. 重启会话 → 确认前次自动写入的内容被召回并影响本次回答
╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌