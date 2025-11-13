// PromptCraft In-Page Quick Invoke Content Script
// PromptCraft In-Page Quick Invoke - 页面内快速调用功能
// 实现智能输入区域识别、精确触发检测和完整的UI生命周期管理

(function () {
    'use strict';

    // 防止重复注入 - 增强版初始化保护
    if (window.promptCraftInitialized) {
        console.log('PromptCraft: Already initialized, skipping...');
        return;
    }
    window.promptCraftInitialized = true;
    
    // 向后兼容的标记
    window.promptCraftInjected = true;

    // 注入CSS样式 - 现代化命令面板风格
    function injectStyles() {
        if (document.getElementById('promptcraft-quick-invoke-styles')) {
            return; // 样式已存在
        }

        const style = document.createElement('style');
        style.id = 'promptcraft-quick-invoke-styles';
        // 在iFrame中确保样式优先级
        style.setAttribute('data-promptcraft', 'true');
        
        // 获取并应用主题
        applyThemeToStyles(style);
        style.textContent = `
/* =================================================================== */
/* == PromptCraft UI - 最终优化版CSS（解决优先级、布局和颜色问题） == */
/* =================================================================== */

/* 使用高优先级选择器确保样式在任何网站(包括iFrame)中都能生效 */
html body #promptcraft-quick-invoke-container,
html body #promptcraft-quick-invoke-container * {
    box-sizing: border-box !important;
}
html body #promptcraft-quick-invoke-container {
    /* --- 颜色变量定义 --- */
    --primary-color: #6366f1;
    --primary-light: #818cf8;
    --primary-dark: #4f46e5;
    --background-light: #ffffff;
    --background-dark: #1f2937; /* 更深邃的暗色背景 */
    --text-light: #111827;
    --text-dark: #f9fafb;
    --text-secondary-light: #6b7280;
    --text-secondary-dark: #9ca3af;
    --card-light: #f9fafb;
    --card-dark: #374151; /* 卡片使用稍亮的暗色 */
    --border-light: #e5e7eb;
    --border-dark: #4b5563;
    --hover-light: #f3f4f6;
    --hover-dark: #374151;
    --selected-light: #eef2ff; /* 浅色模式选中色 - 淡靛蓝 */
    --selected-dark: var(--primary-color); /* 深色模式选中色 - 统一使用主色调 */
    --shadow-light: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
    --shadow-dark: 0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 10px 10px -5px rgba(0, 0, 0, 0.1);
    --transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    --backdrop-blur: blur(12px);

    /* --- 基础布局 --- */
    all: initial; /* CSS Reset: 隔离外部样式影响 */
    * { all: revert; } /* 恢复子元素的默认样式 */

    position: fixed; /* 使用fixed定位实现屏幕居中 */
    width: 640px;
    max-width: calc(100vw - 40px);
    max-height: 80vh;
    background: rgba(255, 255, 255, 0.85);
    backdrop-filter: var(--backdrop-blur);
    -webkit-backdrop-filter: var(--backdrop-blur);
    border: 1px solid var(--border-light);
    border-radius: 16px;
    box-shadow: var(--shadow-light);
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
    font-size: 14px;
    color: var(--text-light);
    z-index: 2147483647;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    animation: promptcraft-slideIn 0.25s ease-out;
    padding: 0 12px; /* 设置主容器的左右内边距为12px */
}

/* 深色模式总容器 - 通过data-theme属性控制 */
html body #promptcraft-quick-invoke-container[data-theme="dark"] {
    background: rgba(31, 41, 55, 0.85);
    border-color: var(--border-dark);
    color: var(--text-dark);
    box-shadow: var(--shadow-dark);
}

/* 动画 */
@keyframes promptcraft-slideIn { from { opacity: 0; transform: translate(-50%, -48%) scale(0.98); } to { opacity: 1; transform: translate(-50%, -50%) scale(1); } }

/* 搜索和分类区域的通用内边距 */
html body #promptcraft-quick-invoke-container .promptcraft-search-container,
html body #promptcraft-quick-invoke-container .promptcraft-category-filter {
    padding: 16px 0; /* 移除左右内边距，只保留上下内边距 */
    border-bottom: 1px solid var(--border-light);
    background: transparent;
    flex-shrink: 0;
}
html body #promptcraft-quick-invoke-container[data-theme="dark"] .promptcraft-search-container,
html body #promptcraft-quick-invoke-container[data-theme="dark"] .promptcraft-category-filter {
    border-bottom-color: var(--border-dark);
}

/* 搜索输入框 */
html body #promptcraft-quick-invoke-container .promptcraft-search-input {
    width: 100%;
    padding: 12px 16px;
    border: 1px solid var(--border-light);
    border-radius: 10px;
    background: var(--background-light);
    color: var(--text-light);
    font-size: 16px;
    outline: none;
    box-shadow: none;
}
html body #promptcraft-quick-invoke-container[data-theme="dark"] .promptcraft-search-input {
    background: var(--card-dark);
    border-color: var(--border-dark);
    color: var(--text-dark);
}

/* 分类标签 */
html body #promptcraft-quick-invoke-container .promptcraft-category-tab {
    padding: 6px 12px;
    border-radius: 8px;
    background: var(--card-light);
    border: 1px solid var(--border-light);
    color: var(--text-secondary-light);
    cursor: pointer;
    transition: var(--transition);
}
html body #promptcraft-quick-invoke-container .promptcraft-category-tab.active {
    background: var(--primary-color);
    color: white;
    border-color: var(--primary-color);
    font-weight: 600;
}
html body #promptcraft-quick-invoke-container[data-theme="dark"] .promptcraft-category-tab {
    background: var(--card-dark);
    border-color: var(--border-dark);
    color: #ffffff;
}
html body #promptcraft-quick-invoke-container[data-theme="dark"] .promptcraft-category-tab.active {
    background: var(--primary-light);
    color: var(--background-dark);
    border-color: var(--primary-light);
}

/* --- 核心修复：列表布局问题 --- */
html body #promptcraft-quick-invoke-container .promptcraft-prompt-list {
    flex-grow: 1; /* 让列表区域占据剩余空间 */
    overflow-y: auto;
    padding: 8px 0; /* 移除左右内边距，只保留上下内边距 */
    scroll-behavior: smooth;
}

/* --- 核心修复：提示词卡片布局与颜色 --- */
html body #promptcraft-quick-invoke-container .promptcraft-prompt-item {
    display: block;
    padding: 12px 16px;
    margin: 0 0 6px 0; /* 修正：移除水平margin */
    border-radius: 10px;
    cursor: pointer;
    border: 1px solid transparent;
    transition: var(--transition);
}

/* --- 核心修复：统一选中/悬停状态 --- */

/* 浅色模式 */
html body #promptcraft-quick-invoke-container .promptcraft-prompt-item:hover {
    background-color: var(--hover-light);
}
html body #promptcraft-quick-invoke-container .promptcraft-prompt-item.selected {
    background-color: var(--selected-light);
    border-color: var(--primary-color);
}
html body #promptcraft-quick-invoke-container .promptcraft-prompt-item.selected .promptcraft-prompt-title {
    color: var(--primary-dark);
}

/* 深色模式 - 通过data-theme属性控制 */
html body #promptcraft-quick-invoke-container[data-theme="dark"] .promptcraft-prompt-item:hover {
    background-color: var(--hover-dark);
}
html body #promptcraft-quick-invoke-container[data-theme="dark"] .promptcraft-prompt-item.selected {
    background-color: var(--selected-dark);
    border-color: var(--primary-light);
}
html body #promptcraft-quick-invoke-container[data-theme="dark"] .promptcraft-prompt-item.selected .promptcraft-prompt-title,
html body #promptcraft-quick-invoke-container[data-theme="dark"] .promptcraft-prompt-item.selected .promptcraft-prompt-preview,
html body #promptcraft-quick-invoke-container[data-theme="dark"] .promptcraft-prompt-item.selected .promptcraft-prompt-meta .tag,
html body #promptcraft-quick-invoke-container[data-theme="dark"] .promptcraft-prompt-item.selected .promptcraft-prompt-meta .author {
    color: white;
}
html body #promptcraft-quick-invoke-container[data-theme="dark"] .promptcraft-prompt-item.selected .promptcraft-prompt-meta .tag {
    background-color: rgba(255,255,255,0.1);
    border-color: rgba(255,255,255,0.2);
}

/* 卡片内部元素样式 */
html body #promptcraft-quick-invoke-container .promptcraft-prompt-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; }
html body #promptcraft-quick-invoke-container .promptcraft-prompt-title { font-weight: 600; font-size: 14px; flex-grow: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
html body #promptcraft-quick-invoke-container .promptcraft-prompt-preview { font-size: 13px; color: var(--text-secondary-light); line-height: 1.5; max-height: 40px; overflow: hidden; }

/* 标签和作者元信息容器 */
html body #promptcraft-quick-invoke-container .promptcraft-prompt-meta { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }

/* 标签样式 */
html body #promptcraft-quick-invoke-container .promptcraft-prompt-meta .tag { 
    font-size: 11px; 
    padding: 2px 8px; 
    border-radius: 10px; 
    background-color: var(--card-light); 
    border: 1px solid var(--border-light);
    color: var(--text-primary-light);
}

/* 作者样式 */
html body #promptcraft-quick-invoke-container .promptcraft-prompt-meta .author { 
    font-size: 11px; 
    color: var(--text-secondary-light);
    font-style: italic;
}

/* 暗色主题 */
html body #promptcraft-quick-invoke-container[data-theme="dark"] .promptcraft-prompt-preview { color: var(--text-secondary-dark); }
html body #promptcraft-quick-invoke-container[data-theme="dark"] .promptcraft-prompt-meta .tag { 
    background-color: var(--card-dark); 
    border-color: var(--border-dark);
    color: var(--text-primary-dark);
}

/* 标签颜色样式 - 明亮模式 */
html body #promptcraft-quick-invoke-container .promptcraft-prompt-meta .tag.tag-blue { background-color: rgba(59, 130, 246, 0.1); color: #3b82f6; border-color: rgba(59, 130, 246, 0.3); }
html body #promptcraft-quick-invoke-container .promptcraft-prompt-meta .tag.tag-green { background-color: rgba(34, 197, 94, 0.1); color: #22c55e; border-color: rgba(34, 197, 94, 0.3); }
html body #promptcraft-quick-invoke-container .promptcraft-prompt-meta .tag.tag-purple { background-color: rgba(147, 51, 234, 0.1); color: #9333ea; border-color: rgba(147, 51, 234, 0.3); }
html body #promptcraft-quick-invoke-container .promptcraft-prompt-meta .tag.tag-orange { background-color: rgba(249, 115, 22, 0.1); color: #f97316; border-color: rgba(249, 115, 22, 0.3); }
html body #promptcraft-quick-invoke-container .promptcraft-prompt-meta .tag.tag-pink { background-color: rgba(236, 72, 153, 0.1); color: #ec4899; border-color: rgba(236, 72, 153, 0.3); }
html body #promptcraft-quick-invoke-container .promptcraft-prompt-meta .tag.tag-indigo { background-color: rgba(99, 102, 241, 0.1); color: #6366f1; border-color: rgba(99, 102, 241, 0.3); }
html body #promptcraft-quick-invoke-container .promptcraft-prompt-meta .tag.tag-red { background-color: rgba(239, 68, 68, 0.1); color: #ef4444; border-color: rgba(239, 68, 68, 0.3); }
html body #promptcraft-quick-invoke-container .promptcraft-prompt-meta .tag.tag-yellow { background-color: rgba(245, 158, 11, 0.1); color: #f59e0b; border-color: rgba(245, 158, 11, 0.3); }
html body #promptcraft-quick-invoke-container .promptcraft-prompt-meta .tag.tag-teal { background-color: rgba(20, 184, 166, 0.1); color: #14b8a6; border-color: rgba(20, 184, 166, 0.3); }
html body #promptcraft-quick-invoke-container .promptcraft-prompt-meta .tag.tag-gray { background-color: rgba(107, 114, 128, 0.1); color: #6b7280; border-color: rgba(107, 114, 128, 0.3); }

/* 标签颜色样式 - 暗色模式 */
html body #promptcraft-quick-invoke-container[data-theme="dark"] .promptcraft-prompt-meta .tag.tag-blue { background-color: rgba(59, 130, 246, 0.2); color: #60a5fa; border-color: rgba(59, 130, 246, 0.4); }
html body #promptcraft-quick-invoke-container[data-theme="dark"] .promptcraft-prompt-meta .tag.tag-green { background-color: rgba(34, 197, 94, 0.2); color: #4ade80; border-color: rgba(34, 197, 94, 0.4); }
html body #promptcraft-quick-invoke-container[data-theme="dark"] .promptcraft-prompt-meta .tag.tag-purple { background-color: rgba(147, 51, 234, 0.2); color: #a855f7; border-color: rgba(147, 51, 234, 0.4); }
html body #promptcraft-quick-invoke-container[data-theme="dark"] .promptcraft-prompt-meta .tag.tag-orange { background-color: rgba(249, 115, 22, 0.2); color: #fb923c; border-color: rgba(249, 115, 22, 0.4); }
html body #promptcraft-quick-invoke-container[data-theme="dark"] .promptcraft-prompt-meta .tag.tag-pink { background-color: rgba(236, 72, 153, 0.2); color: #f472b6; border-color: rgba(236, 72, 153, 0.4); }
html body #promptcraft-quick-invoke-container[data-theme="dark"] .promptcraft-prompt-meta .tag.tag-indigo { background-color: rgba(99, 102, 241, 0.2); color: #818cf8; border-color: rgba(99, 102, 241, 0.4); }
html body #promptcraft-quick-invoke-container[data-theme="dark"] .promptcraft-prompt-meta .tag.tag-red { background-color: rgba(239, 68, 68, 0.2); color: #f87171; border-color: rgba(239, 68, 68, 0.4); }
html body #promptcraft-quick-invoke-container[data-theme="dark"] .promptcraft-prompt-meta .tag.tag-yellow { background-color: rgba(245, 158, 11, 0.2); color: #fbbf24; border-color: rgba(245, 158, 11, 0.4); }
html body #promptcraft-quick-invoke-container[data-theme="dark"] .promptcraft-prompt-meta .tag.tag-teal { background-color: rgba(20, 184, 166, 0.2); color: #2dd4bf; border-color: rgba(20, 184, 166, 0.4); }
html body #promptcraft-quick-invoke-container[data-theme="dark"] .promptcraft-prompt-meta .tag.tag-gray { background-color: rgba(107, 114, 128, 0.2); color: #9ca3af; border-color: rgba(107, 114, 128, 0.4); }

/* 分类标签颜色样式 - 明亮模式 */
html body #promptcraft-quick-invoke-container .category-tab-blue {
    background-color: #dbeafe;
    color: #1e40af;
    border-color: #93c5fd;
}
html body #promptcraft-quick-invoke-container .category-tab-green {
    background-color: #dcfce7;
    color: #166534;
    border-color: #86efac;
}
html body #promptcraft-quick-invoke-container .category-tab-purple {
    background-color: #f3e8ff;
    color: #7c3aed;
    border-color: #c4b5fd;
}
html body #promptcraft-quick-invoke-container .category-tab-orange {
    background-color: #fed7aa;
    color: #ea580c;
    border-color: #fdba74;
}
html body #promptcraft-quick-invoke-container .category-tab-pink {
    background-color: #fce7f3;
    color: #be185d;
    border-color: #f9a8d4;
}
html body #promptcraft-quick-invoke-container .category-tab-indigo {
    background-color: #e0e7ff;
    color: #4338ca;
    border-color: #a5b4fc;
}
html body #promptcraft-quick-invoke-container .category-tab-red {
    background-color: #fee2e2;
    color: #dc2626;
    border-color: #fca5a5;
}
html body #promptcraft-quick-invoke-container .category-tab-yellow {
    background-color: #fef3c7;
    color: #d97706;
    border-color: #fcd34d;
}
html body #promptcraft-quick-invoke-container .category-tab-teal {
    background-color: #ccfbf1;
    color: #0f766e;
    border-color: #5eead4;
}
html body #promptcraft-quick-invoke-container .category-tab-gray {
    background-color: #f3f4f6;
    color: #374151;
    border-color: #d1d5db;
}

/* 分类标签颜色样式 - 暗色模式 */
html body #promptcraft-quick-invoke-container[data-theme="dark"] .category-tab-blue {
    background-color: #1e3a8a;
    color: #93c5fd;
    border-color: #3b82f6;
}
html body #promptcraft-quick-invoke-container[data-theme="dark"] .category-tab-green {
    background-color: #14532d;
    color: #86efac;
    border-color: #22c55e;
}
html body #promptcraft-quick-invoke-container[data-theme="dark"] .category-tab-purple {
    background-color: #581c87;
    color: #c4b5fd;
    border-color: #8b5cf6;
}
html body #promptcraft-quick-invoke-container[data-theme="dark"] .category-tab-orange {
    background-color: #9a3412;
    color: #fdba74;
    border-color: #f97316;
}
html body #promptcraft-quick-invoke-container[data-theme="dark"] .category-tab-pink {
    background-color: #831843;
    color: #f9a8d4;
    border-color: #ec4899;
}
html body #promptcraft-quick-invoke-container[data-theme="dark"] .category-tab-indigo {
    background-color: #312e81;
    color: #a5b4fc;
    border-color: #6366f1;
}
html body #promptcraft-quick-invoke-container[data-theme="dark"] .category-tab-red {
    background-color: #991b1b;
    color: #fca5a5;
    border-color: #ef4444;
}
html body #promptcraft-quick-invoke-container[data-theme="dark"] .category-tab-yellow {
    background-color: #92400e;
    color: #fcd34d;
    border-color: #f59e0b;
}
html body #promptcraft-quick-invoke-container[data-theme="dark"] .category-tab-teal {
    background-color: #134e4a;
    color: #5eead4;
    border-color: #14b8a6;
}
html body #promptcraft-quick-invoke-container[data-theme="dark"] .category-tab-gray {
    background-color: #374151;
    color: #d1d5db;
    border-color: #6b7280;
}

html body #promptcraft-quick-invoke-container[data-theme="dark"] .promptcraft-prompt-meta .author { 
    color: var(--text-secondary-dark);
}

/* 底部帮助文本 */
html body #promptcraft-quick-invoke-container .promptcraft-help-text {
    padding: 12px;
    text-align: center;
    font-size: 12px;
    color: var(--text-secondary-light);
    border-top: 1px solid var(--border-light);
    flex-shrink: 0;
}
html body #promptcraft-quick-invoke-container[data-theme="dark"] .promptcraft-help-text {
    color: var(--text-secondary-dark);
    border-top-color: var(--border-dark);
}
/* ... 其他帮助文本样式 ... */
html body #promptcraft-quick-invoke-container .promptcraft-help-keys { display: inline-block; padding: 1px 5px; border-radius: 4px; background: rgba(0,0,0,0.05); border: 1px solid rgba(0,0,0,0.1); }
html body #promptcraft-quick-invoke-container[data-theme="dark"] .promptcraft-help-keys { background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); }
`;

        document.head.appendChild(style);

        // 为iFrame环境添加额外的滚动条隐藏样式
        if (window.self !== window.top) {
            try {
                // 在iFrame中，添加更高优先级的滚动条隐藏规则
                if (style.sheet) {
                    style.sheet.insertRule(`
                        html body #promptcraft-quick-invoke-container .promptcraft-prompt-list::-webkit-scrollbar {
                            width: 6px;
                        }
                    `, 0);

                    style.sheet.insertRule(`
                        html body #promptcraft-quick-invoke-container .promptcraft-prompt-list::-webkit-scrollbar-track {
                            background: transparent;
                        }
                    `, 0);

                    style.sheet.insertRule(`
                        html body #promptcraft-quick-invoke-container .promptcraft-prompt-list::-webkit-scrollbar-thumb {
                            background: var(--primary-color);
                            border-radius: 3px;
                        }
                    `, 0);

                    style.sheet.insertRule(`
                        html body #promptcraft-quick-invoke-container[data-theme="dark"] .promptcraft-prompt-list::-webkit-scrollbar-thumb {
                            background: var(--primary-light);
                        }
                    `, 0);
                }
            } catch (e) {
                console.warn('PromptCraft: Failed to add iframe-specific styles:', e);
            }
        }
    }

    // 全局状态管理
    const state = {
        isActive: false,
        isUIVisible: false,
        currentInput: null,
        originalInput: null, // 保存原始触发的输入元素
        lockedTargetInput: null, // 锁定的目标输入框，防止目标丢失
        uiContainer: null,
        prompts: [],
        filteredPrompts: [],
        selectedIndex: 0,
        lastInputValue: '',
        triggerPosition: -1,
        debounceTimer: null,
        isInitialized: false,
        selectedCategory: 'all', // 当前选中的分类
        searchTerm: '', // 当前搜索词
        isInserting: false // 标志位，防止插入时的事件干扰
    };

    // 常量定义
    const CONSTANTS = {
        TRIGGER_COMMAND: 'pp',
        UI_CONTAINER_ID: 'promptcraft-quick-invoke-container',
        DEBOUNCE_DELAY: 100,
        POSITION_OFFSET: 5
    };

    // 初始化系统
    function init() {


        // 特别检测大模型网站
        const aiSites = ['kimi.moonshot.cn', 'gemini.google.com', 'doubao.com', 'chatgpt.com', 'claude.ai'];
        const currentSite = window.location.hostname;
        const isAISite = aiSites.some(site => currentSite.includes(site));



        // 检测CSP限制
        const metaTags = document.querySelectorAll('meta[http-equiv="Content-Security-Policy"]');
        if (metaTags.length > 0) {

        }

        injectStyles(); // 注入CSS样式
        loadPrompts();
        setupEventListeners();
        setupCleanupHandlers();
        setupStorageChangeListener();

        // 设置心跳检查，每30秒确认扩展运行状态
        setInterval(() => {
            // 心跳检查
        }, 30000);

        // 初始化完成
        setTimeout(() => {
            // 扩展准备就绪
        }, 1000);
    }

    // 获取空的提示词数据（移除硬编码测试数据）
    function getEmptyPrompts() {
        return [];
    }

    // 数据加载完成后更新UI
    function updateUIAfterPromptsLoad() {


        // 如果当前有显示的UI，需要重新渲染
        const existingContainer = document.getElementById(CONSTANTS.UI_CONTAINER_ID);
        if (existingContainer && state.currentInput) {
            // 重新应用筛选和更新列表
            applyFilters();
            updatePromptList();
            // 重新初始化分类标签
            initializeCategoryTabs();
        }
    }

    // 从内存(chrome.storage)加载提示词数据
    // 防止重复加载的时间戳和标记
    let lastLoadTime = 0;
    let isLoading = false;
    const LOAD_DEBOUNCE_TIME = 1000; // 1秒内不重复加载
    
    function loadPrompts() {
        const now = Date.now();
        
        // 防止短时间内重复调用
        if (isLoading || (now - lastLoadTime < LOAD_DEBOUNCE_TIME)) {
    
            return;
        }
        
        isLoading = true;
        lastLoadTime = now;
    
        
        try {
            // 检查是否在扩展环境中
            if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
                // 从background script获取内存中的提示词数据
                chrome.runtime.sendMessage({ action: 'getPrompts' }, (response) => {
                    console.log('PromptCraft: Received response from background:', response);

                    if (chrome.runtime.lastError) {
                        const errorMsg = chrome.runtime.lastError.message || chrome.runtime.lastError.toString();
                        console.warn('PromptCraft: Failed to load prompts from memory:', errorMsg);
                        showErrorMessage(`无法连接到扩展后台服务: ${errorMsg}`);
                        state.prompts = getEmptyPrompts();
        
                        updateUIAfterPromptsLoad();
                        isLoading = false; // 重置加载状态
                        return;
                    }

                    if (response && response.loadError) {
                        // 显示加载错误信息
                        console.error('PromptCraft: Load error detected:', response.errorMessage);
                        showErrorMessage(response.errorMessage || '加载默认提示词失败');
                        state.prompts = getEmptyPrompts();
        
                    } else if (response && response.prompts && response.prompts.length > 0) {
                        console.log('PromptCraft: Setting prompts:', response.prompts.length, 'items');
                        state.prompts = response.prompts;


                    } else {
                        // 如果内存中没有数据，显示空列表
                        console.log('PromptCraft: No prompts data, using empty array');
                        state.prompts = getEmptyPrompts();


                    }
                    console.log('PromptCraft: Final state.prompts length:', state.prompts.length);
                    updateUIAfterPromptsLoad();
                    isLoading = false; // 重置加载状态
                });
            } else {
                // 非扩展环境，显示空列表

                state.prompts = getEmptyPrompts();

                updateUIAfterPromptsLoad();
                isLoading = false; // 重置加载状态
            }
        } catch (error) {
            console.warn('PromptCraft: Error loading prompts:', error);
            state.prompts = getEmptyPrompts();

            updateUIAfterPromptsLoad();
            isLoading = false; // 重置加载状态
        }
    }

    // 设置事件监听器
    function setupEventListeners() {
    

        // 使用捕获阶段监听，确保能够优先处理
        document.addEventListener('input', handleInputEvent, true);
        document.addEventListener('keydown', handleKeydownEvent, true);
        document.addEventListener('click', handleClickEvent, true);
        document.addEventListener('focus', handleFocusEvent, true);
        document.addEventListener('blur', handleBlurEvent, true);

        // 设置MutationObserver监控动态加载的输入框
        setupDOMObserver();

        // 初始扫描现有的输入框
        scanAndBindInputElements(document.body);

        // 监听来自background的消息
        if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
            chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
                // 监听数据变更通知，保持与数据服务的消息类型一致
                if (message.type === 'DATA_CHANGED') {
        
                    loadPrompts();
                }
            });
        }

    
    }

    // 设置存储变化监听器
    function setupStorageChangeListener() {
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.onChanged) {
            chrome.storage.onChanged.addListener((changes, namespace) => {
                if (namespace === 'local' && changes.prompts) {
                    // 当数据变化时，重新从background获取最新数据，确保数据一致性
                    console.log('PromptCraft: Detected prompts data change, reloading...');
                    loadPrompts();
                }
            });
        
        } else {
            console.warn('PromptCraft: Chrome storage API not available for change listener');
        }
    }

    // 设置DOM观察器 - 处理动态加载的输入框（优化版本）
    function setupDOMObserver() {
        if (!window.MutationObserver) {
            console.warn('PromptCraft: MutationObserver not supported');
            return;
        }

        // 防抖动处理，避免频繁触发
        let observerTimer = null;
        const OBSERVER_DEBOUNCE_DELAY = 200; // 200ms防抖

        const observer = new MutationObserver((mutations) => {
            // 清除之前的定时器
            clearTimeout(observerTimer);
            
            // 使用防抖动处理突发的DOM变化
            observerTimer = setTimeout(() => {
                const nodesToProcess = new Set();
                
                mutations.forEach((mutation) => {
                    if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                        mutation.addedNodes.forEach((node) => {
                            if (node.nodeType === Node.ELEMENT_NODE) {
                                // 只处理可能包含输入框的节点
                                if (couldContainInputElements(node)) {
                                    nodesToProcess.add(node);
                                }
                            }
                        });
                    }
                });

                // 批量处理收集到的节点
                nodesToProcess.forEach((node) => {
                    scanAndBindInputElements(node);
                });
            }, OBSERVER_DEBOUNCE_DELAY);
        });

        // 优化观察配置，减少不必要的监听
        const observerConfig = {
            childList: true,
            subtree: true,
            // 不监听属性变化，只关注节点添加
            attributes: false,
            characterData: false
        };

        // 监控整个document.body的DOM变化
        observer.observe(document.body, observerConfig);

        // 存储observer引用以便后续清理
        window.promptCraftObserver = observer;
    }

    // 检查节点是否可能包含输入元素（性能优化）
    function couldContainInputElements(node) {
        if (!node || !node.tagName) return false;
        
        const tagName = node.tagName.toLowerCase();
        
        // 直接是输入元素
        if (tagName === 'textarea' || tagName === 'input') {
            return true;
        }
        
        // 是contenteditable元素
        if (node.contentEditable === 'true') {
            return true;
        }
        
        // 是可能包含输入元素的容器
        const containerTags = ['div', 'form', 'section', 'article', 'main', 'aside', 'nav'];
        if (containerTags.includes(tagName)) {
            return true;
        }
        
        // 对于复杂的单页应用，检查是否有特定的类名或属性
        const className = node.className || '';
        const hasInputRelatedClass = /input|text|edit|form|chat|message|prompt/i.test(className);
        
        return hasInputRelatedClass;
    }

    // 扫描并绑定输入元素 - 递归检查所有子节点
    function scanAndBindInputElements(rootElement) {
        if (!rootElement || rootElement.nodeType !== Node.ELEMENT_NODE) {
            return;
        }

        // 检查根元素本身
        if (isEditableElement(rootElement)) {
            bindInputElement(rootElement);
        }

        // 递归检查所有子元素
        const allElements = rootElement.querySelectorAll('textarea, input[type="text"], [contenteditable="true"]');
        allElements.forEach((element) => {
            if (isEditableElement(element)) {
                bindInputElement(element);
            }
        });
    }

    // 为输入元素绑定事件监听器
    function bindInputElement(element) {
        // 避免重复绑定
        if (element.dataset.promptcraftBound) {
            return;
        }

        element.dataset.promptcraftBound = 'true';
        
    }

    // 设置清理处理器
    function setupCleanupHandlers() {
        // 页面卸载时清理
        window.addEventListener('beforeunload', cleanup);
        // 页面隐藏时清理
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                hideQuickInvokeUI();
            }
        });
    }

    // 处理输入事件 - 使用防抖动优化性能
    let inputDebounceTimer = null;
    function handleInputEvent(event) {


        const target = event.target;



        // 如果正在插入提示词，跳过处理以防止干扰
        if (state.isInserting) {

            return;
        }

        // 检查是否是可编辑的输入框
        if (!isEditableElement(target)) {

            return;
        }



        // 更新当前输入元素
        state.currentInput = target;

        // 使用防抖动处理输入，避免频繁处理
        clearTimeout(inputDebounceTimer);
        inputDebounceTimer = setTimeout(() => {
            processInputChange(target);
        }, CONSTANTS.DEBOUNCE_DELAY);
    }

    // 处理输入变化
    function processInputChange(inputElement) {
        if (!inputElement) {

            return;
        }

        const text = getElementText(inputElement);
        state.lastInputValue = text;



        if (state.isUIVisible) {

            // 如果UI已激活，更新搜索
            updateSearch(text);
            return;
        }

        // 检查是否输入了触发词
        const triggerIndex = text.lastIndexOf(CONSTANTS.TRIGGER_COMMAND);

        if (triggerIndex === -1) {
            return;
        }

        // 检查触发词是否是单词边界或行首
        const charBefore = triggerIndex > 0 ? text.charAt(triggerIndex - 1) : '';
        const charAfter = triggerIndex + CONSTANTS.TRIGGER_COMMAND.length < text.length ? text.charAt(triggerIndex + CONSTANTS.TRIGGER_COMMAND.length) : '';
        const isAtWordBoundary = triggerIndex === 0 || !isAlphaNumeric(charBefore);
        const isFollowedBySpace = triggerIndex + CONSTANTS.TRIGGER_COMMAND.length === text.length || charAfter === ' ';


        // Trigger analysis debug info removed

        // 只有当触发词在单词边界且后面是空格或文本结束时才触发
        if (isAtWordBoundary && isFollowedBySpace) {
            // 检查PP命令开关是否启用
            checkPpCommandEnabled((isEnabled) => {
                if (isEnabled) {
                    // 锁定目标输入框 - 防止目标丢失
                    state.lockedTargetInput = inputElement;
                    state.triggerPosition = triggerIndex;

                    // 保存原始输入框引用（向后兼容）
                    if (!state.originalInput) {
                        state.originalInput = inputElement;
                    }

                    showQuickInvokeUI();
                } else {
                    // PP命令开关未启用，不显示UI
                    console.log('PromptCraft: PP command is disabled, ignoring trigger');
                }
            });
        }
    }

    // 工具函数
    function isAlphaNumeric(char) {
        return /[a-zA-Z0-9]/.test(char);
    }



    // 处理键盘事件
    function handleKeydownEvent(event) {

        // Key event debug info removed

        // 如果UI未激活，不处理
        if (!state.isUIVisible) {

            return;
        }

        // 确保事件来自正确的上下文
        const target = event.target;
        const isInQuickInvokeUI = target.closest('#promptcraft-quick-invoke-container');
        const isCurrentInput = target === state.currentInput;

        // 只处理来自Quick Invoke UI或当前输入框的键盘事件
        if (!isInQuickInvokeUI && !isCurrentInput) {
            return;
        }

        const searchInput = state.uiContainer?.querySelector('.promptcraft-search-input');
        const isSearchFocused = document.activeElement === searchInput;

        switch (event.key) {
            case 'Escape':
                hideQuickInvokeUI();
                event.preventDefault();
                event.stopPropagation();
                break;

            case 'ArrowUp':
                state.selectedIndex = Math.max(0, state.selectedIndex - 1);
                updateSelection();
                event.preventDefault();
                event.stopPropagation();
                break;

            case 'ArrowDown':
                state.selectedIndex = Math.min(state.filteredPrompts.length - 1, state.selectedIndex + 1);
                updateSelection();
                event.preventDefault();
                event.stopPropagation();
                break;

            case 'ArrowLeft':
            case 'ArrowRight':
                if (isSearchFocused && event.target.selectionStart !== event.target.selectionEnd) {
                    // 如果在搜索框中有选中文本，允许正常的左右键行为
                    return;
                }
                if (isSearchFocused && ((event.key === 'ArrowLeft' && event.target.selectionStart === 0) ||
                    (event.key === 'ArrowRight' && event.target.selectionStart === event.target.value.length))) {
                    // 在搜索框边界时，切换分类
                    event.preventDefault();
                    event.stopPropagation();
                    switchCategory(event.key === 'ArrowRight' ? 1 : -1);
                }
                break;

            case 'Enter':
                // 只有在搜索框中或选中提示词时才处理Enter
                if (isInQuickInvokeUI || (isCurrentInput && state.filteredPrompts[state.selectedIndex])) {
                    if (state.filteredPrompts[state.selectedIndex]) {
                        insertPrompt(state.filteredPrompts[state.selectedIndex]);
                    }
                    event.preventDefault();
                    event.stopPropagation();
                }
                break;

            case 'Tab':
                if (isInQuickInvokeUI) {
                    // Tab键也可以选择当前项
                    if (state.filteredPrompts[state.selectedIndex]) {
                        insertPrompt(state.filteredPrompts[state.selectedIndex]);
                    }
                    event.preventDefault();
                    event.stopPropagation();
                }
                break;
        }
    }

    // 处理点击事件
    function handleClickEvent(event) {
        // 如果UI未激活，不处理
        if (!state.isUIVisible) return;

        // 检查点击是否在UI容器外
        if (state.uiContainer && !state.uiContainer.contains(event.target)) {
            hideQuickInvokeUI();
        }
    }

    // 处理焦点事件
    function handleFocusEvent(event) {
        const target = event.target;

        // 检查是否是可编辑的输入框
        if (isEditableElement(target)) {
            state.currentInput = target;
        }
    }

    // 处理失焦事件
    function handleBlurEvent(event) {
        // 如果失焦的是当前输入元素，且不是因为点击了UI
        if (state.isActive && event.target === state.currentInput) {
            // 使用setTimeout延迟处理，避免与点击UI冲突
            setTimeout(() => {
                // 检查新的活动元素是否在UI内
                const activeElement = document.activeElement;
                if (state.uiContainer && !state.uiContainer.contains(activeElement)) {
                    hideQuickInvokeUI();
                }
            }, 100);
        }
    }

    // 检查元素是否可编辑 - 重构版本：简洁、可靠、支持iFrame
    function isEditableElement(element) {
        if (!element) {
            return false;
        }

        const tagName = element.tagName.toLowerCase();

        // A. 标准HTML标签：<textarea> 和 <input type="text">
        if (tagName === 'textarea' || (tagName === 'input' && element.type === 'text')) {

            return true;
        }

        // B. 富文本编辑器模式：任何带有 contentEditable="true" 属性的元素
        // 使用 closest 方法兼容 contentEditable 属性在父元素上的情况
        const contentEditableElement = element.closest('[contenteditable="true"]');
        if (contentEditableElement) {

            return true;
        }

        // 直接检查当前元素的 contentEditable 属性
        if (element.isContentEditable) {

            return true;
        }

        return false;
    }

    // 获取元素文本内容
    function getElementText(element) {
        if (element.tagName.toLowerCase() === 'textarea' || element.tagName.toLowerCase() === 'input') {
            return element.value;
        } else if (element.contentEditable === 'true' || element.contentEditable === 'plaintext-only' || element.isContentEditable) {
            // 优先使用innerText，因为它更接近用户看到的文本
            return element.innerText || element.textContent || '';
        }
        return '';
    }

    // 设置元素文本内容 - 针对现代框架优化的版本
    function setElementText(element, text) {
    
    
    
    

        if (!element || text === undefined) {
            console.warn('PromptCraft: Invalid element or text for setElementText');
            return;
        }

        try {
            // 先聚焦元素
            element.focus();

            // 保存原始值用于比较
            const previousValue = element.value || '';
    

            if (element.tagName.toLowerCase() === 'textarea' || element.tagName.toLowerCase() === 'input') {

                // 使用原生设置器绕过React的值变更检查
                const descriptor = Object.getOwnPropertyDescriptor(element, 'value') ||
                    Object.getOwnPropertyDescriptor(Object.getPrototypeOf(element), 'value');

                if (descriptor && descriptor.set) {

                    // 使用原型链上的原生setter
                    const prototype = Object.getPrototypeOf(element);
                    const nativeSetter = Object.getOwnPropertyDescriptor(prototype, 'value').set;
                    if (nativeSetter) {
    
                        nativeSetter.call(element, text);
                    } else {
    
                        descriptor.set.call(element, text);
                    }
                } else {

                    // 后备方案：直接设置value
                    element.value = text;
                }

            } else if (element.contentEditable === 'true' || element.contentEditable === 'plaintext-only' || element.isContentEditable) {


                // 多种方法尝试设置contentEditable元素的内容
                let success = false;

                // 方法1: 使用现代Selection API
                try {
                    element.focus();
                    const selection = window.getSelection();

                    // 选择所有内容
                    const range = document.createRange();
                    range.selectNodeContents(element);
                    selection.removeAllRanges();
                    selection.addRange(range);

                    // 删除现有内容并插入新内容
                    if (document.execCommand) {
                        document.execCommand('selectAll', false, null);
                        document.execCommand('delete', false, null);
                        success = document.execCommand('insertText', false, text);
    
                    }
                } catch (e) {
                    console.warn('PromptCraft: execCommand method failed:', e);
                }

                // 方法2: 如果execCommand失败，使用现代API
                if (!success) {
                    try {
                        element.focus();
                        const selection = window.getSelection();
                        const range = document.createRange();
                        range.selectNodeContents(element);
                        selection.removeAllRanges();
                        selection.addRange(range);

                        // 使用现代API删除和插入
                        selection.deleteFromDocument();
                        const textNode = document.createTextNode(text);
                        range.insertNode(textNode);

                        // 将光标移到文本末尾
                        range.setStartAfter(textNode);
                        range.collapse(true);
                        selection.removeAllRanges();
                        selection.addRange(range);

                        success = true;
    
                    } catch (e) {
                        console.warn('PromptCraft: Modern Selection API failed:', e);
                    }
                }

                // 方法3: 直接设置内容（最后的后备方案）
                if (!success) {
                    try {
                        if (element.innerText !== undefined) {
                            element.innerText = text;
                        } else {
                            element.textContent = text;
                        }
    
                    } catch (e) {
                        console.warn('PromptCraft: Direct content assignment failed:', e);
                    }
                }
            } else {

                // 其他类型的元素
                element.value = text;
            }

            // 验证设置结果
            const newValue = getElementText(element);
    
    

            // 触发全面的事件以确保框架状态更新
            triggerComprehensiveEventSequence(element, previousValue, text);

        } catch (error) {
            console.warn('PromptCraft: Error in setElementText:', error);
            // 后备方案
            try {
                element.value = text;
                triggerComprehensiveEventSequence(element, '', text);
            } catch (fallbackError) {
                console.error('PromptCraft: Fallback setElementText also failed:', fallbackError);
            }
        }
    }

    // 显示快速调用UI
    function showQuickInvokeUI() {
        console.log('PromptCraft: 显示快速调用UI', {
            isUIVisible: state.isUIVisible,
            hasCurrentInput: !!state.currentInput,
            currentInputElement: state.currentInput ? {
                tagName: state.currentInput.tagName,
                id: state.currentInput.id,
                className: state.currentInput.className
            } : null,
            url: window.location.href,
            hostname: window.location.hostname
        });

        // 防止重复激活
        if (state.isUIVisible) {

            return;
        }

        // 检查是否有有效的输入元素
        if (!state.currentInput) {
            console.warn('PromptCraft: No valid input element found', {
                currentInput: state.currentInput,
                url: window.location.href
            });
            return;
        }

        // 记录UI显示的调试信息
        // promptsCount: state.prompts.length,
        // triggerPosition: state.triggerPosition

        // 保存原始输入元素，防止被搜索框覆盖
        state.originalInput = state.currentInput;

        // 记录原始输入元素信息
        // originalInputElement: state.originalInput ? {
        //     tagName: state.originalInput.tagName,
        //     id: state.originalInput.id,
        //     className: state.originalInput.className
        // } : null

        state.isActive = true;
        state.isUIVisible = true;
        state.filteredPrompts = [...state.prompts];
        state.selectedIndex = 0;
        state.selectedCategory = 'all';
        state.searchTerm = '';


        createQuickInvokeUI();
        positionUI();
        applyFilters();

        // 聚焦搜索框
        setTimeout(() => {
            const searchInput = state.uiContainer?.querySelector('.promptcraft-search-input');
            if (searchInput) {
        
                searchInput.focus();
            } else {
                console.warn('PromptCraft: Search input not found for focusing');
            }
        }, 10);


    }

    // 隐藏快速调用UI
    function hideQuickInvokeUI() {
        if (!state.isUIVisible) return;

        state.isUIVisible = false;
        state.isActive = false;

        // 清理输入元素引用和锁定状态
        state.originalInput = null;
        state.lockedTargetInput = null;

        // 移除UI容器
        if (state.uiContainer && state.uiContainer.parentNode) {
            state.uiContainer.parentNode.removeChild(state.uiContainer);
        }
        state.uiContainer = null;

        // 清理定时器
        if (state.debounceTimer) {
            clearTimeout(state.debounceTimer);
            state.debounceTimer = null;
        }

        // 重置状态
        state.selectedIndex = 0;
        state.selectedCategory = 'all';
        state.searchTerm = '';
        state.triggerPosition = -1;
        state.filteredPrompts = [];

    
    }

    // 创建快速调用UI
    function createQuickInvokeUI() {
        // 确保之前的UI已被清理
        const existingUI = document.getElementById(CONSTANTS.UI_CONTAINER_ID);
        if (existingUI) {
            existingUI.remove();
        }

        // 创建主容器
        state.uiContainer = document.createElement('div');
        state.uiContainer.id = CONSTANTS.UI_CONTAINER_ID;

        // 构建UI结构
        state.uiContainer.innerHTML = `
            <div class="promptcraft-search-container">
                <input type="text" class="promptcraft-search-input" placeholder="${i18n.t('search.placeholder')}" autocomplete="off" spellcheck="false" />
            </div>
            <div class="promptcraft-category-filter">
                <div class="promptcraft-category-tabs"></div>
            </div>
            <div class="promptcraft-prompt-list"></div>
            <div class="promptcraft-help-text">
                <div class="promptcraft-help-main">
                    <span class="promptcraft-help-keys">↑↓</span> ${i18n.t('quick.help.select')} • 
                    <span class="promptcraft-help-keys">Enter</span> ${i18n.t('quick.help.confirm')} • 
                    <span class="promptcraft-help-keys">Esc</span> ${i18n.t('quick.help.cancel')}
                </div>
                <div class="promptcraft-help-trigger">
                    ${i18n.t('quick.help.trigger')}
                </div>
            </div>
        `;

        // 添加到页面
        document.body.appendChild(state.uiContainer);

        // 立即设置位置，确保正确定位
        setTimeout(() => {
            positionUI();
        }, 0);

        // 初始化分类标签
        initializeCategoryTabs();

        // 设置搜索框事件
        const searchInput = state.uiContainer.querySelector('.promptcraft-search-input');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                state.searchTerm = e.target.value;
                applyFilters();
            });

            // 阻止搜索框的某些默认行为
            searchInput.addEventListener('keydown', (e) => {
                // 阻止搜索框内的方向键影响页面滚动
                if (['ArrowUp', 'ArrowDown', 'Enter', 'Tab'].includes(e.key)) {
                    e.stopPropagation();
                }
            });

            // 应用主题并设置监听器
            updateUITheme();
            setupThemeListener();

            // 自动聚焦搜索框
            setTimeout(() => {
                try {
                    searchInput.focus();
                } catch (error) {
                    console.warn('PromptCraft: Failed to focus search input:', error);
                }
            }, 50);
        }
    }

    // 智能定位UI - 现代化命令面板定位策略
    function positionUI() {
        if (!state.uiContainer || !state.currentInput) {
            return;
        }

        try {
            const inputRect = state.currentInput.getBoundingClientRect();
            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;
            const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
            const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;

            // 动态获取UI实际尺寸
            const uiRect = state.uiContainer.getBoundingClientRect();
            const uiWidth = uiRect.width || 640; // 使用实际宽度，回退到预估值
            const uiHeight = uiRect.height || 500; // 使用实际高度，回退到预估值

            // 判断输入框是否在视口下半部分
            const inputCenterY = inputRect.top + inputRect.height / 2;
            const isInputInLowerHalf = inputCenterY > viewportHeight / 2;

            let left, top, position;

            if (isInputInLowerHalf) {
                // 特殊策略：输入框在下半部分时，优先显示在输入框上方
    

                // 计算输入框上方的可用空间
                const spaceAboveInput = inputRect.top;
                const requiredHeight = uiHeight + 20; // 20px 缓冲区

                if (spaceAboveInput >= requiredHeight) {
                    // 上方有足够空间，显示在输入框上方
                    position = 'absolute';
                    left = inputRect.left + scrollLeft + (inputRect.width / 2) - (uiWidth / 2);
                    top = inputRect.top + scrollTop - uiHeight - 12; // 12px 间距

                    // 水平边界检查
                    if (left < 10) {
                        left = 10;
                    } else if (left + uiWidth > viewportWidth - 10) {
                        left = viewportWidth - uiWidth - 10;
                    }

                    // 垂直边界检查
                    if (top < scrollTop + 10) {
                        top = scrollTop + 10;
                    }
                } else {
                    // 上方空间不足，使用整体居中但避免遮挡输入框
                    position = 'fixed';
                    left = (viewportWidth - uiWidth) / 2;

                    // 计算一个不会遮挡输入框的垂直位置
                    const inputTopInViewport = inputRect.top;
                    const maxTopForClearance = inputTopInViewport - uiHeight - 20;
                    const centerTop = (viewportHeight - uiHeight) / 2;

                    if (centerTop <= maxTopForClearance) {
                        // 居中位置不会遮挡输入框
                        top = centerTop;
                    } else {
                        // 居中会遮挡，使用能保持间距的最低位置
                        top = Math.max(10, maxTopForClearance);
                    }

                    // 边界检查
                    if (left < 10) left = 10;
                    if (top < 10) top = 10;
                    if (left + uiWidth > viewportWidth - 10) {
                        left = viewportWidth - uiWidth - 10;
                    }
                    if (top + uiHeight > viewportHeight - 10) {
                        top = viewportHeight - uiHeight - 10;
                    }
                }

            } else {
                // 默认策略：固定定位，整体屏幕居中
    

                position = 'fixed';
                left = (viewportWidth - uiWidth) / 2;
                top = (viewportHeight - uiHeight) / 2;

                // 确保居中位置不会超出视口边界
                if (left < 10) left = 10;
                if (top < 10) top = 10;
                if (left + uiWidth > viewportWidth - 10) {
                    left = viewportWidth - uiWidth - 10;
                }
                if (top + uiHeight > viewportHeight - 10) {
                    top = viewportHeight - uiHeight - 10;
                }
            }

            // 清除可能的transform样式
            state.uiContainer.style.transform = '';

            // 应用位置样式
            state.uiContainer.style.position = position;
            state.uiContainer.style.left = left + 'px';
            state.uiContainer.style.top = top + 'px';
            state.uiContainer.style.zIndex = '2147483647';

            // 添加定位类名用于CSS样式区分
            state.uiContainer.classList.remove('positioned-center', 'positioned-above-input');
            if (position === 'fixed') {
                state.uiContainer.classList.add('positioned-center');
            } else {
                state.uiContainer.classList.add('positioned-above-input');
            }

    

        } catch (error) {
            console.warn('PromptCraft: Error positioning UI:', error);
            // 错误时回退到简单的居中定位
            state.uiContainer.style.position = 'fixed';
            state.uiContainer.style.left = '50%';
            state.uiContainer.style.top = '50%';
            state.uiContainer.style.transform = 'translate(-50%, -50%)';
            state.uiContainer.style.zIndex = '2147483647';
        }
    }

    // 初始化分类标签
    function initializeCategoryTabs() {
        if (!state.uiContainer) return;

        const tabsContainer = state.uiContainer.querySelector('.promptcraft-category-tabs');
        if (!tabsContainer) return;

        // 获取所有标签（兼容旧的分类字段）
        const allTags = new Set();
        state.prompts.forEach(prompt => {
            if (prompt.tags && Array.isArray(prompt.tags)) {
                prompt.tags.forEach(tag => allTags.add(tag));
            } else if (prompt.category) {
                allTags.add(prompt.category);
            }
        });
        const tags = ['all', ...Array.from(allTags)];

        // 创建分类标签（添加颜色支持）
        tabsContainer.innerHTML = tags.map(tag => {
            const displayName = tag === 'all' ? i18n.t('filter.all') : tag;
            const isActive = tag === state.selectedCategory;
            const colorClass = tag === 'all' ? '' : `category-tab-${tagColorManager.getTagColor(tag)}`;
            return `<button class="promptcraft-category-tab ${isActive ? 'active' : ''} ${colorClass}" data-category="${tag}">${escapeHtml(displayName)}</button>`;
        }).join('');

        // 添加点击事件
        tabsContainer.querySelectorAll('.promptcraft-category-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                const category = e.target.dataset.category;
                selectCategory(category);
            });
        });
    }

    // 选择分类
    function selectCategory(category) {
        state.selectedCategory = category;

        // 更新标签样式
        if (state.uiContainer) {
            const tabs = state.uiContainer.querySelectorAll('.promptcraft-category-tab');
            tabs.forEach(tab => {
                tab.classList.toggle('active', tab.dataset.category === category);
            });
        }

        // 应用筛选
        applyFilters();
    }

    // 切换分类（键盘导航）
    function switchCategory(direction) {
        if (!state.uiContainer) return;

        const tabs = Array.from(state.uiContainer.querySelectorAll('.promptcraft-category-tab'));
        const currentIndex = tabs.findIndex(tab => tab.dataset.category === state.selectedCategory);

        let newIndex;
        if (direction > 0) {
            newIndex = currentIndex < tabs.length - 1 ? currentIndex + 1 : 0;
        } else {
            newIndex = currentIndex > 0 ? currentIndex - 1 : tabs.length - 1;
        }

        if (tabs[newIndex]) {
            selectCategory(tabs[newIndex].dataset.category);
        }
    }

    // 统一的排序函数：按创建时间降序排序，最新的在前面
    function sortPromptsByCreatedTime(prompts) {
        return prompts.sort((a, b) => {
            const timeA = new Date(a.created_at || a.createdAt || 0).getTime();
            const timeB = new Date(b.created_at || b.createdAt || 0).getTime();
            return timeB - timeA; // 降序排序，最新的在前面
        });
    }

    // 应用所有筛选条件
    function applyFilters() {
        console.log('PromptCraft: applyFilters called, state.prompts length:', state.prompts.length);
        let filtered = [...state.prompts];

        // 按标签筛选（兼容旧的分类字段）
        if (state.selectedCategory !== 'all') {
            filtered = filtered.filter(prompt => {
                // 优先使用tags数组，如果不存在则兼容旧的category字段
                if (prompt.tags && Array.isArray(prompt.tags)) {
                    return prompt.tags.includes(state.selectedCategory);
                } else if (prompt.category) {
                    return prompt.category === state.selectedCategory;
                }
                return false;
            });
        }

        // 按搜索词筛选
        if (state.searchTerm.trim()) {
            const term = state.searchTerm.toLowerCase();
            filtered = filtered.filter(prompt => {
                // 搜索标题和内容
                const titleMatch = prompt.title.toLowerCase().includes(term);
                const contentMatch = prompt.content.toLowerCase().includes(term);
                
                // 搜索标签（优先使用tags数组，兼容旧的category字段）
                let tagMatch = false;
                if (prompt.tags && Array.isArray(prompt.tags)) {
                    tagMatch = prompt.tags.some(tag => tag.toLowerCase().includes(term));
                } else if (prompt.category) {
                    tagMatch = prompt.category.toLowerCase().includes(term);
                }
                
                // 搜索作者
                const authorMatch = prompt.author && prompt.author.toLowerCase().includes(term);
                
                return titleMatch || contentMatch || tagMatch || authorMatch;
            });
        }

        // 按创建时间降序排序，确保与侧边栏显示顺序一致
        filtered = sortPromptsByCreatedTime(filtered);

        state.filteredPrompts = filtered;
        state.selectedIndex = 0;
        console.log('PromptCraft: applyFilters result, filteredPrompts length:', state.filteredPrompts.length);
        updatePromptList();
    }

    // 过滤提示词（保留向后兼容）
    function filterPrompts(searchTerm) {
        state.searchTerm = searchTerm;
        applyFilters();
    }

    // 全局标签颜色管理器
    // 注入全局颜色管理器脚本
    function injectGlobalTagColorManager() {
        return new Promise((resolve) => {
            // 检查是否已经存在
            if (window.globalTagColorManager) {
                resolve(window.globalTagColorManager);
                return;
            }
            
            const script = document.createElement('script');
            script.src = chrome.runtime.getURL('src/shared/globalTagColorManager.js');
            script.onload = function() {
                script.remove();
                // 给脚本一点时间执行并设置全局变量
                setTimeout(() => {
                    resolve(window.globalTagColorManager);
                }, 10);
            };
            script.onerror = function() {
                script.remove();
                resolve(null);
            };
            (document.head || document.documentElement).appendChild(script);
        });
    }
    
    // 统一的颜色管理器
    const tagColorManager = {
        getTagColor(tag) {
            // 优先使用全局颜色管理器
            if (window.getGlobalTagColor) {
                return window.getGlobalTagColor(tag);
            }
            
            // 降级处理：使用简单哈希算法
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
        }
    };
    
    // 预加载全局颜色管理器
    injectGlobalTagColorManager().then(globalManager => {
        if (globalManager) {
            console.log('Global tag color manager loaded in content script');
        } else {
            console.info('Global tag color manager not loaded, using local fallback (this is normal)');
        }
    }).catch(err => {
        console.error('Failed to load global tag color manager:', err);
    });

    // 更新提示词列表
    function updatePromptList() {
        console.log('PromptCraft: updatePromptList called, filteredPrompts length:', state.filteredPrompts.length);
        if (!state.uiContainer) return;

        const listContainer = state.uiContainer.querySelector('.promptcraft-prompt-list');
        if (!listContainer) return;

        if (state.filteredPrompts.length === 0) {
            listContainer.innerHTML = `<div class="promptcraft-no-results">${i18n.t('noResults')}</div>`;
            return;
        }

        listContainer.innerHTML = state.filteredPrompts.map((prompt, index) => {
            // 渲染标签（优先使用tags数组，兼容旧的category字段）
            let tagsHtml = '';
            if (prompt.tags && Array.isArray(prompt.tags) && prompt.tags.length > 0) {
                tagsHtml = prompt.tags.map(tag => {
                    const colorClass = tagColorManager.getTagColor(tag);
                    return `<span class="tag tag-${colorClass}">${escapeHtml(tag)}</span>`;
                }).join('');
            } else if (prompt.category) {
                const colorClass = tagColorManager.getTagColor(prompt.category);
                tagsHtml = `<span class="tag tag-${colorClass}">${escapeHtml(prompt.category)}</span>`;
            }
            
            // 渲染作者
            const authorHtml = prompt.author ? `<span class="author">by ${escapeHtml(prompt.author)}</span>` : '';
            
            return `
                <div class="promptcraft-prompt-item ${index === state.selectedIndex ? 'selected' : ''}" data-index="${index}">
                    <div class="promptcraft-prompt-header">
                        <div class="promptcraft-prompt-title">${escapeHtml(prompt.title)}</div>
                        ${tagsHtml || authorHtml ? `<div class="promptcraft-prompt-meta">${tagsHtml}${authorHtml}</div>` : ''}
                    </div>
                    <div class="promptcraft-prompt-preview">${escapeHtml(prompt.content.substring(0, 100))}${prompt.content.length > 100 ? '...' : ''}</div>
                </div>
            `;
        }).join('');

        // 添加鼠标按下事件（避免与blur事件冲突）
        listContainer.querySelectorAll('.promptcraft-prompt-item').forEach((item) => {
            item.addEventListener('mousedown', (event) => {
                event.preventDefault(); // 防止触发blur事件
                const promptIndex = parseInt(item.getAttribute('data-index'));
                if (promptIndex >= 0 && promptIndex < state.filteredPrompts.length) {
                    state.selectedIndex = promptIndex;
                    updateSelection();
                    insertPrompt(state.filteredPrompts[promptIndex]);
                }
            });
        });
    }

    // 更新选择
    function updateSelection() {
        if (!state.uiContainer) return;

        const items = state.uiContainer.querySelectorAll('.promptcraft-prompt-item');
        items.forEach((item, index) => {
            item.classList.toggle('selected', index === state.selectedIndex);
        });

        // 滚动到选中项
        if (items[state.selectedIndex]) {
            items[state.selectedIndex].scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        }
    }

    // 插入提示词
    function insertPrompt(prompt) {


        // 使用锁定的目标输入框（最高优先级）
        const targetInput = state.lockedTargetInput || state.originalInput || state.currentInput;

        if (!targetInput || !prompt) {
            console.warn('PromptCraft: Cannot insert prompt - missing target or prompt');
            return;
        }

        // 设置插入标志位
        state.isInserting = true;

        try {
            const currentText = getElementText(targetInput);
            let newText, cursorPosition;

            // 精确替换触发词
            if (state.triggerPosition >= 0) {
                const beforeTrigger = currentText.substring(0, state.triggerPosition);
                const afterTrigger = currentText.substring(state.triggerPosition + CONSTANTS.TRIGGER_COMMAND.length);
                newText = beforeTrigger + prompt.content + afterTrigger;
                cursorPosition = state.triggerPosition + prompt.content.length;
            } else {
                // 后备方案：移除末尾的触发词
                const triggerRegex = new RegExp(CONSTANTS.TRIGGER_COMMAND.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$');
                newText = currentText.replace(triggerRegex, prompt.content);
                cursorPosition = newText.length;
            }

            // 增强的文本注入
            insertTextWithFrameworkSupport(targetInput, newText, cursorPosition);

            // 关闭UI并清理状态
            hideQuickInvokeUI();

            // 聚焦回目标输入框
            setTimeout(() => {
                try {
                    targetInput.focus();
                } catch (error) {
                    console.warn('PromptCraft: Failed to focus target input:', error);
                }
                state.isInserting = false;
            }, 50);

    

        } catch (error) {
            console.error('PromptCraft: Error inserting prompt:', error);
            state.isInserting = false;
            hideQuickInvokeUI();
        }
    }

    // 增强的文本注入函数 - 支持现代前端框架
    function insertTextWithFrameworkSupport(element, text, cursorPosition) {
        const previousValue = getElementText(element);

        // 设置文本内容
        setElementText(element, text);

        // 设置光标位置
        setCursorPosition(element, cursorPosition);

        // 触发完整的事件序列以确保框架同步
        triggerComprehensiveEventSequence(element, previousValue, text);
    }

    // 触发完整的事件序列
    function triggerComprehensiveEventSequence(element, previousValue, newValue) {
        try {
            // 1. 立即触发基础事件
            const events = [
                new Event('focus', { bubbles: true }),
                new Event('input', { bubbles: true }),
                new Event('change', { bubbles: true })
            ];

            events.forEach(event => {
                Object.defineProperty(event, 'target', { writable: false, value: element });
                Object.defineProperty(event, 'currentTarget', { writable: false, value: element });
                element.dispatchEvent(event);
            });

            // 2. 模拟键盘输入序列（异步）
            setTimeout(() => {
                try {
                    // beforeinput事件（现代浏览器）
                    if (typeof InputEvent !== 'undefined') {
                        const beforeInputEvent = new InputEvent('beforeinput', {
                            bubbles: true,
                            cancelable: true,
                            inputType: 'insertText',
                            data: newValue
                        });
                        element.dispatchEvent(beforeInputEvent);
                    }

                    // 键盘事件序列
                    const keyboardEvents = [
                        { type: 'keydown', key: 'Unidentified', keyCode: 229 },
                        { type: 'compositionstart' },
                        { type: 'compositionupdate', data: newValue },
                        { type: 'input' },
                        { type: 'compositionend', data: newValue },
                        { type: 'keyup', key: 'Unidentified', keyCode: 229 }
                    ];

                    keyboardEvents.forEach((config, index) => {
                        setTimeout(() => {
                            try {
                                let event;
                                if (config.type.startsWith('composition')) {
                                    event = new CompositionEvent(config.type, {
                                        bubbles: true,
                                        data: config.data || ''
                                    });
                                } else if (config.type.startsWith('key')) {
                                    event = new KeyboardEvent(config.type, {
                                        bubbles: true,
                                        key: config.key,
                                        keyCode: config.keyCode
                                    });
                                } else {
                                    event = new Event(config.type, { bubbles: true });
                                }
                                element.dispatchEvent(event);
                            } catch (e) {
                                // 忽略单个事件错误
                            }
                        }, index * 5);
                    });
                } catch (e) {
                    console.warn('PromptCraft: Failed to trigger keyboard sequence:', e);
                }
            }, 0);

            // 3. React特殊处理
            setTimeout(() => {
                try {
                    const reactFiberKey = Object.keys(element).find(key =>
                        key.startsWith('__reactInternalInstance') || key.startsWith('__reactFiber')
                    );

                    if (reactFiberKey) {
                        // 强制React重新渲染
                        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
                            window.HTMLInputElement.prototype, 'value'
                        )?.set || Object.getOwnPropertyDescriptor(
                            window.HTMLTextAreaElement.prototype, 'value'
                        )?.set;

                        if (nativeInputValueSetter) {
                            nativeInputValueSetter.call(element, newValue);
                            element.dispatchEvent(new Event('input', { bubbles: true }));
                        }
                    }
                } catch (e) {
                    console.warn('PromptCraft: React special handling failed:', e);
                }
            }, 10);

        } catch (error) {
            console.warn('PromptCraft: Failed to trigger comprehensive events:', error);
        }
    }

    // 设置光标位置
    function setCursorPosition(element, position) {
        try {
            if (element.setSelectionRange && typeof element.setSelectionRange === 'function') {
                // 对于input和textarea元素
                element.setSelectionRange(position, position);
            } else if (element.contentEditable === 'true') {
                // 对于contenteditable元素
                const range = document.createRange();
                const selection = window.getSelection();

                // 找到文本节点
                const textNode = element.firstChild || element;
                const maxPosition = textNode.textContent ? textNode.textContent.length : 0;
                const safePosition = Math.min(position, maxPosition);

                if (textNode.nodeType === Node.TEXT_NODE) {
                    range.setStart(textNode, safePosition);
                } else {
                    range.setStart(textNode, 0);
                }

                range.collapse(true);
                selection.removeAllRanges();
                selection.addRange(range);
            }
        } catch (error) {
            console.warn('PromptCraft: Failed to set cursor position:', error);
        }
    }

    // 注意：旧的triggerInputEvents函数已被insertTextWithFrameworkSupport中的triggerComprehensiveEventSequence替代

    // HTML转义
    function escapeHtml(unsafe) {
        if (!unsafe) return '';
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    // 处理搜索输入
    function handleSearchInput(event) {
        if (!state.uiContainer) return;

        const searchInput = state.uiContainer.querySelector('.promptcraft-search-input');
        if (!searchInput) return;

        // 移除开头的触发命令
        const searchTerm = searchInput.value.replace(new RegExp(`^${CONSTANTS.TRIGGER_COMMAND}\\s*`), '');

        state.searchTerm = searchTerm;
        applyFilters();
    }

    // 更新搜索（当用户继续输入时）
    function updateSearch(text) {
        // 提取触发命令之后的文本作为搜索词
        const triggerIndex = text.lastIndexOf(CONSTANTS.TRIGGER_COMMAND);
        if (triggerIndex !== -1) {
            const searchTerm = text.substring(triggerIndex + CONSTANTS.TRIGGER_COMMAND.length);
            const searchInput = state.uiContainer && state.uiContainer.querySelector('.promptcraft-search-input');
            if (searchInput) {
                searchInput.value = searchTerm;
                filterPrompts(searchTerm);
            }
        }
    }

    // 显示错误信息给用户
    function showErrorMessage(message) {
        console.error('PromptCraft Error:', message);

        // 创建错误提示元素
        const errorDiv = document.createElement('div');
        errorDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #ff4444;
            color: white;
            padding: 12px 16px;
            border-radius: 6px;
            font-size: 14px;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            z-index: 999999;
            max-width: 300px;
            word-wrap: break-word;
        `;
        errorDiv.textContent = `提示词助手: ${message}`;

        // 添加到页面
        document.body.appendChild(errorDiv);

        // 3秒后自动移除
        setTimeout(() => {
            if (errorDiv.parentNode) {
                errorDiv.parentNode.removeChild(errorDiv);
            }
        }, 3000);
    }

    // 清理所有资源
    function cleanup() {
        // 移除UI
        hideQuickInvokeUI();

        // 清理定时器
        if (state.debounceTimer) {
            clearTimeout(state.debounceTimer);
            state.debounceTimer = null;
        }

        // 清理MutationObserver
        if (window.promptCraftObserver) {
            window.promptCraftObserver.disconnect();
            window.promptCraftObserver = null;
        }

        // 清理输入防抖定时器
        if (inputDebounceTimer) {
            clearTimeout(inputDebounceTimer);
            inputDebounceTimer = null;
        }

        // 重置状态
        state.isUIVisible = false;
        state.currentInput = null;
        state.triggerPosition = -1;
        state.isInitialized = false;
    }

    // 页面加载完成后初始化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

// 主题管理功能
    let currentThemeMode = 'auto';
    
    /**
     * 获取主题模式
     * @returns {Promise<string>} 主题模式 ('auto', 'light', 'dark')
     */
    async function getThemeMode() {
        try {
            // 通过消息通信获取主题模式，避免扩展上下文失效问题
            const response = await chrome.runtime.sendMessage({ type: 'GET_THEME_MODE' });
            if (response && response.success) {
                return response.data || 'auto';
            } else {
                console.warn('PromptCraft: 获取主题模式失败，使用默认值:', response?.error);
                return 'auto';
            }
        } catch (error) {
            console.error('PromptCraft: 获取主题模式失败:', error);
            return 'auto';
        }
    }
    
    /**
     * 获取系统主题
     * @returns {string} 'light' 或 'dark'
     */
    function getSystemTheme() {
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    
    /**
     * 获取实际应用的主题
     * @param {string} themeMode 主题模式设置
     * @returns {string} 'light' 或 'dark'
     */
    function getEffectiveTheme(themeMode) {
        if (themeMode === 'auto') {
            return getSystemTheme();
        }
        return themeMode;
    }
    
    /**
     * 应用主题到样式
     * @param {HTMLStyleElement} styleElement 样式元素
     */
    async function applyThemeToStyles(styleElement) {
        try {
            currentThemeMode = await getThemeMode();
            const effectiveTheme = getEffectiveTheme(currentThemeMode);
            
            // 根据主题模式修改CSS
            if (effectiveTheme === 'dark') {
                // 强制应用深色主题
                styleElement.setAttribute('data-theme', 'dark');
            } else {
                // 强制应用浅色主题
                styleElement.setAttribute('data-theme', 'light');
            }
            

        } catch (error) {

        }
    }
    
    // 缓存当前主题状态，避免重复设置
    let cachedThemeMode = null;
    let cachedEffectiveTheme = null;
    
    /**
     * 更新UI主题
     */
    async function updateUITheme() {
        if (!state.uiContainer) return;
        
        try {
            const newThemeMode = await getThemeMode();
            const newEffectiveTheme = getEffectiveTheme(newThemeMode);
            
            // 检查是否需要更新（避免重复设置相同主题）
            if (cachedThemeMode === newThemeMode && cachedEffectiveTheme === newEffectiveTheme) {
        
                return;
            }
            
            // 更新缓存
            cachedThemeMode = newThemeMode;
            cachedEffectiveTheme = newEffectiveTheme;
            currentThemeMode = newThemeMode;
            
            // 更新UI容器的主题属性
            if (newEffectiveTheme === 'dark') {
                state.uiContainer.setAttribute('data-theme', 'dark');
            } else {
                state.uiContainer.setAttribute('data-theme', 'light');
            }
            
    
        } catch (error) {
            console.error('PromptCraft: 更新UI主题失败:', error);
        }
    }
    
    // 防止重复设置监听器的标记
    let themeListenersSetup = false;
    
    /**
     * 监听主题变化
     */
    function setupThemeListener() {
        // 防止重复设置监听器
        if (themeListenersSetup) {
    
            return;
        }
        
        // 监听chrome.storage变化
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.onChanged) {
            chrome.storage.onChanged.addListener((changes, namespace) => {
                if (namespace === 'local' && changes.themeMode) {
        
                    updateUITheme();
                }
            });
        }
        
        // 监听系统主题变化（当设置为auto时）
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        mediaQuery.addEventListener('change', () => {
            if (currentThemeMode === 'auto') {
    
                updateUITheme();
            }
        });
        
        // 标记监听器已设置
        themeListenersSetup = true;
    }

    /**
     * 检查PP命令开关是否启用
     * @param {function} callback 回调函数，参数为boolean值表示是否启用
     */
    function checkPpCommandEnabled(callback) {
        try {
            // 检查是否在扩展环境中
            if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
                chrome.runtime.sendMessage({ type: 'GET_PP_COMMAND_ENABLED' }, (response) => {
                    if (chrome.runtime.lastError) {
                        console.warn('PromptCraft: Failed to get PP command status:', chrome.runtime.lastError.message);
                        // 默认启用，保持向后兼容
                        callback(true);
                        return;
                    }

                    if (response && response.success) {
                        callback(response.data === true);
                    } else {
                        console.warn('PromptCraft: Failed to get PP command status:', response?.error);
                        // 默认启用，保持向后兼容
                        callback(true);
                    }
                });
            } else {
                // 非扩展环境，默认启用
                callback(true);
            }
        } catch (error) {
            console.warn('PromptCraft: Error checking PP command status:', error);
            // 默认启用，保持向后兼容
            callback(true);
        }
    }

})();
