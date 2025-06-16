/**
 * Supabase客户端初始化和配置
 * 用于管理与Supabase数据库的连接
 */

// Supabase配置常量
const SUPABASE_CONFIG = {
    url: 'https://uwgxhtrbixsdabjvuuaj.supabase.co',
    anonKey: 'your-anon-key-here' // 需要替换为实际的匿名密钥
};

/**
 * 初始化Supabase客户端
 * @returns {Object} Supabase客户端实例
 */
function initializeSupabaseClient() {
    try {
        console.log('正在初始化Supabase客户端...');
        
        // 检查Supabase库是否已加载
        if (typeof supabase === 'undefined') {
            throw new Error('Supabase库未加载');
        }
        
        // 创建Supabase客户端
        const client = supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);
        
        console.log('Supabase客户端初始化成功');
        return client;
    } catch (error) {
        console.error('Supabase客户端初始化失败:', error);
        throw error;
    }
}

/**
 * 获取Supabase客户端实例（单例模式）
 * @returns {Object} Supabase客户端实例
 */
let supabaseClient = null;

function getSupabaseClient() {
    if (!supabaseClient) {
        supabaseClient = initializeSupabaseClient();
    }
    return supabaseClient;
}

/**
 * 测试数据库连接
 * @returns {Promise<boolean>} 连接是否成功
 */
async function testDatabaseConnection() {
    try {
        console.log('正在测试数据库连接...');
        const client = getSupabaseClient();
        
        // 执行一个简单的查询来测试连接
        const { data, error } = await client
            .from('prompts')
            .select('count')
            .limit(1);
        
        if (error) {
            console.error('数据库连接测试失败:', error);
            return false;
        }
        
        console.log('数据库连接测试成功');
        return true;
    } catch (error) {
        console.error('数据库连接测试异常:', error);
        return false;
    }
}

// 导出函数供其他模块使用
if (typeof module !== 'undefined' && module.exports) {
    // Node.js环境
    module.exports = {
        getSupabaseClient,
        testDatabaseConnection,
        SUPABASE_CONFIG
    };
} else {
    // 浏览器环境
    window.SupabaseClient = {
        getSupabaseClient,
        testDatabaseConnection,
        SUPABASE_CONFIG
    };
}