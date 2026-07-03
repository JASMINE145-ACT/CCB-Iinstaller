# Open questions — ADR backlog（设计文档 §20）

实施前需决议；未决时可 defer 但须在 `status.md` 标注。

| # | Question | Options / notes | Status |
|---|----------|-----------------|--------|
| 1 | 平台产品名：CCB-Wanding vs 平台品牌 + WanD 包 | 影响安装器、文档、HR/客户沟通 | open |
| 2 | Phase A：每家公司独立部署控制面？ | 文档倾向「是」 | open |
| 3 | 包格式：目录 / zip / OCI artifact | 影响 P1 schema + P3 打包 | open |
| 4 | 包签名与发布者信任链 | 影响 P4 分发 | open |
| 5 | Office / Research：平台内建 vs capability package | 影响 P3 边界 | open |
| 6 | 远端 MCP Gateway：独立服务 vs org 模块 | 影响 P4 connector | open |
| 7 | UI contribution：schema only vs 代码插件 | 文档倾向先 schema | open |
| 8 | 租户业务数据卸载保留/销毁政策 | 合规 | open |
| 9 | 本地离线缓存策略 | 包策略声明 | open |
| 10 | 第二家公司验收样本业务域 | P5 选型 | open |
