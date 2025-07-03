/**
 * 全局统一的标签颜色管理器 - 真正的单例模式
 * 确保整个应用中所有位置的标签颜色完全一致
 */
(function() {
    'use strict';
    
    // 防止重复初始化
    if (window.GlobalTagColorManager) {
        return;
    }
    
    class GlobalTagColorManager {
        constructor() {
            this.colorUsageMap = new Map();
            this.availableColors = ['blue', 'green', 'purple', 'orange', 'pink', 'indigo', 'red', 'yellow', 'teal', 'gray'];
        }

        /**
         * 获取标签对应的颜色类名
         * 使用统一的算法：基于使用频次平衡 + 哈希算法确保一致性
         * @param {string} tag - 标签名称
         * @returns {string} 颜色类名（如 'blue', 'green' 等）
         */
        getTagColor(tag) {
            // 参数验证
            if (!tag || typeof tag !== 'string') {
                return 'blue';
            }

            // 如果已经分配过颜色，直接返回
            if (this.colorUsageMap.has(tag)) {
                return this.colorUsageMap.get(tag);
            }

            // 统计每种颜色的使用次数
            const colorCounts = new Map();
            this.availableColors.forEach(color => colorCounts.set(color, 0));
            
            for (const color of this.colorUsageMap.values()) {
                colorCounts.set(color, (colorCounts.get(color) || 0) + 1);
            }

            // 找到使用次数最少的颜色
            const minCount = Math.min(...colorCounts.values());
            const leastUsedColors = this.availableColors.filter(color => 
                colorCounts.get(color) === minCount
            );

            // 在使用次数最少的颜色中，使用哈希算法选择一个
            let hash = 0;
            for (let i = 0; i < tag.length; i++) {
                const char = tag.charCodeAt(i);
                hash = ((hash << 5) - hash) + char;
                hash = hash & hash; // 转换为32位整数
            }

            const colorIndex = Math.abs(hash) % leastUsedColors.length;
            const selectedColor = leastUsedColors[colorIndex];

            // 记录颜色分配
            this.colorUsageMap.set(tag, selectedColor);
            return selectedColor;
        }

        /**
         * 重置颜色映射（用于测试或重新初始化）
         */
        reset() {
            this.colorUsageMap.clear();
        }

        /**
         * 获取所有已分配的颜色映射
         * @returns {Map} 标签到颜色的映射
         */
        getColorMap() {
            return new Map(this.colorUsageMap);
        }

        /**
         * 预加载标签颜色（用于批量初始化）
         * @param {Array} tags - 标签数组
         */
        preloadTagColors(tags) {
            if (!Array.isArray(tags)) return;
            tags.forEach(tag => {
                if (tag && typeof tag === 'string') {
                    this.getTagColor(tag);
                }
            });
        }
    }

    // 创建全局单例实例
    const globalTagColorManager = new GlobalTagColorManager();
    
    // 暴露到全局
    window.GlobalTagColorManager = GlobalTagColorManager;
    window.globalTagColorManager = globalTagColorManager;
    
    // 提供便捷的全局函数
    window.getGlobalTagColor = (tag) => globalTagColorManager.getTagColor(tag);
    
    console.log('Global Tag Color Manager initialized');
})();