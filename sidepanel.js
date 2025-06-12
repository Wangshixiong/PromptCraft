// sidepanel.js

// *****************************************************************************
// * 指令：请在此处填入您的 Supabase 配置                  *
// *****************************************************************************
//                                                                             *
// 1. 访问 https://app.supabase.com/ 登录并进入您的项目。                         *
// 2. 在左侧菜单中，点击 "Project Settings" (齿轮图标)。                           *
// 3. 选择 "API" 选项卡。                                                      *
// 4. 在 "Project API keys" 部分，找到 "anon" "public" key 并复制它。            *
// 5. 将复制的 key 粘贴到下面的 `supabaseKey` 变量中。                           *
// 6. 在 "Configuration" 部分，找到您的项目 URL 并复制它。                       *
// 7. 将复制的 URL 粘贴到下面的 `supabaseUrl` 变量中。                           *
//                                                                             *
// *****************************************************************************

const supabaseUrl = 'https://uwgxhtrbixsdabjvuuaj.supabase.co'; // 您已填写的示例
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV3Z3hodHJiaXhzZGFianZ1dWFqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk0NzQ0NzUsImV4cCI6MjA2NTA1MDQ3NX0.6R4t3Bxy6g-ajI1Fym-RWmZgIvlAGLxy6uV1wbTULN0'; // 您已填写的示例


// -----------------------------------------------------------------------------
// 请不要修改下面的代码
// -----------------------------------------------------------------------------

const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);

// DOM 元素引用
const loadingOverlay = document.getElementById('loadingOverlay');
const authView = document.getElementById('authView');
const mainView = document.getElementById('mainView');
const formView = document.getElementById('formView');
const themeToggle = document.getElementById('themeToggle');
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


// 全局状态
let allPrompts = [];
let currentUser = null;
let themeMode = 'auto';
let currentView = null;
let isProcessingContextMenu = false; // 标记是否正在处理右键菜单消息

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
    
    // 更新图标 - 修复逻辑：浅色模式显示月亮（点击切换到深色），深色模式显示太阳（点击切换到浅色）
    const icon = themeToggle.querySelector('i');
    if (mode === 'auto') {
        icon.className = 'fas fa-adjust';
        themeToggle.title = '主题：跟随系统';
    } else if (isDark) {
        icon.className = 'fas fa-sun';
        themeToggle.title = '主题：深色模式（点击切换到浅色）';
    } else {
        icon.className = 'fas fa-moon';
        themeToggle.title = '主题：浅色模式（点击切换到深色）';
    }
}

// --- 实用工具函数 ---

const showLoading = () => loadingOverlay.style.display = 'flex';
const hideLoading = () => loadingOverlay.style.display = 'none';

// 自定义确认弹窗
function showCustomConfirm(message) {
    return new Promise((resolve) => {
        // 创建弹窗容器
        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background-color: rgba(0, 0, 0, 0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 2000;
        `;
        
        const modal = document.createElement('div');
        modal.style.cssText = `
            background: var(--background-light);
            border-radius: 12px;
            padding: 24px;
            max-width: 300px;
            width: 90%;
            box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
            color: var(--text-light);
        `;
        
        // 检查是否为暗色模式
        if (document.body.classList.contains('dark-mode')) {
            modal.style.background = 'var(--background-dark)';
            modal.style.color = 'var(--text-dark)';
        }
        
        const isDarkMode = document.body.classList.contains('dark-mode');
        const cancelBtnColor = isDarkMode ? 'white' : 'var(--text-light)';
        const cancelBorderColor = isDarkMode ? 'var(--border-dark)' : 'var(--border-light)';
        
        modal.innerHTML = `
            <div style="margin-bottom: 20px; font-size: 16px; line-height: 1.5;">${message}</div>
            <div style="display: flex; gap: 12px; justify-content: flex-end;">
                <button id="cancelBtn" style="
                    padding: 8px 16px;
                    border: 1px solid ${cancelBorderColor};
                    background: transparent;
                    color: ${cancelBtnColor};
                    border-radius: 6px;
                    cursor: pointer;
                    font-size: 14px;
                ">取消</button>
                <button id="confirmBtn" style="
                    padding: 8px 16px;
                    border: none;
                    background: var(--danger);
                    color: white;
                    border-radius: 6px;
                    cursor: pointer;
                    font-size: 14px;
                ">确定</button>
            </div>
        `;
        
        overlay.appendChild(modal);
        document.body.appendChild(overlay);
        
        // 事件监听
        modal.querySelector('#confirmBtn').onclick = () => {
            // document.body.removeChild(overlay);
            overlay && overlay.remove()
            resolve(true);
        };
        
        modal.querySelector('#cancelBtn').onclick = () => {
            // document.body.removeChild(overlay);
            overlay && overlay.remove()
            resolve(false);
        };
        
        overlay.onclick = (e) => {
            if (e.target === overlay) {
                // document.body.removeChild(overlay);
                overlay && overlay.remove()
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
        
        // 检查视图是否实际显示
        setTimeout(() => {
            const isVisible = targetView.offsetWidth > 0 && targetView.offsetHeight > 0;
            console.log(`视图 ${viewId} 是否可见: ${isVisible}`);
            if (!isVisible) {
                console.warn(`警告：视图 ${viewId} 可能未正确显示，尝试强制显示`);
                targetView.style.display = 'flex';
            }
        }, 100);
        
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

// 登出处理（现在只是清除本地数据）
async function handleLogout() {
    safeShowLoading();
    
    // 清除本地数据
    localStorage.removeItem('promptcraft_prompts');
    currentUser = null;
    allPrompts = [];
    renderPrompts([]);
    updateFilterButtons();
    
    // 重新初始化，这会创建新的虚拟用户和示例数据
    await checkUserSession();
    
    forceHideLoading();
}

async function checkUserSession() {
    try {
        safeShowLoading();
        console.log('直接进入主界面模式...');
        
        // 创建一个虚拟用户对象，用于本地存储
        currentUser = {
            id: 'local-user',
            email: 'local@example.com'
        };
        
        console.log('设置虚拟用户，直接进入主界面');
        
        // 直接切换到主界面
        const viewSwitched = showView('mainView');
        console.log('视图切换结果:', viewSwitched ? '成功' : '失败');
        
        // 如果视图切换失败，尝试直接操作DOM
        if (!viewSwitched) {
            console.log('视图切换失败，尝试直接操作DOM');
            document.querySelectorAll('.view').forEach(view => {
                view.style.display = 'none';
                view.classList.remove('active');
            });
            const mainView = document.getElementById('mainView');
            if (mainView) {
                mainView.style.display = 'flex';
                mainView.classList.add('active');
                currentView = 'mainView';
                console.log('通过DOM操作强制显示主界面成功');
            } else {
                console.error('找不到主视图元素');
            }
        }
        
        // 然后加载数据
        try {
            console.log('加载本地提示词...');
            await loadUserPrompts(true); // 跳过内部loading
            console.log('提示词加载成功');
        } catch (err) {
            console.error('加载数据失败:', err);
            console.error('错误详情:', err.message, err.stack);
        }
        
        // 再次确认视图显示正确
        setTimeout(() => {
            // 如果正在处理右键菜单消息，跳过强制显示主界面的操作
            if (isProcessingContextMenu) {
                console.log('正在处理右键菜单消息，跳过延迟检查');
                return;
            }
            
            const mainView = document.getElementById('mainView');
            if (mainView && (!mainView.classList.contains('active') || getComputedStyle(mainView).display === 'none')) {
                console.log('延迟检查发现主界面未正确显示，再次尝试强制显示');
                document.querySelectorAll('.view').forEach(view => {
                    view.style.display = 'none';
                    view.classList.remove('active');
                });
                mainView.style.display = 'flex';
                mainView.classList.add('active');
                currentView = 'mainView';
            }
        }, 500);
        
        console.log('直接进入主界面完成');
        
    } catch (err) {
        console.error('检查会话时发生错误:', err);
        console.error('错误详情:', err.message, err.stack);
        showView('authView');
    } finally {
        forceHideLoading();
    }
}


// --- 数据处理 (CRUD) ---

async function loadUserPrompts(skipLoading = false) {
    console.log('开始加载本地提示词，skipLoading:', skipLoading);
    if (!currentUser) {
        console.error('无法加载提示词：用户未设置');
        return;
    }
    if (!skipLoading) safeShowLoading();
    
    try {
        console.log('从本地存储加载提示词...');
        
        // 从localStorage获取提示词数据
        const storedPrompts = localStorage.getItem('promptcraft_prompts');
        let data = [];
        
        if (storedPrompts) {
            try {
                data = JSON.parse(storedPrompts);
                console.log('成功获取本地提示词数据，数量:', data?.length || 0);
            } catch (parseError) {
                console.error('解析本地数据失败:', parseError);
                data = [];
            }
        }
        
        if (!data || data.length === 0) {
            console.log('未找到本地提示词');
            // 检查是否是首次使用（localStorage中没有任何数据）
            const hasEverHadData = localStorage.getItem('promptcraft_has_data');
            if (!hasEverHadData) {
                console.log('首次使用，创建示例提示词...');
                await createSamplePrompts(skipLoading);
                return;
            } else {
                console.log('用户已删除所有提示词，显示空列表');
                allPrompts = [];
                renderPrompts([]);
                updateFilterButtons();
                return;
            }
        }
        
        allPrompts = data;
        console.log('渲染提示词列表...');
        renderPrompts(allPrompts);
        updateFilterButtons();
        console.log('本地提示词加载完成');
        
    } catch (err) {
        console.error('加载本地提示词时发生错误:', err);
        console.error('错误详情:', err.message, err.stack);
        // 即使出错，也尝试显示空列表
        renderPrompts([]);
        updateFilterButtons();
    } finally {
        if (!skipLoading) forceHideLoading();
    }
}

async function createSamplePrompts(skipLoading = false) {
    try {
        // 从JSON文件加载默认提示词
        const response = await fetch('./default-prompts.json');
        if (!response.ok) {
            throw new Error('无法加载默认提示词文件');
        }
        
        const defaultPrompts = await response.json();
        
        // 为每个提示词添加用户ID和时间戳
        const sampleData = defaultPrompts.map((prompt, index) => ({
            ...prompt,
            id: Date.now() + index,
            user_id: currentUser.id,
            created_at: new Date().toISOString()
        }));
        
        // 保存到本地存储
        localStorage.setItem('promptcraft_prompts', JSON.stringify(sampleData));
        // 标记用户已经有过数据
        localStorage.setItem('promptcraft_has_data', 'true');
        console.log('成功创建默认提示词');
        await loadUserPrompts(skipLoading);
    } catch (error) {
        console.error('加载默认提示词失败:', error);
        // 如果加载失败，创建空的提示词列表
        localStorage.setItem('promptcraft_prompts', JSON.stringify([]));
        localStorage.setItem('promptcraft_has_data', 'true');
        await loadUserPrompts(skipLoading);
    }
}

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
        // 从本地存储获取现有数据
        const storedPrompts = localStorage.getItem('promptcraft_prompts');
        let prompts = [];
        
        if (storedPrompts) {
            try {
                prompts = JSON.parse(storedPrompts);
            } catch (parseError) {
                console.error('解析本地数据失败:', parseError);
                prompts = [];
            }
        }
        
        const promptData = {
            user_id: currentUser.id,
            title,
            content,
            category,
        };
        
        if (id) {
            // 更新现有提示词
            const index = prompts.findIndex(p => p.id == id);
            if (index !== -1) {
                prompts[index] = { ...prompts[index], ...promptData };
                console.log('更新提示词:', id);
            } else {
                console.error('未找到要更新的提示词:', id);
                showToast('未找到要更新的提示词', 'error');
                forceHideLoading();
                return;
            }
        } else {
            // 添加新提示词
            const newPrompt = {
                id: Date.now(),
                ...promptData,
                created_at: new Date().toISOString()
            };
            prompts.unshift(newPrompt); // 添加到开头
            console.log('添加新提示词:', newPrompt.id);
        }
        
        // 保存到本地存储
        localStorage.setItem('promptcraft_prompts', JSON.stringify(prompts));
        // 标记用户已经有过数据
        localStorage.setItem('promptcraft_has_data', 'true');
        console.log('提示词保存成功');
        
        await loadUserPrompts();
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
        // 从本地存储获取现有数据
        const storedPrompts = localStorage.getItem('promptcraft_prompts');
        let prompts = [];
        
        if (storedPrompts) {
            try {
                prompts = JSON.parse(storedPrompts);
            } catch (parseError) {
                console.error('解析本地数据失败:', parseError);
                prompts = [];
            }
        }
        
        // 删除指定的提示词
        const filteredPrompts = prompts.filter(p => p.id != promptId);
        
        if (filteredPrompts.length === prompts.length) {
            console.error('未找到要删除的提示词:', promptId);
            showToast('未找到要删除的提示词', 'error');
        } else {
            // 保存更新后的数据到本地存储
            localStorage.setItem('promptcraft_prompts', JSON.stringify(filteredPrompts));
            // 确保标记用户已经有过数据（即使现在为空）
            localStorage.setItem('promptcraft_has_data', 'true');
            console.log('提示词删除成功:', promptId);
            
            // 更新内存中的数据并重新渲染
            allPrompts = filteredPrompts;
            renderPrompts(allPrompts);
            updateFilterButtons();
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
        promptsContainer.innerHTML = '';
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


    // 主题切换
    themeToggle.addEventListener('click', () => {
        // 循环切换：auto -> light -> dark -> auto
        if (themeMode === 'auto') {
            themeMode = 'light';
        } else if (themeMode === 'light') {
            themeMode = 'dark';
        } else {
            themeMode = 'auto';
        }
        
        applyTheme(themeMode);
        chrome.storage.local.set({ themeMode });
    });

    // 监听系统主题变化
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
        if (themeMode === 'auto') {
            applyTheme('auto');
        }
    });
    
    addPromptBtn.addEventListener('click', () => {
        promptIdInput.value = '';
        promptTitleInput.value = '';
        promptContentInput.value = '';
        promptCategoryInput.value = '';
        promptCategorySelect.value = '';
        promptCategorySelect.style.display = 'none';
        promptCategoryInput.style.display = 'block';
        formTitle.textContent = '添加新提示词';
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
    });
    
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
    
    fileInput.addEventListener('change', handleFileImport);
    
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.type === 'ADD_FROM_CONTEXT_MENU' && message.data?.content) {
            console.log('收到右键菜单消息，内容:', message.data.content);
            
            // 设置标志，防止checkUserSession的延迟检查干扰
            isProcessingContextMenu = true;
            
            // 等待应用完全初始化后再处理
            const waitForInitialization = () => {
                // 检查必要的元素是否存在
                if (currentUser && addPromptBtn && promptContentInput) {
                    console.log('应用已初始化完成，开始处理右键添加提示词');
                    
                 if (currentView !== 'formView') {
                     showView('formView');
                     // 使用 requestAnimationFrame 确保 DOM 更新后再填充
                     requestAnimationFrame(() => {
                         promptContentInput.value = message.data.content;
                         promptContentInput.dispatchEvent(new Event('input', { bubbles: true }));
                         console.log('通过 rAF 切换到添加界面并填充内容');
                         
                         // 处理完成后重置标志
                         setTimeout(() => {
                             isProcessingContextMenu = false;
                         }, 1000); // 1秒后重置标志，确保不会影响后续操作
                         
                         sendResponse({ status: "success", message: "Content received and form populated via rAF after view switch." });
                     });
                 } else {
                     // 如果已经是 formView，也使用 rAF 确保一致性并处理可能的快速切换场景
                     requestAnimationFrame(() => {
                         promptContentInput.value = message.data.content;
                         promptContentInput.dispatchEvent(new Event('input', { bubbles: true }));
                         console.log('已在添加界面，通过 rAF 填充内容');
                         
                         // 处理完成后重置标志
                         setTimeout(() => {
                             isProcessingContextMenu = false;
                         }, 1000); // 1秒后重置标志，确保不会影响后续操作
                         
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
        const storedPrompts = localStorage.getItem('promptcraft_prompts');
        let existingPrompts = [];
        
        if (storedPrompts) {
            try {
                existingPrompts = JSON.parse(storedPrompts);
            } catch (parseError) {
                console.error('解析现有数据失败:', parseError);
                existingPrompts = [];
            }
        }
        
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
                    updatedAt: new Date().toISOString()
                };
                updatedCount++;
            } else {
                // 添加新提示词到开头
                finalPrompts.unshift({
                    ...newPrompt,
                    id: Date.now() + Math.random(),
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                });
                addedCount++;
            }
        });
        
        // 保存到本地存储
        localStorage.setItem('promptcraft_prompts', JSON.stringify(finalPrompts));
        localStorage.setItem('promptcraft_has_data', 'true');
        
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
        // 如果没有用户登录，显示登录界面
        if (!currentUser) {
            showView('authView');
        }
    }, 10000);
}

async function initializeApp() {
    console.log('开始初始化应用...');
    try {
        // 主题设置
        const { themeMode: savedThemeMode } = await chrome.storage.local.get('themeMode');
        themeMode = savedThemeMode || 'auto';
        
        // 应用初始主题
        applyTheme(themeMode);

        setupEventListeners();
        setupCategoryInput();
        
        // 直接检查并进入主界面
        await checkUserSession();
        
    } catch (error) {
        console.error('初始化应用时发生错误:', error);
        forceHideLoading();
        // 即使出错也尝试进入主界面
        showView('mainView');
    }
}

initializeApp();

