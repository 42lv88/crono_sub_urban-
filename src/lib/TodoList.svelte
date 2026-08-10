<script>
  import { createEventDispatcher } from 'svelte';
  import { CheckSquare, Square, Plus, Trash2, Upload, Target, Sparkles, Tag, Search, Filter } from 'lucide-svelte';

  export let todos = [];
  export let roomId = 'shared-timer';

  const dispatch = createEventDispatcher();

  let newTodoText = '';
  let showBulkModal = false;
  let bulkTextInput = '';
  let searchQuery = '';
  let selectedTagFilter = 'ALL';

  // Extract #hashtag tags from string helper
  function extractTags(str) {
    const regex = /#([a-zA-Z0-9_\-]+)/g;
    const tags = [];
    let match;
    while ((match = regex.exec(str)) !== null) {
      tags.push(match[1]);
    }
    return tags;
  }

  // Get list of unique tags from all todos
  $: allTags = Array.from(new Set(
    todos.flatMap(t => t.tags || [])
  ));

  // Filtered todos based on search query and selected tag
  $: filteredTodos = todos.filter(item => {
    const matchesSearch = !searchQuery.trim() ||
      item.text.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.tags && item.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase())));

    const matchesTag = selectedTagFilter === 'ALL' ||
      (item.tags && item.tags.includes(selectedTagFilter));

    return matchesSearch && matchesTag;
  });

  $: totalTodos = todos.length;
  $: completedTodos = todos.filter(t => t.completed).length;
  $: progressPercent = totalTodos > 0 ? Math.round((completedTodos / totalTodos) * 100) : 0;

  function addTodo() {
    if (!newTodoText.trim()) return;

    const extracted = extractTags(newTodoText);
    const cleanText = newTodoText.replace(/#([a-zA-Z0-9_\-]+)/g, '').replace(/\s+/g, ' ').trim();

    const item = {
      id: 'todo_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      text: cleanText || newTodoText,
      tags: extracted.length > 0 ? extracted : ['General'],
      completed: false,
      createdAt: Date.now()
    };

    dispatch('add', { todo: item });
    newTodoText = '';
  }

  function toggleTodo(id) {
    dispatch('toggle', { id });
  }

  function deleteTodo(id) {
    dispatch('delete', { id });
  }

  function clearCompleted() {
    dispatch('clearCompleted');
  }

  function handleBulkUpload() {
    if (!bulkTextInput.trim()) return;
    const lines = bulkTextInput
      .split('\n')
      .map(line => line.replace(/^[•\-\*\d+\.\s]+/, '').trim())
      .filter(line => line.length > 0);

    const newItems = lines.map(line => {
      const extracted = extractTags(line);
      const cleanText = line.replace(/#([a-zA-Z0-9_\-]+)/g, '').replace(/\s+/g, ' ').trim();
      return {
        id: 'todo_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
        text: cleanText || line,
        tags: extracted.length > 0 ? extracted : ['General'],
        completed: false,
        createdAt: Date.now()
      };
    });

    dispatch('bulkAdd', { todos: newItems });
    bulkTextInput = '';
    showBulkModal = false;
  }
</script>

<div class="todo-panel">
  <div class="panel-header">
    <div class="title-group">
      <Target size={20} class="icon-target" />
      <h3>Daily Targets</h3>
      <span class="count-badge">{completedTodos}/{totalTodos}</span>
    </div>

    <div class="header-actions">
      <button class="btn-subtle" on:click={() => showBulkModal = true} title="Bulk Upload Targets">
        <Upload size={14} />
        <span>Import</span>
      </button>
    </div>
  </div>

  <!-- Progress Bar -->
  <div class="progress-bar-track">
    <div class="progress-bar-fill" style="width: {progressPercent}%"></div>
  </div>

  <!-- Search & Tag Filter Toolbar -->
  <div class="toolbar">
    <div class="search-box">
      <Search size={14} class="search-icon" />
      <input
        type="text"
        bind:value={searchQuery}
        placeholder="Filter targets or #tags..."
        class="search-input"
      />
    </div>

    {#if allTags.length > 0}
      <div class="tag-chips">
        <button
          class="tag-chip"
          class:active={selectedTagFilter === 'ALL'}
          on:click={() => selectedTagFilter = 'ALL'}
        >
          All
        </button>
        {#each allTags as tag}
          <button
            class="tag-chip"
            class:active={selectedTagFilter === tag}
            on:click={() => selectedTagFilter = tag}
          >
            #{tag}
          </button>
        {/each}
      </div>
    {/if}
  </div>

  <!-- Add Input -->
  <form on:submit|preventDefault={addTodo} class="add-form">
    <input
      type="text"
      bind:value={newTodoText}
      placeholder="Add target (use #tag like #Code, #Study)..."
      class="todo-input"
    />
    <button type="submit" class="add-btn" disabled={!newTodoText.trim()}>
      <Plus size={18} />
    </button>
  </form>

  <!-- Todo Item List -->
  <div class="todo-list">
    {#if filteredTodos.length === 0}
      <div class="empty-state">
        <Sparkles size={24} class="icon-empty" />
        <p>No matching targets found.</p>
        <span class="sub-empty">Add a target using #tag syntax (e.g. "Complete report #Work")!</span>
      </div>
    {:else}
      {#each filteredTodos as item (item.id)}
        <div class="todo-item" class:completed={item.completed}>
          <button class="checkbox-btn" on:click={() => toggleTodo(item.id)}>
            {#if item.completed}
              <CheckSquare size={18} class="checked-icon" />
            {:else}
              <Square size={18} class="unchecked-icon" />
            {/if}
          </button>

          <div class="todo-content">
            <span class="todo-text" on:click={() => toggleTodo(item.id)}>
              {item.text}
            </span>

            {#if item.tags && item.tags.length > 0}
              <div class="item-tags">
                {#each item.tags as tag}
                  <span class="tag-pill" on:click={() => selectedTagFilter = tag}>
                    #{tag}
                  </span>
                {/each}
              </div>
            {/if}
          </div>

          <button class="delete-btn" on:click={() => deleteTodo(item.id)} title="Delete target">
            <Trash2 size={15} />
          </button>
        </div>
      {/each}
    {/if}
  </div>

  {#if completedTodos > 0}
    <div class="panel-footer">
      <button class="clear-btn" on:click={clearCompleted}>
        Clear {completedTodos} completed
      </button>
    </div>
  {/if}
</div>

<!-- Bulk Upload Modal -->
{#if showBulkModal}
  <div class="modal-backdrop" on:click|self={() => showBulkModal = false}>
    <div class="modal-card">
      <div class="modal-header">
        <div class="header-title">
          <Upload size={18} class="text-orange" />
          <h4>Import Daily Targets</h4>
        </div>
      </div>

      <div class="modal-body">
        <p class="help-text">
          Paste multiple targets (one per line). Include hashtags for auto-tagging!
        </p>
        <textarea
          bind:value={bulkTextInput}
          rows="6"
          placeholder="1. Build Svelte component #Code&#10;2. Read 20 pages #Study&#10;3. Morning workout #Health"
          class="bulk-textarea"
        ></textarea>
      </div>

      <div class="modal-footer">
        <button class="btn btn-secondary" on:click={() => showBulkModal = false}>Cancel</button>
        <button class="btn btn-primary" on:click={handleBulkUpload} disabled={!bulkTextInput.trim()}>
          Upload & Tag Targets
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  .todo-panel {
    background: rgba(15, 23, 42, 0.5);
    backdrop-filter: blur(12px);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 16px;
    padding: 1.25rem;
    width: 100%;
    max-width: 440px;
    display: flex;
    flex-direction: column;
    gap: 0.85rem;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
  }

  .panel-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .title-group {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .title-group h3 {
    margin: 0;
    font-size: 1.05rem;
    font-weight: 700;
    color: #ffffff;
  }

  :global(.icon-target) {
    color: #ff3e00;
  }

  .count-badge {
    background: rgba(255, 62, 0, 0.15);
    color: #ff6b4a;
    font-size: 0.75rem;
    font-weight: 700;
    padding: 0.15rem 0.5rem;
    border-radius: 9999px;
    border: 1px solid rgba(255, 62, 0, 0.25);
  }

  .btn-subtle {
    display: flex;
    align-items: center;
    gap: 4px;
    background: rgba(255, 255, 255, 0.06);
    border: 1px solid rgba(255, 255, 255, 0.1);
    color: #cbd5e1;
    font-size: 0.75rem;
    font-weight: 600;
    padding: 0.3rem 0.6rem;
    border-radius: 8px;
    cursor: pointer;
  }

  .btn-subtle:hover {
    background: rgba(255, 255, 255, 0.15);
    color: white;
  }

  .progress-bar-track {
    width: 100%;
    height: 6px;
    background: rgba(255, 255, 255, 0.08);
    border-radius: 9999px;
    overflow: hidden;
  }

  .progress-bar-fill {
    height: 100%;
    background: linear-gradient(90deg, #ff3e00 0%, #38ef7d 100%);
    transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .toolbar {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .search-box {
    position: relative;
    display: flex;
    align-items: center;
  }

  :global(.search-icon) {
    position: absolute;
    left: 0.65rem;
    color: #64748b;
    pointer-events: none;
  }

  .search-input {
    width: 100%;
    background: rgba(0, 0, 0, 0.3);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 8px;
    padding: 0.4rem 0.5rem 0.4rem 2rem;
    color: white;
    font-size: 0.8rem;
  }

  .search-input:focus {
    outline: none;
    border-color: #ff3e00;
  }

  .tag-chips {
    display: flex;
    gap: 0.35rem;
    flex-wrap: wrap;
  }

  .tag-chip {
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    color: #94a3b8;
    font-size: 0.75rem;
    font-weight: 600;
    padding: 0.2rem 0.5rem;
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .tag-chip:hover {
    color: white;
    background: rgba(255, 255, 255, 0.12);
  }

  .tag-chip.active {
    background: rgba(255, 62, 0, 0.2);
    color: #ff6b4a;
    border-color: rgba(255, 62, 0, 0.4);
  }

  .add-form {
    display: flex;
    gap: 0.5rem;
  }

  .todo-input {
    flex: 1;
    background: rgba(0, 0, 0, 0.4);
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 10px;
    padding: 0.55rem 0.85rem;
    color: white;
    font-size: 0.85rem;
  }

  .todo-input:focus {
    outline: none;
    border-color: #ff3e00;
  }

  .add-btn {
    background: #ff3e00;
    border: none;
    color: white;
    width: 36px;
    height: 36px;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
  }

  .add-btn:disabled {
    opacity: 0.4;
  }

  .todo-list {
    display: flex;
    flex-direction: column;
    gap: 0.45rem;
    max-height: 280px;
    overflow-y: auto;
  }

  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 1.5rem 1rem;
    text-align: center;
  }

  :global(.icon-empty) {
    color: #475569;
    margin-bottom: 0.35rem;
  }

  .empty-state p {
    margin: 0;
    font-size: 0.85rem;
    color: #cbd5e1;
  }

  .sub-empty {
    font-size: 0.725rem;
    margin-top: 0.25rem;
    color: #64748b;
  }

  .todo-item {
    display: flex;
    align-items: flex-start;
    gap: 0.65rem;
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.06);
    border-radius: 10px;
    padding: 0.55rem 0.75rem;
  }

  .todo-item.completed {
    opacity: 0.65;
  }

  .todo-item.completed .todo-text {
    text-decoration: line-through;
    color: #94a3b8;
  }

  .checkbox-btn {
    background: transparent;
    border: none;
    padding: 2px 0 0 0;
    color: #94a3b8;
    cursor: pointer;
  }

  :global(.checked-icon) { color: #10b981; }
  :global(.unchecked-icon) { color: #64748b; }

  .todo-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .todo-text {
    font-size: 0.85rem;
    color: #f1f5f9;
    cursor: pointer;
    word-break: break-word;
  }

  .item-tags {
    display: flex;
    gap: 0.25rem;
    flex-wrap: wrap;
  }

  .tag-pill {
    font-size: 0.7rem;
    font-weight: 600;
    color: #ff6b4a;
    background: rgba(255, 62, 0, 0.12);
    padding: 0.1rem 0.4rem;
    border-radius: 4px;
    cursor: pointer;
  }

  .tag-pill:hover {
    background: rgba(255, 62, 0, 0.25);
  }

  .delete-btn {
    background: transparent;
    border: none;
    color: #64748b;
    cursor: pointer;
    opacity: 0;
    transition: opacity 0.2s ease;
  }

  .todo-item:hover .delete-btn {
    opacity: 1;
  }

  .delete-btn:hover {
    color: #ef4444;
  }

  .panel-footer {
    display: flex;
    justify-content: flex-end;
    border-top: 1px solid rgba(255, 255, 255, 0.06);
    padding-top: 0.5rem;
  }

  .clear-btn {
    background: transparent;
    border: none;
    color: #94a3b8;
    font-size: 0.75rem;
    cursor: pointer;
  }

  .clear-btn:hover {
    color: #ef4444;
  }

  /* Modal */
  .modal-backdrop {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: rgba(0, 0, 0, 0.75);
    backdrop-filter: blur(8px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 200;
  }

  .modal-card {
    background: #0f172a;
    border: 1px solid rgba(255, 255, 255, 0.15);
    border-radius: 16px;
    width: 90%;
    max-width: 440px;
    padding: 1.25rem;
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .header-title {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .header-title h4 {
    margin: 0;
    font-size: 1.1rem;
    color: white;
  }

  .help-text {
    font-size: 0.8rem;
    color: #94a3b8;
    margin: 0 0 0.75rem 0;
  }

  .bulk-textarea {
    width: 100%;
    background: rgba(0, 0, 0, 0.4);
    border: 1px solid rgba(255, 255, 255, 0.15);
    border-radius: 10px;
    padding: 0.75rem;
    color: white;
    font-family: inherit;
    font-size: 0.85rem;
    resize: vertical;
  }

  .modal-footer {
    display: flex;
    justify-content: flex-end;
    gap: 0.5rem;
  }

  .btn {
    padding: 0.55rem 1rem;
    border-radius: 8px;
    font-weight: 600;
    font-size: 0.85rem;
    cursor: pointer;
    border: none;
  }

  .btn-primary {
    background: #ff3e00;
    color: white;
  }

  .btn-secondary {
    background: rgba(255, 255, 255, 0.08);
    color: #cbd5e1;
  }
</style>
