<script>
  import { createEventDispatcher, onMount } from 'svelte';
  
  const dispatch = createEventDispatcher();
  
  // Props
  export let selectedTags = [];
  export let allTags = [];
  export let placeholder = '输入标签...';
  export let maxTags = 10;
  
  // Internal state
  let inputValue = '';
  let inputElement;
  let suggestedTags = [];
  let isInputFocused = false;
  
  // 计算推荐标签（排除已选择的标签）
  $: suggestedTags = allTags.filter(tag => 
    !selectedTags.includes(tag) && 
    tag.toLowerCase().includes(inputValue.toLowerCase().trim())
  ).slice(0, 20); // 限制显示数量
  
  // 添加标签
  function addTag(tag) {
    if (!tag || selectedTags.includes(tag) || selectedTags.length >= maxTags) {
      return;
    }
    
    selectedTags = [...selectedTags, tag];
    inputValue = '';
    dispatch('tagsChange', selectedTags);
  }
  
  // 删除标签
  function removeTag(tagToRemove) {
    selectedTags = selectedTags.filter(tag => tag !== tagToRemove);
    dispatch('tagsChange', selectedTags);
  }
  
  // 处理输入框键盘事件
  function handleKeydown(event) {
    const trimmedValue = inputValue.trim();
    
    if ((event.key === 'Enter' || event.key === ',') && trimmedValue) {
      event.preventDefault();
      addTag(trimmedValue);
    } else if (event.key === 'Backspace' && !inputValue && selectedTags.length > 0) {
      // 如果输入框为空且按下退格键，删除最后一个标签
      removeTag(selectedTags[selectedTags.length - 1]);
    }
  }
  
  // 处理输入框焦点
  function handleFocus() {
    isInputFocused = true;
  }
  
  function handleBlur() {
    // 延迟失焦，允许点击推荐标签
    setTimeout(() => {
      isInputFocused = false;
    }, 150);
  }
  
  // 点击推荐标签
  function selectSuggestedTag(tag) {
    addTag(tag);
    inputElement?.focus();
  }
  
  onMount(() => {
    // 组件挂载后可以进行初始化
  });
</script>

<!-- 智能标签输入组件 -->
<div class="smart-tag-input">
  <!-- 已选标签区域 -->
  <div class="selected-tags-area">
    {#each selectedTags as tag (tag)}
      <span class="tag-pill selected">
        <span class="tag-text">{tag}</span>
        <button 
          class="tag-remove" 
          on:click={() => removeTag(tag)}
          type="button"
          aria-label={window?.i18n ? window.i18n.t('tag.remove') + ' ' + tag : '删除标签 ' + tag}
        >
          ×
        </button>
      </span>
    {/each}
    
    <!-- 输入框 -->
    <input 
      bind:this={inputElement}
      bind:value={inputValue}
      on:keydown={handleKeydown}
      on:focus={handleFocus}
      on:blur={handleBlur}
      class="tag-input"
      type="text"
      {placeholder}
      disabled={selectedTags.length >= maxTags}
    />
  </div>
  
  <!-- 推荐标签栏 -->
  {#if (isInputFocused || inputValue) && suggestedTags.length > 0}
    <div class="suggested-tags-bar">
      <div class="suggested-tags-label">{window?.i18n ? window.i18n.t('tag.recommended.label') : '推荐标签'}:</div>
      <div class="suggested-tags-list">
        {#each suggestedTags as tag (tag)}
          <button 
            class="tag-pill suggested"
            on:click={() => selectSuggestedTag(tag)}
            type="button"
          >
            {tag}
          </button>
        {/each}
      </div>
    </div>
  {/if}
  
  <!-- 标签数量提示 -->
  {#if selectedTags.length > 0}
    <div class="tags-count">
      已选择 {selectedTags.length}/{maxTags} 个标签
    </div>
  {/if}
</div>

<style>
  .smart-tag-input {
    width: 100%;
  }
  
  .selected-tags-area {
    min-height: 44px;
    padding: 8px 12px;
    border: 1px solid var(--border-light, #e5e7eb);
    border-radius: 10px;
    background-color: var(--card-light, #ffffff);
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    align-items: center;
    transition: all 0.2s ease;
    cursor: text;
  }
  
  .selected-tags-area:focus-within {
    border-color: var(--primary-color, #4f46e5);
    box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.2);
  }
  
  .tag-pill {
    display: inline-flex;
    align-items: center;
    padding: 4px 8px;
    border-radius: 12px;
    font-size: 12px;
    font-weight: 500;
    white-space: nowrap;
    transition: all 0.2s ease;
    border: none;
    cursor: pointer;
  }
  
  .tag-pill.selected {
    background-color: var(--primary-color, #4f46e5);
    color: white;
    padding-right: 4px;
  }
  
  .tag-pill.suggested {
    background-color: #f3f4f6;
    color: #6b7280;
  }
  
  .tag-pill.suggested:hover {
    background-color: #e5e7eb;
    color: #374151;
    transform: translateY(-1px);
  }
  
  .tag-text {
    margin-right: 4px;
  }
  
  .tag-remove {
    background: none;
    border: none;
    color: rgba(255, 255, 255, 0.8);
    font-size: 14px;
    font-weight: bold;
    cursor: pointer;
    padding: 0;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;
  }
  
  .tag-remove:hover {
    background-color: rgba(255, 255, 255, 0.2);
    color: white;
  }
  
  .tag-input {
    border: none;
    outline: none;
    background: transparent;
    flex: 1;
    min-width: 120px;
    font-size: 14px;
    color: var(--text-light, #374151);
  }
  
  .tag-input::placeholder {
    color: #9ca3af;
  }
  
  .tag-input:disabled {
    cursor: not-allowed;
    opacity: 0.6;
  }
  
  .suggested-tags-bar {
    margin-top: 8px;
    padding: 8px 12px;
    background-color: var(--bg-secondary, #f9fafb);
    border-radius: 8px;
    border: 1px solid var(--border-light, #e5e7eb);
  }
  
  .suggested-tags-label {
    font-size: 12px;
    color: #6b7280;
    margin-bottom: 6px;
    font-weight: 500;
  }
  
  .suggested-tags-list {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
  }
  
  .tags-count {
    margin-top: 4px;
    font-size: 11px;
    color: #6b7280;
    text-align: right;
  }
  
  /* 暗色主题支持 */
  :global(.dark-mode) .selected-tags-area {
    border-color: var(--border-dark, #374151);
    background-color: var(--card-dark, #1f2937);
  }
  
  :global(.dark-mode) .tag-input {
    color: var(--text-dark, #f3f4f6);
  }
  
  :global(.dark-mode) .tag-pill.suggested {
    background-color: #374151;
    color: #9ca3af;
  }
  
  :global(.dark-mode) .tag-pill.suggested:hover {
    background-color: #4b5563;
    color: #d1d5db;
  }
  
  :global(.dark-mode) .suggested-tags-bar {
    background-color: var(--bg-secondary-dark, #111827);
    border-color: var(--border-dark, #374151);
  }
</style>
