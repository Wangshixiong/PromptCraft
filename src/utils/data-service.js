/**
 * 数据服务模块
 * 负责管理Chrome插件的本地数据存储，包括提示词、主题设置等
 * 提供统一的数据访问接口，支持数据验证、错误处理和变更通知
 * 集成云端同步功能，确保数据在本地和云端的一致性
 * 
 * 主要功能：
 * - 提示词的增删改查操作
 * - 主题设置管理
 * - 错误状态管理
 * - 数据状态跟踪
 * - 存储使用情况监控
 * - 数据变更通知
 * - 云端同步集成
 * 
 * @author PromptCraft Team
 * @version 1.1.0
 */

// 数据存储的键名常量
const STORAGE_KEYS = {
    PROMPTS: 'prompts',                    // 用户的个人提示词
    DEFAULT_TEMPLATES_LOADED: 'default_templates_loaded',  // 是否已加载默认模板
    SCHEMA_VERSION: 'schema_version',
    THEME_MODE: 'themeMode',
    PP_COMMAND_ENABLED: 'ppCommandEnabled', // PP命令唤醒功能开关
    HAS_DATA: 'promptcraft_has_data',
    LOAD_ERROR: 'loadError',
    ERROR_MESSAGE: 'errorMessage',
    // 同步状态相关
    SYNC_STATUS: 'syncStatus',
    LAST_SYNC_TIME: 'lastSyncTime',
    SYNC_QUEUE: 'syncQueue',
    SYNC_RETRY_COUNT: 'syncRetryCount',
    LANGUAGE: 'language'
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
        this.syncService = null; // 同步服务实例
        this.batchMode = false; // 批量操作模式
        this.pendingNotifications = []; // 待发送的通知队列
    }

    /**
     * 设置同步服务实例
     * @param {Object} syncService - 同步服务实例
     */
    setSyncService(syncService) {
        this.syncService = syncService;
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
                console.error('存储读取异常:', {
                    error: error.message,
                    stack: error.stack,
                    keys: keys,
                    timestamp: new Date().toISOString()
                });
                reject(new Error(`存储读取异常: ${error.message}`));
            }
        });
    }

    /**
     * 向存储中写入数据的底层方法
     * @param {Object} data - 要写入的数据
     * @param {boolean} [notifyChange=true] - 是否触发数据变更通知
     * @returns {Promise<void>}
     * @private
     */
    async _setToStorage(data, notifyChange = true) {
        return new Promise((resolve, reject) => {
            try {
                chrome.storage.local.set(data, () => {
                    if (chrome.runtime.lastError) {
                        const error = new Error(`存储写入失败: ${chrome.runtime.lastError.message}`);
                        console.error('chrome.storage.local.set 错误:', {
                            error: chrome.runtime.lastError,
                            dataKeys: Object.keys(data),
                            timestamp: new Date().toISOString()
                        });
                        reject(error);
                        return;
                    }
                    // 根据参数决定是否发送变更通知
                    if (notifyChange) {
                        this._notifyDataChange(data);
                    }
                    resolve();
                });
            } catch (error) {
                console.error('存储写入异常:', error);
                reject(new Error(`存储写入异常: ${error.message}`));
            }
        });
    }

    /**
     * 原子性存储操作
     * 将多个存储操作合并为一次操作，确保数据一致性
     * @param {Array<Object>} operations - 存储操作数组
     * @param {boolean} [notifyChange=true] - 是否触发数据变更通知
     * @returns {Promise<void>}
     * @private
     */
    async _atomicStorageOperation(operations, notifyChange = true) {
        await this.initialize();
        
        try {
            // 将多个存储操作合并为一次操作
            const combinedData = {};
            
            for (const op of operations) {
                Object.assign(combinedData, op);
            }
            
            await this._setToStorage(combinedData, notifyChange);
            
        } catch (error) {
            console.error('DataService: 原子性存储操作失败:', error);
            throw error;
        }
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
     * 获取所有提示词（仅返回未删除的）
     * @returns {Promise<Array>} 提示词数组
     */
    async getAllPrompts() {
        await this.initialize();
        try {
            const result = await this._getFromStorage([STORAGE_KEYS.PROMPTS]);
            const allPrompts = result[STORAGE_KEYS.PROMPTS] || [];
            // 过滤掉已删除的提示词
            const activePrompts = allPrompts.filter(prompt => !prompt.is_deleted);
            return activePrompts;
        } catch (error) {
            console.error('获取提示词失败:', error);
            throw error;
        }
    }

    /**
     * 获取所有提示词（包括已删除的）
     * 主要用于同步服务
     * @returns {Promise<Array>} 所有提示词数组
     */
    async getAllPromptsIncludingDeleted() {
        await this.initialize();
        try {
            const result = await this._getFromStorage([STORAGE_KEYS.PROMPTS]);
            const allPrompts = result[STORAGE_KEYS.PROMPTS] || [];
            return allPrompts;
        } catch (error) {
            console.error('获取所有提示词失败:', error);
            throw error;
        }
    }

    /**
     * 添加新提示词
     * @param {Object} promptData - 提示词数据
     * @param {string} promptData.title - 标题
     * @param {string} promptData.content - 内容
     * @param {Array<string>} [promptData.tags] - 标签数组
     * @param {string} [promptData.author] - 作者
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
                tags: Array.isArray(promptData.tags) ? promptData.tags.filter(tag => tag && tag.trim()).map(tag => tag.trim()) : [],
                author: promptData.author ? promptData.author.trim() : '',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };

            // 添加到数组
            prompts.push(newPrompt);

            // 保存到存储
            await this._setToStorage({ [STORAGE_KEYS.PROMPTS]: prompts });

            // 触发云端同步
            await this._triggerSync('create', newPrompt);

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

            // 触发云端同步
            await this._triggerSync('update', updatedPrompt);

            return updatedPrompt;
        } catch (error) {
            console.error('更新提示词失败:', error);
            throw error;
        }
    }

    /**
     * 保存提示词（智能判断新增或更新）
     * @param {Object} promptData - 提示词数据
     * @returns {Promise<Object>} 保存后的提示词对象
     */
    async savePrompt(promptData) {
        await this.initialize();
        try {
            // 验证必填字段
            if (!promptData.title || !promptData.content) {
                throw new Error('标题和内容为必填字段');
            }

            const prompts = await this.getAllPrompts();
            const existingIndex = prompts.findIndex(p => p.id === promptData.id);

            if (existingIndex !== -1) {
                // 更新现有提示词
                const updatedPrompt = {
                    ...prompts[existingIndex],
                    ...promptData,
                    updated_at: new Date().toISOString()
                };
                
                prompts[existingIndex] = updatedPrompt;
                await this._setToStorage({ [STORAGE_KEYS.PROMPTS]: prompts });
                
                // 触发数据变更通知，让界面刷新
                this._notifyDataChange(prompts);
                
                // 不触发同步，因为这通常是从云端同步过来的数据
                return updatedPrompt;
            } else {
                // 添加新提示词
                const newPrompt = {
                    ...promptData,
                    id: promptData.id || this._generateId(),
                    created_at: promptData.created_at || new Date().toISOString(),
                    updated_at: promptData.updated_at || new Date().toISOString()
                };
                
                prompts.push(newPrompt);
                await this._setToStorage({ [STORAGE_KEYS.PROMPTS]: prompts });
                
                // 触发数据变更通知，让界面刷新
                this._notifyDataChange(prompts);
                
                // 不触发同步，因为这通常是从云端同步过来的数据
                return newPrompt;
            }
        } catch (error) {
            console.error('保存提示词失败:', error);
            throw error;
        }
    }

    /**
     * 触发云端同步
     * @param {string} operation - 操作类型 ('create', 'update', 'delete')
     * @param {Object} promptData - 提示词数据
     * @private
     */
    async _triggerSync(operation, promptData) {
        try {
            // 检查是否有同步服务实例
            if (!this.syncService) {
                console.debug('DataService: 同步服务未设置，添加到队列等待后续同步');
                await this._addToSyncQueue(operation, promptData);
                return;
            }

            // 检查用户是否已登录（避免本地用户触发同步）
            if (!this.syncService || !this.syncService.authService) {
                console.debug('DataService: 同步服务或认证服务未设置，跳过同步');
                return;
            }
            
            const currentUser = await this.syncService.authService.getCurrentUser();
            if (!currentUser || currentUser.id === 'local-user') {
                console.debug('DataService: 用户未登录或为本地用户，跳过同步');
                return;
            }

            // 设置同步状态为进行中
            await this.setSyncStatus('syncing');

            // 异步执行同步操作，不阻塞UI
            this._performSyncOperation(operation, promptData)
                .then(async () => {
                    await this.setSyncStatus('success');
                    await this.setLastSyncTime(new Date().toISOString());
                })
                .catch(async (error) => {
                    await this.setSyncStatus('error');
                    console.error('DataService: 同步操作失败:', error);
                    // 添加到重试队列
                    await this._addToSyncQueue(operation, promptData, error.message);
                });

        } catch (error) {
            // 同步失败不应该影响本地操作
            console.error('DataService: 触发同步失败:', error);
            await this.setSyncStatus('error');
        }
    }

    /**
     * 删除提示词（软删除）
     * @param {string} id - 提示词ID
     * @param {boolean} throwOnNotFound - 找不到时是否抛出错误，默认true
     * @returns {Promise<boolean>} 是否删除成功
     */
    async deletePrompt(id, throwOnNotFound = true) {
        await this.initialize();
        try {
            // 获取所有提示词（包括已删除的）
            const result = await this._getFromStorage([STORAGE_KEYS.PROMPTS]);
            const allPrompts = result[STORAGE_KEYS.PROMPTS] || [];
            const index = allPrompts.findIndex(p => p.id === id && !p.is_deleted);

            if (index === -1) {
                // 【修复】添加详细的调试信息
                const existingPrompt = allPrompts.find(p => p.id === id);
                if (existingPrompt) {
                    console.warn(`提示词 ${id} 已被标记为删除，跳过重复删除`);
                    return true; // 已删除的提示词视为删除成功
                } else {
                    console.error(`提示词 ${id} 不存在于数据库中`);
                }
                
                if (throwOnNotFound) {
                    throw new Error(`未找到ID为 ${id} 的提示词`);
                } else {
                    return false;
                }
            }

            // 获取要删除的提示词信息（用于同步）
            const deletedPrompt = allPrompts[index];

            // 软删除：标记为已删除，而不是物理删除
            allPrompts[index] = {
                ...deletedPrompt,
                is_deleted: true,
                updated_at: new Date().toISOString()
            };

            // 保存到存储
            await this._setToStorage({ [STORAGE_KEYS.PROMPTS]: allPrompts });
            
            // 获取未删除的提示词用于UI刷新
            const activePrompts = allPrompts.filter(p => !p.is_deleted);
            
            // 触发数据变更通知，让界面刷新（无论是用户删除还是云端同步删除）
            this._notifyDataChange(activePrompts);

            // 触发云端同步（只有在用户主动删除时才触发）
            if (throwOnNotFound) {
                await this._triggerSync('delete', { id, ...deletedPrompt });
            }

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
     * 获取所有标签
     * @returns {Promise<Array<string>>} 去重后的标签数组
     */
    async getAllTags() {
        await this.initialize();
        try {
            const prompts = await this.getAllPrompts();
            const tagSet = new Set();
            
            prompts.forEach(prompt => {
                // 处理新的tags字段（数组格式）
                if (Array.isArray(prompt.tags)) {
                    prompt.tags.forEach(tag => {
                        if (tag && typeof tag === 'string' && tag.trim()) {
                            tagSet.add(tag.trim());
                        }
                    });
                }
                // 兼容旧的category字段（字符串格式）
                else if (prompt.category && typeof prompt.category === 'string' && prompt.category.trim()) {
                    tagSet.add(prompt.category.trim());
                }
            });
            
            // 转换为数组并排序
            return Array.from(tagSet).sort();
        } catch (error) {
            console.error('获取所有标签失败:', error);
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
                
                // 处理数据迁移：如果存在category字段但没有tags字段，将category转换为tags
                let tags = [];
                if (Array.isArray(prompt.tags)) {
                    tags = prompt.tags.filter(tag => tag && tag.trim()).map(tag => tag.trim());
                } else if (prompt.category && prompt.category.trim()) {
                    tags = [prompt.category.trim()];
                }
                
                return {
                    id: prompt.id || this._generateId(),
                    title: prompt.title.trim(),
                    content: prompt.content.trim(),
                    tags: tags,
                    author: prompt.author ? prompt.author.trim() : '',
                    created_at: prompt.created_at || new Date().toISOString(),
                    updated_at: prompt.updated_at || new Date().toISOString(),
                    is_deleted: prompt.is_deleted || false
                };
            });

            // 在批量模式下，禁用自动通知，手动控制通知时机
            const shouldNotify = !this.batchMode;
            await this._setToStorage({ [STORAGE_KEYS.PROMPTS]: validatedPrompts }, shouldNotify);
            
            // 如果不在批量模式下，手动触发数据变更通知
            if (shouldNotify) {
                this._notifyDataChange({ [STORAGE_KEYS.PROMPTS]: validatedPrompts });
            }
            

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
        } catch (error) {
            console.error('设置主题模式失败:', error);
            throw error;
        }
    }

    async getLanguage() {
        await this.initialize();
        try {
            const result = await this._getFromStorage([STORAGE_KEYS.LANGUAGE]);
            return result[STORAGE_KEYS.LANGUAGE] || null;
        } catch (error) {
            return null;
        }
    }

    async setLanguage(lang) {
        await this.initialize();
        try {
            await this._setToStorage({ [STORAGE_KEYS.LANGUAGE]: lang });
        } catch (error) {
            throw error;
        }
    }

    // ==================== PP命令开关设置接口 ====================

    /**
     * 获取PP命令唤醒功能开关状态
     * @returns {Promise<boolean>} PP命令是否启用
     */
    async getPpCommandEnabled() {
        await this.initialize();
        try {
            const result = await this._getFromStorage([STORAGE_KEYS.PP_COMMAND_ENABLED]);
            return result[STORAGE_KEYS.PP_COMMAND_ENABLED] !== false; // 默认为true，保持向后兼容
        } catch (error) {
            console.error('获取PP命令开关状态失败:', error);
            return true; // 默认启用
        }
    }

    /**
     * 设置PP命令唤醒功能开关状态
     * @param {boolean} enabled - 是否启用PP命令
     * @returns {Promise<void>}
     */
    async setPpCommandEnabled(enabled) {
        await this.initialize();
        try {
            await this._setToStorage({ [STORAGE_KEYS.PP_COMMAND_ENABLED]: Boolean(enabled) });
        } catch (error) {
            console.error('设置PP命令开关状态失败:', error);
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
        } catch (error) {
            console.error('设置数据状态失败:', error);
            throw error;
        }
    }

    // ==================== 同步状态管理接口 ====================

    /**
     * 获取同步状态
     * @returns {Promise<string>} 同步状态 ('idle', 'syncing', 'success', 'error')
     */
    async getSyncStatus() {
        await this.initialize();
        try {
            const result = await this._getFromStorage([STORAGE_KEYS.SYNC_STATUS]);
            return result[STORAGE_KEYS.SYNC_STATUS] || 'idle';
        } catch (error) {
            console.error('获取同步状态失败:', error);
            return 'idle';
        }
    }

    /**
     * 设置同步状态
     * @param {string} status - 同步状态
     * @returns {Promise<void>}
     */
    async setSyncStatus(status) {
        await this.initialize();
        try {
            await this._setToStorage({ [STORAGE_KEYS.SYNC_STATUS]: status });
        } catch (error) {
            console.error('设置同步状态失败:', error);
            throw error;
        }
    }

    /**
     * 获取最后同步时间
     * @returns {Promise<string|null>} 最后同步时间的ISO字符串
     */
    async getLastSyncTime() {
        await this.initialize();
        try {
            const result = await this._getFromStorage([STORAGE_KEYS.LAST_SYNC_TIME]);
            return result[STORAGE_KEYS.LAST_SYNC_TIME] || null;
        } catch (error) {
            console.error('获取最后同步时间失败:', error);
            return null;
        }
    }

    /**
     * 设置最后同步时间
     * @param {string} timestamp - ISO时间戳
     * @returns {Promise<void>}
     */
    async setLastSyncTime(timestamp) {
        await this.initialize();
        try {
            await this._setToStorage({ [STORAGE_KEYS.LAST_SYNC_TIME]: timestamp });
        } catch (error) {
            console.error('设置最后同步时间失败:', error);
            throw error;
        }
    }

    /**
     * 获取同步队列
     * @returns {Promise<Array>} 待同步的操作队列
     */
    async getSyncQueue() {
        await this.initialize();
        try {
            const result = await this._getFromStorage([STORAGE_KEYS.SYNC_QUEUE]);
            return result[STORAGE_KEYS.SYNC_QUEUE] || [];
        } catch (error) {
            console.error('获取同步队列失败:', error);
            return [];
        }
    }

    /**
     * 设置同步队列
     * @param {Array} queue - 同步队列
     * @returns {Promise<void>}
     */
    async setSyncQueue(queue) {
        await this.initialize();
        try {
            await this._setToStorage({ [STORAGE_KEYS.SYNC_QUEUE]: queue });
        } catch (error) {
            console.error('设置同步队列失败:', error);
            throw error;
        }
    }

    /**
     * 添加操作到同步队列
     * @param {Object} operation - 同步操作对象
     * @returns {Promise<void>}
     */
    async addToSyncQueue(operation) {
        try {
            const queue = await this.getSyncQueue();
            queue.push({
                ...operation,
                timestamp: new Date().toISOString(),
                retryCount: 0
            });
            await this.setSyncQueue(queue);
        } catch (error) {
            console.error('添加到同步队列失败:', error);
            throw error;
        }
    }

    /**
     * 从同步队列移除操作
     * @param {string} operationId - 操作ID
     * @returns {Promise<void>}
     */
    async removeFromSyncQueue(operationId) {
        try {
            const queue = await this.getSyncQueue();
            const filteredQueue = queue.filter(op => op.id !== operationId);
            await this.setSyncQueue(filteredQueue);
        } catch (error) {
            console.error('从同步队列移除操作失败:', error);
            throw error;
        }
    }

    // ==================== 工具方法 ====================

    /**
     * 生成唯一ID
     * @returns {string} 唯一ID
     * @private
     */
    _generateId() {
        // 使用项目中的UUID工具模块
        return UUIDUtils.generateUUID();
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
     * 触发云端同步
     * @param {string} operation - 操作类型 ('create', 'update', 'delete')
     * @param {Object} promptData - 提示词数据
     * @private
     */
    async _triggerSync(operation, promptData) {
        try {
            // 检查是否有同步服务实例
            if (!this.syncService) {
                console.debug('DataService: 同步服务未设置，添加到队列等待后续同步');
                await this._addToSyncQueue(operation, promptData);
                return;
            }

            // 检查用户是否已登录（避免本地用户触发同步）
            if (!this.syncService || !this.syncService.authService) {
                console.debug('DataService: 同步服务或认证服务未设置，跳过同步');
                return;
            }
            
            const currentUser = await this.syncService.authService.getCurrentUser();
            if (!currentUser || currentUser.id === 'local-user') {
                console.debug('DataService: 用户未登录或为本地用户，跳过同步');
                return;
            }

            // 设置同步状态为进行中
            await this.setSyncStatus('syncing');

            // 异步执行同步操作，不阻塞UI
            this._performSyncOperation(operation, promptData)
                .then(async () => {
                    await this.setSyncStatus('success');
                    await this.setLastSyncTime(new Date().toISOString());
                    
                })
                .catch(async (error) => {
                    await this.setSyncStatus('error');
                    console.error('DataService: 同步操作失败:', error);
                    // 添加到重试队列
                    await this._addToSyncQueue(operation, promptData, error.message);
                });

        } catch (error) {
            // 同步失败不应该影响本地操作
            console.error('DataService: 触发同步失败:', error);
            await this.setSyncStatus('error');
        }
    }

    /**
     * 执行具体的同步操作
     * @param {string} operation - 操作类型
     * @param {Object} promptData - 提示词数据
     * @private
     */
    async _performSyncOperation(operation, promptData) {
        switch (operation) {
            case 'create':
                await this.syncService.createPrompt(promptData);
                break;
            case 'update':
                await this.syncService.updatePrompt(promptData);
                break;
            case 'delete':
                await this.syncService.deletePrompt(promptData.id);
                break;
            default:
                throw new Error(`未知的同步操作类型: ${operation}`);
        }
    }

    /**
     * 添加操作到同步队列（内部方法）
     * @param {string} operation - 操作类型
     * @param {Object} promptData - 提示词数据
     * @param {string} errorMessage - 错误信息（可选）
     * @private
     */
    async _addToSyncQueue(operation, promptData, errorMessage = null) {
        try {
            const operationId = this._generateId();
            const queueItem = {
                id: operationId,
                operation,
                promptData,
                errorMessage,
                timestamp: new Date().toISOString(),
                retryCount: 0
            };
            
            await this.addToSyncQueue(queueItem);
        } catch (error) {
            console.error('DataService: 添加到同步队列失败:', error);
        }
    }

    /**
     * 检查是否已加载默认模板
     * @returns {Promise<boolean>}
     */
    async isDefaultTemplatesLoaded() {
        await this.initialize();
        try {
            const result = await this._getFromStorage([STORAGE_KEYS.DEFAULT_TEMPLATES_LOADED]);
            return result[STORAGE_KEYS.DEFAULT_TEMPLATES_LOADED] || false;
        } catch (error) {
            console.error('检查默认模板加载状态失败:', error);
            return false;
        }
    }

    /**
     * 验证数据一致性
     * 检查hasData标志与实际数据是否一致
     * @returns {Promise<boolean>} 数据是否一致
     */
    async validateDataConsistency() {
        await this.initialize();
        
        try {
            const hasDataFlag = await this.hasData();
            const actualPrompts = await this.getAllPrompts();
            

            
            // 检查数据一致性
            if (hasDataFlag && (!actualPrompts || actualPrompts.length === 0)) {
                console.warn('DataService: 检测到数据不一致，hasData=true但prompts为空');
                return false;
            }
            
            if (!hasDataFlag && actualPrompts && actualPrompts.length > 0) {
                console.warn('DataService: 检测到数据不一致，hasData=false但prompts存在');
                return false;
            }
            

            return true;
        } catch (error) {
            console.error('DataService: 数据一致性检查失败:', error);
            return false;
        }
    }

    /**
     * 标记默认模板已加载
     * @returns {Promise<void>}
     */
    async setDefaultTemplatesLoaded() {
        await this.initialize();
        try {
            await this._setToStorage({ [STORAGE_KEYS.DEFAULT_TEMPLATES_LOADED]: true });
        } catch (error) {
            console.error('标记默认模板加载状态失败:', error);
            throw error;
        }
    }

    /**
     * 清除默认模板已加载标记，允许重新加载默认提示词
     * @returns {Promise<void>}
     */
    async clearDefaultTemplatesLoaded() {
        await this.initialize();
        try {
            await this._setToStorage({ [STORAGE_KEYS.DEFAULT_TEMPLATES_LOADED]: false });
        } catch (error) {
            console.error('清除默认模板加载标记失败:', error);
            throw error;
        }
    }

    /**
     * 清除默认模板已加载标记，允许重新加载默认提示词
     * @returns {Promise<void>}
     */
    async clearDefaultTemplatesLoaded() {
        await this.initialize();
        try {
            await this._setToStorage({ [STORAGE_KEYS.DEFAULT_TEMPLATES_LOADED]: false });
        } catch (error) {
            console.error('清除默认模板加载标记失败:', error);
            throw error;
        }
    }

    /**
     * 将默认提示词复制到用户区域
     * @param {Array} defaultPrompts - 默认提示词数组
     * @returns {Promise<void>}
     */
    async copyDefaultPromptsToUserArea(defaultPrompts) {
        await this.initialize();
        try {
            // 获取现有的用户提示词
            const existingPrompts = await this.getAllPrompts();
            
            // 检查哪些默认提示词还没有被复制过
            const existingIds = new Set(existingPrompts.map(p => p.id));
            const newDefaultPrompts = defaultPrompts.filter(prompt => !existingIds.has(prompt.id));
            
            if (newDefaultPrompts.length === 0) {
                return;
            }
            
            // 保留默认提示词的原始ID，只补充必要字段
            const userPrompts = newDefaultPrompts.map(prompt => ({
                ...prompt,
                // 保留原始ID，不重新生成
                user_id: 'local-user',
                // 保留原始时间戳或使用当前时间
                created_at: prompt.created_at || new Date().toISOString(),
                updated_at: prompt.updated_at || new Date().toISOString(),
                is_deleted: false,
                source: 'default_template' // 标记来源为默认模板
            }));
            
            // 合并现有提示词和新的默认提示词
            const allPrompts = [...existingPrompts, ...userPrompts];
            
            // 保存到用户区域
            await this._setToStorage({ [STORAGE_KEYS.PROMPTS]: allPrompts });
        } catch (error) {
            console.error('复制默认提示词到用户区域失败:', error);
            throw error;
        }
    }

    /**
     * 数据迁移：处理现有用户数据到新结构
     * @returns {Promise<void>}
     */
    async migrateExistingUserData() {
        await this.initialize();
        try {
            // 检查是否已经迁移过
            const isTemplatesLoaded = await this.isDefaultTemplatesLoaded();
            if (isTemplatesLoaded) {
                return;
            }
            
            // 获取现有数据
            const existingPrompts = await this.getAllPrompts();
            
            if (existingPrompts.length > 0) {
                // 为现有数据添加source标记，表示这些是用户数据
                const migratedPrompts = existingPrompts.map(prompt => ({
                    ...prompt,
                    source: prompt.source || 'user_created', // 标记为用户创建的数据
                    user_id: prompt.user_id || 'local-user'
                }));
                
                // 保存迁移后的数据
                await this._setToStorage({ [STORAGE_KEYS.PROMPTS]: migratedPrompts });
                

            }
            
            // 标记迁移完成（但不标记默认模板已加载，让后续流程处理默认模板）

        } catch (error) {
            console.error('用户数据迁移失败:', error);
            throw error;
        }
    }

    /**
     * 启用批量操作模式
     * 在批量操作模式下，数据变更通知会被缓存，直到调用flushNotifications
     */
    enableBatchMode() {
        this.batchMode = true;
        this.pendingNotifications = [];

    }

    /**
     * 禁用批量操作模式并发送所有待发送的通知
     */
    disableBatchMode() {
        this.batchMode = false;
        this.flushNotifications();

    }

    /**
     * 发送所有待发送的通知
     */
    flushNotifications() {
        if (this.pendingNotifications.length > 0) {
            const notificationCount = this.pendingNotifications.length;
            
            // 无论缓存了多少个通知，只发送一次 DATA_CHANGED 消息
            // 这样可以避免重复的 UI 刷新
            const mergedData = { prompts: true }; // 简化的通知数据
            
            // 发送合并后的通知
            this._sendNotification(mergedData);
            this.pendingNotifications = [];

        }
    }

    /**
     * 发送数据变更通知
     * @param {Object} changedData 变更的数据
     * @private
     */
    _notifyDataChange(changedData) {
        if (this.batchMode) {
            // 批量模式下，缓存通知
            // 改进的去重逻辑：检查是否已经有 DATA_CHANGED 类型的通知
            const hasDataChangeNotification = this.pendingNotifications.some(
                notification => notification.type === 'DATA_CHANGED'
            );
            
            if (!hasDataChangeNotification) {
                this.pendingNotifications.push({
                    type: 'DATA_CHANGED',
                    data: changedData,
                    timestamp: Date.now()
                });
                console.debug('数据变更通知已缓存（批量模式）');
            } else {
                console.debug('DATA_CHANGED 通知已存在，跳过重复缓存（批量模式）');
            }
        } else {
            // 立即发送通知
            this._sendNotification(changedData);
        }
    }

    /**
     * 实际发送通知的方法
     * @param {Object} changedData 变更的数据
     * @private
     */
    _sendNotification(changedData) {
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
    // 将服务实例暴露到全局作用域
// 在 Chrome 扩展环境中，background.js 没有 window 对象，使用 globalThis
const globalScope = typeof window !== 'undefined' ? window : globalThis;
globalScope.DataService = DataService;
globalScope.dataService = dataService;

// 为了向后兼容，暴露一些常用方法
globalScope.getAllPrompts = () => dataService.getAllPrompts();
globalScope.addPrompt = (promptData) => dataService.addPrompt(promptData);
globalScope.updatePrompt = (id, updates) => dataService.updatePrompt(id, updates);
globalScope.deletePrompt = (id) => dataService.deletePrompt(id);
} else {
    // Service Worker环境
    globalThis.DataService = DataService;
    globalThis.dataService = dataService;
}
