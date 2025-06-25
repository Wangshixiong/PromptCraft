// sidepanel.js

/**
 * PromptCraft - 本地提示词管理工具
 * 版本: 1.2.0
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
        
        // 智能检查视图显示状态（避免初始化时的误报）
        setTimeout(() => {
            // 确保元素仍然存在且是当前视图
            if (!targetView.parentNode || currentView !== viewId) {
                return;
            }
            
            // 检查CSS是否已加载完成
            const isStylesLoaded = document.readyState === 'complete' && 
                                 getComputedStyle(document.body).fontFamily !== '';
            
            if (!isStylesLoaded) {
                console.log(`CSS样式尚未完全加载，跳过视图 ${viewId} 的显示检查`);
                return;
            }
            
            const computedStyle = window.getComputedStyle(targetView);
            const isVisible = computedStyle.display !== 'none' && 
                            targetView.offsetWidth > 0 && 
                            targetView.offsetHeight > 0;
            
            console.log(`视图 ${viewId} 显示状态: display=${computedStyle.display}, visible=${isVisible}`);
            
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
                        if (currentView === viewId) {
                            targetView.classList.add('active');
                        }
                    });
                } else {
                    console.log(`页面仍在初始化中，跳过视图 ${viewId} 的警告`);
                }
            }
        }, 300); // 增加延迟时间，确保CSS和动画完成
        
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
        // 通过消息通信清除本地数据
        const response = await chrome.runtime.sendMessage({ type: 'CLEAR_ALL_PROMPTS' });
        
        if (response.success) {
            allPrompts = [];
            renderPrompts([]);
            updateFilterButtons();
            showToast('所有数据已清除', 'success');
        } else {
            console.error('清除数据失败:', response.error);
            showToast('清除数据失败，请稍后再试', 'error');
        }
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
        console.log('使用消息驱动架构加载提示词...');
        
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
        console.log('成功获取提示词数据，数量:', data.length);
        
        // 检查是否有加载错误（从后台服务返回的错误信息）
        if (response.loadError && response.loadError.hasError) {
            console.warn('检测到数据加载错误:', response.loadError.message);
            showToast(response.loadError.message || '数据加载失败', 'warning');
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
                console.log('更新提示词:', id);
                showToast('提示词更新成功', 'success');
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
                console.log('添加新提示词:', response.data.id);
                showToast('提示词添加成功', 'success');
            } else {
                throw new Error(response.error || '添加提示词失败');
            }
        }
        
        console.log('提示词保存成功');
        
        // 注意：不再手动调用loadUserPrompts()，依赖chrome.storage.onChanged自动刷新UI
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
        // 使用消息通信删除提示词
        const response = await chrome.runtime.sendMessage({
            type: 'DELETE_PROMPT',
            payload: promptId
        });
        
        if (response.success) {
            console.log('提示词删除成功:', promptId);
            showToast('删除成功', 'success');
            
            // 注意：不再手动调用loadUserPrompts()，依赖chrome.storage.onChanged自动刷新UI
        } else {
            throw new Error(response.error || '删除提示词失败');
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
    // 数据变更监听已合并到主监听器中

    // 主题选择器事件处理
    document.addEventListener('click', (e) => {
        const themeOption = e.target.closest('.theme-option');
        if (themeOption) {
            const selectedTheme = themeOption.dataset.theme;
            if (selectedTheme !== themeMode) {
                themeMode = selectedTheme;
                applyTheme(themeMode);
                
                // 通过消息通信保存主题模式
                chrome.runtime.sendMessage({ 
                    type: 'SET_THEME_MODE', 
                    payload: themeMode 
                }).then(response => {
                    if (!response.success) {
                        console.error('保存主题模式失败:', response.error);
                    }
                }).catch(error => {
                    console.error('保存主题模式时发生错误:', error);
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
    
    // 手动同步按钮事件监听器
    const manualSyncBtn = document.getElementById('manualSyncBtn');
    if (manualSyncBtn) {
        manualSyncBtn.addEventListener('click', handleManualSync);
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
    
    // 右键菜单监听已合并到主监听器中
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
             
             showToast(message, addedCount > 0 || updatedCount > 0 ? 'success' : 'warning');
             // 注意：不再手动调用loadUserPrompts()，依赖chrome.storage.onChanged自动刷新UI
         } else {
             console.error('导入失败:', response.error);
             showToast('导入失败：' + response.error, 'error');
         }
        
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
        // 智能等待CSS加载完成后再显示主界面
        const showMainViewWhenReady = () => {
            const mainView = document.getElementById('mainView');
            if (!mainView) {
                console.error('mainView元素未找到，延迟重试');
                setTimeout(showMainViewWhenReady, 100);
                return;
            }
            
            // 检查CSS是否已加载完成
            const isStylesLoaded = document.readyState === 'complete' && 
                                 getComputedStyle(document.body).fontFamily !== '';
            
            if (isStylesLoaded) {
                showView('mainView');
            } else {
                console.log('等待CSS样式加载完成...');
                // 监听load事件或使用短延迟重试
                if (document.readyState === 'loading') {
                    document.addEventListener('DOMContentLoaded', showMainViewWhenReady, { once: true });
                } else {
                    setTimeout(showMainViewWhenReady, 50);
                }
            }
        };
        
        showMainViewWhenReady();
        
        // 创建虚拟用户，立即可用
        currentUser = {
            id: 'local-user',
            email: 'local@example.com'
        };
        
        // 立即获取主题设置并应用（直接使用dataService，避免消息通信）
        try {
            // 直接从dataService获取主题模式，避免不必要的消息通信
            const dataService = new DataService();
            themeMode = await dataService.getThemeMode();
            applyTheme(themeMode);
            console.log('成功获取并应用主题模式:', themeMode);
        } catch (error) {
            console.error('获取主题模式时发生错误:', error);
            themeMode = 'light'; // 默认主题
            applyTheme(themeMode);
        }

        // 设置事件监听器
        setupEventListeners();
        setupCategoryInput();
        
        // 预加载登录资源（异步执行，不阻塞主流程）
        try {
            if (window.authService && typeof window.authService.preloadLoginResources === 'function') {
                window.authService.preloadLoginResources().catch(error => {
                    console.warn('预加载登录资源失败:', error);
                });
                console.log('已启动登录资源预加载');
            }
        } catch (error) {
            console.warn('预加载登录资源时发生错误:', error);
        }
        
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
 * 设置登录按钮的加载状态
 * @param {boolean} isLoading - 是否显示加载状态
 */
function setLoginButtonLoading(isLoading, progressText = '') {
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
            btnText.textContent = progressText || '正在登录...';
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
            btnText.textContent = '使用 Google 登录';
        }
    }
}

/**
 * 处理Google登录
 */
async function handleGoogleSignIn() {
    console.log('Sidepanel: 用户点击登录，正在向后台发送命令...');
    
    // 启动加载状态
    setLoginButtonLoading(true);
    
    // 只负责发送消息，不关心后续逻辑
    chrome.runtime.sendMessage({ 
        type: 'LOGIN_WITH_GOOGLE',
        progressCallback: true // 标识需要进度回调
    }, (response) => {
        if (chrome.runtime.lastError || !response.success) {
            console.error('登录命令发送失败或后台处理失败:', response?.error);
            showToast('登录启动失败，请重试', 'error');
            // 登录失败时恢复按钮状态
            setLoginButtonLoading(false);
        } else {
            console.log('Sidepanel: 登录流程已成功由后台启动。');
            // 移除"正在登录中"提示，避免与"登录成功"Toast重复
            // 注意：登录成功时不在这里恢复按钮状态，而是在收到认证状态更新消息时恢复
        }
    });
}

/**
 * 处理退出登录
 */
async function handleLogout() {
    console.log('Sidepanel: 用户点击退出，正在向后台发送命令...');
    // 只负责发送消息，不关心后续逻辑
    chrome.runtime.sendMessage({ type: 'LOGOUT' }, (response) => {
        if (chrome.runtime.lastError || !response.success) {
            console.error('退出命令发送失败或后台处理失败:', response?.error);
            showToast('退出启动失败，请重试', 'error');
        } else {
            console.log('Sidepanel: 退出流程已成功由后台启动。');
            // 移除"正在退出中"提示，避免与"已退出登录"Toast重复
        }
    });
}

/**
 * 根据认证状态更新UI
 * @param {Object|null} session - 用户会话信息
 */
function updateUIForAuthState(session) {
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
                               (user.email ? user.email.split('@')[0] : '用户');
            userName.textContent = displayName;
            userName.title = displayName; // 添加hover显示完整用户名
        }
        
        if (userEmail) {
            const email = user.email || '未知邮箱';
            userEmail.textContent = email;
            userEmail.title = email; // 添加hover显示完整邮箱
        }
        
        // 初始化同步时间显示
        updateSyncTime();
        
        // 更新全局用户状态
        currentUser = {
            id: user.id,
            email: user.email,
            avatar_url: user.user_metadata?.avatar_url
        };
        
        console.log('用户已登录:', currentUser);

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
        
        console.log('用户未登录，使用本地模式');
    }
}

/**
 * 初始化同步服务
 */





/**
 * 处理手动同步
 */
async function handleManualSync() {
    const manualSyncBtn = document.getElementById('manualSyncBtn');
    if (!manualSyncBtn) return;
    
    // 检查用户是否已登录
    if (!currentUser || currentUser.id === 'local-user') {
        showToast('请先登录以使用云端同步功能', 'warning');
        return;
    }
    
    try {
        console.log('用户手动触发同步');
        
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
            console.log('手动同步完成');
            // 更新同步时间
            updateSyncTime();
            showToast('同步成功！', 'success');
        } else {
            console.error('手动同步失败:', response?.error);
            showToast('同步失败: ' + (response?.error || '未知错误'), 'error');
        }
        
    } catch (error) {
        console.error('手动同步失败:', error);
        showToast('同步失败，请重试', 'error');
    } finally {
        // 移除旋转动画并恢复按钮状态
        manualSyncBtn.classList.remove('syncing');
        manualSyncBtn.disabled = false;
    }
}

/**
 * 更新同步时间显示
 */
function updateSyncTime() {
    const syncTimeElement = document.getElementById('syncTime');
    if (syncTimeElement) {
        const now = new Date();
        const timeString = now.toLocaleString('zh-CN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
        syncTimeElement.textContent = `最后同步时间: ${timeString}`;
    }
}

/**
 * 更新同步状态
 * @param {string} status - 同步状态
 * @param {string} lastSyncTime - 最后同步时间
 */
function updateSyncStatus(status, lastSyncTime) {
    console.log('更新同步状态UI:', status, lastSyncTime);
    
    const syncTimeElement = document.getElementById('syncTime');
    
    switch (status) {
        case 'syncing':
            if (syncTimeElement) {
                syncTimeElement.textContent = '正在同步...';
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
                    syncTimeElement.textContent = `最后同步时间: ${timeString}`;
                }
            } else {
                updateSyncTime();
            }
            showToast('云端同步完成', 'success');
            break;
            
        case 'error':
            if (syncTimeElement) {
                syncTimeElement.textContent = '同步失败';
            }
            showToast('同步失败，请稍后重试', 'error');
            break;
            
        case 'idle':
        default:
            if (syncTimeElement) {
                syncTimeElement.textContent = '尚未同步';
            }
            break;
    }
}

/**
 * 更新同步UI状态（保留用于兼容性）
 * @param {string} status - 同步状态
 * @param {string} message - 状态消息
 */
function updateSyncUI(status, message) {
    // 对于新的UI，只需要更新同步时间
    if (status === 'success' && message && message.includes('同步完成')) {
        updateSyncTime();
        showToast('云端同步完成，数据已更新', 'success');
    }
}

// 同步相关功能已迁移到 background.js 中管理
 
 // 注释：移除重复的DOMContentLoaded监听器，避免重复初始化
 // 初始化逻辑已在 initializeApp() 函数内部的 showMainViewWhenReady() 中处理

// 全局消息监听器 - 接收来自 background.js 的 UI 更新指令
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    // 处理来自后台的消息
    switch (message.type) {
        case 'UPDATE_AUTH_UI':
            console.log('认证状态更新:', message.session ? '已登录' : '已退出');
            updateUIForAuthState(message.session);
            
            // 恢复登录按钮状态（无论登录成功还是退出登录）
            setLoginButtonLoading(false);
            
            // 根据认证状态显示相应的提示
            if (message.session) {
                showToast('登录成功！', 'success');
                // 关闭下拉菜单
                const userDropdown = document.getElementById('userDropdown');
                if (userDropdown) {
                    userDropdown.classList.remove('show');
                }
            } else {
                showToast('已退出登录', 'success');
            }
            break;
            
        case 'LOGIN_PROGRESS':
            console.log('登录进度更新:', message.stage, message.message);
            // 更新登录按钮的进度文本
            setLoginButtonLoading(true, message.message);
            break;
            
        case 'LOGIN_ERROR':
            console.log('登录失败:', message.error);
            showToast('登录失败: ' + message.error, 'error');
            // 登录错误时恢复按钮状态
            setLoginButtonLoading(false);
            break;
            
        case 'LOGOUT_ERROR':
            console.log('退出失败:', message.error);
            showToast('退出失败: ' + message.error, 'error');
            break;
            
        case 'GET_THEME_MODE':
        case 'getPrompts':
            // 静默忽略主题模式查询和获取提示词消息
            break;
            
        case 'DATA_CHANGED':
            console.log('收到数据变更通知，刷新界面');
            // 异步刷新界面，避免阻塞
            setTimeout(() => {
                loadUserPrompts(true).catch(error => {
                    console.error('数据变更后刷新界面失败:', error);
                });
            }, 100);
            break;
            
        case 'SYNC_STATUS_CHANGED':
            console.log('同步状态变化:', message.operation, message.data);
            if (message.operation === 'SYNC_COMPLETED') {
                // 同步完成，更新同步时间显示
                updateSyncTime();
            }
            break;
            
        case 'SYNC_PROGRESS':
            console.log('同步进度更新:', message.progress);
            break;
            
        case 'ADD_FROM_CONTEXT_MENU':
            if (message.data?.content) {
                
                // 设置标志，防止checkUserSession的延迟检查干扰
                isProcessingContextMenu = true;
                
                // 等待应用完全初始化后再处理
                const waitForInitialization = async () => {
                    // 检查必要的元素是否存在
                    if (currentUser && addPromptBtn && promptContentInput) {
                        
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
                                // 切换到添加界面并填充内容
                                
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
                                    // 用户确认放弃编辑，创建新提示词
                                    
                                    setTimeout(() => {
                                        isProcessingContextMenu = false;
                                    }, 1000);
                                    
                                    sendResponse({ status: "success", message: "User confirmed to abandon edit and create new prompt." });
                                });
                            } else {
                                // 用户取消了右键添加操作
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
                                // 已在添加界面，填充内容
                                
                                setTimeout(() => {
                                    isProcessingContextMenu = false;
                                }, 1000);
                                
                                sendResponse({ status: "success", message: "Content received and form populated via rAF in existing view." });
                            });
                        }
                    } else {
                        // 应用尚未完全初始化，继续等待
                        // 如果应用还未初始化完成，继续等待
                        setTimeout(waitForInitialization, 100);
                    }
                };
                
                // 开始等待初始化完成
                waitForInitialization();
                return true; // 保持消息通道开放
            }
            break;
            
        default:
            // 检查是否是action类型的消息（没有type字段但有action字段）
            if (message.action) {
                // 忽略action类型的消息
            } else if (message.type) {
                console.log('未知消息类型:', message.type);
            }
    }
    
    // 发送响应确认消息已处理
    sendResponse({ success: true });
});

// 应用启动入口 - 确保只初始化一次
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp, { once: true });
} else {
    // DOM已经加载完成，直接初始化
    initializeApp();
}

