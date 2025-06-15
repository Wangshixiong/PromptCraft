# OAuth 认证修复说明

本次修复解决了 Chrome 扩展中 Supabase OAuth 认证的 `net::ERR_CONNECTION_CLOSED` 错误。

## 修复内容

### 1. 修复了 OAuth 重定向 URL 配置

**修改文件**: `lib/auth-service.js`
- 将 GitHub 和 Google OAuth 登录的重定向 URL 从 `chrome.runtime.getURL('sidepanel.html')` 修改为 `chrome.identity.getRedirectURL()`
- 添加了 `handleChromeOAuthFlow` 方法，使用 `chrome.identity.launchWebAuthFlow` 处理 Chrome 扩展特有的 OAuth 流程

### 2. 添加了 OAuth 回调处理机制

**修改文件**: `background.js`
- 添加了 OAuth 回调消息监听器，处理来自认证窗口的回调数据
- 实现了回调数据转发到侧边栏的逻辑

**修改文件**: `sidepanel.js`
- 添加了 OAuth 结果消息监听器，接收来自 background.js 的认证结果
- 集成了认证结果处理和用户状态更新

**修改文件**: `lib/auth-service.js`
- 添加了 `handleOAuthCallback` 方法，处理 OAuth 回调数据并设置 Supabase 会话

### 3. 更新了配置文件

**修改文件**: `lib/auth-config.js`
- 修复了 `supabaseAnonKey` 前面的多余空格
- 确保重定向 URL 使用 `chrome.identity.getRedirectURL()`

**修改文件**: `manifest.json`
- 添加了 OAuth2 配置占位符
- 确保包含必要的权限（`identity`）

### 4. 更新了文档

**修改文件**: `SUPABASE_SETUP.md`
- 在 GitHub 和 Google OAuth 配置说明中添加了 Chrome 扩展重定向 URL
- 明确指出需要添加 `https://bcagejgjfhjnfobgjpcbmanjelcbobno.chromiumapp.org/`

**新增文件**: `OAUTH_SETUP_GUIDE.md`
- 详细的 OAuth 配置指南
- 包含 GitHub 和 Google OAuth 应用的完整配置步骤
- 提供了常见问题排查方法

### 5. 添加了测试工具

**新增文件**: `test-oauth.html`
- OAuth 认证功能测试页面
- 可以测试初始化、重定向 URL 获取、登录、用户状态等功能
- 提供了详细的错误信息和成功提示

## 使用方法

### 1. 配置 OAuth 应用

按照 `OAUTH_SETUP_GUIDE.md` 中的详细步骤配置 GitHub 和 Google OAuth 应用，确保添加正确的重定向 URL：

- Supabase 回调: `https://uwgxhtrbixsdabjvuuaj.supabase.co/auth/v1/callback`
- Chrome 扩展回调: `https://bcagejgjfhjnfobgjpcbmanjelcbobno.chromiumapp.org/`

### 2. 测试认证功能

1. 在 Chrome 中加载扩展
2. 打开 `test-oauth.html` 页面
3. 依次测试各项功能：
   - 初始化认证服务
   - 获取重定向 URL
   - GitHub/Google 登录
   - 用户状态检查
   - 登出功能

### 3. 验证修复效果

修复后，OAuth 登录应该能够：
- 正确打开认证窗口
- 成功完成认证流程
- 不再出现 `net::ERR_CONNECTION_CLOSED` 错误
- 正确设置用户会话
- 在侧边栏中显示用户信息

## 技术细节

### Chrome 扩展 OAuth 流程

1. 用户点击登录按钮
2. `auth-service.js` 调用 Supabase OAuth API 获取授权 URL
3. 使用 `chrome.identity.launchWebAuthFlow` 打开认证窗口
4. 用户完成认证后，Chrome 将重定向到扩展的回调 URL
5. `chrome.identity.launchWebAuthFlow` 捕获回调 URL 并解析令牌
6. 使用获取的令牌设置 Supabase 会话
7. 更新用户界面状态

### 重定向 URL 说明

Chrome 扩展的重定向 URL 格式为：`https://{extension-id}.chromiumapp.org/`

其中 `extension-id` 是扩展的唯一标识符。对于本扩展，ID 为 `bcagejgjfhjnfobgjpcbmanjelcbobno`。

## 注意事项

1. **扩展 ID**: 如果重新打包扩展或发布到 Chrome Web Store，扩展 ID 可能会改变，需要相应更新 OAuth 应用配置

2. **权限**: 确保 `manifest.json` 中包含 `identity` 权限

3. **HTTPS**: OAuth 重定向 URL 必须使用 HTTPS 协议

4. **测试环境**: 在开发环境中，可以使用 unpacked extension 进行测试，但扩展 ID 可能会变化

## 故障排除

如果仍然遇到问题，请检查：

1. OAuth 应用配置中的重定向 URL 是否正确
2. Supabase 项目配置是否正确
3. 浏览器控制台是否有错误信息
4. 网络连接是否正常
5. Chrome 扩展权限是否完整

更多详细信息请参考 `OAUTH_SETUP_GUIDE.md`。