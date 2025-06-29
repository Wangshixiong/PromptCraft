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
        if (!currentUser) {
            console.error('无法加载提示词：用户未设置');
            return;
        }
        
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

        safeShowLoading();
        
        try {
            // 使用消息通信删除提示词
            const response = await chrome.runtime.sendMessage({
                type: 'DELETE_PROMPT',
                payload: promptId
            });
            
            if (response.success) {
                ui.showToast('删除成功', 'success');
                
                // 重新加载数据刷新UI
                await this.initializeApp();
            } else {
                throw new Error(response.error || '删除提示词失败');
            }
            
        } catch (error) {
            console.error('删除失败:', error);
            ui.showToast('删除失败，请稍后再试', 'error');
        }
        
        forceHideLoading();
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
        const category = ui.promptCategoryInput.value.trim() || '未分类';

        if (!title || !content) {
            ui.showToast('标题和内容不能为空！', 'warning');
            return;
        }

        // 检查内容长度（10000个字符限制）
        if (content.length > 10000) {
            ui.showToast('提示词内容不能超过10000个字符！', 'warning');
            return;
        }

        safeShowLoading();
        
        try {
            const promptData = {
                user_id: currentUser.id,
                title,
                content,
                category
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
            await this.initializeApp();
            ui.showView('mainView');
            
        } catch (error) {
            console.error('保存提示词失败:', error);
            ui.showToast('保存失败，请稍后再试', 'error');
        }
        
        forceHideLoading();
    },
    
    /**
     * 重置表单为新建状态 - 从sidepanel.js迁移
     */
    resetForm() {
        ui.promptIdInput.value = '';
        ui.promptTitleInput.value = '';
        ui.promptContentInput.value = '';
        ui.promptCategoryInput.value = '';
        ui.promptCategorySelect.value = '';
        ui.promptCategorySelect.style.display = 'none';
        ui.promptCategoryInput.style.display = 'block';
        ui.formTitle.textContent = '添加新提示词';
        // 重置textarea高度
        ui.autoResizeTextarea(ui.promptContentInput);
    }
    
    // 业务逻辑处理方法将在任务7-8中迁移到这里
};

// 暴露app对象供其他模块使用
window.app = app;