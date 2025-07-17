# 项目结构

## 根目录
- `manifest.json` - Chrome扩展配置文件 (Manifest V3)
- `package.json` - 项目元数据 (无依赖，占位脚本)
- `readme.md` - 完整的项目文档

## 源代码 (`src/`)
```
src/
├── background.js           # Service Worker (主后台脚本)
├── content_script.js       # 注入到网页中用于"pp"命令
├── background/             # 后台脚本模块
│   └── auth-handler.js     # 认证状态管理
├── utils/                  # 共享工具模块
│   ├── data-service.js     # 主要数据访问层
│   ├── auth-service.js     # 认证服务
│   ├── sync-service.js     # 云端同步
│   ├── json-utils.js       # JSON验证工具
│   └── uuid.js             # UUID生成
├── libs/                   # 第三方库
│   └── supabase.min.js     # Supabase客户端 (本地副本)
└── sidepanel/              # 侧边面板UI
    ├── sidepanel.html      # 主UI结构
    ├── sidepanel.js        # 应用程序入口点
    ├── appController.js    # 业务逻辑控制器
    ├── uiManager.js        # DOM操作层
    ├── tagComponentManager.js # 标签输入组件
    ├── components/         # UI组件 (未使用的Svelte)
    │   └── SmartTagInput.svelte
    └── css/                # 样式表
        ├── base.css        # CSS变量和基础样式
        ├── components.css  # 组件特定样式
        ├── layout.css      # 布局和响应式设计
        └── main.css        # 主样式表聚合器
```

## 资源文件 (`assets/`)
```
assets/
├── data/
│   └── default-prompts.json  # 默认提示词模板
└── icons/                    # 扩展图标
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

## 本地化 (`_locales/`)
```
_locales/
├── en/
│   └── messages.json      # 英文翻译
└── zh_CN/
    └── messages.json      # 中文翻译 (主要)
```

## 架构层次

### 数据层
- `data-service.js` - 统一数据访问接口
- Chrome Storage API - 主要存储
- Supabase - 云端备份存储

### 服务层
- `auth-service.js` - 认证管理
- `sync-service.js` - 云端同步逻辑
- 后台服务通过Chrome消息传递进行通信

### UI层
- `appController.js` - 业务逻辑和状态管理
- `uiManager.js` - DOM操作和渲染
- `tagComponentManager.js` - 专门的标签输入处理

### 集成层
- `background.js` - Chrome扩展生命周期管理
- `content_script.js` - 网页集成用于快速调用
- Chrome运行时消息用于跨上下文通信

## 文件命名约定
- **kebab-case**: 文件名 (auth-service.js)
- **camelCase**: JavaScript变量和函数
- **PascalCase**: JavaScript类和构造函数
- **UPPER_CASE**: 常量和配置键

## 导入策略
- **后台脚本**: 使用 `importScripts()` 加载模块
- **内容脚本**: 自包含，内联依赖
- **侧边面板**: HTML中直接使用 `<script>` 标签
- **无打包**: 文件直接由Chrome扩展系统加载