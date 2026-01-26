// sidepanel.js

/**
 * PromptCraft - 本地提示词管理工具
 * 版本: 1.4.0
 * 描述: 纯本地存储的提示词管理扩展，无需登录，保护隐私
 */

// 全局状态变量
let allPrompts = [];
let currentUser = null;
let isProcessingContextMenu = false;



// 应用启动入口
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => app.initializeApp(), { once: true });
} else {
    app.initializeApp();
}

