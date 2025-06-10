/**
 * PromptCraft 后台服务脚本
 * 处理右键菜单、快捷键、侧边栏控制等后台功能
 */

// 插件安装时的初始化
chrome.runtime.onInstalled.addListener(() => {
  console.log('PromptCraft 插件已安装');
  
  // 创建右键菜单
  createContextMenus();
  
  // 设置默认侧边栏状态
  // chrome.storage.local.set({
  //   sidebarVisible: false
  // });
});

/**
 * 创建右键菜单
 */
function createContextMenus() {
  // 清除现有菜单
  chrome.contextMenus.removeAll(() => {
    // 创建主菜单项
    chrome.contextMenus.create({
      id: 'promptcraft-add',
      title: '添加到 PromptCraft',
      contexts: ['selection'], // 只在选中文本时显示
      documentUrlPatterns: ['http://*/*', 'https://*/*'] // 只在网页中显示
    });
    
    // 创建快速添加子菜单
    chrome.contextMenus.create({
      id: 'promptcraft-add-quick',
      parentId: 'promptcraft-add',
      title: '快速添加',
      contexts: ['selection']
    });
    
    // 创建编辑后添加子菜单
    chrome.contextMenus.create({
      id: 'promptcraft-add-edit',
      parentId: 'promptcraft-add',
      title: '编辑后添加',
      contexts: ['selection']
    });
  });
}

/**
 * 处理右键菜单点击事件
 */
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId.startsWith('promptcraft-add')) {
    const selectedText = info.selectionText;
    
    if (!selectedText) {
      console.warn('未选中任何文本');
      return;
    }
    
    try {
      // 在用户手势的直接响应中打开侧边栏
      await chrome.sidePanel.setOptions({ enabled: true });
      await chrome.sidePanel.open({ windowId: tab.windowId });
      await chrome.storage.local.set({ sidebarVisible: true });
      
      // 根据菜单项类型处理
      if (info.menuItemId === 'promptcraft-add-quick') {
        // 快速添加：直接保存到默认分类
        await handleQuickAdd(selectedText, tab);
      } else if (info.menuItemId === 'promptcraft-add-edit') {
        // 编辑后添加：打开编辑界面
        await handleEditAdd(selectedText, tab);
      }
    } catch (error) {
      console.error('处理右键菜单失败:', error);
      // 显示错误通知
      showNotification('添加失败', error.message, 'error');
    }
  }
});

/**
 * 处理快捷键命令
 */
chrome.commands.onCommand.addListener(async (command) => {
  if (command === 'toggle-sidebar') {
    try {
      // 获取当前活动标签页
      const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      if (activeTab) {
        // 在用户手势的直接响应中切换侧边栏
        const result = await chrome.storage.local.get('sidebarVisible');
        const isVisible = result.sidebarVisible || false;
        
        if (isVisible) {
          await chrome.sidePanel.setOptions({ enabled: false });
          await chrome.storage.local.set({ sidebarVisible: false });
        } else {
          await chrome.sidePanel.setOptions({ enabled: true });
          await chrome.sidePanel.open({ windowId: activeTab.windowId });
          await chrome.storage.local.set({ sidebarVisible: true });
        }
      }
    } catch (error) {
      console.error('切换侧边栏失败:', error);
    }
  } else if (command === 'quick-add-prompt') {
    try {
      // 获取当前活动标签页
      const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      if (activeTab) {
        // 获取选中的文本
        const response = await chrome.tabs.sendMessage(activeTab.id, { type: 'GET_SELECTION' });
        
        if (response && response.success && response.text) {
          // 在用户手势的直接响应中打开侧边栏
          await chrome.sidePanel.setOptions({ enabled: true });
          await chrome.sidePanel.open({ windowId: activeTab.windowId });
          await chrome.storage.local.set({ sidebarVisible: true });
          
          // 快速添加选中文本
          await handleQuickAdd(response.text, activeTab);
        } else {
          showNotification('快速添加失败', '请先选中要添加的文本', 'warning');
        }
      }
    } catch (error) {
      console.error('快速添加失败:', error);
      showNotification('快速添加失败', error.message, 'error');
    }
  }
});

/**
 * 处理来自内容脚本和侧边栏的消息
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type) {
    case 'TOGGLE_SIDEBAR':
      handleToggleSidebar(sender.tab?.id)
        .then(() => sendResponse({ success: true }))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true; // 保持消息通道开放
      
    case 'ADD_SELECTED_TEXT':
      handleAddSelectedText(message.data, sender.tab)
        .then(() => sendResponse({ success: true }))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true;
      
    case 'SHOW_NOTIFICATION':
      showNotification(message.title, message.message, message.type);
      sendResponse({ success: true });
      break;
      
    case 'GET_SELECTED_TEXT':
      // 请求内容脚本获取选中文本
      if (sender.tab) {
        chrome.tabs.sendMessage(sender.tab.id, { type: 'GET_SELECTION' })
          .then(response => sendResponse(response))
          .catch(error => sendResponse({ success: false, error: error.message }));
        return true;
      }
      break;
      
    default:
      console.warn('未知消息类型:', message.type);
  }
});

/**
 * 确保侧边栏已打开 (此函数现在仅检查状态，不主动打开)
 * @param {number} tabId - 标签页ID
 * @returns {Promise<boolean>} - 返回侧边栏是否可见
 */
async function ensureSidebarOpen(tabId) {
  try {
    const result = await chrome.storage.local.get('sidebarVisible');
    return result.sidebarVisible || false;
  } catch (error) {
    console.error('检查侧边栏状态失败:', error);
    return false; // 发生错误时，假设侧边栏不可见
  }
}

/**
 * 打开侧边栏 (此函数应在用户手势响应中调用)
 * @param {number} tabId - 标签页ID
 */
async function openSidebar(tabId) {
  try {
    // 先检查侧边栏是否已经打开
    const result = await chrome.storage.local.get('sidebarVisible');
    const isVisible = result.sidebarVisible || false;
    
    if (isVisible) {
      console.log('侧边栏已经打开，无需重复打开');
      return;
    }
    
    await chrome.sidePanel.setOptions({ enabled: true });
    const tab = await chrome.tabs.get(tabId);
    await chrome.sidePanel.open({ windowId: tab.windowId });
    await chrome.storage.local.set({ sidebarVisible: true });
    console.log('侧边栏已打开');
  } catch (error) {
    console.error('手动打开侧边栏失败:', error);
    // 根据PRD，这里可以考虑显示一个通知给用户，提示侧边栏打开失败
    // showNotification('侧边栏操作失败', '无法打开侧边栏，请重试或检查插件权限。', 'error');
    throw new Error('无法打开侧边栏');
  }
}

/**
 * 切换侧边栏显示状态
 * @param {number} tabId - 标签页ID
 */
async function toggleSidebar(tabId) {
  try {
    const result = await chrome.storage.local.get('sidebarVisible');
    const isVisible = result.sidebarVisible || false;
    
    if (isVisible) {
      // 关闭侧边栏
      await chrome.sidePanel.setOptions({ enabled: false });
      await chrome.storage.local.set({ sidebarVisible: false });
      console.log('侧边栏已关闭');
    } else {
      // 打开侧边栏 - 调用新的 openSidebar 函数
      await openSidebar(tabId);
    }
  } catch (error) {
    console.error('切换侧边栏失败:', error);
    throw error;
  }
}

/**
 * 处理切换侧边栏请求
 * @param {number} tabId - 标签页ID
 */
async function handleToggleSidebar(tabId) {
  if (tabId) {
    await toggleSidebar(tabId);
  } else {
    throw new Error('无效的标签页ID');
  }
}

/**
 * 处理快速添加
 * @param {string} selectedText - 选中的文本
 * @param {Object} tab - 标签页信息
 */
async function handleQuickAdd(selectedText, tab) {
  try {
    // 生成标题（取前30个字符）
    const title = selectedText.length > 30 
      ? selectedText.substring(0, 30) + '...' 
      : selectedText;
    
    // 构造提示词数据
    const promptData = {
      title: title,
      content: selectedText,
      category: '快速收藏',
      source_url: tab.url,
      source_title: tab.title
    };
    
    // 通过存储传递数据，避免消息传递问题
    await chrome.storage.local.set({
      'pending_quick_add': promptData,
      'pending_quick_add_timestamp': Date.now()
    });
    
    // 显示成功通知
    showNotification('添加成功', `已将"${title}"添加到快速收藏`, 'success');
    
  } catch (error) {
    console.error('快速添加失败:', error);
    throw new Error('快速添加失败: ' + error.message);
  }
}

/**
 * 处理编辑后添加
 * @param {string} selectedText - 选中的文本
 * @param {Object} tab - 标签页信息
 */
async function handleEditAdd(selectedText, tab) {
  try {
    // 构造预填充数据
    const prefilledData = {
      content: selectedText,
      source_url: tab.url,
      source_title: tab.title
    };
    
    // 通过存储传递数据，避免消息传递问题
    await chrome.storage.local.set({
      'pending_edit_add': prefilledData,
      'pending_edit_add_timestamp': Date.now()
    });
    
  } catch (error) {
    console.error('打开编辑界面失败:', error);
    throw new Error('打开编辑界面失败: ' + error.message);
  }
}

/**
 * 处理添加选中文本请求
 * @param {Object} data - 文本数据
 * @param {Object} tab - 标签页信息
 */
async function handleAddSelectedText(data, tab) {
  try {
    const messageData = {
      ...data,
      source_url: tab.url,
      source_title: tab.title
    };
    
    // 通过存储传递数据，避免消息传递问题
    await chrome.storage.local.set({
      pending_edit_add: messageData,
      pending_edit_add_timestamp: Date.now()
    });
    
    console.log('Alt+Q 数据已存储到本地存储');
    
  } catch (error) {
    console.error('添加文本失败:', error);
    throw error;
  }
}

/**
 * 显示通知
 * @param {string} title - 通知标题
 * @param {string} message - 通知内容
 * @param {string} type - 通知类型 (success, error, info)
 */
function showNotification(title, message, type = 'info') {
  const iconMap = {
    success: 'icons/icon48.png',
    error: 'icons/icon48.png',
    info: 'icons/icon48.png'
  };
  
  chrome.notifications.create({
    type: 'basic',
    iconUrl: iconMap[type],
    title: title,
    message: message
  });
}

/**
 * 处理插件图标点击事件
 */
chrome.action.onClicked.addListener(async (tab) => {
  try {
    // 在用户手势的直接响应中切换侧边栏
    const result = await chrome.storage.local.get('sidebarVisible');
    const isVisible = result.sidebarVisible || false;
    
    if (isVisible) {
      await chrome.sidePanel.setOptions({ enabled: false });
      await chrome.storage.local.set({ sidebarVisible: false });
    } else {
      await chrome.sidePanel.setOptions({ enabled: true });
      await chrome.sidePanel.open({ windowId: tab.windowId });
      await chrome.storage.local.set({ sidebarVisible: true });
    }
  } catch (error) {
    console.error('点击插件图标失败:', error);
    showNotification('操作失败', '无法切换侧边栏状态', 'error');
  }
});

/**
 * 标签页更新时的处理
 */
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  // 当页面加载完成时，注入内容脚本（如果需要）
  if (changeInfo.status === 'complete' && tab.url) {
    // 这里可以添加特定页面的处理逻辑
  }
});

/**
 * 插件启动时的初始化
 */
chrome.runtime.onStartup.addListener(() => {
  console.log('PromptCraft 插件启动');
  
  // 重置侧边栏状态
  chrome.storage.local.set({
    sidebarVisible: false
  });
});

/**
 * 处理存储变化
 */
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'local') {
    // 监听重要配置变化
    if (changes.sidebarVisible) {
      console.log('侧边栏状态变化:', changes.sidebarVisible.newValue);
    }
  }
});