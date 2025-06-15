/**
 * UUID 工具模块
 * 用于生成符合 RFC 4122 标准的 UUID v4
 * 确保在跨设备和云端同步时具有唯一的、无冲突的标识符
 */

/**
 * 生成标准的 UUID v4
 * @returns {string} 格式为 xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx 的 UUID 字符串
 */
function generateUUID() {
    // 使用 crypto.randomUUID() 如果可用（现代浏览器）
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    
    // 回退到手动实现的 UUID v4 生成器
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

/**
 * 验证 UUID 格式是否正确
 * @param {string} uuid - 要验证的 UUID 字符串
 * @returns {boolean} 如果是有效的 UUID 格式返回 true，否则返回 false
 */
function isValidUUID(uuid) {
    if (typeof uuid !== 'string') {
        return false;
    }
    
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
}

/**
 * 为现有数据迁移生成固定的 UUID
 * 基于原始 ID 生成确定性的 UUID，确保多次运行结果一致
 * @param {number|string} originalId - 原始的 ID
 * @returns {string} 基于原始 ID 生成的 UUID
 */
function generateDeterministicUUID(originalId) {
    // 将原始 ID 转换为字符串并填充到固定长度
    const idStr = String(originalId).padStart(8, '0');
    
    // 创建一个基于原始 ID 的确定性 UUID
    // 使用固定的命名空间前缀确保格式正确
    const namespace = '550e8400-e29b-41d4-a716';
    const suffix = idStr.padEnd(12, '0').substring(0, 12);
    
    return `${namespace}-${suffix}`;
}

/**
 * 批量为数据项生成 UUID
 * @param {Array} items - 需要添加 UUID 的数据项数组
 * @param {string} idField - ID 字段名，默认为 'id'
 * @param {boolean} preserveOriginal - 是否保留原始 ID，默认为 false
 * @returns {Array} 添加了 UUID 的数据项数组
 */
function addUUIDToItems(items, idField = 'id', preserveOriginal = false) {
    if (!Array.isArray(items)) {
        console.error('addUUIDToItems: items 必须是数组');
        return [];
    }
    
    return items.map(item => {
        const newItem = { ...item };
        
        // 如果已经有有效的 UUID，则保留
        if (isValidUUID(item[idField])) {
            return newItem;
        }
        
        // 保留原始 ID（如果需要）
        if (preserveOriginal && item[idField] !== undefined) {
            newItem.originalId = item[idField];
        }
        
        // 生成新的 UUID
        if (item[idField] !== undefined) {
            // 如果有原始 ID，生成确定性 UUID
            newItem[idField] = generateDeterministicUUID(item[idField]);
        } else {
            // 如果没有原始 ID，生成随机 UUID
            newItem[idField] = generateUUID();
        }
        
        return newItem;
    });
}

// 导出函数供其他模块使用
if (typeof module !== 'undefined' && module.exports) {
    // Node.js 环境
    module.exports = {
        generateUUID,
        isValidUUID,
        generateDeterministicUUID,
        addUUIDToItems
    };
} else {
    // 浏览器环境，添加到全局对象
    window.UUIDUtils = {
        generateUUID,
        isValidUUID,
        generateDeterministicUUID,
        addUUIDToItems
    };
}