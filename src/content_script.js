// PromptCraft In-Page Quick Invoke Content Script
// PromptCraft In-Page Quick Invoke - 页面内快速调用功能
// 实现智能输入区域识别、精确触发检测和完整的UI生命周期管理

(function () {
    'use strict';

    // 防止重复注入
    if (window.promptCraftInjected) {
        return;
    }
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
html body #promptcraft-quick-invoke-container[data-theme="dark"] .promptcraft-prompt-item.selected .promptcraft-prompt-category .category {
    color: white;
}
html body #promptcraft-quick-invoke-container[data-theme="dark"] .promptcraft-prompt-item.selected .promptcraft-prompt-category .category {
    background-color: rgba(255,255,255,0.1);
    border-color: rgba(255,255,255,0.2);
}

/* 卡片内部元素样式 */
html body #promptcraft-quick-invoke-container .promptcraft-prompt-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; }
html body #promptcraft-quick-invoke-container .promptcraft-prompt-title { font-weight: 600; font-size: 14px; flex-grow: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
html body #promptcraft-quick-invoke-container .promptcraft-prompt-preview { font-size: 13px; color: var(--text-secondary-light); line-height: 1.5; max-height: 40px; overflow: hidden; }
html body #promptcraft-quick-invoke-container .promptcraft-prompt-category .category { font-size: 11px; padding: 2px 8px; border-radius: 10px; background-color: var(--card-light); border: 1px solid var(--border-light); }

html body #promptcraft-quick-invoke-container[data-theme="dark"] .promptcraft-prompt-preview { color: var(--text-secondary-dark); }
html body #promptcraft-quick-invoke-container[data-theme="dark"] .promptcraft-prompt-category .category { background-color: var(--card-dark); border-color: var(--border-dark); }

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
        console.log('PromptCraft: Initializing extension', {
            url: window.location.href,
            hostname: window.location.hostname,
            pathname: window.location.pathname,
            userAgent: navigator.userAgent,
            timestamp: new Date().toISOString(),
            triggerCommand: CONSTANTS.TRIGGER_COMMAND
        });

        // 特别检测大模型网站
        const aiSites = ['kimi.moonshot.cn', 'gemini.google.com', 'doubao.com', 'chatgpt.com', 'claude.ai'];
        const currentSite = window.location.hostname;
        const isAISite = aiSites.some(site => currentSite.includes(site));

        console.log('PromptCraft: AI Site Detection', {
            currentSite: currentSite,
            isAISite: isAISite,
            detectedSites: aiSites.filter(site => currentSite.includes(site))
        });

        // 检测CSP限制
        const metaTags = document.querySelectorAll('meta[http-equiv="Content-Security-Policy"]');
        if (metaTags.length > 0) {
            console.log('PromptCraft: CSP detected', {
                cspCount: metaTags.length,
                cspContent: Array.from(metaTags).map(tag => tag.content)
            });
        }

        console.log('PromptCraft: Injecting styles');
        injectStyles(); // 注入CSS样式

        console.log('PromptCraft: Loading prompts');
        loadPrompts();

        console.log('PromptCraft: Setting up event listeners');
        setupEventListeners();

        console.log('PromptCraft: Setting up cleanup handlers');
        setupCleanupHandlers();

        console.log('PromptCraft: Setting up storage change listener');
        setupStorageChangeListener();

        // 设置心跳日志，每30秒输出一次确认扩展运行状态
        setInterval(() => {
            console.log('💓 PromptCraft: Heartbeat - Extension is running', {
                timestamp: new Date().toISOString(),
                url: window.location.href,
                isInitialized: state.isInitialized,
                isUIVisible: state.isUIVisible
            });
        }, 30000);

        console.log('PromptCraft: Initialization completed successfully');

        // 立即测试一次输入事件监听
        console.log('PromptCraft: Testing input event listener setup...');
        setTimeout(() => {
            console.log('PromptCraft: Extension ready for input detection');
        }, 1000);
    }

    // 获取空的提示词数据（移除硬编码测试数据）
    function getEmptyPrompts() {
        return [];
    }

    // 数据加载完成后更新UI
    function updateUIAfterPromptsLoad() {
        console.log('PromptCraft: updateUIAfterPromptsLoad called, current prompts:', state.prompts);
        console.log('PromptCraft: prompts count:', state.prompts.length);
        if (state.prompts.length > 0) {
            console.log('PromptCraft: First prompt:', state.prompts[0]);
        }

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
    function loadPrompts() {
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
                        console.log('PromptCraft: Connection failed, showing empty list');
                        updateUIAfterPromptsLoad();
                        return;
                    }

                    if (response && response.loadError) {
                        // 显示加载错误信息
                        console.error('PromptCraft: Load error detected:', response.errorMessage);
                        showErrorMessage(response.errorMessage || '加载默认提示词失败');
                        state.prompts = getEmptyPrompts();
                        console.log('PromptCraft: Load error, showing empty list');
                    } else if (response && response.prompts && response.prompts.length > 0) {
                        state.prompts = response.prompts;
                        console.log('PromptCraft: Successfully loaded prompts from memory:', state.prompts.length);
                        console.log('PromptCraft: Loaded prompts data:', state.prompts);
                    } else {
                        // 如果内存中没有数据，显示空列表
                        state.prompts = getEmptyPrompts();
                        console.log('PromptCraft: No prompts in memory, showing empty list');
                        console.log('PromptCraft: Response was:', response);
                    }
                    updateUIAfterPromptsLoad();
                });
            } else {
                // 非扩展环境，显示空列表
                console.log('PromptCraft: Not in extension environment, showing empty list');
                state.prompts = getEmptyPrompts();
                console.log('PromptCraft: Showing empty list');
                updateUIAfterPromptsLoad();
            }
        } catch (error) {
            console.warn('PromptCraft: Error loading prompts:', error);
            state.prompts = getEmptyPrompts();
            console.log('PromptCraft: Error occurred, showing empty list');
            updateUIAfterPromptsLoad();
        }
    }

    // 设置事件监听器
    function setupEventListeners() {
        console.log('PromptCraft: Setting up enhanced event listeners with MutationObserver');

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
                    console.log('PromptCraft: 收到数据变更通知，重新加载提示词');
                    loadPrompts();
                }
            });
        }

        console.log('PromptCraft: Enhanced event listeners setup completed');
    }

    // 设置存储变化监听器
    function setupStorageChangeListener() {
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.onChanged) {
            chrome.storage.onChanged.addListener((changes, namespace) => {
                if (namespace === 'local' && changes.prompts) {
                    console.log('PromptCraft: Storage prompts changed, reloading data');
                    console.log('PromptCraft: Old prompts count:', changes.prompts.oldValue ? changes.prompts.oldValue.length : 0);
                    console.log('PromptCraft: New prompts count:', changes.prompts.newValue ? changes.prompts.newValue.length : 0);
                    
                    // 直接更新state中的prompts数据
                    state.prompts = changes.prompts.newValue || [];
                    
                    // 如果当前有显示的UI，立即更新
                    updateUIAfterPromptsLoad();
                }
            });
            console.log('PromptCraft: Storage change listener setup completed');
        } else {
            console.warn('PromptCraft: Chrome storage API not available for change listener');
        }
    }

    // 设置DOM观察器 - 处理动态加载的输入框
    function setupDOMObserver() {
        if (!window.MutationObserver) {
            console.warn('PromptCraft: MutationObserver not supported');
            return;
        }

        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                    mutation.addedNodes.forEach((node) => {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            // 递归检查新添加的节点及其子节点
                            scanAndBindInputElements(node);
                        }
                    });
                }
            });
        });

        // 监控整个document.body的DOM变化
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });

        console.log('PromptCraft: MutationObserver setup completed');
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
        const allElements = rootElement.querySelectorAll('*');
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
        console.log('PromptCraft: Bound input element:', element.tagName, element.id || element.className);
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
        // 强制输出日志，确保函数被调用
        console.log('🔥 PromptCraft: handleInputEvent CALLED - This should always appear!');

        const target = event.target;

        console.log('PromptCraft: Input event detected', {
            tagName: target.tagName,
            type: target.type || 'no-type',
            id: target.id,
            className: target.className,
            contentEditable: target.contentEditable,
            isInserting: state.isInserting,
            url: window.location.href,
            hostname: window.location.hostname,
            eventType: event.type
        });

        // 如果正在插入提示词，跳过处理以防止干扰
        if (state.isInserting) {
            console.log('PromptCraft: Currently inserting prompt, ignoring input event');
            return;
        }

        // 检查是否是可编辑的输入框
        if (!isEditableElement(target)) {
            console.log('PromptCraft: Element is not editable, ignoring', {
                tagName: target.tagName,
                type: target.type,
                contentEditable: target.contentEditable,
                id: target.id,
                className: target.className
            });
            return;
        }

        console.log('PromptCraft: Valid input element detected', {
            tagName: target.tagName,
            id: target.id,
            className: target.className
        });

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
            console.log('PromptCraft: processInputChange called with no input element');
            return;
        }

        const text = getElementText(inputElement);
        state.lastInputValue = text;

        console.log('PromptCraft: Processing input change', {
            text: text,
            textLength: text.length,
            triggerCommand: CONSTANTS.TRIGGER_COMMAND,
            isUIVisible: state.isUIVisible,
            elementType: inputElement.tagName,
            elementId: inputElement.id,
            url: window.location.href,
            hostname: window.location.hostname
        });

        if (state.isUIVisible) {
            console.log('PromptCraft: UI is already visible, updating search');
            // 如果UI已激活，更新搜索
            updateSearch(text);
            return;
        }

        // 检查是否输入了触发词
        const triggerIndex = text.lastIndexOf(CONSTANTS.TRIGGER_COMMAND);
        console.log('PromptCraft: Trigger detection', {
            triggerIndex: triggerIndex,
            triggerCommand: CONSTANTS.TRIGGER_COMMAND,
            textAroundTrigger: triggerIndex >= 0 ? text.substring(Math.max(0, triggerIndex - 5), triggerIndex + CONSTANTS.TRIGGER_COMMAND.length + 5) : 'N/A'
        });

        if (triggerIndex === -1) {
            console.log('PromptCraft: No trigger command found in text');
            return;
        }

        // 检查触发词是否是单词边界或行首
        const charBefore = triggerIndex > 0 ? text.charAt(triggerIndex - 1) : '';
        const charAfter = triggerIndex + CONSTANTS.TRIGGER_COMMAND.length < text.length ? text.charAt(triggerIndex + CONSTANTS.TRIGGER_COMMAND.length) : '';
        const isAtWordBoundary = triggerIndex === 0 || !isAlphaNumeric(charBefore);
        const isFollowedBySpace = triggerIndex + CONSTANTS.TRIGGER_COMMAND.length === text.length || charAfter === ' ';

        console.log('PromptCraft: Boundary check', {
            charBefore: charBefore,
            charAfter: charAfter,
            isAtWordBoundary: isAtWordBoundary,
            isFollowedBySpace: isFollowedBySpace,
            triggerPosition: triggerIndex
        });

        // 只有当触发词在单词边界且后面是空格或文本结束时才触发
        if (isAtWordBoundary && isFollowedBySpace) {
            console.log('PromptCraft: Trigger conditions met, locking target and showing UI');

            // 锁定目标输入框 - 防止目标丢失
            state.lockedTargetInput = inputElement;
            state.triggerPosition = triggerIndex;

            // 保存原始输入框引用（向后兼容）
            if (!state.originalInput) {
                state.originalInput = inputElement;
            }

            console.log('PromptCraft: Target locked', {
                lockedElement: {
                    tagName: state.lockedTargetInput.tagName,
                    id: state.lockedTargetInput.id,
                    className: state.lockedTargetInput.className
                },
                triggerPosition: triggerIndex
            });

            showQuickInvokeUI();
        } else {
            console.log('PromptCraft: Trigger conditions not met, not showing UI');
        }
    }

    // 工具函数
    function isAlphaNumeric(char) {
        return /[a-zA-Z0-9]/.test(char);
    }



    // 处理键盘事件
    function handleKeydownEvent(event) {
        console.log('PromptCraft: Keydown event', {
            key: event.key,
            code: event.code,
            target: event.target.tagName,
            targetId: event.target.id,
            targetClass: event.target.className,
            isUIVisible: state.isUIVisible,
            url: window.location.href,
            hostname: window.location.hostname
        });

        // 如果UI未激活，不处理
        if (!state.isUIVisible) {
            console.log('PromptCraft: UI not visible, ignoring keydown');
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
            console.log('PromptCraft: Found standard input element:', tagName);
            return true;
        }

        // B. 富文本编辑器模式：任何带有 contentEditable="true" 属性的元素
        // 使用 closest 方法兼容 contentEditable 属性在父元素上的情况
        const contentEditableElement = element.closest('[contenteditable="true"]');
        if (contentEditableElement) {
            console.log('PromptCraft: Found contentEditable element via closest()');
            return true;
        }

        // 直接检查当前元素的 contentEditable 属性
        if (element.isContentEditable) {
            console.log('PromptCraft: Element is directly contentEditable');
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
        console.log('PromptCraft: setElementText called with element:', element);
        console.log('PromptCraft: setElementText text to set:', text);
        console.log('PromptCraft: Element tag name:', element.tagName);
        console.log('PromptCraft: Element contentEditable:', element.contentEditable);

        if (!element || text === undefined) {
            console.warn('PromptCraft: Invalid element or text for setElementText');
            return;
        }

        try {
            // 先聚焦元素
            element.focus();

            // 保存原始值用于比较
            const previousValue = element.value || '';
            console.log('PromptCraft: Previous value:', previousValue);

            if (element.tagName.toLowerCase() === 'textarea' || element.tagName.toLowerCase() === 'input') {
                console.log('PromptCraft: Setting text for input/textarea element');
                // 使用原生设置器绕过React的值变更检查
                const descriptor = Object.getOwnPropertyDescriptor(element, 'value') ||
                    Object.getOwnPropertyDescriptor(Object.getPrototypeOf(element), 'value');

                if (descriptor && descriptor.set) {
                    console.log('PromptCraft: Using descriptor setter');
                    // 使用原型链上的原生setter
                    const prototype = Object.getPrototypeOf(element);
                    const nativeSetter = Object.getOwnPropertyDescriptor(prototype, 'value').set;
                    if (nativeSetter) {
                        console.log('PromptCraft: Using native setter');
                        nativeSetter.call(element, text);
                    } else {
                        console.log('PromptCraft: Using descriptor setter fallback');
                        descriptor.set.call(element, text);
                    }
                } else {
                    console.log('PromptCraft: Using direct value assignment');
                    // 后备方案：直接设置value
                    element.value = text;
                }

            } else if (element.contentEditable === 'true' || element.contentEditable === 'plaintext-only' || element.isContentEditable) {
                console.log('PromptCraft: Setting text for contenteditable element');

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
                        console.log('PromptCraft: execCommand insertText success:', success);
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
                        console.log('PromptCraft: Modern Selection API success');
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
                        console.log('PromptCraft: Direct content assignment used');
                    } catch (e) {
                        console.warn('PromptCraft: Direct content assignment failed:', e);
                    }
                }
            } else {
                console.log('PromptCraft: Setting text for other element type');
                // 其他类型的元素
                element.value = text;
            }

            // 验证设置结果
            const newValue = getElementText(element);
            console.log('PromptCraft: Value after setting:', newValue);
            console.log('PromptCraft: Setting successful:', newValue === text);

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
        console.log('PromptCraft: showQuickInvokeUI called', {
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
            console.log('PromptCraft: UI is already visible, skipping activation');
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

        console.log('PromptCraft: Activating UI with state', {
            promptsCount: state.prompts.length,
            triggerPosition: state.triggerPosition
        });

        // 保存原始输入元素，防止被搜索框覆盖
        state.originalInput = state.currentInput;
        console.log('PromptCraft: Saved original input element', {
            originalInputElement: state.originalInput ? {
                tagName: state.originalInput.tagName,
                id: state.originalInput.id,
                className: state.originalInput.className
            } : null
        });

        state.isActive = true;
        state.isUIVisible = true;
        state.filteredPrompts = [...state.prompts];
        state.selectedIndex = 0;
        state.selectedCategory = 'all';
        state.searchTerm = '';

        console.log('PromptCraft: Creating UI components');
        createQuickInvokeUI();
        positionUI();
        applyFilters();

        // 聚焦搜索框
        setTimeout(() => {
            const searchInput = state.uiContainer?.querySelector('.promptcraft-search-input');
            if (searchInput) {
                console.log('PromptCraft: Focusing search input');
                searchInput.focus();
            } else {
                console.warn('PromptCraft: Search input not found for focusing');
            }
        }, 10);

        console.log('PromptCraft: Quick invoke UI activated successfully');
    }

    // 隐藏快速调用UI
    function hideQuickInvokeUI() {
        if (!state.isUIVisible) return;

        console.log('PromptCraft: Hiding Quick Invoke UI');

        state.isUIVisible = false;
        state.isActive = false;

        // 清理输入元素引用和锁定状态
        state.originalInput = null;
        state.lockedTargetInput = null;
        console.log('PromptCraft: Cleared input references and target lock');

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

        console.log('PromptCraft: Quick invoke UI deactivated and cleaned up');
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
                <input type="text" class="promptcraft-search-input" placeholder="搜索提示词..." autocomplete="off" spellcheck="false" />
            </div>
            <div class="promptcraft-category-filter">
                <div class="promptcraft-category-tabs"></div>
            </div>
            <div class="promptcraft-prompt-list"></div>
            <div class="promptcraft-help-text">
                <div class="promptcraft-help-main">
                    <span class="promptcraft-help-keys">↑↓</span> 选择 • 
                    <span class="promptcraft-help-keys">Enter</span> 确认 • 
                    <span class="promptcraft-help-keys">Esc</span> 取消
                </div>
                <div class="promptcraft-help-trigger">
                    输入 <span class="promptcraft-help-command">pp</span> 唤起 • 支持搜索和分类筛选
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
                console.log('PromptCraft: Input in lower half, positioning above input');

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
                console.log('PromptCraft: Using default centered positioning');

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

            console.log(`PromptCraft: UI positioned - ${position} at (${Math.round(left)}, ${Math.round(top)})`);

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

        // 获取所有分类
        const categories = ['all', ...new Set(state.prompts.map(p => p.category).filter(Boolean))];

        // 创建分类标签
        tabsContainer.innerHTML = categories.map(category => {
            const displayName = category === 'all' ? '全部' : category;
            const isActive = category === state.selectedCategory;
            return `<button class="promptcraft-category-tab ${isActive ? 'active' : ''}" data-category="${category}">${escapeHtml(displayName)}</button>`;
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
        let filtered = [...state.prompts];

        // 按分类筛选
        if (state.selectedCategory !== 'all') {
            filtered = filtered.filter(prompt => prompt.category === state.selectedCategory);
        }

        // 按搜索词筛选
        if (state.searchTerm.trim()) {
            const term = state.searchTerm.toLowerCase();
            filtered = filtered.filter(prompt =>
                prompt.title.toLowerCase().includes(term) ||
                prompt.content.toLowerCase().includes(term) ||
                (prompt.category && prompt.category.toLowerCase().includes(term))
            );
        }

        // 按创建时间降序排序，确保与侧边栏显示顺序一致
        filtered = sortPromptsByCreatedTime(filtered);

        state.filteredPrompts = filtered;
        state.selectedIndex = 0;
        updatePromptList();
    }

    // 过滤提示词（保留向后兼容）
    function filterPrompts(searchTerm) {
        state.searchTerm = searchTerm;
        applyFilters();
    }

    // 更新提示词列表
    function updatePromptList() {
        if (!state.uiContainer) return;

        const listContainer = state.uiContainer.querySelector('.promptcraft-prompt-list');
        if (!listContainer) return;

        if (state.filteredPrompts.length === 0) {
            listContainer.innerHTML = '<div class="promptcraft-no-results">未找到匹配的提示词</div>';
            return;
        }

        listContainer.innerHTML = state.filteredPrompts.map((prompt, index) => `
            <div class="promptcraft-prompt-item ${index === state.selectedIndex ? 'selected' : ''}" data-index="${index}">
                <div class="promptcraft-prompt-header">
                    <div class="promptcraft-prompt-title">${escapeHtml(prompt.title)}</div>
                    ${prompt.category ? `<div class="promptcraft-prompt-category"><span class="category">${escapeHtml(prompt.category)}</span></div>` : ''}
                </div>
                <div class="promptcraft-prompt-preview">${escapeHtml(prompt.content.substring(0, 100))}${prompt.content.length > 100 ? '...' : ''}</div>
            </div>
        `).join('');

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
        console.log('PromptCraft: Enhanced insertPrompt called with target locking');

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

            console.log('PromptCraft: Prompt inserted successfully:', prompt.title);

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
        console.log('PromptCraft: Cleaning up resources');

        // 移除UI
        hideQuickInvokeUI();

        // 清理定时器
        if (state.debounceTimer) {
            clearTimeout(state.debounceTimer);
            state.debounceTimer = null;
        }

        // 重置状态
        state.isUIVisible = false;
        state.currentInput = null;
        state.triggerPosition = -1;
        state.isInitialized = false;

        console.log('PromptCraft: Cleanup complete');
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
            const result = await new Promise((resolve) => {
                chrome.storage.local.get(['themeMode'], resolve);
            });
            return result.themeMode || 'auto';
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
            
            console.log('PromptCraft: 应用主题模式:', currentThemeMode, '实际主题:', effectiveTheme);
        } catch (error) {
            console.error('PromptCraft: 应用主题失败:', error);
        }
    }
    
    /**
     * 更新UI主题
     */
    async function updateUITheme() {
        if (!state.uiContainer) return;
        
        try {
            currentThemeMode = await getThemeMode();
            const effectiveTheme = getEffectiveTheme(currentThemeMode);
            
            // 更新UI容器的主题属性
            if (effectiveTheme === 'dark') {
                state.uiContainer.setAttribute('data-theme', 'dark');
            } else {
                state.uiContainer.setAttribute('data-theme', 'light');
            }
            
            console.log('PromptCraft: 更新UI主题:', currentThemeMode, '实际主题:', effectiveTheme);
        } catch (error) {
            console.error('PromptCraft: 更新UI主题失败:', error);
        }
    }
    
    /**
     * 监听主题变化
     */
    function setupThemeListener() {
        // 监听chrome.storage变化
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.onChanged) {
            chrome.storage.onChanged.addListener((changes, namespace) => {
                if (namespace === 'local' && changes.themeMode) {
                    console.log('PromptCraft: 检测到主题模式变化:', changes.themeMode.newValue);
                    updateUITheme();
                }
            });
        }
        
        // 监听系统主题变化（当设置为auto时）
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        mediaQuery.addEventListener('change', () => {
            if (currentThemeMode === 'auto') {
                console.log('PromptCraft: 检测到系统主题变化');
                updateUITheme();
            }
        });
    }

    })();