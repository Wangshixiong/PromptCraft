/**
 * 数据迁移工具模块
 * 处理不同版本间的数据结构迁移和格式转换
 */

// 当前数据版本
const CURRENT_DATA_VERSION = '1.0.0';

/**
 * 数据迁移管理器
 */
class DataMigrationManager {
    constructor() {
        this.migrations = new Map();
        this.initializeMigrations();
        console.log('数据迁移管理器初始化完成');
    }

    /**
     * 初始化所有迁移规则
     */
    initializeMigrations() {
        // 从0.1.0到1.0.0的迁移
        this.addMigration('0.1.0', '1.0.0', this.migrateFrom010To100.bind(this));
        
        // 从0.2.0到1.0.0的迁移
        this.addMigration('0.2.0', '1.0.0', this.migrateFrom020To100.bind(this));
        
        console.log('已注册迁移规则:', Array.from(this.migrations.keys()));
    }

    /**
     * 添加迁移规则
     * @param {string} fromVersion - 源版本
     * @param {string} toVersion - 目标版本
     * @param {Function} migrationFunction - 迁移函数
     */
    addMigration(fromVersion, toVersion, migrationFunction) {
        const key = `${fromVersion}->${toVersion}`;
        this.migrations.set(key, migrationFunction);
        console.log(`添加迁移规则: ${key}`);
    }

    /**
     * 执行数据迁移
     * @param {Object} data - 要迁移的数据
     * @param {string} fromVersion - 源版本
     * @param {string} toVersion - 目标版本
     * @returns {Object} 迁移后的数据
     */
    async migrateData(data, fromVersion, toVersion = CURRENT_DATA_VERSION) {
        try {
            console.log(`开始数据迁移: ${fromVersion} -> ${toVersion}`);
            
            if (fromVersion === toVersion) {
                console.log('版本相同，无需迁移');
                return data;
            }
            
            const migrationKey = `${fromVersion}->${toVersion}`;
            const migrationFunction = this.migrations.get(migrationKey);
            
            if (!migrationFunction) {
                console.warn(`未找到迁移规则: ${migrationKey}，尝试逐步迁移`);
                return await this.performStepwiseMigration(data, fromVersion, toVersion);
            }
            
            const migratedData = await migrationFunction(data);
            console.log('数据迁移完成');
            
            return migratedData;
        } catch (error) {
            console.error('数据迁移失败:', error);
            throw new Error(`数据迁移失败: ${error.message}`);
        }
    }

    /**
     * 执行逐步迁移（当没有直接迁移路径时）
     * @param {Object} data - 要迁移的数据
     * @param {string} fromVersion - 源版本
     * @param {string} toVersion - 目标版本
     * @returns {Object} 迁移后的数据
     */
    async performStepwiseMigration(data, fromVersion, toVersion) {
        console.log('执行逐步迁移');
        
        // 这里可以实现更复杂的逐步迁移逻辑
        // 目前简单处理：如果是旧版本，直接使用通用迁移
        if (this.isOlderVersion(fromVersion, '1.0.0')) {
            return await this.migrateToLatest(data);
        }
        
        throw new Error(`无法找到从 ${fromVersion} 到 ${toVersion} 的迁移路径`);
    }

    /**
     * 从0.1.0迁移到1.0.0
     * @param {Object} data - 旧版本数据
     * @returns {Object} 新版本数据
     */
    async migrateFrom010To100(data) {
        console.log('执行0.1.0到1.0.0的迁移');
        
        const migratedData = {
            version: '1.0.0',
            prompts: [],
            categories: [],
            settings: {
                theme: 'light',
                language: 'zh-CN',
                syncEnabled: false
            },
            metadata: {
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                totalPrompts: 0
            }
        };
        
        // 迁移提示词数据
        if (data.prompts && Array.isArray(data.prompts)) {
            migratedData.prompts = data.prompts.map(prompt => ({
                id: prompt.id || this.generateId(),
                title: prompt.title || '未命名提示词',
                content: prompt.content || '',
                category: prompt.category || '默认分类',
                tags: prompt.tags || [],
                createdAt: prompt.createdAt || new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                isActive: true
            }));
        }
        
        // 提取分类信息
        const categories = new Set();
        migratedData.prompts.forEach(prompt => {
            if (prompt.category) {
                categories.add(prompt.category);
            }
        });
        
        migratedData.categories = Array.from(categories).map(name => ({
            id: this.generateId(),
            name,
            color: this.getRandomColor(),
            createdAt: new Date().toISOString()
        }));
        
        migratedData.metadata.totalPrompts = migratedData.prompts.length;
        
        console.log('0.1.0到1.0.0迁移完成，提示词数量:', migratedData.prompts.length);
        return migratedData;
    }

    /**
     * 从0.2.0迁移到1.0.0
     * @param {Object} data - 旧版本数据
     * @returns {Object} 新版本数据
     */
    async migrateFrom020To100(data) {
        console.log('执行0.2.0到1.0.0的迁移');
        
        // 0.2.0版本已经比较接近1.0.0，主要是添加一些新字段
        const migratedData = {
            ...data,
            version: '1.0.0'
        };
        
        // 确保所有提示词都有必需的字段
        if (migratedData.prompts) {
            migratedData.prompts = migratedData.prompts.map(prompt => ({
                ...prompt,
                isActive: prompt.isActive !== undefined ? prompt.isActive : true,
                updatedAt: new Date().toISOString()
            }));
        }
        
        // 添加元数据
        if (!migratedData.metadata) {
            migratedData.metadata = {
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                totalPrompts: migratedData.prompts ? migratedData.prompts.length : 0
            };
        }
        
        console.log('0.2.0到1.0.0迁移完成');
        return migratedData;
    }

    /**
     * 迁移到最新版本（通用迁移）
     * @param {Object} data - 旧版本数据
     * @returns {Object} 新版本数据
     */
    async migrateToLatest(data) {
        console.log('执行通用迁移到最新版本');
        
        // 基本的数据结构标准化
        const migratedData = {
            version: CURRENT_DATA_VERSION,
            prompts: [],
            categories: [],
            settings: {
                theme: 'light',
                language: 'zh-CN',
                syncEnabled: false,
                ...data.settings
            },
            metadata: {
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                totalPrompts: 0
            }
        };
        
        // 处理提示词数据
        if (data.prompts) {
            migratedData.prompts = Array.isArray(data.prompts) ? data.prompts : [];
        } else if (data.items) {
            // 兼容旧的字段名
            migratedData.prompts = Array.isArray(data.items) ? data.items : [];
        }
        
        // 标准化提示词格式
        migratedData.prompts = migratedData.prompts.map(prompt => ({
            id: prompt.id || this.generateId(),
            title: prompt.title || prompt.name || '未命名提示词',
            content: prompt.content || prompt.text || '',
            category: prompt.category || '默认分类',
            tags: Array.isArray(prompt.tags) ? prompt.tags : [],
            createdAt: prompt.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            isActive: true
        }));
        
        migratedData.metadata.totalPrompts = migratedData.prompts.length;
        
        console.log('通用迁移完成，提示词数量:', migratedData.prompts.length);
        return migratedData;
    }

    /**
     * 检查版本是否较旧
     * @param {string} version1 - 版本1
     * @param {string} version2 - 版本2
     * @returns {boolean} version1是否比version2旧
     */
    isOlderVersion(version1, version2) {
        const v1Parts = version1.split('.').map(Number);
        const v2Parts = version2.split('.').map(Number);
        
        for (let i = 0; i < Math.max(v1Parts.length, v2Parts.length); i++) {
            const v1Part = v1Parts[i] || 0;
            const v2Part = v2Parts[i] || 0;
            
            if (v1Part < v2Part) return true;
            if (v1Part > v2Part) return false;
        }
        
        return false;
    }

    /**
     * 生成唯一ID
     * @returns {string} 唯一ID
     */
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    /**
     * 获取随机颜色
     * @returns {string} 颜色值
     */
    getRandomColor() {
        const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD'];
        return colors[Math.floor(Math.random() * colors.length)];
    }
}

// 创建全局迁移管理器实例
const migrationManager = new DataMigrationManager();

// 导出模块
if (typeof module !== 'undefined' && module.exports) {
    // Node.js环境
    module.exports = {
        DataMigrationManager,
        migrationManager,
        CURRENT_DATA_VERSION
    };
} else {
    // 浏览器环境
    window.DataMigration = {
        DataMigrationManager,
        migrationManager,
        CURRENT_DATA_VERSION
    };
}