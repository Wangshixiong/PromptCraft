# Chrome扩展 OAuth 配置指南

本指南将帮助您正确配置 GitHub 和 Google OAuth 应用，以便在 Chrome 扩展中使用 Supabase 认证。

## 重要信息

**Chrome 扩展 ID**: `bcagejgjfhjnfobgjpcbmanjelcbobno`
**重定向 URL**: `https://bcagejgjfhjnfobgjpcbmanjelcbobno.chromiumapp.org/`

> ⚠️ **注意**: 这个重定向 URL 是由 Chrome 扩展系统自动生成的，格式为 `https://{extension-id}.chromiumapp.org/`

## 1. GitHub OAuth 应用配置

### 步骤 1: 创建 GitHub OAuth 应用

1. 访问 [GitHub Developer Settings](https://github.com/settings/developers)
2. 点击 "New OAuth App"
3. 填写应用信息：
   - **Application name**: `Prompt管理助手`
   - **Homepage URL**: `https://github.com/yourusername/your-repo`
   - **Application description**: `个人提示词管理工具`
   - **Authorization callback URL**: 添加以下两个URL：
     - `https://uwgxhtrbixsdabjvuuaj.supabase.co/auth/v1/callback` (Supabase回调)
     - `https://bcagejgjfhjnfobgjpcbmanjelcbobno.chromiumapp.org/` (Chrome扩展回调)

### 步骤 2: 获取客户端信息

1. 创建应用后，记录以下信息：
   - **Client ID**: `your_github_client_id`
   - **Client Secret**: `your_github_client_secret`

### 步骤 3: 在 Supabase 中配置 GitHub 提供商

1. 登录 [Supabase Dashboard](https://supabase.com/dashboard)
2. 选择您的项目
3. 进入 "Authentication" > "Providers"
4. 找到 "GitHub" 并点击配置
5. 填入：
   - **Client ID**: 从步骤2获取的 Client ID
   - **Client Secret**: 从步骤2获取的 Client Secret
   - **Redirect URL**: `https://uwgxhtrbixsdabjvuuaj.supabase.co/auth/v1/callback`
6. 保存配置

## 2. Google OAuth 应用配置

### 步骤 1: 创建 Google Cloud 项目

1. 访问 [Google Cloud Console](https://console.cloud.google.com/)
2. 创建新项目或选择现有项目
3. 启用 "Google+ API" 和 "Google Identity API"

### 步骤 2: 配置 OAuth 同意屏幕

1. 进入 "APIs & Services" > "OAuth consent screen"
2. 选择 "External" 用户类型
3. 填写应用信息：
   - **App name**: `Prompt管理助手`
   - **User support email**: 您的邮箱
   - **Developer contact information**: 您的邮箱
4. 添加作用域：
   - `openid`
   - `email`
   - `profile`

### 步骤 3: 创建 OAuth 客户端

1. 进入 "APIs & Services" > "Credentials"
2. 点击 "Create Credentials" > "OAuth client ID"
3. 选择 "Web application"
4. 填写信息：
   - **Name**: `Prompt管理助手 Chrome Extension`
   - **Authorized JavaScript origins**: 
     - `https://uwgxhtrbixsdabjvuuaj.supabase.co`
   - **Authorized redirect URIs**: 添加以下两个URL：
     - `https://uwgxhtrbixsdabjvuuaj.supabase.co/auth/v1/callback`
     - `https://bcagejgjfhjnfobgjpcbmanjelcbobno.chromiumapp.org/`

### 步骤 4: 获取客户端信息

1. 创建后记录：
   - **Client ID**: `your_google_client_id.apps.googleusercontent.com`
   - **Client Secret**: `your_google_client_secret`

### 步骤 5: 在 Supabase 中配置 Google 提供商

1. 在 Supabase Dashboard 中进入 "Authentication" > "Providers"
2. 找到 "Google" 并点击配置
3. 填入：
   - **Client ID**: 从步骤4获取的 Client ID
   - **Client Secret**: 从步骤4获取的 Client Secret
   - **Redirect URL**: `https://uwgxhtrbixsdabjvuuaj.supabase.co/auth/v1/callback`
4. 保存配置

## 3. 验证配置

### 测试 OAuth 流程

1. 在 Chrome 中加载扩展
2. 打开 `test-oauth.html` 页面
3. 依次测试：
   - 初始化认证服务
   - 获取重定向URL
   - GitHub 登录
   - Google 登录
   - 用户状态检查
   - 登出功能

### 常见问题排查

#### 问题 1: `net::ERR_CONNECTION_CLOSED`
**原因**: OAuth 重定向 URL 配置错误
**解决**: 确保在 GitHub/Google OAuth 应用中添加了正确的 Chrome 扩展重定向 URL

#### 问题 2: `Invalid redirect URI`
**原因**: 重定向 URL 不匹配
**解决**: 检查 OAuth 应用配置中的重定向 URL 是否与扩展 ID 匹配

#### 问题 3: `Access denied`
**原因**: OAuth 应用权限配置问题
**解决**: 检查 OAuth 同意屏幕配置和作用域设置

## 4. 安全注意事项

1. **不要在代码中硬编码客户端密钥**: 客户端密钥应该只在 Supabase 后端配置
2. **定期轮换密钥**: 建议定期更新 OAuth 应用的客户端密钥
3. **限制重定向 URL**: 只添加必要的重定向 URL，避免安全风险
4. **监控使用情况**: 定期检查 OAuth 应用的使用统计和日志

## 5. 开发环境 vs 生产环境

### 开发环境
- 使用测试用的 OAuth 应用
- 可以使用 `localhost` 重定向 URL 进行本地测试
- 扩展 ID 可能会变化（unpacked extension）

### 生产环境
- 使用正式的 OAuth 应用
- 扩展 ID 固定（发布到 Chrome Web Store 后）
- 重定向 URL 必须使用 `https://{extension-id}.chromiumapp.org/` 格式

---

配置完成后，您的 Chrome 扩展就可以正常使用 GitHub 和 Google OAuth 登录功能了。如果遇到问题，请参考上述排查指南或查看浏览器开发者工具的控制台输出。