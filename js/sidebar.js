/**
 * PromptCraft 侧边栏主逻辑
 * 处理用户界面交互、数据管理和状态控制
 */

(function() {
  'use strict';
  
  // ==================== 全局状态管理 ====================
  const AppState = {
    user: null,
    prompts: [],
    categories: [],
    filteredPrompts: [],
    currentFilter: {
      search: '',
      category: ''
    },
    theme: 'light',
    isLoading: false,
    editingPrompt: null,
    isOnline: navigator.onLine,
    lastSyncTime: null
  };
  
  // ==================== DOM元素引用 ====================
  const Elements = {
    // 认证相关
    authSection: null,
    loginView: null,
    loadingView: null,
    userInfo: null,
    githubLoginBtn: null,
    logoutBtn: null,
    userAvatar: null,
    userName: null,
    userEmail: null,
    
    // 主界面
    promptsSection: null,
    searchInput: null,
    clearSearchBtn: null,
    categoryTags: null,
    addPromptBtn: null,
    promptsList: null,
    emptyState: null,
    noResults: null,
    statsBar: null,
    promptsCount: null,
    categoryCount: null,
    
    // 主题切换
    themeToggle: null,
    
    // 模态框
    modalOverlay: null,
    promptModal: null,
    deleteModal: null,
    settingsModal: null,
    modalClose: null,
    
    // 表单
    promptForm: null,
    promptTitle: null,
    promptCategory: null,
    promptContent: null,
    charCount: null,
    categoryDatalist: null,
    saveBtn: null,
    cancelBtn: null,
    confirmDeleteBtn: null,
    
    // 设置
    settingsBtn: null,
    
    // 通知
    notifications: null,
    
    // 加载指示器
    loadingIndicator: null
  };
  
  // ==================== 初始化 ====================
  document.addEventListener('DOMContentLoaded', async () => {
    console.log('PromptCraft 侧边栏初始化开始');
    
    try {
      // 初始化DOM元素引用
      initializeElements();
      
      // 初始化事件监听器
      initializeEventListeners();
      
      // 初始化主题
      initializeTheme();
      
      // 初始化系统主题监听器
      initializeSystemThemeListener();
      
      // 检查用户登录状态
      await checkAuthStatus();
      
      // 监听来自后台脚本的消息
      initializeMessageListeners();
      
      // 检查待处理的数据
      await checkPendingData();
      
      // 初始化网络状态监听
      initializeNetworkListeners();
      
      console.log('PromptCraft 侧边栏初始化完成');
    } catch (error) {
      console.error('侧边栏初始化失败:', error);
      showNotification('初始化失败', error.message, 'error');
    }
  });
  
  /**
   * 初始化DOM元素引用
   */
  function initializeElements() {
    // 认证相关
    Elements.authSection = document.getElementById('auth-section');
    Elements.loginView = document.getElementById('login-view');
    Elements.loadingView = document.getElementById('loading-view');
    Elements.userInfo = document.getElementById('user-info');
    Elements.githubLoginBtn = document.getElementById('github-login-btn');
    Elements.logoutBtn = document.getElementById('logout-btn');
    Elements.userAvatar = document.getElementById('user-avatar-img');
    Elements.userName = document.getElementById('user-name');
    Elements.userEmail = document.getElementById('user-email');
    
    // 主界面
    Elements.promptsSection = document.getElementById('prompts-section');
    Elements.searchInput = document.getElementById('search-input');
    Elements.clearSearchBtn = document.getElementById('clear-search');
    Elements.categoryTags = document.getElementById('category-tags');
    Elements.addPromptBtn = document.getElementById('add-prompt-btn');
    Elements.promptsList = document.getElementById('prompts-list');
    Elements.emptyState = document.getElementById('empty-state');
    Elements.noResults = document.getElementById('no-results');
    Elements.statsBar = document.querySelector('.stats-bar');
    Elements.promptsCount = document.getElementById('prompts-count');
    Elements.categoryCount = document.getElementById('category-count');
    
    // 主题切换
    Elements.themeToggle = document.getElementById('theme-toggle');
    
    // 模态框
    Elements.modalOverlay = document.getElementById('modal-overlay');
    Elements.promptModal = document.getElementById('prompt-modal');
    Elements.deleteModal = document.getElementById('delete-modal');
    Elements.settingsModal = document.getElementById('settings-modal');
    Elements.modalClose = document.getElementById('modal-close');
    
    // 表单
    Elements.promptForm = document.getElementById('prompt-form');
    Elements.promptTitle = document.getElementById('prompt-title');
    Elements.promptCategory = document.getElementById('prompt-category');
    Elements.promptContent = document.getElementById('prompt-content');
    Elements.charCount = document.getElementById('char-count');
    Elements.categoryDatalist = document.getElementById('category-datalist');
    Elements.saveBtn = document.getElementById('save-btn');
    Elements.cancelBtn = document.getElementById('cancel-btn');
    Elements.confirmDeleteBtn = document.getElementById('confirm-delete-btn');
    
    // 设置
    Elements.settingsBtn = document.getElementById('settings-btn');
    
    // 通知
    Elements.notifications = document.getElementById('notifications');
    
    // 加载指示器
    Elements.loadingIndicator = document.getElementById('loading-indicator');
  }
  
  /**
   * 初始化事件监听器
   */
  function initializeEventListeners() {
    // 认证事件
    Elements.githubLoginBtn?.addEventListener('click', handleGitHubLogin);
    Elements.logoutBtn?.addEventListener('click', handleLogout);
    
    // 搜索和筛选
    Elements.searchInput?.addEventListener('input', handleSearch);
    Elements.clearSearchBtn?.addEventListener('click', clearSearch);
    Elements.categoryTags?.addEventListener('click', handleCategoryTagClick);
    
    // 添加提示词
    Elements.addPromptBtn?.addEventListener('click', () => showAddForm());
    document.getElementById('create-first-prompt-btn')?.addEventListener('click', () => showAddForm());
    
    // 主题切换
    Elements.themeToggle?.addEventListener('click', toggleTheme);
    
    // 设置
    Elements.settingsBtn?.addEventListener('click', showSettingsModal);
    
    // 模态框关闭
    Elements.modalClose?.addEventListener('click', hideModal);
    document.getElementById('delete-modal-close')?.addEventListener('click', hideDeleteModal);
    document.getElementById('settings-modal-close')?.addEventListener('click', hideSettingsModal);
    document.getElementById('delete-cancel-btn')?.addEventListener('click', hideDeleteModal);
    
    Elements.modalOverlay?.addEventListener('click', (e) => {
      if (e.target === Elements.modalOverlay) {
        hideModal();
      }
    });
    
    // 表单
    Elements.promptForm?.addEventListener('submit', handleSavePrompt);
    Elements.cancelBtn?.addEventListener('click', hideModal);
    Elements.promptContent?.addEventListener('input', updateCharCount);
    Elements.confirmDeleteBtn?.addEventListener('click', handleConfirmDelete);
    
    // 主题切换事件
    document.getElementById('theme-light')?.addEventListener('change', (e) => {
      if (e.target.checked) handleThemeChange('light');
    });
    document.getElementById('theme-dark')?.addEventListener('change', (e) => {
      if (e.target.checked) handleThemeChange('dark');
    });
    document.getElementById('theme-auto')?.addEventListener('change', (e) => {
      if (e.target.checked) handleThemeChange('auto');
    });
    
    // 数据管理事件
    document.getElementById('export-data-btn')?.addEventListener('click', exportData);
    document.getElementById('import-data-btn')?.addEventListener('click', importData);
    
    // 事件委托 - 处理动态生成的按钮
    Elements.promptsList?.addEventListener('click', handlePromptListClick);
    
    // 键盘快捷键
    document.addEventListener('keydown', handleKeyboardShortcuts);
    
    // 防止表单默认提交
    document.addEventListener('submit', (e) => {
      e.preventDefault();
    });
  }
  
  /**
   * 初始化主题
   */
  function initializeTheme() {
    // 从存储中恢复主题设置
    chrome.storage.local.get('theme').then(result => {
      const savedTheme = result.theme || 'light';
      setTheme(savedTheme);
    }).catch(error => {
      console.error('恢复主题设置失败:', error);
      setTheme('light');
    });
  }
  
  /**
   * 初始化消息监听器
   */
  function initializeMessageListeners() {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      switch (message.type) {
        case 'QUICK_ADD_PROMPT':
          handleQuickAddPrompt(message.data)
            .then(() => sendResponse({ success: true }))
            .catch(error => sendResponse({ success: false, error: error.message }));
          return true; // 保持消息通道开放
          
        case 'OPEN_ADD_FORM':
          try {
            showAddForm(message.data);
            sendResponse({ success: true });
          } catch (error) {
            sendResponse({ success: false, error: error.message });
          }
          break;
          
        case 'ADD_TEXT_TO_SIDEBAR':
          try {
            showAddForm(message.data);
            sendResponse({ success: true });
          } catch (error) {
            sendResponse({ success: false, error: error.message });
          }
          break;
          
        default:
          console.warn('侧边栏收到未知消息:', message.type);
          sendResponse({ success: false, error: 'Unknown message type' });
      }
    });
  }
  
  /**
   * 检查存储中的待处理数据
   */
  async function checkPendingData() {
    try {
      const result = await chrome.storage.local.get([
        'pending_quick_add',
        'pending_quick_add_timestamp',
        'pending_edit_add',
        'pending_edit_add_timestamp'
      ]);
      
      const now = Date.now();
      const maxAge = 30000; // 30秒过期
      
      // 处理待处理的快速添加
      if (result.pending_quick_add && result.pending_quick_add_timestamp) {
        if (now - result.pending_quick_add_timestamp < maxAge) {
          console.log('处理待处理的快速添加数据');
          await handleQuickAddPrompt(result.pending_quick_add);
        }
        // 清除已处理或过期的数据
        await chrome.storage.local.remove(['pending_quick_add', 'pending_quick_add_timestamp']);
      }
      
      // 处理待处理的编辑添加
      if (result.pending_edit_add && result.pending_edit_add_timestamp) {
        if (now - result.pending_edit_add_timestamp < maxAge) {
          console.log('处理待处理的编辑添加数据');
          showAddForm(result.pending_edit_add);
        }
        // 清除已处理或过期的数据
        await chrome.storage.local.remove(['pending_edit_add', 'pending_edit_add_timestamp']);
      }
      
    } catch (error) {
      console.error('检查待处理数据失败:', error);
    }
  }
  
  // ==================== 认证管理 ====================
  
  /**
   * 检查用户认证状态
   */
  async function checkAuthStatus() {
    try {
      showLoading(true);
      
      if (supabaseClient.isAuthenticated()) {
        AppState.user = supabaseClient.getCurrentUser();
        await showAuthenticatedView();
      } else {
        showLoginView();
      }
    } catch (error) {
      console.error('检查认证状态失败:', error);
      showLoginView();
    } finally {
      showLoading(false);
    }
  }
  
  /**
   * 处理GitHub登录
   */
  async function handleGitHubLogin() {
    try {
      showLoadingView();
      
      const result = await supabaseClient.signInWithGitHub();
      
      if (result.success) {
        AppState.user = result.user;
        showNotification('登录成功', '欢迎使用 PromptCraft！', 'success');
        showAuthenticatedView();
        await loadUserData();
      }
    } catch (error) {
      console.error('GitHub登录失败:', error);
      showNotification('登录失败', error.message, 'error');
      showLoginView();
    }
  }
  
  /**
   * 处理登出
   */
  async function handleLogout() {
    try {
      await supabaseClient.signOut();
      AppState.user = null;
      AppState.prompts = [];
      AppState.categories = [];
      
      showNotification('已登出', '您已成功登出', 'info');
      showLoginView();
    } catch (error) {
      console.error('登出失败:', error);
      showNotification('登出失败', error.message, 'error');
    }
  }
  
  /**
   * 显示登录视图
   */
  function showLoginView() {
    Elements.loginView.style.display = 'flex';
    Elements.loadingView.style.display = 'none';
    Elements.userInfo.style.display = 'none';
    Elements.promptsSection.style.display = 'none';
  }
  
  /**
   * 显示加载视图
   */
  function showLoadingView() {
    Elements.loginView.style.display = 'none';
    Elements.loadingView.style.display = 'flex';
    Elements.userInfo.style.display = 'none';
    Elements.promptsSection.style.display = 'none';
  }
  
  /**
   * 显示已认证视图
   */
  async function showAuthenticatedView() {
    // 更新用户信息显示
    updateUserInfo();
    
    // 显示用户界面
    Elements.loginView.style.display = 'none';
    Elements.loadingView.style.display = 'none';
    Elements.userInfo.style.display = 'flex';
    Elements.promptsSection.style.display = 'block';
    
    // 加载用户数据
    await loadUserData();
  }
  
  /**
   * 更新用户信息显示
   */
  function updateUserInfo() {
    if (AppState.user) {
      const avatarUrl = AppState.user.user_metadata?.avatar_url || '';
      const name = AppState.user.user_metadata?.full_name || AppState.user.user_metadata?.user_name || '用户';
      const email = AppState.user.email || '';
      
      Elements.userAvatar.src = avatarUrl;
      Elements.userAvatar.alt = name;
      Elements.userName.textContent = name;
      Elements.userEmail.textContent = email;
    }
  }
  
  // ==================== 数据管理 ====================
  
  /**
   * 加载用户数据
   */
  async function loadUserData() {
    try {
      showLoading(true);
      
      // 获取提示词数据
      const prompts = await supabaseClient.getPrompts();
      
      // 如果是新用户且没有数据，初始化默认提示词
      if (prompts.length === 0) {
        await supabaseClient.initializeDefaultPrompts();
        AppState.prompts = await supabaseClient.getPrompts();
      } else {
        AppState.prompts = prompts;
      }
      
      // 更新分类列表
      updateCategories();
      
      // 应用当前筛选条件
      applyFilters();
      
      // 更新界面
      updatePromptsDisplay();
      updateStatsDisplay();
      
    } catch (error) {
      console.error('加载用户数据失败:', error);
      showNotification('加载失败', '无法加载您的提示词数据', 'error');
    } finally {
      showLoading(false);
    }
  }
  
  /**
   * 更新分类列表
   */
  function updateCategories() {
    const categories = [...new Set(AppState.prompts.map(p => p.category).filter(Boolean))];
    AppState.categories = categories.length > 0 ? categories : ['默认分类'];
    
    // 更新分类标签
    updateCategoryTags();
    updateCategoryDatalist();
  }
  
  /**
   * 更新分类标签
   */
  function updateCategoryTags() {
    const container = Elements.categoryTags;
    const currentCategory = AppState.currentFilter.category;
    
    // 清空现有标签
    container.innerHTML = '';
    
    // 添加"全部"标签
    const allTag = document.createElement('button');
    allTag.className = `category-tag ${currentCategory === '' ? 'active' : ''}`;
    allTag.setAttribute('data-category', '');
    allTag.textContent = '全部';
    container.appendChild(allTag);
    
    // 添加分类标签
    AppState.categories.forEach(category => {
      const tag = document.createElement('button');
      tag.className = `category-tag ${currentCategory === category ? 'active' : ''}`;
      tag.setAttribute('data-category', category);
      tag.textContent = category;
      container.appendChild(tag);
    });
  }
  
  /**
   * 更新分类数据列表
   */
  function updateCategoryDatalist() {
    const datalist = Elements.categoryDatalist;
    datalist.innerHTML = '';
    
    AppState.categories.forEach(category => {
      const option = document.createElement('option');
      option.value = category;
      datalist.appendChild(option);
    });
  }
  
  // ==================== 搜索和筛选 ====================
  
  /**
   * 处理搜索
   */
  function handleSearch(event) {
    const searchTerm = event.target.value.trim();
    AppState.currentFilter.search = searchTerm;
    
    // 显示/隐藏清除按钮
    Elements.clearSearchBtn.style.display = searchTerm ? 'block' : 'none';
    
    // 应用筛选
    applyFilters();
    updatePromptsDisplay();
  }
  
  /**
   * 清除搜索
   */
  function clearSearch() {
    Elements.searchInput.value = '';
    AppState.currentFilter.search = '';
    Elements.clearSearchBtn.style.display = 'none';
    
    applyFilters();
    updatePromptsDisplay();
  }
  
  /**
   * 处理分类标签点击
   */
  function handleCategoryTagClick(event) {
    if (event.target.classList.contains('category-tag')) {
      const category = event.target.getAttribute('data-category');
      
      // 更新筛选状态
      AppState.currentFilter.category = category;
      
      // 更新标签样式
      Elements.categoryTags.querySelectorAll('.category-tag').forEach(tag => {
        tag.classList.remove('active');
      });
      event.target.classList.add('active');
      
      // 应用筛选
      applyFilters();
      updatePromptsDisplay();
    }
  }
  
  /**
   * 应用筛选条件
   */
  function applyFilters() {
    let filtered = [...AppState.prompts];
    
    // 搜索筛选
    if (AppState.currentFilter.search) {
      const searchTerm = AppState.currentFilter.search.toLowerCase();
      filtered = filtered.filter(prompt => 
        prompt.title.toLowerCase().includes(searchTerm) ||
        prompt.content.toLowerCase().includes(searchTerm) ||
        (prompt.category && prompt.category.toLowerCase().includes(searchTerm))
      );
    }
    
    // 分类筛选
    if (AppState.currentFilter.category) {
      filtered = filtered.filter(prompt => prompt.category === AppState.currentFilter.category);
    }
    
    AppState.filteredPrompts = filtered;
  }
  
  // ==================== 界面更新 ====================
  
  /**
   * 更新提示词显示
   */
  function updatePromptsDisplay() {
    const container = Elements.promptsList;
    container.innerHTML = '';
    
    if (AppState.filteredPrompts.length === 0) {
      // 显示空状态
      if (AppState.currentFilter.search || AppState.currentFilter.category) {
        Elements.noResults.style.display = 'block';
        Elements.emptyState.style.display = 'none';
      } else {
        Elements.emptyState.style.display = 'block';
        Elements.noResults.style.display = 'none';
      }
      return;
    }
    
    // 隐藏空状态
    Elements.emptyState.style.display = 'none';
    Elements.noResults.style.display = 'none';
    
    // 渲染提示词列表
    AppState.filteredPrompts.forEach(prompt => {
      const promptElement = createPromptElement(prompt);
      container.appendChild(promptElement);
    });
  }
  
  /**
   * 创建提示词元素
   */
  function createPromptElement(prompt) {
    const div = document.createElement('div');
    div.className = 'prompt-item';
    div.dataset.promptId = prompt.id;
    
    // 格式化时间
    const createdAt = new Date(prompt.created_at).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
    
    // 截断内容显示
    const truncatedContent = prompt.content.length > 150 
      ? prompt.content.substring(0, 150) + '...' 
      : prompt.content;
    
    div.innerHTML = `
      <div class="prompt-header">
        <div>
          <div class="prompt-title">${escapeHtml(prompt.title)}</div>
          <span class="prompt-category">${escapeHtml(prompt.category || '默认分类')}</span>
        </div>
      </div>
      <div class="prompt-content">${escapeHtml(truncatedContent)}</div>
      <div class="prompt-actions">
        <div class="prompt-meta">创建于 ${createdAt}</div>
        <div class="prompt-buttons">
          <button class="btn-action copy" title="复制" data-action="copy" data-prompt-id="${prompt.id}">
            📋
          </button>
          <button class="btn-action edit" title="编辑" data-action="edit" data-prompt-id="${prompt.id}">
            ✏️
          </button>
          <button class="btn-action delete" title="删除" data-action="delete" data-prompt-id="${prompt.id}">
            🗑️
          </button>
        </div>
      </div>
    `;
    
    return div;
  }
  
  /**
   * 更新统计显示
   */
  function updateStatsDisplay() {
    Elements.promptsCount.textContent = `共 ${AppState.prompts.length} 条提示词`;
    Elements.categoryCount.textContent = `${AppState.categories.length} 个分类`;
  }
  
  // ==================== 提示词操作 ====================
  
  /**
   * 显示添加表单
   */
  function showAddForm(prefilledData = null) {
    AppState.editingPrompt = null;
    
    // 重置表单
    Elements.promptForm.reset();
    
    // 预填充数据
    if (prefilledData) {
      if (prefilledData.content) {
        Elements.promptContent.value = prefilledData.content;
      }
      if (prefilledData.title) {
        Elements.promptTitle.value = prefilledData.title;
      }
      if (prefilledData.category) {
        Elements.promptCategory.value = prefilledData.category;
      }
    }
    
    // 更新模态框标题
    document.getElementById('modal-title').textContent = '新增提示词';
    
    // 更新字符计数
    updateCharCount();
    
    // 显示模态框
    showModal(Elements.promptModal);
    
    // 聚焦到标题输入框
    setTimeout(() => {
      Elements.promptTitle.focus();
    }, 100);
  }
  
  /**
   * 编辑提示词
   */
  window.editPrompt = function(promptId) {
    const prompt = AppState.prompts.find(p => p.id === promptId);
    if (!prompt) {
      showNotification('错误', '找不到指定的提示词', 'error');
      return;
    }
    
    AppState.editingPrompt = prompt;
    
    // 填充表单
    Elements.promptTitle.value = prompt.title;
    Elements.promptCategory.value = prompt.category || '';
    Elements.promptContent.value = prompt.content;
    
    // 更新模态框标题
    document.getElementById('modal-title').textContent = '编辑提示词';
    
    // 更新字符计数
    updateCharCount();
    
    // 显示模态框
    showModal(Elements.promptModal);
    
    // 聚焦到标题输入框
    setTimeout(() => {
      Elements.promptTitle.focus();
    }, 100);
  };
  
  /**
   * 复制提示词
   */
  window.copyPrompt = async function(promptId) {
    const prompt = AppState.prompts.find(p => p.id === promptId);
    if (!prompt) {
      showNotification('错误', '找不到指定的提示词', 'error');
      return;
    }
    
    try {
      await navigator.clipboard.writeText(prompt.content);
      showNotification('复制成功', `已复制"${prompt.title}"到剪贴板`, 'success');
    } catch (error) {
      console.error('复制失败:', error);
      showNotification('复制失败', '无法访问剪贴板', 'error');
    }
  };
  
  /**
   * 删除提示词
   */
  window.deletePrompt = function(promptId) {
    const prompt = AppState.prompts.find(p => p.id === promptId);
    if (!prompt) {
      showNotification('错误', '找不到指定的提示词', 'error');
      return;
    }
    
    AppState.editingPrompt = prompt;
    showDeleteModal();
  };
  
  /**
   * 处理保存提示词
   */
  async function handleSavePrompt(event) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const promptData = {
      title: formData.get('title').trim(),
      category: formData.get('category').trim() || '默认分类',
      content: formData.get('content').trim()
    };
    
    // 验证数据
    if (!promptData.title) {
      showNotification('验证失败', '请输入提示词标题', 'error');
      return;
    }
    
    if (!promptData.content) {
      showNotification('验证失败', '请输入提示词内容', 'error');
      return;
    }
    
    if (promptData.content.length > 2000) {
      showNotification('验证失败', '提示词内容不能超过2000个字符', 'error');
      return;
    }
    
    try {
      showLoading(true);
      
      if (AppState.editingPrompt) {
        // 更新现有提示词
        await supabaseClient.updatePrompt(AppState.editingPrompt.id, promptData);
        showNotification('更新成功', `提示词"${promptData.title}"已更新`, 'success');
      } else {
        // 创建新提示词
        await supabaseClient.createPrompt(promptData);
        showNotification('创建成功', `提示词"${promptData.title}"已创建`, 'success');
      }
      
      // 重新加载数据
      await loadUserData();
      
      // 关闭模态框
      hideModal();
      
    } catch (error) {
      console.error('保存提示词失败:', error);
      showNotification('保存失败', error.message, 'error');
    } finally {
      showLoading(false);
    }
  }
  
  /**
   * 处理确认删除
   */
  async function handleConfirmDelete() {
    if (!AppState.editingPrompt) {
      return;
    }
    
    try {
      showLoading(true);
      
      await supabaseClient.deletePrompt(AppState.editingPrompt.id);
      showNotification('删除成功', `提示词"${AppState.editingPrompt.title}"已删除`, 'success');
      
      // 重新加载数据
      await loadUserData();
      
      // 关闭模态框
      hideDeleteModal();
      
    } catch (error) {
      console.error('删除提示词失败:', error);
      showNotification('删除失败', error.message, 'error');
    } finally {
      showLoading(false);
    }
  }
  
  /**
   * 处理快速添加提示词
   */
  async function handleQuickAddPrompt(promptData) {
    try {
      showLoading(true);
      
      await supabaseClient.createPrompt(promptData);
      showNotification('快速添加成功', `提示词"${promptData.title}"已添加`, 'success');
      
      // 重新加载数据
      await loadUserData();
      
    } catch (error) {
      console.error('快速添加失败:', error);
      showNotification('快速添加失败', error.message, 'error');
    } finally {
      showLoading(false);
    }
  }
  
  // ==================== 模态框管理 ====================
  
  /**
   * 显示模态框
   */
  function showModal(modal) {
    Elements.modalOverlay.style.display = 'flex';
    
    // 隐藏所有模态框
    document.querySelectorAll('.modal').forEach(m => {
      m.style.display = 'none';
    });
    
    // 显示指定模态框
    modal.style.display = 'block';
    
    // 防止背景滚动
    document.body.style.overflow = 'hidden';
  }
  
  /**
   * 隐藏模态框
   */
  function hideModal() {
    Elements.modalOverlay.style.display = 'none';
    document.body.style.overflow = 'auto';
    
    // 重置编辑状态
    AppState.editingPrompt = null;
  }
  
  /**
   * 显示删除确认模态框
   */
  function showDeleteModal() {
    showModal(Elements.deleteModal);
  }
  
  /**
   * 隐藏删除确认模态框
   */
  window.hideDeleteModal = function() {
    hideModal();
  };
  
  /**
   * 显示设置模态框
   */
  function showSettingsModal() {
    showModal(Elements.settingsModal);
    
    // 更新主题选择
    const themeRadios = document.querySelectorAll('input[name="theme"]');
    themeRadios.forEach(radio => {
      radio.checked = radio.value === AppState.theme;
    });
  }
  
  /**
   * 隐藏设置模态框
   */
  window.hideSettingsModal = function() {
    hideModal();
  };
  
  // ==================== 主题管理 ====================
  
  /**
   * 切换主题
   */
  function toggleTheme() {
    const newTheme = AppState.theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
  }
  
  /**
   * 设置主题
   */
  function setTheme(theme) {
    let actualTheme = theme;
    
    // 处理自动主题
    if (theme === 'auto') {
      actualTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    
    AppState.theme = theme; // 保存用户选择
    document.documentElement.setAttribute('data-theme', actualTheme);
    
    // 更新主题切换按钮图标
    const icon = Elements.themeToggle.querySelector('.icon');
    icon.textContent = actualTheme === 'light' ? '🌙' : '☀️';
    
    // 保存主题设置
    chrome.storage.local.set({ theme });
  }
  
  /**
   * 处理主题变更
   */
  window.handleThemeChange = function(theme) {
    setTheme(theme);
  };
  
  /**
   * 监听系统主题变化
   */
  function initializeSystemThemeListener() {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    mediaQuery.addEventListener('change', () => {
      if (AppState.theme === 'auto') {
        setTheme('auto'); // 重新应用自动主题
      }
    });
  }
  
  /**
   * 初始化网络状态监听器
   */
  function initializeNetworkListeners() {
    // 监听网络状态变化
    window.addEventListener('online', handleNetworkOnline);
    window.addEventListener('offline', handleNetworkOffline);
    
    // 初始化网络状态显示
    updateNetworkStatus();
  }
  
  /**
   * 处理网络连接
   */
  function handleNetworkOnline() {
    AppState.isOnline = true;
    updateNetworkStatus();
    showNotification('网络已连接', '数据同步已恢复', 'success');
    
    // 尝试重新加载数据
    if (AppState.user) {
      loadUserData();
    }
  }
  
  /**
   * 处理网络断开
   */
  function handleNetworkOffline() {
    AppState.isOnline = false;
    updateNetworkStatus();
    showNotification('网络已断开', '当前处于离线模式，部分功能可能受限', 'warning');
  }
  
  /**
   * 更新网络状态显示
   */
  function updateNetworkStatus() {
    const statusIndicator = document.querySelector('.network-status');
    if (!statusIndicator) {
      // 创建网络状态指示器
      const indicator = document.createElement('div');
      indicator.className = 'network-status';
      indicator.innerHTML = `
        <span class="network-icon"></span>
        <span class="network-text"></span>
      `;
      
      // 添加到头部工具栏
      const toolbar = document.querySelector('.toolbar');
      if (toolbar) {
        toolbar.appendChild(indicator);
      }
    }
    
    const indicator = document.querySelector('.network-status');
    const icon = indicator?.querySelector('.network-icon');
    const text = indicator?.querySelector('.network-text');
    
    if (AppState.isOnline) {
      indicator?.classList.remove('offline');
      indicator?.classList.add('online');
      if (icon) icon.textContent = '🟢';
      if (text) text.textContent = '在线';
    } else {
      indicator?.classList.remove('online');
      indicator?.classList.add('offline');
      if (icon) icon.textContent = '🔴';
      if (text) text.textContent = '离线';
    }
  }
  
  // ==================== 工具函数 ====================
  
  /**
   * 更新字符计数
   */
  function updateCharCount() {
    const content = Elements.promptContent.value;
    const count = content.length;
    Elements.charCount.textContent = count;
    
    // 根据字符数量改变颜色
    if (count > 2000) {
      Elements.charCount.style.color = 'var(--error-color)';
    } else if (count > 1800) {
      Elements.charCount.style.color = 'var(--warning-color)';
    } else {
      Elements.charCount.style.color = 'var(--text-muted)';
    }
  }
  
  /**
   * 显示/隐藏加载指示器
   */
  function showLoading(show) {
    AppState.isLoading = show;
    Elements.loadingIndicator.style.display = show ? 'block' : 'none';
  }
  
  /**
   * 显示通知
   */
  function showNotification(title, message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    
    notification.innerHTML = `
      <div class="notification-content">
        <div class="notification-title">${escapeHtml(title)}</div>
        <div class="notification-message">${escapeHtml(message)}</div>
      </div>
      <button class="notification-close">✕</button>
    `;
    
    // 添加关闭事件
    notification.querySelector('.notification-close').addEventListener('click', () => {
      notification.remove();
    });
    
    // 添加到容器
    Elements.notifications.appendChild(notification);
    
    // 自动移除
    setTimeout(() => {
      if (notification.parentNode) {
        notification.remove();
      }
    }, 5000);
  }
  
  /**
   * HTML转义
   */
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
  
  /**
   * 处理键盘快捷键
   */
  function handleKeyboardShortcuts(event) {
    // Ctrl/Cmd + K - 聚焦搜索框
    if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
      event.preventDefault();
      Elements.searchInput.focus();
    }
    
    // Ctrl/Cmd + N - 新增提示词
    if ((event.ctrlKey || event.metaKey) && event.key === 'n') {
      event.preventDefault();
      showAddForm();
    }
    
    // Escape - 关闭模态框
    if (event.key === 'Escape') {
      hideModal();
    }
  }
  
  // ==================== 数据导入导出 ====================
  
  /**
   * 导出数据
   */
  window.exportData = function() {
    try {
      const data = {
        prompts: AppState.prompts,
        categories: AppState.categories,
        exportTime: new Date().toISOString(),
        version: '0.1.0'
      };
      
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `promptcraft-backup-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      
      URL.revokeObjectURL(url);
      
      showNotification('导出成功', '数据已导出到下载文件夹', 'success');
    } catch (error) {
      console.error('导出数据失败:', error);
      showNotification('导出失败', error.message, 'error');
    }
  };
  
  /**
   * 导入数据
   */
  window.importData = function() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    
    input.addEventListener('change', async (event) => {
      const file = event.target.files[0];
      if (!file) return;
      
      try {
        const text = await file.text();
        const data = JSON.parse(text);
        
        if (!data.prompts || !Array.isArray(data.prompts)) {
          throw new Error('无效的备份文件格式');
        }
        
        // 确认导入
        if (!confirm(`确定要导入 ${data.prompts.length} 条提示词吗？这将覆盖现有数据。`)) {
          return;
        }
        
        showLoading(true);
        
        // 删除现有数据
        for (const prompt of AppState.prompts) {
          await supabaseClient.deletePrompt(prompt.id);
        }
        
        // 导入新数据
        for (const promptData of data.prompts) {
          const { id, created_at, updated_at, user_id, ...cleanData } = promptData;
          await supabaseClient.createPrompt(cleanData);
        }
        
        // 重新加载数据
        await loadUserData();
        
        showNotification('导入成功', `已导入 ${data.prompts.length} 条提示词`, 'success');
        hideSettingsModal();
        
      } catch (error) {
        console.error('导入数据失败:', error);
        showNotification('导入失败', error.message, 'error');
      } finally {
        showLoading(false);
      }
    });
    
    input.click();
  };
  
  // ==================== 提示词操作函数 ====================
  
  /**
   * 处理提示词列表点击事件（事件委托）
   */
  function handlePromptListClick(event) {
    const button = event.target.closest('[data-action]');
    if (!button) return;
    
    const action = button.dataset.action;
    const promptId = button.dataset.promptId;
    
    switch (action) {
      case 'copy':
        copyPrompt(promptId);
        break;
      case 'edit':
        editPrompt(promptId);
        break;
      case 'delete':
        deletePrompt(promptId);
        break;
    }
  }
  
  /**
   * 复制提示词到剪贴板
   */
  async function copyPrompt(promptId) {
    try {
      const prompt = AppState.prompts.find(p => p.id === promptId);
      if (!prompt) {
        throw new Error('提示词不存在');
      }
      
      await navigator.clipboard.writeText(prompt.content);
      showNotification('复制成功', `提示词"${prompt.title}"已复制到剪贴板`, 'success');
      
    } catch (error) {
      console.error('复制失败:', error);
      showNotification('复制失败', error.message, 'error');
    }
  }
  
  /**
   * 编辑提示词
   */
  function editPrompt(promptId) {
    const prompt = AppState.prompts.find(p => p.id === promptId);
    if (!prompt) {
      showNotification('错误', '提示词不存在', 'error');
      return;
    }
    
    AppState.editingPrompt = prompt;
    
    // 填充表单
    Elements.promptTitle.value = prompt.title;
    Elements.promptCategory.value = prompt.category || '';
    Elements.promptContent.value = prompt.content;
    
    // 更新字符计数
    updateCharCount();
    
    // 显示模态框
    showModal(Elements.promptModal);
  }
  
  /**
   * 删除提示词
   */
  function deletePrompt(promptId) {
    const prompt = AppState.prompts.find(p => p.id === promptId);
    if (!prompt) {
      showNotification('错误', '提示词不存在', 'error');
      return;
    }
    
    AppState.editingPrompt = prompt;
    
    // 更新删除确认对话框的内容
    const deleteMessage = document.querySelector('#delete-modal .modal-body p');
    if (deleteMessage) {
      deleteMessage.textContent = `确定要删除提示词"${prompt.title}"吗？此操作无法撤销。`;
    }
    
    // 显示删除确认模态框
    showDeleteModal();
  }
  
  /**
   * 处理主题变化
   */
  function handleThemeChange(theme) {
    setTheme(theme);
    
    // 保存到存储
    chrome.storage.local.set({ theme }).catch(error => {
      console.error('保存主题设置失败:', error);
    });
  }
  
  // 暴露全局函数供HTML调用
  window.showAddForm = showAddForm;
  window.exportData = exportData;
  window.importData = importData;
  window.handleThemeChange = handleThemeChange;
  
})();