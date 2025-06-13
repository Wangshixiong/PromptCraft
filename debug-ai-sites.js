// PromptCraft AI Sites Debug Script
// 在大模型网站控制台中运行此脚本来诊断问题

console.log('🔍 PromptCraft Debug Script Started');

// 1. 检查扩展是否注入
function checkExtensionInjection() {
    console.log('\n=== 检查扩展注入状态 ===');
    console.log('window.promptCraftInjected:', window.promptCraftInjected);
    console.log('PromptCraft styles:', !!document.getElementById('promptcraft-quick-invoke-styles'));
    
    // 检查是否有PromptCraft相关的全局变量或函数
    const promptCraftElements = document.querySelectorAll('[id*="promptcraft"], [class*="promptcraft"]');
    console.log('PromptCraft DOM elements:', promptCraftElements.length);
}

// 2. 检查CSP限制
function checkCSP() {
    console.log('\n=== 检查CSP限制 ===');
    const metaTags = document.querySelectorAll('meta[http-equiv="Content-Security-Policy"]');
    console.log('CSP meta tags found:', metaTags.length);
    metaTags.forEach((tag, index) => {
        console.log(`CSP ${index + 1}:`, tag.content);
    });
    
    // 检查HTTP响应头中的CSP
    console.log('检查网络面板中的CSP响应头');
}

// 3. 检查输入框
function checkInputElements() {
    console.log('\n=== 检查输入框元素 ===');
    
    // 常见的输入框选择器
    const selectors = [
        'input[type="text"]',
        'textarea',
        '[contenteditable="true"]',
        '[data-testid*="input"]',
        '[data-testid*="chat"]',
        '[role="textbox"]',
        '.chat-input',
        '.message-input'
    ];
    
    selectors.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        if (elements.length > 0) {
            console.log(`${selector}: ${elements.length} 个元素`);
            elements.forEach((el, index) => {
                console.log(`  ${index + 1}:`, {
                    tagName: el.tagName,
                    type: el.type,
                    id: el.id,
                    className: el.className,
                    contentEditable: el.contentEditable
                });
            });
        }
    });
}

// 4. 测试事件监听
function testEventListening() {
    console.log('\n=== 测试事件监听 ===');
    
    // 创建一个测试输入框
    const testInput = document.createElement('input');
    testInput.type = 'text';
    testInput.id = 'promptcraft-debug-input';
    testInput.placeholder = '在这里输入 pp 测试';
    testInput.style.cssText = 'position: fixed; top: 10px; right: 10px; z-index: 10000; padding: 10px; border: 2px solid red;';
    
    document.body.appendChild(testInput);
    
    // 监听输入事件
    let eventCount = 0;
    testInput.addEventListener('input', (e) => {
        eventCount++;
        console.log(`🎯 Debug input event ${eventCount}:`, e.target.value);
        
        if (e.target.value.includes('pp')) {
            console.log('🔥 检测到 "pp" 输入!');
        }
    });
    
    console.log('已创建调试输入框（右上角红框），请在其中输入测试');
    
    // 5秒后移除测试输入框
    setTimeout(() => {
        testInput.remove();
        console.log('调试输入框已移除');
    }, 30000);
}

// 5. 检查网站特定限制
function checkSiteSpecificIssues() {
    console.log('\n=== 检查网站特定问题 ===');
    
    const hostname = window.location.hostname;
    console.log('当前网站:', hostname);
    
    // 检查是否是已知的AI网站
    const aiSites = {
        'kimi.moonshot.cn': 'Kimi',
        'gemini.google.com': 'Gemini',
        'doubao.com': '豆包',
        'chatgpt.com': 'ChatGPT',
        'claude.ai': 'Claude'
    };
    
    const detectedSite = Object.keys(aiSites).find(site => hostname.includes(site));
    if (detectedSite) {
        console.log(`检测到AI网站: ${aiSites[detectedSite]}`);
        
        // 检查该网站是否有特殊的安全策略
        console.log('建议检查该网站的扩展兼容性');
    }
    
    // 检查iframe
    const iframes = document.querySelectorAll('iframe');
    console.log('页面中的iframe数量:', iframes.length);
    if (iframes.length > 0) {
        console.log('注意: 如果输入框在iframe中，扩展可能无法访问');
    }
}

// 运行所有检查
function runAllChecks() {
    checkExtensionInjection();
    checkCSP();
    checkInputElements();
    testEventListening();
    checkSiteSpecificIssues();
    
    console.log('\n🎯 调试完成! 请查看上述信息并在PromptCraft GitHub issues中报告问题。');
}

// 自动运行
runAllChecks();

// 导出函数供手动调用
window.promptCraftDebug = {
    checkExtensionInjection,
    checkCSP,
    checkInputElements,
    testEventListening,
    checkSiteSpecificIssues,
    runAllChecks
};

console.log('\n💡 提示: 可以通过 window.promptCraftDebug.runAllChecks() 重新运行所有检查');