/**
 * I18nHelper - 国际化辅助工具
 * 职责: 处理页面文本的自动翻译和替换
 */
const I18nHelper = {
    /**
     * 初始化国际化
     * 自动扫描带有 data-i18n 属性的元素并应用翻译
     */
    init() {
        this.setPageLanguage();
        this.translatePage();
    },

    /**
     * 设置页面语言属性
     */
    setPageLanguage() {
        try {
            const lang = chrome.i18n.getUILanguage();
            document.documentElement.lang = lang;
            
            // 检测并设置文字方向 (RTL支持)
            const rtlLangs = ['ar', 'he', 'fa', 'ur'];
            const isRtl = rtlLangs.some(l => lang.startsWith(l));
            document.documentElement.dir = isRtl ? 'rtl' : 'ltr';
            
            if (isRtl) {
                document.documentElement.classList.add('rtl-mode');
            }
        } catch (e) {
            console.warn('Failed to set page language:', e);
        }
    },

    /**
     * 获取翻译文本
     * @param {string} key - 翻译键值
     * @param {string} defaultText - 默认文本（当找不到翻译时使用）
     * @returns {string} 翻译后的文本
     */
    getMessage(key, defaultText = '') {
        try {
            const message = chrome.i18n.getMessage(key);
            return message || defaultText;
        } catch (e) {
            console.warn(`I18n error for key: ${key}`, e);
            return defaultText;
        }
    },

    /**
     * 翻译页面所有标记元素
     */
    translatePage() {
        const elements = document.querySelectorAll('[data-i18n]');
        elements.forEach(element => {
            const key = element.getAttribute('data-i18n');
            const message = this.getMessage(key);
            if (message) {
                if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
                    element.placeholder = message;
                } else {
                    element.textContent = message;
                }
            }
        });

        // 处理 title 属性的翻译
        const titleElements = document.querySelectorAll('[data-i18n-title]');
        titleElements.forEach(element => {
            const key = element.getAttribute('data-i18n-title');
            const message = this.getMessage(key);
            if (message) {
                element.title = message;
            }
        });
        
        // 处理 aria-label 属性的翻译
        const ariaElements = document.querySelectorAll('[data-i18n-aria]');
        ariaElements.forEach(element => {
            const key = element.getAttribute('data-i18n-aria');
            const message = this.getMessage(key);
            if (message) {
                element.setAttribute('aria-label', message);
            }
        });

        // 处理 placeholder 属性的翻译
        const placeholderElements = document.querySelectorAll('[data-i18n-placeholder]');
        placeholderElements.forEach(element => {
            const key = element.getAttribute('data-i18n-placeholder');
            const message = this.getMessage(key);
            if (message) {
                element.placeholder = message;
            }
        });
    }
};

// 导出全局对象
window.I18nHelper = I18nHelper;
