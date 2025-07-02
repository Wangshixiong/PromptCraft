/**
 * 云端数据同步服务模块 (Sync Service)
 * 负责本地数据与Supabase云端数据库的双向同步
 * 
 * 核心功能：
 * - 首次登录时的本地数据迁移
 * - 双向自动同步（本地↔云端）
 * - 冲突检测与解决（基于时间戳的"最后更新者获胜"策略）
 * - 同步状态管理与UI反馈
 * 
 * 设计原则：
 * - 离线优先：确保离线可用性，同步不阻塞UI
 * - 增量同步：基于时间戳的高效数据传输
 * - 错误恢复：完善的重试机制和降级方案
 * - 单一职责：专注于数据同步逻辑
 * 
 * @version 1.0.0
 * @author PromptCraft Team
 * @requires AuthService - 用户认证状态管理
 * @requires DataService - 本地数据管理
 * @requires supabase - Supabase客户端
 */

// 同步状态常量
const SYNC_STATUS = {
    IDLE: 'idle',                    // 空闲状态
    SYNCING: 'syncing',             // 同步进行中
    SUCCESS: 'success',             // 同步成功
    ERROR: 'error',                 // 同步失败
    CONFLICT: 'conflict'            // 存在冲突
};

// 同步操作类型
const SYNC_OPERATION = {
    UPLOAD: 'upload',               // 上传到云端
    DOWNLOAD: 'download',           // 从云端下载
    MERGE: 'merge',                 // 数据合并
    RESOLVE_CONFLICT: 'resolve'     // 冲突解决
};

// 存储键名常量
const SYNC_STORAGE_KEYS = {
    LAST_SYNC_TIME: 'lastSyncTime',             // 最后同步时间（与data-service保持一致）
    SYNC_STATUS: 'sync_status',                 // 同步状态
    MIGRATION_COMPLETED: 'migration_completed', // 数据迁移完成标记
    SYNC_QUEUE: 'sync_queue',                   // 同步队列
    CONFLICT_LOG: 'conflict_log'                // 冲突解决日志
};

/**
 * 云端数据同步服务类
 * 提供完整的数据同步功能
 */
class SyncService {
    /**
     * 构造函数
     * @param {Object} authService - 认证服务实例
     * @param {Object} dataService - 数据服务实例
     * @param {Object} supabaseClient - Supabase客户端实例
     */
    constructor(authService, dataService, supabaseClient) {
        this.authService = authService;
        this.dataService = dataService;
        this.supabaseClient = supabaseClient;
        
        // 同步状态管理
        this.currentStatus = SYNC_STATUS.IDLE;
        this.syncQueue = [];
        this.isInitialized = false;
        this.initPromise = null;
        this.isSyncing = false; // 同步状态锁，防止并发同步
        
        // 事件监听器
        this.statusChangeListeners = [];
        this.syncCompleteListeners = [];
        
        // 配置参数
        this.config = {
            maxRetries: 3,              // 最大重试次数
            retryDelay: 1000,           // 重试延迟（毫秒）
            batchSize: 50,              // 批量操作大小
            syncInterval: 30000,        // 自动同步间隔（毫秒）
            conflictResolutionStrategy: 'last_write_wins' // 冲突解决策略
        };
        

    }
    
    /**
     * 初始化同步服务
     * 设置事件监听器，检查用户认证状态
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

            
            // 1. 确保依赖服务已初始化
            if (!this.authService || !this.dataService) {
                throw new Error('依赖服务未正确注入');
            }
            
            // 2. 监听认证状态变化
            this._setupAuthStateListener();
            
            // 3. 恢复同步状态
            await this._restoreSyncState();
            
            // 4. 检查当前用户状态
            const currentUser = await this.authService.getCurrentUser();
            if (currentUser) {

                // 延迟执行同步，避免阻塞初始化
                setTimeout(() => this._handleUserSignIn(currentUser), 1000);
            }
            

            
        } catch (error) {
            console.error('SyncService 初始化失败:', error);
            this._updateSyncStatus(SYNC_STATUS.ERROR);
            throw new Error(`同步服务初始化失败: ${error.message}`);
        }
    }
    
    /**
     * 设置认证状态监听器
     * @private
     */
    _setupAuthStateListener() {
        // 监听用户登录事件
        this.authService.onAuthStateChange((event, session) => {

            
            // 向 sidepanel 发送 UI 更新指令（通过 background.js 转发）
            if (typeof chrome !== 'undefined' && chrome.runtime) {
                chrome.runtime.sendMessage({
                    type: 'UPDATE_AUTH_UI',
                    session: session
                }).catch(err => {

                });
            }
            
            if (event === 'SIGNED_IN' && session?.user) {
                this._handleUserSignIn(session.user);
            } else if (event === 'SIGNED_OUT') {
                this._handleUserSignOut();
            }
        });
    }
    
    /**
     * 处理用户登录事件
     * @param {Object} user - 用户信息
     * @private
     */
    async _handleUserSignIn(user) {
        try {

            
            // 直接查询云端数据来判断用户状态
            const cloudPrompts = await this._fetchCloudPrompts(user.id);
            const localPrompts = await this.dataService.getAllPromptsIncludingDeleted();
            

            
            if (cloudPrompts.length === 0 && localPrompts.length > 0) {
                // 云端无数据，本地有数据 -> 首次登录，执行数据迁移

                await this.migrateLocalData();
            } else {
                // 其他情况都执行智能同步

                await this.performFullSync();
            }
            
        } catch (error) {
            console.error('处理用户登录失败:', error);
            this._updateSyncStatus(SYNC_STATUS.ERROR);
        }
    }
    
    /**
     * 处理用户退出事件
     * @private
     */
    async _handleUserSignOut() {
        try {

            
            // 清理同步状态
            this.currentStatus = SYNC_STATUS.IDLE;
            this.syncQueue = [];
            
            // 清理本地同步相关数据（保留用户数据）
            await this._clearSyncState();
            

            
        } catch (error) {
            console.error('处理用户退出失败:', error);
        }
    }
    
    /**
     * 首次登录数据迁移 (FR-1)
     * 将本地数据100%迁移至云端
     * @returns {Promise<Object>} 迁移结果
     */
    async migrateLocalData() {
        // 检查同步状态锁
        if (this.isSyncing) {

            return { success: false, message: '数据迁移正在进行中' };
        }
        
        this.isSyncing = true;
        
        try {

            this._updateSyncStatus(SYNC_STATUS.SYNCING);
            
            // 1. 检查用户认证状态
            const currentUser = await this.authService.getCurrentUser();
            if (!currentUser) {
                throw new Error('用户未登录，无法执行数据迁移');
            }
            
            // 2. 获取所有本地提示词数据
            const localPrompts = await this.dataService.getAllPromptsIncludingDeleted();

            
            if (localPrompts.length === 0) {

                this._updateSyncStatus(SYNC_STATUS.SUCCESS);
                return { success: true, migratedCount: 0, message: '无数据需要迁移' };
            }
            
            // 3. 准备上传数据
            const uploadData = localPrompts.map(prompt => ({
                id: prompt.id,
                user_id: currentUser.id,
                title: prompt.title,
                content: prompt.content,
                tags: prompt.tags || (prompt.category ? [prompt.category] : ['默认分类']),
                author: prompt.author || '',
                created_at: prompt.created_at || new Date().toISOString(),
                updated_at: prompt.updated_at || new Date().toISOString(),
                is_deleted: false
            }));
            
            // 4. 批量上传到云端
            const uploadResult = await this._batchUploadPrompts(uploadData);
            
            if (uploadResult.success) {

                this._updateSyncStatus(SYNC_STATUS.SUCCESS);
                
                return {
                    success: true,
                    migratedCount: uploadResult.count,
                    message: `成功迁移 ${uploadResult.count} 条提示词到云端`
                };
            } else {
                throw new Error(uploadResult.error || '数据上传失败');
            }
            
        } catch (error) {
            console.error('数据迁移失败:', error);
            this._updateSyncStatus(SYNC_STATUS.ERROR);
            throw new Error(`数据迁移失败: ${error.message}`);
        } finally {
            // 释放同步状态锁
            this.isSyncing = false;

        }
    }
    
    /**
     * 执行完整同步 (FR-2)
     * 双向同步本地和云端数据
     * @returns {Promise<Object>} 同步结果
     */
    async performFullSync() {
        // 检查同步状态锁
        if (this.isSyncing) {

            return { success: false, message: '同步正在进行中' };
        }
        
        this.isSyncing = true;
        
        try {

            
            // 启用批量操作模式，避免多次UI刷新
            this.dataService.enableBatchMode();
            
            this._updateSyncStatus(SYNC_STATUS.SYNCING);
            
            // 1. 检查用户认证状态
            const currentUser = await this.authService.getCurrentUser();
            if (!currentUser) {
                throw new Error('用户未登录，无法执行同步');
            }
            
            // 1.1 检查会话状态
            const { session } = await this.authService.getSession();
            if (!session) {
                throw new Error('用户会话已过期，请重新登录');
            }
            
            console.log('同步开始 - 用户信息:', {
                userId: currentUser.id,
                email: currentUser.email,
                sessionValid: !!session,
                sessionExpiry: session.expires_at
            });
            
            // 1.2 验证Supabase客户端状态
            if (!this.supabaseClient) {
                throw new Error('Supabase客户端未初始化');
            }
            
            // 1.3 测试网络连接
            try {
                const testQuery = await this.supabaseClient
                    .from('prompts')
                    .select('id')
                    .limit(1);
                    
                if (testQuery.error) {
                    console.error('网络连接测试失败:', testQuery.error);
                    throw new Error(`网络连接失败: ${testQuery.error.message}`);
                }
                console.log('网络连接测试成功');
            } catch (networkError) {
                console.error('网络连接异常:', networkError);
                throw new Error(`网络连接异常: ${networkError.message}`);
            }
            
            // 2. 获取本地和云端数据
            const [localPrompts, cloudPrompts] = await Promise.all([
                this.dataService.getAllPromptsIncludingDeleted(),
                this._fetchCloudPrompts(currentUser.id)
            ]);
            

            
            // 3. 分析数据差异
            const syncPlan = this._analyzeSyncDifferences(localPrompts, cloudPrompts);

            
            // 4. 执行同步操作
            const syncResults = {
                uploaded: 0,
                downloaded: 0,
                updated: 0,
                deleted: 0,
                conflicts: 0
            };
            
            // 4.1 上传新增和修改的本地数据
            if (syncPlan.toUpload.length > 0) {
                const uploadResult = await this._syncToCloud(syncPlan.toUpload);
                syncResults.uploaded = uploadResult.count;
            }
            
            // 4.2 下载新增和修改的云端数据
            if (syncPlan.toDownload.length > 0) {
                const downloadResult = await this._syncFromCloud(syncPlan.toDownload);
                syncResults.downloaded = downloadResult.count;
            }
            
            // 4.3 处理冲突数据
            if (syncPlan.conflicts.length > 0) {
                const conflictResult = await this._resolveConflicts(syncPlan.conflicts);
                syncResults.conflicts = conflictResult.resolvedCount;
            }
            
            // 4.4 处理删除操作
            if (syncPlan.toDelete.length > 0) {
                const deleteResult = await this._syncDeletions(syncPlan.toDelete);
                syncResults.deleted = deleteResult.count;
            }
            
            // 5. 更新同步状态为成功
            this._updateSyncStatus(SYNC_STATUS.SUCCESS, '同步完成');
            
            // 6. 只有在所有操作都成功后才更新同步时间戳
            await this._updateLastSyncTime();
            
            return {
                success: true,
                results: syncResults,
                message: '同步完成'
            };
            
        } catch (error) {
            console.error('完整同步失败:', error);
            console.error('错误详情:', {
                name: error.name,
                message: error.message,
                stack: error.stack,
                cause: error.cause
            });
            this._updateSyncStatus(SYNC_STATUS.ERROR);
            throw new Error(`同步失败: ${error.message}`);
        } finally {
            // 禁用批量模式并发送合并的数据变更通知
            this.dataService.disableBatchMode();
            
            // 发送同步完成的特殊通知（不重复发送DATA_CHANGED）
            this._notifyDataChanged('SYNC_COMPLETED', { timestamp: Date.now() });
            // 释放同步状态锁
            this.isSyncing = false;

        }
    }
    
    // ==================== 辅助方法 ====================
    
    /**
     * 获取迁移状态
     * @returns {Promise<boolean>}
     * @private
     */
    async _getMigrationStatus() {
        try {
            const result = await this.dataService._getFromStorage([SYNC_STORAGE_KEYS.MIGRATION_COMPLETED]);
            return result[SYNC_STORAGE_KEYS.MIGRATION_COMPLETED] || false;
        } catch (error) {
            console.error('获取迁移状态失败:', error);
            return false;
        }
    }
    
    /**
     * 标记迁移完成
     * @private
     */
    async _markMigrationCompleted() {
        try {
            await this.dataService._setToStorage({
                [SYNC_STORAGE_KEYS.MIGRATION_COMPLETED]: true,
                [SYNC_STORAGE_KEYS.LAST_SYNC_TIME]: new Date().toISOString()
            });

        } catch (error) {
            console.error('标记迁移完成失败:', error);
        }
    }
    
    /**
     * 更新同步状态
     * @param {string} status - 新的同步状态
     * @param {string} message - 状态消息
     * @private
     */
    _updateSyncStatus(status, message) {
        const oldStatus = this.currentStatus;
        this.currentStatus = status;
        

        
        // 通知状态变化监听器
        this.statusChangeListeners.forEach(listener => {
            try {
                listener(status, message);
            } catch (error) {
                console.error('状态变化监听器执行失败:', error);
            }
        });
        
        // 保存状态到本地存储
        this.dataService._setToStorage({
            [SYNC_STORAGE_KEYS.SYNC_STATUS]: status
        }).catch(error => {
            console.error('保存同步状态失败:', error);
        });
    }
    
    /**
     * 恢复同步状态
     * @private
     */
    async _restoreSyncState() {
        try {
            const result = await this.dataService._getFromStorage([
                SYNC_STORAGE_KEYS.SYNC_STATUS,
                SYNC_STORAGE_KEYS.LAST_SYNC_TIME
            ]);
            
            this.currentStatus = result[SYNC_STORAGE_KEYS.SYNC_STATUS] || SYNC_STATUS.IDLE;

            
        } catch (error) {
            console.error('恢复同步状态失败:', error);
            this.currentStatus = SYNC_STATUS.IDLE;
        }
    }
    
    /**
     * 清理同步状态
     * @private
     */
    async _clearSyncState() {
        try {
            await this.dataService._removeFromStorage([
                SYNC_STORAGE_KEYS.SYNC_STATUS,
                SYNC_STORAGE_KEYS.SYNC_QUEUE,
                SYNC_STORAGE_KEYS.CONFLICT_LOG
            ]);

        } catch (error) {
            console.error('清理同步状态失败:', error);
        }
    }
    
    // ==================== 公共API ====================
    
    /**
     * 获取当前同步状态
     * @returns {string} 当前同步状态
     */
    getSyncStatus() {
        return this.currentStatus;
    }
    
    /**
     * 监听同步状态变化
     * @param {Function} callback - 回调函数
     */
    onSyncStatusChange(callback) {
        if (typeof callback === 'function') {
            this.statusChangeListeners.push(callback);
        }
    }
    
    /**
     * 移除状态变化监听器
     * @param {Function} callback - 要移除的回调函数
     */
    offSyncStatusChange(callback) {
        const index = this.statusChangeListeners.indexOf(callback);
        if (index > -1) {
            this.statusChangeListeners.splice(index, 1);
        }
    }
    
    // ==================== Supabase数据库操作方法 ====================
    
    /**
     * 批量上传提示词到云端
     * @param {Array} prompts - 要上传的提示词数组
     * @returns {Promise<Object>} 上传结果
     * @private
     */
    async _batchUploadPrompts(prompts) {
        try {

            
            if (prompts.length === 0) {
                return { success: true, count: 0 };
            }
            
            // 分批上传，避免单次请求过大
            const batchSize = this.config.batchSize;
            let totalUploaded = 0;
            
            for (let i = 0; i < prompts.length; i += batchSize) {
                const batch = prompts.slice(i, i + batchSize);

                
                const { data, error } = await this.supabaseClient
                    .from('prompts')
                    .upsert(batch, { 
                        onConflict: 'id',
                        returning: 'minimal'
                    });
                
                if (error) {
                    console.error('批量上传失败:', error);
                    console.error('Supabase错误详情:', {
                        code: error.code,
                        message: error.message,
                        details: error.details,
                        hint: error.hint
                    });
                    throw new Error(`批量上传失败: ${error.message}`);
                }
                
                totalUploaded += batch.length;

            }
            

            return { success: true, count: totalUploaded };
            
        } catch (error) {
            console.error('批量上传提示词失败:', error);
            return { success: false, error: error.message, count: 0 };
        }
    }
    
    /**
     * 从云端获取用户的所有提示词
     * @param {string} userId - 用户ID
     * @returns {Promise<Array>} 云端提示词数组
     * @private
     */
    async _fetchCloudPrompts(userId) {
        try {

            
            const { data, error } = await this.supabaseClient
                .from('prompts')
                .select('*')
                .eq('user_id', userId)
                .order('updated_at', { ascending: false });
            
            if (error) {
                console.error('获取云端数据失败:', error);
                console.error('Supabase错误详情:', {
                    code: error.code,
                    message: error.message,
                    details: error.details,
                    hint: error.hint
                });
                throw new Error(`获取云端数据失败: ${error.message}`);
            }
            

            return data || [];
            
        } catch (error) {
            console.error('获取云端提示词失败:', error);
            throw error;
        }
    }
    
    /**
     * 创建单个提示词到云端
     * @param {Object} prompt - 提示词数据
     * @returns {Promise<Object>} 创建结果
     */
    async createPrompt(prompt) {
        try {
            const currentUser = await this.authService.getCurrentUser();
            if (!currentUser) {
                throw new Error('用户未登录');
            }
            
            // 确保只发送云端数据库支持的字段
            const promptData = {
                id: prompt.id,
                title: prompt.title,
                content: prompt.content,
                tags: prompt.tags || (prompt.category ? [prompt.category] : []),
                author: prompt.author || '',
                source: prompt.source || 'user_created', // 确保source字段有默认值
                user_id: currentUser.id,
                created_at: prompt.created_at || new Date().toISOString(),
                updated_at: new Date().toISOString(),
                is_deleted: false
            };
            
            const { data, error } = await this.supabaseClient
                .from('prompts')
                .insert([promptData])
                .select()
                .single();
            
            if (error) {
                throw new Error(`创建提示词失败: ${error.message}`);
            }
            

            return { success: true, data };
            
        } catch (error) {
            console.error('创建提示词失败:', error);
            return { success: false, error: error.message };
        }
    }
    
    /**
     * 更新云端提示词
     * @param {Object} prompt - 提示词数据
     * @returns {Promise<Object>} 更新结果
     */
    async updatePrompt(prompt) {
        try {
            const currentUser = await this.authService.getCurrentUser();
            if (!currentUser) {
                throw new Error('用户未登录');
            }
            
            // 确保只发送云端数据库支持的字段
            const updateData = {
                title: prompt.title,
                content: prompt.content,
                tags: prompt.tags || (prompt.category ? [prompt.category] : []),
                author: prompt.author || '',
                source: prompt.source || 'user_created', // 确保source字段有默认值
                updated_at: new Date().toISOString()
            };
            
            const { data, error } = await this.supabaseClient
                .from('prompts')
                .update(updateData)
                .eq('id', prompt.id)
                .eq('user_id', currentUser.id)
                .select()
                .single();
            
            if (error) {
                throw new Error(`更新提示词失败: ${error.message}`);
            }
            

            return { success: true, data };
            
        } catch (error) {
            console.error('更新提示词失败:', error);
            return { success: false, error: error.message };
        }
    }
    
    /**
     * 软删除云端提示词
     * @param {string} promptId - 提示词ID
     * @returns {Promise<Object>} 删除结果
     */
    async deletePrompt(promptId) {
        try {
            const currentUser = await this.authService.getCurrentUser();
            if (!currentUser) {
                throw new Error('用户未登录');
            }
            
            const { data, error } = await this.supabaseClient
                .from('prompts')
                .update({ 
                    is_deleted: true,
                    updated_at: new Date().toISOString()
                })
                .eq('id', promptId)
                .eq('user_id', currentUser.id)
                .select()
                .single();
            
            if (error) {
                throw new Error(`删除提示词失败: ${error.message}`);
            }
            

            return { success: true, data };
            
        } catch (error) {
            console.error('删除提示词失败:', error);
            return { success: false, error: error.message };
        }
    }
    
    // ==================== 数据同步分析方法 ====================
    
    /**
     * 分析本地和云端数据的差异
     * @param {Array} localPrompts - 本地提示词数组
     * @param {Array} cloudPrompts - 云端提示词数组
     * @returns {Object} 同步计划
     * @private
     */
    _analyzeSyncDifferences(localPrompts, cloudPrompts) {
        const syncPlan = {
            toUpload: [],      // 需要上传到云端的数据
            toDownload: [],    // 需要从云端下载的数据
            conflicts: [],     // 存在冲突的数据
            toDelete: []       // 需要删除的数据
        };
        
        // 创建映射表以提高查找效率
        const localMap = new Map(localPrompts.map(p => [p.id, p]));
        const cloudMap = new Map(cloudPrompts.map(p => [p.id, p]));
        
        // 分析本地数据
        for (const localPrompt of localPrompts) {
            const cloudPrompt = cloudMap.get(localPrompt.id);
            
            if (!cloudPrompt) {
                // 本地有，云端没有 -> 上传（包括删除状态）
                syncPlan.toUpload.push(localPrompt);
            } else {
                // 两边都有，检查删除状态和时间戳
                const localTime = new Date(localPrompt.updated_at || localPrompt.created_at);
                const cloudTime = new Date(cloudPrompt.updated_at || cloudPrompt.created_at);
                
                // 如果本地已删除但云端未删除，且本地删除时间更新，则上传删除状态
                if (localPrompt.is_deleted && !cloudPrompt.is_deleted && localTime > cloudTime) {
                    syncPlan.toUpload.push(localPrompt);
                }
                // 如果云端已删除但本地未删除，且云端删除时间更新，则下载删除状态
                else if (!localPrompt.is_deleted && cloudPrompt.is_deleted && cloudTime > localTime) {
                    syncPlan.toDownload.push(cloudPrompt);
                }
                // 如果都未删除，按正常逻辑比较
                else if (!localPrompt.is_deleted && !cloudPrompt.is_deleted) {
                    if (localTime > cloudTime) {
                        // 本地更新 -> 上传
                        syncPlan.toUpload.push(localPrompt);
                    } else if (cloudTime > localTime) {
                        // 云端更新 -> 下载
                        syncPlan.toDownload.push(cloudPrompt);
                    } else {
                        // 时间戳相同，检查内容是否一致
                        if (!this._isPromptContentEqual(localPrompt, cloudPrompt)) {
                            // 内容不一致，标记为冲突
                            syncPlan.conflicts.push({
                                local: localPrompt,
                                cloud: cloudPrompt
                            });
                        }
                    }
                }
            }
        }
        
        // 分析云端数据
        for (const cloudPrompt of cloudPrompts) {
            const localPrompt = localMap.get(cloudPrompt.id);
            
            if (!localPrompt) {
                if (cloudPrompt.is_deleted) {
                    // 云端已删除，本地也没有，无需操作
                    // （本地可能已经物理删除了这个数据）
                } else {
                    // 云端有且未删除，本地没有 -> 下载
                    syncPlan.toDownload.push(cloudPrompt);
                }
            }
            // 注意：如果localPrompt存在，相关逻辑已在上面的本地数据分析中处理
        }
        

        
        return syncPlan;
    }
    
    /**
     * 比较两个提示词的内容是否相等
     * @param {Object} prompt1 - 提示词1
     * @param {Object} prompt2 - 提示词2
     * @returns {boolean} 是否相等
     * @private
     */
    _isPromptContentEqual(prompt1, prompt2) {
        return (
            prompt1.title === prompt2.title &&
            prompt1.content === prompt2.content &&
            JSON.stringify(prompt1.tags || []) === JSON.stringify(prompt2.tags || []) &&
            (prompt1.author || '') === (prompt2.author || '')
        );
    }
    
    /**
     * 上传数据到云端
     * @param {Array} prompts - 要上传的提示词数组
     * @returns {Promise<Object>} 上传结果
     * @private
     */
    async _syncToCloud(prompts) {
        try {

            
            const currentUser = await this.authService.getCurrentUser();
            if (!currentUser) {
                throw new Error('用户未登录');
            }
            
            // 准备上传数据
            const uploadData = prompts.map(prompt => ({
                id: prompt.id,
                user_id: currentUser.id,
                title: prompt.title,
                content: prompt.content,
                tags: prompt.tags || (prompt.category ? [prompt.category] : []),
                author: prompt.author || '',
                created_at: prompt.created_at || new Date().toISOString(),
                updated_at: new Date().toISOString(),
                is_deleted: prompt.is_deleted || false
            }));
            
            const result = await this._batchUploadPrompts(uploadData);
            
            if (result.success) {
                
                return { success: true, count: result.count };
            } else {
                throw new Error(result.error);
            }
            
        } catch (error) {
            console.error('上传数据到云端失败:', error);
            return { success: false, error: error.message, count: 0 };
        }
    }
    
    /**
     * 从云端下载数据到本地
     * @param {Array} prompts - 要下载的提示词数组
     * @returns {Promise<Object>} 下载结果
     * @private
     */
    async _syncFromCloud(prompts) {
        try {

            
            // 1. 获取当前所有本地数据
            const currentLocalPrompts = await this.dataService.getAllPromptsIncludingDeleted();
            const localPromptsMap = new Map(currentLocalPrompts.map(p => [p.id, p]));
            
            // 2. 在内存中处理所有云端数据
            const toDelete = [];
            const toAddOrUpdate = [];
            
            for (const cloudPrompt of prompts) {
                if (cloudPrompt.is_deleted) {
                    // 标记需要删除的数据
                    toDelete.push(cloudPrompt.id);
                } else {
                    // 转换为本地数据格式并标记需要添加/更新
                    const localPrompt = {
                        id: cloudPrompt.id,
                        title: cloudPrompt.title,
                        content: cloudPrompt.content,
                        tags: cloudPrompt.tags || (cloudPrompt.category ? [cloudPrompt.category] : []),
                        author: cloudPrompt.author || '',
                        created_at: cloudPrompt.created_at,
                        updated_at: cloudPrompt.updated_at,
                        is_deleted: false  // 确保下载的活跃数据标记为未删除
                    };
                    toAddOrUpdate.push(localPrompt);
                }
            }
            
            // 3. 计算最终的完整数据集
            const finalPrompts = [...currentLocalPrompts];
            
            // 3.1 处理删除操作（软删除）
            for (const deleteId of toDelete) {
                const index = finalPrompts.findIndex(p => p.id === deleteId);
                if (index !== -1) {
                    // 标记为已删除而不是物理删除
                    finalPrompts[index].is_deleted = true;
                    finalPrompts[index].updated_at = new Date().toISOString();
                }
            }
            
            // 3.2 处理添加/更新操作
            for (const newPrompt of toAddOrUpdate) {
                const existingIndex = finalPrompts.findIndex(p => p.id === newPrompt.id);
                if (existingIndex !== -1) {
                    // 更新现有数据，确保包含is_deleted字段
                    finalPrompts[existingIndex] = {
                        ...finalPrompts[existingIndex],
                        ...newPrompt,
                        is_deleted: newPrompt.is_deleted || false
                    };
                } else {
                    // 添加新数据，确保包含is_deleted字段
                    finalPrompts.push({
                        ...newPrompt,
                        is_deleted: newPrompt.is_deleted || false
                    });
                }
            }
            
            // 4. 一次性批量写入所有数据
            await this.dataService.setAllPrompts(finalPrompts);
            
            const downloadedCount = toAddOrUpdate.length + toDelete.length;

            
            return { success: true, count: downloadedCount };
            
        } catch (error) {
            console.error('从云端下载数据失败:', error);
            return { success: false, error: error.message, count: 0 };
        }
    }
    
    /**
     * 解决数据冲突 (FR-3)
     * 使用"最后更新者获胜"策略
     * @param {Array} conflicts - 冲突数据数组
     * @returns {Promise<Object>} 解决结果
     * @private
     */
    async _resolveConflicts(conflicts) {
        try {

            
            let resolvedCount = 0;
            const conflictLog = [];
            
            for (const conflict of conflicts) {
                const { local, cloud } = conflict;
                
                // 比较时间戳，选择最新的版本
                const localTime = new Date(local.updated_at || local.created_at);
                const cloudTime = new Date(cloud.updated_at || cloud.created_at);
                
                let winner, loser, location;
                
                if (localTime >= cloudTime) {
                    // 本地版本获胜
                    winner = local;
                    loser = cloud;
                    location = 'local';
                    
                    // 上传本地版本到云端
                    await this._syncToCloud([local]);
                } else {
                    // 云端版本获胜
                    winner = cloud;
                    loser = local;
                    location = 'cloud';
                    
                    // 下载云端版本到本地
                    await this._syncFromCloud([cloud]);
                }
                
                // 记录冲突解决日志
                const logEntry = {
                    promptId: winner.id,
                    resolvedAt: new Date().toISOString(),
                    strategy: 'last_write_wins',
                    winner: location,
                    winnerTime: winner.updated_at,
                    loserTime: loser.updated_at
                };
                
                conflictLog.push(logEntry);
                resolvedCount++;
                

            }
            
            // 保存冲突解决日志
            await this._saveConflictLog(conflictLog);
            

            return { success: true, resolvedCount, conflictLog };
            
        } catch (error) {
            console.error('解决冲突失败:', error);
            return { success: false, error: error.message, resolvedCount: 0 };
        }
    }
    
    /**
     * 同步删除操作
     * @param {Array} deletedPrompts - 已删除的提示词数组
     * @returns {Promise<Object>} 同步结果
     * @private
     */
    async _syncDeletions(deletedPrompts) {
        try {

            
            let deletedCount = 0;
            
            // 获取当前所有本地数据（包括已删除的）
            const currentPrompts = await this.dataService.getAllPromptsIncludingDeleted();
            
            // 标记需要删除的提示词
            for (const deletedPrompt of deletedPrompts) {
                const index = currentPrompts.findIndex(p => p.id === deletedPrompt.id);
                if (index !== -1) {
                    // 软删除：标记为已删除
                    currentPrompts[index].is_deleted = true;
                    currentPrompts[index].updated_at = new Date().toISOString();
                    deletedCount++;
                }
            }
            
            // 批量更新所有数据
            await this.dataService.setAllPrompts(currentPrompts);
            

            return { success: true, count: deletedCount };
            
        } catch (error) {
            console.error('同步删除操作失败:', error);
            return { success: false, error: error.message, count: 0 };
        }
    }
    
    /**
     * 保存冲突解决日志
     * @param {Array} conflictLog - 冲突日志数组
     * @private
     */
    async _saveConflictLog(conflictLog) {
        try {
            if (conflictLog.length === 0) return;
            
            // 获取现有日志
            const result = await this.dataService._getFromStorage([SYNC_STORAGE_KEYS.CONFLICT_LOG]);
            const existingLog = result[SYNC_STORAGE_KEYS.CONFLICT_LOG] || [];
            
            // 合并新日志
            const updatedLog = [...existingLog, ...conflictLog];
            
            // 保持日志数量在合理范围内（最多保留100条）
            const maxLogEntries = 100;
            if (updatedLog.length > maxLogEntries) {
                updatedLog.splice(0, updatedLog.length - maxLogEntries);
            }
            
            // 保存日志
            await this.dataService._setToStorage({
                [SYNC_STORAGE_KEYS.CONFLICT_LOG]: updatedLog
            });
            

            
        } catch (error) {
            console.error('保存冲突解决日志失败:', error);
        }
    }
    
    /**
     * 更新最后同步时间
     * @private
     */
    async _updateLastSyncTime() {
        try {
            const now = new Date().toISOString();
            console.log('[DEBUG] SyncService: 更新最后同步时间为:', now);
            console.log('[DEBUG] SyncService: 使用存储键:', SYNC_STORAGE_KEYS.LAST_SYNC_TIME);
            
            await this.dataService._setToStorage({
                [SYNC_STORAGE_KEYS.LAST_SYNC_TIME]: now
            });
            
            console.log('[DEBUG] SyncService: 最后同步时间更新成功');
            
            // 验证存储是否成功
            const stored = await this.dataService.getLastSyncTime();
            console.log('[DEBUG] SyncService: 验证存储结果:', stored);

        } catch (error) {
            console.error('[DEBUG] SyncService: 更新最后同步时间失败:', error);
        }
    }
    
    /**
     * 发送数据变更通知
     * @param {string} operation - 操作类型
     * @param {Object} data - 相关数据
     * @private
     */
    _notifyDataChanged(operation, data) {
        try {
            if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
                // 发送同步状态通知给所有监听的组件
                chrome.runtime.sendMessage({
                    type: 'SYNC_STATUS_CHANGED',
                    operation: operation,
                    data: data,
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

// 导出同步服务类和相关常量
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { SyncService, SYNC_STATUS, SYNC_OPERATION };
} else {
    // 在 Chrome 扩展环境中，background.js 没有 window 对象，使用 globalThis
    const globalScope = typeof window !== 'undefined' ? window : globalThis;
    globalScope.SyncService = SyncService;
    globalScope.SYNC_STATUS = SYNC_STATUS;
    globalScope.SYNC_OPERATION = SYNC_OPERATION;
}