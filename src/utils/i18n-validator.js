// 国际化翻译校验工具
// 用于验证翻译文件的完整性、一致性和格式规范

class I18nValidator {
    constructor() {
        this.requiredKeys = this.getRequiredKeys();
        this.namingConvention = this.getNamingConvention();
    }

    /**
     * 定义必须存在的翻译键值
     */
    getRequiredKeys() {
        return [
            // 应用基本信息
            'app.title', 'search.placeholder',
            
            // 按钮文本
            'button.add', 'button.settings', 'button.copy', 'button.edit', 
            'button.delete', 'button.cancel', 'button.save',
            
            // 表单相关
            'form.label.title', 'form.label.content', 'form.title.new', 'form.title.edit',
            'form.placeholder.title', 'form.placeholder.content',
            
            // 筛选和标签
            'filter.all', 'filter.tags', 'filter.showMore', 'filter.collapse',
            'tag.input.addHint', 'tag.input.addMore', 'tag.recommended.empty',
            'tag.recommended.label', 'tag.remove',
            
            // 状态提示
            'empty.title', 'empty.desc', 'noResults',
            'sync.lastTimePrefix', 'sync.none', 'sync.loading',
            'sync.enabled', 'sync.disabled', 'sync.manual',
            
            // 操作反馈
            'toast.syncSuccess', 'toast.syncError', 'toast.copySuccess', 
            'toast.copyFail', 'toast.languageChangeError',
            'prompt.addSuccess', 'prompt.updateSuccess', 'prompt.deleteSuccess',
            'import.success', 'export.success', 'data.clearSuccess',
            'theme.change', 'language.change',
            
            // 设置界面
            'settings.title', 'settings.account', 'settings.app', 
            'settings.data', 'settings.about', 'settings.theme', 
            'settings.language', 'settings.features', 'settings.quickInvoke',
            'settings.login', 'settings.logout',
            
            // 主题和语言选项
            'theme.system', 'theme.light', 'theme.dark',
            'language.zh_CN', 'language.en',
            
            // 确认对话框
            'confirm.title', 'confirm.ok', 'confirm.cancel',
            'confirm.clearAll', 'confirm.downloadFailedRecords',
            'delete.confirm',
            
            // 错误处理
            'error.loadData', 'error.saveFailed', 'error.editFailed',
            
            // 文件操作
            'file.backupPrefix', 'file.importTemplateName', 'file.importErrorsPrefix'
        ];
    }

    /**
     * 定义翻译键值命名规范
     */
    getNamingConvention() {
        return {
            'app': '应用级标识符',
            'button': '按钮文本',
            'form': '表单相关',
            'filter': '筛选功能',
            'tag': '标签管理',
            'empty': '空状态提示',
            'sync': '同步功能',
            'toast': '提示消息',
            'prompt': '提示词操作',
            'settings': '设置界面',
            'theme': '主题选项',
            'language': '语言选项',
            'confirm': '确认对话框',
            'error': '错误处理',
            'file': '文件操作'
        };
    }

    /**
     * 验证翻译文件的完整性
     */
    validateTranslationFile(langData, langName) {
        const results = {
            language: langName,
            totalKeys: Object.keys(langData).length,
            missingKeys: [],
            emptyTranslations: [],
            namingIssues: [],
            duplicateKeys: this.findDuplicates(langData),
            score: 0
        };

        // 检查缺失的键值
        this.requiredKeys.forEach(key => {
            if (!langData.hasOwnProperty(key)) {
                results.missingKeys.push(key);
            }
        });

        // 检查空翻译
        Object.entries(langData).forEach(([key, value]) => {
            if (!value || value.trim() === '') {
                results.emptyTranslations.push(key);
            }
        });

        // 检查命名规范
        Object.keys(langData).forEach(key => {
            const prefix = key.split('.')[0];
            if (!this.namingConvention.hasOwnProperty(prefix)) {
                results.namingIssues.push(key);
            }
        });

        // 计算完整性得分
        results.score = this.calculateScore(results);

        return results;
    }

    /**
     * 查找重复键值
     */
    findDuplicates(langData) {
        const keys = Object.keys(langData);
        const duplicates = keys.filter((key, index) => keys.indexOf(key) !== index);
        return [...new Set(duplicates)];
    }

    /**
     * 计算翻译完整性得分
     */
    calculateScore(results) {
        const maxScore = 100;
        let score = maxScore;

        // 缺失键值扣分
        score -= (results.missingKeys.length / this.requiredKeys.length) * 40;

        // 空翻译扣分
        score -= (results.emptyTranslations.length / results.totalKeys) * 30;

        // 命名规范问题扣分
        score -= (results.namingIssues.length / results.totalKeys) * 20;

        // 重复键值扣分
        score -= results.duplicateKeys.length * 5;

        return Math.max(0, Math.round(score));
    }

    /**
     * 生成验证报告
     */
    generateReport(validationResults) {
        const report = {
            timestamp: new Date().toISOString(),
            summary: {
                totalLanguages: validationResults.length,
                averageScore: Math.round(validationResults.reduce((sum, r) => sum + r.score, 0) / validationResults.length),
                languages: validationResults.map(r => r.language)
            },
            details: validationResults
        };

        return report;
    }

    /**
     * 验证所有语言文件
     */
    async validateAllLanguages() {
        const validationResults = [];
        
        try {
            // 加载中文翻译
            const zhCNResponse = await fetch(chrome.runtime.getURL('assets/i18n/zh_CN.json'));
            const zhCNData = await zhCNResponse.json();
            validationResults.push(this.validateTranslationFile(zhCNData, 'zh_CN'));

            // 加载英文翻译
            const enResponse = await fetch(chrome.runtime.getURL('assets/i18n/en.json'));
            const enData = await enResponse.json();
            validationResults.push(this.validateTranslationFile(enData, 'en'));

        } catch (error) {
            console.error('加载翻译文件失败:', error);
        }

        return this.generateReport(validationResults);
    }

    /**
     * 检查翻译一致性（中英文对应关系）
     */
    async checkConsistency() {
        try {
            const [zhCNResponse, enResponse] = await Promise.all([
                fetch(chrome.runtime.getURL('assets/i18n/zh_CN.json')),
                fetch(chrome.runtime.getURL('assets/i18n/en.json'))
            ]);

            const zhCNData = await zhCNResponse.json();
            const enData = await enResponse.json();

            const zhCNKeys = Object.keys(zhCNData);
            const enKeys = Object.keys(enData);

            const missingInEN = zhCNKeys.filter(key => !enKeys.includes(key));
            const missingInZH = enKeys.filter(key => !zhCNKeys.includes(key));

            return {
                zhCNKeys: zhCNKeys.length,
                enKeys: enKeys.length,
                missingInEN,
                missingInZH,
                consistent: missingInEN.length === 0 && missingInZH.length === 0
            };

        } catch (error) {
            console.error('检查翻译一致性失败:', error);
            return { error: error.message };
        }
    }
}

// 将验证器暴露到全局作用域
window.I18nValidator = I18nValidator;