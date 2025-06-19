// sidepanel.js

/**
 * PromptCraft - 本地提示词管理工具
 * 版本: 0.5.0
 * 描述: 纯本地存储的提示词管理扩展，无需登录，保护隐私
 */

// DOM 元素引用
const loadingOverlay = document.getElementById('loadingOverlay');
// 移除了认证视图相关的DOM引用
const mainView = document.getElementById('mainView');
const formView = document.getElementById('formView');
const addPromptBtn = document.getElementById('addPromptBtn');
const searchInput = document.getElementById('searchInput');
const promptsContainer = document.getElementById('promptsContainer');
const filterContainer = document.getElementById('filterContainer');
const backToListBtn = document.getElementById('backToListBtn');
const cancelFormBtn = document.getElementById('cancelFormBtn');
const savePromptBtn = document.getElementById('savePromptBtn');
const formTitle = document.getElementById('formTitle');
const promptIdInput = document.getElementById('promptIdInput');
const promptTitleInput = document.getElementById('promptTitleInput');
const promptContentInput = document.getElementById('promptContentInput');
const promptCategoryInput = document.getElementById('promptCategoryInput');
const promptCategorySelect = document.getElementById('promptCategorySelect');
const settingsBtn = document.getElementById('settingsBtn');
const settingsOverlay = document.getElementById('settingsOverlay');
const settingsClose = document.getElementById('settingsClose');
const importBtn = document.getElementById('importBtn');
const exportBtn = document.getElementById('exportBtn');
const downloadTemplateBtn = document.getElementById('downloadTemplateBtn');
const fileInput = document.getElementById('fileInput');


/**
 * @brief 自动调整textarea高度以适应内容
 * @param {HTMLTextAreaElement} textarea - 需要调整高度的textarea元素
 */
function autoResizeTextarea(textarea) {
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
}

// 全局状态
let allPrompts = [];
let currentUser = null;
let themeMode = 'auto';
let currentView = null;
let isProcessingContextMenu = false; // 标记是否正在处理右键菜单消息
let authServiceInstance = null; // 认证服务实例
let syncServiceInstance = null; // 同步服务实例

// 统一的排序函数：按创建时间降序排序，最新的在前面
function sortPromptsByCreatedTime(prompts) {
    return prompts.sort((a, b) => {
        const timeA = new Date(a.created_at || a.createdAt || 0).getTime();
        const timeB = new Date(b.created_at || b.createdAt || 0).getTime();
        return timeB - timeA; // 降序排序，最新的在前面
    });
}

// 检测系统主题
function getSystemTheme() {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

// 应用主题
function applyTheme(mode) {
    const actualTheme = mode === 'auto' ? getSystemTheme() : mode;
    const isDark = actualTheme === 'dark';
    
    if (isDark) {
        document.body.classList.add('dark-mode');
    } else {
        document.body.classList.remove('dark-mode');
    }
    
    // 更新主题选择器状态
    updateThemeSelector(mode);
}

// 更新主题选择器状态
function updateThemeSelector(mode) {
    const themeOptions = document.querySelectorAll('.theme-option');
    themeOptions.forEach(option => {
        option.classList.remove('active');
        if (option.dataset.theme === mode) {
            option.classList.add('active');
        }
    });
}

// --- 实用工具函数 ---

const showLoading = () => loadingOverlay.style.display = 'flex';
const hideLoading = () => loadingOverlay.style.display = 'none';

/**
 * 智能修复右键菜单文本格式
 * 解决从网页选中文本时换行符丢失的问题，支持多种文本格式
 * @param {string} text - 原始文本
 * @returns {string} - 格式修复后的文本
 */
function formatContextMenuText(text) {
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
    formattedText = formattedText.replace(/\s+(\d+[.).]\s+)/g, '\n$1');
    
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
}

// 自定义确认弹窗
function showCustomConfirm(message, title = '确认操作') {
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

// Toast 提示功能
function showToast(message, type = 'success', duration = 3000) {
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
}

// 兼容性函数，保持原有的showCustomAlert接口
function showCustomAlert(message) {
    showToast(message, 'info');
    return Promise.resolve();
}

function showView(viewId) {
    console.log(`切换视图到: ${viewId}`);
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
        currentView = viewId;
        
        // 强制重绘以确保样式生效
        targetView.offsetHeight;
        
        // 检查视图是否实际显示（改进版本，避免不必要的警告）
        setTimeout(() => {
            // 确保元素仍然存在且是当前视图
            if (!targetView.parentNode || currentView !== viewId) {
                return;
            }
            
            const computedStyle = window.getComputedStyle(targetView);
            const isVisible = computedStyle.display !== 'none' && targetView.offsetWidth > 0 && targetView.offsetHeight > 0;
            console.log(`视图 ${viewId} 显示状态: display=${computedStyle.display}, visible=${isVisible}`);
            
            // 只有在确实有问题时才显示警告和重试
            if (!isVisible && targetView.classList.contains('active')) {
                console.warn(`警告：视图 ${viewId} 可能未正确显示，尝试重新应用样式`);
                // 重新应用active类
                targetView.classList.remove('active');
                // 使用requestAnimationFrame确保DOM更新
                requestAnimationFrame(() => {
                    if (currentView === viewId) {
                        targetView.classList.add('active');
                    }
                });
            }
        }, 200); // 增加延迟时间，确保CSS动画完成
        
        console.log(`成功切换到视图: ${viewId}`);
        return true;
    } catch (err) {
        console.error(`切换视图到 ${viewId} 时发生错误:`, err);
        return false;
    }
}

function formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
}

function escapeHtml(text) {
    if (typeof text !== 'string') return '';
    return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

function unescapeHtml(text) {
    if (typeof text !== 'string') return '';
    return text.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#039;/g, "'");
}


// --- 认证功能 ---

// 清除所有数据的处理函数
async function clearAllData() {
    const isConfirmed = await showCustomConfirm('您确定要清除所有提示词数据吗？此操作无法撤销。');
    if (!isConfirmed) return;
    
    safeShowLoading();
    
    try {
        // 使用数据服务清除本地数据
        await dataService.clearAllPrompts();
        allPrompts = [];
        renderPrompts([]);
        updateFilterButtons();
        showToast('所有数据已清除', 'success');
    } catch (error) {
        console.error('清除数据失败:', error);
        showToast('清除数据失败，请稍后再试', 'error');
    }
    
    forceHideLoading();
}


// --- 数据处理 (CRUD) ---

async function loadUserPrompts(skipLoading = false) {
    console.log('开始加载提示词数据，skipLoading:', skipLoading);
    if (!currentUser) {
        console.error('无法加载提示词：用户未设置');
        return;
    }
    if (!skipLoading) safeShowLoading();
    
    try {
        console.log('使用数据服务加载提示词...');
        
        // 使用数据服务获取提示词数据
        const data = await dataService.getAllPrompts();
        
        console.log('成功获取提示词数据，数量:', data.length);
        
        // 检查是否有加载错误
        const errorInfo = await dataService.getLoadError();
        if (errorInfo.hasError) {
            console.warn('检测到数据加载错误:', errorInfo.message);
            showToast(errorInfo.message || '数据加载失败', 'warning');
        }
        
        // 按创建时间降序排序，新建的提示词在最上方
        allPrompts = sortPromptsByCreatedTime(data);
        console.log('渲染提示词列表...');
        renderPrompts(allPrompts);
        updateFilterButtons();
        console.log('提示词加载完成');
        
    } catch (err) {
        console.error('加载提示词时发生错误:', err);
        console.error('错误详情:', err.message, err.stack);
        // 即使出错，也尝试显示空列表
        allPrompts = [];
        renderPrompts([]);
        updateFilterButtons();
        showToast('加载数据失败，请刷新重试', 'error');
    } finally {
        if (!skipLoading) forceHideLoading();
    }
}

// createSamplePrompts函数已移除，默认提示词现在由background.js在安装时创建

async function savePrompt() {
    const id = promptIdInput.value;
    const title = promptTitleInput.value.trim();
    const content = promptContentInput.value.trim();
    const category = promptCategoryInput.value.trim() || '未分类';

    if (!title || !content) {
        showToast('标题和内容不能为空！', 'warning');
        return;
    }

    // 检查内容长度（10000个字符限制）
    if (content.length > 10000) {
        showToast('提示词内容不能超过10000个字符！', 'warning');
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
        
        let savedPrompt;
        if (id) {
            // 更新现有提示词
            savedPrompt = await dataService.updatePrompt(id, promptData);
            console.log('更新提示词:', id);
            // 同步到云端
            await syncUpdatePrompt({ id, ...promptData });
        } else {
            // 添加新提示词
            savedPrompt = await dataService.addPrompt({
                ...promptData,
                is_deleted: false
            });
            console.log('添加新提示词:', savedPrompt.id);
            // 同步到云端
            await syncAddPrompt(savedPrompt);
        }
        
        console.log('提示词保存成功');
        
        // 显示成功提示
        if (id) {
            showToast('提示词更新成功', 'success');
        } else {
            showToast('提示词添加成功', 'success');
        }
        
        // 重新加载数据以确保数据同步
        await loadUserPrompts(true);
        showView('mainView');
        
    } catch (error) {
        console.error('保存提示词失败:', error);
        showToast('保存失败，请稍后再试', 'error');
    }
    
    forceHideLoading();
}

async function deletePrompt(promptId) {
    // 显示自定义确认弹窗
    const isConfirmed = await showCustomConfirm('您确定要删除这个提示词吗？此操作无法撤销。');
    if (!isConfirmed) return;

    safeShowLoading();
    
    try {
        // 使用数据服务删除提示词
        const success = await dataService.deletePrompt(promptId);
        
        if (success) {
            console.log('提示词删除成功:', promptId);
            showToast('删除成功', 'success');
            
            // 同步到云端
            await syncDeletePrompt(promptId);
            
            // 重新加载数据以确保数据同步
            await loadUserPrompts(true);
        }
        
    } catch (error) {
        console.error('删除失败:', error);
        showToast('删除失败，请稍后再试', 'error');
    }
    
    forceHideLoading();
}

// --- 渲染与 UI 更新 ---

function renderPrompts(promptsToRender) {
    console.log('开始渲染提示词列表...');
    try {
        // 清空骨架屏占位符和所有内容
        promptsContainer.innerHTML = '';
        console.log('已清空骨架屏占位符');
        if (promptsToRender.length === 0) {
            promptsContainer.innerHTML = `<div style="text-align: center; padding: 40px 20px; color: #64748b;"><i class="fas fa-inbox" style="font-size: 48px; margin-bottom: 16px;"></i><h3>空空如也</h3><p>点击上方按钮添加您的第一个提示词吧！</p></div>`;
            return;
        }

        console.log(`渲染 ${promptsToRender.length} 个提示词...`);
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
                        <div class="prompt-title">${escapeHtml(prompt.title || '无标题')}</div>
                        <div class="prompt-actions">
                            <button class="action-btn edit-btn" data-id="${prompt.id}"><i class="fas fa-edit"></i></button>
                            <button class="action-btn delete-btn" data-id="${prompt.id}"><i class="fas fa-trash"></i></button>
                        </div>
                    </div>
                    ${prompt.category ? `<div class="prompt-category">${escapeHtml(prompt.category)}</div>` : ''}
                    <div class="prompt-content">${escapeHtml(prompt.content || '')}</div>
                    <div class="prompt-footer">
                        <div>${formatDate(prompt.created_at)}</div>
                        <button class="copy-btn" data-content="${escapeHtml(prompt.content || '')}"><i class="fas fa-copy"></i> 复制</button>
                    </div>
                `;
                promptsContainer.appendChild(card);
            } catch (cardErr) {
                console.error(`渲染提示词卡片错误，索引: ${index}`, cardErr);
            }
        });
        
        console.log('添加卡片事件监听器...');
        addCardEventListeners();
        console.log('提示词渲染完成');
    } catch (err) {
        console.error('渲染提示词时发生错误:', err);
        console.error('错误详情:', err.message, err.stack);
    }
}

function updateFilterButtons() {
    const categories = ['全部', ...new Set(allPrompts.map(p => p.category).filter(Boolean))];
    filterContainer.innerHTML = '';
    categories.forEach(cat => {
        const btn = document.createElement('button');
        btn.className = 'filter-btn';
        if (cat === '全部') btn.classList.add('active');
        btn.textContent = cat;
        btn.addEventListener('click', () => handleFilter(cat));
        filterContainer.appendChild(btn);
    });
    
    // 更新分类下拉选项
    updateCategoryOptions();
}

function updateCategoryOptions() {
    const existingCategories = [...new Set(allPrompts.map(p => p.category).filter(Boolean))];
    promptCategorySelect.innerHTML = '<option value="">选择分类</option>';
    existingCategories.forEach(category => {
        const option = document.createElement('option');
        option.value = category;
        option.textContent = category;
        promptCategorySelect.appendChild(option);
    });
}

function setupCategoryInput() {
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
    promptCategoryInput.parentElement.style.position = 'relative';
    promptCategoryInput.parentElement.appendChild(suggestionContainer);
    
    // 输入框获得焦点时显示建议
    promptCategoryInput.addEventListener('focus', () => {
        updateCategorySuggestions();
    });
    
    // 输入框输入时更新建议
    promptCategoryInput.addEventListener('input', () => {
        updateCategorySuggestions();
    });
    
    // 点击其他地方时隐藏建议
    document.addEventListener('click', (e) => {
        if (!promptCategoryInput.contains(e.target) && !suggestionContainer.contains(e.target)) {
            suggestionContainer.style.display = 'none';
        }
    });
    
    function updateCategorySuggestions() {
        const existingCategories = [...new Set(allPrompts.map(p => p.category).filter(Boolean))];
        const inputValue = promptCategoryInput.value.toLowerCase();
        
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
                    promptCategoryInput.value = category;
                    suggestionContainer.style.display = 'none';
                });
                
                suggestionContainer.appendChild(item);
            });
            suggestionContainer.style.display = 'block';
        } else {
            suggestionContainer.style.display = 'none';
        }
    }
}

function handleFilter(category) {
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    event.target.classList.add('active');

    if (category === '全部') {
        renderPrompts(allPrompts);
    } else {
        const filtered = allPrompts.filter(p => p.category === category);
        renderPrompts(filtered);
    }
}

function handleSearch(term) {
    const lowerCaseTerm = term.toLowerCase();
    const filtered = allPrompts.filter(p =>
        p.title.toLowerCase().includes(lowerCaseTerm) ||
        p.content.toLowerCase().includes(lowerCaseTerm) ||
        (p.category && p.category.toLowerCase().includes(lowerCaseTerm))
    );
    renderPrompts(filtered);
}


// --- 预览功能 ---

function showPreview(prompt) {
    const overlay = document.createElement('div');
    overlay.className = 'preview-overlay';
    
    const modal = document.createElement('div');
    modal.className = 'preview-modal';
    
    modal.innerHTML = `
        <div class="preview-header">
            <div class="preview-title-section">
                <h2 class="preview-title">${escapeHtml(prompt.title || '无标题')}</h2>
                ${prompt.category ? `<div class="preview-category">${escapeHtml(prompt.category)}</div>` : ''}
            </div>
            <button class="preview-close">&times;</button>
        </div>
        <div class="preview-body">
            <div class="preview-content">${escapeHtml(prompt.content || '')}</div>
        </div>
        <div class="preview-footer">
            <div class="preview-date">${formatDate(prompt.created_at)}</div>
            <button class="preview-copy-btn"><i class="fas fa-copy"></i> 复制</button>
        </div>
    `;
    
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    
    // 关闭按钮事件
    modal.querySelector('.preview-close').onclick = () => {
        // document.body.removeChild(overlay);
        overlay && overlay.remove()
    };
    
    // 点击遮罩关闭
    overlay.onclick = (e) => {
        if (e.target === overlay) {
            // document.body.removeChild(overlay);
            overlay && overlay.remove()
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
            // document.body.removeChild(overlay);
            overlay && overlay.remove()
            document.removeEventListener('keydown', handleEsc);
        }
    };
    document.addEventListener('keydown', handleEsc);
}

// --- 事件监听器设置 ---

function addCardEventListeners() {
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
                showPreview(prompt);
            }
        });
    });

    document.querySelectorAll('.edit-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const id = e.currentTarget.dataset.id;
            const prompt = allPrompts.find(p => p.id == id);
            if (prompt) {
                promptIdInput.value = prompt.id;
                promptTitleInput.value = prompt.title;
                promptContentInput.value = prompt.content;
                promptCategoryInput.value = prompt.category || '';
                promptCategorySelect.value = prompt.category || '';
                promptCategorySelect.style.display = 'none';
                promptCategoryInput.style.display = 'block';
                formTitle.textContent = '编辑提示词';
                showView('formView');
                // 调整textarea高度以适应内容
                autoResizeTextarea(promptContentInput);
            }
        });
    });

    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const id = e.currentTarget.dataset.id;
            deletePrompt(id);
        });
    });

    document.querySelectorAll('.copy-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const content = e.currentTarget.dataset.content;
            navigator.clipboard.writeText(unescapeHtml(content)).then(() => {
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
}

function setupEventListeners() {
    // 监听数据变更事件，实现实时界面刷新
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            if (message.type === 'DATA_CHANGED') {
                console.log('收到数据变更通知，刷新界面');
                // 异步刷新界面，避免阻塞
                setTimeout(() => {
                    loadUserPrompts(true).catch(error => {
                        console.error('数据变更后刷新界面失败:', error);
                    });
                }, 100);
            }
        });
    }

    // 主题选择器事件处理
    document.addEventListener('click', (e) => {
        const themeOption = e.target.closest('.theme-option');
        if (themeOption) {
            const selectedTheme = themeOption.dataset.theme;
            if (selectedTheme !== themeMode) {
                themeMode = selectedTheme;
                applyTheme(themeMode);
                dataService.setThemeMode(themeMode).catch(error => {
                    console.error('保存主题模式失败:', error);
                });
            }
        }
    });

    // 监听系统主题变化
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
        if (themeMode === 'auto') {
            applyTheme('auto');
        }
    });
    
    // 重置表单为新建状态
    function resetForm() {
        promptIdInput.value = '';
        promptTitleInput.value = '';
        promptContentInput.value = '';
        promptCategoryInput.value = '';
        promptCategorySelect.value = '';
        promptCategorySelect.style.display = 'none';
        promptCategoryInput.style.display = 'block';
        formTitle.textContent = '添加新提示词';
        // 重置textarea高度
        autoResizeTextarea(promptContentInput);
    }

    addPromptBtn.addEventListener('click', () => {
        resetForm();
        showView('formView');
    });

    // 搜索延迟处理
    let searchTimeout = null;
    searchInput.addEventListener('input', (e) => {
        const searchTerm = e.target.value.trim();
        
        // 清除之前的延迟
        if (searchTimeout) {
            clearTimeout(searchTimeout);
        }
        
        // 如果搜索框为空，立即显示所有提示词
        if (searchTerm === '') {
            handleSearch('');
            return;
        }
        
        // 如果输入长度小于1个字符，不进行搜索
        if (searchTerm.length < 1) {
            return;
        }
        
        // 延迟300ms后执行搜索
        searchTimeout = setTimeout(() => {
            handleSearch(searchTerm);
        }, 300);
    });
    
    backToListBtn.addEventListener('click', () => showView('mainView'));
    cancelFormBtn.addEventListener('click', () => showView('mainView'));
    savePromptBtn.addEventListener('click', savePrompt);
    
    // 字符计数功能
    const characterCountElement = document.getElementById('characterCount');
    
    promptContentInput.addEventListener('input', () => {
        const currentLength = promptContentInput.value.length;
        characterCountElement.textContent = `${currentLength} / 10000`;
        
        // 当接近限制时改变颜色
        if (currentLength > 9000) {
            characterCountElement.style.color = '#ef4444'; // 红色警告
        } else if (currentLength > 8000) {
            characterCountElement.style.color = '#f59e0b'; // 橙色提醒
        } else {
            characterCountElement.style.color = '#64748b'; // 默认灰色
        }
        
        // 自动调整textarea高度
        autoResizeTextarea(promptContentInput);
    });
    
    // 页面加载时也调整一次高度（用于编辑现有提示词的情况）
    autoResizeTextarea(promptContentInput);
    
    // 初始化字符计数显示
    const updateCharacterCount = () => {
        const currentLength = promptContentInput.value.length;
        if (characterCountElement) {
            characterCountElement.textContent = `${currentLength} / 10000`;
        }
    };
    
    // 在表单显示时更新字符计数
     const originalShowView = window.showView;
     window.showView = function(viewName) {
         originalShowView(viewName);
         if (viewName === 'formView') {
             setTimeout(updateCharacterCount, 0);
         }
     };
    
    // 设置相关事件监听器
    settingsBtn.addEventListener('click', () => {
        settingsOverlay.style.display = 'flex';
    });
    
    settingsClose.addEventListener('click', () => {
        settingsOverlay.style.display = 'none';
    });
    
    settingsOverlay.addEventListener('click', (e) => {
        if (e.target === settingsOverlay) {
            settingsOverlay.style.display = 'none';
        }
    });
    
    // 同步开关事件监听
    const syncToggle = document.getElementById('syncToggle');
    if (syncToggle) {
        syncToggle.addEventListener('change', handleSyncToggle);
    }
    
    // 导入导出功能
    downloadTemplateBtn.addEventListener('click', handleDownloadTemplate);
    exportBtn.addEventListener('click', handleExport);
    importBtn.addEventListener('click', () => {
        fileInput.click();
    });
    
    // 设置页面中的Google登录按钮
    const googleSignInBtn = document.getElementById('googleSignInBtn');
    if (googleSignInBtn) {
        googleSignInBtn.addEventListener('click', handleGoogleSignIn);
    }
    
    // 设置页面中的退出登录按钮
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }
    
    // 帮助按钮事件监听器
    const helpBtn = document.getElementById('helpBtn');
    if (helpBtn) {
        helpBtn.addEventListener('click', (e) => {
            e.preventDefault();
            showToast('帮助文档功能即将推出', 'info');
        });
    }
    
    fileInput.addEventListener('change', handleFileImport);
    
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        
        if (message.type === 'ADD_FROM_CONTEXT_MENU' && message.data?.content) {
            console.log('收到右键菜单消息，内容:', message.data.content);
            
            // 设置标志，防止checkUserSession的延迟检查干扰
            isProcessingContextMenu = true;
            
            // 等待应用完全初始化后再处理
            const waitForInitialization = async () => {
                // 检查必要的元素是否存在
                if (currentUser && addPromptBtn && promptContentInput) {
                    console.log('应用已初始化完成，开始处理右键添加提示词');
                    
                 // 检查是否正在编辑现有提示词
                 const isEditing = promptIdInput.value && promptIdInput.value.trim() !== '';
                 
                 if (currentView !== 'formView') {
                     // 不在表单视图，直接切换并填充
                     showView('formView');
                     // 使用 requestAnimationFrame 确保 DOM 更新后再填充
                     requestAnimationFrame(() => {
                         // 确保是新建状态
                         resetForm();
                         promptContentInput.value = formatContextMenuText(message.data.content);
                         promptContentInput.dispatchEvent(new Event('input', { bubbles: true }));
                         console.log('通过 rAF 切换到添加界面并填充内容');
                         
                         // 处理完成后重置标志
                         setTimeout(() => {
                             isProcessingContextMenu = false;
                         }, 1000);
                         
                         sendResponse({ status: "success", message: "Content received and form populated via rAF after view switch." });
                     });
                 } else if (isEditing) {
                     // 正在编辑状态，询问用户是否要放弃当前编辑
                     const userConfirm = await showCustomConfirm('💡 是否要放弃当前编辑并创建新的提示词？');
                     if (userConfirm) {
                         requestAnimationFrame(() => {
                             // 重置表单为新建状态
                             resetForm();
                             promptContentInput.value = formatContextMenuText(message.data.content);
                             promptContentInput.dispatchEvent(new Event('input', { bubbles: true }));
                             console.log('用户确认放弃编辑，创建新提示词');
                             
                             setTimeout(() => {
                                 isProcessingContextMenu = false;
                             }, 1000);
                             
                             sendResponse({ status: "success", message: "User confirmed to abandon edit and create new prompt." });
                         });
                     } else {
                         console.log('用户取消了右键添加操作');
                         setTimeout(() => {
                             isProcessingContextMenu = false;
                         }, 100);
                         sendResponse({ status: "cancelled", message: "User cancelled the operation." });
                     }
                 } else {
                     // 在表单视图但不是编辑状态，直接填充
                     requestAnimationFrame(() => {
                         // 确保是新建状态
                         resetForm();
                         promptContentInput.value = formatContextMenuText(message.data.content);
                         promptContentInput.dispatchEvent(new Event('input', { bubbles: true }));
                         console.log('已在添加界面，通过 rAF 填充内容');
                         
                         setTimeout(() => {
                             isProcessingContextMenu = false;
                         }, 1000);
                         
                         sendResponse({ status: "success", message: "Content received and form populated via rAF in existing view." });
                     });
                 }
                } else {
                    console.log('应用尚未完全初始化，等待中...');
                    // 如果应用还未初始化完成，继续等待
                    setTimeout(waitForInitialization, 100);
                }
            };
            
            // 开始等待初始化完成
            waitForInitialization();
            

        }
        return true; 
    });
}

// --- 导入导出功能 ---

// 下载模板
async function handleDownloadTemplate() {
    try {
        safeShowLoading();
        const result = await window.JSONUtils.downloadTemplate();
        if (result.success) {
            showToast('JSON模板下载成功！', 'success');
        } else {
            showToast(result.message, 'error');
        }
    } catch (error) {
        console.error('下载模板失败:', error);
        showToast('下载模板失败，请稍后再试', 'error');
    } finally {
        forceHideLoading();
    }
}

// 导出提示词
async function handleExport() {
    try {
        if (allPrompts.length === 0) {
            showToast('没有可导出的提示词', 'warning');
            return;
        }
        
        safeShowLoading();
        const result = await window.JSONUtils.exportToJSON(allPrompts);
        if (result.success) {
            showToast(result.message, 'success');
        } else {
            showToast(result.message, 'error');
        }
    } catch (error) {
        console.error('导出失败:', error);
        showToast('导出失败，请稍后再试', 'error');
    } finally {
        forceHideLoading();
    }
}

// 处理文件导入
async function handleFileImport(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    // 重置文件输入
    event.target.value = '';
    
    try {
        safeShowLoading();
        
        // 检查文件类型
        const fileName = file.name.toLowerCase();
        if (!fileName.endsWith('.json')) {
            showToast('请选择JSON文件（.json格式）', 'warning');
            return;
        }
        
        // 导入数据
        const importResult = await window.JSONUtils.importFromJSON(file);
        
        if (!importResult.success) {
            showToast(importResult.message || '导入失败', 'error');
            return;
        }
        
        const { prompts: importedPrompts, errors, total, imported } = importResult;
        
        if (imported === 0) {
            showToast(`导入完成：共 ${total} 条记录，全部导入失败。请检查JSON格式是否正确。`, 'error');
            if (errors && errors.length > 0) {
                const downloadFailed = await showCustomConfirm('是否下载失败记录？');
                if (downloadFailed) {
                    await window.JSONUtils.exportFailedRecords(errors);
                }
            }
            return;
        }
        
        // 获取现有提示词
        let existingPrompts = await dataService.getAllPrompts();
        
        // 处理重名提示词的更新策略
        let addedCount = 0;
        let updatedCount = 0;
        const finalPrompts = [...existingPrompts];
        
        importedPrompts.forEach(newPrompt => {
            // 查找是否存在同名提示词
            const existingIndex = finalPrompts.findIndex(existing => 
                existing.title.trim().toLowerCase() === newPrompt.title.trim().toLowerCase()
            );
            
            if (existingIndex !== -1) {
                // 更新现有提示词
                finalPrompts[existingIndex] = {
                    ...finalPrompts[existingIndex],
                    content: newPrompt.content,
                    category: newPrompt.category,
                    updated_at: new Date().toISOString()
                };
                updatedCount++;
            } else {
                // 添加新提示词到开头
                finalPrompts.unshift({
                    ...newPrompt,
                    id: UUIDUtils.generateUUID(),
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                    is_deleted: false
                });
                addedCount++;
            }
        });
        
        // 使用数据服务保存
        await dataService.setAllPrompts(finalPrompts);
        
        // 重新加载提示词列表
        await loadUserPrompts();
        
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
        
        showToast(message, addedCount > 0 || updatedCount > 0 ? 'success' : 'warning');
        
        // 如果有失败记录，询问是否下载
        if (errors && errors.length > 0) {
            const downloadFailed = await showCustomConfirm('是否下载失败记录？');
            if (downloadFailed) {
                await window.JSONUtils.exportFailedRecords(errors);
            }
        }
        
    } catch (error) {
        console.error('导入失败:', error);
        showToast('导入失败：' + error.message, 'error');
    } finally {
        forceHideLoading();
    }
}

// --- 初始化 ---

// 添加超时保护机制
let loadingTimeout = null;

function forceHideLoading() {
    hideLoading();
    if (loadingTimeout) {
        clearTimeout(loadingTimeout);
        loadingTimeout = null;
    }
}

function safeShowLoading() {
    showLoading();
    // 10秒后强制隐藏loading
    if (loadingTimeout) clearTimeout(loadingTimeout);
    loadingTimeout = setTimeout(() => {
        console.log('Loading超时，强制隐藏');
        forceHideLoading();
        // 如果没有用户设置，显示主界面
        if (!currentUser) {
            showView('mainView');
        }
    }, 10000);
}

async function initializeApp() {
    console.log('开始初始化应用...');
    try {
        // 确保DOM元素存在后再显示主界面
        const mainView = document.getElementById('mainView');
        if (mainView) {
            showView('mainView');
        } else {
            console.error('mainView元素未找到，延迟重试');
            setTimeout(() => {
                if (document.getElementById('mainView')) {
                    showView('mainView');
                }
            }, 100);
        }
        
        // 创建虚拟用户，立即可用
        currentUser = {
            id: 'local-user',
            email: 'local@example.com'
        };
        
        // 立即获取主题设置并应用
        themeMode = await dataService.getThemeMode();
        applyTheme(themeMode);

        // 设置事件监听器
        setupEventListeners();
        setupCategoryInput();
        
        // 初始化认证服务（异步，不阻塞主流程）
        initializeAuthService().catch(error => {
            console.error('认证服务初始化失败，但不影响本地功能:', error);
        });
        
        // 使用数据服务获取数据后再渲染
        await loadUserPrompts(true); // 跳过loading显示，因为有骨架屏
        
    } catch (error) {
        console.error('初始化应用时发生错误:', error);
        // 即使出错也尝试进入主界面
        showView('mainView');
        // 清空骨架屏，显示错误状态
        const promptsContainer = document.getElementById('promptsContainer');
        if (promptsContainer) {
            promptsContainer.innerHTML = `<div style="text-align: center; padding: 40px 20px; color: #64748b;"><i class="fas fa-exclamation-triangle" style="font-size: 48px; margin-bottom: 16px; color: #ef4444;"></i><h3>加载失败</h3><p>请刷新页面重试</p></div>`;
        }
    }
}

// --- 认证相关函数 ---

/**
 * 通过 script 标签加载认证服务
 */
function loadAuthServiceScript() {
    return new Promise((resolve, reject) => {
        // 检查是否已经加载过该脚本
        const existingScript = document.querySelector('script[src="../utils/auth-service.js"]');
        if (existingScript) {
            console.log('认证服务脚本已存在，跳过重复加载');
            resolve();
            return;
        }
        
        const script = document.createElement('script');
        script.src = '../utils/auth-service.js';
        script.onload = () => {
            console.log('认证服务脚本加载成功');
            resolve();
        };
        script.onerror = (error) => {
            console.error('认证服务脚本加载失败:', error);
            reject(error);
        };
        document.head.appendChild(script);
    });
}

/**
 * 初始化认证服务
 */
async function initializeAuthService() {
    try {
        console.log('开始初始化认证服务...');
        
        // 检查是否已经初始化过
        if (authServiceInstance && typeof authServiceInstance.getSession === 'function') {
            console.log('认证服务已经初始化');
            return;
        }
        
        // 检查全局 authService 是否可用
        if (typeof window.authService !== 'undefined') {
            authServiceInstance = window.authService;
            console.log('使用全局 authService');
        } else {
            // 只使用 script 标签加载，避免重复加载
            console.log('通过 script 标签加载 authService');
            await loadAuthServiceScript();
            authServiceInstance = window.authService;
        }
        
        if (!authServiceInstance || typeof authServiceInstance.getSession !== 'function') {
            throw new Error('无法加载认证服务或服务对象无效');
        }
        
        console.log('authService 加载成功:', authServiceInstance);
        
        // 认证消息监听已移除，现在直接在 sidepanel 中处理认证
        
        // 监听认证状态变化
        if (authServiceInstance.onAuthStateChange) {
            authServiceInstance.onAuthStateChange((event, session) => {
                console.log('认证状态变化:', event, session?.user?.email);
                updateUIForAuthState(session);
            });
        }
        
        // 检查当前认证状态
        const { session } = await authServiceInstance.getSession();
        updateUIForAuthState(session);
        
        console.log('认证服务初始化完成');
    } catch (error) {
        console.error('认证服务初始化失败:', error);
        // 认证服务失败不影响本地功能
        updateUIForAuthState(null);
    }
}

/**
 * 处理Google登录
 */
async function handleGoogleSignIn() {
    console.log('handleGoogleSignIn 函数被调用');
    try {
        console.log('authService 状态:', authService);
        if (!authService) {
            console.error('认证服务未初始化');
            showToast('认证服务未初始化', 'error');
            return;
        }
        
        console.log('开始 Google 登录流程');
        showLoading();
        const result = await authServiceInstance.signInWithGoogle();
        
        if (result && result.success) {
            console.log('登录成功:', result.user.email);
            showToast('登录成功！', 'success');
            // 更新UI状态
            updateUIForAuthState(result.session);
            // 关闭下拉菜单
            const userDropdown = document.getElementById('userDropdown');
            if (userDropdown) {
                userDropdown.classList.remove('show');
            }
        }
    } catch (error) {
        console.error('Google登录失败:', error);
        showToast('登录失败: ' + error.message, 'error');
    } finally {
        hideLoading();
    }
}

/**
 * 处理退出登录
 */
async function handleLogout() {
    try {
        if (!authService) {
            showToast('认证服务未初始化', 'error');
            return;
        }
        
        showLoading();
        await authServiceInstance.signOut();
        showToast('已退出登录', 'success');
        
        // 用户下拉菜单已移除，无需关闭
    } catch (error) {
        console.error('退出登录失败:', error);
        showToast('退出失败: ' + error.message, 'error');
    } finally {
        hideLoading();
    }
}

/**
 * 根据认证状态更新UI
 * @param {Object|null} session - 用户会话信息
 */
function updateUIForAuthState(session) {
    // 设置页面元素
    const loggedOutSection = document.getElementById('loggedOutSection');
    const loggedInSection = document.getElementById('loggedInSection');
    const userAvatarSettings = document.getElementById('userAvatarSettings');
    const defaultUserIconSettings = document.getElementById('defaultUserIconSettings');
    const userEmailSettings = document.getElementById('userEmailSettings');
    
    if (session && session.user) {
        // 已登录状态
        const user = session.user;
        
        // 更新设置页面中的用户信息
        if (loggedInSection) loggedInSection.style.display = 'block';
        if (loggedOutSection) loggedOutSection.style.display = 'none';
        
        // 更新设置页面中的用户头像
        if (userAvatarSettings && user.user_metadata?.avatar_url) {
            userAvatarSettings.src = user.user_metadata.avatar_url;
            userAvatarSettings.style.display = 'block';
            if (defaultUserIconSettings) defaultUserIconSettings.style.display = 'none';
        } else {
            if (userAvatarSettings) userAvatarSettings.style.display = 'none';
            if (defaultUserIconSettings) defaultUserIconSettings.style.display = 'block';
        }
        
        // 更新设置页面中的用户邮箱
        if (userEmailSettings) {
            userEmailSettings.textContent = user.email || '未知用户';
        }
        
        // 更新全局用户状态
        currentUser = {
            id: user.id,
            email: user.email,
            avatar_url: user.user_metadata?.avatar_url
        };
        
        console.log('用户已登录:', currentUser);
        
        // 初始化同步服务
        initializeSyncService();
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
        
        // 停止同步服务
        if (syncServiceInstance) {
            syncServiceInstance = null;
        }
        updateSyncUI('disabled', '同步已禁用');
        
        console.log('用户未登录，使用本地模式');
    }
}

/**
 * 初始化同步服务
 */
async function initializeSyncService() {
    try {
        if (!authServiceInstance || !window.supabase) {
            console.log('认证服务或Supabase未初始化，跳过同步服务初始化');
            return;
        }
        
        // 动态加载同步服务
        await loadSyncServiceScript();
        
        if (window.SyncService) {
            syncServiceInstance = new window.SyncService(
                authServiceInstance,
                dataService,
                window.supabase
            );
            
            // 监听同步状态变化
            syncServiceInstance.onSyncStatusChange((status, message) => {
                updateSyncUI(status, message);
            });
            
            // 初始化同步服务
            await syncServiceInstance.initialize();
            
            // 设置DataService的同步服务引用
            dataService.setSyncService(syncServiceInstance);
            
            console.log('同步服务初始化成功，已与数据服务集成');
        }
    } catch (error) {
        console.error('同步服务初始化失败:', error);
        updateSyncUI('error', '同步服务初始化失败');
    }
}

/**
 * 加载同步服务脚本
 */
function loadSyncServiceScript() {
    return new Promise((resolve, reject) => {
        // 检查是否已经加载
        const existingScript = document.querySelector('script[src="../utils/sync-service.js"]');
        if (existingScript) {
            resolve();
            return;
        }
        
        const script = document.createElement('script');
        script.src = '../utils/sync-service.js';
        script.onload = () => {
            console.log('同步服务脚本加载成功');
            resolve();
        };
        script.onerror = () => {
            console.error('同步服务脚本加载失败');
            reject(new Error('同步服务脚本加载失败'));
        };
        document.head.appendChild(script);
    });
}

/**
 * 更新同步UI状态
 * @param {string} status - 同步状态: 'idle', 'syncing', 'success', 'error', 'disabled'
 * @param {string} message - 状态消息
 */
function updateSyncUI(status, message) {
    const syncStatusIcon = document.querySelector('.sync-status-icon');
    const syncStatusText = document.querySelector('.sync-status-text');
    const syncIndicator = document.getElementById('syncIndicator');
    const syncToggle = document.getElementById('syncToggle');
    
    if (!syncStatusIcon || !syncStatusText) return;
    
    // 清除所有状态类
    syncStatusIcon.className = 'fas sync-status-icon';
    syncStatusText.className = 'sync-status-text';
    
    switch (status) {
        case 'syncing':
            syncStatusIcon.classList.add('fa-sync-alt', 'fa-spin', 'syncing');
            syncStatusText.classList.add('syncing');
            syncStatusText.textContent = message || '正在同步...';
            if (syncIndicator) syncIndicator.style.display = 'flex';
            break;
            
        case 'success':
            syncStatusIcon.classList.add('fa-check-circle', 'success');
            syncStatusText.classList.add('success');
            syncStatusText.textContent = message || '同步成功';
            if (syncIndicator) syncIndicator.style.display = 'none';
            // 只在同步完成时显示toast，避免重复提示
            if (message && message.includes('同步完成')) {
                showToast('云端同步完成，数据已更新', 'success');
            }
            break;
            
        case 'error':
            syncStatusIcon.classList.add('fa-exclamation-circle', 'error');
            syncStatusText.classList.add('error');
            syncStatusText.textContent = message || '同步失败';
            if (syncIndicator) syncIndicator.style.display = 'none';
            break;
            
        case 'disabled':
            syncStatusIcon.classList.add('fa-times-circle');
            syncStatusText.textContent = message || '同步已禁用';
            if (syncIndicator) syncIndicator.style.display = 'none';
            if (syncToggle) syncToggle.checked = false;
            break;
            
        default: // 'idle'
            syncStatusIcon.classList.add('fa-check-circle', 'success');
            syncStatusText.classList.add('success');
            syncStatusText.textContent = message || '同步已启用';
            if (syncIndicator) syncIndicator.style.display = 'none';
            if (syncToggle) syncToggle.checked = true;
            break;
    }
 }

/**
 * 处理同步开关切换
 */
async function handleSyncToggle(event) {
    const isEnabled = event.target.checked;
    
    try {
        if (isEnabled) {
            if (!syncServiceInstance) {
                await initializeSyncService();
            }
            if (syncServiceInstance) {
                updateSyncUI('syncing', '正在启用同步...');
                await syncServiceInstance.performFullSync();
                updateSyncUI('success', '同步已启用');
            }
        } else {
            updateSyncUI('disabled', '同步已禁用');
        }
    } catch (error) {
        console.error('同步开关操作失败:', error);
        updateSyncUI('error', '同步操作失败');
        event.target.checked = !isEnabled; // 恢复开关状态
    }
}

/**
 * 集成同步到数据操作 - 添加提示词
 */
async function syncAddPrompt(promptData) {
    if (syncServiceInstance && currentUser && currentUser.id !== 'local-user') {
        try {
            await syncServiceInstance.createPrompt(promptData);
        } catch (error) {
            console.error('同步添加提示词失败:', error);
        }
    }
}

/**
 * 集成同步到数据操作 - 更新提示词
 */
async function syncUpdatePrompt(promptData) {
    if (syncServiceInstance && currentUser && currentUser.id !== 'local-user') {
        try {
            await syncServiceInstance.updatePrompt(promptData);
        } catch (error) {
            console.error('同步更新提示词失败:', error);
        }
    }
}

/**
 * 集成同步到数据操作 - 删除提示词
 */
async function syncDeletePrompt(promptId) {
    if (syncServiceInstance && currentUser && currentUser.id !== 'local-user') {
        try {
            await syncServiceInstance.deletePrompt(promptId);
        } catch (error) {
            console.error('同步删除提示词失败:', error);
        }
    }
}
 
 // 立即显示界面，不等待任何操作
 document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM加载完成，立即初始化应用');
    initializeApp();
});

