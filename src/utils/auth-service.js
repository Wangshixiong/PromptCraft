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

// 预加载状态管理
let isPreloaded = false;
let preloadPromise = null;

// 用户数据保护列表 - 这些键永远不应该被清理
const PROTECTED_USER_DATA_KEYS = [
    'prompts',                    // 用户的个人提示词
    'themeMode',                  // 用户主题设置
    'promptcraft_has_data',       // 数据状态标志
    'default_templates_loaded',   // 默认模板加载状态
    'schema_version',             // 数据模式版本
    'loadError',                  // 加载错误状态
    'errorMessage',               // 错误消息
    'errorTimestamp'              // 错误时间戳
];

/**
 * 安全检查函数：确保不会清理受保护的用户数据
 * @param {Array} keysToRemove - 要清理的键列表
 * @returns {Array} 过滤后的安全键列表
 */
function validateKeysToRemove(keysToRemove) {
    const safeKeys = keysToRemove.filter(key => {
        if (PROTECTED_USER_DATA_KEYS.includes(key)) {
            console.warn(`安全警告: 尝试清理受保护的用户数据键 '${key}'，已阻止`);
            return false;
        }
        return true;
    });
    
    console.log('数据清理安全检查完成:', {
        原始键数量: keysToRemove.length,
        安全键数量: safeKeys.length,
        被保护的键: keysToRemove.filter(key => PROTECTED_USER_DATA_KEYS.includes(key))
    });
    
    return safeKeys;
}

/**
 * 预加载登录所需资源
 * 在用户可能需要登录前提前调用，减少实际登录时的延迟
 */
async function preloadLoginResources() {
    if (isPreloaded || preloadPromise) {
        return preloadPromise;
    }
    
    console.log('开始预加载登录资源...');
    
    preloadPromise = (async () => {
        try {
            // 1. 预热Supabase客户端连接
            await supabaseClient.auth.getSession();
            
            // 2. 预获取Chrome扩展重定向URL（这个操作很快但可以缓存）
            const redirectURL = chrome.identity.getRedirectURL();
            console.log('预加载：Chrome扩展重定向URL已缓存:', redirectURL);
            
            // 3. 预热OAuth URL获取（不实际执行登录，只是建立连接）
            // 注意：这里不能真正调用signInWithOAuth，因为会触发实际登录流程
            // 但可以通过其他方式预热连接
            
            isPreloaded = true;
            console.log('登录资源预加载完成');
            
        } catch (error) {
            console.warn('登录资源预加载失败（不影响正常登录）:', error);
            // 预加载失败不应该影响正常登录流程
        }
    })();
    
    return preloadPromise;
}

/**
 * 使用 Google 登录（带进度回调）
 * @param {Function} progressCallback - 进度回调函数，接收 {stage, message} 参数
 */
async function signInWithGoogle(progressCallback = null) {
    try {
        console.log('开始 Google 登录流程...');
        
        // 进度回调辅助函数
        const reportProgress = (stage, message) => {
            console.log(`登录进度 [${stage}]: ${message}`);
            if (progressCallback) {
                progressCallback({ stage, message });
            }
        };
        
        // 0. 尝试使用预加载的资源
        reportProgress('preparing', '准备登录资源...');
        if (preloadPromise) {
            try {
                await preloadPromise;
                reportProgress('preparing', '使用预加载资源');
            } catch (error) {
                console.warn('预加载资源使用失败，继续正常流程:', error);
            }
        }
        
        // 1. 获取 Chrome 扩展的重定向 URL
        reportProgress('redirect', '获取重定向URL...');
        const redirectURL = chrome.identity.getRedirectURL();
        console.log('Chrome 扩展重定向 URL:', redirectURL);
        
        // 2. 调用 Supabase signInWithOAuth 获取授权 URL
        reportProgress('oauth', '获取Google授权链接...');
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
        reportProgress('auth', '打开Google登录页面...');

        // 3. 使用 chrome.identity.launchWebAuthFlow 进行认证
        return new Promise((resolve, reject) => {
            // 设置超时处理，防止认证流程卡死
            const timeoutId = setTimeout(() => {
                reject(new Error('认证超时，请重试'));
            }, 60000); // 60秒超时
            
            chrome.identity.launchWebAuthFlow({
                url: data.url,
                interactive: true
            }, async (responseUrl) => {
                // 清除超时定时器
                clearTimeout(timeoutId);
                
                if (chrome.runtime.lastError) {
                    const errorMessage = chrome.runtime.lastError.message;
                    
                    // 识别用户主动取消登录的情况
                    if (errorMessage === 'The user did not approve access.' || 
                        errorMessage.includes('user did not approve') ||
                        errorMessage.includes('cancelled') ||
                        errorMessage.includes('closed')) {
                        console.log('PromptCraft: 用户取消了Google登录');
                        // 创建一个特殊的错误类型，标识这是用户取消而非真正的错误
                        const cancelError = new Error('USER_CANCELLED');
                        cancelError.isUserCancelled = true;
                        reject(cancelError);
                        return;
                    }
                    
                    // 真正的认证错误
                    console.error('PromptCraft: 认证流程失败:', chrome.runtime.lastError);
                    reject(new Error(errorMessage));
                    return;
                }
                
                if (!responseUrl) {
                    // 没有响应URL通常也是用户取消的情况
                    console.log('PromptCraft: 用户取消了Google登录（无响应URL）');
                    const cancelError = new Error('USER_CANCELLED');
                    cancelError.isUserCancelled = true;
                    reject(cancelError);
                    return;
                }
                
                try {
                    console.log('认证回调 URL:', responseUrl);
                    reportProgress('callback', '处理登录回调...');
                    
                    // 4. 解析回调 URL 中的参数
                    const url = new URL(responseUrl);
                    const hashParams = new URLSearchParams(url.hash.substring(1));
                    
                    const accessToken = hashParams.get('access_token');
                    const refreshToken = hashParams.get('refresh_token');
                    const error = hashParams.get('error');
                    const errorDescription = hashParams.get('error_description');
                    
                    console.log('解析到的令牌信息:', {
                        hasAccessToken: !!accessToken,
                        hasRefreshToken: !!refreshToken,
                        error: error
                    });
                    
                    if (error) {
                        console.error('OAuth 认证失败:', error, errorDescription);
                        reject(new Error(`认证失败: ${error} - ${errorDescription}`));
                        return;
                    }
                    
                    if (!accessToken || !refreshToken) {
                        console.error('令牌缺失 - accessToken:', !!accessToken, 'refreshToken:', !!refreshToken);
                        reject(new Error('未能获取到有效的认证令牌'));
                        return;
                    }
                    
                    console.log('开始设置 Supabase 会话...');
                    reportProgress('session', '建立用户会话...');
                    
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
                    
                    if (!sessionData || !sessionData.session || !sessionData.user) {
                        console.error('会话数据无效:', sessionData);
                        reject(new Error('会话设置成功但数据无效'));
                        return;
                    }
                    
                    console.log('用户认证成功:', sessionData.user.email);
                    console.log('会话设置完成，会话ID:', sessionData.session.access_token.substring(0, 20) + '...');
                    reportProgress('complete', '登录成功！');
                    
                    // 确保认证状态变化事件能够正确触发
                    setTimeout(() => {
                        console.log('延迟触发认证状态检查...');
                    }, 100);
                    
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
        
        // 选择性清理：只清除认证和同步相关数据，保留用户数据
        const authKeysToRemove = [
            // Supabase 认证相关键（使用项目ID模式）
            'sb-uwgxhtrbixsdabjvuuaj-auth-token',
            'sb-uwgxhtrbixsdabjvuuaj-auth-token-code-verifier', 
            'sb-uwgxhtrbixsdabjvuuaj-auth-refresh-token',
            // 同步服务相关键（但保留用户数据和状态标志）
            'last_sync_time',
            'sync_status',
            'migration_completed', 
            'sync_queue',
            'conflict_log'
            // 注意：不清理 prompts, themeMode, promptcraft_has_data, default_templates_loaded, schema_version
        ];
        
        // 安全检查：确保不会清理受保护的用户数据
        const safeKeysToRemove = validateKeysToRemove(authKeysToRemove);
        
        console.log('清理认证相关数据:', safeKeysToRemove);
        await chrome.storage.local.remove(safeKeysToRemove);
        
        console.log('退出登录成功，用户数据已保留');
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

/**
 * 获取当前用户信息
 */
async function getCurrentUser() {
    try {
        const { session, user } = await getSession();
        return user;
    } catch (error) {
        console.error('获取当前用户失败:', error);
        return null;
    }
}

// 导出认证服务对象
const authService = {
    signInWithGoogle,
    signOut,
    getSession,
    isAuthenticated,
    getCurrentUser,
    preloadLoginResources,
    onAuthStateChange: (callback) => supabaseClient.auth.onAuthStateChange(callback),
    // 暴露 Supabase 客户端以供其他用途
    client: supabaseClient
};

// 确保全局可访问
if (typeof window !== 'undefined') {
    // 在 Chrome 扩展环境中，background.js 没有 window 对象，使用 globalThis
    const globalScope = typeof window !== 'undefined' ? window : globalThis;
    globalScope.authService = authService;
    globalScope.supabase = supabaseClient;
}

// CommonJS 导出
if (typeof module !== 'undefined' && module.exports) {
    module.exports = authService;
}