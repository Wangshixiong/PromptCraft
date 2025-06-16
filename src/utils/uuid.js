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
            const uuid = crypto.randomUUID();
            console.log('使用原生crypto.randomUUID()生成UUID:', uuid);
            return uuid;
        }
        
        // 备用方案：使用crypto.getRandomValues()
        if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
            const uuid = generateUUIDWithCrypto();
            console.log('使用crypto.getRandomValues()生成UUID:', uuid);
            return uuid;
        }
        
        // 最后备用方案：使用Math.random()
        const uuid = generateUUIDWithMath();
        console.log('使用Math.random()生成UUID:', uuid);
        return uuid;
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

/**
 * 生成短UUID（8位）
 * @returns {string} 8位短UUID
 */
function generateShortUUID() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    
    for (let i = 0; i < 8; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    console.log('生成短UUID:', result);
    return result;
}

/**
 * 生成时间戳UUID（包含时间信息）
 * @returns {string} 时间戳UUID
 */
function generateTimestampUUID() {
    const timestamp = Date.now().toString(36);
    const randomPart = Math.random().toString(36).substr(2, 9);
    const uuid = `${timestamp}-${randomPart}`;
    
    console.log('生成时间戳UUID:', uuid);
    return uuid;
}

/**
 * 验证UUID格式是否正确
 * @param {string} uuid - 要验证的UUID字符串
 * @returns {boolean} 是否为有效的UUID格式
 */
function isValidUUID(uuid) {
    if (typeof uuid !== 'string') {
        return false;
    }
    
    // UUID v4格式正则表达式
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    const isValid = uuidRegex.test(uuid);
    
    console.log(`UUID格式验证 ${uuid}:`, isValid);
    return isValid;
}

/**
 * 生成带前缀的UUID
 * @param {string} prefix - 前缀字符串
 * @returns {string} 带前缀的UUID
 */
function generatePrefixedUUID(prefix = '') {
    const uuid = generateUUID();
    const prefixedUUID = prefix ? `${prefix}_${uuid}` : uuid;
    
    console.log('生成带前缀的UUID:', prefixedUUID);
    return prefixedUUID;
}

// 导出模块
if (typeof module !== 'undefined' && module.exports) {
    // Node.js环境
    module.exports = {
        generateUUID,
        generateShortUUID,
        generateTimestampUUID,
        generatePrefixedUUID,
        isValidUUID
    };
} else {
    // 浏览器环境
    window.UUIDUtils = {
        generateUUID,
        generateShortUUID,
        generateTimestampUUID,
        generatePrefixedUUID,
        isValidUUID
    };
}