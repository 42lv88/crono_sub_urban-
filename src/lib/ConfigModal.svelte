<script>
  import { createEventDispatcher, onMount } from 'svelte';
  import { X, Key, Database, Globe, Check, Info } from 'lucide-svelte';
  import { getCurrentFirebaseConfig, updateFirebaseCredentials, DEFAULT_FIREBASE_CONFIG } from '../firebase.js';

  export let isOpen = false;
  const dispatch = createEventDispatcher();

  let config = { ...DEFAULT_FIREBASE_CONFIG };
  let saveSuccess = false;
  let saveError = '';

  onMount(() => {
    config = getCurrentFirebaseConfig();
  });

  function handleSave() {
    saveError = '';
    const res = updateFirebaseCredentials(config);
    if (res.success) {
      saveSuccess = true;
      dispatch('configUpdated', { isConnected: res.isConnected });
      setTimeout(() => {
        saveSuccess = false;
        closeModal();
      }, 1200);
    } else {
      saveError = res.error || 'Failed to save config';
    }
  }

  function handleResetDefault() {
    config = { ...DEFAULT_FIREBASE_CONFIG };
  }

  function closeModal() {
    dispatch('close');
  }
</script>

{#if isOpen}
  <div class="modal-backdrop" on:click|self={closeModal}>
    <div class="modal-card">
      <div class="modal-header">
        <div class="header-title">
          <Database size={20} class="text-orange" />
          <h2>Firebase Realtime DB Settings</h2>
        </div>
        <button class="close-btn" on:click={closeModal}>
          <X size={20} />
        </button>
      </div>

      <div class="modal-body">
        <div class="info-box">
          <Info size={18} class="info-icon" />
          <p>
            Paste your Firebase project credentials from the <a href="https://console.firebase.google.com/" target="_blank" rel="noreferrer">Firebase Console</a> to sync real-time timers across all devices.
          </p>
        </div>

        {#if saveError}
          <div class="alert alert-error">{saveError}</div>
        {/if}

        {#if saveSuccess}
          <div class="alert alert-success">
            <Check size={16} /> Credentials saved! Reconnected.
          </div>
        {/if}

        <div class="form-grid">
          <div class="form-field full">
            <label for="db-url">Database URL (RTDB)</label>
            <div class="input-wrapper">
              <Database size={16} class="input-icon" />
              <input
                id="db-url"
                type="text"
                bind:value={config.databaseURL}
                placeholder="https://YOUR_PROJECT_ID-default-rtdb.firebaseio.com"
              />
            </div>
          </div>

          <div class="form-field full">
            <label for="api-key">API Key</label>
            <div class="input-wrapper">
              <Key size={16} class="input-icon" />
              <input
                id="api-key"
                type="password"
                bind:value={config.apiKey}
                placeholder="AIzaSy..."
              />
            </div>
          </div>

          <div class="form-field">
            <label for="project-id">Project ID</label>
            <input
              id="project-id"
              type="text"
              bind:value={config.projectId}
              placeholder="my-timer-app"
            />
          </div>

          <div class="form-field">
            <label for="auth-domain">Auth Domain</label>
            <input
              id="auth-domain"
              type="text"
              bind:value={config.authDomain}
              placeholder="project.firebaseapp.com"
            />
          </div>

          <div class="form-field">
            <label for="app-id">App ID</label>
            <input
              id="app-id"
              type="text"
              bind:value={config.appId}
              placeholder="1:1234:web:abcd"
            />
          </div>

          <div class="form-field">
            <label for="sender-id">Messaging Sender ID</label>
            <input
              id="sender-id"
              type="text"
              bind:value={config.messagingSenderId}
              placeholder="123456789"
            />
          </div>
        </div>
      </div>

      <div class="modal-footer">
        <button class="btn btn-secondary" on:click={handleResetDefault}>Reset to Demo</button>
        <button class="btn btn-primary" on:click={handleSave}>Save & Connect</button>
      </div>
    </div>
  </div>
{/if}

<style>
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
    max-width: 520px;
    max-height: 90vh;
    display: flex;
    flex-direction: column;
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.7);
    overflow: hidden;
  }

  .modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1.25rem 1.5rem;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  }

  .header-title {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .header-title h2 {
    margin: 0;
    font-size: 1.15rem;
    color: white;
    font-weight: 700;
  }

  .text-orange {
    color: #ff3e00;
  }

  .close-btn {
    background: transparent;
    border: none;
    color: #94a3b8;
    cursor: pointer;
    padding: 0.25rem;
    border-radius: 6px;
  }

  .close-btn:hover {
    color: white;
    background: rgba(255, 255, 255, 0.1);
  }

  .modal-body {
    padding: 1.5rem;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
  }

  .info-box {
    display: flex;
    gap: 0.75rem;
    background: rgba(255, 62, 0, 0.08);
    border: 1px solid rgba(255, 62, 0, 0.2);
    border-radius: 10px;
    padding: 0.85rem;
    font-size: 0.85rem;
    color: #cbd5e1;
  }

  .info-box a {
    color: #ff6b4a;
    text-decoration: underline;
  }

  .alert {
    padding: 0.75rem;
    border-radius: 8px;
    font-size: 0.85rem;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .alert-success {
    background: rgba(16, 185, 129, 0.15);
    border: 1px solid rgba(16, 185, 129, 0.3);
    color: #34d399;
  }

  .alert-error {
    background: rgba(239, 68, 68, 0.15);
    border: 1px solid rgba(239, 68, 68, 0.3);
    color: #f87171;
  }

  .form-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
  }

  .form-field {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
  }

  .form-field.full {
    grid-column: span 2;
  }

  label {
    font-size: 0.8rem;
    font-weight: 600;
    color: #94a3b8;
  }

  input {
    background: rgba(0, 0, 0, 0.4);
    border: 1px solid rgba(255, 255, 255, 0.15);
    border-radius: 8px;
    padding: 0.55rem 0.75rem;
    color: white;
    font-size: 0.875rem;
  }

  input:focus {
    outline: none;
    border-color: #ff3e00;
    box-shadow: 0 0 0 2px rgba(255, 62, 0, 0.25);
  }

  .input-wrapper {
    position: relative;
    display: flex;
    align-items: center;
  }

  .input-wrapper input {
    width: 100%;
    padding-left: 2.25rem;
  }

  :global(.input-icon) {
    position: absolute;
    left: 0.75rem;
    color: #64748b;
    pointer-events: none;
  }

  .modal-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1rem 1.5rem;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
  }

  .btn {
    padding: 0.6rem 1.25rem;
    border-radius: 8px;
    font-weight: 600;
    font-size: 0.9rem;
    cursor: pointer;
    border: none;
  }

  .btn-primary {
    background: #ff3e00;
    color: white;
  }

  .btn-primary:hover {
    background: #e03700;
  }

  .btn-secondary {
    background: rgba(255, 255, 255, 0.08);
    color: #cbd5e1;
  }
</style>
