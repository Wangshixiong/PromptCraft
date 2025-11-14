(() => {
  const I18N = {
    lang: null,
    dict: {},
    async init() {
      let lang = null;
      try {
        const resp = await chrome.runtime.sendMessage({ type: 'GET_LANGUAGE' });
        if (resp && resp.success) lang = resp.data;
      } catch (_) {}
      if (!lang) {
        const ui = (chrome.i18n && chrome.i18n.getUILanguage) ? chrome.i18n.getUILanguage() : navigator.language || 'en';
        lang = ui.startsWith('zh') ? 'zh_CN' : 'en';
      }
      this.lang = lang;
      const url = chrome.runtime.getURL(`assets/i18n/${lang}.json`);
      try {
        const res = await fetch(url);
        this.dict = res.ok ? await res.json() : {};
        this.applyTranslations();
        this.setInitialActiveLanguage();
      } catch (err) {
        console.error('Failed to load translations:', err);
        this.dict = {};
        this.applyTranslations();
      }
    },
    
    // 设置初始语言按钮的选中状态
    setInitialActiveLanguage() {
      setTimeout(() => {
        this.updateLanguageOptions();
      }, 100); // 短暂延迟确保DOM已完全渲染
    },
    
    setInitialActiveTheme() {
      setTimeout(() => {
        this.updateThemeOptions();
      }, 100); // 短暂延迟确保DOM已完全渲染
    },
    t(key) {
      if (this.dict && this.dict[key] != null) return this.dict[key];
      return key;
    },
    async setLanguage(lang) {
      try {
        await chrome.runtime.sendMessage({ type: 'SET_LANGUAGE', payload: lang });
        this.lang = lang;
        await this.init();
      } catch (_) {}
    },
    applyTranslations() {
      const qAll = (sel) => document.querySelectorAll(sel);
      
      // 修复：智能识别需要文本替换的元素，避免替换包含图标的按钮
      qAll('[data-i18n]').forEach(el => {
        // 检查元素是否包含图标（svg或i元素）
        const hasIcon = el.querySelector('svg, i') !== null;
        const key = el.getAttribute('data-i18n');
        
        if (key && !hasIcon) {
          // 仅替换不包含图标的元素的文本内容
          el.textContent = this.t(key);
        }
      });
      
      // 通用：data-i18n-attr 属性替换（placeholder/title/aria-label）
      qAll('[data-i18n-attr]').forEach(el => {
        const spec = el.getAttribute('data-i18n-attr');
        const key = el.getAttribute('data-i18n');
        if (!spec || !key) return;
        const val = this.t(key);
        spec.split(',').map(s => s.trim()).forEach(attr => {
          if (attr === 'placeholder') el.placeholder = val;
          else if (attr === 'title') el.title = val;
          else if (attr === 'aria-label') el.setAttribute('aria-label', val);
        });
      });
      // 额外：常用位置兜底（避免遗漏）
      const searchInput = document.querySelector('#searchInput');
      if (searchInput && !searchInput.placeholder) searchInput.placeholder = this.t('search.placeholder');
      const formTitle = document.querySelector('#formTitle');
      if (formTitle && !formTitle.textContent) formTitle.textContent = this.t('form.title.new');
      // 设置页面标题
      document.title = this.t('document.title');
      // 更新语言与主题选中状态
      this.updateLanguageOptions();
      this.updateThemeOptions();
    },
    
    // 更新语言选项的选中状态
    updateLanguageOptions() {
      const languageOptions = document.querySelectorAll('.theme-option[data-language]');
      languageOptions.forEach(option => {
        option.classList.remove('active');
        if (option.dataset.language === this.lang) {
          option.classList.add('active');
        }
      });
    },
    
    // 更新主题选项的选中状态
    updateThemeOptions() {
      const themeOptions = document.querySelectorAll('.theme-option[data-theme]');
      if (themeOptions.length > 0) {
        // 获取当前主题模式，从全局变量或默认值
        const currentTheme = window.themeMode || 'auto';
        themeOptions.forEach(option => {
          option.classList.remove('active');
          if (option.dataset.theme === currentTheme) {
            option.classList.add('active');
          }
        });
      }
    }
  };
  window.i18n = I18N;
})();
