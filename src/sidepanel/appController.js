/**
 * AppController - 应用控制器
 * 职责: 作为应用的"大脑"，连接UI事件和后台服务，处理业务逻辑
 * 创建时间: 2025-06-29
 */

// 应用控制器对象将在后续任务中逐步完善
const app = {
    /**
     * 初始化应用 - 从sidepanel.js的loadUserPrompts迁移核心逻辑
     * 职责：获取提示词数据，处理排序，调用UI渲染
     */
    async initializeApp() {
        // 设置基本用户信息
        currentUser = {
            id: 'local-user',
            email: 'local@example.com'
        };
        
        // 设置事件监听器
        this.setupEventListeners();
        
        // 初始化标签组件管理器
        this.tagManager = new TagComponentManager();
        await this.initializeTagComponent();
        
        try {
            // 显示主视图
            ui.showView('mainView');
            
            // 获取并应用主题设置
            await this.initializeTheme();
            
            // 通过消息通信获取提示词数据（遵循分层架构原则）
            await this.loadUserPrompts();
            
            // 初始化版本日志
            await this.initializeVersionLog();
            
            // 检查新版本
            ui.checkForNewVersion();
            
            // 设置存储变化监听器
            this.setupStorageListener();
            
            // 设置消息监听器
            this.setupMessageListener();
            
        } catch (error) {
            console.error('初始化应用失败:', error);
            ui.showToast('加载数据失败，请刷新页面重试', 'error');
        }
    },

    /**
     * 初始化标签组件
     */
    async initializeTagComponent() {
        try {
            // 使用dataService.getAllTags()获取所有标签
            const response = await chrome.runtime.sendMessage({ type: 'GET_ALL_TAGS' });
            let availableTags = [];
            
            if (response.success && response.data) {
                availableTags = response.data;
            }
            
            // 初始化标签组件
            await this.tagManager.initialize('smartTagInputContainer', [], availableTags);
        } catch (error) {
            console.error('初始化标签组件失败:', error);
            // 即使失败也要初始化基本组件
            await this.tagManager.initialize('smartTagInputContainer', [], []);
        }
    },

    // --- 认证与同步业务逻辑 ---

    /**
     * 处理Google登录
     */
    async handleGoogleSignIn() {
        // 启动加载状态
        ui.setLoginButtonLoading(true);
        
        // 只负责发送消息，不关心后续逻辑
        chrome.runtime.sendMessage({ 
            type: 'LOGIN_WITH_GOOGLE',
            progressCallback: true // 标识需要进度回调
        }, (response) => {
            if (chrome.runtime.lastError || !response.success) {
                // 检查是否为用户取消
                if (response?.cancelled || response?.error === 'USER_CANCELLED') {
                    // 用户取消时静默恢复按钮状态，不显示错误提示
                    ui.setLoginButtonLoading(false);
                } else {
                    console.error('登录命令发送失败或后台处理失败:', response?.error);
                    ui.showToast('登录启动失败，请重试', 'error');
                    // 登录失败时恢复按钮状态
                    ui.setLoginButtonLoading(false);
                }
            } else {
                // 移除"正在登录中"提示，避免与"登录成功"Toast重复
                // 注意：登录成功时不在这里恢复按钮状态，而是在收到认证状态更新消息时恢复
            }
        });
    },

     /**
      * 处理退出登录
      */
    async handleLogout() {
        // 只负责发送消息，不关心后续逻辑
        chrome.runtime.sendMessage({ type: 'LOGOUT' }, (response) => {
            if (chrome.runtime.lastError || !response.success) {
                console.error('退出命令发送失败或后台处理失败:', response?.error);
                ui.showToast('退出启动失败，请重试', 'error');
            } else {
                // 移除"正在退出中"提示，避免与"已退出登录"Toast重复
            }
        });
    },

    /**
     * 处理手动同步
     */
    async handleManualSync() {
        const manualSyncBtn = document.getElementById('manualSyncBtn');
        if (!manualSyncBtn) return;
        
        // 检查用户是否已登录
        if (!currentUser || currentUser.id === 'local-user') {
            ui.showToast('请先登录以使用云端同步功能', 'warning');
            return;
        }
        
        try {
            // 添加旋转动画
            manualSyncBtn.classList.add('syncing');
            manualSyncBtn.disabled = true;
            
            // 向后台发送同步请求并等待完成
            const response = await new Promise((resolve, reject) => {
                chrome.runtime.sendMessage({ type: 'MANUAL_SYNC' }, (response) => {
                    if (chrome.runtime.lastError) {
                        reject(new Error(chrome.runtime.lastError.message));
                    } else {
                        resolve(response);
                    }
                });
            });
            
            if (response && response.success) {
                // 更新同步时间
                ui.updateSyncTime();
                ui.showToast('同步成功！', 'success');
            } else {
                console.error('手动同步失败:', response?.error);
                ui.showToast('同步失败: ' + (response?.error || '未知错误'), 'error');
            }
            
        } catch (error) {
            console.error('手动同步失败:', error);
            ui.showToast('同步失败，请重试', 'error');
        } finally {
            // 移除旋转动画并恢复按钮状态
            manualSyncBtn.classList.remove('syncing');
            manualSyncBtn.disabled = false;
        }
    },

    /**
     * 加载用户提示词数据
     */
    async loadUserPrompts() {
        try {
            // 使用消息通信获取提示词数据
            const response = await new Promise((resolve, reject) => {
                chrome.runtime.sendMessage({ type: 'GET_ALL_PROMPTS' }, (response) => {
                    if (chrome.runtime.lastError) {
                        reject(new Error(chrome.runtime.lastError.message));
                    } else {
                        resolve(response);
                    }
                });
            });
            
            // 检查响应是否成功
            if (!response.success) {
                throw new Error(response.error || '获取提示词数据失败');
            }
            
            const data = response.data;
            
            // 检查是否有加载错误（从后台服务返回的错误信息）
            if (response.loadError && response.loadError.hasError) {
                console.warn('检测到数据加载错误:', response.loadError.message);
                ui.showToast(response.loadError.message || '数据加载失败', 'warning');
            }
            
            // 按创建时间降序排序，新建的提示词在最上方
            allPrompts = this.sortPromptsByCreatedTime(data);

            ui.renderPrompts(allPrompts);
            ui.updateFilterButtons();
            
        } catch (err) {
            console.error('加载提示词时发生错误:', err);
            console.error('错误详情:', err.message, err.stack);
            // 即使出错，也尝试显示空列表
            allPrompts = [];
            ui.renderPrompts([]);
            ui.updateFilterButtons();
            ui.showToast('加载数据失败，请刷新重试', 'error');
        }
    },
    
    /**
     * 处理搜索功能
     * @param {string} term - 搜索关键词
     */
    handleSearch(term) {
        const lowerCaseTerm = term.toLowerCase();
        const filtered = allPrompts.filter(p => {
            // 搜索标题和内容
            const titleMatch = p.title.toLowerCase().includes(lowerCaseTerm);
            const contentMatch = p.content.toLowerCase().includes(lowerCaseTerm);
            
            // 搜索标签（优先使用tags数组，兼容旧的category字段）
            let tagMatch = false;
            if (p.tags && Array.isArray(p.tags)) {
                tagMatch = p.tags.some(tag => tag.toLowerCase().includes(lowerCaseTerm));
            } else if (p.category) {
                tagMatch = p.category.toLowerCase().includes(lowerCaseTerm);
            }
            
            // 搜索作者
            const authorMatch = p.author && p.author.toLowerCase().includes(lowerCaseTerm);
            
            return titleMatch || contentMatch || tagMatch || authorMatch;
        });
        ui.renderPrompts(filtered);
    },

    /**
     * 按创建时间排序提示词 - 从sidepanel.js迁移
     * @param {Array} prompts 提示词数组
     * @returns {Array} 排序后的提示词数组
     */
    sortPromptsByCreatedTime(prompts) {
        return prompts.sort((a, b) => {
            const timeA = new Date(a.created_at || a.createdAt || 0).getTime();
            const timeB = new Date(b.created_at || b.createdAt || 0).getTime();
            return timeB - timeA; // 降序排序，最新的在前面
        });
    },
    
    /**
     * 处理删除提示词 - 从sidepanel.js的deletePrompt迁移
     * @param {string} promptId 提示词ID
     */
    async handleDeletePrompt(promptId) {
        // 显示自定义确认弹窗
        const isConfirmed = await ui.showCustomConfirm('您确定要删除这个提示词吗？此操作无法撤销。');
        if (!isConfirmed) return;

        ui.safeShowLoading();
        
        try {
            // 【修复】先检查提示词是否存在且未被删除
            const currentPrompt = allPrompts.find(p => p.id === promptId);
            if (!currentPrompt) {
                throw new Error('提示词不存在或已被删除');
            }
            
            // 使用消息通信删除提示词
            const response = await chrome.runtime.sendMessage({
                type: 'DELETE_PROMPT',
                payload: promptId
            });
            
            if (response.success) {
                ui.showToast('删除成功', 'success');
                // UI更新由setupStorageListener自动处理
            } else {
                throw new Error(response.error || '删除提示词失败');
            }
            
        } catch (error) {
            console.error('删除失败:', error);
            ui.showToast('删除失败，请稍后再试', 'error');
            // 【修复】删除失败时，重新加载数据确保UI状态正确
            await this.loadPrompts();
        }
        
        ui.forceHideLoading();
    },

    /**
     * 清除所有数据
     */
    async clearAllData() {
        const isConfirmed = await ui.showCustomConfirm('您确定要清除所有提示词数据吗？此操作无法撤销。');
        if (!isConfirmed) return;
        
        ui.safeShowLoading();
        
        try {
            // 通过消息通信清除本地数据
            const response = await chrome.runtime.sendMessage({ type: 'CLEAR_ALL_PROMPTS' });
            
            if (response.success) {
                allPrompts = [];
                ui.renderPrompts([]);
                ui.updateFilterButtons();
                ui.showToast('所有数据已清除', 'success');
            } else {
                console.error('清除数据失败:', response.error);
                ui.showToast('清除数据失败，请稍后再试', 'error');
            }
        } catch (error) {
            console.error('清除数据失败:', error);
            ui.showToast('清除数据失败，请稍后再试', 'error');
        }
        
        ui.forceHideLoading();
    },

    /**
     * 下载模板
     */
    async handleDownloadTemplate() {
        try {
            ui.safeShowLoading();
            const result = await window.JSONUtils.downloadTemplate();
            if (result.success) {
                ui.showToast('JSON模板下载成功！', 'success');
            } else {
                ui.showToast(result.message, 'error');
            }
        } catch (error) {
            console.error('下载模板失败:', error);
            ui.showToast('下载模板失败，请稍后再试', 'error');
        } finally {
            ui.forceHideLoading();
        }
    },

    /**
     * 导出提示词
     */
    async handleExport() {
        try {
            if (allPrompts.length === 0) {
                ui.showToast('没有可导出的提示词', 'warning');
                return;
            }
            
            ui.safeShowLoading();
            const result = await window.JSONUtils.exportToJSON(allPrompts);
            if (result.success) {
                ui.showToast(result.message, 'success');
            } else {
                ui.showToast(result.message, 'error');
            }
        } catch (error) {
            console.error('导出失败:', error);
            ui.showToast('导出失败，请稍后再试', 'error');
        } finally {
            ui.forceHideLoading();
        }
    },

    /**
     * 处理文件导入
     */
    async handleFileImport(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        // 重置文件输入
        event.target.value = '';
        
        try {
            ui.safeShowLoading();
            
            // 检查文件类型
            const fileName = file.name.toLowerCase();
            if (!fileName.endsWith('.json')) {
                ui.showToast('请选择JSON文件（.json格式）', 'warning');
                return;
            }
            
            // 导入数据
            const importResult = await window.JSONUtils.importFromJSON(file);
            
            if (!importResult.success) {
                ui.showToast(importResult.message || '导入失败', 'error');
                return;
            }
            
            const { prompts: importedPrompts, errors, total, imported } = importResult;
            
            if (imported === 0) {
                ui.showToast(`导入完成：共 ${total} 条记录，全部导入失败。请检查JSON格式是否正确。`, 'error');
                if (errors && errors.length > 0) {
                    const downloadFailed = await ui.showCustomConfirm('是否下载失败记录？');
                    if (downloadFailed) {
                        await window.JSONUtils.exportFailedRecords(errors);
                    }
                }
                return;
            }
            
            // 通过消息通信处理导入
            const response = await chrome.runtime.sendMessage({
                type: 'IMPORT_PROMPTS',
                payload: { importedPrompts }
            });
            
            if (response.success) {
                 const { addedCount, updatedCount } = response.data;
                 
                 // 关闭设置弹窗
                 settingsOverlay.style.display = 'none';
                 
                 // 显示导入结果
                 let message = `导入完成：\n共计 ${total} 条记录\n新增 ${addedCount} 条`;
                 if (updatedCount > 0) {
                     message += `\n更新 ${updatedCount} 条（同名覆盖）`;
                 }
                 if (errors && errors.length > 0) {
                     message += `\n失败 ${errors.length} 条`;
                 }
                 
                 ui.showToast(message, addedCount > 0 || updatedCount > 0 ? 'success' : 'warning');
                 // 注意：不再手动调用loadUserPrompts()，依赖chrome.storage.onChanged自动刷新UI
             } else {
                 console.error('导入失败:', response.error);
                 ui.showToast('导入失败：' + response.error, 'error');
             }
            
            // 如果有失败记录，询问是否下载
            if (errors && errors.length > 0) {
                const downloadFailed = await ui.showCustomConfirm('是否下载失败记录？');
                if (downloadFailed) {
                    await window.JSONUtils.exportFailedRecords(errors);
                }
            }
            
        } catch (error) {
            console.error('导入失败:', error);
            ui.showToast('导入失败：' + error.message, 'error');
        } finally {
            ui.forceHideLoading();
        }
    },
    
    /**
     * 处理添加新提示词 - 从sidepanel.js迁移
     */
    handleAddPrompt() {
        this.resetForm();
        ui.showView('formView');
    },
    
    /**
     * 处理保存提示词 - 从sidepanel.js的savePrompt迁移
     */
    async handleSavePrompt() {
        const id = ui.promptIdInput.value;
        const title = ui.promptTitleInput.value.trim();
        const content = ui.promptContentInput.value.trim();
        const tags = this.tagManager.getTags();
        const author = ui.promptAuthorInput ? ui.promptAuthorInput.value.trim() : '';

        if (!title || !content) {
            ui.showToast('标题和内容不能为空！', 'warning');
            return;
        }

        // 检查内容长度（10000个字符限制）
        if (content.length > 10000) {
            ui.showToast('提示词内容不能超过10000个字符！', 'warning');
            return;
        }

        ui.safeShowLoading();
        
        try {
            const promptData = {
                user_id: currentUser.id,
                title,
                content,
                tags: tags.length > 0 ? tags : ['未分类'],
                author: author || ''
            };
            
            let response;
            if (id) {
                // 更新现有提示词
                response = await chrome.runtime.sendMessage({
                    type: 'UPDATE_PROMPT',
                    payload: {
                        id: id,
                        data: promptData
                    }
                });
                
                if (response.success) {
                    ui.showToast('提示词更新成功', 'success');
                } else {
                    throw new Error(response.error || '更新提示词失败');
                }
            } else {
                // 添加新提示词
                response = await chrome.runtime.sendMessage({
                    type: 'ADD_PROMPT',
                    payload: {
                        ...promptData,
                        is_deleted: false
                    }
                });
                
                if (response.success) {
                    ui.showToast('提示词添加成功', 'success');
                } else {
                    throw new Error(response.error || '添加提示词失败');
                }
            }
            
            // 重新加载数据刷新UI
            // await this.initializeApp();
            ui.showView('mainView');
            
        } catch (error) {
            console.error('保存提示词失败:', error);
            ui.showToast('保存失败，请稍后再试', 'error');
        }
        
        ui.forceHideLoading();
    },
    
    /**
     * 重置表单为新建状态 - 从sidepanel.js迁移
     */
    resetForm() {
        ui.promptIdInput.value = '';
        ui.promptTitleInput.value = '';
        ui.promptContentInput.value = '';
        
        // 清空标签组件
        if (this.tagManager) {
            this.tagManager.clear();
        }
        
        // 清空作者字段
        if (ui.promptAuthorInput) {
            ui.promptAuthorInput.value = '';
        }
        
        ui.formTitle.textContent = '添加新提示词';
        // 重置textarea高度
        ui.autoResizeTextarea(ui.promptContentInput);
    },
    
    // --- 版本日志业务逻辑 ---

    /**
     * 加载版本日志数据
     * @returns {Promise<Object>} 版本日志数据
     */
    async loadVersionLogData() {
        try {
            const response = await fetch('/assets/data/version-log.json');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error('加载版本日志数据失败:', error);
            return null;
        }
    },

    /**
     * 初始化版本日志
     */
    async initializeVersionLog() {
        // 检查是否有新版本
        await ui.checkForNewVersion();
    },

    /**
     * 初始化主题设置
     */
    async initializeTheme() {
        try {
            // 通过消息通信获取主题模式
            const response = await chrome.runtime.sendMessage({ 
                type: 'GET_THEME_MODE'
            });
            
            if (response && response.success) {
                themeMode = response.data || 'light';
            } else {
                themeMode = 'light';
            }
            
            ui.applyTheme(themeMode);
        } catch (error) {
            console.error('获取主题模式时发生错误:', error);
            themeMode = 'light';
            ui.applyTheme(themeMode);
        }
    },

    /**
     * 处理主题变更 - 从setupEventListeners迁移
     * @param {string} selectedTheme - 选中的主题
     */
    async handleThemeChange(selectedTheme) {
        if (selectedTheme !== themeMode) {
            themeMode = selectedTheme;
            ui.applyTheme(themeMode);
            
            // 通过消息通信保存主题模式
            try {
                const response = await chrome.runtime.sendMessage({ 
                    type: 'SET_THEME_MODE', 
                    payload: themeMode 
                });
                if (!response.success) {
                    console.error('保存主题模式失败:', response.error);
                }
            } catch (error) {
                console.error('保存主题模式时发生错误:', error);
            }
        }
    },

    /**
     * 处理系统主题变化
     */
    handleSystemThemeChange() {
        if (themeMode === 'auto') {
            ui.applyTheme('auto');
        }
    },

    /**
     * 设置事件监听器
     */
    setupEventListeners() {
        // 主题选择器事件处理
        document.addEventListener('click', (e) => {
            const themeOption = e.target.closest('.theme-option');
            if (themeOption) {
                const selectedTheme = themeOption.dataset.theme;
                this.handleThemeChange(selectedTheme);
            }
        });

        // 监听系统主题变化
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
            this.handleSystemThemeChange();
        });

        ui.addPromptBtn.addEventListener('click', () => {
            this.handleAddPrompt();
        });

        // 搜索延迟处理
        let searchTimeout = null;
        ui.searchInput.addEventListener('input', (e) => {
            const searchTerm = e.target.value.trim();
            
            if (searchTimeout) {
                clearTimeout(searchTimeout);
            }
            
            if (searchTerm === '') {
                this.handleSearch('');
                return;
            }
            
            if (searchTerm.length < 1) {
                return;
            }
            
            searchTimeout = setTimeout(() => {
                this.handleSearch(searchTerm);
            }, 300);
        });
        
        ui.backToListBtn.addEventListener('click', () => ui.showView('mainView'));
        ui.cancelFormBtn.addEventListener('click', () => ui.showView('mainView'));
        ui.savePromptBtn.addEventListener('click', () => {
            this.handleSavePrompt();
        });
        
        // 字符计数功能
        const characterCountElement = document.getElementById('characterCount');
        
        ui.promptContentInput.addEventListener('input', () => {
            const currentLength = ui.promptContentInput.value.length;
            characterCountElement.textContent = `${currentLength} / 10000`;
            
            if (currentLength > 9000) {
                characterCountElement.style.color = '#ef4444';
            } else if (currentLength > 8000) {
                characterCountElement.style.color = '#f59e0b';
            } else {
                characterCountElement.style.color = '#64748b';
            }
            
            ui.autoResizeTextarea(ui.promptContentInput);
        });
        
        ui.autoResizeTextarea(ui.promptContentInput);
        
        // 在表单显示时更新字符计数
        const updateCharacterCount = () => {
            const currentLength = ui.promptContentInput.value.length;
            if (characterCountElement) {
                characterCountElement.textContent = `${currentLength} / 10000`;
            }
        };
        
        const originalShowView = ui.showView;
        ui.showView = function(viewName) {
            originalShowView.call(ui, viewName);
            if (viewName === 'formView') {
                setTimeout(updateCharacterCount, 0);
            }
        };
        
        // 设置相关事件监听器
        ui.settingsBtn.addEventListener('click', () => {
            ui.settingsOverlay.style.display = 'flex';
        });
        
        ui.settingsClose.addEventListener('click', () => {
            ui.settingsOverlay.style.display = 'none';
        });
        
        ui.settingsOverlay.addEventListener('click', (e) => {
            if (e.target === ui.settingsOverlay) {
                ui.settingsOverlay.style.display = 'none';
            }
        });
        
        // 版本日志相关事件监听器
        if (ui.versionNumber) {
            ui.versionNumber.addEventListener('click', () => ui.showVersionLog());
        }
        
        if (ui.versionLogClose) {
            ui.versionLogClose.addEventListener('click', () => {
                ui.versionLogOverlay.style.display = 'none';
            });
        }
        
        if (ui.versionLogOverlay) {
            ui.versionLogOverlay.addEventListener('click', (e) => {
                if (e.target === ui.versionLogOverlay) {
                    ui.versionLogOverlay.style.display = 'none';
                }
            });
        }
        
        // 导入导出功能
        ui.downloadTemplateBtn.addEventListener('click', () => this.handleDownloadTemplate());
        ui.exportBtn.addEventListener('click', () => this.handleExport());
        ui.importBtn.addEventListener('click', () => {
            ui.fileInput.click();
        });
        
        // 设置页面中的Google登录按钮
        const googleSignInBtn = document.getElementById('googleSignInBtn');
        if (googleSignInBtn) {
            googleSignInBtn.addEventListener('click', () => this.handleGoogleSignIn());
        }
        
        // 设置页面中的退出登录按钮
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => this.handleLogout());
        }
        
        // 手动同步按钮事件监听器
        const manualSyncBtn = document.getElementById('manualSyncBtn');
        if (manualSyncBtn) {
            manualSyncBtn.addEventListener('click', () => this.handleManualSync());
        }
        
        ui.fileInput.addEventListener('change', (event) => this.handleFileImport(event));
    },

    /**
     * 处理分类筛选
     */
    handleFilter(tag, event) {
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        event.target.classList.add('active');

        if (tag === '全部') {
            ui.renderPrompts(allPrompts);
        } else {
            const filtered = allPrompts.filter(p => {
                // 优先使用tags数组，如果不存在则兼容旧的category字段
                if (p.tags && Array.isArray(p.tags)) {
                    return p.tags.includes(tag);
                } else if (p.category) {
                    return p.category === tag;
                }
                return false;
            });
            ui.renderPrompts(filtered);
        }
    },

    /**
     * 设置存储变化监听器 - 从setupEventListeners迁移
     */
    setupStorageListener() {
        if (chrome.storage && chrome.storage.onChanged) {
            chrome.storage.onChanged.addListener((changes, namespace) => {
                // 监听同步时间的变化
                if (changes.lastSyncTime) {
                    ui.updateSyncTime();
                }
                
                // 监听提示词数据的变化
                if (changes.prompts) {
                    const newPrompts = changes.prompts.newValue || [];
                // 【核心修复】在更新全局状态和UI之前，必须先过滤掉已删除的项
                    const activePrompts = newPrompts.filter(p => !p.is_deleted);

                // 使用过滤后的、只包含活动条目的列表来更新全局状态
                    allPrompts = this.sortPromptsByCreatedTime(activePrompts);
                    ui.renderPrompts(allPrompts);
                    ui.updateFilterButtons();
                }
            });
        }
    },

    /**
     * 格式化右键菜单文本 - 从sidepanel.js迁移
     * @param {string} text - 原始文本
     * @returns {string} 格式化后的文本
     */
    formatContextMenuText(text) {
        if (!text || typeof text !== 'string') {
            return text;
        }
        
        let formattedText = text;
        
        // 1. 处理HTML实体字符
        const htmlEntities = {
            '&nbsp;': ' ',
            '&amp;': '&',
            '&lt;': '<',
            '&gt;': '>',
            '&quot;': '"',
            '&#39;': "'",
            '&hellip;': '...',
            '&mdash;': '—',
            '&ndash;': '–'
        };
        
        Object.keys(htmlEntities).forEach(entity => {
            formattedText = formattedText.replace(new RegExp(entity, 'g'), htmlEntities[entity]);
        });
        
        // 2. 检测并处理Markdown格式
        const hasMarkdown = /\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|#{1,6}\s/.test(formattedText);
        
        if (hasMarkdown) {
            // Markdown格式处理
            formattedText = formattedText.replace(/(\*\*[^*]+\*\*)\s+/g, '$1\n\n');
            formattedText = formattedText.replace(/(\*\*[^*]+：\*\*)\s+/g, '$1\n\n');
            formattedText = formattedText.replace(/(\*\*[^*]+:\*\*)\s+/g, '$1\n\n');
            formattedText = formattedText.replace(/\s+(\*\s+|\-\s+|\d+\.\s+)/g, '\n$1');
        }
        
        // 3. 智能段落分割 - 基于标点符号和语义
        // 处理中文标点后的段落分割
        formattedText = formattedText.replace(/([。！？])\s*([^\s。！？])/g, '$1\n\n$2');
        
        // 处理英文句号后的段落分割（大写字母开头）
        formattedText = formattedText.replace(/([.!?])\s+([A-Z][a-z])/g, '$1\n\n$2');
        
        // 处理冒号后的内容（通常是解释或列表）
        formattedText = formattedText.replace(/([：:])\s*([^\s：:])/g, '$1\n\n$2');
        
        // 4. 处理列表项（支持多种列表格式）
        // 数字列表：1. 2. 3. 或 1) 2) 3)
        formattedText = formattedText.replace(/\s+(\d+[.).])\s+/g, '\n$1');
        
        // 符号列表：* - • ○ ▪ ▫
        formattedText = formattedText.replace(/\s+([*\-•○▪▫]\s+)/g, '\n$1');
        
        // 5. 处理特殊格式标识
        // 处理括号内的标注
        formattedText = formattedText.replace(/\s+(\([^)]+\))\s*/g, ' $1\n\n');
        
        // 处理引用格式
        formattedText = formattedText.replace(/\s+(>\s+)/g, '\n$1');
        
        // 6. 智能检测段落边界
        // 检测可能的段落标题（全大写、数字编号等）
        formattedText = formattedText.replace(/\s+([A-Z][A-Z\s]{2,}[A-Z])\s+/g, '\n\n$1\n\n');
        
        // 检测编号标题（如：第一章、Chapter 1等）
        formattedText = formattedText.replace(/\s+(第[一二三四五六七八九十\d]+[章节部分])\s+/g, '\n\n$1\n\n');
        formattedText = formattedText.replace(/\s+(Chapter\s+\d+|Section\s+\d+)\s+/gi, '\n\n$1\n\n');
        
        // 7. 处理特殊的网页文本模式
        // 处理可能的表格数据（制表符分隔）
        formattedText = formattedText.replace(/\t+/g, ' | ');
        
        // 处理连续的空格（可能来自网页布局）
        formattedText = formattedText.replace(/[ \u00A0]{3,}/g, '\n\n');
        
        // 8. 清理和规范化
        // 清理多余的空格
        formattedText = formattedText.replace(/[ \t]+/g, ' ');
        
        // 规范化换行符（最多保留两个连续换行）
        formattedText = formattedText.replace(/\n{3,}/g, '\n\n');
        
        // 清理行首行尾空格
        formattedText = formattedText.split('\n').map(line => line.trim()).join('\n');
        
        // 去除开头和结尾的空白字符
        formattedText = formattedText.trim();
        
        // 9. 最后的智能优化
        // 如果文本很短且没有明显的段落结构，保持原样
        if (formattedText.length < 100 && !formattedText.includes('\n\n')) {
            return text.trim();
        }
        
        return formattedText;
    },

    // --- 版本日志业务逻辑 ---

    /**
     * 加载版本日志数据
     * @returns {Promise<Object>} 版本日志数据
     */
    async loadVersionLogData() {
        try {
            const response = await fetch('/assets/data/version-log.json');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error('加载版本日志数据失败:', error);
            return null;
        }
    },

    /**
     * 初始化版本日志
     */
    async initializeVersionLog() {
        // 检查是否有新版本
        await ui.checkForNewVersion();
    },

    /**
     * 设置消息监听器 - 从sidepanel.js迁移
     */
    setupMessageListener() {
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            // 处理来自后台的消息
            switch (message.type) {
                case 'UPDATE_AUTH_UI':
                    console.log('Sidepanel: 收到 UPDATE_AUTH_UI 消息', message.session);
                    ui.updateUIForAuthState(message.session);
                    ui.setLoginButtonLoading(false);
                    if (message.session) {
                        ui.showToast('登录成功！', 'success');
                        const userDropdown = document.getElementById('userDropdown');
                        if (userDropdown) {
                            userDropdown.classList.remove('show');
                        }
                    } else {
                        ui.showToast('已退出登录', 'success');
                    }
                    break;
                    
                case 'LOGIN_PROGRESS':
                    ui.setLoginButtonLoading(true, message.message);
                    break;
                    
                case 'LOGIN_ERROR':
                    ui.showToast('登录失败: ' + message.error, 'error');
                    ui.setLoginButtonLoading(false);
                    break;
                    
                case 'LOGIN_CANCELLED':
                    ui.setLoginButtonLoading(false);
                    break;
                    
                case 'LOGOUT_ERROR':
                    ui.showToast('退出失败: ' + message.error, 'error');
                    break;
                    
                case 'DATA_CHANGED':
                   
                    // 避免重复渲染。这个case可以保留为空，或用于将来其他非UI的通知。
                     console.log('DATA_CHANGED message received, but UI update is now handled by storage listener.');
                    break;
                    
                case 'SYNC_STATUS_CHANGED':
                    if (message.operation === 'SYNC_COMPLETED') {
                        ui.updateSyncTime();
                    }
                    break;
                    
                case 'ADD_FROM_CONTEXT_MENU':
                    if (message.data?.content) {
                        isProcessingContextMenu = true;
                        const waitForInitialization = async () => {
                            if (currentUser && ui.addPromptBtn && ui.promptContentInput) {
                                const isEditing = ui.promptIdInput.value && ui.promptIdInput.value.trim() !== '';
                                if (ui.currentView !== 'formView') {
                                    ui.showView('formView');
                                    requestAnimationFrame(() => {
                                        this.resetForm();
                                        ui.promptContentInput.value = this.formatContextMenuText(message.data.content);
                                        ui.promptContentInput.dispatchEvent(new Event('input', { bubbles: true }));
                                        setTimeout(() => { isProcessingContextMenu = false; }, 1000);
                                        sendResponse({ status: "success", message: "Content received and form populated via rAF after view switch." });
                                    });
                                } else if (isEditing) {
                                    const userConfirm = await ui.showCustomConfirm('💡 是否要放弃当前编辑并创建新的提示词？');
                                    if (userConfirm) {
                                        requestAnimationFrame(() => {
                                            this.resetForm();
                                            ui.promptContentInput.value = this.formatContextMenuText(message.data.content);
                                            ui.promptContentInput.dispatchEvent(new Event('input', { bubbles: true }));
                                            setTimeout(() => { isProcessingContextMenu = false; }, 1000);
                                            sendResponse({ status: "success", message: "User confirmed to abandon edit and create new prompt." });
                                        });
                                    } else {
                                        setTimeout(() => { isProcessingContextMenu = false; }, 100);
                                        sendResponse({ status: "cancelled", message: "User cancelled the operation." });
                                    }
                                } else {
                                    requestAnimationFrame(() => {
                                        this.resetForm();
                                        ui.promptContentInput.value = this.formatContextMenuText(message.data.content);
                                        ui.promptContentInput.dispatchEvent(new Event('input', { bubbles: true }));
                                        setTimeout(() => { isProcessingContextMenu = false; }, 1000);
                                        sendResponse({ status: "success", message: "Content received and form populated via rAF in existing view." });
                                    });
                                }
                            } else {
                                setTimeout(waitForInitialization, 100);
                            }
                        };
                        waitForInitialization();
                        return true; // 保持消息通道开放以进行异步响应
                    }
                    break;
                    
                // 对于所有其他类型的消息，我们都静默处理，不做任何响应。
                // 这样就不会干扰 background.js 的工作了。
                default:
                    // 不做任何事情
                    break;
            }

            // 默认返回 false 或 undefined，表示我们是同步处理的，并且已经处理完毕。
            // 这就把响应的机会留给了其他脚本。
            return false;
        });
    }
};

// 暴露app对象供其他模块使用
window.app = app;