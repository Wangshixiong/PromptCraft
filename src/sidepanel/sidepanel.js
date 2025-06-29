// sidepanel.js

/**
 * PromptCraft - 本地提示词管理工具
 * 版本: 1.2.2
 * 描述: 纯本地存储的提示词管理扩展，无需登录，保护隐私
 */

// DOM 元素引用已迁移到 uiManager.js 中的 ui 对象


// autoResizeTextarea 函数已迁移到 uiManager.js

// 全局状态
let allPrompts = [];
let currentUser = null;
let themeMode = 'auto';
// currentView 已迁移到 uiManager.js
let isProcessingContextMenu = false; // 标记是否正在处理右键菜单消息

// 统一的排序函数：按创建时间降序排序，最新的在前面
function sortPromptsByCreatedTime(prompts) {
    return prompts.sort((a, b) => {
        const timeA = new Date(a.created_at || a.createdAt || 0).getTime();
        const timeB = new Date(b.created_at || b.createdAt || 0).getTime();
        return timeB - timeA; // 降序排序，最新的在前面
    });
}

// getSystemTheme, applyTheme, updateThemeSelector 函数已迁移到 uiManager.js

// --- 实用工具函数 ---

const showLoading = () => ui.loadingOverlay.style.display = 'flex';
const hideLoading = () => ui.loadingOverlay.style.display = 'none';

/**
 * 智能修复右键菜单文本格式
 * 解决从网页选中文本时换行符丢失的问题，支持多种文本格式
 * @param {string} text - 原始文本
 * @returns {string} - 格式修复后的文本
 */
function formatContextMenuText(text) {
    if (!text || typeof text !== 'string') {
        return text;
    }
    
    let formattedText = text;
    
    // 1. 处理HTML实体字符
    const htmlEntities = {
        '&nbsp;': ' ',
        '&amp;': '&',
        '&lt;': '<',
        '&gt;': '>',
        '&quot;': '"',
        '&#39;': "'",
        '&hellip;': '...',
        '&mdash;': '—',
        '&ndash;': '–'
    };
    
    Object.keys(htmlEntities).forEach(entity => {
        formattedText = formattedText.replace(new RegExp(entity, 'g'), htmlEntities[entity]);
    });
    
    // 2. 检测并处理Markdown格式
    const hasMarkdown = /\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|#{1,6}\s/.test(formattedText);
    
    if (hasMarkdown) {
        // Markdown格式处理
        formattedText = formattedText.replace(/(\*\*[^*]+\*\*)\s+/g, '$1\n\n');
        formattedText = formattedText.replace(/(\*\*[^*]+：\*\*)\s+/g, '$1\n\n');
        formattedText = formattedText.replace(/(\*\*[^*]+:\*\*)\s+/g, '$1\n\n');
        formattedText = formattedText.replace(/\s+(\*\s+|\-\s+|\d+\.\s+)/g, '\n$1');
    }
    
    // 3. 智能段落分割 - 基于标点符号和语义
    // 处理中文标点后的段落分割
    formattedText = formattedText.replace(/([。！？])\s*([^\s。！？])/g, '$1\n\n$2');
    
    // 处理英文句号后的段落分割（大写字母开头）
    formattedText = formattedText.replace(/([.!?])\s+([A-Z][a-z])/g, '$1\n\n$2');
    
    // 处理冒号后的内容（通常是解释或列表）
    formattedText = formattedText.replace(/([：:])\s*([^\s：:])/g, '$1\n\n$2');
    
    // 4. 处理列表项（支持多种列表格式）
    // 数字列表：1. 2. 3. 或 1) 2) 3)
    formattedText = formattedText.replace(/\s+(\d+[.).]\s+)/g, '\n$1');
    
    // 符号列表：* - • ○ ▪ ▫
    formattedText = formattedText.replace(/\s+([*\-•○▪▫]\s+)/g, '\n$1');
    
    // 5. 处理特殊格式标识
    // 处理括号内的标注
    formattedText = formattedText.replace(/\s+(\([^)]+\))\s*/g, ' $1\n\n');
    
    // 处理引用格式
    formattedText = formattedText.replace(/\s+(>\s+)/g, '\n$1');
    
    // 6. 智能检测段落边界
    // 检测可能的段落标题（全大写、数字编号等）
    formattedText = formattedText.replace(/\s+([A-Z][A-Z\s]{2,}[A-Z])\s+/g, '\n\n$1\n\n');
    
    // 检测编号标题（如：第一章、Chapter 1等）
    formattedText = formattedText.replace(/\s+(第[一二三四五六七八九十\d]+[章节部分])\s+/g, '\n\n$1\n\n');
    formattedText = formattedText.replace(/\s+(Chapter\s+\d+|Section\s+\d+)\s+/gi, '\n\n$1\n\n');
    
    // 7. 处理特殊的网页文本模式
    // 处理可能的表格数据（制表符分隔）
    formattedText = formattedText.replace(/\t+/g, ' | ');
    
    // 处理连续的空格（可能来自网页布局）
    formattedText = formattedText.replace(/[ \u00A0]{3,}/g, '\n\n');
    
    // 8. 清理和规范化
    // 清理多余的空格
    formattedText = formattedText.replace(/[ \t]+/g, ' ');
    
    // 规范化换行符（最多保留两个连续换行）
    formattedText = formattedText.replace(/\n{3,}/g, '\n\n');
    
    // 清理行首行尾空格
    formattedText = formattedText.split('\n').map(line => line.trim()).join('\n');
    
    // 去除开头和结尾的空白字符
    formattedText = formattedText.trim();
    
    // 9. 最后的智能优化
    // 如果文本很短且没有明显的段落结构，保持原样
    if (formattedText.length < 100 && !formattedText.includes('\n\n')) {
        return text.trim();
    }
    
    return formattedText;
}

// showCustomConfirm 函数已迁移到 uiManager.js

// Toast 提示功能
// showToast 函数已迁移到 uiManager.js

// 兼容性函数，保持原有的showCustomAlert接口
function showCustomAlert(message) {
    ui.showToast(message, 'info');
    return Promise.resolve();
}

// showView 函数已迁移到 uiManager.js

// formatDate, escapeHtml, unescapeHtml 函数已迁移到 uiManager.js


// --- 认证功能 ---

// 清除所有数据的处理函数
async function clearAllData() {
    const isConfirmed = await ui.showCustomConfirm('您确定要清除所有提示词数据吗？此操作无法撤销。');
    if (!isConfirmed) return;
    
    safeShowLoading();
    
    try {
        // 通过消息通信清除本地数据
        const response = await chrome.runtime.sendMessage({ type: 'CLEAR_ALL_PROMPTS' });
        
        if (response.success) {
            allPrompts = [];
            ui.renderPrompts([]);
            ui.updateFilterButtons();
            ui.showToast('所有数据已清除', 'success');
        } else {
            console.error('清除数据失败:', response.error);
            ui.showToast('清除数据失败，请稍后再试', 'error');
        }
    } catch (error) {
        console.error('清除数据失败:', error);
        ui.showToast('清除数据失败，请稍后再试', 'error');
    }
    
    forceHideLoading();
}


// --- 数据处理 (CRUD) ---



async function loadUserPrompts(skipLoading = false) {

    if (!currentUser) {
        console.error('无法加载提示词：用户未设置');
        return;
    }
    if (!skipLoading) safeShowLoading();
    
    try {

        
        // 使用消息通信获取提示词数据
        const response = await new Promise((resolve, reject) => {
            chrome.runtime.sendMessage({ type: 'GET_ALL_PROMPTS' }, (response) => {
                if (chrome.runtime.lastError) {
                    reject(new Error(chrome.runtime.lastError.message));
                } else {
                    resolve(response);
                }
            });
        });
        
        // 检查响应是否成功
        if (!response.success) {
            throw new Error(response.error || '获取提示词数据失败');
        }
        
        const data = response.data;
        
        
        // 检查是否有加载错误（从后台服务返回的错误信息）
        if (response.loadError && response.loadError.hasError) {
            console.warn('检测到数据加载错误:', response.loadError.message);
            ui.showToast(response.loadError.message || '数据加载失败', 'warning');
        }
        
        // 按创建时间降序排序，新建的提示词在最上方
        allPrompts = sortPromptsByCreatedTime(data);

        ui.renderPrompts(allPrompts);
        ui.updateFilterButtons();

        
    } catch (err) {
        console.error('加载提示词时发生错误:', err);
        console.error('错误详情:', err.message, err.stack);
        // 即使出错，也尝试显示空列表
        allPrompts = [];
        ui.renderPrompts([]);
        ui.updateFilterButtons();
        ui.showToast('加载数据失败，请刷新重试', 'error');
    } finally {
        if (!skipLoading) forceHideLoading();
    }
}

// createSamplePrompts函数已移除，默认提示词现在由background.js在安装时创建

// savePrompt 函数已迁移到 appController.js 的 app.handleSavePrompt()

// deletePrompt 函数已迁移到 appController.js 的 app.handleDeletePrompt()

// --- 渲染与 UI 更新 ---

// renderPrompts 函数已迁移到 uiManager.js

// updateFilterButtons 函数已迁移到 uiManager.js

// updateCategoryOptions 函数已迁移到 uiManager.js

// setupCategoryInput 函数已迁移到 uiManager.js

// handleFilter 函数已迁移到 uiManager.js

function handleSearch(term) {
    const lowerCaseTerm = term.toLowerCase();
    const filtered = allPrompts.filter(p =>
        p.title.toLowerCase().includes(lowerCaseTerm) ||
        p.content.toLowerCase().includes(lowerCaseTerm) ||
        (p.category && p.category.toLowerCase().includes(lowerCaseTerm))
    );
    ui.renderPrompts(filtered);
}
// resetForm 函数已迁移到 appController.js 中的 app.resetForm()
// --- 预览功能 ---
// showPreview 函数已迁移到 uiManager.js

// --- 事件监听器设置 ---

// addCardEventListeners 函数已迁移到 uiManager.js

function setupEventListeners() {
    // 监听数据变更事件，实现实时界面刷新
    // 数据变更监听已合并到主监听器中

    // 主题选择器事件处理
    document.addEventListener('click', (e) => {
        const themeOption = e.target.closest('.theme-option');
        if (themeOption) {
            const selectedTheme = themeOption.dataset.theme;
            if (selectedTheme !== themeMode) {
                themeMode = selectedTheme;
                ui.applyTheme(themeMode);
                
                // 通过消息通信保存主题模式
                chrome.runtime.sendMessage({ 
                    type: 'SET_THEME_MODE', 
                    payload: themeMode 
                }).then(response => {
                    if (!response.success) {
                        console.error('保存主题模式失败:', response.error);
                    }
                }).catch(error => {
                    console.error('保存主题模式时发生错误:', error);
                });
            }
        }
    });

    // 监听系统主题变化
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
        if (themeMode === 'auto') {
            ui.applyTheme('auto');
        }
    });
    


    ui.addPromptBtn.addEventListener('click', () => {
        app.handleAddPrompt();
    });

    // 搜索延迟处理
    let searchTimeout = null;
    ui.searchInput.addEventListener('input', (e) => {
        const searchTerm = e.target.value.trim();
        
        // 清除之前的延迟
        if (searchTimeout) {
            clearTimeout(searchTimeout);
        }
        
        // 如果搜索框为空，立即显示所有提示词
        if (searchTerm === '') {
            handleSearch('');
            return;
        }
        
        // 如果输入长度小于1个字符，不进行搜索
        if (searchTerm.length < 1) {
            return;
        }
        
        // 延迟300ms后执行搜索
        searchTimeout = setTimeout(() => {
            handleSearch(searchTerm);
        }, 300);
    });
    
    ui.backToListBtn.addEventListener('click', () => ui.showView('mainView'));
    ui.cancelFormBtn.addEventListener('click', () => ui.showView('mainView'));
    ui.savePromptBtn.addEventListener('click', () => {
        app.handleSavePrompt();
    });
    
    // 字符计数功能
    const characterCountElement = document.getElementById('characterCount');
    
    ui.promptContentInput.addEventListener('input', () => {
        const currentLength = ui.promptContentInput.value.length;
        characterCountElement.textContent = `${currentLength} / 10000`;
        
        // 当接近限制时改变颜色
        if (currentLength > 9000) {
            characterCountElement.style.color = '#ef4444'; // 红色警告
        } else if (currentLength > 8000) {
            characterCountElement.style.color = '#f59e0b'; // 橙色提醒
        } else {
            characterCountElement.style.color = '#64748b'; // 默认灰色
        }
        
        // 自动调整textarea高度
        ui.autoResizeTextarea(ui.promptContentInput);
    });
    
    // 页面加载时也调整一次高度（用于编辑现有提示词的情况）
    ui.autoResizeTextarea(ui.promptContentInput);
    
    // 初始化字符计数显示
    const updateCharacterCount = () => {
        const currentLength = ui.promptContentInput.value.length;
        if (characterCountElement) {
            characterCountElement.textContent = `${currentLength} / 10000`;
        }
    };
    
    // 在表单显示时更新字符计数
     const originalShowView = ui.showView;
     ui.showView = function(viewName) {
         originalShowView.call(ui, viewName);
         if (viewName === 'formView') {
             setTimeout(updateCharacterCount, 0);
         }
     };
    
    // 设置相关事件监听器
    settingsBtn.addEventListener('click', () => {
        settingsOverlay.style.display = 'flex';
    });
    
    settingsClose.addEventListener('click', () => {
        settingsOverlay.style.display = 'none';
    });
    
    settingsOverlay.addEventListener('click', (e) => {
        if (e.target === settingsOverlay) {
            settingsOverlay.style.display = 'none';
        }
    });
    
    // 版本日志相关事件监听器
    if (versionNumber) {
        versionNumber.addEventListener('click', showVersionLog);
    }
    
    if (versionLogClose) {
        versionLogClose.addEventListener('click', () => {
            versionLogOverlay.style.display = 'none';
        });
    }
    
    if (versionLogOverlay) {
        versionLogOverlay.addEventListener('click', (e) => {
            if (e.target === versionLogOverlay) {
                versionLogOverlay.style.display = 'none';
            }
        });
    }
    
    // 导入导出功能
    downloadTemplateBtn.addEventListener('click', handleDownloadTemplate);
    exportBtn.addEventListener('click', handleExport);
    importBtn.addEventListener('click', () => {
        fileInput.click();
    });
    
    // 设置页面中的Google登录按钮
    const googleSignInBtn = document.getElementById('googleSignInBtn');
    if (googleSignInBtn) {
        googleSignInBtn.addEventListener('click', handleGoogleSignIn);
    }
    
    // 设置页面中的退出登录按钮
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }
    
    // 手动同步按钮事件监听器
    const manualSyncBtn = document.getElementById('manualSyncBtn');
    if (manualSyncBtn) {
        manualSyncBtn.addEventListener('click', handleManualSync);
    }
    

    
    fileInput.addEventListener('change', handleFileImport);
    
    // 设置存储变化监听器
    if (chrome.storage && chrome.storage.onChanged) {
        chrome.storage.onChanged.addListener((changes, namespace) => {
            // 监听同步时间的变化
            if (changes.lastSyncTime) {
    
                updateSyncTime();
            }
            
            // 监听提示词数据的变化
            if (changes.prompts) {
                const newPrompts = changes.prompts.newValue || [];
                allPrompts = sortPromptsByCreatedTime(newPrompts);
                ui.renderPrompts(allPrompts);
                ui.updateFilterButtons();
            }
        });
    }
    
    // 右键菜单监听已合并到主监听器中
}

// --- 导入导出功能 ---

// 下载模板
async function handleDownloadTemplate() {
    try {
        safeShowLoading();
        const result = await window.JSONUtils.downloadTemplate();
        if (result.success) {
            ui.showToast('JSON模板下载成功！', 'success');
        } else {
            ui.showToast(result.message, 'error');
        }
    } catch (error) {
        console.error('下载模板失败:', error);
        ui.showToast('下载模板失败，请稍后再试', 'error');
    } finally {
        forceHideLoading();
    }
}

// 导出提示词
async function handleExport() {
    try {
        if (allPrompts.length === 0) {
            ui.showToast('没有可导出的提示词', 'warning');
            return;
        }
        
        safeShowLoading();
        const result = await window.JSONUtils.exportToJSON(allPrompts);
        if (result.success) {
            ui.showToast(result.message, 'success');
        } else {
            ui.showToast(result.message, 'error');
        }
    } catch (error) {
        console.error('导出失败:', error);
        ui.showToast('导出失败，请稍后再试', 'error');
    } finally {
        forceHideLoading();
    }
}

// 处理文件导入
async function handleFileImport(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    // 重置文件输入
    event.target.value = '';
    
    try {
        safeShowLoading();
        
        // 检查文件类型
        const fileName = file.name.toLowerCase();
        if (!fileName.endsWith('.json')) {
            ui.showToast('请选择JSON文件（.json格式）', 'warning');
            return;
        }
        
        // 导入数据
        const importResult = await window.JSONUtils.importFromJSON(file);
        
        if (!importResult.success) {
            ui.showToast(importResult.message || '导入失败', 'error');
            return;
        }
        
        const { prompts: importedPrompts, errors, total, imported } = importResult;
        
        if (imported === 0) {
            ui.showToast(`导入完成：共 ${total} 条记录，全部导入失败。请检查JSON格式是否正确。`, 'error');
            if (errors && errors.length > 0) {
                const downloadFailed = await ui.showCustomConfirm('是否下载失败记录？');
                if (downloadFailed) {
                    await window.JSONUtils.exportFailedRecords(errors);
                }
            }
            return;
        }
        
        // 通过消息通信处理导入
        const response = await chrome.runtime.sendMessage({
            type: 'IMPORT_PROMPTS',
            payload: { importedPrompts }
        });
        
        if (response.success) {
             const { addedCount, updatedCount } = response.data;
             
             // 关闭设置弹窗
             settingsOverlay.style.display = 'none';
             
             // 显示导入结果
             let message = `导入完成：\n共计 ${total} 条记录\n新增 ${addedCount} 条`;
             if (updatedCount > 0) {
                 message += `\n更新 ${updatedCount} 条（同名覆盖）`;
             }
             if (errors && errors.length > 0) {
                 message += `\n失败 ${errors.length} 条`;
             }
             
             ui.showToast(message, addedCount > 0 || updatedCount > 0 ? 'success' : 'warning');
             // 注意：不再手动调用loadUserPrompts()，依赖chrome.storage.onChanged自动刷新UI
         } else {
             console.error('导入失败:', response.error);
             ui.showToast('导入失败：' + response.error, 'error');
         }
        
        // 如果有失败记录，询问是否下载
        if (errors && errors.length > 0) {
            const downloadFailed = await ui.showCustomConfirm('是否下载失败记录？');
            if (downloadFailed) {
                await window.JSONUtils.exportFailedRecords(errors);
            }
        }
        
    } catch (error) {
        console.error('导入失败:', error);
        ui.showToast('导入失败：' + error.message, 'error');
    } finally {
        forceHideLoading();
    }
}

// --- 初始化 ---

// 添加超时保护机制
let loadingTimeout = null;

function forceHideLoading() {
    hideLoading();
    if (loadingTimeout) {
        clearTimeout(loadingTimeout);
        loadingTimeout = null;
    }
}

function safeShowLoading() {
    showLoading();
    // 10秒后强制隐藏loading
    if (loadingTimeout) clearTimeout(loadingTimeout);
    loadingTimeout = setTimeout(() => {

        forceHideLoading();
        // 如果没有用户设置，显示主界面
        if (!currentUser) {
            ui.showView('mainView');
        }
    }, 10000);
}

async function initializeApp() {

    try {
        // 智能等待CSS加载完成后再显示主界面
        const showMainViewWhenReady = () => {
            const mainView = document.getElementById('mainView');
            if (!mainView) {
                console.error('mainView元素未找到，延迟重试');
                setTimeout(showMainViewWhenReady, 100);
                return;
            }
            
            // 检查CSS是否已加载完成
            const isStylesLoaded = document.readyState === 'complete' && 
                                 getComputedStyle(document.body).fontFamily !== '';
            
            if (isStylesLoaded) {
                ui.showView('mainView');
            } else {
        
                // 监听load事件或使用短延迟重试
                if (document.readyState === 'loading') {
                    document.addEventListener('DOMContentLoaded', showMainViewWhenReady, { once: true });
                } else {
                    setTimeout(showMainViewWhenReady, 50);
                }
            }
        };
        
        showMainViewWhenReady();
        
        // 创建虚拟用户，立即可用
        currentUser = {
            id: 'local-user',
            email: 'local@example.com'
        };
        
        // 立即获取主题设置并应用（直接使用dataService，避免消息通信）
        try {
            // 直接从dataService获取主题模式，避免不必要的消息通信
            const dataService = new DataService();
            themeMode = await dataService.getThemeMode();
            ui.applyTheme(themeMode);
    
        } catch (error) {
            console.error('获取主题模式时发生错误:', error);
            themeMode = 'light'; // 默认主题
            ui.applyTheme(themeMode);
        }

        // 设置事件监听器
        setupEventListeners();
        ui.setupCategoryInput();
        
        // 预加载登录资源（异步执行，不阻塞主流程）
        try {
            if (window.authService && typeof window.authService.preloadLoginResources === 'function') {
                window.authService.preloadLoginResources().catch(error => {
                    console.warn('预加载登录资源失败:', error);
                });
        
            }
        } catch (error) {
            console.warn('预加载登录资源时发生错误:', error);
        }
        
        // 主动查询后台的认证状态（关键修复：初次握手机制）
        try {
    
            const response = await chrome.runtime.sendMessage({
                type: 'GET_AUTH_STATE'
            });
            
            if (response && response.success && response.data) {
                const { isAuthenticated, session, user } = response.data;
    
                
                if (isAuthenticated && session && user) {
                    // 恢复认证状态
                    currentUser = user;
    
                    
                    // 更新UI为已登录状态
                    updateUIForAuthState(session);
                } else {
    
                }
            } else {
    
            }
        } catch (error) {
            console.warn('PromptCraft: 查询认证状态时发生错误:', error);
            // 即使查询失败也继续正常流程，保持本地模式
        }
        
        // 使用应用控制器获取数据后再渲染
        await app.initializeApp(); // 调用重构后的初始化方法
        
        // 初始化版本日志功能
        initializeVersionLog();
        
    } catch (error) {
        console.error('初始化应用时发生错误:', error);
        // 即使出错也尝试进入主界面
        ui.showView('mainView');
        // 清空骨架屏，显示错误状态
        if (ui.promptsContainer) {
            ui.promptsContainer.innerHTML = `<div style="text-align: center; padding: 40px 20px; color: #64748b;"><i class="fas fa-exclamation-triangle" style="font-size: 48px; margin-bottom: 16px; color: #ef4444;"></i><h3>加载失败</h3><p>请刷新页面重试</p></div>`;
        }
    }
}

// --- 认证相关函数 ---





/**
 * 设置登录按钮的加载状态
 * @param {boolean} isLoading - 是否显示加载状态
 */
function setLoginButtonLoading(isLoading, progressText = '') {
    const googleSignInBtn = document.getElementById('googleSignInBtn');
    if (!googleSignInBtn) return;
    
    const googleIcon = googleSignInBtn.querySelector('.google-icon');
    const btnText = googleSignInBtn.querySelector('.btn-text');
    
    if (isLoading) {
        // 添加加载状态类
        googleSignInBtn.classList.add('loading');
        
        // 隐藏Google图标，显示加载动画
        if (googleIcon) {
            googleIcon.style.display = 'none';
        }
        
        // 创建并插入加载动画
        const existingSpinner = googleSignInBtn.querySelector('.loading-spinner');
        if (!existingSpinner) {
            const spinner = document.createElement('div');
            spinner.className = 'loading-spinner';
            googleSignInBtn.insertBefore(spinner, btnText);
        }
        
        // 更改按钮文字
        if (btnText) {
            btnText.textContent = progressText || '正在登录...';
        }
    } else {
        // 移除加载状态类
        googleSignInBtn.classList.remove('loading');
        
        // 显示Google图标
        if (googleIcon) {
            googleIcon.style.display = 'block';
        }
        
        // 移除加载动画
        const spinner = googleSignInBtn.querySelector('.loading-spinner');
        if (spinner) {
            spinner.remove();
        }
        
        // 恢复按钮文字
        if (btnText) {
            btnText.textContent = '使用 Google 登录';
        }
    }
}

/**
 * 处理Google登录
 */
async function handleGoogleSignIn() {
    
    
    // 启动加载状态
    setLoginButtonLoading(true);
    
    // 只负责发送消息，不关心后续逻辑
    chrome.runtime.sendMessage({ 
        type: 'LOGIN_WITH_GOOGLE',
        progressCallback: true // 标识需要进度回调
    }, (response) => {
        if (chrome.runtime.lastError || !response.success) {
            // 检查是否为用户取消
            if (response?.cancelled || response?.error === 'USER_CANCELLED') {
        
                // 用户取消时静默恢复按钮状态，不显示错误提示
                setLoginButtonLoading(false);
            } else {
                console.error('登录命令发送失败或后台处理失败:', response?.error);
                ui.showToast('登录启动失败，请重试', 'error');
                // 登录失败时恢复按钮状态
                setLoginButtonLoading(false);
            }
        } else {
    
            // 移除"正在登录中"提示，避免与"登录成功"Toast重复
            // 注意：登录成功时不在这里恢复按钮状态，而是在收到认证状态更新消息时恢复
        }
    });
}

/**
 * 处理退出登录
 */
async function handleLogout() {

    // 只负责发送消息，不关心后续逻辑
    chrome.runtime.sendMessage({ type: 'LOGOUT' }, (response) => {
        if (chrome.runtime.lastError || !response.success) {
            console.error('退出命令发送失败或后台处理失败:', response?.error);
            ui.showToast('退出启动失败，请重试', 'error');
        } else {
        
            // 移除"正在退出中"提示，避免与"已退出登录"Toast重复
        }
    });
}

/**
 * 根据认证状态更新UI
 * @param {Object|null} session - 用户会话信息
 */
function updateUIForAuthState(session) {
    // 设置页面元素
    const loggedOutSection = document.getElementById('loggedOutSection');
    const loggedInSection = document.getElementById('loggedInSection');
    const userAvatar = document.getElementById('userAvatar');
    const defaultAvatar = document.getElementById('defaultAvatar');
    const userName = document.getElementById('userName');
    const userEmail = document.getElementById('userEmail');
    
    if (session && session.user) {
        // 已登录状态
        const user = session.user;
        
        // 更新设置页面中的用户信息
        if (loggedInSection) loggedInSection.style.display = 'block';
        if (loggedOutSection) loggedOutSection.style.display = 'none';
        
        // 更新用户头像
        if (userAvatar && user.user_metadata?.avatar_url) {
            const avatarImg = userAvatar.querySelector('.avatar-img');
            if (avatarImg) {
                avatarImg.src = user.user_metadata.avatar_url;
                userAvatar.style.display = 'block';
                if (defaultAvatar) defaultAvatar.style.display = 'none';
            }
        } else {
            if (userAvatar) userAvatar.style.display = 'none';
            if (defaultAvatar) {
                defaultAvatar.style.display = 'flex';
                // 设置默认头像的首字母
                const firstLetter = (user.email || 'U').charAt(0).toUpperCase();
                defaultAvatar.textContent = firstLetter;
            }
        }
        
        // 更新用户昵称和邮箱
        if (userName) {
            // 优先使用用户元数据中的姓名，否则使用邮箱前缀
            const displayName = user.user_metadata?.full_name || 
                               user.user_metadata?.name || 
                               (user.email ? user.email.split('@')[0] : '用户');
            userName.textContent = displayName;
            userName.title = displayName; // 添加hover显示完整用户名
        }
        
        if (userEmail) {
            const email = user.email || '未知邮箱';
            userEmail.textContent = email;
            userEmail.title = email; // 添加hover显示完整邮箱
        }
        
        // 初始化同步时间显示
        updateSyncTime();
        
        // 更新全局用户状态
        currentUser = {
            id: user.id,
            email: user.email,
            avatar_url: user.user_metadata?.avatar_url
        };
        


    } else {
        // 未登录状态
        // 更新设置页面状态
        if (loggedOutSection) loggedOutSection.style.display = 'block';
        if (loggedInSection) loggedInSection.style.display = 'none';
        
        // 保持本地用户状态以确保本地功能正常
        if (!currentUser) {
            currentUser = {
                id: 'local-user',
                email: 'local@example.com'
            };
        }
        

    }
}

/**
 * 初始化同步服务
 */





/**
 * 处理手动同步
 */
async function handleManualSync() {
    const manualSyncBtn = document.getElementById('manualSyncBtn');
    if (!manualSyncBtn) return;
    
    // 检查用户是否已登录
    if (!currentUser || currentUser.id === 'local-user') {
        ui.showToast('请先登录以使用云端同步功能', 'warning');
        return;
    }
    
    try {
    
        
        // 添加旋转动画
        manualSyncBtn.classList.add('syncing');
        manualSyncBtn.disabled = true;
        
        // 向后台发送同步请求并等待完成
        const response = await new Promise((resolve, reject) => {
            chrome.runtime.sendMessage({ type: 'MANUAL_SYNC' }, (response) => {
                if (chrome.runtime.lastError) {
                    reject(new Error(chrome.runtime.lastError.message));
                } else {
                    resolve(response);
                }
            });
        });
        
        if (response && response.success) {
    
            // 更新同步时间
            updateSyncTime();
            ui.showToast('同步成功！', 'success');
        } else {
            console.error('手动同步失败:', response?.error);
            ui.showToast('同步失败: ' + (response?.error || '未知错误'), 'error');
        }
        
    } catch (error) {
        console.error('手动同步失败:', error);
        ui.showToast('同步失败，请重试', 'error');
    } finally {
        // 移除旋转动画并恢复按钮状态
        manualSyncBtn.classList.remove('syncing');
        manualSyncBtn.disabled = false;
    }
}

/**
 * 更新同步时间显示
 */
async function updateSyncTime() {
    const syncTimeElement = document.getElementById('syncTime');
    if (syncTimeElement) {
        try {
            console.log('[DEBUG] 开始获取最后同步时间...');
            // 从存储中获取真实的最后同步时间
            const response = await chrome.runtime.sendMessage({
                type: 'GET_LAST_SYNC_TIME'
            });
            
            console.log('[DEBUG] GET_LAST_SYNC_TIME 响应:', response);
            
            if (response && response.success && response.data) {
                console.log('[DEBUG] 同步时间数据:', response.data);
                const syncTime = new Date(response.data);
                console.log('[DEBUG] 解析后的时间对象:', syncTime);
                console.log('[DEBUG] UTC时间:', syncTime.toISOString());
                console.log('[DEBUG] 本地时间:', syncTime.toString());
                
                // 使用北京时间格式化
                const timeString = syncTime.toLocaleString('zh-CN', {
                    timeZone: 'Asia/Shanghai',
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                    hour12: false
                });
                console.log('[DEBUG] 格式化后的时间字符串:', timeString);
                syncTimeElement.textContent = `最后同步时间: ${timeString}`;
            } else {
                console.log('[DEBUG] 没有同步时间数据，显示"尚未同步"');
                console.log('[DEBUG] response.success:', response?.success);
                console.log('[DEBUG] response.data:', response?.data);
                syncTimeElement.textContent = '尚未同步';
            }
        } catch (error) {
            console.error('[DEBUG] 获取同步时间失败:', error);
            syncTimeElement.textContent = '同步时间获取失败';
        }
    } else {
        console.error('[DEBUG] 找不到syncTime元素');
    }
}

/**
 * 更新同步状态
 * @param {string} status - 同步状态
 * @param {string} lastSyncTime - 最后同步时间
 */
function updateSyncStatus(status, lastSyncTime) {

    
    const syncTimeElement = document.getElementById('syncTime');
    
    switch (status) {
        case 'syncing':
            if (syncTimeElement) {
                syncTimeElement.textContent = '正在同步...';
            }
            break;
            
        case 'success':
            if (lastSyncTime) {
                const syncTime = new Date(lastSyncTime);
                const timeString = syncTime.toLocaleString('zh-CN', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit'
                });
                if (syncTimeElement) {
                    syncTimeElement.textContent = `最后同步时间: ${timeString}`;
                }
            } else {
                updateSyncTime();
            }
            ui.showToast('云端同步完成', 'success');
            break;
            
        case 'error':
            if (syncTimeElement) {
                syncTimeElement.textContent = '同步失败';
            }
            ui.showToast('同步失败，请稍后重试', 'error');
            break;
            
        case 'idle':
        default:
            if (syncTimeElement) {
                syncTimeElement.textContent = '尚未同步';
            }
            break;
    }
}

/**
 * 更新同步UI状态（保留用于兼容性）
 * @param {string} status - 同步状态
 * @param {string} message - 状态消息
 */
function updateSyncUI(status, message) {
    // 对于新的UI，只需要更新同步时间
    if (status === 'success' && message && message.includes('同步完成')) {
        updateSyncTime();
        ui.showToast('云端同步完成，数据已更新', 'success');
    }
}

// 同步相关功能已迁移到 background.js 中管理
 
 // 注释：移除重复的DOMContentLoaded监听器，避免重复初始化
 // 初始化逻辑已在 initializeApp() 函数内部的 showMainViewWhenReady() 中处理

// 全局消息监听器 - 接收来自 background.js 的 UI 更新指令
// 【新代码】请复制这段完整的代码来替换

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    // 处理来自后台的消息
    switch (message.type) {
        case 'UPDATE_AUTH_UI':
            console.log('Sidepanel: 收到 UPDATE_AUTH_UI 消息', message.session);
            updateUIForAuthState(message.session);
            setLoginButtonLoading(false);
            if (message.session) {
                ui.showToast('登录成功！', 'success');
                const userDropdown = document.getElementById('userDropdown');
                if (userDropdown) {
                    userDropdown.classList.remove('show');
                }
            } else {
                ui.showToast('已退出登录', 'success');
            }
            break;
            
        case 'LOGIN_PROGRESS':
            setLoginButtonLoading(true, message.message);
            break;
            
        case 'LOGIN_ERROR':
            ui.showToast('登录失败: ' + message.error, 'error');
            setLoginButtonLoading(false);
            break;
            
        case 'LOGIN_CANCELLED':
            setLoginButtonLoading(false);
            break;
            
        case 'LOGOUT_ERROR':
            ui.showToast('退出失败: ' + message.error, 'error');
            break;
            
        case 'DATA_CHANGED':
            setTimeout(() => {
                loadUserPrompts(true).catch(error => {
                    console.error('数据变更后刷新界面失败:', error);
                });
            }, 100);
            break;
            
        case 'SYNC_STATUS_CHANGED':
            if (message.operation === 'SYNC_COMPLETED') {
                updateSyncTime();
            }
            break;
            
        case 'ADD_FROM_CONTEXT_MENU':
            if (message.data?.content) {
                isProcessingContextMenu = true;
                const waitForInitialization = async () => {
                    if (currentUser && ui.addPromptBtn && ui.promptContentInput) {
                        const isEditing = ui.promptIdInput.value && ui.promptIdInput.value.trim() !== '';
                        if (ui.currentView !== 'formView') {
                            ui.showView('formView');
                            requestAnimationFrame(() => {
                                app.resetForm();
                                ui.promptContentInput.value = formatContextMenuText(message.data.content);
                                ui.promptContentInput.dispatchEvent(new Event('input', { bubbles: true }));
                                setTimeout(() => { isProcessingContextMenu = false; }, 1000);
                                sendResponse({ status: "success", message: "Content received and form populated via rAF after view switch." });
                            });
                        } else if (isEditing) {
                            const userConfirm = await ui.showCustomConfirm('💡 是否要放弃当前编辑并创建新的提示词？');
                            if (userConfirm) {
                                requestAnimationFrame(() => {
                                    app.resetForm();
                                    ui.promptContentInput.value = formatContextMenuText(message.data.content);
                                    ui.promptContentInput.dispatchEvent(new Event('input', { bubbles: true }));
                                    setTimeout(() => { isProcessingContextMenu = false; }, 1000);
                                    sendResponse({ status: "success", message: "User confirmed to abandon edit and create new prompt." });
                                });
                            } else {
                                setTimeout(() => { isProcessingContextMenu = false; }, 100);
                                sendResponse({ status: "cancelled", message: "User cancelled the operation." });
                            }
                        } else {
                            requestAnimationFrame(() => {
                                resetForm();
                                ui.promptContentInput.value = formatContextMenuText(message.data.content);
                                ui.promptContentInput.dispatchEvent(new Event('input', { bubbles: true }));
                                setTimeout(() => { isProcessingContextMenu = false; }, 1000);
                                sendResponse({ status: "success", message: "Content received and form populated via rAF in existing view." });
                            });
                        }
                    } else {
                        setTimeout(waitForInitialization, 100);
                    }
                };
                waitForInitialization();
                return true; // 保持消息通道开放以进行异步响应
            }
            break;
            
        // 对于所有其他类型的消息，我们都静默处理，不做任何响应。
        // 这样就不会干扰 background.js 的工作了。
        default:
            // 不做任何事情
            break;
    }

    // 默认返回 false 或 undefined，表示我们是同步处理的，并且已经处理完毕。
    // 这就把响应的机会留给了其他脚本。
    return false;
});

// 应用启动入口 - 确保只初始化一次
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp, { once: true });
} else {
    // DOM已经加载完成，直接初始化
    initializeApp();
}

// ===== 版本日志功能 =====

/**
 * 加载版本日志数据
 * @returns {Promise<Object>} 版本日志数据
 */
async function loadVersionLogData() {
    try {
        const response = await fetch('/assets/data/version-log.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error('加载版本日志数据失败:', error);
        return null;
    }
}

/**
 * 显示版本日志弹窗
 */
async function showVersionLog() {
    const versionData = await loadVersionLogData();
    if (!versionData) {
        console.error('无法加载版本日志数据');
        return;
    }

    // 清空之前的内容
    versionLogBody.innerHTML = '';

    // 按版本号倒序显示（最新版本在前）
    const sortedVersions = versionData.versions.sort((a, b) => {
        // 简单的版本号比较（假设格式为 x.y.z）
        const aVersion = a.version.split('.').map(Number);
        const bVersion = b.version.split('.').map(Number);
        
        for (let i = 0; i < Math.max(aVersion.length, bVersion.length); i++) {
            const aPart = aVersion[i] || 0;
            const bPart = bVersion[i] || 0;
            if (aPart !== bPart) {
                return bPart - aPart; // 倒序
            }
        }
        return 0;
    });

    // 生成版本日志HTML
    sortedVersions.forEach(version => {
        const versionItem = document.createElement('div');
        versionItem.className = 'version-item';
        
        const versionHeader = document.createElement('div');
        versionHeader.className = 'version-header';
        
        const versionTitle = document.createElement('h3');
        versionTitle.className = 'version-title';
        versionTitle.textContent = `v${version.version}`;
        
        const versionDate = document.createElement('span');
        versionDate.className = 'version-date';
        versionDate.textContent = version.date;
        
        versionHeader.appendChild(versionTitle);
        versionHeader.appendChild(versionDate);
        
        const versionContent = document.createElement('div');
        versionContent.className = 'version-content';
        
        if (version.title) {
            const titleElement = document.createElement('h4');
            titleElement.className = 'version-subtitle';
            titleElement.textContent = version.title;
            versionContent.appendChild(titleElement);
        }
        
        const changesList = document.createElement('ul');
        changesList.className = 'version-changes';
        
        version.changes.forEach(change => {
            const changeItem = document.createElement('li');
            changeItem.textContent = change;
            changesList.appendChild(changeItem);
        });
        
        versionContent.appendChild(changesList);
        
        versionItem.appendChild(versionHeader);
        versionItem.appendChild(versionContent);
        
        versionLogBody.appendChild(versionItem);
    });

    // 显示弹窗
    versionLogOverlay.style.display = 'flex';
    
    // 标记用户已查看最新版本
    await markVersionAsViewed(versionData.currentVersion);
}

/**
 * 隐藏版本日志弹窗
 */
function hideVersionLog() {
    versionLogOverlay.style.display = 'none';
}

/**
 * 检查是否有新版本
 */
async function checkForNewVersion() {
    const versionData = await loadVersionLogData();
    if (!versionData) {
        return;
    }

    try {
        // 从本地存储获取用户最后查看的版本
        const result = await chrome.storage.local.get(['lastViewedVersion']);
        const lastViewedVersion = result.lastViewedVersion;
        
        // 如果用户从未查看过版本日志，或者当前版本比最后查看的版本新
        if (!lastViewedVersion || versionData.currentVersion !== lastViewedVersion) {
            // 显示NEW标识
            versionNew.style.display = 'inline-block';
        } else {
            // 隐藏NEW标识
            versionNew.style.display = 'none';
        }
    } catch (error) {
        console.error('检查新版本失败:', error);
    }
}

/**
 * 标记版本为已查看
 * @param {string} version 版本号
 */
async function markVersionAsViewed(version) {
    try {
        await chrome.storage.local.set({ lastViewedVersion: version });
        // 隐藏NEW标识
        versionNew.style.display = 'none';
    } catch (error) {
        console.error('标记版本为已查看失败:', error);
    }
}

/**
 * 初始化版本日志功能
 */
function initializeVersionLog() {
    // 检查是否有新版本
    checkForNewVersion();
}

