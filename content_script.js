// PromptCraft In-Page Quick Invoke Content Script
// PromptCraft In-Page Quick Invoke - 页面内快速调用功能
// 实现智能输入区域识别、精确触发检测和完整的UI生命周期管理

(function() {
    'use strict';
    
    // 防止重复注入
    if (window.promptCraftInjected) {
        return;
    }
    window.promptCraftInjected = true;
    
    // 注入CSS样式
    function injectStyles() {
        if (document.getElementById('promptcraft-quick-invoke-styles')) {
            return; // 样式已存在
        }
        
        const style = document.createElement('style');
        style.id = 'promptcraft-quick-invoke-styles';
        style.textContent = `
            /* PromptCraft Quick Invoke Styles - 与sidepanel保持一致的视觉风格 */
            #promptcraft-quick-invoke-container {
                --primary-color: #6366f1;
                --primary-light: #818cf8;
                --primary-dark: #4f46e5;
                --background-light: #ffffff;
                --background-dark: #1e293b;
                --text-light: #334155;
                --text-dark: #f1f5f9;
                --card-light: #f8fafc;
                --card-dark: #334155;
                --border-light: #e2e8f0;
                --border-dark: #475569;
                --success: #10b981;
                --danger: #ef4444;
                --warning: #f59e0b;
                --shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
                --transition: all 0.3s ease;
                
                position: absolute;
                width: 600px;
                max-height: 700px;
                background: var(--background-light);
                border: 1px solid var(--border-light);
                border-radius: 12px;
                box-shadow: var(--shadow), 0 20px 25px -5px rgba(0, 0, 0, 0.1);
                font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
                font-size: 14px;
                color: var(--text-light);
                z-index: 2147483647;
                overflow: hidden;
                transition: var(--transition);
                animation: promptcraft-fadeIn 0.2s ease-out;
            }
            
            @media (prefers-color-scheme: dark) {
                #promptcraft-quick-invoke-container {
                    background: var(--background-dark);
                    border-color: var(--border-dark);
                    color: var(--text-dark);
                }
            }
            
            @keyframes promptcraft-fadeIn {
                from {
                    opacity: 0;
                    transform: translateY(-10px) scale(0.95);
                }
                to {
                    opacity: 1;
                    transform: translateY(0) scale(1);
                }
            }
            
            /* 搜索容器 */
            #promptcraft-quick-invoke-container .promptcraft-search-container {
                padding: 16px;
                border-bottom: 1px solid var(--border-light);
            }
            
            @media (prefers-color-scheme: dark) {
                #promptcraft-quick-invoke-container .promptcraft-search-container {
                    border-bottom-color: var(--border-dark);
                }
            }
            
            /* 搜索输入框 */
            #promptcraft-quick-invoke-container .promptcraft-search-input {
                width: 100%;
                padding: 10px 12px;
                border: 1px solid var(--border-light);
                border-radius: 8px;
                background: var(--background-light);
                color: var(--text-light);
                font-size: 14px;
                outline: none;
                transition: var(--transition);
            }
            
            #promptcraft-quick-invoke-container .promptcraft-search-input:focus {
                border-color: var(--primary-color);
                box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
            }
            
            @media (prefers-color-scheme: dark) {
                #promptcraft-quick-invoke-container .promptcraft-search-input {
                    background: var(--card-dark);
                    border-color: var(--border-dark);
                    color: var(--text-dark);
                }
                
                #promptcraft-quick-invoke-container .promptcraft-search-input::placeholder {
                    color: #94a3b8;
                }
            }
            
            /* 分类筛选器 */
            #promptcraft-quick-invoke-container .promptcraft-category-filter {
                padding: 12px 16px;
                border-bottom: 1px solid var(--border-light);
                background: var(--card-light);
            }
            
            @media (prefers-color-scheme: dark) {
                #promptcraft-quick-invoke-container .promptcraft-category-filter {
                    background: var(--card-dark);
                    border-bottom-color: var(--border-dark);
                }
            }
            
            #promptcraft-quick-invoke-container .promptcraft-category-tabs {
                display: flex;
                gap: 8px;
                flex-wrap: wrap;
            }
            
            #promptcraft-quick-invoke-container .promptcraft-category-tab {
                padding: 6px 12px;
                border: 1px solid var(--border-light);
                border-radius: 6px;
                background: var(--background-light);
                color: var(--text-light);
                font-size: 12px;
                cursor: pointer;
                transition: var(--transition);
                white-space: nowrap;
            }
            
            #promptcraft-quick-invoke-container .promptcraft-category-tab:hover {
                background: var(--primary-light);
                color: white;
                border-color: var(--primary-light);
            }
            
            #promptcraft-quick-invoke-container .promptcraft-category-tab.active {
                background: var(--primary-color);
                color: white;
                border-color: var(--primary-color);
            }
            
            @media (prefers-color-scheme: dark) {
                #promptcraft-quick-invoke-container .promptcraft-category-tab {
                    background: var(--background-dark);
                    border-color: var(--border-dark);
                    color: var(--text-dark);
                }
            }
            
            /* 提示词列表 */
            #promptcraft-quick-invoke-container .promptcraft-prompt-list {
                max-height: 500px;
                overflow-y: auto;
                padding: 8px;
            }
            
            #promptcraft-quick-invoke-container .promptcraft-prompt-list::-webkit-scrollbar {
                width: 6px;
            }
            
            #promptcraft-quick-invoke-container .promptcraft-prompt-list::-webkit-scrollbar-track {
                background: transparent;
            }
            
            #promptcraft-quick-invoke-container .promptcraft-prompt-list::-webkit-scrollbar-thumb {
                background: var(--border-light);
                border-radius: 3px;
            }
            
            @media (prefers-color-scheme: dark) {
                #promptcraft-quick-invoke-container .promptcraft-prompt-list::-webkit-scrollbar-thumb {
                    background: var(--border-dark);
                }
            }
            
            /* 提示词项 */
            #promptcraft-quick-invoke-container .promptcraft-prompt-item {
                padding: 12px;
                margin-bottom: 4px;
                border: 1px solid transparent;
                border-radius: 8px;
                background: var(--background-light);
                cursor: pointer;
                transition: var(--transition);
            }
            
            #promptcraft-quick-invoke-container .promptcraft-prompt-item:hover {
                background: var(--card-light);
                border-color: var(--border-light);
            }
            
            #promptcraft-quick-invoke-container .promptcraft-prompt-item.selected {
                background: var(--primary-color);
                color: white;
                border-color: var(--primary-color);
            }
            
            @media (prefers-color-scheme: dark) {
                #promptcraft-quick-invoke-container .promptcraft-prompt-item {
                    background: var(--background-dark);
                }
                
                #promptcraft-quick-invoke-container .promptcraft-prompt-item:hover {
                    background: var(--card-dark);
                    border-color: var(--border-dark);
                }
            }
            
            /* 提示词标题 */
            #promptcraft-quick-invoke-container .promptcraft-prompt-title {
                font-weight: 600;
                font-size: 14px;
                margin-bottom: 4px;
                line-height: 1.4;
            }
            
            /* 提示词预览 */
            #promptcraft-quick-invoke-container .promptcraft-prompt-preview {
                font-size: 12px;
                opacity: 0.8;
                line-height: 1.4;
                margin-bottom: 6px;
            }
            
            /* 提示词分类 */
            #promptcraft-quick-invoke-container .promptcraft-prompt-category {
                display: flex;
                align-items: center;
                gap: 6px;
            }
            
            #promptcraft-quick-invoke-container .promptcraft-prompt-category .category {
                display: inline-block;
                padding: 2px 6px;
                background: var(--primary-light);
                color: white;
                border-radius: 4px;
                font-size: 10px;
                font-weight: 500;
            }
            
            #promptcraft-quick-invoke-container .promptcraft-prompt-item.selected .promptcraft-prompt-category .category {
                background: rgba(255, 255, 255, 0.2);
            }
            
            /* 无结果提示 */
            #promptcraft-quick-invoke-container .promptcraft-no-results {
                padding: 40px 20px;
                text-align: center;
                color: var(--text-light);
                opacity: 0.6;
                font-size: 14px;
            }
            
            @media (prefers-color-scheme: dark) {
                #promptcraft-quick-invoke-container .promptcraft-no-results {
                    color: var(--text-dark);
                }
            }
            
            /* 操作提示 */
            #promptcraft-quick-invoke-container .promptcraft-help-text {
                padding: 12px 16px;
                background: var(--card-light);
                border-top: 1px solid var(--border-light);
                font-size: 12px;
                color: var(--text-light);
                opacity: 0.8;
                text-align: center;
                font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
                line-height: 1.4;
            }
            
            #promptcraft-quick-invoke-container .promptcraft-help-main {
                margin-bottom: 4px;
                font-weight: 500;
            }
            
            #promptcraft-quick-invoke-container .promptcraft-help-trigger {
                font-size: 11px;
                opacity: 0.7;
            }
            
            #promptcraft-quick-invoke-container .promptcraft-help-keys {
                display: inline-block;
                padding: 2px 6px;
                background: rgba(99, 102, 241, 0.1);
                border: 1px solid rgba(99, 102, 241, 0.2);
                border-radius: 4px;
                font-family: 'Consolas', 'Monaco', monospace;
                font-size: 11px;
                font-weight: 600;
                color: #6366f1;
                margin: 0 2px;
            }
            
            #promptcraft-quick-invoke-container .promptcraft-help-command {
                display: inline-block;
                padding: 1px 4px;
                background: rgba(34, 197, 94, 0.1);
                border: 1px solid rgba(34, 197, 94, 0.2);
                border-radius: 3px;
                font-family: 'Consolas', 'Monaco', monospace;
                font-size: 11px;
                font-weight: 600;
                color: #22c55e;
                margin: 0 2px;
            }
            
            @media (prefers-color-scheme: dark) {
                #promptcraft-quick-invoke-container .promptcraft-help-text {
                    background: var(--card-dark);
                    border-top-color: var(--border-dark);
                    color: var(--text-dark);
                }
                
                #promptcraft-quick-invoke-container .promptcraft-help-keys {
                    background: rgba(99, 102, 241, 0.15);
                    border-color: rgba(99, 102, 241, 0.3);
                    color: #818cf8;
                }
                
                #promptcraft-quick-invoke-container .promptcraft-help-command {
                    background: rgba(34, 197, 94, 0.15);
                    border-color: rgba(34, 197, 94, 0.3);
                    color: #4ade80;
                }
            }
            
            /* 响应式设计 */
            @media (max-width: 768px) {
                #promptcraft-quick-invoke-container {
                    width: calc(100vw - 20px);
                    max-width: 600px;
                }
            }
            
            @media (max-width: 480px) {
                #promptcraft-quick-invoke-container {
                    width: calc(100vw - 20px);
                    max-width: 500px;
                }
            }
        `;
        
        document.head.appendChild(style);
    }
    
    // 全局状态管理
    const state = {
        isActive: false,
        isUIVisible: false,
        currentInput: null,
        uiContainer: null,
        prompts: [],
        filteredPrompts: [],
        selectedIndex: 0,
        lastInputValue: '',
        triggerPosition: -1,
        debounceTimer: null,
        isInitialized: false,
        selectedCategory: 'all', // 当前选中的分类
        searchTerm: '' // 当前搜索词
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
        console.log('PromptCraft Quick Invoke initialized');
        injectStyles(); // 注入CSS样式
        loadPrompts();
        setupEventListeners();
        setupCleanupHandlers();
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
                chrome.runtime.sendMessage({action: 'getPrompts'}, (response) => {
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
        // 使用捕获阶段监听，确保能够优先处理
        document.addEventListener('input', handleInputEvent, true);
        document.addEventListener('keydown', handleKeydownEvent, true);
        document.addEventListener('click', handleClickEvent, true);
        document.addEventListener('focus', handleFocusEvent, true);
        document.addEventListener('blur', handleBlurEvent, true);
        
        // 监听来自background的消息
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            if (message.action === 'promptsUpdated') {
                loadPrompts();
            }
        });
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
        
        console.log('PromptCraft: Input event detected on:', target.tagName, target.type || 'no-type');
        
        // 检查是否是可编辑的输入框
        if (!isEditableElement(target)) {
            console.log('PromptCraft: Element is not editable, ignoring');
            return;
        }
        
        console.log('PromptCraft: Valid input element detected');
        
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
        if (!inputElement) return;
        
        const text = getElementText(inputElement);
        state.lastInputValue = text;
        
        console.log('PromptCraft: Processing input change, text:', text);
        
        if (state.isUIVisible) {
            // 如果UI已激活，更新搜索
            updateSearch(text);
            return;
        }
        
        // 检查是否输入了触发词
        const triggerIndex = text.lastIndexOf(CONSTANTS.TRIGGER_COMMAND);
        console.log('PromptCraft: Trigger index:', triggerIndex, 'for command:', CONSTANTS.TRIGGER_COMMAND);
        
        if (triggerIndex === -1) return;
        
        // 检查触发词是否是单词边界或行首
        const isAtWordBoundary = triggerIndex === 0 || !isAlphaNumeric(text.charAt(triggerIndex - 1));
        const isFollowedBySpace = triggerIndex + CONSTANTS.TRIGGER_COMMAND.length === text.length || 
                                 text.charAt(triggerIndex + CONSTANTS.TRIGGER_COMMAND.length) === ' ';
        
        console.log('PromptCraft: Boundary check - isAtWordBoundary:', isAtWordBoundary, 'isFollowedBySpace:', isFollowedBySpace);
        
        // 只有当触发词在单词边界且后面是空格或文本结束时才触发
        if (isAtWordBoundary && isFollowedBySpace) {
            console.log('PromptCraft: Triggering UI at position:', triggerIndex);
            state.triggerPosition = triggerIndex;
            showQuickInvokeUI();
        }
    }
    
    // 工具函数
     function isAlphaNumeric(char) {
         return /[a-zA-Z0-9]/.test(char);
     }
    

    
    // 处理键盘事件
    function handleKeydownEvent(event) {
        // 如果UI未激活，不处理
        if (!state.isUIVisible) return;
        
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
    
    // 检查元素是否可编辑
    function isEditableElement(element) {
        if (!element) return false;
        
        const tagName = element.tagName.toLowerCase();
        
        // 标准输入框
        if (tagName === 'textarea' || (tagName === 'input' && element.type === 'text')) {
            return true;
        }
        
        // 富文本编辑器
        if (element.contentEditable === 'true') {
            return true;
        }
        
        return false;
    }
    
    // 获取元素文本内容
    function getElementText(element) {
        if (element.tagName.toLowerCase() === 'textarea' || element.tagName.toLowerCase() === 'input') {
            return element.value;
        } else if (element.contentEditable === 'true') {
            return element.textContent || element.innerText || '';
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
                
            } else if (element.contentEditable === 'true') {
                console.log('PromptCraft: Setting text for contenteditable element');
                // 对于contenteditable元素
                if (element.innerHTML !== undefined) {
                    console.log('PromptCraft: Using execCommand method');
                    // 使用Selection API模拟用户输入
                    element.focus();
                    const selection = window.getSelection();
                    const range = document.createRange();
                    range.selectNodeContents(element);
                    selection.removeAllRanges();
                    selection.addRange(range);
                    
                    // 清空并插入新内容
                    document.execCommand('selectAll', false, null);
                    document.execCommand('delete', false, null);
                    document.execCommand('insertText', false, text);
                } else {
                    console.log('PromptCraft: Using textContent assignment');
                    element.textContent = text;
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
            triggerComprehensiveEvents(element, previousValue, text);
            
        } catch (error) {
            console.warn('PromptCraft: Error in setElementText:', error);
            // 后备方案
            try {
                element.value = text;
                triggerComprehensiveEvents(element, '', text);
            } catch (fallbackError) {
                console.error('PromptCraft: Fallback setElementText also failed:', fallbackError);
            }
        }
    }
    
    // 显示快速调用UI
    function showQuickInvokeUI() {
        // 防止重复激活
        if (state.isUIVisible) {
            return;
        }
        
        // 检查是否有有效的输入元素
        if (!state.currentInput) {
            console.warn('PromptCraft: No valid input element found');
            return;
        }
        
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
            }
        }, 10);
        
        console.log('PromptCraft: Quick invoke UI activated');
    }
    
    // 隐藏快速调用UI
    function hideQuickInvokeUI() {
        if (!state.isUIVisible) return;
        
        state.isUIVisible = false;
        state.isActive = false;
        
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
    
    // 定位UI - 智能定位算法
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
            const uiWidth = uiRect.width || 400; // 使用实际宽度，回退到预估值
            const uiHeight = uiRect.height || 500; // 使用实际高度，回退到预估值
            
            // 计算最佳位置
            let left = inputRect.left + scrollLeft;
            let top = inputRect.bottom + scrollTop + CONSTANTS.POSITION_OFFSET;
            
            // 水平位置调整 - 确保不超出视口
            if (left + uiWidth > viewportWidth) {
                left = Math.max(10, viewportWidth - uiWidth - 10);
            }
            
            // 垂直位置调整 - 如果下方空间不足，显示在上方
            const spaceBelow = viewportHeight - (inputRect.bottom - scrollTop);
            const spaceAbove = inputRect.top - scrollTop;
            
            if (spaceBelow < uiHeight && spaceAbove > spaceBelow) {
                // 显示在输入框上方
                top = inputRect.top + scrollTop - uiHeight - CONSTANTS.POSITION_OFFSET;
            }
            
            // 确保不超出视口顶部
            if (top < scrollTop + 10) {
                top = scrollTop + 10;
            }
            
            // 应用位置样式
            state.uiContainer.style.position = 'absolute';
            state.uiContainer.style.left = left + 'px';
            state.uiContainer.style.top = top + 'px';
            state.uiContainer.style.zIndex = '2147483647';
            
        } catch (error) {
            console.warn('PromptCraft: Error positioning UI:', error);
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
                <div class="promptcraft-prompt-title">${escapeHtml(prompt.title)}</div>
                <div class="promptcraft-prompt-preview">${escapeHtml(prompt.content.substring(0, 100))}${prompt.content.length > 100 ? '...' : ''}</div>
                ${prompt.category ? `<div class="promptcraft-prompt-category"><span class="category">${escapeHtml(prompt.category)}</span></div>` : ''}
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
        console.log('PromptCraft: insertPrompt called with prompt:', prompt);
        console.log('PromptCraft: Current input element:', state.currentInput);
        
        if (!state.currentInput || !prompt) {
            console.warn('PromptCraft: Cannot insert prompt - missing input element or prompt');
            return;
        }
        
        try {
            const currentText = getElementText(state.currentInput);
            console.log('PromptCraft: Current text before insertion:', currentText);
            console.log('PromptCraft: Trigger position:', state.triggerPosition);
            console.log('PromptCraft: Prompt content to insert:', prompt.content);
            
            let newText;
            let cursorPosition;
            
            // 如果有记录的触发位置，精确替换
            if (state.triggerPosition >= 0) {
                const beforeTrigger = currentText.substring(0, state.triggerPosition);
                const afterTrigger = currentText.substring(state.triggerPosition + CONSTANTS.TRIGGER_COMMAND.length);
                newText = beforeTrigger + prompt.content + afterTrigger;
                cursorPosition = state.triggerPosition + prompt.content.length;
                console.log('PromptCraft: Using trigger position method');
                console.log('PromptCraft: Before trigger:', beforeTrigger);
                console.log('PromptCraft: After trigger:', afterTrigger);
            } else {
                // 后备方案：移除末尾的触发词
                const triggerRegex = new RegExp(CONSTANTS.TRIGGER_COMMAND.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$');
                newText = currentText.replace(triggerRegex, prompt.content);
                cursorPosition = newText.length;
                console.log('PromptCraft: Using regex replacement method');
            }
            
            console.log('PromptCraft: New text to set:', newText);
            console.log('PromptCraft: Cursor position:', cursorPosition);
            
            // 设置文本内容
            setElementText(state.currentInput, newText);
            
            // 验证文本是否设置成功
            const verifyText = getElementText(state.currentInput);
            console.log('PromptCraft: Text after setting:', verifyText);
            console.log('PromptCraft: Text setting successful:', verifyText === newText);
            
            // 设置光标位置
            setCursorPosition(state.currentInput, cursorPosition);
            
            // 触发额外的事件以确保网站响应
            triggerInputEvents(state.currentInput);
            
            // 关闭UI
            hideQuickInvokeUI();
            
            // 聚焦回输入框
            setTimeout(() => {
                try {
                    state.currentInput.focus();
                } catch (error) {
                    console.warn('PromptCraft: Failed to focus input after insertion:', error);
                }
            }, 50);
            
            console.log('PromptCraft: Prompt inserted successfully:', prompt.title);
            
        } catch (error) {
            console.error('PromptCraft: Error inserting prompt:', error);
            hideQuickInvokeUI();
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
    
    // 触发输入事件 - 改进版本，参考quick-prompt最佳实践
    function triggerInputEvents(element) {
        try {
            triggerComprehensiveEvents(element);
        } catch (error) {
            console.warn('PromptCraft: Failed to trigger input events:', error);
        }
    }
    
    // 触发全面的事件以确保现代框架兼容性
    function triggerComprehensiveEvents(element, previousValue = '', newValue = '') {
        try {
            // 立即触发关键事件，模拟真实用户输入
            const createInputEvent = (type, bubbles = true) => {
                const event = new Event(type, { bubbles, cancelable: true });
                // 为React等框架设置必要的属性
                Object.defineProperty(event, 'target', { writable: false, value: element });
                Object.defineProperty(event, 'currentTarget', { writable: false, value: element });
                return event;
            };
            
            // 立即触发input事件
            element.dispatchEvent(createInputEvent('input'));
            
            // 模拟键盘输入序列
            setTimeout(() => {
                try {
                    // 触发beforeinput事件（现代浏览器支持）
                    if (typeof InputEvent !== 'undefined') {
                        const beforeInputEvent = new InputEvent('beforeinput', {
                            bubbles: true,
                            cancelable: true,
                            inputType: 'insertText',
                            data: newValue
                        });
                        element.dispatchEvent(beforeInputEvent);
                    }
                    
                    // 触发键盘事件序列
                    const keyboardEvents = [
                        { type: 'keydown', key: 'Unidentified', keyCode: 229 }, // 输入法组合键
                        { type: 'compositionstart' },
                        { type: 'compositionupdate', data: newValue },
                        { type: 'compositionend', data: newValue },
                        { type: 'input' },
                        { type: 'keyup', key: 'Unidentified', keyCode: 229 }
                    ];
                    
                    keyboardEvents.forEach((eventConfig, index) => {
                        setTimeout(() => {
                            try {
                                let event;
                                if (eventConfig.type.startsWith('composition')) {
                                    event = new CompositionEvent(eventConfig.type, {
                                        bubbles: true,
                                        cancelable: true,
                                        data: eventConfig.data || ''
                                    });
                                } else if (eventConfig.type.startsWith('key')) {
                                    event = new KeyboardEvent(eventConfig.type, {
                                        bubbles: true,
                                        cancelable: true,
                                        key: eventConfig.key || 'Unidentified',
                                        keyCode: eventConfig.keyCode || 0,
                                        which: eventConfig.keyCode || 0
                                    });
                                } else {
                                    event = createInputEvent(eventConfig.type);
                                }
                                element.dispatchEvent(event);
                            } catch (e) {
                                // 忽略单个事件错误
                            }
                        }, index * 5); // 每个事件间隔5ms
                    });
                } catch (e) {
                    console.warn('PromptCraft: Failed to trigger keyboard sequence:', e);
                }
            }, 0);
            
            // React特殊处理
            setTimeout(() => {
                try {
                    // 检测React Fiber
                    const reactFiberKey = Object.keys(element).find(key => 
                        key.startsWith('__reactInternalInstance') || key.startsWith('__reactFiber')
                    );
                    
                    if (reactFiberKey) {
                        // React组件检测到，触发React特定事件
                        const reactEvent = createInputEvent('input');
                        
                        // 设置React SyntheticEvent属性
                        Object.defineProperty(reactEvent, 'nativeEvent', {
                            writable: false,
                            value: reactEvent
                        });
                        
                        element.dispatchEvent(reactEvent);
                        
                        // 强制触发change事件
                        setTimeout(() => {
                            element.dispatchEvent(createInputEvent('change'));
                        }, 10);
                    }
                    
                    // Vue检测和处理
                    if (element.__vue__ || element._vModifiers || element.__vueParentContext) {
                        const vueEvent = createInputEvent('input');
                        element.dispatchEvent(vueEvent);
                        
                        // Vue的v-model通常监听input事件
                        setTimeout(() => {
                            element.dispatchEvent(createInputEvent('change'));
                        }, 10);
                    }
                    
                    // Angular检测
                    if (element.ng || element.__ngContext__) {
                        const angularEvent = createInputEvent('input');
                        element.dispatchEvent(angularEvent);
                    }
                    
                } catch (e) {
                    console.warn('PromptCraft: Failed to trigger framework-specific events:', e);
                }
            }, 20);
            
            // 最终确保事件
            setTimeout(() => {
                try {
                    // 最后的input和change事件确保
                    ['input', 'change', 'blur'].forEach(eventType => {
                        const event = createInputEvent(eventType);
                        element.dispatchEvent(event);
                    });
                    
                    // 自定义事件通知
                    const customEvent = new CustomEvent('promptcraft-text-inserted', {
                        bubbles: true,
                        detail: { 
                            element: element, 
                            previousValue: previousValue,
                            newValue: newValue,
                            timestamp: Date.now() 
                        }
                    });
                    element.dispatchEvent(customEvent);
                    
                } catch (e) {
                    console.warn('PromptCraft: Failed to trigger final events:', e);
                }
            }, 50);
            
        } catch (error) {
            console.warn('PromptCraft: Failed to trigger comprehensive events:', error);
        }
    }
    
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
    
})();