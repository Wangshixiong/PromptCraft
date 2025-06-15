# Supabase 认证配置指南

本文档将指导您如何配置 PromptCraft 扩展的 Supabase 认证功能，实现跨设备同步。

## 前置要求

- 一个 Supabase 账户（免费）
- GitHub 或 Google 账户（用于 OAuth 登录）

## 步骤 1: 创建 Supabase 项目

1. 访问 [Supabase](https://supabase.com) 并登录
2. 点击 "New Project" 创建新项目
3. 选择组织，输入项目名称和数据库密码
4. 等待项目创建完成（通常需要 1-2 分钟）

## 步骤 2: 获取项目配置

1. 在项目仪表板中，点击左侧菜单的 "Settings" → "API"
2. 复制以下信息：
   - **Project URL**: 类似 `https://your-project-id.supabase.co`
   - **anon public key**: 以 `eyJ` 开头的长字符串

## 步骤 3: 配置 OAuth 提供商

### GitHub OAuth 配置

1. 在 Supabase 项目中，转到 "Authentication" → "Providers"
2. 找到 "GitHub" 并点击配置
3. 启用 GitHub 提供商
4. 在 GitHub 中创建 OAuth 应用：
   - 访问 [GitHub Developer Settings](https://github.com/settings/developers)
   - 点击 "New OAuth App"
   - 填写应用信息：
     - **Application name**: PromptCraft Extension
     - **Homepage URL**: `https://your-project-id.supabase.co`
     - **Authorization callback URL**: `https://your-project-id.supabase.co/auth/v1/callback`
     - **重要**: 同时添加Chrome扩展重定向URL: `https://bcagejgjfhjnfobgjpcbmanjelcbobno.chromiumapp.org/`
   - 创建应用后，复制 Client ID 和 Client Secret
5. 在 Supabase 中填入 GitHub 的 Client ID 和 Client Secret
6. 保存配置

### Google OAuth 配置

1. 在 Supabase 项目中，找到 "Google" 提供商并点击配置
2. 启用 Google 提供商
3. 在 Google Cloud Console 中创建 OAuth 应用：
   - 访问 [Google Cloud Console](https://console.cloud.google.com/)
   - 创建新项目或选择现有项目
   - 启用 "Google+ API"
   - 转到 "Credentials" → "Create Credentials" → "OAuth 2.0 Client IDs"
   - 选择 "Web application"
   - 添加授权重定向 URI: `https://your-project-id.supabase.co/auth/v1/callback`
   - **重要**: 同时添加Chrome扩展重定向URL: `https://bcagejgjfhjnfobgjpcbmanjelcbobno.chromiumapp.org/`
   - 复制 Client ID 和 Client Secret
4. 在 Supabase 中填入 Google 的 Client ID 和 Client Secret
5. 保存配置

## 步骤 4: 配置扩展

1. 打开 `lib/auth-config.js` 文件
2. 替换以下配置：
   ```javascript
   this.supabaseUrl = 'https://your-project-id.supabase.co';
   this.supabaseAnonKey = 'your-anon-public-key';
   ```
3. 保存文件

## 步骤 5: 创建数据表

在 Supabase SQL 编辑器中执行以下 SQL 来创建必要的数据表：

```sql
-- 创建用户配置表
CREATE TABLE user_profiles (
    id UUID REFERENCES auth.users(id) PRIMARY KEY,
    email TEXT,
    display_name TEXT,
    avatar_url TEXT,
    provider TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建提示词表
CREATE TABLE prompts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    category TEXT DEFAULT 'default',
    tags TEXT[] DEFAULT '{}',
    is_favorite BOOLEAN DEFAULT FALSE,
    local_id TEXT, -- 用于本地数据迁移
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- 创建同步状态表
CREATE TABLE sync_status (
    user_id UUID REFERENCES auth.users(id) PRIMARY KEY,
    last_sync_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    sync_version INTEGER DEFAULT 1,
    device_info JSONB
);

-- 启用行级安全 (RLS)
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_status ENABLE ROW LEVEL SECURITY;

-- 创建安全策略
CREATE POLICY "Users can view own profile" ON user_profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON user_profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON user_profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can view own prompts" ON prompts
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own prompts" ON prompts
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own prompts" ON prompts
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own prompts" ON prompts
    FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own sync status" ON sync_status
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own sync status" ON sync_status
    FOR ALL USING (auth.uid() = user_id);

-- 创建触发器自动更新 updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_prompts_updated_at BEFORE UPDATE ON prompts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

## 步骤 6: 测试配置

1. 重新加载 Chrome 扩展
2. 打开 PromptCraft 侧边栏
3. 查看是否出现用户图标按钮
4. 点击用户图标尝试登录
5. 选择 GitHub 或 Google 登录
6. 确认登录成功并显示用户信息

## 故障排除

### 常见问题

1. **用户图标不显示**
   - 检查 `auth-config.js` 配置是否正确
   - 确认 Supabase URL 和 Key 格式正确
   - 查看浏览器控制台是否有错误信息

2. **OAuth 登录失败**
   - 确认 OAuth 应用的重定向 URL 配置正确
   - 检查 Supabase 中的 OAuth 提供商配置
   - 确认 Client ID 和 Client Secret 正确

3. **权限错误**
   - 确认已执行 SQL 创建表和策略
   - 检查 RLS 策略是否正确配置

### 调试信息

打开浏览器开发者工具，在控制台中查看详细的错误信息：

```javascript
// 检查认证服务状态
console.log('Auth Service:', window.authService);
console.log('Auth UI:', window.authUI);
console.log('Current User:', window.authService?.getCurrentUser());
```

## 安全注意事项

1. **保护配置文件**: `auth-config.js` 包含敏感信息，不要分享给他人
2. **定期更新密钥**: 建议定期轮换 Supabase 密钥
3. **监控使用情况**: 在 Supabase 仪表板中监控 API 使用情况
4. **备份数据**: 定期备份重要的提示词数据

## 功能特性

配置完成后，您将获得以下功能：

- ✅ GitHub/Google OAuth 登录
- ✅ 跨设备数据同步
- ✅ 实时同步状态显示
- ✅ 离线数据保护
- ✅ 冲突解决机制
- ✅ 安全的数据传输

## 支持

如果遇到问题，请：

1. 检查本文档的故障排除部分
2. 查看浏览器控制台的错误信息
3. 确认 Supabase 项目配置正确
4. 在项目 GitHub 仓库中提交 Issue

---

**注意**: 首次配置可能需要 10-15 分钟，请耐心完成每个步骤。配置完成后，同步功能将自动工作。