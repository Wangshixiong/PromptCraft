/**
 * 用户认证界面管理模块
 * 负责处理用户图标、登录弹窗、状态显示等UI相关功能
 * 
 * @author AI Assistant
 * @version 1.0.0
 * @date 2025-01-27
 */

/**
 * 认证UI管理类
 * 管理用户认证相关的所有界面元素和交互
 */
class AuthUI {
    constructor() {
        this.authService = null;
        this.userIcon = null;
        this.loginModal = null;
        this.syncStatusDot = null;
        this.isInitialized = false;
        this.removeAuthListener = null;
    }

    /**
     * 初始化认证UI
     * 创建用户图标、登录弹窗等UI元素
     * 
     * @param {Object} authService - 认证服务实例
     * @returns {Promise<void>}
     * @throws {Error} 初始化失败时抛出错误
     */
    async initialize(authService) {
        try {
            this.authService = authService;
            
            // 创建用户图标
            this.createUserIcon();
            
            // 创建登录弹窗
            this.createLoginModal();
            
            // 监听认证状态变化
            this.removeAuthListener = this.authService.onAuthStateChange(
                (event, session) => this.handleAuthStateChange(event, session)
            );
            
            // 初始化用户状态
            this.updateUserIcon();
            
            this.isInitialized = true;
            console.log('AuthUI initialized successfully');
            
        } catch (error) {
            console.error('Failed to initialize AuthUI:', error);
            throw new Error(`认证UI初始化失败: ${error.message}`);
        }
    }

    /**
     * 创建用户图标
     * 在右上角controls区域添加用户图标
     * 
     * @returns {void}
     */
    createUserIcon() {
        const controls = document.querySelector('.controls');
        if (!controls) {
            throw new Error('Controls container not found');
        }

        // 创建用户图标容器
        const userIconContainer = document.createElement('div');
        userIconContainer.className = 'user-icon-container';
        userIconContainer.style.position = 'relative';
        
        // 创建用户图标按钮
        this.userIcon = document.createElement('button');
        this.userIcon.className = 'btn user-icon';
        this.userIcon.id = 'userIcon';
        this.userIcon.title = '用户中心';
        this.userIcon.innerHTML = '<i class="fas fa-user"></i>';
        
        // 创建同步状态指示点
        this.syncStatusDot = document.createElement('div');
        this.syncStatusDot.className = 'sync-status-dot';
        this.syncStatusDot.style.display = 'none';
        
        // 组装元素
        userIconContainer.appendChild(this.userIcon);
        userIconContainer.appendChild(this.syncStatusDot);
        
        // 插入到主题切换按钮之前
        const themeToggle = document.getElementById('themeToggle');
        controls.insertBefore(userIconContainer, themeToggle);
        
        // 添加点击事件
        this.userIcon.addEventListener('click', () => this.handleUserIconClick());
        
        // 添加悬浮事件
        this.userIcon.addEventListener('mouseenter', () => this.showUserTooltip());
        this.userIcon.addEventListener('mouseleave', () => this.hideUserTooltip());
    }

    /**
     * 创建登录弹窗
     * 创建包含GitHub和Google登录选项的弹窗
     * 
     * @returns {void}
     */
    createLoginModal() {
        // 创建弹窗遮罩
        this.loginModal = document.createElement('div');
        this.loginModal.className = 'login-overlay';
        this.loginModal.id = 'loginOverlay';
        this.loginModal.style.display = 'none';
        
        // 弹窗HTML内容
        this.loginModal.innerHTML = `
            <div class="login-modal">
                <div class="login-header">
                    <h3>登录到云端</h3>
                    <button class="login-close" id="loginClose">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="login-body">
                    <div class="login-description">
                        <p>登录后您的提示词将自动同步到云端，可在多个设备间访问。</p>
                        <p class="privacy-note">我们重视您的隐私，数据将安全存储在云端。</p>
                    </div>
                    <div class="login-buttons">
                        <button class="login-btn github-btn" id="githubLoginBtn">
                            <i class="fab fa-github"></i>
                            <span>使用 GitHub 登录</span>
                        </button>
                        <button class="login-btn google-btn" id="googleLoginBtn">
                            <i class="fab fa-google"></i>
                            <span>使用 Google 登录</span>
                        </button>
                    </div>
                    <div class="login-footer">
                        <p>继续使用即表示您同意我们的服务条款和隐私政策</p>
                    </div>
                </div>
            </div>
        `;
        
        // 添加到页面
        document.body.appendChild(this.loginModal);
        
        // 绑定事件
        this.bindLoginModalEvents();
    }

    /**
     * 绑定登录弹窗事件
     * 为登录弹窗中的各个按钮绑定事件处理器
     * 
     * @returns {void}
     */
    bindLoginModalEvents() {
        const loginClose = document.getElementById('loginClose');
        const githubLoginBtn = document.getElementById('githubLoginBtn');
        const googleLoginBtn = document.getElementById('googleLoginBtn');
        
        // 关闭弹窗
        loginClose.addEventListener('click', () => this.hideLoginModal());
        
        // 点击遮罩关闭
        this.loginModal.addEventListener('click', (e) => {
            if (e.target === this.loginModal) {
                this.hideLoginModal();
            }
        });
        
        // GitHub登录
        githubLoginBtn.addEventListener('click', () => this.handleGitHubLogin());
        
        // Google登录
        googleLoginBtn.addEventListener('click', () => this.handleGoogleLogin());
    }

    /**
     * 处理用户图标点击事件
     * 根据登录状态显示不同的操作选项
     * 
     * @returns {void}
     */
    handleUserIconClick() {
        if (this.authService.isAuthenticated()) {
            this.showUserMenu();
        } else {
            this.showLoginModal();
        }
    }

    /**
     * 显示登录弹窗
     * 
     * @returns {void}
     */
    showLoginModal() {
        this.loginModal.style.display = 'flex';
    }

    /**
     * 隐藏登录弹窗
     * 
     * @returns {void}
     */
    hideLoginModal() {
        this.loginModal.style.display = 'none';
    }

    /**
     * 处理GitHub登录
     * 
     * @returns {Promise<void>}
     */
    async handleGitHubLogin() {
        try {
            this.setLoginButtonLoading('githubLoginBtn', true);
            await this.authService.signInWithGitHub();
            this.hideLoginModal();
        } catch (error) {
            console.error('GitHub login failed:', error);
            this.showErrorMessage('GitHub登录失败，请稍后重试');
        } finally {
            this.setLoginButtonLoading('githubLoginBtn', false);
        }
    }

    /**
     * 处理Google登录
     * 
     * @returns {Promise<void>}
     */
    async handleGoogleLogin() {
        try {
            this.setLoginButtonLoading('googleLoginBtn', true);
            await this.authService.signInWithGoogle();
            this.hideLoginModal();
        } catch (error) {
            console.error('Google login failed:', error);
            this.showErrorMessage('Google登录失败，请稍后重试');
        } finally {
            this.setLoginButtonLoading('googleLoginBtn', false);
        }
    }

    /**
     * 显示用户菜单
     * 显示已登录用户的操作菜单
     * 
     * @returns {void}
     */
    showUserMenu() {
        // 创建用户菜单
        const existingMenu = document.getElementById('userMenu');
        if (existingMenu) {
            existingMenu.remove();
        }

        const userMenu = document.createElement('div');
        userMenu.className = 'user-menu';
        userMenu.id = 'userMenu';
        
        const user = this.authService.getCurrentUser();
        const provider = this.authService.getAuthProvider();
        const email = this.authService.getUserEmail();
        const displayName = this.authService.getUserDisplayName();
        
        userMenu.innerHTML = `
            <div class="user-menu-header">
                <div class="user-avatar">
                    ${this.getUserAvatarHTML()}
                </div>
                <div class="user-info">
                    <div class="user-name">${displayName || '用户'}</div>
                    <div class="user-email">${email}</div>
                    <div class="user-provider">通过 ${provider === 'github' ? 'GitHub' : 'Google'} 登录</div>
                </div>
            </div>
            <div class="user-menu-actions">
                <button class="user-menu-btn" id="syncStatusBtn">
                    <i class="fas fa-sync"></i>
                    <span>同步状态</span>
                </button>
                <button class="user-menu-btn" id="signOutBtn">
                    <i class="fas fa-sign-out-alt"></i>
                    <span>登出</span>
                </button>
            </div>
        `;
        
        // 定位菜单
        const rect = this.userIcon.getBoundingClientRect();
        userMenu.style.position = 'fixed';
        userMenu.style.top = `${rect.bottom + 8}px`;
        userMenu.style.right = '16px';
        userMenu.style.zIndex = '10000';
        
        document.body.appendChild(userMenu);
        
        // 绑定事件
        document.getElementById('signOutBtn').addEventListener('click', () => this.handleSignOut());
        
        // 点击外部关闭菜单
        setTimeout(() => {
            document.addEventListener('click', this.handleClickOutsideMenu, true);
        }, 100);
    }

    /**
     * 处理点击菜单外部事件
     * 
     * @param {Event} e - 点击事件
     * @returns {void}
     */
    handleClickOutsideMenu = (e) => {
        const userMenu = document.getElementById('userMenu');
        if (userMenu && !userMenu.contains(e.target) && !this.userIcon.contains(e.target)) {
            userMenu.remove();
            document.removeEventListener('click', this.handleClickOutsideMenu, true);
        }
    }

    /**
     * 处理用户登出
     * 
     * @returns {Promise<void>}
     */
    async handleSignOut() {
        try {
            await this.authService.signOut();
            const userMenu = document.getElementById('userMenu');
            if (userMenu) {
                userMenu.remove();
            }
            this.showSuccessMessage('已成功登出');
        } catch (error) {
            console.error('Sign out failed:', error);
            this.showErrorMessage('登出失败，请稍后重试');
        }
    }

    /**
     * 处理认证状态变化
     * 
     * @param {string} event - 认证事件
     * @param {Object|null} session - 用户会话
     * @returns {void}
     */
    handleAuthStateChange(event, session) {
        console.log('AuthUI handling auth state change:', event);
        this.updateUserIcon();
        
        if (event === 'SIGNED_IN') {
            this.showSuccessMessage('登录成功！');
            this.setSyncStatus('syncing');
        } else if (event === 'SIGNED_OUT') {
            this.setSyncStatus('offline');
        }
    }

    /**
     * 更新用户图标
     * 根据登录状态更新图标显示
     * 
     * @returns {void}
     */
    updateUserIcon() {
        if (!this.userIcon) return;
        
        if (this.authService.isAuthenticated()) {
            const avatarUrl = this.authService.getUserAvatar();
            const provider = this.authService.getAuthProvider();
            
            if (avatarUrl) {
                // 显示用户头像
                this.userIcon.innerHTML = `<img src="${avatarUrl}" alt="用户头像" class="user-avatar-img">`;
            } else {
                // 显示提供商图标
                const icon = provider === 'github' ? 'fab fa-github' : 'fab fa-google';
                this.userIcon.innerHTML = `<i class="${icon}"></i>`;
            }
            
            this.userIcon.title = `已登录 (${this.authService.getUserEmail()})`;
            this.syncStatusDot.style.display = 'block';
        } else {
            // 未登录状态
            this.userIcon.innerHTML = '<i class="fas fa-user"></i>';
            this.userIcon.title = '点击登录';
            this.syncStatusDot.style.display = 'none';
        }
    }

    /**
     * 获取用户头像HTML
     * 
     * @returns {string} 头像HTML字符串
     */
    getUserAvatarHTML() {
        const avatarUrl = this.authService.getUserAvatar();
        const provider = this.authService.getAuthProvider();
        
        if (avatarUrl) {
            return `<img src="${avatarUrl}" alt="用户头像" class="avatar-img">`;
        } else {
            const icon = provider === 'github' ? 'fab fa-github' : 'fab fa-google';
            return `<i class="${icon}"></i>`;
        }
    }

    /**
     * 设置同步状态
     * 
     * @param {string} status - 同步状态 (syncing|success|error|offline)
     * @returns {void}
     */
    setSyncStatus(status) {
        if (!this.syncStatusDot) return;
        
        // 清除所有状态类
        this.syncStatusDot.className = 'sync-status-dot';
        
        switch (status) {
            case 'syncing':
                this.syncStatusDot.classList.add('syncing');
                this.syncStatusDot.title = '同步中...';
                break;
            case 'success':
                this.syncStatusDot.classList.add('success');
                this.syncStatusDot.title = '同步成功';
                // 3秒后隐藏成功状态
                setTimeout(() => {
                    if (this.syncStatusDot.classList.contains('success')) {
                        this.syncStatusDot.classList.remove('success');
                    }
                }, 3000);
                break;
            case 'error':
                this.syncStatusDot.classList.add('error');
                this.syncStatusDot.title = '同步失败';
                break;
            case 'offline':
                this.syncStatusDot.style.display = 'none';
                break;
        }
    }

    /**
     * 设置登录按钮加载状态
     * 
     * @param {string} buttonId - 按钮ID
     * @param {boolean} loading - 是否加载中
     * @returns {void}
     */
    setLoginButtonLoading(buttonId, loading) {
        const button = document.getElementById(buttonId);
        if (!button) return;
        
        if (loading) {
            button.disabled = true;
            button.classList.add('loading');
            const icon = button.querySelector('i');
            icon.className = 'fas fa-spinner fa-spin';
        } else {
            button.disabled = false;
            button.classList.remove('loading');
            const icon = button.querySelector('i');
            if (buttonId === 'githubLoginBtn') {
                icon.className = 'fab fa-github';
            } else {
                icon.className = 'fab fa-google';
            }
        }
    }

    /**
     * 显示成功消息
     * 
     * @param {string} message - 消息内容
     * @returns {void}
     */
    showSuccessMessage(message) {
        this.showToast(message, 'success');
    }

    /**
     * 显示错误消息
     * 
     * @param {string} message - 消息内容
     * @returns {void}
     */
    showErrorMessage(message) {
        this.showToast(message, 'error');
    }

    /**
     * 显示提示消息
     * 
     * @param {string} message - 消息内容
     * @param {string} type - 消息类型 (success|error|info)
     * @returns {void}
     */
    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        
        // 添加到页面
        document.body.appendChild(toast);
        
        // 显示动画
        setTimeout(() => toast.classList.add('show'), 100);
        
        // 自动隐藏
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    /**
     * 显示用户提示信息
     * 
     * @returns {void}
     */
    showUserTooltip() {
        if (!this.authService.isAuthenticated()) return;
        
        const email = this.authService.getUserEmail();
        if (email) {
            this.userIcon.title = email;
        }
    }

    /**
     * 隐藏用户提示信息
     * 
     * @returns {void}
     */
    hideUserTooltip() {
        // 恢复默认提示
        this.updateUserIcon();
    }

    /**
     * 销毁认证UI/**
     * 更新用户状态
     * 这是updateUserIcon的别名方法，用于保持向后兼容性
     * 
     * @returns {void}
     */
    updateUserStatus() {
        this.updateUserIcon();
    }

    /**
     * 清理事件监听器和DOM元素
     * 
     * @returns {void}
     */
    destroy() {
        if (this.removeAuthListener) {
            this.removeAuthListener();
        }
        
        if (this.loginModal) {
            this.loginModal.remove();
        }
        
        const userMenu = document.getElementById('userMenu');
        if (userMenu) {
            userMenu.remove();
        }
        
        document.removeEventListener('click', this.handleClickOutsideMenu, true);
        
        this.isInitialized = false;
    }
}

// 导出认证UI类
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AuthUI;
} else {
    window.AuthUI = AuthUI;
}