/**
 * 本地存储管理模块
 * Phase 1: Foundation - 本地优先的数据存储管理
 */

/**
 * 本地存储键名常量
 */
const STORAGE_KEYS = {
    PROMPTS: 'prompts',
    USER_SETTINGS: 'userSettings',
    THEME: 'theme',
    LAST_SYNC: 'lastSync',
    SYNC_STATUS: 'syncStatus'
};

/**
 * 本地存储管理类
 */
class LocalStorageManager {
    constructor() {
        this.storage = chrome.storage.local;
    }

    /**
     * 获取所有提示词
     * @returns {Promise<Array>} 提示词数组
     */
    async getPrompts() {
        try {
            const result = await this.storage.get([STORAGE_KEYS.PROMPTS]);
            return result[STORAGE_KEYS.PROMPTS] || [];
        } catch (error) {
            console.error('获取提示词失败:', error);
            return [];
        }
    }

    /**
     * 保存提示词数组
     * @param {Array} prompts - 提示词数组
     * @returns {Promise<boolean>} 是否保存成功
     */
    async savePrompts(prompts) {
        try {
            await this.storage.set({ [STORAGE_KEYS.PROMPTS]: prompts });
            console.log(`保存了 ${prompts.length} 条提示词`);
            return true;
        } catch (error) {
            console.error('保存提示词失败:', error);
            return false;
        }
    }

    /**
     * 添加单个提示词
     * @param {Object} prompt - 提示词对象
     * @returns {Promise<boolean>} 是否添加成功
     */
    async addPrompt(prompt) {
        try {
            const prompts = await this.getPrompts();
            
            // 确保提示词有必要的字段
            const newPrompt = {
                id: prompt.id || generateUUID(),
                user_id: prompt.user_id || 'local_user',
                title: prompt.title,
                content: prompt.content,
                category: prompt.category || '未分类',
                created_at: prompt.created_at || new Date().toISOString(),
                updated_at: new Date().toISOString()
            };
            
            prompts.unshift(newPrompt);
            return await this.savePrompts(prompts);
        } catch (error) {
            console.error('添加提示词失败:', error);
            return false;
        }
    }

    /**
     * 更新单个提示词
     * @param {string} id - 提示词ID
     * @param {Object} updates - 更新的字段
     * @returns {Promise<boolean>} 是否更新成功
     */
    async updatePrompt(id, updates) {
        try {
            const prompts = await this.getPrompts();
            const index = prompts.findIndex(p => p.id === id);
            
            if (index === -1) {
                console.error('未找到要更新的提示词:', id);
                return false;
            }
            
            prompts[index] = {
                ...prompts[index],
                ...updates,
                updated_at: new Date().toISOString()
            };
            
            return await this.savePrompts(prompts);
        } catch (error) {
            console.error('更新提示词失败:', error);
            return false;
        }
    }

    /**
     * 删除单个提示词
     * @param {string} id - 提示词ID
     * @returns {Promise<boolean>} 是否删除成功
     */
    async deletePrompt(id) {
        try {
            const prompts = await this.getPrompts();
            const filteredPrompts = prompts.filter(p => p.id !== id);
            
            if (filteredPrompts.length === prompts.length) {
                console.error('未找到要删除的提示词:', id);
                return false;
            }
            
            return await this.savePrompts(filteredPrompts);
        } catch (error) {
            console.error('删除提示词失败:', error);
            return false;
        }
    }

    /**
     * 根据ID获取单个提示词
     * @param {string} id - 提示词ID
     * @returns {Promise<Object|null>} 提示词对象或null
     */
    async getPromptById(id) {
        try {
            const prompts = await this.getPrompts();
            return prompts.find(p => p.id === id) || null;
        } catch (error) {
            console.error('获取提示词失败:', error);
            return null;
        }
    }

    /**
     * 搜索提示词
     * @param {string} searchTerm - 搜索关键词
     * @param {string} category - 分类过滤（可选）
     * @returns {Promise<Array>} 匹配的提示词数组
     */
    async searchPrompts(searchTerm, category = null) {
        try {
            const prompts = await this.getPrompts();
            
            return prompts.filter(prompt => {
                // 分类过滤
                if (category && prompt.category !== category) {
                    return false;
                }
                
                // 关键词搜索
                if (searchTerm) {
                    const term = searchTerm.toLowerCase();
                    return prompt.title.toLowerCase().includes(term) ||
                           prompt.content.toLowerCase().includes(term) ||
                           prompt.category.toLowerCase().includes(term);
                }
                
                return true;
            });
        } catch (error) {
            console.error('搜索提示词失败:', error);
            return [];
        }
    }

    /**
     * 获取所有分类
     * @returns {Promise<Array>} 分类数组
     */
    async getCategories() {
        try {
            const prompts = await this.getPrompts();
            const categories = [...new Set(prompts.map(p => p.category))]
                .filter(cat => cat && cat.trim())
                .sort();
            return categories;
        } catch (error) {
            console.error('获取分类失败:', error);
            return [];
        }
    }

    /**
     * 获取用户设置
     * @returns {Promise<Object>} 用户设置对象
     */
    async getUserSettings() {
        try {
            const result = await this.storage.get([STORAGE_KEYS.USER_SETTINGS]);
            return result[STORAGE_KEYS.USER_SETTINGS] || {};
        } catch (error) {
            console.error('获取用户设置失败:', error);
            return {};
        }
    }

    /**
     * 保存用户设置
     * @param {Object} settings - 用户设置对象
     * @returns {Promise<boolean>} 是否保存成功
     */
    async saveUserSettings(settings) {
        try {
            await this.storage.set({ [STORAGE_KEYS.USER_SETTINGS]: settings });
            return true;
        } catch (error) {
            console.error('保存用户设置失败:', error);
            return false;
        }
    }

    /**
     * 获取主题设置
     * @returns {Promise<string>} 主题名称
     */
    async getTheme() {
        try {
            const result = await this.storage.get([STORAGE_KEYS.THEME]);
            return result[STORAGE_KEYS.THEME] || 'light';
        } catch (error) {
            console.error('获取主题设置失败:', error);
            return 'light';
        }
    }

    /**
     * 保存主题设置
     * @param {string} theme - 主题名称
     * @returns {Promise<boolean>} 是否保存成功
     */
    async saveTheme(theme) {
        try {
            await this.storage.set({ [STORAGE_KEYS.THEME]: theme });
            return true;
        } catch (error) {
            console.error('保存主题设置失败:', error);
            return false;
        }
    }

    /**
     * 清空所有数据
     * @returns {Promise<boolean>} 是否清空成功
     */
    async clearAll() {
        try {
            await this.storage.clear();
            console.log('已清空所有本地数据');
            return true;
        } catch (error) {
            console.error('清空数据失败:', error);
            return false;
        }
    }

    /**
     * 获取存储使用情况
     * @returns {Promise<Object>} 存储使用情况
     */
    async getStorageInfo() {
        try {
            const bytesInUse = await chrome.storage.local.getBytesInUse();
            const quota = chrome.storage.local.QUOTA_BYTES;
            
            return {
                used: bytesInUse,
                total: quota,
                percentage: Math.round((bytesInUse / quota) * 100),
                available: quota - bytesInUse
            };
        } catch (error) {
            console.error('获取存储信息失败:', error);
            return {
                used: 0,
                total: 0,
                percentage: 0,
                available: 0
            };
        }
    }

    /**
     * 导出所有数据
     * @returns {Promise<Object>} 导出的数据对象
     */
    async exportData() {
        try {
            const prompts = await this.getPrompts();
            const userSettings = await this.getUserSettings();
            const theme = await this.getTheme();
            
            return {
                exportTime: new Date().toISOString(),
                version: '1.0.0',
                prompts: prompts,
                userSettings: userSettings,
                theme: theme
            };
        } catch (error) {
            console.error('导出数据失败:', error);
            return {
                exportTime: new Date().toISOString(),
                version: '1.0.0',
                prompts: [],
                userSettings: {},
                theme: 'light'
            };
        }
    }

    /**
     * 导入数据
     * @param {Object} importData - 导入的数据对象
     * @returns {Promise<boolean>} 是否导入成功
     */
    async importData(importData) {
        try {
            // 支持新格式和旧格式
            let prompts = [];
            let userSettings = {};
            let theme = 'light';
            
            if (importData.prompts) {
                // 新格式：直接包含prompts字段
                prompts = importData.prompts;
                userSettings = importData.userSettings || {};
                theme = importData.theme || 'light';
            } else if (importData.data) {
                // 旧格式：数据在data字段中
                prompts = importData.data.prompts || [];
                userSettings = importData.data.userSettings || {};
                theme = importData.data.theme || 'light';
            } else {
                throw new Error('无效的导入数据格式');
            }
            
            // 备份当前数据
            const backupData = await this.exportData();
            const backupKey = `backup_${Date.now()}`;
            await this.storage.set({ [backupKey]: backupData });
            
            // 导入新数据
            if (prompts.length > 0) {
                await this.savePrompts(prompts);
            }
            if (Object.keys(userSettings).length > 0) {
                await this.saveUserSettings(userSettings);
            }
            await this.saveTheme(theme);
            
            console.log('数据导入成功');
            return true;
        } catch (error) {
            console.error('导入数据失败:', error);
            return false;
        }
    }
}

// 创建全局实例
const localStorageManager = new LocalStorageManager();

// 导出供其他模块使用
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        LocalStorageManager,
        localStorageManager,
        STORAGE_KEYS
    };
}