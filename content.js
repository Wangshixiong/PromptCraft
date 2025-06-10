/**
 * PromptCraft 内容脚本
 * 在网页中运行，处理文本选择、快捷键监听等功能
 */

(() => {
  'use strict';
  
  // 防止重复注入
  if (window.promptCraftContentScript) {
    return;
  }
  window.promptCraftContentScript = true;
  
  // 全局变量
  let currentSelection = '';
  
  // 初始化函数
  function initialize() {
    console.log('PromptCraft 内容脚本已加载');
    
    // 监听文本选择变化
    document.addEventListener('selectionchange', handleSelectionChange);
    
    // 监听键盘快捷键
    document.addEventListener('keydown', handleKeyDown);
  }
  
  // 确保DOM加载完成后初始化
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
  } else {
    initialize();
  }
  
  // 监听来自后台脚本的消息
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    switch (message.type) {
      case 'GET_SELECTION':
        handleGetSelection(sendResponse);
        return true; // 保持消息通道开放
        
      case 'HIGHLIGHT_TEXT':
        handleHighlightText(message.data);
        sendResponse({ success: true });
        break;
        
      case 'CLEAR_HIGHLIGHTS':
        handleClearHighlights();
        sendResponse({ success: true });
        break;
        
      default:
        console.warn('内容脚本收到未知消息:', message.type);
    }
  });
  
  // 注意：键盘事件监听器已在initialize函数中添加
  
  /**
   * 处理文本选择变化
   */
  function handleSelectionChange() {
    try {
      const selection = window.getSelection();
      const selectedText = selection.toString().trim();
      
      if (selectedText && selectedText !== currentSelection) {
        currentSelection = selectedText;
        
        // 如果选中文本较长且有意义，可以显示快速添加提示
        if (selectedText.length > 10 && selectedText.length < 1000) {
          showQuickAddHint(selection);
        }
      } else if (!selectedText) {
        currentSelection = '';
        hideQuickAddHint();
      }
    } catch (error) {
      console.error('处理文本选择失败:', error);
    }
  }
  
  /**
   * 处理获取选中文本请求
   * @param {Function} sendResponse - 响应函数
   */
  function handleGetSelection(sendResponse) {
    try {
      const selection = window.getSelection();
      const selectedText = selection.toString().trim();
      
      if (selectedText) {
        // 获取选中文本的上下文信息
        const range = selection.getRangeAt(0);
        const container = range.commonAncestorContainer;
        
        // 尝试获取更多上下文
        let context = '';
        if (container.nodeType === Node.TEXT_NODE) {
          context = container.parentElement?.textContent?.trim() || '';
        } else if (container.nodeType === Node.ELEMENT_NODE) {
          context = container.textContent?.trim() || '';
        }
        
        sendResponse({
          success: true,
          text: selectedText,
          data: {
            selectedText: selectedText,
            context: context.substring(0, 500), // 限制上下文长度
            url: window.location.href,
            title: document.title,
            timestamp: new Date().toISOString()
          }
        });
      } else {
        sendResponse({
          success: false,
          error: '未选中任何文本'
        });
      }
    } catch (error) {
      console.error('获取选中文本失败:', error);
      sendResponse({
        success: false,
        error: error.message
      });
    }
  }
  
  /**
   * 处理文本高亮
   * @param {Object} data - 高亮数据
   */
  function handleHighlightText(data) {
    try {
      const { text, color = '#ffeb3b', className = 'promptcraft-highlight' } = data;
      
      if (!text) return;
      
      // 创建文本搜索的正则表达式
      const regex = new RegExp(escapeRegExp(text), 'gi');
      
      // 遍历所有文本节点进行高亮
      const walker = document.createTreeWalker(
        document.body,
        NodeFilter.SHOW_TEXT,
        null,
        false
      );
      
      const textNodes = [];
      let node;
      while (node = walker.nextNode()) {
        if (regex.test(node.textContent)) {
          textNodes.push(node);
        }
      }
      
      // 对匹配的文本节点进行高亮
      textNodes.forEach(textNode => {
        const parent = textNode.parentNode;
        const wrapper = document.createElement('span');
        wrapper.className = className;
        wrapper.style.backgroundColor = color;
        wrapper.style.padding = '2px 4px';
        wrapper.style.borderRadius = '3px';
        
        const highlightedHTML = textNode.textContent.replace(regex, `<mark style="background-color: ${color}; padding: 1px 2px; border-radius: 2px;">$&</mark>`);
        wrapper.innerHTML = highlightedHTML;
        
        parent.replaceChild(wrapper, textNode);
      });
      
    } catch (error) {
      console.error('文本高亮失败:', error);
    }
  }
  
  /**
   * 清除所有高亮
   */
  function handleClearHighlights() {
    try {
      const highlights = document.querySelectorAll('.promptcraft-highlight');
      highlights.forEach(highlight => {
        const parent = highlight.parentNode;
        const textContent = highlight.textContent;
        const textNode = document.createTextNode(textContent);
        parent.replaceChild(textNode, highlight);
      });
    } catch (error) {
      console.error('清除高亮失败:', error);
    }
  }
  
  /**
   * 处理键盘快捷键
   * @param {KeyboardEvent} event - 键盘事件
   */
  function handleKeyDown(event) {
    // Ctrl+Shift+P (Windows) 或 Cmd+Shift+P (Mac) - 切换侧边栏
    if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'P') {
      event.preventDefault();
      
      // 发送切换侧边栏消息
      chrome.runtime.sendMessage({
        type: 'TOGGLE_SIDEBAR'
      }).catch(error => {
        console.error('发送切换侧边栏消息失败:', error);
      });
    }
    
    // Alt+Q - 快速添加选中文本
    if (event.altKey && event.key === 'Q') {
      event.preventDefault();
      
      if (currentSelection) {
        // 发送添加选中文本消息
        chrome.runtime.sendMessage({
          type: 'ADD_SELECTED_TEXT',
          data: {
            selectedText: currentSelection,
            url: window.location.href,
            title: document.title
          }
        }).catch(error => {
          console.error('发送添加文本消息失败:', error);
        });
      }
    }
  }
  
  /**
   * 显示快速添加提示
   * @param {Selection} selection - 选择对象
   */
  function showQuickAddHint(selection) {
    try {
      // 移除现有提示
      hideQuickAddHint();
      
      // 创建提示元素
      const hint = document.createElement('div');
      hint.id = 'promptcraft-quick-hint';
      hint.innerHTML = `
        <div style="
          position: fixed;
          top: 20px;
          right: 20px;
          background: #2196F3;
          color: white;
          padding: 8px 12px;
          border-radius: 6px;
          font-size: 12px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
          z-index: 10000;
          cursor: pointer;
          transition: all 0.3s ease;
          animation: promptcraft-slide-in 0.3s ease;
        ">
          <div style="display: flex; align-items: center; gap: 6px;">
            <span>📝</span>
            <span>Alt+Q 快速添加</span>
          </div>
        </div>
      `;
      
      // 添加动画样式
      if (!document.getElementById('promptcraft-styles')) {
        const styles = document.createElement('style');
        styles.id = 'promptcraft-styles';
        styles.textContent = `
          @keyframes promptcraft-slide-in {
            from {
              transform: translateX(100%);
              opacity: 0;
            }
            to {
              transform: translateX(0);
              opacity: 1;
            }
          }
          
          #promptcraft-quick-hint:hover {
            background: #1976D2 !important;
            transform: scale(1.05);
          }
        `;
        document.head.appendChild(styles);
      }
      
      // 点击提示直接添加
      hint.addEventListener('click', () => {
        if (currentSelection) {
          chrome.runtime.sendMessage({
            type: 'ADD_SELECTED_TEXT',
            data: {
              selectedText: currentSelection,
              url: window.location.href,
              title: document.title
            }
          });
        }
        hideQuickAddHint();
      });
      
      document.body.appendChild(hint);
      
      // 3秒后自动隐藏
      setTimeout(hideQuickAddHint, 3000);
      
    } catch (error) {
      console.error('显示快速添加提示失败:', error);
    }
  }
  
  /**
   * 隐藏快速添加提示
   */
  function hideQuickAddHint() {
    const hint = document.getElementById('promptcraft-quick-hint');
    if (hint) {
      hint.remove();
    }
  }
  
  /**
   * 转义正则表达式特殊字符
   * @param {string} string - 要转义的字符串
   * @returns {string} 转义后的字符串
   */
  function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
  
  /**
   * 获取元素的绝对位置
   * @param {Element} element - DOM元素
   * @returns {Object} 位置信息
   */
  function getElementPosition(element) {
    const rect = element.getBoundingClientRect();
    return {
      top: rect.top + window.scrollY,
      left: rect.left + window.scrollX,
      width: rect.width,
      height: rect.height
    };
  }
  
  /**
   * 检查元素是否在视口中
   * @param {Element} element - DOM元素
   * @returns {boolean} 是否在视口中
   */
  function isElementInViewport(element) {
    const rect = element.getBoundingClientRect();
    return (
      rect.top >= 0 &&
      rect.left >= 0 &&
      rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
      rect.right <= (window.innerWidth || document.documentElement.clientWidth)
    );
  }
  
  // 页面卸载时清理
  window.addEventListener('beforeunload', () => {
    hideQuickAddHint();
    handleClearHighlights();
  });
  
  console.log('PromptCraft 内容脚本初始化完成');
  
})();