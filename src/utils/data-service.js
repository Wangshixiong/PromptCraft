/**
 * 数据服务模块 (Data Service)
 * 统一管理所有与 chrome.storage.local 的交互
 * 实现单一数据源 (Single Source of Truth) 架构
 * 
 * 功能说明：
 * - 封装所有 chrome.storage.local 的读写操作
 * - 提供统一的数据访问接口
 * - 实现错误处理和版本管理
 * - 确保数据状态的一致性和可预测性
 * 
 * @version 1.0.0
 * @author PromptCraft Team
 */

// 数据存储的键名常量
const STORAGE_KEYS = {
    PROMPTS: 'prompts',
    SCHEMA_VERSION: 'schema_version',
    THEME_MODE: 'themeMode',
    HAS_DATA: 'promptcraft_has_data',
    LOAD_ERROR: 'loadError',
    ERROR_MESSAGE: 'errorMessage'
};

// 当前数据模式版本
const CURRENT_SCHEMA_VERSION = 1;

/**
 * 数据服务类
 * 提供所有数据操作的统一接口
 */
class DataService {
    constructor() {
        this.isInitialized = false;
        this.initPromise = null;
    }

    /**
     * 初始化数据服务
     * 检查版本号，确保数据结构兼容性
     * @returns {Promise<void>}
     */
    async initialize() {
        if (this.isInitialized) {
            return;
        }

        if (this.initPromise) {
            return this.initPromise;
        }

        this.initPromise = this._doInitialize();
        await this.initPromise;
        this.isInitialized = true;
    }

    /**
     * 执行初始化逻辑
     * @private
     */
    async _doInitialize() {
        try {
            // 检查版本号
            const result = await this._getFromStorage([STORAGE_KEYS.SCHEMA_VERSION]);
            const currentVersion = result[STORAGE_KEYS.SCHEMA_VERSION];

            if (!currentVersion) {
                // 首次使用，设置版本号
                await this._setToStorage({ [STORAGE_KEYS.SCHEMA_VERSION]: CURRENT_SCHEMA_VERSION });
                console.log('数据服务初始化完成，设置版本号:', CURRENT_SCHEMA_VERSION);
            } else if (currentVersion !== CURRENT_SCHEMA_VERSION) {
                // 版本不匹配，可能需要数据迁移
                console.warn('检测到数据版本不匹配:', { current: currentVersion, expected: CURRENT_SCHEMA_VERSION });
                // 这里可以添加数据迁移逻辑
                await this._setToStorage({ [STORAGE_KEYS.SCHEMA_VERSION]: CURRENT_SCHEMA_VERSION });
            }
        } catch (error) {
            console.error('数据服务初始化失败:', error);
            throw new Error(`数据服务初始化失败: ${error.message}`);
        }
    }

    /**
     * 从存储中读取数据的底层方法
     * @param {string|string[]} keys - 要读取的键名
     * @returns {Promise<Object>} 读取的数据
     * @private
     */
    async _getFromStorage(keys) {
        return new Promise((resolve, reject) => {
            try {
                chrome.storage.local.get(keys, (result) => {
                    if (chrome.runtime.lastError) {
                        const error = new Error(`存储读取失败: ${chrome.runtime.lastError.message}`);
                        console.error('chrome.storage.local.get 错误:', chrome.runtime.lastError);
                        reject(error);
                        return;
                    }
                    resolve(result);
                });
            } catch (error) {
                console.error('存储读取异常:', error);
                reject(new Error(`存储读取异常: ${error.message}`));
            }
        });
    }

    /**
     * 向存储中写入数据的底层方法
     * @param {Object} data - 要写入的数据
     * @returns {Promise<void>}
     * @private
     */
    async _setToStorage(data) {
        return new Promise((resolve, reject) => {
            try {
                chrome.storage.local.set(data, () => {
                    if (chrome.runtime.lastError) {
                        const error = new Error(`存储写入失败: ${chrome.runtime.lastError.message}`);
                        console.error('chrome.storage.local.set 错误:', chrome.runtime.lastError);
                        reject(error);
                        return;
                    }
                    // 数据设置成功后，发送变更通知
                    this._notifyDataChange(data);
                    resolve();
                });
            } catch (error) {
                console.error('存储写入异常:', error);
                reject(new Error(`存储写入异常: ${error.message}`));
            }
        });
    }

    /**
     * 从存储中删除数据的底层方法
     * @param {string|string[]} keys - 要删除的键名
     * @returns {Promise<void>}
     * @private
     */
    async _removeFromStorage(keys) {
        return new Promise((resolve, reject) => {
            try {
                chrome.storage.local.remove(keys, () => {
                    if (chrome.runtime.lastError) {
                        const error = new Error(`存储删除失败: ${chrome.runtime.lastError.message}`);
                        console.error('chrome.storage.local.remove 错误:', chrome.runtime.lastError);
                        reject(error);
                        return;
                    }
                    resolve();
                });
            } catch (error) {
                console.error('存储删除异常:', error);
                reject(new Error(`存储删除异常: ${error.message}`));
            }
        });
    }

    // ==================== 提示词数据操作接口 ====================

    /**
     * 获取所有提示词
     * @returns {Promise<Array>} 提示词数组
     */
    async getAllPrompts() {
        await this.initialize();
        try {
            const result = await this._getFromStorage([STORAGE_KEYS.PROMPTS]);
            const prompts = result[STORAGE_KEYS.PROMPTS] || [];
            console.log('获取所有提示词:', prompts.length, '条');
            return prompts;
        } catch (error) {
            console.error('获取提示词失败:', error);
            throw error;
        }
    }

    /**
     * 添加新提示词
     * @param {Object} promptData - 提示词数据
     * @param {string} promptData.title - 标题
     * @param {string} promptData.content - 内容
     * @param {string} [promptData.category] - 分类
     * @returns {Promise<Object>} 添加后的提示词对象（包含ID）
     */
    async addPrompt(promptData) {
        await this.initialize();
        try {
            // 验证必填字段
            if (!promptData.title || !promptData.content) {
                throw new Error('标题和内容为必填字段');
            }

            // 获取现有提示词
            const prompts = await this.getAllPrompts();

            // 创建新提示词对象
            const newPrompt = {
                id: this._generateId(),
                title: promptData.title.trim(),
                content: promptData.content.trim(),
                category: promptData.category ? promptData.category.trim() : '',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };

            // 添加到数组
            prompts.push(newPrompt);

            // 保存到存储
            await this._setToStorage({ [STORAGE_KEYS.PROMPTS]: prompts });
            console.log('添加提示词成功:', newPrompt.id);

            return newPrompt;
        } catch (error) {
            console.error('添加提示词失败:', error);
            throw error;
        }
    }

    /**
     * 更新提示词
     * @param {string} id - 提示词ID
     * @param {Object} updates - 要更新的字段
     * @returns {Promise<Object>} 更新后的提示词对象
     */
    async updatePrompt(id, updates) {
        await this.initialize();
        try {
            const prompts = await this.getAllPrompts();
            const index = prompts.findIndex(p => p.id === id);

            if (index === -1) {
                throw new Error(`未找到ID为 ${id} 的提示词`);
            }

            // 更新提示词
            const updatedPrompt = {
                ...prompts[index],
                ...updates,
                updated_at: new Date().toISOString()
            };

            // 验证必填字段
            if (!updatedPrompt.title || !updatedPrompt.content) {
                throw new Error('标题和内容为必填字段');
            }

            prompts[index] = updatedPrompt;

            // 保存到存储
            await this._setToStorage({ [STORAGE_KEYS.PROMPTS]: prompts });
            console.log('更新提示词成功:', id);

            return updatedPrompt;
        } catch (error) {
            console.error('更新提示词失败:', error);
            throw error;
        }
    }

    /**
     * 删除提示词
     * @param {string} id - 提示词ID
     * @returns {Promise<boolean>} 是否删除成功
     */
    async deletePrompt(id) {
        await this.initialize();
        try {
            const prompts = await this.getAllPrompts();
            const index = prompts.findIndex(p => p.id === id);

            if (index === -1) {
                throw new Error(`未找到ID为 ${id} 的提示词`);
            }

            // 删除提示词
            prompts.splice(index, 1);

            // 保存到存储
            await this._setToStorage({ [STORAGE_KEYS.PROMPTS]: prompts });
            console.log('删除提示词成功:', id);

            return true;
        } catch (error) {
            console.error('删除提示词失败:', error);
            throw error;
        }
    }

    /**
     * 根据ID获取单个提示词
     * @param {string} id - 提示词ID
     * @returns {Promise<Object|null>} 提示词对象或null
     */
    async getPromptById(id) {
        await this.initialize();
        try {
            const prompts = await this.getAllPrompts();
            const prompt = prompts.find(p => p.id === id);
            return prompt || null;
        } catch (error) {
            console.error('获取提示词失败:', error);
            throw error;
        }
    }

    /**
     * 批量设置提示词（用于导入）
     * @param {Array} prompts - 提示词数组
     * @returns {Promise<void>}
     */
    async setAllPrompts(prompts) {
        await this.initialize();
        try {
            // 验证数据格式
            if (!Array.isArray(prompts)) {
                throw new Error('提示词数据必须是数组格式');
            }

            // 确保每个提示词都有必要的字段
            const validatedPrompts = prompts.map(prompt => {
                if (!prompt.title || !prompt.content) {
                    throw new Error('每个提示词都必须包含标题和内容');
                }
                return {
                    id: prompt.id || this._generateId(),
                    title: prompt.title.trim(),
                    content: prompt.content.trim(),
                    category: prompt.category ? prompt.category.trim() : '',
                    created_at: prompt.created_at || new Date().toISOString(),
                    updated_at: prompt.updated_at || new Date().toISOString()
                };
            });

            await this._setToStorage({ [STORAGE_KEYS.PROMPTS]: validatedPrompts });
            console.log('批量设置提示词成功:', validatedPrompts.length, '条');
        } catch (error) {
            console.error('批量设置提示词失败:', error);
            throw error;
        }
    }

    /**
     * 清空所有提示词
     * @returns {Promise<void>}
     */
    async clearAllPrompts() {
        await this.initialize();
        try {
            await this._removeFromStorage([STORAGE_KEYS.PROMPTS]);
            console.log('清空所有提示词成功');
        } catch (error) {
            console.error('清空提示词失败:', error);
            throw error;
        }
    }

    // ==================== 主题设置操作接口 ====================

    /**
     * 获取主题模式
     * @returns {Promise<string>} 主题模式 ('auto', 'light', 'dark')
     */
    async getThemeMode() {
        await this.initialize();
        try {
            const result = await this._getFromStorage([STORAGE_KEYS.THEME_MODE]);
            return result[STORAGE_KEYS.THEME_MODE] || 'auto';
        } catch (error) {
            console.error('获取主题模式失败:', error);
            return 'auto'; // 默认值
        }
    }

    /**
     * 设置主题模式
     * @param {string} mode - 主题模式 ('auto', 'light', 'dark')
     * @returns {Promise<void>}
     */
    async setThemeMode(mode) {
        await this.initialize();
        try {
            if (!['auto', 'light', 'dark'].includes(mode)) {
                throw new Error('无效的主题模式');
            }
            await this._setToStorage({ [STORAGE_KEYS.THEME_MODE]: mode });
            console.log('设置主题模式成功:', mode);
        } catch (error) {
            console.error('设置主题模式失败:', error);
            throw error;
        }
    }

    // ==================== 错误状态管理接口 ====================

    /**
     * 获取加载错误状态
     * @returns {Promise<Object>} 错误状态对象
     */
    async getLoadError() {
        await this.initialize();
        try {
            const result = await this._getFromStorage([STORAGE_KEYS.LOAD_ERROR, STORAGE_KEYS.ERROR_MESSAGE]);
            return {
                hasError: result[STORAGE_KEYS.LOAD_ERROR] || false,
                message: result[STORAGE_KEYS.ERROR_MESSAGE] || ''
            };
        } catch (error) {
            console.error('获取错误状态失败:', error);
            return { hasError: false, message: '' };
        }
    }

    /**
     * 设置加载错误状态
     * @param {boolean} hasError - 是否有错误
     * @param {string} message - 错误消息
     * @returns {Promise<void>}
     */
    async setLoadError(hasError, message = '') {
        await this.initialize();
        try {
            await this._setToStorage({
                [STORAGE_KEYS.LOAD_ERROR]: hasError,
                [STORAGE_KEYS.ERROR_MESSAGE]: message
            });
            console.log('设置错误状态:', { hasError, message });
        } catch (error) {
            console.error('设置错误状态失败:', error);
            throw error;
        }
    }

    /**
     * 清除错误状态
     * @returns {Promise<void>}
     */
    async clearLoadError() {
        await this.setLoadError(false, '');
    }

    // ==================== 数据状态管理接口 ====================

    /**
     * 检查是否有数据
     * @returns {Promise<boolean>} 是否有数据
     */
    async hasData() {
        await this.initialize();
        try {
            const result = await this._getFromStorage([STORAGE_KEYS.HAS_DATA]);
            return result[STORAGE_KEYS.HAS_DATA] || false;
        } catch (error) {
            console.error('检查数据状态失败:', error);
            return false;
        }
    }

    /**
     * 设置数据状态
     * @param {boolean} hasData - 是否有数据
     * @returns {Promise<void>}
     */
    async setHasData(hasData) {
        await this.initialize();
        try {
            await this._setToStorage({ [STORAGE_KEYS.HAS_DATA]: hasData });
            console.log('设置数据状态:', hasData);
        } catch (error) {
            console.error('设置数据状态失败:', error);
            throw error;
        }
    }

    // ==================== 工具方法 ====================

    /**
     * 生成唯一ID
     * @returns {string} 唯一标识符
     * @private
     */
    _generateId() {
        // 使用时间戳 + 随机数生成简单的唯一ID
        return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
    }

    /**
     * 获取存储使用情况
     * @returns {Promise<Object>} 存储使用情况
     */
    async getStorageInfo() {
        await this.initialize();
        try {
            return new Promise((resolve, reject) => {
                chrome.storage.local.getBytesInUse(null, (bytesInUse) => {
                    if (chrome.runtime.lastError) {
                        reject(new Error(chrome.runtime.lastError.message));
                        return;
                    }
                    resolve({
                        bytesInUse,
                        quota: chrome.storage.local.QUOTA_BYTES || 5242880, // 5MB 默认配额
                        usagePercentage: (bytesInUse / (chrome.storage.local.QUOTA_BYTES || 5242880)) * 100
                    });
                });
            });
        } catch (error) {
            console.error('获取存储信息失败:', error);
            throw error;
        }
    }

    /**
     * 添加存储变化监听器
     * @param {Function} callback 回调函数，接收 (changes, namespace) 参数
     * @returns {Function} 移除监听器的函数
     */
    addStorageChangeListener(callback) {
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.onChanged) {
            chrome.storage.onChanged.addListener(callback);
            // 返回移除监听器的函数
            return () => {
                chrome.storage.onChanged.removeListener(callback);
            };
        } else {
            console.warn('Chrome storage API 不可用，无法添加存储变化监听器');
            return () => {}; // 返回空函数
        }
    }

    /**
     * 移除存储变化监听器
     * @param {Function} callback 要移除的回调函数
     */
    removeStorageChangeListener(callback) {
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.onChanged) {
            chrome.storage.onChanged.removeListener(callback);
        }
    }

    /**
     * 发送数据变更通知
     * @param {Object} changedData 变更的数据
     * @private
     */
    _notifyDataChange(changedData) {
        try {
            if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
                // 发送数据变更通知给所有监听的组件
                chrome.runtime.sendMessage({
                    type: 'DATA_CHANGED',
                    data: changedData,
                    timestamp: Date.now()
                }, (response) => {
                    // 忽略响应错误，因为可能没有监听器
                    if (chrome.runtime.lastError) {
                        // 静默处理错误，避免控制台噪音
                    }
                });
            }
        } catch (error) {
            // 静默处理错误，避免影响主要功能
            console.debug('发送数据变更通知失败:', error);
        }
    }
}

// 创建全局数据服务实例
const dataService = new DataService();

// 导出数据服务实例和类
if (typeof module !== 'undefined' && module.exports) {
    // Node.js 环境
    module.exports = { DataService, dataService };
} else if (typeof window !== 'undefined') {
    // 浏览器环境
    window.DataService = DataService;
    window.dataService = dataService;
    
    // 提供向后兼容的函数接口
    window.getAllPrompts = () => dataService.getAllPrompts();
    window.addPrompt = (promptData) => dataService.addPrompt(promptData);
    window.updatePrompt = (id, updates) => dataService.updatePrompt(id, updates);
    window.deletePrompt = (id) => dataService.deletePrompt(id);
} else {
    // Service Worker环境
    globalThis.DataService = DataService;
    globalThis.dataService = dataService;
}