# 技术栈

## 核心技术
- **前端**: 原生JavaScript (ES6+)，无框架
- **扩展标准**: Chrome Manifest V3
- **存储**: Chrome Storage API (本地) + Supabase (云端同步)
- **认证**: 通过Chrome Identity API使用Google OAuth 2.0
- **样式**: 纯CSS3，使用CSS变量实现主题切换
- **图标**: Font Awesome 6.4.0 (CDN)

## 架构模式
- **面向服务**: 模块化服务 (DataService, AuthService, SyncService)
- **消息驱动**: Chrome运行时消息用于后台/内容脚本通信
- **事件驱动**: DOM事件和Chrome API事件监听器
- **单例模式**: 核心服务的单一实例
- **观察者模式**: 存储变更监听器和UI更新

## 关键库
- **Supabase**: 云端后台 (认证 + PostgreSQL)
- **UUID**: 生成唯一ID的自定义工具
- **无构建工具**: 直接文件加载，无打包

## 开发命令
由于这是一个无构建过程的Chrome扩展：

```bash
# 开发环境设置
# 1. 在Chrome开发者模式下加载扩展
# 2. 指向项目根目录
# 3. 修改后重新加载扩展

# 无npm脚本 - 扩展直接加载文件
# manifest.json定义入口点和权限
```

## 文件加载策略
- **后台脚本**: Service Worker通过importScripts()加载
- **内容脚本**: 注入到网页中
- **侧边面板**: 直接加载HTML + JS
- **资源文件**: 通过chrome.runtime.getURL()提供静态文件

## 代码风格约定
- **Async/await**: 优先使用，而非Promise
- **错误处理**: 使用try-catch块，详细日志记录
- **命名**: 变量使用camelCase，类使用PascalCase
- **注释**: 函数使用JSDoc风格，复杂逻辑使用行内注释
- **模块**: 支持时使用ES6模块，否则使用全局作用域

## 存储架构
- **本地优先**: Chrome Storage API作为主要存储
- **云端备份**: Supabase用于跨设备同步
- **冲突解决**: 基于时间戳的最后写入获胜策略
- **数据验证**: 导入导出时进行JSON模式验证