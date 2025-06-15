/**
 * Supabase 认证服务模块
 * 负责处理用户登录、登出、状态管理等认证相关功能
 * 
 * @author AI Assistant
 * @version 1.0.0
 * @date 2025-01-27
 */

// Supabase 配置信息
const SUPABASE_CONFIG = {
    url: 'https://uwgxhtrbixsdabjvuuaj.supabase.co',
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV3Z3hodHJiaXhzZGFianZ1dWFqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk0NzQ0NzUsImV4cCI6MjA2NTA1MDQ3NX0.6R4t3Bxy6g-ajI1Fym-RWmZgIvlAGLxy6uV1wbTULN0'
};

// 存储键名常量
const AUTH_STORAGE_KEYS = {
    USER_SESSION: 'supabase_user_session',
    USER_PROFILE: 'user_profile',
    AUTH_STATE: 'auth_state'
};

/**
 * Supabase 认证服务类
 * 提供完整的用户认证功能，包括OAuth登录、会话管理、状态持久化等
 */
class AuthService {
    constructor() {
        this.supabase = null;
        this.currentUser = null;
        this.authStateListeners = [];
        this.isInitialized = false;
    }

    /**
     * 初始化认证服务
     * 加载Supabase库并设置会话持久化
     * 
     * @returns {Promise<boolean>} 初始化是否成功
     * @throws {Error} 初始化失败时抛出错误
     */
    async initialize() {
        try {
            // 动态加载Supabase库
            await this.loadSupabaseLibrary();
            
            // 创建Supabase客户端实例
            this.supabase = window.supabase.createClient(
                SUPABASE_CONFIG.url,
                SUPABASE_CONFIG.anonKey,
                {
                    auth: {
                        // 使用Chrome存储作为会话持久化
                        storage: {
                            getItem: async (key) => {
                                const result = await chrome.storage.local.get([key]);
                                return result[key] || null;
                            },
                            setItem: async (key, value) => {
                                await chrome.storage.local.set({ [key]: value });
                            },
                            removeItem: async (key) => {
                                await chrome.storage.local.remove([key]);
                            }
                        },
                        autoRefreshToken: true,
                        persistSession: true,
                        detectSessionInUrl: false
                    }
                }
            );

            // 监听认证状态变化
            this.supabase.auth.onAuthStateChange((event, session) => {
                this.handleAuthStateChange(event, session);
            });

            // 恢复用户会话
            await this.restoreUserSession();
            
            this.isInitialized = true;
            console.log('AuthService initialized successfully');
            return true;
            
        } catch (error) {
            console.error('Failed to initialize AuthService:', error);
            throw new Error(`认证服务初始化失败: ${error.message}`);
        }
    }

    /**
     * 动态加载Supabase JavaScript库
     * 从CDN加载最新稳定版本的Supabase库
     * 
     * @returns {Promise<void>}
     * @throws {Error} 加载失败时抛出错误
     */
    async loadSupabaseLibrary() {
        return new Promise((resolve, reject) => {
            // 检查是否已经加载
            if (window.supabase) {
                resolve();
                return;
            }

            const script = document.createElement('script');
            script.src = chrome.runtime.getURL('lib/supabase.min.js');
            script.onload = () => {
                if (window.supabase) {
                    resolve();
                } else {
                    reject(new Error('Supabase library failed to load'));
                }
            };
            script.onerror = () => {
                reject(new Error('Failed to load Supabase library from local file'));
            };
            document.head.appendChild(script);
        });
    }

    /**
     * 处理认证状态变化
     * 当用户登录、登出或会话变化时触发
     * 
     * @param {string} event - 认证事件类型
     * @param {Object|null} session - 用户会话对象
     */
    async handleAuthStateChange(event, session) {
        console.log('Auth state changed:', event, session?.user?.email);
        
        if (session?.user) {
            this.currentUser = session.user;
            await this.saveUserProfile(session.user);
        } else {
            this.currentUser = null;
            await this.clearUserProfile();
        }

        // 通知所有监听器
        this.authStateListeners.forEach(listener => {
            try {
                listener(event, session);
            } catch (error) {
                console.error('Error in auth state listener:', error);
            }
        });
    }

    /**
     * 恢复用户会话
     * 应用启动时从存储中恢复用户登录状态
     * 
     * @returns {Promise<Object|null>} 用户会话对象或null
     */
    async restoreUserSession() {
        try {
            const { data: { session }, error } = await this.supabase.auth.getSession();
            
            if (error) {
                console.error('Error restoring session:', error);
                return null;
            }

            if (session?.user) {
                this.currentUser = session.user;
                console.log('User session restored:', session.user.email);
            }

            return session;
        } catch (error) {
            console.error('Failed to restore user session:', error);
            return null;
        }
    }

    /**
     * GitHub OAuth 登录
     * 使用Chrome扩展特有的OAuth认证流程进行GitHub登录
     * 
     * @returns {Promise<Object>} 登录结果对象
     * @throws {Error} 登录失败时抛出错误
     */
    async signInWithGitHub() {
        try {
            if (!this.isInitialized) {
                throw new Error('AuthService not initialized');
            }

            // 获取Chrome扩展的重定向URL
            const redirectUrl = chrome.identity.getRedirectURL();
            console.log('GitHub OAuth redirect URL:', redirectUrl);

            const { data, error } = await this.supabase.auth.signInWithOAuth({
                provider: 'github',
                options: {
                    redirectTo: redirectUrl
                }
            });

            if (error) {
                throw new Error(`GitHub登录失败: ${error.message}`);
            }

            // 如果有授权URL，使用Chrome Identity API打开认证流程
            if (data?.url) {
                return await this.handleChromeOAuthFlow(data.url, 'github');
            }

            return { success: true, data };
        } catch (error) {
            console.error('GitHub sign in error:', error);
            throw error;
        }
    }

    /**
     * Google OAuth 登录
     * 使用Chrome扩展特有的OAuth认证流程进行Google登录
     * 
     * @returns {Promise<Object>} 登录结果对象
     * @throws {Error} 登录失败时抛出错误
     */
    async signInWithGoogle() {
        try {
            if (!this.isInitialized) {
                throw new Error('AuthService not initialized');
            }

            // 获取Chrome扩展的重定向URL
            const redirectUrl = chrome.identity.getRedirectURL();
            console.log('Google OAuth redirect URL:', redirectUrl);

            const { data, error } = await this.supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: redirectUrl
                }
            });

            if (error) {
                throw new Error(`Google登录失败: ${error.message}`);
            }

            // 如果有授权URL，使用Chrome Identity API打开认证流程
            if (data?.url) {
                return await this.handleChromeOAuthFlow(data.url, 'google');
            }

            return { success: true, data };
        } catch (error) {
            console.error('Google sign in error:', error);
            throw error;
        }
    }

    /**
     * 处理Chrome扩展OAuth认证流程
     * 使用chrome.identity.launchWebAuthFlow进行OAuth认证
     * 
     * @param {string} authUrl - OAuth认证URL
     * @param {string} provider - OAuth提供商（github/google）
     * @returns {Promise<Object>} 认证结果对象
     * @throws {Error} 认证失败时抛出错误
     */
    async handleChromeOAuthFlow(authUrl, provider) {
        try {
            console.log(`Starting ${provider} OAuth flow with URL:`, authUrl);
            
            // 使用Chrome Identity API启动OAuth流程
            const redirectUrl = await new Promise((resolve, reject) => {
                const extensionRedirectUrl = chrome.identity.getRedirectURL();
                console.log(`${provider} OAuth using redirect URL:`, extensionRedirectUrl);
                
                chrome.identity.launchWebAuthFlow({
                    url: authUrl,
                    interactive: true
                }, (responseUrl) => {
                    console.log(`${provider} OAuth response URL:`, responseUrl);
                    
                    // 优先检查是否有有效的响应URL
                    if (responseUrl) {
                        console.log(`${provider} OAuth flow completed successfully`);
                        resolve(responseUrl);
                        return;
                    }
                    
                    // 如果没有响应URL，再检查错误
                    if (chrome.runtime.lastError) {
                        const errorMessage = chrome.runtime.lastError.message;
                        console.log(`${provider} OAuth runtime error:`, errorMessage);
                        
                        // 在Chrome扩展OAuth流程中，某些错误是正常的流程结束信号
                        if (errorMessage.includes('closed') || 
                            errorMessage.includes('ERR_CONNECTION_CLOSED') ||
                            errorMessage.includes('cancelled')) {
                            console.log('OAuth flow ended (user cancelled or window closed)');
                            reject(new Error('OAuth认证被取消'));
                        } else {
                            reject(new Error(`OAuth认证失败: ${errorMessage}`));
                        }
                    } else {
                        reject(new Error('OAuth认证失败：未知错误'));
                    }
                });
            });

            console.log(`${provider} OAuth redirect URL received:`, redirectUrl);

            // 解析重定向URL中的认证参数
            const url = new URL(redirectUrl);
            const fragment = url.hash.substring(1); // 移除 # 号
            const params = new URLSearchParams(fragment);
            
            // 检查是否有错误
            const error = params.get('error');
            if (error) {
                const errorDescription = params.get('error_description') || error;
                throw new Error(`OAuth认证失败: ${errorDescription}`);
            }

            // 获取访问令牌和刷新令牌
            const accessToken = params.get('access_token');
            const refreshToken = params.get('refresh_token');
            const expiresIn = params.get('expires_in');
            
            if (!accessToken) {
                throw new Error('未能获取访问令牌');
            }

            console.log(`${provider} OAuth tokens received successfully`);

            // 使用令牌设置Supabase会话
            const { data: sessionData, error: sessionError } = await this.supabase.auth.setSession({
                access_token: accessToken,
                refresh_token: refreshToken || ''
            });

            if (sessionError) {
                throw new Error(`设置会话失败: ${sessionError.message}`);
            }

            console.log(`${provider} authentication successful:`, sessionData.user?.email);

            return {
                success: true,
                user: sessionData.user,
                session: sessionData.session,
                provider
            };

        } catch (error) {
            console.error(`${provider} OAuth flow error:`, error);
            throw new Error(`${provider}认证失败: ${error.message}`);
        }
    }

    /**
     * 处理OAuth回调数据
     * 用于处理来自background.js的OAuth认证结果
     * 
     * @param {Object} callbackData - OAuth回调数据
     * @returns {Promise<Object>} 处理结果
     */
    async handleOAuthCallback(callbackData) {
        try {
            console.log('处理OAuth回调数据:', callbackData);
            
            if (callbackData.error) {
                throw new Error(callbackData.error);
            }
            
            if (callbackData.access_token) {
                // 使用令牌设置Supabase会话
                const { data: sessionData, error: sessionError } = await this.supabase.auth.setSession({
                    access_token: callbackData.access_token,
                    refresh_token: callbackData.refresh_token || ''
                });
                
                if (sessionError) {
                    throw new Error(`设置会话失败: ${sessionError.message}`);
                }
                
                console.log('OAuth回调处理成功:', sessionData.user?.email);
                
                return {
                    success: true,
                    user: sessionData.user,
                    session: sessionData.session
                };
            }
            
            throw new Error('回调数据中缺少访问令牌');
            
        } catch (error) {
            console.error('OAuth回调处理失败:', error);
            throw error;
        }
    }

    /**
     * 用户登出
     * 清除用户会话和本地存储的认证信息
     * 
     * @returns {Promise<Object>} 登出结果对象
     * @throws {Error} 登出失败时抛出错误
     */
    async signOut() {
        try {
            if (!this.isInitialized) {
                throw new Error('AuthService not initialized');
            }

            const { error } = await this.supabase.auth.signOut();
            
            if (error) {
                throw new Error(`登出失败: ${error.message}`);
            }

            // 清除本地用户信息
            this.currentUser = null;
            await this.clearUserProfile();

            return { success: true };
        } catch (error) {
            console.error('Sign out error:', error);
            throw error;
        }
    }

    /**
     * 获取当前用户信息
     * 
     * @returns {Object|null} 当前登录用户对象或null
     */
    getCurrentUser() {
        return this.currentUser;
    }

    /**
     * 检查用户是否已登录
     * 
     * @returns {boolean} 用户登录状态
     */
    isAuthenticated() {
        return this.currentUser !== null;
    }

    /**
     * 获取用户认证提供商
     * 
     * @returns {string|null} 认证提供商名称（github/google）或null
     */
    getAuthProvider() {
        if (!this.currentUser?.app_metadata?.provider) {
            return null;
        }
        return this.currentUser.app_metadata.provider;
    }

    /**
     * 获取用户头像URL
     * 
     * @returns {string|null} 用户头像URL或null
     */
    getUserAvatar() {
        return this.currentUser?.user_metadata?.avatar_url || null;
    }

    /**
     * 获取用户邮箱
     * 
     * @returns {string|null} 用户邮箱或null
     */
    getUserEmail() {
        return this.currentUser?.email || null;
    }

    /**
     * 获取用户显示名称
     * 
     * @returns {string|null} 用户显示名称或null
     */
    getUserDisplayName() {
        return this.currentUser?.user_metadata?.full_name || 
               this.currentUser?.user_metadata?.name || 
               this.getUserEmail();
    }

    /**
     * 添加认证状态监听器
     * 
     * @param {Function} listener - 状态变化回调函数
     * @returns {Function} 移除监听器的函数
     */
    onAuthStateChange(listener) {
        this.authStateListeners.push(listener);
        
        // 返回移除监听器的函数
        return () => {
            const index = this.authStateListeners.indexOf(listener);
            if (index > -1) {
                this.authStateListeners.splice(index, 1);
            }
        };
    }

    /**
     * 保存用户配置信息到本地存储
     * 
     * @param {Object} user - 用户对象
     * @returns {Promise<void>}
     */
    async saveUserProfile(user) {
        try {
            const profile = {
                id: user.id,
                email: user.email,
                provider: user.app_metadata?.provider,
                avatar_url: user.user_metadata?.avatar_url,
                full_name: user.user_metadata?.full_name || user.user_metadata?.name,
                last_sign_in: user.last_sign_in_at,
                created_at: user.created_at
            };

            await chrome.storage.local.set({
                [AUTH_STORAGE_KEYS.USER_PROFILE]: profile,
                [AUTH_STORAGE_KEYS.AUTH_STATE]: 'authenticated'
            });
        } catch (error) {
            console.error('Failed to save user profile:', error);
        }
    }

    /**
     * 清除本地存储的用户信息
     * 
     * @returns {Promise<void>}
     */
    async clearUserProfile() {
        try {
            await chrome.storage.local.remove([
                AUTH_STORAGE_KEYS.USER_PROFILE,
                AUTH_STORAGE_KEYS.AUTH_STATE
            ]);
        } catch (error) {
            console.error('Failed to clear user profile:', error);
        }
    }

    /**
     * 获取Supabase客户端实例
     * 用于其他模块进行数据库操作
     * 
     * @returns {Object|null} Supabase客户端实例或null
     */
    getSupabaseClient() {
        return this.supabase;
    }
}

// 导出认证服务类
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AuthService;
} else {
    window.AuthService = AuthService;
}