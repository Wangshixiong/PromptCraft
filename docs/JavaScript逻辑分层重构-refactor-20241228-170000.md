# 重构：JavaScript 逻辑分层 (安全增量版)

## 重构目标与范围

### 目标
1. **逻辑解耦**: 将 `sidepanel.js` 中混合的UI操作、事件处理和数据请求逻辑彻底分离
2. **职责分离**: 创建专门的模块来负责UI渲染和用户事件处理，使 `sidepanel.js` 的角色更清晰
3. **提升可维护性**: 建立一个清晰的数据流，使得未来无论是修改业务逻辑还是替换UI都变得简单，且不易引发新的Bug

### 范围
- 重构整个 `src/sidepanel/sidepanel.js` 文件（2124行）
- 创建两个新文件：`src/sidepanel/uiManager.js` 和 `src/sidepanel/appController.js`
- 修改 `src/sidepanel/sidepanel.html` 以引入新文件
- 保持所有现有功能完全不变

## 重构前后的对比方案

### 重构前
- **单一文件**: `sidepanel.js` 包含所有逻辑（2124行）
  - DOM元素选择器（约30个）
  - UI渲染函数（renderPrompts, updateFilterButtons, showView等）
  - 业务逻辑函数（savePrompt, deletePrompt, loadUserPrompts等）
  - 事件处理逻辑（点击、搜索、筛选等）
  - 工具函数（formatDate, escapeHtml等）

### 重构后
- **三层架构**:
  1. **UIManager** (`uiManager.js`): 纯UI操作层
     - 管理所有DOM元素引用
     - 负责UI渲染：`ui.renderPrompts()`, `ui.updateFilterButtons()`, `ui.showView()`
     - 负责UI状态更新：`ui.showToast()`, `ui.applyTheme()`
  
  2. **AppController** (`appController.js`): 业务逻辑协调层
     - 初始化应用：`app.initializeApp()`
     - 处理用户操作：`app.handleDeletePrompt()`, `app.handleSavePrompt()`
     - 与后台服务通信：chrome.runtime.sendMessage调用
  
  3. **Main Entry** (`sidepanel.js`): 简化的入口文件
     - 仅保留DOMContentLoaded监听器
     - 调用 `app.initializeApp()` 启动应用

## 安全保障措施

1. **无回归保证**: 重构完成后，所有现有功能必须100%保持原有行为
2. **增量验证**: 每完成一个阶段，立即进行功能测试验证
3. **关键功能测试清单**:
   - [ ] 提示词列表正常显示
   - [ ] 添加新提示词功能正常
   - [ ] 编辑提示词功能正常
   - [ ] 删除提示词功能正常（包括确认弹窗）
   - [ ] 搜索功能正常
   - [ ] 分类筛选功能正常
   - [ ] 复制功能正常
   - [ ] 导入/导出功能正常
   - [ ] 主题切换功能正常
   - [ ] 视图切换动画正常
   - [ ] Toast提示正常显示
   - [ ] 控制台无错误信息

## 详细执行计划

### 阶段 0：准备工作 (不修改任何逻辑)

#### [x] 任务 1：创建文件
**操作**: 在 `src/sidepanel/` 目录下创建 `uiManager.js` 和 `appController.js` 两个新文件
- 创建空的 `uiManager.js` 文件
- 创建空的 `appController.js` 文件

**测试**: 此步骤无须测试

#### [x] 任务 2：引入文件
**操作**: 修改 `src/sidepanel/sidepanel.html`，在 `sidepanel.js` 的前面引入这两个新文件
```html
<script src="uiManager.js" defer></script>
<script src="appController.js" defer></script>
<script src="sidepanel.js" defer></script>
```

**测试**: 重新加载扩展，打开侧边栏，所有功能应该完全和之前一样，控制台不应有任何错误

### 阶段 1：迁移纯UI函数到 UIManager (只移动，不改变调用关系)

#### [x] 任务 3：迁移DOM元素选择器
**操作**:
1. 在 `uiManager.js` 中创建 `ui` 对象，集中管理所有DOM元素
2. 将 `sidepanel.js` 文件顶部所有 `const xxx = document.getElementById(...)` 代码迁移到 `uiManager.js`
3. 在 `sidepanel.js` 中通过 `ui.xxx` 访问这些元素

**测试**: 重新加载扩展，所有功能（点击、显示、隐藏）都应正常

#### [ ] 任务 4：迁移 showView 函数
**操作**:
1. 将 `showView` 函数从 `sidepanel.js` 迁移到 `uiManager.js`
2. 在 `sidepanel.js` 中将所有 `showView(...)` 调用改为 `ui.showView(...)`

**测试**: 重新加载扩展，点击"添加新提示词"按钮和"返回"按钮，视图切换功能应完全正常

#### [ ] 任务 5：迁移其他UI函数
**操作**: 将以下纯UI函数逐一迁移到 `uiManager.js`：
- `renderPrompts`
- `updateFilterButtons`
- `applyTheme`
- `showToast`
- `showCustomConfirm`
- `showPreview`
- `autoResizeTextarea`
- `formatDate`
- `escapeHtml`
- `unescapeHtml`

**测试**: 每迁移一个函数，就重新加载扩展并测试相关功能

### 阶段 2：创建 AppController 并分离第一个业务逻辑

#### [x] 任务 6：创建控制器并迁移初始化数据加载
**操作**:
1. 在 `appController.js` 中创建 `app` 对象
2. 创建 `app.initializeApp()` 方法
3. 将 `sidepanel.js` 中的 `loadUserPrompts()` 函数核心逻辑迁移到 `app.initializeApp()`
4. 修改 `app.initializeApp()`，使其在获取数据后调用 `ui.renderPrompts()` 和 `ui.updateFilterButtons()`
5. 修改 `sidepanel.js`，在 DOMContentLoaded 事件中只调用 `app.initializeApp()`

**测试**: 重新加载扩展，初始的提示词列表和分类按钮应该能正常加载和显示

### 阶段 3：逐个重构事件处理逻辑

#### [x] 任务 7：重构"删除提示词"功能
**操作**:
1. 在 `appController.js` 中创建 `app.handleDeletePrompt(promptId)` 方法
2. 将 `sidepanel.js` 中 `deletePrompt` 函数的全部逻辑迁移过来
3. 在成功回调后调用 `this.initializeApp()` 刷新列表
4. 在 `uiManager.js` 中更新删除按钮的事件监听器
5. 删除 `sidepanel.js` 中旧的 `deletePrompt` 函数

**测试**: 重新加载扩展，尝试删除一个提示词，功能应该和之前完全一样

#### [ ] 任务 8：重构其他功能
**操作**: 依次对以下功能重复任务7的模式：
- 添加新提示词 (`addPromptBtn` 的点击事件)
- 编辑提示词 (`edit-btn` 的点击事件)
- 保存提示词 (`savePromptBtn` 的点击事件)
- 搜索 (`searchInput` 的 input 事件)
- 分类筛选 (`filter-btn` 的点击事件)
- 导入、导出、下载模板
- 主题切换

**测试**: 每完成一个功能的重构，就必须彻底测试该功能

##### 任务8.1: 重构添加新提示词功能
- [x] 将 `addPromptBtn` 点击事件处理逻辑迁移到 `appController.js`
- [x] 将 `savePrompt` 函数迁移到 `appController.js`
- [x] 将 `resetForm` 函数迁移到 `appController.js`
- [x] 更新事件监听器调用新的控制器方法

**完成情况**: ✅ 已完成
- 在 `appController.js` 中创建了 `handleAddPrompt()`、`handleSavePrompt()` 和 `resetForm()` 方法
- 更新了 `sidepanel.js` 中的事件监听器，改为调用 `app.handleAddPrompt()` 和 `app.handleSavePrompt()`
- 删除了 `sidepanel.js` 中原有的 `savePrompt` 和 `resetForm` 函数

### 阶段 4：最终清理与验证

#### [ ] 任务 9：代码清理
**操作**:
1. 检查 `sidepanel.js` 文件，应该变得非常简洁
2. 移除所有不再需要的变量和函数
3. 确保只剩下 DOMContentLoaded 监听器和对 `app.initializeApp()` 的调用

**测试**: 进行一次全面的回归测试，把所有功能都测试一遍

## 风险评估与应对

### 潜在风险
1. **DOM引用失效**: 迁移DOM元素选择器时可能遗漏某些引用
2. **事件监听器丢失**: 迁移事件处理逻辑时可能导致某些交互失效
3. **作用域问题**: 函数迁移后可能出现变量作用域问题

### 应对措施
1. **严格按阶段执行**: 每个阶段完成后立即测试
2. **保留备份**: 在开始重构前确保有完整的代码备份
3. **渐进式验证**: 每迁移一个函数就立即验证相关功能

## 预期收益

1. **代码可维护性提升**: 清晰的分层架构使代码更易理解和修改
2. **功能扩展便利**: 新增功能时只需在对应层级添加代码
3. **测试友好**: 分离的模块更容易进行单元测试
4. **团队协作**: 不同开发者可以专注于不同层级的开发

---

**创建时间**: 2024-12-28 17:00:00  
**预计完成时间**: 2024-12-28 19:00:00  
**执行状态**: 待批准