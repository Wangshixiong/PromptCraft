/**
 * TagComponentManager - 标签组件管理器
 * 职责: 管理Svelte标签组件的初始化、数据绑定和事件处理
 * 创建时间: 2025-01-02
 */

class TagComponentManager {
    constructor() {
        this.component = null;
        this.container = null;
        this.currentTags = [];
        this.availableTags = [];
    }

    /**
     * 初始化标签组件
     * @param {string} containerId - 容器元素ID
     * @param {Array} initialTags - 初始标签数组
     * @param {Array} availableTags - 可用标签建议数组
     */
    async initialize(containerId, initialTags = [], availableTags = []) {
        this.container = document.getElementById(containerId);
        if (!this.container) {
            console.error(`Container with id '${containerId}' not found`);
            return;
        }

        this.currentTags = [...initialTags];
        this.availableTags = [...availableTags];

        // 创建标签组件的HTML结构
        this.createTagComponent();
    }

    /**
     * 创建标签组件的HTML结构
     */
    createTagComponent() {
        // 清空容器
        this.container.innerHTML = '';

        // 创建标签容器
        const tagContainer = document.createElement('div');
        tagContainer.className = 'tag-input-container';
        tagContainer.style.cssText = `
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
            padding: 8px;
            border: 1px solid #e1e5e9;
            border-radius: 6px;
            background: #ffffff;
            min-height: 40px;
            align-items: center;
            transition: border-color 0.2s ease;
        `;

        // 渲染现有标签
        this.renderTags(tagContainer);

        // 创建输入框
        const input = document.createElement('input');
        input.type = 'text';
        input.placeholder = this.currentTags.length === 0 ? '输入标签，按回车添加' : '添加标签...';
        input.className = 'tag-input';
        input.style.cssText = `
            border: none;
            outline: none;
            background: transparent;
            flex: 1;
            min-width: 120px;
            font-size: 14px;
            color: #333;
        `;

        // 创建建议容器
        const suggestionsContainer = document.createElement('div');
        suggestionsContainer.className = 'tag-suggestions';
        suggestionsContainer.style.cssText = `
            position: absolute;
            top: 100%;
            left: 0;
            right: 0;
            background: #ffffff;
            border: 1px solid #e1e5e9;
            border-top: none;
            border-radius: 0 0 6px 6px;
            max-height: 200px;
            overflow-y: auto;
            z-index: 1000;
            display: none;
        `;

        // 创建推荐标签栏
        const recommendedTagsSection = this.createRecommendedTagsSection();

        // 设置容器为相对定位
        this.container.style.position = 'relative';

        // 添加事件监听器
        this.setupEventListeners(input, suggestionsContainer, tagContainer);

        // 组装组件
        tagContainer.appendChild(input);
        this.container.appendChild(tagContainer);
        this.container.appendChild(suggestionsContainer);
        this.container.appendChild(recommendedTagsSection);

        // 渲染推荐标签
        this.renderRecommendedTags();

        // 应用暗色主题样式（如果需要）
        this.applyThemeStyles(tagContainer, input, suggestionsContainer);
    }

    /**
     * 渲染标签
     */
    renderTags(container) {
        // 移除现有标签元素
        const existingTags = container.querySelectorAll('.tag-item');
        existingTags.forEach(tag => tag.remove());

        // 渲染当前标签
        this.currentTags.forEach((tag, index) => {
            const tagElement = document.createElement('span');
            tagElement.className = 'tag-item';
            tagElement.style.cssText = `
                display: inline-flex;
                align-items: center;
                gap: 4px;
                padding: 4px 8px;
                background: #f0f9ff;
                color: #0369a1;
                border: 1px solid #bae6fd;
                border-radius: 4px;
                font-size: 12px;
                font-weight: 500;
            `;

            const tagText = document.createElement('span');
            tagText.textContent = tag;

            const removeBtn = document.createElement('button');
            removeBtn.innerHTML = '×';
            removeBtn.style.cssText = `
                background: none;
                border: none;
                color: #0369a1;
                cursor: pointer;
                font-size: 14px;
                font-weight: bold;
                padding: 0;
                margin: 0;
                line-height: 1;
            `;

            removeBtn.addEventListener('click', () => {
                this.removeTag(index);
            });

            tagElement.appendChild(tagText);
            tagElement.appendChild(removeBtn);
            container.insertBefore(tagElement, container.querySelector('.tag-input'));
        });
    }

    /**
     * 设置事件监听器
     */
    setupEventListeners(input, suggestionsContainer, tagContainer) {
        // 输入事件
        input.addEventListener('input', (e) => {
            const value = e.target.value.trim();
            this.showSuggestions(value, suggestionsContainer);
            // 同时过滤推荐标签
            this.filterRecommendedTags(value);
        });

        // 键盘事件
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ',') {
                e.preventDefault();
                const value = input.value.trim();
                if (value) {
                    this.addTag(value);
                    input.value = '';
                    this.hideSuggestions(suggestionsContainer);
                }
            } else if (e.key === 'Backspace' && input.value === '' && this.currentTags.length > 0) {
                // 删除最后一个标签
                this.removeTag(this.currentTags.length - 1);
            }
        });

        // 焦点事件
        input.addEventListener('focus', () => {
            tagContainer.style.borderColor = '#3b82f6';
            if (input.value.trim()) {
                this.showSuggestions(input.value.trim(), suggestionsContainer);
            }
        });

        input.addEventListener('blur', (e) => {
            // 延迟隐藏建议，以便点击建议项
            setTimeout(() => {
                if (!suggestionsContainer.contains(document.activeElement)) {
                    tagContainer.style.borderColor = '#e1e5e9';
                    this.hideSuggestions(suggestionsContainer);
                }
            }, 150);
        });
    }

    /**
     * 显示标签建议
     */
    showSuggestions(value, container) {
        if (!value) {
            this.hideSuggestions(container);
            return;
        }

        const filtered = this.availableTags.filter(tag => 
            tag.toLowerCase().includes(value.toLowerCase()) && 
            !this.currentTags.includes(tag)
        );

        if (filtered.length === 0) {
            this.hideSuggestions(container);
            return;
        }

        container.innerHTML = '';
        filtered.forEach(tag => {
            const item = document.createElement('div');
            item.className = 'suggestion-item';
            item.textContent = tag;
            item.style.cssText = `
                padding: 8px 12px;
                cursor: pointer;
                border-bottom: 1px solid #f3f4f6;
                font-size: 14px;
                color: #374151;
            `;

            item.addEventListener('mouseenter', () => {
                item.style.backgroundColor = '#f9fafb';
            });

            item.addEventListener('mouseleave', () => {
                item.style.backgroundColor = 'transparent';
            });

            item.addEventListener('click', () => {
                this.addTag(tag);
                const input = this.container.querySelector('.tag-input');
                input.value = '';
                input.focus();
                this.hideSuggestions(container);
            });

            container.appendChild(item);
        });

        container.style.display = 'block';
    }

    /**
     * 隐藏标签建议
     */
    hideSuggestions(container) {
        container.style.display = 'none';
    }

    /**
     * 添加标签
     */
    addTag(tag) {
        const trimmedTag = tag.trim();
        if (trimmedTag && !this.currentTags.includes(trimmedTag)) {
            this.currentTags.push(trimmedTag);
            this.updateAvailableTags(trimmedTag);
            this.renderTags(this.container.querySelector('.tag-input-container'));
            this.updateInputPlaceholder();
            this.renderRecommendedTags(); // 重新渲染推荐标签
        }
    }

    /**
     * 移除标签
     */
    removeTag(index) {
        if (index >= 0 && index < this.currentTags.length) {
            this.currentTags.splice(index, 1);
            this.renderTags(this.container.querySelector('.tag-input-container'));
            this.updateInputPlaceholder();
            this.renderRecommendedTags(); // 重新渲染推荐标签
        }
    }

    /**
     * 更新输入框占位符
     */
    updateInputPlaceholder() {
        const input = this.container.querySelector('.tag-input');
        if (input) {
            input.placeholder = this.currentTags.length === 0 ? '输入标签，按回车添加' : '添加标签...';
        }
    }

    /**
     * 更新可用标签列表
     */
    updateAvailableTags(newTag) {
        if (!this.availableTags.includes(newTag)) {
            this.availableTags.push(newTag);
        }
    }

    /**
     * 应用主题样式
     */
    applyThemeStyles(tagContainer, input, suggestionsContainer) {
        if (document.body.classList.contains('dark-mode')) {
            // 暗色主题样式
            tagContainer.style.borderColor = '#374151';
            tagContainer.style.backgroundColor = '#1f2937';
            input.style.color = '#f9fafb';
            suggestionsContainer.style.backgroundColor = '#1f2937';
            suggestionsContainer.style.borderColor = '#374151';

            // 更新标签样式
            const updateTagStyles = () => {
                const tags = this.container.querySelectorAll('.tag-item');
                tags.forEach(tag => {
                    tag.style.backgroundColor = '#1e40af';
                    tag.style.color = '#dbeafe';
                    tag.style.borderColor = '#3b82f6';
                });
            };

            // 监听标签变化
            const observer = new MutationObserver(updateTagStyles);
            observer.observe(tagContainer, { childList: true });
            updateTagStyles();
        }
    }

    /**
     * 获取当前标签
     */
    getTags() {
        return [...this.currentTags];
    }

    /**
     * 设置标签
     */
    setTags(tags) {
        this.currentTags = [...tags];
        if (this.container) {
            this.renderTags(this.container.querySelector('.tag-input-container'));
            this.updateInputPlaceholder();
        }
    }

    /**
     * 创建推荐标签栏区域
     */
    createRecommendedTagsSection() {
        const section = document.createElement('div');
        section.className = 'recommended-tags-section';
        section.style.cssText = `
            margin-top: 12px;
            padding: 12px;
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 6px;
            transition: all 0.2s ease;
        `;

        const label = document.createElement('div');
        label.className = 'recommended-tags-label';
        label.textContent = '推荐标签';
        label.style.cssText = `
            font-size: 12px;
            font-weight: 600;
            color: #64748b;
            margin-bottom: 8px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        `;

        const container = document.createElement('div');
        container.className = 'recommended-tags-container';
        container.style.cssText = `
            display: flex;
            flex-wrap: wrap;
            gap: 6px;
            min-height: 32px;
            align-items: flex-start;
        `;

        section.appendChild(label);
        section.appendChild(container);
        return section;
    }

    /**
     * 渲染推荐标签
     */
    renderRecommendedTags() {
        const container = this.container.querySelector('.recommended-tags-container');
        if (!container) return;

        // 清空现有推荐标签
        container.innerHTML = '';

        // 获取未选中的标签
        const availableRecommendedTags = this.availableTags.filter(tag => 
            !this.currentTags.includes(tag)
        );

        if (availableRecommendedTags.length === 0) {
            const emptyMessage = document.createElement('div');
            emptyMessage.textContent = '暂无推荐标签';
            emptyMessage.style.cssText = `
                color: #94a3b8;
                font-size: 12px;
                font-style: italic;
                padding: 8px 0;
            `;
            container.appendChild(emptyMessage);
            return;
        }

        // 渲染推荐标签
        availableRecommendedTags.forEach(tag => {
            const tagPill = document.createElement('button');
            tagPill.className = 'recommended-tag-pill';
            tagPill.textContent = tag;
            tagPill.style.cssText = `
                display: inline-flex;
                align-items: center;
                padding: 4px 10px;
                background: #ffffff;
                color: #475569;
                border: 1px solid #cbd5e1;
                border-radius: 12px;
                font-size: 12px;
                font-weight: 500;
                cursor: pointer;
                transition: all 0.2s ease;
                white-space: nowrap;
            `;

            // 悬停效果
            tagPill.addEventListener('mouseenter', () => {
                tagPill.style.backgroundColor = '#e2e8f0';
                tagPill.style.borderColor = '#94a3b8';
                tagPill.style.transform = 'translateY(-1px)';
            });

            tagPill.addEventListener('mouseleave', () => {
                tagPill.style.backgroundColor = '#ffffff';
                tagPill.style.borderColor = '#cbd5e1';
                tagPill.style.transform = 'translateY(0)';
            });

            // 点击添加标签
            tagPill.addEventListener('click', () => {
                this.addTag(tag);
                this.renderRecommendedTags(); // 重新渲染推荐标签
            });

            container.appendChild(tagPill);
        });
    }

    /**
     * 过滤推荐标签
     */
    filterRecommendedTags(filterText) {
        const container = this.container.querySelector('.recommended-tags-container');
        if (!container) return;

        const pills = container.querySelectorAll('.recommended-tag-pill');
        pills.forEach(pill => {
            const tagText = pill.textContent.toLowerCase();
            const shouldShow = !filterText || tagText.includes(filterText.toLowerCase());
            pill.style.display = shouldShow ? 'inline-flex' : 'none';
        });
    }

    /**
     * 设置可用标签建议
     */
    setAvailableTags(tags) {
        this.availableTags = [...tags];
        // 重新渲染推荐标签
        if (this.container) {
            this.renderRecommendedTags();
        }
    }

    /**
     * 清空标签
     */
    clear() {
        this.currentTags = [];
        if (this.container) {
            this.renderTags(this.container.querySelector('.tag-input-container'));
            this.updateInputPlaceholder();
            this.renderRecommendedTags(); // 重新渲染推荐标签
        }
    }
}

// 导出标签组件管理器
window.TagComponentManager = TagComponentManager;