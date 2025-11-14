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
    promptAuthorInput: document.getElementById('promptAuthorInput'),
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
     * 翻译函数
     * @param {string} key - 翻译键
     * @returns {string} 翻译后的文本
     */
    t(key) {
        if (window.i18n && window.i18n.t) {
            return window.i18n.t(key);
        }
        return key;
    },
    
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
            // 预加载所有标签的颜色分配，确保颜色一致性
            this.preloadTagColors(promptsToRender);
            
            // 清空骨架屏占位符和所有内容
            this.promptsContainer.innerHTML = '';

            if (promptsToRender.length === 0) {
                this.promptsContainer.innerHTML = `<div style="text-align: center; padding: 40px 20px; color: #64748b;"><i class="fas fa-inbox" style="font-size: 48px; margin-bottom: 16px;"></i><h3>${this.t('empty.title')}</h3><p>${this.t('empty.desc')}</p></div>`;
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
                        <div class="prompt-card-header">
                            <div class="prompt-title">${this.escapeHtml(prompt.title || this.t('prompt.untitled'))}</div>
                            <button type="button" class="copy-btn" data-content="${this.escapeHtml(prompt.content || '')}">${this.t('button.copy')}</button>
                        </div>
                        ${prompt.author ? `<div class="prompt-author">${this.t('label.author')}${this.escapeHtml(prompt.author)}</div>` : ''}
                        <div class="prompt-content">${this.escapeHtml(prompt.content || '')}</div>
                        <div class="card-footer">
                            <div class="meta-info">
                                ${this.renderTags(prompt.tags || (prompt.category ? [prompt.category] : []))}
                                <span class="creation-date">${this.formatDate(prompt.created_at)}</span>
                            </div>
                            <div class="card-actions">
                                <div class="actions-on-hover">
                                    <button class="action-btn edit-btn" data-id="${prompt.id}" title="${this.t('button.edit')}">
                                        <i class="fas fa-edit"></i>
                                    </button>
                                    <button class="action-btn delete-btn" data-id="${prompt.id}" title="${this.t('button.delete')}">
                                        <i class="fas fa-trash"></i>
                                    </button>
                                </div>
                            </div>
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
        return date.toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' });
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
     * 获取标签颜色
     * @param {string} tag - 标签名称
     * @returns {string} 颜色类名
     */
    /**
     * 预加载所有标签的颜色分配，确保颜色一致性
     * @param {Array} prompts - 提示词数组
     */
    preloadTagColors(prompts) {
        // 初始化颜色使用记录
        if (!this.colorUsageMap) {
            this.colorUsageMap = new Map();
        }
        
        // 收集所有唯一标签
        const allTags = new Set();
        prompts.forEach(prompt => {
            if (prompt.tags && Array.isArray(prompt.tags)) {
                prompt.tags.forEach(tag => {
                    if (tag && typeof tag === 'string') {
                        allTags.add(tag);
                    }
                });
            }
        });
        
        // 为所有标签预分配颜色
        const sortedTags = Array.from(allTags).sort(); // 排序确保一致性
        sortedTags.forEach(tag => {
            this.getTagColor(tag); // 这会触发颜色分配并记录
        });
    },

    // 使用全局标签颜色管理器
    getTagColor(tag) {
        // 使用全局颜色管理器
        if (window.getGlobalTagColor) {
            return window.getGlobalTagColor(tag);
        }
        
        // 降级处理：如果全局管理器不可用，使用简单哈希算法
        if (!tag || typeof tag !== 'string') {
            return 'blue';
        }
        
        let hash = 0;
        for (let i = 0; i < tag.length; i++) {
            const char = tag.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        
        const availableColors = ['blue', 'green', 'purple', 'orange', 'pink', 'indigo', 'red', 'yellow', 'teal', 'gray'];
        const colorIndex = Math.abs(hash) % availableColors.length;
        return availableColors[colorIndex];
    },

    /**
     * 渲染标签
     * @param {Array} tags - 标签数组
     * @returns {string} 标签HTML字符串
     */
    renderTags(tags) {
        if (!tags || !Array.isArray(tags) || tags.length === 0) {
            return '';
        }
        
        return tags.filter(tag => tag && typeof tag === 'string').map(tag => {
            const colorClass = this.getTagColor(tag);
            return `<span class="prompt-tag tag-${colorClass}">${this.escapeHtml(tag)}</span>`;
        }).join('');
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
        
        // 获取标签和作者信息
        const tags = prompt.tags || (prompt.category ? [prompt.category] : []);
        const author = prompt.author || '';
        
        modal.innerHTML = `
            <div class="preview-header">
                <div class="preview-title-row">
                    <h2 class="preview-title">${this.escapeHtml(prompt.title || this.t('prompt.untitled'))}</h2>
                    <button class="preview-close">&times;</button>
                </div>
                ${author ? `<div class="preview-author">${this.t('label.author')}${this.escapeHtml(author)}</div>` : ''}
                ${tags.length > 0 ? `<div class="preview-tags">${this.renderTags(tags)}</div>` : ''}
            </div>
            <div class="preview-body">
                <div class="preview-content">${this.escapeHtml(prompt.content || '')}</div>
            </div>
            <div class="preview-footer">
                <div class="preview-date">${this.formatDate(prompt.created_at)}</div>
                <button class="preview-copy-btn"><i class="fas fa-copy"></i> ${this.t('button.copy')}</button>
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
                copyBtn.onclick = (e) => {
                    e.preventDefault();
                    const text = prompt.content || '';
                    const doFallbackCopy = () => {
                        try {
                            const textarea = document.createElement('textarea');
                            textarea.value = text;
                            textarea.style.position = 'fixed';
                            textarea.style.top = '-1000px';
                            document.body.appendChild(textarea);
                            textarea.focus();
                            textarea.select();
                            const ok = document.execCommand && document.execCommand('copy');
                            document.body.removeChild(textarea);
                            return ok;
                        } catch (_) {
                            return false;
                        }
                    };
                    const onSuccessUI = () => {
                        const originalText = copyBtn.innerHTML;
                        copyBtn.innerHTML = '<i class="fas fa-check"></i> ' + this.t('preview.copied');
                        copyBtn.style.background = 'var(--success)';
                        this.showToast(this.t('toast.copySuccess'), 'success');
                        setTimeout(() => {
                            copyBtn.innerHTML = originalText;
                            copyBtn.style.background = '';
                        }, 1500);
                    };
                    const onFailUI = () => {
                        this.showToast(this.t('toast.copyFail'), 'error');
                    };
                    if (navigator.clipboard && navigator.clipboard.writeText) {
                        navigator.clipboard.writeText(text).then(onSuccessUI).catch(() => {
                            doFallbackCopy() ? onSuccessUI() : onFailUI();
                        });
                    } else {
                        doFallbackCopy() ? onSuccessUI() : onFailUI();
                    }
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
     * 更新标签筛选按钮 - 支持溢出检测和"更多"按钮
     */
    updateFilterButtons() {
        // 收集所有标签（包括兼容旧的category字段）
        const allTags = new Set();
        allPrompts.forEach(p => {
            if (p.tags && Array.isArray(p.tags)) {
                p.tags.forEach(tag => allTags.add(tag));
            } else if (p.category) {
                allTags.add(p.category);
            }
        });
        
        const tags = [i18n.t('filter_all'), ...Array.from(allTags)];
        
        // 初始化标签状态
        if (!this.filterState) {
            this.filterState = {
                allTags: tags,
                isExpanded: false,
                maxVisibleCount: 0
            };
        } else {
            this.filterState.allTags = tags;
        }
        
        this.renderFilterButtons();
    },

    /**
     * 渲染标签筛选按钮
     */
    renderFilterButtons() {
        if (!this.filterState) return;
        
        const { allTags, isExpanded } = this.filterState;
        this.filterContainer.innerHTML = '';
        
        // 根据展开状态设置容器样式
        if (isExpanded) {
            this.filterContainer.classList.add('expanded');
        } else {
            this.filterContainer.classList.remove('expanded');
        }
        
        // 动态计算最大可显示标签数
        const maxVisibleTags = this.calculateMaxVisibleTags();
        console.log('All tags count:', allTags.length, 'Max visible tags:', maxVisibleTags, 'Is expanded:', isExpanded);
        
        // 如果标签数量少于等于阈值或已展开，显示所有标签
        if (allTags.length <= maxVisibleTags || isExpanded) {
            console.log('Rendering all tags');
            this.renderAllTags(allTags, isExpanded && allTags.length > maxVisibleTags);
        } else {
            // 显示部分标签时，需要为"更多"按钮预留空间
            // 但标签数量应该是 maxVisibleTags - 1，这样加上"更多"按钮总共是 maxVisibleTags 个元素
            const visibleTagCount = Math.max(2, maxVisibleTags - 1); // 至少显示2个标签
            console.log('Rendering partial tags, visible count:', visibleTagCount);
            this.renderPartialTags(allTags, visibleTagCount);
        }
    },

    /**
     * 渲染所有标签
     */
    renderAllTags(tags, showCollapseBtn = false) {
        tags.forEach(tag => {
            const btn = this.createFilterButton(tag);
            this.filterContainer.appendChild(btn);
        });
        
        // 如果是展开状态，在最右边添加"收起"按钮
        if (showCollapseBtn && tags.length > 4) {
            const collapseBtn = this.createMoreButton(false);
            this.filterContainer.appendChild(collapseBtn);
        }
    },

    /**
     * 渲染部分标签 + "更多"按钮
     */
    renderPartialTags(tags, visibleCount = 3) {
        // 显示指定数量的标签
        const visibleTags = tags.slice(0, visibleCount);
        visibleTags.forEach(tag => {
            const btn = this.createFilterButton(tag);
            this.filterContainer.appendChild(btn);
        });
        
        // 在最右边添加"更多"按钮
        const moreBtn = this.createMoreButton(true);
        this.filterContainer.appendChild(moreBtn);
    },

    /**
     * 创建标签筛选按钮
     */
    createFilterButton(tag) {
        const btn = document.createElement('button');
        btn.className = 'filter-btn';
        
        // 如果不是"全部"，使用标签颜色系统
        if (tag !== this.t('filter_all')) {
            const colorClass = this.getTagColor(tag);
            btn.classList.add(`filter-tag-${colorClass}`);
        }
        
        if (tag === this.t('filter_all')) btn.classList.add('active');
        btn.textContent = tag;
        btn.addEventListener('click', (e) => app.handleFilter(tag, e));
        return btn;
    },

    /**
     * 创建"更多"/"收起"按钮
     */
    createMoreButton(isMore = true) {
        const btn = document.createElement('button');
        btn.className = 'filter-btn filter-more-btn';
        
        if (isMore) {
            btn.innerHTML = '<i class="fas fa-ellipsis-h"></i>';
            btn.title = i18n.t('filter.showMore');
        } else {
            btn.innerHTML = '<i class="fas fa-chevron-up"></i>';
            btn.title = i18n.t('filter.collapse');
        }
        
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleFilterExpanded();
        });
        
        return btn;
    },

    /**
     * 切换标签展开/收起状态
     */
    toggleFilterExpanded() {
        if (!this.filterState) return;
        
        this.filterState.isExpanded = !this.filterState.isExpanded;
        this.renderFilterButtons();
    },

    /**
     * 计算基于容器宽度的最大可显示标签数
     * @returns {number} 最大可显示标签数
     */
    calculateMaxVisibleTags() {
        if (!this.filterContainer) {
            console.log('filterContainer not found, using fallback value 4');
            return 4; // 降级到原有逻辑
        }
        
        const containerWidth = this.filterContainer.offsetWidth;
        console.log('Container width:', containerWidth);
        
        // 如果容器宽度为0或很小，可能还没有渲染完成，使用默认值
        if (containerWidth < 100) {
            console.log('Container width too small, using fallback value 4');
            return 4;
        }
        
        const averageTagWidth = 60; // 估算的平均标签宽度（包括间距）- 调整为更紧凑
        const moreButtonWidth = 40; // 更多按钮的宽度 - 调整为更小
        const padding = 10; // 容器内边距 - 调整为更小
        
        const availableWidth = containerWidth - padding - moreButtonWidth;
        const maxTags = Math.floor(availableWidth / averageTagWidth);
        
        console.log('Available width:', availableWidth, 'Max tags calculated:', maxTags);
        
        // 确保至少显示3个标签，最多不超过8个（避免过度拥挤）
        const result = Math.max(3, Math.min(maxTags, 8));
        console.log('Final max visible tags:', result);
        return result;
    },

    /**
     * 初始化响应式标签显示
     * 设置窗口大小变化监听器
     */
    initializeResponsiveTagDisplay() {
        // 防止重复设置监听器
        if (this.resizeListenerSetup) return;
        
        // 添加窗口大小变化监听
        window.addEventListener('resize', () => {
            // 防抖处理，避免频繁重新计算
            clearTimeout(this.resizeTimer);
            this.resizeTimer = setTimeout(() => {
                if (this.filterState && !this.filterState.isExpanded) {
                    this.renderFilterButtons();
                }
            }, 300);
        });
        
        this.resizeListenerSetup = true;
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
                // 调用appController的编辑处理函数
                app.handleEditPrompt(id);
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
                e.preventDefault();
                e.stopPropagation();
                const content = e.currentTarget.dataset.content;
                const text = this.unescapeHtml(content);
                const doFallbackCopy = () => {
                    try {
                        const textarea = document.createElement('textarea');
                        textarea.value = text;
                        textarea.style.position = 'fixed';
                        textarea.style.top = '-1000px';
                        document.body.appendChild(textarea);
                        textarea.focus();
                        textarea.select();
                        const ok = document.execCommand && document.execCommand('copy');
                        document.body.removeChild(textarea);
                        return ok;
                    } catch (_) {
                        return false;
                    }
                };
                const onSuccessUI = () => {
                    btn.classList.add('copied');
                    const originalText = btn.innerHTML;
                    btn.innerHTML = '<i class="fas fa-check"></i> ' + this.t('preview.copied');
                    btn.style.background = 'var(--success)';
                    this.showToast(this.t('toast.copySuccess'), 'success');
                    setTimeout(() => {
                        btn.classList.remove('copied');
                        btn.innerHTML = originalText;
                        btn.style.background = '';
                    }, 2000);
                };
                const onFailUI = () => {
                    console.error('Copy failed');
                    this.showToast(this.t('toast.copyFail'), 'error');
                };
                if (navigator.clipboard && navigator.clipboard.writeText) {
                    navigator.clipboard.writeText(text).then(onSuccessUI).catch(() => {
                        doFallbackCopy() ? onSuccessUI() : onFailUI();
                    });
                } else {
                    doFallbackCopy() ? onSuccessUI() : onFailUI();
                }
            });
        });
    },

    // 认证与同步UI函数
    /**
     * 设置登录按钮的加载状态
     * @param {boolean} isLoading - 是否显示加载状态
     */
    setLoginButtonLoading(isLoading, progressText = '') {
        const googleSignInBtn = document.getElementById('googleSignInBtn');
        if (!googleSignInBtn) return;
        
        const googleIcon = googleSignInBtn.querySelector('.google-icon');
        const btnText = googleSignInBtn.querySelector('.btn-text');
        
        if (isLoading) {
            // 添加加载状态类
            googleSignInBtn.classList.add('loading');
            
            // 隐藏Google图标，显示加载动画
            if (googleIcon) {
                googleIcon.style.display = 'none';
            }
            
            // 创建并插入加载动画
            const existingSpinner = googleSignInBtn.querySelector('.loading-spinner');
            if (!existingSpinner) {
                const spinner = document.createElement('div');
                spinner.className = 'loading-spinner';
                googleSignInBtn.insertBefore(spinner, btnText);
            }
            
            // 更改按钮文字
            if (btnText) {
                btnText.textContent = progressText || this.t('auth.signingIn');
            }
        } else {
            // 移除加载状态类
            googleSignInBtn.classList.remove('loading');
            
            // 显示Google图标
            if (googleIcon) {
                googleIcon.style.display = 'block';
            }
            
            // 移除加载动画
            const spinner = googleSignInBtn.querySelector('.loading-spinner');
            if (spinner) {
                spinner.remove();
            }
            
            // 恢复按钮文字
            if (btnText) {
                btnText.textContent = this.t('auth.signInWithGoogle');
            }
        }
    },

    /**
     * 根据认证状态更新UI
     * @param {Object|null} session - 用户会话信息
     */
    updateUIForAuthState(session) {
        // 设置页面元素
        const loggedOutSection = document.getElementById('loggedOutSection');
        const loggedInSection = document.getElementById('loggedInSection');
        const userAvatar = document.getElementById('userAvatar');
        const defaultAvatar = document.getElementById('defaultAvatar');
        const userName = document.getElementById('userName');
        const userEmail = document.getElementById('userEmail');
        
        if (session && session.user) {
            // 已登录状态
            const user = session.user;
            
            // 更新设置页面中的用户信息
            if (loggedInSection) loggedInSection.style.display = 'block';
            if (loggedOutSection) loggedOutSection.style.display = 'none';
            
            // 更新用户头像
            if (userAvatar && user.user_metadata?.avatar_url) {
                const avatarImg = userAvatar.querySelector('.avatar-img');
                if (avatarImg) {
                    avatarImg.src = user.user_metadata.avatar_url;
                    userAvatar.style.display = 'block';
                    if (defaultAvatar) defaultAvatar.style.display = 'none';
                }
            } else {
                if (userAvatar) userAvatar.style.display = 'none';
                if (defaultAvatar) {
                    defaultAvatar.style.display = 'flex';
                    // 设置默认头像的首字母
                    const firstLetter = (user.email || 'U').charAt(0).toUpperCase();
                    defaultAvatar.textContent = firstLetter;
                }
            }
            
            // 更新用户昵称和邮箱
            if (userName) {
                // 优先使用用户元数据中的姓名，否则使用邮箱前缀
                const displayName = user.user_metadata?.full_name || 
                                   user.user_metadata?.name || 
                                   (user.email ? user.email.split('@')[0] : this.t('auth.user'));
                userName.textContent = displayName;
                userName.title = displayName; // 添加hover显示完整用户名
            }
            
            if (userEmail) {
                const email = user.email || this.t('auth.unknownEmail');
                userEmail.textContent = email;
                userEmail.title = email; // 添加hover显示完整邮箱
            }
            
            // 初始化同步时间显示
            this.updateSyncTime();
            
            // 更新全局用户状态
            currentUser = {
                id: user.id,
                email: user.email,
                avatar_url: user.user_metadata?.avatar_url
            };
        } else {
            // 未登录状态
            // 更新设置页面状态
            if (loggedOutSection) loggedOutSection.style.display = 'block';
            if (loggedInSection) loggedInSection.style.display = 'none';
            
            // 保持本地用户状态以确保本地功能正常
            if (!currentUser) {
                currentUser = {
                    id: 'local-user',
                    email: 'local@example.com'
                };
            }
        }
    },

    /**
     * 更新同步时间显示
     */
    async updateSyncTime() {
        const syncTimeElement = document.getElementById('syncTime');
        if (syncTimeElement) {
            try {
                console.log('[DEBUG] 开始获取最后同步时间...');
                // 从存储中获取真实的最后同步时间
                const response = await chrome.runtime.sendMessage({
                    type: 'GET_LAST_SYNC_TIME'
                });
                
                console.log('[DEBUG] GET_LAST_SYNC_TIME 响应:', response);
                
                if (response && response.success && response.data) {
                    console.log('[DEBUG] 同步时间数据:', response.data);
                    const syncTime = new Date(response.data);
                    console.log('[DEBUG] 解析后的时间对象:', syncTime);
                    console.log('[DEBUG] UTC时间:', syncTime.toISOString());
                    console.log('[DEBUG] 本地时间:', syncTime.toString());
                    
                    // 使用北京时间格式化
                    const timeString = syncTime.toLocaleString('zh-CN', {
                        timeZone: 'Asia/Shanghai',
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                        hour12: false
                    });
                    console.log('[DEBUG] 格式化后的时间字符串:', timeString);
                    const prefix = (window.i18n && i18n.t) ? i18n.t('sync.lastTimePrefix') : '最后同步时间: ';
                    syncTimeElement.textContent = `${prefix}${timeString}`;
                } else {
                    console.log('[DEBUG] 没有同步时间数据，显示"尚未同步"');
                    console.log('[DEBUG] response.success:', response?.success);
                    console.log('[DEBUG] response.data:', response?.data);
                    syncTimeElement.textContent = this.t('sync.none');
                }
            } catch (error) {
                console.error('[DEBUG] 获取同步时间失败:', error);
                syncTimeElement.textContent = '同步时间获取失败';
            }
        } else {
            console.error('[DEBUG] 找不到syncTime元素');
        }
    },

    /**
     * 更新同步状态
     * @param {string} status - 同步状态
     * @param {string} lastSyncTime - 最后同步时间
     */
    updateSyncStatus(status, lastSyncTime) {
        const syncTimeElement = document.getElementById('syncTime');
        
        switch (status) {
            case 'syncing':
                if (syncTimeElement) {
                    syncTimeElement.textContent = (window.i18n && i18n.t) ? i18n.t('sync.loading') : '正在同步...';
                }
                break;
                
            case 'success':
                if (lastSyncTime) {
                    const syncTime = new Date(lastSyncTime);
                    const timeString = syncTime.toLocaleString('zh-CN', {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit'
                    });
                    if (syncTimeElement) {
                        const prefix = (window.i18n && i18n.t) ? i18n.t('sync.lastTimePrefix') : '最后同步时间: ';
                        syncTimeElement.textContent = `${prefix}${timeString}`;
                    }
                } else {
                    this.updateSyncTime();
                }
                this.showToast(this.t('toast.syncSuccess'), 'success');
                break;
                
            case 'error':
                if (syncTimeElement) {
                    syncTimeElement.textContent = this.t('toast.syncError');
                }
                this.showToast(this.t('toast.syncError'), 'error');
                break;
                
            case 'idle':
            default:
                if (syncTimeElement) {
                    syncTimeElement.textContent = this.t('sync.none');
                }
                break;
        }
    },

    /**
     * 更新同步UI状态（保留用于兼容性）
     * @param {string} status - 同步状态
     * @param {string} message - 状态消息
     */
    updateSyncUI(status, message) {
        // 对于新的UI，只需要更新同步时间
        if (status === 'success' && message && message.includes('同步完成')) {
            this.updateSyncTime();
            this.showToast(this.t('toast.syncSuccess'), 'success');
        }
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
    showToast(message, type = 'success', duration = 1500) {
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
     * 兼容性函数，保持原有的showCustomAlert接口
     * @param {string} message - 提示消息
     * @returns {Promise<void>}
     */
    showCustomAlert(message) {
        this.showToast(message, 'info');
        return Promise.resolve();
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
    },

    // ===== 版本日志UI函数 =====
    
    /**
     * 显示版本日志弹窗
     */
    async showVersionLog() {
        const versionData = await app.loadVersionLogData();
        if (!versionData) {
            console.error('无法加载版本日志数据');
            return;
        }

        // 清空之前的内容
        this.versionLogBody.innerHTML = '';

        // 按版本号倒序显示（最新版本在前）
        const sortedVersions = versionData.versions.sort((a, b) => {
            // 简单的版本号比较（假设格式为 x.y.z）
            const aVersion = a.version.split('.').map(Number);
            const bVersion = b.version.split('.').map(Number);
            
            for (let i = 0; i < Math.max(aVersion.length, bVersion.length); i++) {
                const aPart = aVersion[i] || 0;
                const bPart = bVersion[i] || 0;
                if (aPart !== bPart) {
                    return bPart - aPart; // 倒序
                }
            }
            return 0;
        });

        // 生成版本日志HTML
        sortedVersions.forEach(version => {
            const versionItem = document.createElement('div');
            versionItem.className = 'version-item';
            
            const versionHeader = document.createElement('div');
            versionHeader.className = 'version-header';
            
            const versionTitle = document.createElement('h3');
            versionTitle.className = 'version-title';
            versionTitle.textContent = `v${version.version}`;
            
            const versionDate = document.createElement('span');
            versionDate.className = 'version-date';
            versionDate.textContent = version.date;
            
            versionHeader.appendChild(versionTitle);
            versionHeader.appendChild(versionDate);
            
            const versionContent = document.createElement('div');
            versionContent.className = 'version-content';
            
            if (version.title) {
                const titleElement = document.createElement('h4');
                titleElement.className = 'version-subtitle';
                titleElement.textContent = version.title;
                versionContent.appendChild(titleElement);
            }
            
            const changesList = document.createElement('ul');
            changesList.className = 'version-changes';
            
            version.changes.forEach(change => {
                const changeItem = document.createElement('li');
                changeItem.textContent = change;
                changesList.appendChild(changeItem);
            });
            
            versionContent.appendChild(changesList);
            
            versionItem.appendChild(versionHeader);
            versionItem.appendChild(versionContent);
            
            this.versionLogBody.appendChild(versionItem);
        });

        // 显示弹窗
        this.versionLogOverlay.style.display = 'flex';
        
        // 标记用户已查看最新版本
        await this.markVersionAsViewed(versionData.currentVersion);
    },

    /**
     * 隐藏版本日志弹窗
     */
    hideVersionLog() {
        this.versionLogOverlay.style.display = 'none';
    },

    /**
     * 检查是否有新版本
     */
    async checkForNewVersion() {
        const versionData = await app.loadVersionLogData();
        if (!versionData) {
            return;
        }

        try {
            // 从background script获取用户最后查看的版本
            const response = await chrome.runtime.sendMessage({ type: 'GET_LAST_VIEWED_VERSION' });
            
            if (response && response.success) {
                const lastViewedVersion = response.data;
                
                // 如果用户从未查看过版本日志，或者当前版本比最后查看的版本新
                if (!lastViewedVersion || versionData.currentVersion !== lastViewedVersion) {
                    // 显示NEW标识
                    this.versionNew.style.display = 'inline-block';
                } else {
                    // 隐藏NEW标识
                    this.versionNew.style.display = 'none';
                }
            } else {
                console.error('获取最后查看版本失败:', response?.error);
            }
        } catch (error) {
            console.error('检查新版本失败:', error);
        }
    },

    /**
     * 标记版本为已查看
     * @param {string} version 版本号
     */
    async markVersionAsViewed(version) {
        try {
            const response = await chrome.runtime.sendMessage({ 
                type: 'SET_LAST_VIEWED_VERSION', 
                payload: version 
            });
            
            if (response && response.success) {
                // 隐藏NEW标识
                this.versionNew.style.display = 'none';
            } else {
                console.error('设置最后查看版本失败:', response?.error);
            }
        } catch (error) {
            console.error('标记版本为已查看失败:', error);
        }
    },

    // ===== 加载动画UI函数 =====
    
    /**
     * 显示加载动画
     */
    showLoading() {
        this.loadingOverlay.style.display = 'flex';
    },

    /**
     * 隐藏加载动画
     */
    hideLoading() {
        this.loadingOverlay.style.display = 'none';
    },

    /**
     * 强制隐藏加载动画
     */
    forceHideLoading() {
        this.hideLoading();
        if (window.loadingTimeout) {
            clearTimeout(window.loadingTimeout);
            window.loadingTimeout = null;
        }
    },

    /**
     * 安全显示加载动画（带超时保护）
     */
    safeShowLoading() {
        this.showLoading();
        // 10秒后强制隐藏loading
        if (window.loadingTimeout) clearTimeout(window.loadingTimeout);
        window.loadingTimeout = setTimeout(() => {
            this.forceHideLoading();
            // 如果没有用户设置，显示主界面
            if (!window.currentUser) {
                this.showView('mainView');
            }
        }, 10000);
    },

    // 导出ui对象供其他模块使用
    getUI() {
        return this;
    }
};

// 暴露ui对象供其他模块使用
window.ui = ui;
