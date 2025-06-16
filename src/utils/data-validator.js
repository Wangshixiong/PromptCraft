/**
 * 数据验证工具模块
 * 提供各种数据格式验证和清理功能
 */

/**
 * 验证提示词数据结构
 * @param {Object} promptData - 提示词数据对象
 * @returns {Object} 验证结果 {isValid: boolean, errors: string[]}
 */
function validatePromptData(promptData) {
    const errors = [];
    
    try {
        console.log('正在验证提示词数据:', promptData);
        
        // 检查基本结构
        if (!promptData || typeof promptData !== 'object') {
            errors.push('提示词数据必须是一个对象');
            return { isValid: false, errors };
        }
        
        // 验证必需字段
        const requiredFields = ['id', 'title', 'content'];
        for (const field of requiredFields) {
            if (!promptData.hasOwnProperty(field)) {
                errors.push(`缺少必需字段: ${field}`);
            } else if (typeof promptData[field] !== 'string' || promptData[field].trim() === '') {
                errors.push(`字段 ${field} 必须是非空字符串`);
            }
        }
        
        // 验证可选字段
        if (promptData.category && typeof promptData.category !== 'string') {
            errors.push('category字段必须是字符串');
        }
        
        if (promptData.tags && !Array.isArray(promptData.tags)) {
            errors.push('tags字段必须是数组');
        }
        
        if (promptData.createdAt && !isValidDate(promptData.createdAt)) {
            errors.push('createdAt字段必须是有效的日期');
        }
        
        if (promptData.updatedAt && !isValidDate(promptData.updatedAt)) {
            errors.push('updatedAt字段必须是有效的日期');
        }
        
        // 验证内容长度
        if (promptData.title && promptData.title.length > 200) {
            errors.push('标题长度不能超过200个字符');
        }
        
        if (promptData.content && promptData.content.length > 10000) {
            errors.push('内容长度不能超过10000个字符');
        }
        
        const isValid = errors.length === 0;
        console.log('提示词数据验证结果:', { isValid, errors });
        
        return { isValid, errors };
    } catch (error) {
        console.error('提示词数据验证异常:', error);
        return { isValid: false, errors: ['数据验证过程中发生异常'] };
    }
}

/**
 * 验证用户配置数据
 * @param {Object} configData - 用户配置数据
 * @returns {Object} 验证结果
 */
function validateConfigData(configData) {
    const errors = [];
    
    try {
        console.log('正在验证配置数据:', configData);
        
        if (!configData || typeof configData !== 'object') {
            errors.push('配置数据必须是一个对象');
            return { isValid: false, errors };
        }
        
        // 验证主题设置
        if (configData.theme && !['light', 'dark', 'auto'].includes(configData.theme)) {
            errors.push('主题设置必须是 light、dark 或 auto');
        }
        
        // 验证语言设置
        if (configData.language && !['zh-CN', 'en-US'].includes(configData.language)) {
            errors.push('语言设置必须是 zh-CN 或 en-US');
        }
        
        // 验证同步设置
        if (configData.syncEnabled !== undefined && typeof configData.syncEnabled !== 'boolean') {
            errors.push('同步设置必须是布尔值');
        }
        
        const isValid = errors.length === 0;
        console.log('配置数据验证结果:', { isValid, errors });
        
        return { isValid, errors };
    } catch (error) {
        console.error('配置数据验证异常:', error);
        return { isValid: false, errors: ['配置验证过程中发生异常'] };
    }
}

/**
 * 验证日期格式
 * @param {*} date - 要验证的日期
 * @returns {boolean} 是否为有效日期
 */
function isValidDate(date) {
    if (!date) return false;
    
    const dateObj = new Date(date);
    return dateObj instanceof Date && !isNaN(dateObj.getTime());
}

/**
 * 验证邮箱格式
 * @param {string} email - 邮箱地址
 * @returns {boolean} 是否为有效邮箱
 */
function isValidEmail(email) {
    if (typeof email !== 'string') return false;
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

/**
 * 验证URL格式
 * @param {string} url - URL地址
 * @returns {boolean} 是否为有效URL
 */
function isValidURL(url) {
    if (typeof url !== 'string') return false;
    
    try {
        new URL(url);
        return true;
    } catch {
        return false;
    }
}

/**
 * 清理和标准化提示词数据
 * @param {Object} promptData - 原始提示词数据
 * @returns {Object} 清理后的数据
 */
function sanitizePromptData(promptData) {
    try {
        console.log('正在清理提示词数据:', promptData);
        
        const sanitized = {
            id: String(promptData.id || '').trim(),
            title: String(promptData.title || '').trim(),
            content: String(promptData.content || '').trim(),
            category: String(promptData.category || '').trim(),
            tags: Array.isArray(promptData.tags) ? promptData.tags.filter(tag => 
                typeof tag === 'string' && tag.trim() !== ''
            ).map(tag => tag.trim()) : [],
            createdAt: promptData.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        // 移除空的可选字段
        if (!sanitized.category) delete sanitized.category;
        if (sanitized.tags.length === 0) delete sanitized.tags;
        
        console.log('数据清理完成:', sanitized);
        return sanitized;
    } catch (error) {
        console.error('数据清理异常:', error);
        throw new Error('数据清理失败');
    }
}

/**
 * 验证批量数据
 * @param {Array} dataArray - 数据数组
 * @param {Function} validator - 验证函数
 * @returns {Object} 批量验证结果
 */
function validateBatchData(dataArray, validator) {
    const results = {
        valid: [],
        invalid: [],
        totalCount: 0,
        validCount: 0,
        invalidCount: 0
    };
    
    try {
        console.log('开始批量数据验证，数据量:', dataArray.length);
        
        if (!Array.isArray(dataArray)) {
            throw new Error('输入必须是数组');
        }
        
        results.totalCount = dataArray.length;
        
        dataArray.forEach((item, index) => {
            const validation = validator(item);
            
            if (validation.isValid) {
                results.valid.push({ index, data: item });
                results.validCount++;
            } else {
                results.invalid.push({ index, data: item, errors: validation.errors });
                results.invalidCount++;
            }
        });
        
        console.log('批量验证完成:', {
            总数: results.totalCount,
            有效: results.validCount,
            无效: results.invalidCount
        });
        
        return results;
    } catch (error) {
        console.error('批量验证异常:', error);
        throw error;
    }
}

// 导出模块
if (typeof module !== 'undefined' && module.exports) {
    // Node.js环境
    module.exports = {
        validatePromptData,
        validateConfigData,
        isValidDate,
        isValidEmail,
        isValidURL,
        sanitizePromptData,
        validateBatchData
    };
} else {
    // 浏览器环境
    window.DataValidator = {
        validatePromptData,
        validateConfigData,
        isValidDate,
        isValidEmail,
        isValidURL,
        sanitizePromptData,
        validateBatchData
    };
}