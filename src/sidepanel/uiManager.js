/**
 * UIManager - UI管理器
 * 职责: 负责所有与DOM相关的操作，包括元素管理、UI渲染和状态更新
 * 创建时间: 2025-06-25
 */

// UI管理器对象
const ui = {
    // DOM 元素引用
    loadingOverlay: document.getElementById('loadingOverlay'),
    mainView: document.getElementById('mainView'),
    formView: document.getElementById('formView'),
    addPromptBtn: document.getElementById('addPromptBtn'),
    searchInput: document.getElementById('searchInput'),
    promptsContainer: document.getElementById('promptsContainer'),
    filterContainer: document.getElementById('filterContainer'),
    backToListBtn: document.getElementById('backToListBtn'),
    cancelFormBtn: document.getElementById('cancelFormBtn'),
    savePromptBtn: document.getElementById('savePromptBtn'),
    formTitle: document.getElementById('formTitle'),
    promptIdInput: document.getElementById('promptIdInput'),
    promptTitleInput: document.getElementById('promptTitleInput'),
    promptContentInput: document.getElementById('promptContentInput'),
    promptCategoryInput: document.getElementById('promptCategoryInput'),
    promptCategorySelect: document.getElementById('promptCategorySelect'),
    settingsBtn: document.getElementById('settingsBtn'),
    settingsOverlay: document.getElementById('settingsOverlay'),
    settingsClose: document.getElementById('settingsClose'),
    importBtn: document.getElementById('importBtn'),
    exportBtn: document.getElementById('exportBtn'),
    downloadTemplateBtn: document.getElementById('downloadTemplateBtn'),
    fileInput: document.getElementById('fileInput'),
    // 版本日志相关元素
    versionNumber: document.getElementById('versionNumber'),
    versionNew: document.getElementById('versionNew'),
    versionLogOverlay: document.getElementById('versionLogOverlay'),
    versionLogClose: document.getElementById('versionLogClose'),
    versionLogBody: document.getElementById('versionLogBody'),
    
    // 当前视图状态
    currentView: null,
    
    /**
     * 切换视图显示
     * @param {string} viewId - 视图ID
     * @returns {boolean} 切换是否成功
     */
    showView(viewId) {
        try {
            // 隐藏所有视图
            document.querySelectorAll('.view').forEach(view => {
                view.classList.remove('active');
            });
            
            // 获取目标视图元素
            const targetView = document.getElementById(viewId);
            if (!targetView) {
                console.error(`错误：找不到视图元素 ID: ${viewId}`);
                return false;
            }
            
            // 显示目标视图
            targetView.classList.add('active');
            this.currentView = viewId;
            
            // 强制重绘以确保样式生效
            targetView.offsetHeight;
            
            // 智能检查视图显示状态（避免初始化时的误报）
            setTimeout(() => {
                // 确保元素仍然存在且是当前视图
                if (!targetView.parentNode || this.currentView !== viewId) {
                    return;
                }
                
                // 检查CSS是否已加载完成
                const isStylesLoaded = document.readyState === 'complete' && 
                                     getComputedStyle(document.body).fontFamily !== '';
                
                if (!isStylesLoaded) {
                    return;
                }
                
                const computedStyle = window.getComputedStyle(targetView);
                const isVisible = computedStyle.display !== 'none' && 
                                targetView.offsetWidth > 0 && 
                                targetView.offsetHeight > 0;
                
                // 只有在确实有问题且不是初始化阶段时才显示警告和重试
                if (!isVisible && targetView.classList.contains('active')) {
                    // 额外检查：确保不是在页面加载的前几秒内
                    const pageLoadTime = performance.now();
                    if (pageLoadTime > 3000) { // 页面加载3秒后才报警告
                        console.warn(`警告：视图 ${viewId} 可能未正确显示，尝试重新应用样式`);
                        // 重新应用active类
                        targetView.classList.remove('active');
                        // 使用requestAnimationFrame确保DOM更新
                        requestAnimationFrame(() => {
                            if (this.currentView === viewId) {
                                targetView.classList.add('active');
                            }
                        });
                    }
                }
            }, 300); // 增加延迟时间，确保CSS和动画完成
            
            return true;
        } catch (err) {
            console.error(`切换视图到 ${viewId} 时发生错误:`, err);
            return false;
        }
    },
    
    /**
     * 渲染提示词列表
     * @param {Array} promptsToRender - 要渲染的提示词数组
     */
    renderPrompts(promptsToRender) {
        try {
            // 清空骨架屏占位符和所有内容
            this.promptsContainer.innerHTML = '';

            if (promptsToRender.length === 0) {
                this.promptsContainer.innerHTML = `<div style="text-align: center; padding: 40px 20px; color: #64748b;"><i class="fas fa-inbox" style="font-size: 48px; margin-bottom: 16px;"></i><h3>空空如也</h3><p>点击上方按钮添加您的第一个提示词吧！</p></div>`;
                return;
            }

            promptsToRender.forEach((prompt, index) => {
                try {
                    if (!prompt || !prompt.id) {
                        console.error(`跳过无效提示词，索引: ${index}`, prompt);
                        return;
                    }
                    
                    const card = document.createElement('div');
                    card.className = 'prompt-card fade-in';
                    card.dataset.id = prompt.id;
                    card.innerHTML = `
                        <div class="prompt-header">
                            <div class="prompt-title">${this.escapeHtml(prompt.title || '无标题')}</div>
                            <div class="prompt-actions">
                                <button class="action-btn edit-btn" data-id="${prompt.id}"><i class="fas fa-edit"></i></button>
                                <button class="action-btn delete-btn" data-id="${prompt.id}"><i class="fas fa-trash"></i></button>
                            </div>
                        </div>
                        ${prompt.category ? `<div class="prompt-category">${this.escapeHtml(prompt.category)}</div>` : ''}
                        <div class="prompt-content">${this.escapeHtml(prompt.content || '')}</div>
                        <div class="prompt-footer">
                            <div>${this.formatDate(prompt.created_at)}</div>
                            <button class="copy-btn" data-content="${this.escapeHtml(prompt.content || '')}"><i class="fas fa-copy"></i> 复制</button>
                        </div>
                    `;
                    this.promptsContainer.appendChild(card);
                } catch (cardErr) {
                    console.error(`渲染提示词卡片错误，索引: ${index}`, cardErr);
                }
            });
            
            this.addCardEventListeners();
        
        } catch (err) {
            console.error('渲染提示词时发生错误:', err);
            console.error('错误详情:', err.message, err.stack);
        }
    },

    /**
     * 格式化日期显示
     * @param {string} dateString - 日期字符串
     * @returns {string} 格式化后的日期
     */
    formatDate(dateString) {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
    },

    /**
     * HTML转义函数
     * @param {string} text - 需要转义的文本
     * @returns {string} 转义后的文本
     */
    escapeHtml(text) {
        if (typeof text !== 'string') return '';
        return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
    },

    /**
     * HTML反转义函数
     * @param {string} text - 需要反转义的文本
     * @returns {string} 反转义后的文本
     */
    unescapeHtml(text) {
        if (typeof text !== 'string') return '';
        return text.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#039;/g, "'");
    },

    /**
     * 自动调整textarea高度以适应内容
     * @param {HTMLTextAreaElement} textarea - 需要调整高度的textarea元素
     */
    autoResizeTextarea(textarea) {
        // 重置高度为最小值，以便正确计算scrollHeight
        textarea.style.height = '120px';
        
        // 计算内容所需的高度
        const scrollHeight = textarea.scrollHeight;
        const maxHeight = parseInt(getComputedStyle(textarea).maxHeight);
        
        // 设置新高度，不超过最大高度
        if (scrollHeight <= maxHeight) {
            textarea.style.height = scrollHeight + 'px';
        } else {
            textarea.style.height = maxHeight + 'px';
        }
    },

    /**
     * 显示提示词预览弹窗
     * @param {Object} prompt - 提示词对象
     */
    showPreview(prompt) {
        const overlay = document.createElement('div');
        overlay.className = 'preview-overlay';
        
        const modal = document.createElement('div');
        modal.className = 'preview-modal';
        
        modal.innerHTML = `
            <div class="preview-header">
                <div class="preview-title-section">
                    <h2 class="preview-title">${this.escapeHtml(prompt.title || '无标题')}</h2>
                    ${prompt.category ? `<div class="preview-category">${this.escapeHtml(prompt.category)}</div>` : ''}
                </div>
                <button class="preview-close">&times;</button>
            </div>
            <div class="preview-body">
                <div class="preview-content">${this.escapeHtml(prompt.content || '')}</div>
            </div>
            <div class="preview-footer">
                <div class="preview-date">${this.formatDate(prompt.created_at)}</div>
                <button class="preview-copy-btn"><i class="fas fa-copy"></i> 复制</button>
            </div>
        `;
        
        overlay.appendChild(modal);
        document.body.appendChild(overlay);
        
        // 关闭按钮事件
        modal.querySelector('.preview-close').onclick = () => {
            overlay && overlay.remove();
        };
        
        // 点击遮罩关闭
        overlay.onclick = (e) => {
            if (e.target === overlay) {
                overlay && overlay.remove();
            }
        };
        
        // 复制按钮事件
        const copyBtn = modal.querySelector('.preview-copy-btn');
        copyBtn.onclick = () => {
            navigator.clipboard.writeText(prompt.content || '').then(() => {
                const originalText = copyBtn.innerHTML;
                copyBtn.innerHTML = '<i class="fas fa-check"></i> 已复制!';
                copyBtn.style.background = 'var(--success)';
                setTimeout(() => {
                    copyBtn.innerHTML = originalText;
                    copyBtn.style.background = '';
                }, 1500);
            });
        };
        
        // ESC键关闭
        const handleEsc = (e) => {
            if (e.key === 'Escape') {
                overlay && overlay.remove();
                document.removeEventListener('keydown', handleEsc);
            }
        };
        document.addEventListener('keydown', handleEsc);
    },

    /**
     * 更新分类筛选按钮
     */
    updateFilterButtons() {
        const categories = ['全部', ...new Set(allPrompts.map(p => p.category).filter(Boolean))];
        this.filterContainer.innerHTML = '';
        categories.forEach(cat => {
            const btn = document.createElement('button');
            btn.className = 'filter-btn';
            if (cat === '全部') btn.classList.add('active');
            btn.textContent = cat;
            btn.addEventListener('click', (e) => this.handleFilter(cat, e));
            this.filterContainer.appendChild(btn);
        });
        
        // 更新分类下拉选项
        this.updateCategoryOptions();
    },

    /**
     * 更新分类下拉选项
     */
    updateCategoryOptions() {
        const existingCategories = [...new Set(allPrompts.map(p => p.category).filter(Boolean))];
        this.promptCategorySelect.innerHTML = '<option value="">选择分类</option>';
        existingCategories.forEach(category => {
            const option = document.createElement('option');
            option.value = category;
            option.textContent = category;
            this.promptCategorySelect.appendChild(option);
        });
    },

    /**
     * 设置分类输入框的自动建议功能
     */
    setupCategoryInput() {
        // 创建分类建议容器
        const suggestionContainer = document.createElement('div');
        suggestionContainer.style.cssText = `
            position: absolute;
            top: 100%;
            left: 0;
            right: 0;
            background: var(--card-light);
            border: 1px solid var(--border-light);
            border-radius: 8px;
            max-height: 150px;
            overflow-y: auto;
            z-index: 1000;
            display: none;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        `;
        
        // 设置分类输入框的父容器为相对定位
        this.promptCategoryInput.parentElement.style.position = 'relative';
        this.promptCategoryInput.parentElement.appendChild(suggestionContainer);

        // 监听输入框聚焦事件
        this.promptCategoryInput.addEventListener('focus', () => {
            updateCategorySuggestions();
        });
        
        // 输入框输入时更新建议
        this.promptCategoryInput.addEventListener('input', () => {
            updateCategorySuggestions();
        });
        
        // 点击其他地方时隐藏建议
        document.addEventListener('click', (e) => {
            if (!this.promptCategoryInput.contains(e.target) && !suggestionContainer.contains(e.target)) {
                suggestionContainer.style.display = 'none';
            }
        });
        
        const updateCategorySuggestions = () => {
            const existingCategories = [...new Set(allPrompts.map(p => p.category).filter(Boolean))];
            const inputValue = this.promptCategoryInput.value.toLowerCase();
            
            // 过滤匹配的分类
            const filteredCategories = existingCategories.filter(cat => 
                cat.toLowerCase().includes(inputValue)
            );
            
            if (filteredCategories.length > 0) {
                suggestionContainer.innerHTML = '';
                filteredCategories.forEach(category => {
                    const item = document.createElement('div');
                    item.style.cssText = `
                        padding: 8px 12px;
                        cursor: pointer;
                        border-bottom: 1px solid var(--border-light);
                        color: var(--text-light);
                        background-color: var(--background-light);
                    `;
                    item.textContent = category;
                    
                    // 暗色模式样式
                    if (document.body.classList.contains('dark-mode')) {
                        item.style.color = 'var(--text-dark)';
                        item.style.backgroundColor = 'var(--background-dark)';
                        item.style.borderColor = 'var(--border-dark)';
                    }
                    
                    item.addEventListener('mouseenter', () => {
                        item.style.backgroundColor = 'var(--primary-color)';
                        item.style.color = 'white';
                    });
                    
                    item.addEventListener('mouseleave', () => {
                        item.style.backgroundColor = document.body.classList.contains('dark-mode') ? 'var(--background-dark)' : 'var(--background-light)';
                        item.style.color = document.body.classList.contains('dark-mode') ? 'var(--text-dark)' : 'var(--text-light)';
                    });
                    
                    item.addEventListener('click', () => {
                        this.promptCategoryInput.value = category;
                        suggestionContainer.style.display = 'none';
                    });
                    
                    suggestionContainer.appendChild(item);
                });
                suggestionContainer.style.display = 'block';
            } else {
                suggestionContainer.style.display = 'none';
            }
        }
    },

    /**
     * 处理分类筛选
     */
    handleFilter(category, event) {
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        event.target.classList.add('active');

        if (category === '全部') {
            this.renderPrompts(allPrompts);
        } else {
            const filtered = allPrompts.filter(p => p.category === category);
            this.renderPrompts(filtered);
        }
    },

    /**
     * 为提示词卡片添加事件监听器
     */
    addCardEventListeners() {
        // 添加卡片点击预览事件
        document.querySelectorAll('.prompt-card').forEach(card => {
            card.addEventListener('click', (e) => {
                // 如果点击的是按钮，不触发预览
                if (e.target.closest('.copy-btn, .edit-btn, .delete-btn')) {
                    return;
                }
                
                const id = card.dataset.id;
                const prompt = allPrompts.find(p => p.id == id);
                if (prompt) {
                    this.showPreview(prompt);
                }
            });
        });

        document.querySelectorAll('.edit-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const id = e.currentTarget.dataset.id;
                const prompt = allPrompts.find(p => p.id == id);
                if (prompt) {
                    this.promptIdInput.value = prompt.id;
                    this.promptTitleInput.value = prompt.title;
                    this.promptContentInput.value = prompt.content;
                    this.promptCategoryInput.value = prompt.category || '';
                    this.promptCategorySelect.value = prompt.category || '';
                    this.promptCategorySelect.style.display = 'none';
                    this.promptCategoryInput.style.display = 'block';
                    this.formTitle.textContent = '编辑提示词';
                    this.showView('formView');
                    // 调整textarea高度以适应内容
                    this.autoResizeTextarea(this.promptContentInput);
                }
            });
        });

        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const id = e.currentTarget.dataset.id;
                app.handleDeletePrompt(id);
            });
        });

        document.querySelectorAll('.copy-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const content = e.currentTarget.dataset.content;
                navigator.clipboard.writeText(this.unescapeHtml(content)).then(() => {
                    const originalText = btn.innerHTML;
                    btn.innerHTML = '<i class="fas fa-check"></i> 已复制!';
                    btn.style.background = 'var(--success)';
                    setTimeout(() => {
                        btn.innerHTML = originalText;
                        btn.style.background = '';
                    }, 1500);
                });
            });
        });
    },

    /**
     * 检测系统主题
     * @returns {string} 'dark' 或 'light'
     */
    getSystemTheme() {
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    },

    /**
     * 应用主题
     * @param {string} mode - 主题模式：'light', 'dark', 'auto'
     */
    applyTheme(mode) {
        const actualTheme = mode === 'auto' ? this.getSystemTheme() : mode;
        const isDark = actualTheme === 'dark';
        
        if (isDark) {
            document.body.classList.add('dark-mode');
        } else {
            document.body.classList.remove('dark-mode');
        }
        
        // 更新主题选择器状态
        this.updateThemeSelector(mode);
    },

    /**
     * 更新主题选择器状态
     * @param {string} mode - 主题模式
     */
    updateThemeSelector(mode) {
        const themeOptions = document.querySelectorAll('.theme-option');
        themeOptions.forEach(option => {
            option.classList.remove('active');
            if (option.dataset.theme === mode) {
                option.classList.add('active');
            }
        });
    },

    /**
     * 显示Toast提示消息
     * @param {string} message - 提示消息内容
     * @param {string} type - 消息类型：'success', 'error', 'warning', 'info'
     * @param {number} duration - 显示持续时间（毫秒）
     */
    showToast(message, type = 'success', duration = 3000) {
        const toastContainer = document.getElementById('toastContainer');
        if (!toastContainer) return;
        
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        const iconMap = {
            success: 'fas fa-check-circle',
            error: 'fas fa-exclamation-circle',
            warning: 'fas fa-exclamation-triangle',
            info: 'fas fa-info-circle'
        };
        
        toast.innerHTML = `
            <i class="${iconMap[type] || iconMap.success}"></i>
            <span>${message}</span>
        `;
        
        toastContainer.appendChild(toast);
        
        // 触发显示动画
        setTimeout(() => {
            toast.classList.add('show');
        }, 10);
        
        // 自动移除
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => {
                if (toastContainer.contains(toast)) {
                    toastContainer.removeChild(toast);
                }
            }, 300);
        }, duration);
    },

    /**
     * 显示自定义确认弹窗
     * @param {string} message - 确认消息
     * @param {string} title - 弹窗标题
     * @returns {Promise<boolean>} 用户选择结果
     */
    showCustomConfirm(message, title = '确认操作') {
        return new Promise((resolve) => {
            const overlay = document.getElementById('confirmOverlay');
            const titleElement = document.getElementById('confirmTitle');
            const messageElement = document.getElementById('confirmMessage');
            const cancelBtn = document.getElementById('confirmCancelBtn');
            const okBtn = document.getElementById('confirmOkBtn');
            
            if (!overlay || !titleElement || !messageElement || !cancelBtn || !okBtn) {
                console.error('确认弹窗元素未找到');
                resolve(false);
                return;
            }
            
            // 设置内容
            titleElement.textContent = title;
            messageElement.textContent = message;
            
            // 显示弹窗
            overlay.style.display = 'flex';
            
            // 清除之前的事件监听器
            const newCancelBtn = cancelBtn.cloneNode(true);
            const newOkBtn = okBtn.cloneNode(true);
            cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);
            okBtn.parentNode.replaceChild(newOkBtn, okBtn);
            
            // 添加事件监听器
            newOkBtn.onclick = () => {
                overlay.style.display = 'none';
                resolve(true);
            };
            
            newCancelBtn.onclick = () => {
                overlay.style.display = 'none';
                resolve(false);
            };
            
            // 点击遮罩层关闭
            overlay.onclick = (e) => {
                if (e.target === overlay) {
                    overlay.style.display = 'none';
                    resolve(false);
                }
            };
        });
    }
};

// 暴露ui对象供其他模块使用
window.ui = ui;