/**
 * 数据迁移工具 - 将现有数字ID转换为UUID格式
 * 用于Phase 1: Foundation的数据结构升级
 */

/**
 * 检查是否需要进行数据迁移
 * @param {Array} prompts - 提示词数组
 * @returns {boolean} 是否需要迁移
 */
function needsMigration(prompts) {
    if (!Array.isArray(prompts) || prompts.length === 0) {
        return false;
    }
    
    // 检查是否存在数字类型的ID
    return prompts.some(prompt => 
        typeof prompt.id === 'number' || 
        (typeof prompt.id === 'string' && /^\d+$/.test(prompt.id))
    );
}

/**
 * 迁移单个提示词对象
 * @param {Object} prompt - 提示词对象
 * @returns {Object} 迁移后的提示词对象
 */
function migratePrompt(prompt) {
    const migratedPrompt = { ...prompt };
    
    // 如果ID是数字或纯数字字符串，转换为UUID
    if (typeof prompt.id === 'number' || 
        (typeof prompt.id === 'string' && /^\d+$/.test(prompt.id))) {
        migratedPrompt.id = generateDeterministicUUID(prompt.id.toString());
    }
    
    // 确保必要字段存在
    if (!migratedPrompt.user_id) {
        migratedPrompt.user_id = 'local_user';
    }
    
    if (!migratedPrompt.created_at) {
        migratedPrompt.created_at = new Date().toISOString();
    }
    
    // 添加更新时间戳
    migratedPrompt.updated_at = new Date().toISOString();
    
    return migratedPrompt;
}

/**
 * 批量迁移提示词数据
 * @param {Array} prompts - 提示词数组
 * @returns {Array} 迁移后的提示词数组
 */
function migratePromptsData(prompts) {
    if (!Array.isArray(prompts)) {
        console.warn('Invalid prompts data for migration');
        return [];
    }
    
    return prompts.map(prompt => migratePrompt(prompt));
}

/**
 * 执行完整的数据迁移流程
 * @returns {Promise<boolean>} 迁移是否成功
 */
async function performDataMigration() {
    try {
        console.log('开始数据迁移检查...');
        
        // 从Chrome存储中获取现有数据
        const result = await chrome.storage.local.get(['prompts']);
        const existingPrompts = result.prompts || [];
        
        // 检查是否需要迁移
        if (!needsMigration(existingPrompts)) {
            console.log('数据已是最新格式，无需迁移');
            return true;
        }
        
        console.log(`发现 ${existingPrompts.length} 条数据需要迁移`);
        
        // 备份原始数据
        const backupKey = `prompts_backup_${Date.now()}`;
        await chrome.storage.local.set({ [backupKey]: existingPrompts });
        console.log(`原始数据已备份到: ${backupKey}`);
        
        // 执行迁移
        const migratedPrompts = migratePromptsData(existingPrompts);
        
        // 保存迁移后的数据
        await chrome.storage.local.set({ prompts: migratedPrompts });
        
        console.log('数据迁移完成！');
        console.log(`迁移了 ${migratedPrompts.length} 条记录`);
        
        return true;
    } catch (error) {
        console.error('数据迁移失败:', error);
        return false;
    }
}

/**
 * 清理旧的备份数据（保留最近3个备份）
 */
async function cleanupOldBackups() {
    try {
        const allData = await chrome.storage.local.get();
        const backupKeys = Object.keys(allData)
            .filter(key => key.startsWith('prompts_backup_'))
            .sort((a, b) => {
                const timestampA = parseInt(a.split('_')[2]);
                const timestampB = parseInt(b.split('_')[2]);
                return timestampB - timestampA; // 降序排列
            });
        
        // 保留最近3个备份，删除其余的
        if (backupKeys.length > 3) {
            const keysToRemove = backupKeys.slice(3);
            await chrome.storage.local.remove(keysToRemove);
            console.log(`清理了 ${keysToRemove.length} 个旧备份`);
        }
    } catch (error) {
        console.error('清理备份失败:', error);
    }
}

/**
 * 验证迁移后的数据完整性
 * @param {Array} prompts - 迁移后的提示词数组
 * @returns {boolean} 数据是否有效
 */
function validateMigratedData(prompts) {
    if (!Array.isArray(prompts)) {
        return false;
    }
    
    return prompts.every(prompt => {
        // 检查必要字段
        if (!prompt.id || !prompt.title || !prompt.content) {
            return false;
        }
        
        // 检查ID格式（应该是UUID）
        if (!isValidUUID(prompt.id)) {
            return false;
        }
        
        return true;
    });
}

// 导出函数供其他模块使用
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        needsMigration,
        migratePrompt,
        migratePromptsData,
        performDataMigration,
        cleanupOldBackups,
        validateMigratedData
    };
}