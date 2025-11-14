## 问题定位与根因
- 文本替换
  - 表单标签出现 key 原样显示（示例：form.label.title、form.label.content），原因是字典缺少对应键，`i18n.t` 未命中时直接返回 key（src/utils/i18n.js:41）。
  - 确认弹窗中标题与内容语言不一致，原因是 `ui.showCustomConfirm` 仅传 message（来自 `i18n.t('delete.confirm')`），未传 title；而函数默认 title 是中文常量（src/sidepanel/uiManager.js:1061）。
  - 仍有少量硬编码或使用过时键（actions.*）的地方，导致局部未翻译或键不匹配（参考 src/sidepanel/uiManager.js:154–170、336–345）。
- Icon 显示异常
  - 顶部“Add Prompt”图标的提示词（title）与“Settings”可见文本叠加，来自同时展示可见文本与浏览器原生 tooltip 的交互；按钮本身图标正常（src/sidepanel/sidepanel.html:29–36）。
  - 设置页分组文本的国际化先前通过“匹配原文再替换”的方式，易受 DOM 初始文案影响；已切换为 data-i18n 属性，但个别动态内容（确认弹窗）仍由 JS 注入时覆盖。
- Theme-Selector 尺寸
  - `.theme-selector` 与 `.theme-option` 定义重复、尺寸规则不一致（components.css:1676–1684 与 1807–1813；1691–1705 与 1721–1793），导致不同主题下高度和内边距不统一；语言选项 `.theme-option[data-language]` 也使用了不同的 padding/font-size。

## 代码级修复方案
- 补齐字典键（双语）
  - 位置：assets/i18n/en.json、assets/i18n/zh_CN.json
  - 新增键（示例）：
    - 表单标签：`form.label.title`、`form.label.content`
    - 弹窗统一：`confirm.title`（已存在），`delete.confirm`（已对齐）
    - 标签组件：`tag.input.addHint`、`tag.input.addMore`、`tag.recommended.empty`
  - 片段（英文）：
    ```json
    "form.label.title": "Title",
    "form.label.content": "Prompt Content",
    "tag.input.addHint": "Type a tag and press Enter",
    "tag.input.addMore": "Add a tag...",
    "tag.recommended.empty": "No recommended tags"
    ```
  - 片段（中文）：
    ```json
    "form.label.title": "标题",
    "form.label.content": "提示词内容",
    "tag.input.addHint": "输入标签，按回车添加",
    "tag.input.addMore": "添加标签...",
    "tag.recommended.empty": "暂无推荐标签"
    ```
- 修正弹窗入参并彻底国际化
  - 位置：src/sidepanel/appController.js:404–407
  - 将：
    ```js
    const isConfirmed = await ui.showCustomConfirm(i18n.t('delete.confirm'));
    ```
    改为：
    ```js
    const isConfirmed = await ui.showCustomConfirm(i18n.t('delete.confirm'), i18n.t('confirm.title'));
    ```
  - 说明：确保 message 与 title 都来自当前语言，避免中英混合。
- 表单与列表的键对齐
  - 位置：src/sidepanel/sidepanel.html:133–156（表单标签），src/sidepanel/uiManager.js:154–170（卡片操作）
  - 将按钮/提示统一使用 `button.copy|edit|delete`、作者统一 `label.author`；避免使用已废弃的 `actions.*`。
- Icon 提示与设置显示
  - 位置：src/sidepanel/sidepanel.html:29–36
  - 建议：仅保留图标与 `title`（tooltip）而不显示可见的“Settings”文本，或为 `settings-btn` 添加 `aria-label` 使用 data-i18n；避免与 tooltip 叠加。示例：
    ```html
    <button class="settings-btn" id="settingsBtn" data-i18n="button.settings" data-i18n-attr="title,aria-label"><i class="fas fa-cog"></i></button>
    ```
- 标签组件占位与空态国际化
  - 位置：src/sidepanel/tagComponentManager.js:95、359、481–486
  - 用 `i18n.t('tag.*')` 替换硬编码占位与空态文本，已提供字典键。
- Theme-Selector 尺寸统一
  - 位置：src/sidepanel/css/components.css:1676–1684、1691–1705、1807–1813、1721–1793
  - 调整策略：
    - 只保留一组 `.theme-selector` 基准样式（背景、边框、padding 一致），移除重复定义；
    - 统一 `.theme-option` 的最小高度与内边距（建议 `min-height: 32px; padding: 6px 10px; gap: 6px;`）；
    - 语言选项 `.theme-option[data-language]` 继承 `.theme-option`，单独保留 active/hover 边框与阴影；
  - 片段：
    ```css
    .theme-selector { display:flex; background:var(--card-light); border:1px solid var(--border-light); border-radius:12px; padding:4px; gap:6px; }
    .dark-mode .theme-selector { background:var(--card-dark); border-color:var(--border-dark); }
    .theme-option { flex:1; display:flex; align-items:center; justify-content:center; padding:6px 10px; min-height:32px; border-radius:6px; gap:6px; }
    .theme-option[data-language]{ flex:none; font-size:12px; padding:6px 16px; }
    ```

## 配置文件与组件清单（便于对照）
- 国际化字典：
  - `assets/i18n/en.json`、`assets/i18n/zh_CN.json`（补齐上述键）
  - 扩展级 `_locales/*/messages.json`（已使用在 `manifest.json` 与右键菜单标题）
- 组件与脚本：
  - 侧边栏 HTML：`src/sidepanel/sidepanel.html:26–36, 127–156, 171–215, 218–269, 274–287, 294–316, 346–354`
  - 列表/预览与交互：`src/sidepanel/uiManager.js:137–176, 330–346, 384–401`
  - 业务控制器：`src/sidepanel/appController.js:404–469, 492–513, 519–599, 654–716, 722–734`
  - 标签组件：`src/sidepanel/tagComponentManager.js:92–106, 354–361, 470–491`
  - 内容脚本：`src/content_script.js:461–483`（初始化时注入 i18n）
  - 样式：`src/sidepanel/css/components.css:1676–1858`

## 验证与交付
- 验证用例
  - 切换语言后：表单标签与确认弹窗标题/内容一致；“Add Prompt”与“Settings”icon 显示正确且 tooltip 文案匹配当前语言；Theme-Selector 在浅色/深色/系统模式下尺寸一致。
- 交付内容
  - 补齐后的字典文件、关键组件与样式的变更说明；截图（表单标签、确认弹窗、主题选择器）对比前后效果。

## 执行步骤
1) 补齐 en/zh_CN 字典键；2) 修正 `showCustomConfirm` 调用并统一按钮/作者键；3) 侧边栏 header 的 `settings-btn` 改为使用 `title/aria-label`；4) 标签组件占位/空态改用字典；5) 合并与统一 Theme-Selector 的 CSS；6) 回归测试并输出截图与代码片段说明。

如确认，我将按以上步骤实施修复并提交截图与变更片段。