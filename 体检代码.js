// ===================================================================================
// = 通用AI对话框诊断脚本 (Universal AI Chatbox Diagnostic Script)
// = 使用方法：
// = 1. 在任意AI网站（如ChatGPT, Claude等）打开开发者工具的“控制台(Console)”。
// = 2. 将本脚本的全部代码复制粘贴到控制台里，按回车键。
// = 3. 在网页的聊天输入框里打几个字。
// = 4. 将控制台输出的诊断报告截图发给AI进行分析。
// ===================================================================================

(function() {
    // 防止重复运行
    if (window.universalChatboxDiagnoser) {
        console.log('%c[诊断工具] 诊断脚本已经运行过了，请刷新页面后重试。', 'color: orange; font-weight: bold;');
        return;
    }
    window.universalChatboxDiagnoser = true;

    console.log('%c[诊断工具] 准备就绪！请现在去网页的聊天输入框里随便输入几个字...', 'color: blue; font-size: 16px; font-weight: bold;');

    // 核心诊断函数
    function diagnoseElement(element) {
        // 清理上一次的报告，保持界面干净
        console.clear();
        console.log('%c[诊断工具] 准备就绪！请现在去网页的聊天输入框里随便输入几个字...', 'color: blue; font-size: 16px; font-weight: bold;');
        
        console.group('%c[AI输入框体检报告]', 'color: green; font-weight: bold;');
        
        console.log('被检测的元素是:', element);
        
        console.log('%c1. 基础HTML信息', 'font-weight: bold;');
        console.log(`   - 标签 (Tag): ${element.tagName.toLowerCase()}`);
        console.log(`   - ID: ${element.id || '无'}`);
        console.log(`   - Class: ${element.className || '无'}`);

        console.log('%c2. 可编辑性分析', 'font-weight: bold;');
        let isEditable = false;
        if (element.tagName.toLowerCase() === 'textarea' || element.tagName.toLowerCase() === 'input') {
            console.log('   [✅] 类型正确: 这是一个 <textarea> 或 <input> 元素。');
            isEditable = true;
        } else {
            console.log('   [⚠️] 类型注意: 这不是一个标准的 <textarea> 或 <input>。');
        }

        if (element.contentEditable === 'true') {
            console.log('   [✅] 自身可编辑: 元素拥有 contentEditable="true" 属性。');
            isEditable = true;
        } else {
            console.log('   [❌] 自身不可编辑: 元素自身的 contentEditable 属性不是 "true"。');
        }

        if (element.closest('[contenteditable="true"]')) {
            console.log('   [✅] 父级可编辑: 元素的某个上级容器拥有 contentEditable="true" 属性。');
            isEditable = true;
        } else {
            console.log('   [❌] 父级不可编辑: 没有找到拥有 contentEditable="true" 属性的上级容器。');
        }

        console.log('%c3. 运行环境分析', 'font-weight: bold;');
        if (window.self !== window.top) {
            console.log('   [⚠️] 重要：脚本正运行在一个 iFrame 框架中！');
        } else {
            console.log('   [✅] 正常：脚本运行在主页面。');
        }
        
        if (element.getRootNode() instanceof ShadowRoot) {
            console.log('   [⚠️] 重要：元素在一个 Shadow DOM 中！这会增加交互的复杂性。');
        } else {
            console.log('   [✅] 正常：元素不在 Shadow DOM 中。');
        }

        console.log('%c4. 初步结论', 'font-weight: bold;');
        if (isEditable) {
            console.log('   [👍] 这个输入框【很可能】可以被大部分脚本识别和操作。');
        } else {
            console.log('   [👎] 这个输入框【很可能】无法被常规脚本识别，需要针对性适配。');
        }

        console.groupEnd();
        
        console.log('%c请将上面这份完整的“体检报告”截图发给AI。', 'color: purple; font-size: 12px;');
    }

    // 设置一个全局的、一次性的输入事件监听器
    document.addEventListener('input', function(event) {
        diagnoseElement(event.target);
    }, { 
        capture: true, // 使用捕获阶段，确保能第一时间获取事件
        once: true     // 诊断一次后自动移除监听，避免干扰页面
    });

})();