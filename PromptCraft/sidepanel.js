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


// 全局状态
let allPrompts = [];
let currentUser = null;

// --- 实用工具函数 ---

const showLoading = () => loadingOverlay.style.display = 'flex';
const hideLoading = () => loadingOverlay.style.display = 'none';

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
            console.log('未找到本地提示词，创建示例提示词...');
            await createSamplePrompts(skipLoading);
            return; 
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
    const sampleData = [
        { 
            id: Date.now() + 1,
            title: "Midjourney 艺术创作", 
            content: "Create a stunning cyberpunk cityscape at night with neon lights reflecting on wet streets, flying cars in the distance, and towering skyscrapers reaching into the clouds. Style: photorealistic, cinematic lighting, 8K resolution", 
            category: "Midjourney",
            user_id: currentUser.id,
            created_at: new Date().toISOString()
        },
        { 
            id: Date.now() + 2,
            title: "Python 代码助手", 
            content: "You are an expert Python developer. Write a function that takes a list of numbers and returns the sum of all even numbers. Include proper error handling and documentation.", 
            category: "代码生成",
            user_id: currentUser.id,
            created_at: new Date().toISOString()
        },
        { 
            id: Date.now() + 3,
            title: "文案创作助手", 
            content: "你是一位专业的文案创作专家。请为一款新的智能手表写一段吸引人的产品描述，突出其健康监测功能和时尚设计。", 
            category: "文案创作",
            user_id: currentUser.id,
            created_at: new Date().toISOString()
        }
    ];
    
    try {
        // 保存到本地存储
        localStorage.setItem('promptcraft_prompts', JSON.stringify(sampleData));
        console.log('成功创建示例提示词');
        await loadUserPrompts(skipLoading);
    } catch (error) {
        console.error("创建默认提示词失败:", error);
    }
}

async function savePrompt() {
    const id = promptIdInput.value;
    const title = promptTitleInput.value.trim();
    const content = promptContentInput.value.trim();
    const category = promptCategoryInput.value.trim() || '未分类';

    if (!title || !content) {
        alert('标题和内容不能为空！');
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
                alert('未找到要更新的提示词');
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
        console.log('提示词保存成功');
        
        await loadUserPrompts();
        showView('mainView');
        
    } catch (error) {
        console.error('保存提示词失败:', error);
        alert('保存失败，请稍后再试。');
    }
    
    forceHideLoading();
}

async function deletePrompt(promptId) {
    const isConfirmed = confirm('您确定要删除这个提示词吗？此操作无法撤销。');
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
            alert('未找到要删除的提示词');
        } else {
            // 保存更新后的数据
            localStorage.setItem('promptcraft_prompts', JSON.stringify(filteredPrompts));
            console.log('提示词删除成功:', promptId);
            await loadUserPrompts();
        }
        
    } catch (error) {
        console.error('删除失败:', error);
        alert('删除失败，请稍后再试。');
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


// --- 事件监听器设置 ---

function addCardEventListeners() {
    document.querySelectorAll('.edit-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = e.currentTarget.dataset.id;
            const prompt = allPrompts.find(p => p.id == id);
            if (prompt) {
                promptIdInput.value = prompt.id;
                promptTitleInput.value = prompt.title;
                promptContentInput.value = prompt.content;
                promptCategoryInput.value = prompt.category;
                formTitle.textContent = '编辑提示词';
                showView('formView');
            }
        });
    });

    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = e.currentTarget.dataset.id;
            deletePrompt(id);
        });
    });

    document.querySelectorAll('.copy-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
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
    
    themeToggle.addEventListener('click', () => {
        document.body.classList.toggle('dark-mode');
        const icon = themeToggle.querySelector('i');
        const isDark = document.body.classList.contains('dark-mode');
        icon.className = isDark ? 'fas fa-sun' : 'fas fa-moon';
        chrome.storage.local.set({ theme: isDark ? 'dark' : 'light' });
    });
    
    addPromptBtn.addEventListener('click', () => {
        promptIdInput.value = '';
        promptTitleInput.value = '';
        promptContentInput.value = '';
        promptCategoryInput.value = '';
        formTitle.textContent = '添加新提示词';
        showView('formView');
    });

    searchInput.addEventListener('input', (e) => handleSearch(e.target.value));
    
    backToListBtn.addEventListener('click', () => showView('mainView'));
    cancelFormBtn.addEventListener('click', () => showView('mainView'));
    savePromptBtn.addEventListener('click', savePrompt);
    
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.type === 'ADD_FROM_CONTEXT_MENU' && message.data?.content) {
            if (currentUser) {
                addPromptBtn.click(); 
                promptContentInput.value = message.data.content;
                sendResponse({ status: "success", message: "Content received." });
            } else {
                 sendResponse({ status: "error", message: "User not logged in." });
            }
        }
        return true; 
    });
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
        const { theme } = await chrome.storage.local.get('theme');
        if (theme === 'dark') {
            document.body.classList.add('dark-mode');
            themeToggle.querySelector('i').className = 'fas fa-sun';
        }

        setupEventListeners();
        
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

