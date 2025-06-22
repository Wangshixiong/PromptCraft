角色: 你是一位资深的Chrome扩展架构师，负责完成项目的最终重构和清理工作。

核心任务: 这是我们增量式重构的最后一步。你需要将SyncService的初始化和管理工作，从sidepanel.js彻底迁移到background.js中，并完成对dataService依赖的最终清理。

上下文与需求 (Context & Requirements):

【核心约束】 严格遵循“不影响现有功能、不修改核心服务逻辑”的原则。
【background.js的修改】:
在background.js的顶部，新增对SyncService的导入。
在background.js中，继创建authService和dataService实例之后，立即创建SyncService的唯一单例实例，并将前两个服务作为依赖注入进去。
调用 syncService.initialize() 来启动服务。
【sidepanel.js的修改】:
删除：彻底删除sidepanel.js中所有与SyncService初始化相关的代码，包括initializeSyncService函数和对它的任何调用。
删除：彻底删除sidepanel.js文件顶部的import { dataService } from './utils/data-service.js';这一行代码。