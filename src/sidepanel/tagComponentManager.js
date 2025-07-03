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
        
        // 引用UI管理器的颜色映射，确保颜色一致性
        this.colorUsageMap = ui.colorUsageMap || new Map();
    }

    /**
     * 获取标签颜色类（与主界面保持一致）
     * @param {string} tag - 标签名称
     * @returns {string} 颜色类名
     */
    getTagColor(tag) {
        // 参数验证：确保tag是有效的字符串
        if (!tag || typeof tag !== 'string') {
            return 'blue'; // 返回默认颜色
        }
        
        // 初始化颜色使用记录
        if (!this.colorUsageMap) {
            this.colorUsageMap = new Map();
        }
        
        // 如果已经为这个标签分配过颜色，直接返回
        if (this.colorUsageMap.has(tag)) {
            return this.colorUsageMap.get(tag);
        }
        
        const colors = ['blue', 'green', 'purple', 'orange', 'pink', 'indigo', 'red', 'yellow', 'teal', 'gray'];
        
        // 统计当前颜色使用情况
        const colorCount = {};
        colors.forEach(color => colorCount[color] = 0);
        
        // 计算已使用的颜色频次
        for (let usedColor of this.colorUsageMap.values()) {
            if (colorCount[usedColor] !== undefined) {
                colorCount[usedColor]++;
            }
        }
        
        // 找到使用次数最少的颜色
        let minCount = Math.min(...Object.values(colorCount));
        let availableColors = colors.filter(color => colorCount[color] === minCount);
        
        // 如果有多个最少使用的颜色，使用哈希算法选择一个
        let selectedColor;
        if (availableColors.length === 1) {
            selectedColor = availableColors[0];
        } else {
            let hash = 0;
            for (let i = 0; i < tag.length; i++) {
                hash = tag.charCodeAt(i) + ((hash << 5) - hash);
            }
            selectedColor = availableColors[Math.abs(hash) % availableColors.length];
        }
        
        // 记录颜色分配
        this.colorUsageMap.set(tag, selectedColor);
        return selectedColor;
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
            padding: 12px 16px;
            border: 1px solid var(--border-light);
            border-radius: 10px;
            background: var(--card-light);
            min-height: 40px;
            align-items: center;
            transition: var(--transition);
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
            font-size: 13px;
            color: var(--text-light);
        `;

        // 创建建议容器
        const suggestionsContainer = document.createElement('div');
        suggestionsContainer.className = 'tag-suggestions';
        suggestionsContainer.style.cssText = `
            position: absolute;
            top: 100%;
            left: 0;
            right: 0;
            background: var(--card-light);
            border: 1px solid var(--border-light);
            border-top: none;
            border-radius: 0 0 10px 10px;
            max-height: 200px;
            overflow-y: auto;
            z-index: 1000;
            display: none;
            box-shadow: var(--shadow);
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

        // 检查当前主题
        const isDarkMode = document.body.classList.contains('dark-mode');

        // 渲染当前标签
        this.currentTags.forEach((tag, index) => {
            const tagElement = document.createElement('span');
            const colorClass = this.getTagColor(tag);
            tagElement.className = `tag-item prompt-tag tag-${colorClass}`;
            tagElement.style.cssText = `
                display: inline-flex;
                align-items: center;
                gap: 4px;
                padding: 4px 8px;
                border-radius: 6px;
                font-size: 12px;
                font-weight: 500;
                transition: var(--transition);
            `;

            const tagText = document.createElement('span');
            tagText.textContent = tag;

            const removeBtn = document.createElement('button');
            removeBtn.innerHTML = '×';
            removeBtn.style.cssText = `
                background: none;
                border: none;
                color: var(--primary-color);
                cursor: pointer;
                font-size: 14px;
                font-weight: bold;
                padding: 0;
                margin: 0;
                line-height: 1;
                transition: var(--transition);
            `;
            
            // 添加悬停效果
            removeBtn.addEventListener('mouseenter', () => {
                removeBtn.style.color = 'var(--danger)';
                removeBtn.style.transform = 'scale(1.2)';
            });
            
            removeBtn.addEventListener('mouseleave', () => {
                removeBtn.style.color = 'var(--primary-color)';
                removeBtn.style.transform = 'scale(1)';
            });

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
            tagContainer.style.borderColor = 'var(--primary-color)';
            tagContainer.style.boxShadow = '0 0 0 3px rgba(99, 102, 241, 0.2)';
            if (input.value.trim()) {
                this.showSuggestions(input.value.trim(), suggestionsContainer);
            }
        });

        input.addEventListener('blur', (e) => {
            // 延迟隐藏建议，以便点击建议项
            setTimeout(() => {
                if (!suggestionsContainer.contains(document.activeElement)) {
                    const isDarkMode = document.body.classList.contains('dark-mode');
                    tagContainer.style.borderColor = isDarkMode ? 'var(--border-dark)' : 'var(--border-light)';
                    tagContainer.style.boxShadow = 'none';
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
                border-bottom: 1px solid var(--border-light);
                font-size: 13px;
                color: var(--text-light);
                transition: var(--transition);
            `;

            item.addEventListener('mouseenter', () => {
                item.style.backgroundColor = 'var(--card-hover-light)';
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
            // 不立即添加到可用标签列表，避免数据不一致
            // 标签将在提示词保存成功后才被添加到全局可用标签列表
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
        const isDarkMode = document.body.classList.contains('dark-mode');
        
        // 设置容器样式
        tagContainer.style.borderColor = isDarkMode ? 'var(--border-dark)' : 'var(--border-light)';
        tagContainer.style.backgroundColor = isDarkMode ? 'var(--card-dark)' : 'var(--card-light)';
        input.style.color = isDarkMode ? 'var(--text-dark)' : 'var(--text-light)';
        suggestionsContainer.style.backgroundColor = isDarkMode ? 'var(--card-dark)' : 'var(--card-light)';
        suggestionsContainer.style.borderColor = isDarkMode ? 'var(--border-dark)' : 'var(--border-light)';

        // 更新标签样式的函数
        const updateTagStyles = () => {
            // 已选标签现在使用CSS类，只需更新删除按钮颜色
            const removeBtns = this.container.querySelectorAll('.tag-item button');
            removeBtns.forEach(btn => {
                btn.style.color = 'var(--primary-color)';
            });
        };

        // 监听标签变化
        if (!this.tagObserver) {
            this.tagObserver = new MutationObserver(updateTagStyles);
            this.tagObserver.observe(tagContainer, { childList: true });
        }
        updateTagStyles();
        
        // 推荐标签现在使用CSS类，无需手动更新样式
        
        // 确保推荐标签区域背景透明
        const recommendedTagsSection = this.container.querySelector('.recommended-tags-section');
        if (recommendedTagsSection) {
            recommendedTagsSection.style.background = 'transparent';
        }
    }

    /**
     * 获取当前标签
     */
    getTags() {
        return [...this.currentTags];
    }

    /**
     * 获取当前标签（别名方法，与getTags功能相同）
     */
    getCurrentTags() {
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
            this.renderRecommendedTags(); // 重新渲染推荐标签
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
            background: transparent;
            transition: all 0.2s ease;
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

        // 检查当前主题
        const isDarkMode = document.body.classList.contains('dark-mode');

        // 获取未选中的标签
        const availableRecommendedTags = this.availableTags.filter(tag => 
            !this.currentTags.includes(tag)
        );

        if (availableRecommendedTags.length === 0) {
            const emptyMessage = document.createElement('div');
            emptyMessage.textContent = '暂无推荐标签';
            emptyMessage.style.cssText = `
                color: ${isDarkMode ? 'var(--text-dark)' : 'var(--text-light)'};
                opacity: 0.6;
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
            const colorClass = this.getTagColor(tag);
            tagPill.className = `recommended-tag-pill prompt-tag tag-${colorClass}`;
            tagPill.textContent = tag;
            tagPill.style.cssText = `
                display: inline-flex;
                align-items: center;
                padding: 4px 10px;
                border-radius: 12px;
                font-size: 12px;
                font-weight: 500;
                cursor: pointer;
                transition: var(--transition);
                white-space: nowrap;
            `;

            // 悬停效果（使用CSS类自带的悬停效果）
            tagPill.addEventListener('mouseenter', () => {
                tagPill.style.transform = 'translateY(-1px)';
            });

            tagPill.addEventListener('mouseleave', () => {
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