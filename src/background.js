// background.js

// 导入UUID工具模块和数据服务模块
importScripts('utils/uuid.js');
importScripts('utils/data-service.js');

// 导入 Supabase 库和认证处理器
importScripts('libs/supabase.min.js');
importScripts('background/auth-handler.js');

// 从default-prompts.json加载默认提示词数据
async function loadDefaultPromptsToMemory() {
    try {
        // 检查是否已经初始化过
        const hasData = await dataService.hasData();
        if (hasData) {
            const prompts = await dataService.getAllPrompts();
            console.log('PromptCraft: Already initialized, prompts count:', prompts.length);
            return;
        }
        
        console.log('PromptCraft: First time installation, loading default prompts...');
        
        // 从default-prompts.json文件加载默认数据
        const fileUrl = chrome.runtime.getURL('assets/data/default-prompts.json');
        console.log('PromptCraft: Attempting to fetch from URL:', fileUrl);
        
        const response = await fetch(fileUrl);
        console.log('PromptCraft: Fetch response status:', response.status, response.statusText);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const defaultPrompts = await response.json();
        
        // 为每个提示词添加完整的数据结构
        const processedPrompts = defaultPrompts.map((prompt) => ({
            ...prompt,
            id: prompt.id || UUIDUtils.generateUUID(), // 使用现有id或生成新的UUID
            user_id: 'local-user',
            created_at: prompt.created_at || new Date().toISOString(),
            updated_at: prompt.updated_at || new Date().toISOString(),
            is_deleted: prompt.is_deleted || false
        }));
        
        // 将处理后的数据保存到存储
        await dataService.setAllPrompts(processedPrompts);
        await dataService.setHasData(true);
        await dataService.setThemeMode('auto'); // 默认主题设置
        
        console.log('PromptCraft: Default prompts loaded successfully, count:', processedPrompts.length);
        
    } catch (error) {
        console.error('PromptCraft: Failed to load default prompts:', error);
        console.error('PromptCraft: Error type:', error.constructor.name);
        console.error('PromptCraft: Error message:', error.message);
        console.error('PromptCraft: Error stack:', error.stack);
        
        // 如果加载失败，设置空数据但标记为已初始化
        await dataService.setAllPrompts([]);
        await dataService.setHasData(true);
        await dataService.setLoadError(true, `加载默认提示词失败: ${error.message}`);
        await dataService.setThemeMode('auto');
        console.log('PromptCraft: Error state saved, extension will show empty list');
    }
}

// 当插件首次安装、更新或浏览器启动时运行
chrome.runtime.onInstalled.addListener(async () => {
    // 先移除可能存在的菜单项，避免重复创建错误
    chrome.contextMenus.removeAll(() => {
        // 创建一个右键菜单项
        chrome.contextMenus.create({
          id: "add-to-promptcraft",
          title: "添加到 Prompt管理助手",
          contexts: ["selection"] // 只在用户选中文本时显示
        });
    });
    
    // 加载默认提示词到内存
    await loadDefaultPromptsToMemory();
});

// 当浏览器启动时也加载默认数据（如果需要）
chrome.runtime.onStartup.addListener(async () => {
    await loadDefaultPromptsToMemory();
});
  
  // 监听右键菜单的点击事件
  chrome.contextMenus.onClicked.addListener((info, tab) => {
    // 确保是我们的菜单项被点击
    if (info.menuItemId === "add-to-promptcraft" && info.selectionText) {
      
      // 打开侧边栏
      chrome.sidePanel.open({ windowId: tab.windowId });
  
      // 向侧边栏发送消息，传递选中的文本
      // 使用更长的延迟来确保侧边栏有足够的时间来加载和设置监听器
      setTimeout(() => {
          chrome.runtime.sendMessage({
              type: "ADD_FROM_CONTEXT_MENU",
              data: {
                  content: info.selectionText
              }
          }, (response) => {
              if (chrome.runtime.lastError) {
                  // 如果侧边栏还没准备好，实现重试逻辑
                  console.log("Error sending message:", chrome.runtime.lastError.message);
                  console.log("尝试重新发送消息...");
                  setTimeout(() => {
                       chrome.runtime.sendMessage({
                           type: "ADD_FROM_CONTEXT_MENU",
                           data: {
                               content: info.selectionText
                           }
                       }, (retryResponse) => {
                           if (chrome.runtime.lastError) {
                               console.log("重试发送消息失败:", chrome.runtime.lastError.message);
                           } else {
                               console.log("重试发送消息成功:", retryResponse);
                           }
                       });
                   }, 300);
              } else {
                  console.log("Message sent successfully, response:", response);
              }
          });
      }, 400); // 优化延迟时间，平衡稳定性和响应速度
    }
  });
  
  // 当点击插件图标时，打开侧边栏
  chrome.action.onClicked.addListener((tab) => {
    chrome.sidePanel.open({ windowId: tab.windowId });
  });
  
  // 监听来自content script的消息
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'getPrompts') {
      // 从数据服务中获取提示词数据
      (async () => {
        try {
          const loadError = await dataService.getLoadError();
        if (loadError.hasError) {
            const errorMessage = loadError.message;
            sendResponse({ 
              prompts: [], 
              loadError: true, 
              errorMessage: errorMessage || '加载默认提示词失败' 
            });
          } else {
            const prompts = await dataService.getAllPrompts();
            sendResponse({ prompts: prompts });
          }
        } catch (error) {
          console.error('Error getting prompts:', error);
          sendResponse({ prompts: [], loadError: true, errorMessage: '获取提示词失败' });
        }
      })();
      return true; // 保持消息通道开放以支持异步响应
    }
  });
  