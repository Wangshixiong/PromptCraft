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
    LAST_SYNC_TIME: 'last_sync_time',           // 最后同步时间
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
        
        console.log('SyncService 实例已创建');
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
            console.log('开始初始化 SyncService...');
            
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
                console.log('检测到已登录用户，准备同步:', currentUser.email);
                // 延迟执行同步，避免阻塞初始化
                setTimeout(() => this._handleUserSignIn(currentUser), 1000);
            }
            
            console.log('SyncService 初始化完成');
            
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
            console.log('SyncService: 认证状态变化:', event, session?.user?.email);
            
            // 向 sidepanel 发送 UI 更新指令（通过 background.js 转发）
            if (typeof chrome !== 'undefined' && chrome.runtime) {
                chrome.runtime.sendMessage({
                    type: 'UPDATE_AUTH_UI',
                    session: session
                }).catch(err => {
                    console.log('SyncService: 发送UI更新消息失败（可能sidepanel未打开）:', err);
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
            console.log('处理用户登录，开始同步流程:', user.email);
            
            // 直接查询云端数据来判断用户状态
            const cloudPrompts = await this._fetchCloudPrompts(user.id);
            const localPrompts = await this.dataService.getAllPrompts();
            
            console.log(`云端数据: ${cloudPrompts.length} 条，本地数据: ${localPrompts.length} 条`);
            
            if (cloudPrompts.length === 0 && localPrompts.length > 0) {
                // 云端无数据，本地有数据 -> 首次登录，执行数据迁移
                console.log('检测到首次登录（云端无数据，本地有数据），开始数据迁移...');
                await this.migrateLocalData();
            } else {
                // 其他情况都执行智能同步
                console.log('执行智能数据同步...');
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
            console.log('用户已退出，清理同步状态...');
            
            // 清理同步状态
            this.currentStatus = SYNC_STATUS.IDLE;
            this.syncQueue = [];
            
            // 清理本地同步相关数据（保留用户数据）
            await this._clearSyncState();
            
            console.log('同步状态清理完成');
            
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
            console.log('数据迁移已在进行中，跳过重复执行');
            return { success: false, message: '数据迁移正在进行中' };
        }
        
        this.isSyncing = true;
        
        try {
            console.log('开始首次登录数据迁移...');
            this._updateSyncStatus(SYNC_STATUS.SYNCING);
            
            // 1. 检查用户认证状态
            const currentUser = await this.authService.getCurrentUser();
            if (!currentUser) {
                throw new Error('用户未登录，无法执行数据迁移');
            }
            
            // 2. 获取所有本地提示词数据
            const localPrompts = await this.dataService.getAllPrompts();
            console.log(`获取到 ${localPrompts.length} 条本地提示词数据`);
            
            if (localPrompts.length === 0) {
                console.log('本地无数据需要迁移');
                this._updateSyncStatus(SYNC_STATUS.SUCCESS);
                return { success: true, migratedCount: 0, message: '无数据需要迁移' };
            }
            
            // 3. 准备上传数据
            const uploadData = localPrompts.map(prompt => ({
                id: prompt.id,
                user_id: currentUser.id,
                title: prompt.title,
                content: prompt.content,
                category: prompt.category || '默认分类',
                created_at: prompt.created_at || new Date().toISOString(),
                updated_at: prompt.updated_at || new Date().toISOString(),
                is_deleted: false
            }));
            
            // 4. 批量上传到云端
            const uploadResult = await this._batchUploadPrompts(uploadData);
            
            if (uploadResult.success) {
                console.log(`数据迁移成功，共迁移 ${uploadResult.count} 条数据`);
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
            console.log('数据迁移状态锁已释放');
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
            console.log('完整同步已在进行中，跳过重复执行');
            return { success: false, message: '同步正在进行中' };
        }
        
        this.isSyncing = true;
        
        try {
            console.log('开始执行完整同步...');
            this._updateSyncStatus(SYNC_STATUS.SYNCING);
            
            // 1. 检查用户认证状态
            const currentUser = await this.authService.getCurrentUser();
            if (!currentUser) {
                throw new Error('用户未登录，无法执行同步');
            }
            
            // 2. 获取本地和云端数据
            const [localPrompts, cloudPrompts] = await Promise.all([
                this.dataService.getAllPrompts(),
                this._fetchCloudPrompts(currentUser.id)
            ]);
            
            console.log(`本地数据: ${localPrompts.length} 条，云端数据: ${cloudPrompts.length} 条`);
            
            // 3. 分析数据差异
            const syncPlan = this._analyzeSyncDifferences(localPrompts, cloudPrompts);
            console.log('同步计划:', syncPlan);
            
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
            
            // 5. 更新同步时间戳
            await this._updateLastSyncTime();
            
            console.log('完整同步完成:', syncResults);
            this._updateSyncStatus(SYNC_STATUS.SUCCESS, '同步完成');
            
            // 6. 触发数据变更通知，让界面刷新
            this._notifyDataChanged('SYNC_COMPLETED', syncResults);
            
            return {
                success: true,
                results: syncResults,
                message: '同步完成'
            };
            
        } catch (error) {
            console.error('完整同步失败:', error);
            this._updateSyncStatus(SYNC_STATUS.ERROR);
            throw new Error(`同步失败: ${error.message}`);
        } finally {
            // 释放同步状态锁
            this.isSyncing = false;
            console.log('完整同步状态锁已释放');
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
            console.log('迁移状态已标记为完成');
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
        
        console.log(`同步状态变化: ${oldStatus} -> ${status}`);
        
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
            console.log('同步状态已恢复:', this.currentStatus);
            
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
            console.log('同步状态已清理');
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
            console.log(`开始批量上传 ${prompts.length} 条提示词...`);
            
            if (prompts.length === 0) {
                return { success: true, count: 0 };
            }
            
            // 分批上传，避免单次请求过大
            const batchSize = this.config.batchSize;
            let totalUploaded = 0;
            
            for (let i = 0; i < prompts.length; i += batchSize) {
                const batch = prompts.slice(i, i + batchSize);
                console.log(`上传批次 ${Math.floor(i / batchSize) + 1}/${Math.ceil(prompts.length / batchSize)}`);
                
                const { data, error } = await this.supabaseClient
                    .from('prompts')
                    .upsert(batch, { 
                        onConflict: 'id',
                        returning: 'minimal'
                    });
                
                if (error) {
                    console.error('批量上传失败:', error);
                    throw new Error(`批量上传失败: ${error.message}`);
                }
                
                totalUploaded += batch.length;
                console.log(`批次上传成功，已上传 ${totalUploaded}/${prompts.length} 条`);
            }
            
            console.log(`批量上传完成，共上传 ${totalUploaded} 条提示词`);
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
            console.log('从云端获取提示词数据...');
            
            const { data, error } = await this.supabaseClient
                .from('prompts')
                .select('*')
                .eq('user_id', userId)
                .order('updated_at', { ascending: false });
            
            if (error) {
                console.error('获取云端数据失败:', error);
                throw new Error(`获取云端数据失败: ${error.message}`);
            }
            
            console.log(`成功获取 ${data.length} 条云端提示词`);
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
                category: prompt.category,
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
            
            console.log('提示词创建成功:', data.id);
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
                category: prompt.category,
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
            
            console.log('提示词更新成功:', data.id);
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
            
            console.log('提示词删除成功:', data.id);
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
                // 本地有，云端没有 -> 上传
                syncPlan.toUpload.push(localPrompt);
            } else {
                // 两边都有，检查时间戳
                const localTime = new Date(localPrompt.updated_at || localPrompt.created_at);
                const cloudTime = new Date(cloudPrompt.updated_at || cloudPrompt.created_at);
                
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
        
        // 分析云端数据
        for (const cloudPrompt of cloudPrompts) {
            const localPrompt = localMap.get(cloudPrompt.id);
            
            if (!localPrompt) {
                if (cloudPrompt.is_deleted) {
                    // 云端已删除，本地也需要删除（如果存在）
                    syncPlan.toDelete.push(cloudPrompt);
                } else {
                    // 云端有，本地没有 -> 下载
                    syncPlan.toDownload.push(cloudPrompt);
                }
            }
        }
        
        console.log('数据差异分析完成:', {
            toUpload: syncPlan.toUpload.length,
            toDownload: syncPlan.toDownload.length,
            conflicts: syncPlan.conflicts.length,
            toDelete: syncPlan.toDelete.length
        });
        
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
            prompt1.category === prompt2.category &&
            JSON.stringify(prompt1.tags || []) === JSON.stringify(prompt2.tags || [])
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
            console.log(`开始上传 ${prompts.length} 条数据到云端...`);
            
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
                category: prompt.category || '默认分类',
                created_at: prompt.created_at || new Date().toISOString(),
                updated_at: new Date().toISOString(),
                is_deleted: prompt.is_deleted || false
            }));
            
            const result = await this._batchUploadPrompts(uploadData);
            
            if (result.success) {
                console.log(`成功上传 ${result.count} 条数据`);
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
            console.log(`开始从云端下载 ${prompts.length} 条数据...`);
            
            // 1. 获取当前所有本地数据
            const currentLocalPrompts = await this.dataService.getAllPrompts();
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
                        category: cloudPrompt.category,
                        created_at: cloudPrompt.created_at,
                        updated_at: cloudPrompt.updated_at
                    };
                    toAddOrUpdate.push(localPrompt);
                }
            }
            
            // 3. 计算最终的完整数据集
            const finalPrompts = [...currentLocalPrompts];
            
            // 3.1 处理删除操作
            for (const deleteId of toDelete) {
                const index = finalPrompts.findIndex(p => p.id === deleteId);
                if (index !== -1) {
                    finalPrompts.splice(index, 1);
                }
            }
            
            // 3.2 处理添加/更新操作
            for (const newPrompt of toAddOrUpdate) {
                const existingIndex = finalPrompts.findIndex(p => p.id === newPrompt.id);
                if (existingIndex !== -1) {
                    // 更新现有数据
                    finalPrompts[existingIndex] = newPrompt;
                } else {
                    // 添加新数据
                    finalPrompts.push(newPrompt);
                }
            }
            
            // 4. 一次性批量写入所有数据
            await this.dataService.setAllPrompts(finalPrompts);
            
            const downloadedCount = toAddOrUpdate.length + toDelete.length;
            console.log(`成功下载 ${downloadedCount} 条数据 (新增/更新: ${toAddOrUpdate.length}, 删除: ${toDelete.length})`);
            
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
            console.log(`开始解决 ${conflicts.length} 个数据冲突...`);
            
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
                
                console.log(`冲突解决: ${winner.id} (${location} 版本获胜)`);
            }
            
            // 保存冲突解决日志
            await this._saveConflictLog(conflictLog);
            
            console.log(`成功解决 ${resolvedCount} 个冲突`);
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
            console.log(`开始同步 ${deletedPrompts.length} 个删除操作...`);
            
            let deletedCount = 0;
            
            for (const deletedPrompt of deletedPrompts) {
                // 删除本地数据
                await this.dataService.deletePrompt(deletedPrompt.id, false);
                deletedCount++;
            }
            
            console.log(`成功同步 ${deletedCount} 个删除操作`);
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
            
            console.log(`冲突解决日志已保存，共 ${conflictLog.length} 条新记录`);
            
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
            await this.dataService._setToStorage({
                [SYNC_STORAGE_KEYS.LAST_SYNC_TIME]: now
            });
            console.log('最后同步时间已更新:', now);
        } catch (error) {
            console.error('更新最后同步时间失败:', error);
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
                // 发送数据变更通知给所有监听的组件
                chrome.runtime.sendMessage({
                    type: 'DATA_CHANGED',
                    operation: operation,
                    data: data,
                    timestamp: Date.now()
                }, (response) => {
                    // 忽略响应错误，因为可能没有监听器
                    if (chrome.runtime.lastError) {
                        // 静默处理错误，避免控制台噪音
                    }
                });
                console.log('已发送数据变更通知:', operation);
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