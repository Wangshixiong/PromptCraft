// background.js

// 当插件首次安装、更新或浏览器启动时运行
chrome.runtime.onInstalled.addListener(() => {
    // 先移除可能存在的菜单项，避免重复创建错误
    chrome.contextMenus.removeAll(() => {
        // 创建一个右键菜单项
        chrome.contextMenus.create({
          id: "add-to-promptcraft",
          title: "添加到 Prompt管理助手",
          contexts: ["selection"] // 只在用户选中文本时显示
        });
    });
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
  