## 发现与根因（代码定位）
- 键原样显示（表单标签）
  - 原因：`form.label.title`、`form.label.content` 在页面上存在，但字典缺失或未正确应用，`i18n.t(key)`未命中直接返回 key（src/utils/i18n.js:41）。此外将 `data-i18n` 直接挂到含有 `<span class="required">*</span>` 的 `label` 节点，`applyTranslations` 使用 `textContent` 导致内部星标丢失。
  - 证据：`src/sidepanel/sidepanel.html:133–144`（label带必填星）与 `src/utils/i18n.js:52–90`（对 `[data-i18n]` 统一 `textContent` 替换）。
- 顶部按钮出现可见英文“Add Prompt”“Settings”
  - 原因：我们在按钮元素上同时设置了 `data-i18n` 与 `data-i18n-attr="title,aria-label"`（如 src/sidepanel/sidepanel.html:29–36），`applyTranslations` 遍历 `[data-i18n]` 时无条件设置 `textContent`，把翻译文本渲染为可见子节点，导致与图标叠加。
- 主题选择器尺寸不一致
  - 原因：`.theme-selector` 与 `.theme-option` 被重复定义且尺寸规则不一致；语言按钮 `.theme-option[data-language]` 单独定义较大的 padding，造成与主题按钮不一致（src/sidepanel/css/components.css:1676–1684、1691–1705、1721–1793、1807–1812）。
- 确认弹窗中英混用
  - 原因：调用 `ui.showCustomConfirm` 仅传 message 未传 title，默认标题用中文常量（src/sidepanel/uiManager.js:1061），或少量硬编码仍未替换为字典键（如 src/sidepanel/appController.js 对不同路径处理不一致）。

## 修复与自测实施步骤
1) 调整 i18n 引擎的替换逻辑
- 变更 `src/utils/i18n.js` 的 `applyTranslations()`：
  - 当元素有 `data-i18n-attr` 时，仅设置属性（placeholder/title/aria-label），跳过 `textContent`；
  - 当元素无 `data-i18n-attr` 时才设置 `textContent`；
  - 可选增加 `data-i18n-text="true"` 强制文本替换，避免误改容器结构。
- 自测：
  - 切换语言后，顶部 Add/Settings 按钮不再出现可见英文文本，仅显示图标与正确 tooltip。

2) 表单标签不覆盖必填星
- 在 `src/sidepanel/sidepanel.html` 将表单标签结构改为：
  - `<label ...><span class="required">*</span> <span data-i18n="form.label.title"></span></label>`；内容同理。
- 自测：
  - 切换语言，标签显示对应语言文案，必填星保留。

3) 全面梳理字典与键对齐
- 补齐 `form.label.title`、`form.label.content`、`confirm.clearAll`、`confirm.downloadFailedRecords` 等键到 `assets/i18n/en.json` 与 `assets/i18n/zh_CN.json`；
- 将所有 `actions.*` 用法替换为 `button.copy|edit|delete`、预览用 `preview.copied`；作者统一 `label.author`；
- 自测：
  - 搜索框、按钮、预览、卡片悬浮提示、导入导出提示在中英文下均取到正确键。

4) 统一 Theme-Selector 尺寸
- 合并 `.theme-selector` 定义为一处，统一 `padding:4px; gap:6px;`，并在 `.dark-mode .theme-selector` 保持背景/边框同步；
- `.theme-option` 统一 `padding:6px 10px; min-height:32px; gap:6px;`；
- `.theme-option[data-language]` 继承 `.theme-option`，单独设定 `flex:none; padding:6px 16px; font-size:12px;`；
- 自测：
  - 浅色/深色/系统与语言按钮展示的整体高度和内边距一致，无跳动。

5) 确认弹窗统一语言
- 所有调用改为传入 `message` 与 `title` 两个参数，分别为 `i18n.t('delete.confirm')` 与 `i18n.t('confirm.title')`；清空数据用 `i18n.t('confirm.clearAll')`；失败记录用 `i18n.t('confirm.downloadFailedRecords')`；
- 自测：
  - 弹窗标题与正文与当前语言一致，按钮文案与键对齐（OK/Cancel）。

## 自测用例（Windows/Chrome）
- 切换语言 zh↔en：检查表单标签、顶部按钮 tooltip、列表卡片操作、预览复制、确认弹窗文案是否一致；
- 打开设置页：检查 Theme-Selector 三按钮与语言按钮尺寸一致；
- 导入/导出/模板：检查提示/文件名文案；
- 右键菜单：检查“添加到 Prompt管理助手”根据浏览器 UI 语言正确显示（manifest 与 `_locales`）。

## 交付内容
- 代码改动点列表与前后对比片段（`file_path:line_number` 标注）；
- 截图：
  - 表单标签（星标保留）、确认弹窗（标题+内容一致）、主题选择器（尺寸一致）、顶部按钮（仅图标+tooltip）。

我将按上述步骤执行修复并进行自测，产出对比截图与变更清单，直到全部问题通过验证为止。