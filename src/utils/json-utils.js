// JSON 导入导出工具
// 处理提示词数据的JSON格式导入导出

// 导出提示词到 JSON
function exportToJSON(prompts) {
    try {
        // 准备导出数据
        const exportData = {
            exportTime: new Date().toISOString(),
            version: '1.0',
            prompts: prompts.map(prompt => ({
                id: prompt.id || '',
                created_at: prompt.created_at || new Date().toISOString(),
                updated_at: prompt.updated_at || new Date().toISOString(),
                title: prompt.title || '',
                content: prompt.content || '',
                category: prompt.category || '',
                is_deleted: prompt.is_deleted || false
            }))
        };
        
        // 生成文件名
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const filename = `Prompt管理助手备份_${year}-${month}-${day}.json`;
        
        // 创建下载链接
        const jsonStr = JSON.stringify(exportData, null, 2);
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        // 下载文件
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        return { success: true, message: `导出成功！文件已保存为：${filename}` };
    } catch (error) {
        console.error('导出失败:', error);
        return { success: false, error: error.message };
    }
}

// 下载 JSON 模板
function downloadTemplate() {
    try {
        // 创建模板数据
        const templateData = {
            exportTime: new Date().toISOString(),
            version: '1.0',
            prompts: [
                {
                    id: 'example-id-1',
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                    title: '示例提示词标题',
                    content: '这里是提示词的具体内容，请详细描述您的需求...',
                    category: '工作',
                    is_deleted: false
                },
                {
                    id: 'example-id-2',
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                    title: '另一个示例',
                    content: '您可以添加更多的提示词条目...',
                    category: '学习',
                    is_deleted: false
                }
            ]
        };
        
        // 创建下载链接
        const jsonStr = JSON.stringify(templateData, null, 2);
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        // 下载文件
        const filename = 'Prompt管理助手_导入模板.json';
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        return { success: true, filename };
    } catch (error) {
        console.error('下载模板失败:', error);
        return { success: false, error: error.message };
    }
}

// 从 JSON 文件导入提示词
function importFromJSON(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = function(e) {
            try {
                const jsonStr = e.target.result;
                const data = JSON.parse(jsonStr);
                
                // 验证JSON结构
                if (!data.prompts || !Array.isArray(data.prompts)) {
                    throw new Error('无效的JSON格式：缺少prompts数组');
                }
                
                // 验证和转换数据
                const validPrompts = [];
                const errors = [];
                
                data.prompts.forEach((prompt, index) => {
                    const itemNum = index + 1;
                    
                    // 检查必填字段
                    if (!prompt.title || !prompt.title.trim()) {
                        errors.push(`第${itemNum}项：标题不能为空`);
                        return;
                    }
                    
                    if (!prompt.content || !prompt.content.trim()) {
                        errors.push(`第${itemNum}项：内容不能为空`);
                        return;
                    }
                    
                    // 创建提示词对象
                    const validPrompt = {
                        id: prompt.id || '', // 如果有id则保留，否则在添加时会自动生成
                        title: prompt.title.trim(),
                        content: prompt.content.trim(),
                        category: (prompt.category || '未分类').trim(),
                        created_at: prompt.created_at || prompt.createdAt || new Date().toISOString(),
                        updated_at: prompt.updated_at || prompt.updatedAt || new Date().toISOString(),
                        is_deleted: prompt.is_deleted || false
                    };
                    
                    validPrompts.push(validPrompt);
                });
                
                resolve({
                    success: true,
                    prompts: validPrompts,
                    errors: errors,
                    total: data.prompts.length,
                    imported: validPrompts.length,
                    version: data.version || '未知',
                    exportTime: data.exportTime || '未知'
                });
                
            } catch (error) {
                reject(new Error('文件解析失败: ' + error.message));
            }
        };
        
        reader.onerror = function() {
            reject(new Error('文件读取失败'));
        };
        
        reader.readAsText(file, 'utf-8');
    });
}

// 导出失败的记录到 JSON
function exportFailedRecords(errors) {
    try {
        // 准备失败记录数据
        const failedData = {
            exportTime: new Date().toISOString(),
            type: 'import_errors',
            errors: errors.map((error, index) => ({
                id: index + 1,
                message: error,
                timestamp: new Date().toISOString()
            }))
        };
        
        // 生成文件名
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const time = now.toTimeString().split(' ')[0].replace(/:/g, '-');
        const filename = `导入失败记录_${year}-${month}-${day}_${time}.json`;
        
        // 创建下载链接
        const jsonStr = JSON.stringify(failedData, null, 2);
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        // 下载文件
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        return { success: true, filename };
    } catch (error) {
        console.error('导出失败记录失败:', error);
        return { success: false, error: error.message };
    }
}

// 导出函数供外部使用
const JSONUtils = {
    exportToJSON,
    downloadTemplate,
    importFromJSON,
    exportFailedRecords
};

// 导出为JSONUtils
window.JSONUtils = JSONUtils;
// JSONUtils已完全替代ExcelUtils