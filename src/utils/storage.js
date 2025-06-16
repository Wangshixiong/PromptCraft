/**
 * 通用存储工具模块
 * 提供本地存储和Chrome扩展存储的统一接口
 */

/**
 * 存储类型枚举
 */
const STORAGE_TYPES = {
    LOCAL: 'local',
    SYNC: 'sync',
    SESSION: 'session'
};

/**
 * 通用存储类
 */
class StorageManager {
    constructor() {
        this.isExtensionContext = typeof chrome !== 'undefined' && chrome.storage;
        console.log('存储管理器初始化，扩展环境:', this.isExtensionContext);
    }

    /**
     * 保存数据到存储
     * @param {string} key - 存储键
     * @param {*} value - 存储值
     * @param {string} storageType - 存储类型
     * @returns {Promise<boolean>} 是否保存成功
     */
    async setItem(key, value, storageType = STORAGE_TYPES.LOCAL) {
        try {
            console.log(`正在保存数据到${storageType}存储:`, key);
            
            if (this.isExtensionContext) {
                // Chrome扩展环境
                const storage = this._getExtensionStorage(storageType);
                await storage.set({ [key]: value });
            } else {
                // 普通浏览器环境
                const serializedValue = JSON.stringify(value);
                
                if (storageType === STORAGE_TYPES.SESSION) {
                    sessionStorage.setItem(key, serializedValue);
                } else {
                    localStorage.setItem(key, serializedValue);
                }
            }
            
            console.log(`数据保存成功:`, key);
            return true;
        } catch (error) {
            console.error(`保存数据失败:`, error);
            return false;
        }
    }

    /**
     * 从存储获取数据
     * @param {string} key - 存储键
     * @param {*} defaultValue - 默认值
     * @param {string} storageType - 存储类型
     * @returns {Promise<*>} 存储的值或默认值
     */
    async getItem(key, defaultValue = null, storageType = STORAGE_TYPES.LOCAL) {
        try {
            console.log(`正在从${storageType}存储获取数据:`, key);
            
            if (this.isExtensionContext) {
                // Chrome扩展环境
                const storage = this._getExtensionStorage(storageType);
                const result = await storage.get([key]);
                return result[key] !== undefined ? result[key] : defaultValue;
            } else {
                // 普通浏览器环境
                let item;
                
                if (storageType === STORAGE_TYPES.SESSION) {
                    item = sessionStorage.getItem(key);
                } else {
                    item = localStorage.getItem(key);
                }
                
                if (item === null) {
                    return defaultValue;
                }
                
                return JSON.parse(item);
            }
        } catch (error) {
            console.error(`获取数据失败:`, error);
            return defaultValue;
        }
    }

    /**
     * 删除存储中的数据
     * @param {string} key - 存储键
     * @param {string} storageType - 存储类型
     * @returns {Promise<boolean>} 是否删除成功
     */
    async removeItem(key, storageType = STORAGE_TYPES.LOCAL) {
        try {
            console.log(`正在从${storageType}存储删除数据:`, key);
            
            if (this.isExtensionContext) {
                // Chrome扩展环境
                const storage = this._getExtensionStorage(storageType);
                await storage.remove([key]);
            } else {
                // 普通浏览器环境
                if (storageType === STORAGE_TYPES.SESSION) {
                    sessionStorage.removeItem(key);
                } else {
                    localStorage.removeItem(key);
                }
            }
            
            console.log(`数据删除成功:`, key);
            return true;
        } catch (error) {
            console.error(`删除数据失败:`, error);
            return false;
        }
    }

    /**
     * 清空指定类型的存储
     * @param {string} storageType - 存储类型
     * @returns {Promise<boolean>} 是否清空成功
     */
    async clear(storageType = STORAGE_TYPES.LOCAL) {
        try {
            console.log(`正在清空${storageType}存储`);
            
            if (this.isExtensionContext) {
                // Chrome扩展环境
                const storage = this._getExtensionStorage(storageType);
                await storage.clear();
            } else {
                // 普通浏览器环境
                if (storageType === STORAGE_TYPES.SESSION) {
                    sessionStorage.clear();
                } else {
                    localStorage.clear();
                }
            }
            
            console.log(`${storageType}存储清空成功`);
            return true;
        } catch (error) {
            console.error(`清空存储失败:`, error);
            return false;
        }
    }

    /**
     * 获取Chrome扩展存储对象
     * @param {string} storageType - 存储类型
     * @returns {Object} Chrome存储对象
     * @private
     */
    _getExtensionStorage(storageType) {
        switch (storageType) {
            case STORAGE_TYPES.SYNC:
                return chrome.storage.sync;
            case STORAGE_TYPES.SESSION:
                return chrome.storage.session || chrome.storage.local;
            case STORAGE_TYPES.LOCAL:
            default:
                return chrome.storage.local;
        }
    }
}

// 创建全局存储管理器实例
const storageManager = new StorageManager();

// 导出模块
if (typeof module !== 'undefined' && module.exports) {
    // Node.js环境
    module.exports = {
        StorageManager,
        storageManager,
        STORAGE_TYPES
    };
} else {
    // 浏览器环境
    window.StorageUtils = {
        StorageManager,
        storageManager,
        STORAGE_TYPES
    };
}