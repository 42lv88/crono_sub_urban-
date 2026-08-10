<script>
  import { createEventDispatcher } from 'svelte';
  import { Users, Copy, Check, Radio, Settings } from 'lucide-svelte';

  export let currentRoomId = 'shared-timer';
  export let isFirebaseActive = false;

  const dispatch = createEventDispatcher();

  let isEditing = false;
  let newRoomInput = currentRoomId;
  let copied = false;

  function handleRoomSubmit() {
    if (newRoomInput.trim()) {
      const cleanRoom = newRoomInput.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '-');
      dispatch('switchRoom', { roomId: cleanRoom });
      isEditing = false;
    }
  }

  function copyShareLink() {
    const url = new URL(window.location.href);
    url.searchParams.set('room', currentRoomId);
    navigator.clipboard.writeText(url.href).then(() => {
      copied = true;
      setTimeout(() => (copied = false), 2000);
    });
  }

  function openConfigModal() {
    dispatch('openConfig');
  }
</script>

<div class="room-manager-bar">
  <div class="room-selector">
    <Users size={16} class="icon-muted" />

    {#if isEditing}
      <form on:submit|preventDefault={handleRoomSubmit} class="room-form">
        <input
          type="text"
          bind:value={newRoomInput}
          placeholder="Enter room name..."
          class="room-input"
          autoFocus
        />
        <button type="submit" class="btn-xs primary">Save</button>
        <button type="button" class="btn-xs" on:click={() => (isEditing = false)}>Cancel</button>
      </form>
    {:else}
      <div class="room-info">
        <span class="room-label">Room:</span>
        <button class="room-name-btn" on:click={() => { newRoomInput = currentRoomId; isEditing = true; }}>
          #{currentRoomId}
        </button>
      </div>

      <button class="btn-icon" on:click={copyShareLink} title="Copy Share Link">
        {#if copied}
          <Check size={14} class="icon-success" />
        {:else}
          <Copy size={14} />
        {/if}
      </button>
    {/if}
  </div>

  <div class="status-controls">
    <!-- Connection Indicator -->
    <button class="status-indicator-btn" on:click={openConfigModal} title="Configure Firebase">
      <Radio size={14} class={isFirebaseActive ? "pulse-green" : "pulse-amber"} />
      <span class="status-text">
        {isFirebaseActive ? 'Firebase Realtime DB' : 'Local Sync (Demo)'}
      </span>
      <Settings size={13} class="icon-subtle" />
    </button>
  </div>
</div>

<style>
  .room-manager-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    max-width: 600px;
    background: rgba(15, 23, 42, 0.4);
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 12px;
    padding: 0.5rem 1rem;
    margin-bottom: 1.5rem;
    gap: 1rem;
    flex-wrap: wrap;
  }

  .room-selector {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .room-info {
    display: flex;
    align-items: center;
    gap: 0.35rem;
  }

  .room-label {
    font-size: 0.8rem;
    color: #94a3b8;
  }

  .room-name-btn {
    background: rgba(255, 255, 255, 0.08);
    border: 1px solid rgba(255, 255, 255, 0.12);
    color: #ffffff;
    font-weight: 700;
    font-size: 0.85rem;
    padding: 0.2rem 0.6rem;
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .room-name-btn:hover {
    background: rgba(255, 255, 255, 0.16);
  }

  .room-form {
    display: flex;
    align-items: center;
    gap: 0.35rem;
  }

  .room-input {
    background: rgba(0, 0, 0, 0.4);
    border: 1px solid rgba(255, 255, 255, 0.2);
    color: white;
    font-size: 0.85rem;
    padding: 0.25rem 0.5rem;
    border-radius: 6px;
    width: 130px;
  }

  .btn-xs {
    font-size: 0.75rem;
    font-weight: 600;
    padding: 0.25rem 0.5rem;
    border-radius: 6px;
    border: none;
    background: rgba(255, 255, 255, 0.1);
    color: white;
    cursor: pointer;
  }

  .btn-xs.primary {
    background: #ff3e00;
  }

  .btn-icon {
    background: transparent;
    border: none;
    color: #94a3b8;
    cursor: pointer;
    padding: 0.2rem;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 4px;
    transition: color 0.2s ease;
  }

  .btn-icon:hover {
    color: white;
  }

  .icon-success {
    color: #10b981;
  }

  .status-controls {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .status-indicator-btn {
    display: flex;
    align-items: center;
    gap: 6px;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 20px;
    padding: 0.25rem 0.75rem;
    color: #cbd5e1;
    font-size: 0.75rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .status-indicator-btn:hover {
    background: rgba(255, 255, 255, 0.12);
    border-color: rgba(255, 255, 255, 0.25);
  }

  :global(.pulse-green) {
    color: #10b981;
    filter: drop-shadow(0 0 4px #10b981);
  }

  :global(.pulse-amber) {
    color: #f59e0b;
  }

  .icon-subtle {
    opacity: 0.6;
    margin-left: 2px;
  }
</style>
