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
      const res = await fetch(url);
      this.dict = res.ok ? await res.json() : {};
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
      const q = (sel) => document.querySelector(sel);
      const setText = (sel, key) => { const el = q(sel); if (el) el.textContent = this.t(key); };
      const setPlaceholder = (sel, key) => { const el = q(sel); if (el) el.placeholder = this.t(key); };
      setPlaceholder('#searchInput', 'search.placeholder');
      setText('#formTitle', 'form.title.new');
      const loginBtnText = document.querySelector('#googleSignInBtn .btn-text');
      if (loginBtnText) loginBtnText.textContent = this.t('settings.login');
      const logoutBtn = q('#logoutBtn'); if (logoutBtn) logoutBtn.textContent = this.t('settings.logout');
      const importCard = q('#importBtn .data-card-title'); if (importCard) importCard.textContent = this.t('data.import');
      const exportCard = q('#exportBtn .data-card-title'); if (exportCard) exportCard.textContent = this.t('data.export');
      const templateCard = q('#downloadTemplateBtn .data-card-title'); if (templateCard) templateCard.textContent = this.t('data.template');
      const settingsTitle = document.querySelector('.settings-header h3'); if (settingsTitle) settingsTitle.textContent = this.t('settings.title');
      const syncTime = q('#syncTime'); if (syncTime && syncTime.textContent.includes('尚未同步')) syncTime.textContent = this.t('sync.lastTimePrefix') + this.t('sync.none');
    }
  };
  window.i18n = I18N;
})();
