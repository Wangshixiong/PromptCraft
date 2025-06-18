// Supabase 认证服务 - Chrome 扩展专用实现
// 基于官方文档和最佳实践：https://github.com/orgs/supabase/discussions/5787

// 假设 Supabase 的 createClient 已经通过 <script> 标签在全局可用
const { createClient } = supabase; 

// Supabase 配置
const SUPABASE_URL = 'https://uwgxhtrbixsdabjvuuaj.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV3Z3hodHJiaXhzZGFianZ1dWFqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk0NzQ0NzUsImV4cCI6MjA2NTA1MDQ3NX0.6R4t3Bxy6g-ajI1Fym-RWmZgIvlAGLxy6uV1wbTULN0';

// 创建 Supabase 客户端
const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
        storage: {
            getItem: (key) => new Promise(resolve => chrome.storage.local.get([key], r => resolve(r[key] || null))),
            setItem: (key, value) => new Promise(resolve => chrome.storage.local.set({ [key]: value }, resolve)),
            removeItem: (key) => new Promise(resolve => chrome.storage.local.remove([key], resolve)),
        },
        autoRefreshToken: true,
        persistSession: true
    }
});

/**
 * 使用 Google OAuth 进行登录 - Chrome 扩展标准实现
 * 使用 chrome.identity.launchWebAuthFlow 进行认证
 */
async function signInWithGoogle() {
    try {
        console.log('开始 Google 登录流程');
        
        // 1. 获取 Chrome 扩展的重定向 URL
        const redirectURL = chrome.identity.getRedirectURL();
        console.log('Chrome 扩展重定向 URL:', redirectURL);
        
        // 2. 调用 Supabase signInWithOAuth 获取授权 URL
        const { data, error: urlError } = await supabaseClient.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: redirectURL,
                queryParams: {
                    access_type: 'offline',
                    prompt: 'consent'
                }
            }
        });

        if (urlError) {
            console.error('获取 OAuth URL 失败:', urlError);
            throw urlError;
        }

        console.log('获取到 OAuth URL:', data.url);

        // 3. 使用 chrome.identity.launchWebAuthFlow 进行认证
        return new Promise((resolve, reject) => {
            chrome.identity.launchWebAuthFlow({
                url: data.url,
                interactive: true
            }, async (responseUrl) => {
                if (chrome.runtime.lastError) {
                    console.error('认证流程失败:', chrome.runtime.lastError);
                    reject(new Error(chrome.runtime.lastError.message));
                    return;
                }
                
                if (!responseUrl) {
                    reject(new Error('认证被取消或失败'));
                    return;
                }
                
                try {
                    console.log('认证回调 URL:', responseUrl);
                    
                    // 4. 解析回调 URL 中的参数
                    const url = new URL(responseUrl);
                    const hashParams = new URLSearchParams(url.hash.substring(1));
                    
                    const accessToken = hashParams.get('access_token');
                    const refreshToken = hashParams.get('refresh_token');
                    const error = hashParams.get('error');
                    const errorDescription = hashParams.get('error_description');
                    
                    if (error) {
                        console.error('OAuth 认证失败:', error, errorDescription);
                        reject(new Error(`认证失败: ${error} - ${errorDescription}`));
                        return;
                    }
                    
                    if (!accessToken || !refreshToken) {
                        reject(new Error('未能获取到有效的认证令牌'));
                        return;
                    }
                    
                    // 5. 设置 Supabase 会话
                    const { data: sessionData, error: sessionError } = await supabaseClient.auth.setSession({
                        access_token: accessToken,
                        refresh_token: refreshToken
                    });
                    
                    if (sessionError) {
                        console.error('设置会话失败:', sessionError);
                        reject(sessionError);
                        return;
                    }
                    
                    console.log('用户认证成功:', sessionData.user.email);
                    
                    resolve({
                        success: true,
                        user: sessionData.user,
                        session: sessionData.session,
                        message: '登录成功'
                    });
                    
                } catch (parseError) {
                    console.error('解析认证回调失败:', parseError);
                    reject(parseError);
                }
            });
        });

    } catch (error) {
        console.error('Google 登录失败:', error);
        throw new Error(`登录失败: ${error.message}`);
    }
}

/**
 * 退出登录
 */
async function signOut() {
    try {
        console.log('开始退出登录...');
        
        // 清除 Supabase 会话
        const { error } = await supabaseClient.auth.signOut();
        if (error) {
            console.error('Supabase 退出失败:', error);
            throw error;
        }
        
        // 清除本地存储
        await chrome.storage.local.clear();
        
        console.log('退出登录成功');
        return { success: true };
        
    } catch (error) {
        console.error('退出登录失败:', error);
        throw error;
    }
}

/**
 * 获取当前用户会话
 */
async function getSession() {
    try {
        const { data: { session }, error } = await supabaseClient.auth.getSession();
        if (error) {
            console.error('获取会话失败:', error);
            throw error;
        }
        return { session, user: session?.user ?? null };
    } catch (error) {
        console.error('获取会话失败:', error);
        throw error;
    }
}

/**
 * 检查是否已登录
 */
async function isAuthenticated() {
    try {
        const { session } = await getSession();
        return !!session;
    } catch (error) {
        console.error('检查认证状态失败:', error);
        return false;
    }
}

// 导出认证服务对象
const authService = {
    signInWithGoogle,
    signOut,
    getSession,
    isAuthenticated,
    onAuthStateChange: (callback) => supabaseClient.auth.onAuthStateChange(callback),
    // 暴露 Supabase 客户端以供其他用途
    client: supabaseClient
};

// 确保全局可访问
if (typeof window !== 'undefined') {
    window.authService = authService;
}

// CommonJS 导出
if (typeof module !== 'undefined' && module.exports) {
    module.exports = authService;
}