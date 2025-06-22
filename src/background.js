// background.js

// 导入UUID工具模块和数据服务模块
importScripts('utils/uuid.js');
importScripts('utils/data-service.js');

// 导入 Supabase 库和认证处理器
importScripts('libs/supabase.min.js');
importScripts('background/auth-handler.js');

// 导入同步服务
importScripts('utils/sync-service.js');

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
        
        // 首先进行数据迁移（处理现有用户数据）
        await dataService.migrateExistingUserData();
        
        // 检查是否已经加载过默认模板
        const isTemplatesLoaded = await dataService.isDefaultTemplatesLoaded();
        
        if (!isTemplatesLoaded) {
            // 将默认提示词复制到用户区域（生成新的用户ID）
            await dataService.copyDefaultPromptsToUserArea(defaultPrompts);
            
            // 标记默认模板已加载
            await dataService.setDefaultTemplatesLoaded();
            
            console.log('PromptCraft: Default prompts copied to user area, count:', defaultPrompts.length);
        } else {
            console.log('PromptCraft: Default templates already loaded, skipping...');
        }
        
        await dataService.setHasData(true);
        await dataService.setThemeMode('auto'); // 默认主题设置
        
        console.log('PromptCraft: Initialization completed successfully');
        
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
  
  // 监听来自content script和sidepanel的消息
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    // 处理content script的getPrompts请求（保持向后兼容）
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
    
    // 处理sidepanel的GET_ALL_PROMPTS请求（新的消息驱动架构）
    if (message.type === 'GET_ALL_PROMPTS') {
      console.log('PromptCraft: 收到GET_ALL_PROMPTS消息请求');
      
      (async () => {
        try {
          // 调用数据服务获取所有提示词
          const prompts = await dataService.getAllPrompts();
          
          // 检查是否有加载错误
          const loadError = await dataService.getLoadError();
          
          console.log('PromptCraft: 成功获取提示词数据，数量:', prompts.length);
          
          // 返回标准化的响应格式
          sendResponse({
            success: true,
            data: prompts,
            error: null,
            loadError: loadError.hasError ? {
              hasError: true,
              message: loadError.message || '数据加载存在问题'
            } : null
          });
          
        } catch (error) {
          console.error('PromptCraft: 处理GET_ALL_PROMPTS请求时发生错误:', error);
          
          // 返回错误响应
          sendResponse({
            success: false,
            data: null,
            error: `获取提示词失败: ${error.message}`
          });
        }
      })();
      
      return true; // 保持消息通道开放以支持异步响应
    }
    
    // 处理ADD_PROMPT请求（添加新提示词）
    if (message.type === 'ADD_PROMPT') {
      console.log('PromptCraft: 收到ADD_PROMPT消息请求');
      
      (async () => {
        try {
          // 调用数据服务添加提示词
          const savedPrompt = await dataService.addPrompt(message.payload);
          
          console.log('PromptCraft: 成功添加提示词，ID:', savedPrompt.id);
          
          // 返回成功响应
          sendResponse({
            success: true,
            data: savedPrompt
          });
          
        } catch (error) {
          console.error('PromptCraft: 处理ADD_PROMPT请求时发生错误:', error);
          
          // 返回错误响应
          sendResponse({
            success: false,
            error: error.message
          });
        }
      })();
      
      return true; // 保持消息通道开放以支持异步响应
    }
    
    // 处理UPDATE_PROMPT请求（更新提示词）
    if (message.type === 'UPDATE_PROMPT') {
      console.log('PromptCraft: 收到UPDATE_PROMPT消息请求');
      
      (async () => {
        try {
          // 调用数据服务更新提示词
          const updatedPrompt = await dataService.updatePrompt(message.payload.id, message.payload.data);
          
          console.log('PromptCraft: 成功更新提示词，ID:', message.payload.id);
          
          // 返回成功响应
          sendResponse({
            success: true,
            data: updatedPrompt
          });
          
        } catch (error) {
          console.error('PromptCraft: 处理UPDATE_PROMPT请求时发生错误:', error);
          
          // 返回错误响应
          sendResponse({
            success: false,
            error: error.message
          });
        }
      })();
      
      return true; // 保持消息通道开放以支持异步响应
    }
    
    // 处理DELETE_PROMPT请求（删除提示词）
    if (message.type === 'DELETE_PROMPT') {
      console.log('PromptCraft: 收到DELETE_PROMPT消息请求');
      
      (async () => {
        try {
          // 调用数据服务删除提示词
          const success = await dataService.deletePrompt(message.payload);
          
          console.log('PromptCraft: 成功删除提示词，ID:', message.payload);
          
          // 返回成功响应
          sendResponse({
            success: true,
            data: success
          });
          
        } catch (error) {
          console.error('PromptCraft: 处理DELETE_PROMPT请求时发生错误:', error);
          
          // 返回错误响应
          sendResponse({
            success: false,
            error: error.message
          });
        }
      })();
      
      return true; // 保持消息通道开放以支持异步响应
    }
    
    // 处理GET_THEME_MODE请求（获取主题模式）
    if (message.type === 'GET_THEME_MODE') {
      console.log('PromptCraft: 收到GET_THEME_MODE消息请求');
      
      (async () => {
        try {
          const themeMode = await dataService.getThemeMode();
          
          console.log('PromptCraft: 成功获取主题模式:', themeMode);
          
          sendResponse({
            success: true,
            data: themeMode
          });
          
        } catch (error) {
          console.error('PromptCraft: 处理GET_THEME_MODE请求时发生错误:', error);
          
          sendResponse({
            success: false,
            error: error.message
          });
        }
      })();
      
      return true;
    }
    
    // 处理SET_THEME_MODE请求（设置主题模式）
    if (message.type === 'SET_THEME_MODE') {
      console.log('PromptCraft: 收到SET_THEME_MODE消息请求');
      
      (async () => {
        try {
          await dataService.setThemeMode(message.payload);
          
          console.log('PromptCraft: 成功设置主题模式:', message.payload);
          
          sendResponse({
            success: true
          });
          
        } catch (error) {
          console.error('PromptCraft: 处理SET_THEME_MODE请求时发生错误:', error);
          
          sendResponse({
            success: false,
            error: error.message
          });
        }
      })();
      
      return true;
    }
    
    // 处理CLEAR_ALL_PROMPTS请求（清空所有提示词）
    if (message.type === 'CLEAR_ALL_PROMPTS') {
      console.log('PromptCraft: 收到CLEAR_ALL_PROMPTS消息请求');
      
      (async () => {
        try {
          await dataService.clearAllPrompts();
          
          console.log('PromptCraft: 成功清空所有提示词');
          
          sendResponse({
            success: true
          });
          
        } catch (error) {
          console.error('PromptCraft: 处理CLEAR_ALL_PROMPTS请求时发生错误:', error);
          
          sendResponse({
            success: false,
            error: error.message
          });
        }
      })();
      
      return true;
    }
    
    // 处理IMPORT_PROMPTS请求（导入提示词）
    if (message.type === 'IMPORT_PROMPTS') {
      console.log('PromptCraft: 收到IMPORT_PROMPTS消息请求');
      
      (async () => {
        try {
          const { importedPrompts } = message.payload;
          
          // 获取现有提示词
          const existingPrompts = await dataService.getAllPrompts();
          
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
          
          // 保存最终数据
          await dataService.setAllPrompts(finalPrompts);
          
          console.log('PromptCraft: 成功导入提示词，新增:', addedCount, '更新:', updatedCount);
          
          sendResponse({ 
            success: true, 
            data: {
              addedCount,
              updatedCount,
              total: importedPrompts.length
            }
          });
          
        } catch (error) {
          console.error('PromptCraft: 处理IMPORT_PROMPTS请求时发生错误:', error);
          
          sendResponse({
            success: false,
            error: error.message
          });
        }
      })();
      
      return true;
    }
    
    // 处理LOGIN_WITH_GOOGLE请求（Google登录）
    if (message.type === 'LOGIN_WITH_GOOGLE') {
      console.log('Background: 收到LOGIN_WITH_GOOGLE消息请求');
      
      (async () => {
        try {
          if (!authServiceInstance) {
            throw new Error('认证服务未初始化');
          }
          
          console.log('Background: 开始执行Google登录流程...');
          
          // 创建进度回调函数
          const progressCallback = message.progressCallback ? (stage, progressMessage) => {
            // 向sidepanel发送进度更新
            chrome.runtime.sendMessage({
              type: 'LOGIN_PROGRESS',
              stage: stage,
              message: progressMessage
            }).catch(err => {
              console.log('Background: 发送登录进度消息失败（可能sidepanel未打开）:', err);
            });
          } : null;
          
          const result = await authServiceInstance.signInWithGoogle(progressCallback);
          
          if (result && result.success) {
            console.log('Background: Google登录成功，用户:', result.user.email);
            
            // UI更新由sync-service的认证状态监听器统一处理，避免重复发送
            
            sendResponse({
              success: true,
              data: result
            });
          } else {
            throw new Error('登录失败，未返回有效结果');
          }
          
        } catch (error) {
          console.error('Background: Google登录失败:', error);
          
          // 向 sidepanel 发送错误通知
          chrome.runtime.sendMessage({
            type: 'LOGIN_ERROR',
            error: error.message
          }).catch(err => {
            console.log('Background: 发送登录错误消息失败（可能sidepanel未打开）:', err);
          });
          
          sendResponse({
            success: false,
            error: error.message
          });
        }
      })();
      
      return true;
     }
     
     // 处理LOGOUT请求（退出登录）
     if (message.type === 'LOGOUT') {
       console.log('Background: 收到LOGOUT消息请求');
       
       (async () => {
         try {
           if (!authServiceInstance) {
             throw new Error('认证服务未初始化');
           }
           
           console.log('Background: 开始执行退出登录流程...');
           await authServiceInstance.signOut();
           
           console.log('Background: 退出登录成功');
           
           // UI更新由sync-service的认证状态监听器统一处理，避免重复发送
           
           sendResponse({
             success: true
           });
           
         } catch (error) {
           console.error('Background: 退出登录失败:', error);
           
           // 向 sidepanel 发送错误通知
           chrome.runtime.sendMessage({
             type: 'LOGOUT_ERROR',
             error: error.message
           }).catch(err => {
             console.log('Background: 发送退出错误消息失败（可能sidepanel未打开）:', err);
           });
           
           sendResponse({
             success: false,
             error: error.message
           });
         }
       })();
       
       return true;
     }
     
     // 处理MANUAL_SYNC请求（手动同步）
     if (message.type === 'MANUAL_SYNC') {
       console.log('Background: 收到MANUAL_SYNC消息请求');
       
       (async () => {
         try {
           if (!syncServiceInstance) {
             throw new Error('同步服务未初始化');
           }
           
           console.log('Background: 开始执行手动同步...');
           await syncServiceInstance.performFullSync();
           
           console.log('Background: 手动同步完成');
           
           sendResponse({
             success: true
           });
           
         } catch (error) {
           console.error('Background: 手动同步失败:', error);
           
           sendResponse({
             success: false,
             error: error.message
           });
         }
       })();
       
       return true;
     }
   });
  
// 服务实例管理
let authServiceInstance = null;
let dataServiceInstance = null;
let syncServiceInstance = null;

// 初始化所有服务
async function initializeServices() {
  try {
    // 1. 创建认证服务实例
    if (typeof authService !== 'undefined') {
      authServiceInstance = authService;
      console.log('PromptCraft: authService 实例创建成功');
    } else {
      console.error('PromptCraft: authService 未定义');
      return;
    }
    
    // 2. 创建数据服务实例
    if (typeof dataService !== 'undefined') {
      dataServiceInstance = dataService;
      console.log('PromptCraft: dataService 实例创建成功');
    } else {
      console.error('PromptCraft: dataService 未定义');
      return;
    }
    
    // 3. 创建同步服务实例并注入依赖
    if (typeof SyncService !== 'undefined') {
      syncServiceInstance = new SyncService(
        authServiceInstance,
        dataServiceInstance,
        supabaseClient
      );
      
      // 设置 dataService 的同步服务引用
      dataServiceInstance.setSyncService(syncServiceInstance);
      
      // 初始化同步服务
      await syncServiceInstance.initialize();
      
      console.log('PromptCraft: SyncService 实例创建并初始化成功');
    } else {
      console.error('PromptCraft: SyncService 未定义');
    }
    
  } catch (error) {
    console.error('PromptCraft: 服务初始化失败:', error);
  }
}

// 在扩展启动时初始化服务
initializeServices();
  