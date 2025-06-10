# PromptCraft - 提示词管理助手

一个安全、可靠、可跨设备同步的Chrome浏览器提示词管理插件。

## 功能特性

### 🔐 安全认证
- GitHub账户一键登录
- 数据与个人身份绑定
- 行级安全策略保护

### ☁️ 云端同步
- 基于Supabase的云端存储
- 跨设备数据同步
- 实时CRUD操作

### 🚀 快速访问
- 浏览器侧边栏常驻
- 快捷键快速切换 (Ctrl+Shift+P)
- 实时搜索和分类筛选
- 一键复制提示词

### 📝 便捷管理
- 右键菜单快速添加选中文本
- 自定义分类管理
- 批量导入导出
- 新用户默认提示词库

### 🎨 优雅设计
- "数字禅意"设计风格
- 浅色/深色/自动主题
- 流畅动画和过渡效果
- 响应式界面设计

## 安装方法

### 开发者模式安装

1. 打开Chrome浏览器
2. 访问 `chrome://extensions/`
3. 开启右上角的"开发者模式"
4. 点击"加载已解压的扩展程序"
5. 选择本项目文件夹
6. 插件安装完成

### 使用方法

1. **首次使用**：点击插件图标，使用GitHub账户登录
2. **打开侧边栏**：点击插件图标或使用快捷键 `Ctrl+Shift+P`
3. **添加提示词**：
   - 点击"新增"按钮手动添加
   - 选中网页文本后右键选择"添加到PromptCraft"
4. **管理提示词**：在侧边栏中搜索、编辑、删除、分类管理
5. **使用提示词**：点击复制按钮将提示词复制到剪贴板

## 快捷键

- `Ctrl+Shift+P` (Mac: `Cmd+Shift+P`) - 切换侧边栏显示/隐藏
- `Alt+Q` - 快速添加选中文本
- `Ctrl+K` (Mac: `Cmd+K`) - 聚焦搜索框
- `Ctrl+N` (Mac: `Cmd+N`) - 新增提示词
- `Escape` - 关闭模态框

## 技术栈

- **前端**：纯JavaScript + HTML5 + CSS3
- **后端**：Supabase (PostgreSQL + Auth + RLS)
- **浏览器API**：Chrome Extension Manifest V3

## 项目结构

```
PromptCraft/
├── manifest.json          # Chrome插件配置文件
├── background.js          # 后台服务脚本
├── content.js            # 内容脚本
├── sidebar.html          # 侧边栏界面
├── css/
│   └── sidebar.css       # 样式文件
├── js/
│   ├── supabaseClient.js # Supabase客户端
│   └── sidebar.js        # 侧边栏逻辑
├── icons/                # 插件图标
│   ├── icon16.png
│   ├── icon32.png
│   ├── icon48.png
│   └── icon128.png
└── README.md             # 说明文档
```

## 开发说明

### 环境要求
- Chrome浏览器 88+
- 有效的Supabase项目配置
- GitHub账户（用于OAuth登录）

### 配置说明

#### 1. Supabase项目设置

1. **创建Supabase项目**：
   - 访问 [Supabase](https://supabase.com) 并创建新项目
   - 记录项目的 URL 和 anon key

2. **配置GitHub OAuth**：
   - 在Supabase Dashboard中，进入 `Authentication > Providers`
   - 启用GitHub provider
   - 在GitHub中创建OAuth应用：
     - 访问 GitHub Settings > Developer settings > OAuth Apps
     - 点击 "New OAuth App"
     - 填写应用信息：
       - Application name: `PromptCraft`
       - Homepage URL: `https://your-project.supabase.co`
       - Authorization callback URL: `https://your-project.supabase.co/auth/v1/callback`
   - 将GitHub OAuth应用的Client ID和Client Secret填入Supabase

3. **更新插件配置**：在 `js/supabaseClient.js` 中配置您的Supabase URL和Anon Key

#### 2. 数据库表结构
   ```sql
   CREATE TABLE prompts (
     id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
     user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
     title TEXT NOT NULL,
     content TEXT NOT NULL,
     category TEXT DEFAULT '默认分类',
     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
     updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
   );
   ```

3. **行级安全策略**：
   ```sql
   ALTER TABLE prompts ENABLE ROW LEVEL SECURITY;
   
   CREATE POLICY "Users can only access their own prompts" ON prompts
     FOR ALL USING (auth.uid() = user_id);
   ```

## 故障排除

### 常见问题

#### 1. CSP (内容安全策略) 错误
**症状**：控制台显示 "Refused to execute inline event handler" 错误

**解决方案**：
- 确保所有事件处理器都通过 `addEventListener` 绑定，而不是内联事件
- 检查HTML中是否有 `onclick`、`onload` 等内联事件属性
- 所有JavaScript代码都应在独立的 `.js` 文件中

#### 2. GitHub登录失败
**症状**：点击登录按钮后出现 "Authorization page could not be loaded" 错误

**解决方案**：
1. 检查Supabase项目中的GitHub OAuth配置
2. 确认GitHub OAuth应用的回调URL设置正确
3. 验证 `js/supabaseClient.js` 中的Supabase URL和密钥配置
4. 检查网络连接和防火墙设置

#### 3. 数据同步问题
**症状**：提示词无法保存或加载

**解决方案**：
1. 确认已正确执行 `database.sql` 脚本
2. 检查Supabase项目的RLS策略是否正确配置
3. 验证用户是否已成功登录
4. 查看浏览器开发者工具的Network面板检查API请求

#### 4. 插件权限错误
**症状**：插件功能无法正常工作

**解决方案**：
1. 检查 `manifest.json` 中的权限配置
2. 重新加载插件：在 `chrome://extensions/` 中点击刷新按钮
3. 确认Chrome浏览器版本支持Manifest V3

### 调试方法

1. **查看插件错误**：
   - 访问 `chrome://extensions/`
   - 点击插件的"详细信息"
   - 查看"错误"部分

2. **开发者工具调试**：
   - 右键点击侧边栏，选择"检查"
   - 查看Console面板的错误信息
   - 检查Network面板的网络请求状态

3. **后台脚本调试**：
   - 在 `chrome://extensions/` 中点击"service worker"
   - 查看后台脚本的控制台输出

## 版本历史

### v0.1.0 (当前版本)
- ✅ 基础CRUD功能
- ✅ GitHub OAuth认证
- ✅ 云端数据同步
- ✅ 侧边栏界面
- ✅ 搜索和分类
- ✅ 右键菜单添加
- ✅ 主题切换
- ✅ 数据导入导出

## 许可证

MIT License

## 贡献

欢迎提交Issue和Pull Request来改进这个项目！