重构计划：JavaScript 逻辑分层 (安全增量版)
阶段 0：准备工作 (不修改任何逻辑)
[ ] 任务 1：创建文件

操作: 在 src/sidepanel/ 目录下创建 uiManager.js 和 appController.js 两个新文件。

测试: 此步骤无须测试。

[ ] 任务 2：引入文件

操作: 打开 src/sidepanel/sidepanel.html，在 sidepanel.js 的 前面 引入这两个新文件。

HTML

<script src="uiManager.js" defer></script>
<script src="appController.js" defer></script>
<script src="sidepanel.js" defer></script>
</body>
</html>
测试: 重新加载扩展。打开侧边栏，所有功能应该完全和之前一样，没有任何变化。控制台不应有任何错误。

阶段 1：迁移纯UI函数到 UIManager (只移动，不改变调用关系)
[ ] 任务 3：迁移DOM元素选择器

操作:

在 uiManager.js 中，创建一个 ui 对象，用于集中管理所有DOM元素。

将 sidepanel.js 文件顶部所有 const xxx = document.getElementById(...) 的代码剪切并粘贴到 uiManager.js 的 ui 对象中。

在 sidepanel.js 中，通过 ui.xxx 来访问这些元素（例如 ui.promptsContainer）。你需要全局替换。

测试: 重新加载扩展。所有功能（点击、显示、隐藏）都应正常。这是验证你是否已正确替换所有引用的关键一步。

[ ] 任务 4：迁移 showView 函数

操作:

将 showView 函数从 sidepanel.js 剪切到 uiManager.js。

在 sidepanel.js 中，将所有调用 showView(...) 的地方改为 ui.showView(...) (假设你把函数挂载到了 ui 对象上)。

测试: 重新加载扩展。点击“添加新提示词”按钮和“返回”按钮，视图切换功能应完全正常。

[ ] 任务 5：迁移 renderPrompts 和其他UI更新函数

操作: 按照同样的方法，将 renderPrompts, updateFilterButtons, applyTheme, showToast 等纯UI函数逐一迁移到 uiManager.js。

测试: 每迁移一个函数，就重新加载扩展并测试相关功能。例如，迁移 renderPrompts 后，要确认提示词列表能正常显示。迁移 applyTheme 后，要测试主题切换功能。

阶段 2：创建 AppController 并分离第一个业务逻辑
[ ] 任务 6：创建控制器并迁移初始化数据加载

操作:

在 appController.js 中，创建一个 app 对象。

创建一个 app.initializeApp() 方法。

将 sidepanel.js 中的 loadUserPrompts() 函数的核心逻辑（即发送消息获取数据部分）剪切到 app.initializeApp() 中。

修改 app.initializeApp()，使其在获取到数据后，调用 ui.renderPrompts(prompts) 和 ui.updateFilterButtons()。

修改 sidepanel.js，在 DOMContentLoaded 事件中，只调用 app.initializeApp()。

测试: 重新加载扩展。初始的提示词列表和分类按钮应该能和之前一样正常加载和显示。

阶段 3：逐个重构事件处理逻辑
这是最关键的阶段，我们将以“删除”功能为例，展示如何逐一重构。

[ ] 任务 7：重构“删除提示词”功能

操作:

在 appController.js 中创建处理函数: 创建 app.handleDeletePrompt(promptId) 方法，将 sidepanel.js 中 deletePrompt 函数的全部逻辑（发送消息、显示Toast等）剪切过来。在成功回调后，让它调用 this.initializeApp() 来刷新整个列表。

在 uiManager.js 中更新事件监听: 找到删除按钮的 click 事件监听器。将其回调函数修改为一行代码：app.handleDeletePrompt(id)。

清理: 删除 sidepanel.js 中旧的 deletePrompt 函数。

测试: 重新加载扩展。尝试删除一个提示词。功能应该和之前完全一样：弹出确认框，确认后提示词消失，列表刷新，并显示成功Toast。

[ ] 任务 8：按相同模式重构其他功能

操作: 依次对以下功能重复任务 7 的模式（创建Controller方法 -> 修改UI事件监听 -> 清理旧代码）：

添加新提示词 (addPromptBtn 的点击事件)

编辑提示词 (edit-btn 的点击事件)

保存提示词 (savePromptBtn 的点击事件)

搜索 (searchInput 的 input 事件)

分类筛选 (filter-btn 的点击事件)

导入、导出、下载模板

主题切换

测试: 每完成一个功能的重构，就必须彻底测试该功能，确保其表现与重构前一致。

阶段 4：最终清理与验证
[ ] 任务 9：代码清理

操作: 检查 sidepanel.js 文件，此时它应该变得非常简洁，主要只剩下 DOMContentLoaded 的监听器和对 app.initializeApp() 的调用。移除所有不再需要的变量和函数。

测试: 进行一次全面的回归测试，把所有功能都点一遍，确保整个应用功能完好无损。