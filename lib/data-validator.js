/**
 * 数据验证模块
 * Phase 1: Foundation - 确保数据完整性和一致性
 */

/**
 * 提示词数据验证规则
 */
const PROMPT_VALIDATION_RULES = {
    id: {
        required: true,
        type: 'string',
        validator: (value) => isValidUUID(value),
        message: 'ID必须是有效的UUID格式'
    },
    user_id: {
        required: true,
        type: 'string',
        minLength: 1,
        message: '用户ID不能为空'
    },
    title: {
        required: true,
        type: 'string',
        minLength: 1,
        maxLength: 200,
        message: '标题长度必须在1-200个字符之间'
    },
    content: {
        required: true,
        type: 'string',
        minLength: 1,
        maxLength: 10000,
        message: '内容长度必须在1-10000个字符之间'
    },
    category: {
        required: true,
        type: 'string',
        minLength: 1,
        maxLength: 50,
        message: '分类长度必须在1-50个字符之间'
    },
    created_at: {
        required: true,
        type: 'string',
        validator: (value) => isValidISODate(value),
        message: '创建时间必须是有效的ISO日期格式'
    },
    updated_at: {
        required: true,
        type: 'string',
        validator: (value) => isValidISODate(value),
        message: '更新时间必须是有效的ISO日期格式'
    }
};

/**
 * 数据验证器类
 */
class DataValidator {
    /**
     * 验证单个提示词对象
     * @param {Object} prompt - 提示词对象
     * @returns {Object} 验证结果 {isValid: boolean, errors: Array}
     */
    static validatePrompt(prompt) {
        const errors = [];
        
        if (!prompt || typeof prompt !== 'object') {
            return {
                isValid: false,
                errors: ['提示词必须是一个有效的对象']
            };
        }
        
        // 验证每个字段
        for (const [field, rules] of Object.entries(PROMPT_VALIDATION_RULES)) {
            const value = prompt[field];
            const fieldErrors = this.validateField(field, value, rules);
            errors.push(...fieldErrors);
        }
        
        // 额外的业务逻辑验证
        const businessErrors = this.validatePromptBusinessLogic(prompt);
        errors.push(...businessErrors);
        
        return {
            isValid: errors.length === 0,
            errors
        };
    }
    
    /**
     * 验证单个字段
     * @param {string} fieldName - 字段名
     * @param {any} value - 字段值
     * @param {Object} rules - 验证规则
     * @returns {Array} 错误信息数组
     */
    static validateField(fieldName, value, rules) {
        const errors = [];
        
        // 必填验证
        if (rules.required && (value === undefined || value === null || value === '')) {
            errors.push(`${fieldName}: 字段不能为空`);
            return errors; // 如果必填字段为空，不继续其他验证
        }
        
        // 如果字段不是必填且为空，跳过其他验证
        if (!rules.required && (value === undefined || value === null || value === '')) {
            return errors;
        }
        
        // 类型验证
        if (rules.type && typeof value !== rules.type) {
            errors.push(`${fieldName}: 类型必须是 ${rules.type}`);
            return errors;
        }
        
        // 字符串长度验证
        if (rules.type === 'string') {
            if (rules.minLength && value.length < rules.minLength) {
                errors.push(`${fieldName}: 长度不能少于 ${rules.minLength} 个字符`);
            }
            if (rules.maxLength && value.length > rules.maxLength) {
                errors.push(`${fieldName}: 长度不能超过 ${rules.maxLength} 个字符`);
            }
        }
        
        // 自定义验证器
        if (rules.validator && !rules.validator(value)) {
            errors.push(`${fieldName}: ${rules.message || '验证失败'}`);
        }
        
        return errors;
    }
    
    /**
     * 验证提示词的业务逻辑
     * @param {Object} prompt - 提示词对象
     * @returns {Array} 错误信息数组
     */
    static validatePromptBusinessLogic(prompt) {
        const errors = [];
        
        // 验证创建时间不能晚于更新时间
        if (prompt.created_at && prompt.updated_at) {
            const createdDate = new Date(prompt.created_at);
            const updatedDate = new Date(prompt.updated_at);
            
            if (createdDate > updatedDate) {
                errors.push('创建时间不能晚于更新时间');
            }
        }
        
        // 注释：移除了标题特殊字符限制，允许用户在标题中使用任何字符
        
        return errors;
    }
    
    /**
     * 批量验证提示词数组
     * @param {Array} prompts - 提示词数组
     * @returns {Object} 验证结果
     */
    static validatePrompts(prompts) {
        if (!Array.isArray(prompts)) {
            return {
                isValid: false,
                errors: ['提示词数据必须是数组格式'],
                validPrompts: [],
                invalidPrompts: []
            };
        }
        
        const validPrompts = [];
        const invalidPrompts = [];
        const allErrors = [];
        
        prompts.forEach((prompt, index) => {
            const validation = this.validatePrompt(prompt);
            
            if (validation.isValid) {
                validPrompts.push(prompt);
            } else {
                invalidPrompts.push({
                    index,
                    prompt,
                    errors: validation.errors
                });
                allErrors.push(`第${index + 1}条记录: ${validation.errors.join(', ')}`);
            }
        });
        
        // 检查ID重复
        const duplicateErrors = this.checkDuplicateIds(prompts);
        allErrors.push(...duplicateErrors);
        
        return {
            isValid: invalidPrompts.length === 0 && duplicateErrors.length === 0,
            errors: allErrors,
            validPrompts,
            invalidPrompts,
            summary: {
                total: prompts.length,
                valid: validPrompts.length,
                invalid: invalidPrompts.length
            }
        };
    }
    
    /**
     * 检查ID重复
     * @param {Array} prompts - 提示词数组
     * @returns {Array} 重复ID的错误信息
     */
    static checkDuplicateIds(prompts) {
        const errors = [];
        const idMap = new Map();
        
        prompts.forEach((prompt, index) => {
            if (prompt && prompt.id) {
                if (idMap.has(prompt.id)) {
                    errors.push(`发现重复ID: ${prompt.id} (位置: ${idMap.get(prompt.id) + 1}, ${index + 1})`);
                } else {
                    idMap.set(prompt.id, index);
                }
            }
        });
        
        return errors;
    }
    
    /**
     * 清理和标准化提示词数据
     * @param {Object} prompt - 原始提示词对象
     * @returns {Object} 清理后的提示词对象
     */
    static sanitizePrompt(prompt) {
        if (!prompt || typeof prompt !== 'object') {
            return null;
        }
        
        const sanitized = {
            id: prompt.id || generateUUID(),
            user_id: (prompt.user_id || 'local_user').toString().trim(),
            title: (prompt.title || '').toString().trim(),
            content: (prompt.content || '').toString().trim(),
            category: (prompt.category || '未分类').toString().trim(),
            created_at: prompt.created_at || new Date().toISOString(),
            updated_at: prompt.updated_at || new Date().toISOString()
        };
        
        // 确保时间格式正确
        if (!isValidISODate(sanitized.created_at)) {
            sanitized.created_at = new Date().toISOString();
        }
        if (!isValidISODate(sanitized.updated_at)) {
            sanitized.updated_at = new Date().toISOString();
        }
        
        // 确保ID是有效的UUID
        if (!isValidUUID(sanitized.id)) {
            sanitized.id = generateUUID();
        }
        
        return sanitized;
    }
    
    /**
     * 批量清理提示词数据
     * @param {Array} prompts - 原始提示词数组
     * @returns {Array} 清理后的提示词数组
     */
    static sanitizePrompts(prompts) {
        if (!Array.isArray(prompts)) {
            return [];
        }
        
        // 先清理每个提示词
        let sanitized = prompts
            .map(prompt => this.sanitizePrompt(prompt))
            .filter(prompt => prompt !== null);
        
        // 处理重复ID问题
        const idMap = new Map();
        const fixedPrompts = [];
        
        sanitized.forEach((prompt, index) => {
            if (idMap.has(prompt.id)) {
                // 发现重复ID，生成新的UUID
                console.warn(`修复重复ID: ${prompt.id} (位置: ${index + 1})`);
                prompt.id = generateUUID();
            }
            idMap.set(prompt.id, index);
            fixedPrompts.push(prompt);
        });
        
        return fixedPrompts;
    }
    
    /**
     * 验证导入数据格式
     * @param {Object} importData - 导入的数据
     * @returns {Object} 验证结果
     */
    static validateImportData(importData) {
        const errors = [];
        
        if (!importData || typeof importData !== 'object') {
            return {
                isValid: false,
                errors: ['导入数据必须是有效的对象']
            };
        }
        
        // 检查是否包含prompts字段
        if (!importData.prompts && !Array.isArray(importData)) {
            errors.push('导入数据必须包含prompts字段或者是提示词数组');
        }
        
        // 获取提示词数组
        const prompts = importData.prompts || importData;
        
        if (!Array.isArray(prompts)) {
            errors.push('提示词数据必须是数组格式');
            return {
                isValid: false,
                errors
            };
        }
        
        // 验证提示词数组
        const promptsValidation = this.validatePrompts(prompts);
        
        return {
            isValid: errors.length === 0 && promptsValidation.isValid,
            errors: [...errors, ...promptsValidation.errors],
            promptsValidation
        };
    }
}

/**
 * 验证ISO日期格式
 * @param {string} dateString - 日期字符串
 * @returns {boolean} 是否有效
 */
function isValidISODate(dateString) {
    if (typeof dateString !== 'string') {
        return false;
    }
    
    const date = new Date(dateString);
    return date instanceof Date && !isNaN(date.getTime()) && 
           dateString === date.toISOString();
}

/**
 * 验证必填字段
 * @param {Object} obj - 要验证的对象
 * @param {Array} requiredFields - 必填字段数组
 * @returns {Array} 缺失字段数组
 */
function validateRequiredFields(obj, requiredFields) {
    const missing = [];
    
    requiredFields.forEach(field => {
        if (!obj || obj[field] === undefined || obj[field] === null || obj[field] === '') {
            missing.push(field);
        }
    });
    
    return missing;
}

/**
 * 验证字符串长度
 * @param {string} str - 字符串
 * @param {number} min - 最小长度
 * @param {number} max - 最大长度
 * @returns {boolean} 是否有效
 */
function validateStringLength(str, min = 0, max = Infinity) {
    if (typeof str !== 'string') {
        return false;
    }
    
    return str.length >= min && str.length <= max;
}

// 导出供其他模块使用
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        DataValidator,
        PROMPT_VALIDATION_RULES,
        isValidISODate,
        validateRequiredFields,
        validateStringLength
    };
}