/**
 * Supabase 认证配置
 * 用户需要在这里配置自己的 Supabase 项目信息
 */

class AuthConfig {
    constructor() {
        // Supabase 项目配置
        // 用户需要替换为自己的 Supabase 项目信息
        this.supabaseUrl = 'https://uwgxhtrbixsdabjvuuaj.supabase.co'; // 例如: https://your-project.supabase.co
        this.supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV3Z3hodHJiaXhzZGFianZ1dWFqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk0NzQ0NzUsImV4cCI6MjA2NTA1MDQ3NX0.6R4t3Bxy6g-ajI1Fym-RWmZgIvlAGLxy6uV1wbTULN0'; // 你的 Supabase anon key
        
        // OAuth 重定向 URL（Chrome 扩展）
        this.redirectUrl = chrome.identity.getRedirectURL();
        
        // OAuth 提供商配置
        this.oauthProviders = {
            github: {
                enabled: true,
                scopes: 'user:email'
            },
            google: {
                enabled: true,
                scopes: 'openid email profile'
            }
        };
        
        // 认证设置
        this.authSettings = {
            // 会话持续时间（秒）
            sessionDuration: 7 * 24 * 60 * 60, // 7天
            // 自动刷新令牌
            autoRefreshToken: true,
            // 记住登录状态
            persistSession: true
        };
    }
    
    /**
     * 检查配置是否有效
     */
    isValid() {
        return this.supabaseUrl !== 'YOUR_SUPABASE_URL' && 
               this.supabaseAnonKey !== 'YOUR_SUPABASE_ANON_KEY' &&
               this.supabaseUrl.includes('supabase.co');
    }
    
    /**
     * 获取 Supabase 配置
     */
    getSupabaseConfig() {
        return {
            url: this.supabaseUrl,
            key: this.supabaseAnonKey,
            options: {
                auth: {
                    autoRefreshToken: this.authSettings.autoRefreshToken,
                    persistSession: this.authSettings.persistSession,
                    detectSessionInUrl: false // Chrome 扩展中禁用
                }
            }
        };
    }
    
    /**
     * 获取 OAuth 配置
     */
    getOAuthConfig(provider) {
        if (!this.oauthProviders[provider] || !this.oauthProviders[provider].enabled) {
            throw new Error(`OAuth provider '${provider}' is not enabled`);
        }
        
        return {
            provider,
            options: {
                redirectTo: this.redirectUrl,
                scopes: this.oauthProviders[provider].scopes
            }
        };
    }
    
    /**
     * 获取配置说明
     */
    getConfigInstructions() {
        return {
            title: 'Supabase 配置说明',
            steps: [
                '1. 访问 https://supabase.com 创建新项目',
                '2. 在项目设置中找到 API 配置',
                '3. 复制 Project URL 和 anon public key',
                '4. 在 lib/auth-config.js 中替换配置信息',
                '5. 在 Supabase 项目中配置 OAuth 提供商（GitHub/Google）',
                '6. 重新加载扩展以应用配置'
            ],
            notes: [
                '• 确保在 Supabase 项目的认证设置中启用了相应的 OAuth 提供商',
                '• 配置 OAuth 重定向 URL 时使用: ' + this.redirectUrl,
                '• 本配置文件包含敏感信息，请勿分享给他人'
            ]
        };
    }
}

// 导出配置实例
window.AuthConfig = AuthConfig;