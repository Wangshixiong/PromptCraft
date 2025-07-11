/**
 * UUID生成工具模块
 * 提供各种格式的唯一标识符生成功能
 */

/**
 * 生成UUID v4格式的唯一标识符
 * @returns {string} UUID v4格式字符串
 */
function generateUUID() {
    try {
        // 优先使用浏览器原生的crypto.randomUUID()
        if (typeof crypto !== 'undefined' && crypto.randomUUID) {
            return crypto.randomUUID();
        }
        
        // 备用方案：使用crypto.getRandomValues()
        if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
            return generateUUIDWithCrypto();
        }
        
        // 最后备用方案：使用Math.random()
        return generateUUIDWithMath();
    } catch (error) {
        console.error('UUID生成失败，使用备用方案:', error);
        return generateUUIDWithMath();
    }
}

/**
 * 使用crypto.getRandomValues()生成UUID
 * @returns {string} UUID字符串
 */
function generateUUIDWithCrypto() {
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    
    // 设置版本号(4)和变体位
    array[6] = (array[6] & 0x0f) | 0x40; // 版本4
    array[8] = (array[8] & 0x3f) | 0x80; // 变体位
    
    // 转换为UUID格式字符串
    const hex = Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
    return [
        hex.slice(0, 8),
        hex.slice(8, 12),
        hex.slice(12, 16),
        hex.slice(16, 20),
        hex.slice(20, 32)
    ].join('-');
}

/**
 * 使用Math.random()生成UUID（备用方案）
 * @returns {string} UUID字符串
 */
function generateUUIDWithMath() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}





// 导出模块
if (typeof module !== 'undefined' && module.exports) {
    // Node.js环境
    module.exports = {
        generateUUID
    };
} else if (typeof window !== 'undefined') {
    // 浏览器环境
    // 在 Chrome 扩展环境中，background.js 没有 window 对象，使用 globalThis
    const globalScope = typeof window !== 'undefined' ? window : globalThis;
    globalScope.UUIDUtils = {
        generateUUID
    };
} else {
    // Service Worker环境
    globalThis.UUIDUtils = {
        generateUUID
    };
}