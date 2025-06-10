/**
 * Supabase客户端配置
 * 用于连接Supabase后端服务，提供用户认证和数据管理功能
 */

// Supabase配置
const SUPABASE_URL = 'https://uwgxhtrbixsdabjvuuaj.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV3Z3hodHJiaXhzZGFianZ1dWFqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk0NzQ0NzUsImV4cCI6MjA2NTA1MDQ3NX0.6R4t3Bxy6g-ajI1Fym-RWmZgIvlAGLxy6uV1wbTULN0';

/**
 * Supabase客户端类
 * 封装所有与Supabase相关的操作
 */
class SupabaseClient {
  constructor() {
    this.url = SUPABASE_URL;
    this.key = SUPABASE_ANON_KEY;
    this.authToken = null;
    this.user = null;
    
    // 初始化时尝试恢复用户会话
    this.restoreSession();
  }

  /**
   * 生成随机字符串作为 code_verifier
   * @param {number} length - 字符串长度
   * @returns {string} code_verifier
   */
  generateCodeVerifier(length = 64) {
    const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
    let result = '';
    const randomValues = new Uint8Array(length);
    crypto.getRandomValues(randomValues);
    for (let i = 0; i < length; i++) {
      result += charset[randomValues[i] % charset.length];
    }
    return result;
  }

  /**
   * 根据 code_verifier 生成 code_challenge (SHA256 then Base64URL)
   * @param {string} verifier - code_verifier
   * @returns {Promise<string>} code_challenge
   */
  async generateCodeChallenge(verifier) {
    const encoder = new TextEncoder();
    const data = encoder.encode(verifier);
    const digest = await crypto.subtle.digest('SHA-256', data);
    // Base64URL encoding
    return btoa(String.fromCharCode(...new Uint8Array(digest)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  }

  /**
   * 发送HTTP请求的通用方法（带重试机制）
   * @param {string} endpoint - API端点
   * @param {Object} options - 请求选项
   * @param {number} retries - 重试次数
   * @returns {Promise<Object>} 响应数据
   */
  async makeRequest(endpoint, options = {}, retries = 3) {
    const url = `${this.url}/rest/v1${endpoint}`;
    const headers = {
      'apikey': this.key,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation',
      ...options.headers
    };
    
    // 如果用户已登录，添加授权头
    if (this.authToken) {
      headers['Authorization'] = `Bearer ${this.authToken}`;
    }
    
    const config = {
      method: options.method || 'GET',
      headers,
      ...options
    };

    if (config.body && typeof config.body === 'object') {
      config.body = JSON.stringify(config.body);
    }
    
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const response = await fetch(url, {
          ...config,
          timeout: 10000 // 10秒超时
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          let errorMessage;
          
          try {
            const errorData = JSON.parse(errorText);
            errorMessage = errorData.message || errorData.error_description || errorText;
          } catch {
            errorMessage = errorText;
          }
          
          // 检查是否是 schema cache 相关错误
          if (errorMessage.includes('schema cache') || errorMessage.includes('Could not find')) {
            console.warn('检测到 schema cache 错误，尝试刷新缓存:', errorMessage);
            try {
              await this.refreshSchemaCache();
              // 刷新后等待一下再重试
              await new Promise(resolve => setTimeout(resolve, 1000));
              continue;
            } catch (refreshError) {
              console.error('刷新 schema cache 失败:', refreshError);
            }
          }
          
          // 对于认证错误，不进行重试
          if (response.status === 401 || response.status === 403) {
            throw new Error(`认证失败: ${errorMessage}`);
          }
          
          // 对于客户端错误（4xx），不进行重试
          if (response.status >= 400 && response.status < 500) {
            throw new Error(`请求错误: ${response.status} ${errorMessage}`);
          }
          
          // 对于服务器错误（5xx），进行重试
          if (attempt === retries) {
            throw new Error(`服务器错误: ${response.status} ${errorMessage}`);
          }
          
          // 等待后重试
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
          continue;
        }
        
        const data = await response.json();
        return data;
        
      } catch (error) {
        if (attempt === retries) {
          if (error.name === 'TypeError' && error.message.includes('fetch')) {
            console.error('网络连接失败:', error);
            throw new Error('网络连接失败，请检查网络设置');
          }
          console.error('Supabase请求失败:', error);
          throw error;
        }
        
        // 网络错误重试
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      }
    }
  }

  /**
   * GitHub OAuth登录（使用Supabase OAuth流程）
   * @returns {Promise<Object>} 登录结果
   */
  async signInWithGitHub() {
    try {
      // 1. 获取 Chrome Extension 的 redirect URL
      const redirectUrl = chrome.identity.getRedirectURL();
      console.log('Chrome Extension Redirect URL:', redirectUrl);

      // 2. 构建 Supabase GitHub OAuth URL
      const supabaseAuthUrl = `${this.url}/auth/v1/authorize?` +
        `provider=github&` +
        `redirect_to=${encodeURIComponent(redirectUrl)}`;
      console.log('Supabase GitHub Auth URL:', supabaseAuthUrl);

      // 3. 使用 Chrome Identity API 启动 OAuth 流程
      const responseUrl = await new Promise((resolve, reject) => {
        chrome.identity.launchWebAuthFlow({
          url: supabaseAuthUrl,
          interactive: true
        }, (responseUrlWithTokens) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else if (!responseUrlWithTokens) {
            reject(new Error('用户取消了登录或授权失败'));
          } else {
            resolve(responseUrlWithTokens);
          }
        });
      });
      console.log('Response URL with Tokens:', responseUrl);

      // 4. 从返回的 URL 中解析访问令牌
      const urlParams = new URLSearchParams(new URL(responseUrl).hash.substring(1)); // 使用 hash 而不是 search
      const accessToken = urlParams.get('access_token');
      const refreshToken = urlParams.get('refresh_token');
      const tokenType = urlParams.get('token_type');
      
      if (!accessToken) {
        // 如果 hash 中没有，尝试从 search 参数中获取
        const searchParams = new URLSearchParams(new URL(responseUrl).search);
        const searchAccessToken = searchParams.get('access_token');
        if (!searchAccessToken) {
          throw new Error('未能从 Supabase 获取访问令牌');
        }
        console.log('Access Token found in search params');
      }
      
      const finalAccessToken = accessToken || urlParams.get('access_token');
      console.log('Access Token from Supabase:', finalAccessToken ? 'Found' : 'Not found');

      // 5. 获取用户信息
       const userResponse = await fetch(`${this.url}/auth/v1/user`, {
         headers: {
           'apikey': this.key,
           'Authorization': `Bearer ${finalAccessToken}`
         }
       });

      if (!userResponse.ok) {
        const errorText = await userResponse.text();
        console.error('User info response error:', errorText);
        throw new Error(`获取用户信息失败: ${userResponse.status} ${errorText}`);
      }

      const userData = await userResponse.json();
      console.log('User data from Supabase:', userData);

      // 保存认证信息
      this.authToken = finalAccessToken;
      this.user = userData;
      
      // 持久化存储
      await this.saveSession({
        access_token: finalAccessToken,
        refresh_token: refreshToken,
        token_type: tokenType,
        user: userData
      });

      return {
        success: true,
        user: userData,
        session: {
          access_token: accessToken,
          refresh_token: refreshToken,
          token_type: tokenType,
          user: userData
        }
      };
    } catch (error) {
      console.error('GitHub登录失败:', error);
      throw error;
    }
  }

  /**
   * 登出
   */
  async signOut() {
    try {
      if (this.authToken) {
        await fetch(`${this.url}/auth/v1/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.authToken}`,
            'apikey': this.key
          }
        });
      }
    } catch (error) {
      console.error('登出请求失败:', error);
    } finally {
      // 清除本地状态
      this.authToken = null;
      this.user = null;
      await this.clearSession();
    }
  }

  /**
   * 保存会话信息到本地存储
   * @param {Object} session - 会话信息
   */
  async saveSession(session) {
    await chrome.storage.local.set({
      'promptcraft_session': session
    });
  }

  /**
   * 恢复会话信息
   */
  async restoreSession() {
    try {
      const result = await chrome.storage.local.get('promptcraft_session');
      const session = result.promptcraft_session;
      
      if (session && session.access_token) {
        this.authToken = session.access_token;
        this.user = session.user;
        
        // 验证token是否仍然有效
        const isValid = await this.validateToken();
        if (!isValid) {
          await this.clearSession();
        }
      }
    } catch (error) {
      console.error('恢复会话失败:', error);
      await this.clearSession();
    }
  }

  /**
   * 验证token有效性
   * @returns {Promise<boolean>} token是否有效
   */
  async validateToken() {
    try {
      const response = await fetch(`${this.url}/auth/v1/user`, {
        headers: {
          'Authorization': `Bearer ${this.authToken}`,
          'apikey': this.key
        }
      });
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  /**
   * 清除会话信息
   */
  async clearSession() {
    await chrome.storage.local.remove('promptcraft_session');
    this.authToken = null;
    this.user = null;
  }

  /**
   * 获取当前用户
   * @returns {Object|null} 用户信息
   */
  getCurrentUser() {
    return this.user;
  }

  /**
   * 检查用户是否已登录
   * @returns {boolean} 是否已登录
   */
  isAuthenticated() {
    return !!(this.authToken && this.user);
  }

  // ==================== 提示词数据操作 ====================

  /**
   * 获取用户的所有提示词
   * @returns {Promise<Array>} 提示词列表
   */
  async getPrompts() {
    if (!this.isAuthenticated()) {
      throw new Error('用户未登录');
    }

    return await this.makeRequest('/prompts?select=*&order=created_at.desc');
  }

  /**
   * 创建新提示词
   * @param {Object} prompt - 提示词数据
   * @returns {Promise<Object>} 创建的提示词
   */
  async createPrompt(prompt) {
    if (!this.isAuthenticated()) {
      throw new Error('用户未登录');
    }

    const promptData = {
      title: prompt.title,
      content: prompt.content,
      category: prompt.category || '默认分类',
      user_id: this.user.id
      // 移除手动设置的时间戳，让数据库自动处理
    };

    return await this.makeRequest('/prompts', {
      method: 'POST',
      body: promptData
    });
  }

  /**
   * 更新提示词
   * @param {string} id - 提示词ID
   * @param {Object} updates - 更新数据
   * @returns {Promise<Object>} 更新后的提示词
   */
  async updatePrompt(id, updates) {
    if (!this.isAuthenticated()) {
      throw new Error('用户未登录');
    }

    // 移除手动设置的 updated_at，让数据库触发器自动处理
    const updateData = { ...updates };

    return await this.makeRequest(`/prompts?id=eq.${id}`, {
      method: 'PATCH',
      body: updateData
    });
  }

  /**
   * 删除提示词
   * @param {string} id - 提示词ID
   * @returns {Promise<void>}
   */
  async deletePrompt(id) {
    if (!this.isAuthenticated()) {
      throw new Error('用户未登录');
    }

    await this.makeRequest(`/prompts?id=eq.${id}`, {
      method: 'DELETE'
    });
  }

  /**
   * 获取用户的所有分类
   * @returns {Promise<Array>} 分类列表
   */
  async getCategories() {
    if (!this.isAuthenticated()) {
      throw new Error('用户未登录');
    }

    return await this.makeRequest('/rpc/get_user_categories');
  }

  /**
   * 刷新 Supabase schema cache
   * 当遇到 schema cache 相关错误时调用
   */
  async refreshSchemaCache() {
    try {
      // 通过 NOTIFY 命令刷新 PostgREST schema cache
      await this.makeRequest('/rpc/notify_pgrst_reload', {
        method: 'POST'
      });
    } catch (error) {
      console.warn('刷新 schema cache 失败:', error);
      // 如果 notify 函数不存在，尝试其他方法
      try {
        // 发送一个简单的查询来触发 cache 刷新
        await this.makeRequest('/prompts?limit=1');
      } catch (fallbackError) {
        console.warn('备用 cache 刷新方法也失败:', fallbackError);
      }
    }
  }

  /**
   * 初始化新用户的默认提示词
   * @returns {Promise<void>}
   */
  async initializeDefaultPrompts() {
    if (!this.isAuthenticated()) {
      throw new Error('用户未登录');
    }

    const defaultPrompts = [
      {
        title: '代码审查助手',
        content: '请帮我审查以下代码，重点关注：\n1. 代码逻辑是否正确\n2. 是否存在潜在的bug\n3. 代码风格和最佳实践\n4. 性能优化建议\n\n代码：\n[在此粘贴代码]',
        category: '编程开发'
      },
      {
        title: '文章总结专家',
        content: '请帮我总结以下文章的核心要点：\n\n1. 主要观点（3-5个）\n2. 关键数据或事实\n3. 结论或建议\n4. 个人思考启发\n\n文章内容：\n[在此粘贴文章]',
        category: '内容创作'
      },
      {
        title: 'Midjourney绘画提示词',
        content: '一个[主题描述]，[风格描述]，[构图描述]，[光线描述]，[色彩描述] --ar 16:9 --v 6 --style raw',
        category: 'AI绘画'
      }
    ];

    for (const prompt of defaultPrompts) {
      try {
        await this.createPrompt(prompt);
      } catch (error) {
        console.error('创建默认提示词失败:', error);
      }
    }
  }
}

// 创建全局实例
const supabaseClient = new SupabaseClient();

// 导出供其他模块使用
if (typeof module !== 'undefined' && module.exports) {
  module.exports = supabaseClient;
}