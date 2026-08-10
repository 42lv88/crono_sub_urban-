<script>
  import { createEventDispatcher } from 'svelte';
  import { Play, Pause, RotateCcw, Plus, Minus, Settings2, Clock, Flame, Watch } from 'lucide-svelte';

  export let isRunning = false;
  export let isPaused = false;
  export let mode = 'countdown'; // 'countdown' | 'pomodoro' | 'stopwatch'
  export let currentDurationMinutes = 1;

  const dispatch = createEventDispatcher();

  let showCustomModal = false;
  let customHours = 0;
  let customMinutes = 1;
  let customSeconds = 0;

  function handleStart() {
    dispatch('start');
  }

  function handlePause() {
    dispatch('pause');
  }

  function handleResume() {
    dispatch('resume');
  }

  function handleReset() {
    dispatch('reset');
  }

  function handleAdjustTime(deltaSeconds) {
    dispatch('adjust', { deltaSeconds });
  }

  function setMode(newMode) {
    dispatch('changeMode', { mode: newMode });
  }

  function applyCustomTime() {
    const totalMs = ((customHours * 3600) + (customMinutes * 60) + customSeconds) * 1000;
    if (totalMs > 0) {
      dispatch('setCustomTime', { durationMs: totalMs });
      showCustomModal = false;
    }
  }
</script>

<div class="controls-wrapper">
  <!-- Mode Selector Tabs -->
  <div class="mode-tabs">
    <button
      class="tab-btn"
      class:active={mode === 'countdown'}
      on:click={() => setMode('countdown')}
    >
      <Clock size={16} />
      <span>Timer</span>
    </button>

    <button
      class="tab-btn"
      class:active={mode === 'pomodoro'}
      on:click={() => setMode('pomodoro')}
    >
      <Flame size={16} />
      <span>Pomodoro</span>
    </button>

    <button
      class="tab-btn"
      class:active={mode === 'stopwatch'}
      on:click={() => setMode('stopwatch')}
    >
      <Watch size={16} />
      <span>Stopwatch</span>
    </button>
  </div>

  <!-- Primary Action Controls -->
  <div class="primary-actions">
    {#if !isRunning && !isPaused}
      <button class="btn btn-primary start-btn" on:click={handleStart}>
        <Play size={20} fill="currentColor" />
        <span>Start</span>
      </button>
    {:else if isRunning}
      <button class="btn btn-warning pause-btn" on:click={handlePause}>
        <Pause size={20} fill="currentColor" />
        <span>Pause</span>
      </button>
    {:else if isPaused}
      <button class="btn btn-success resume-btn" on:click={handleResume}>
        <Play size={20} fill="currentColor" />
        <span>Resume</span>
      </button>
    {/if}

    <button class="btn btn-secondary reset-btn" on:click={handleReset} title="Reset Timer">
      <RotateCcw size={18} />
      <span>Reset</span>
    </button>
  </div>

  <!-- Quick Time Modifiers & Custom Picker Trigger -->
  {#if mode === 'countdown'}
    <div class="time-adjustments">
      <button class="btn-chip" on:click={() => handleAdjustTime(-60)} title="Minus 1 Minute">
        <Minus size={14} /> 1m
      </button>
      <button class="btn-chip" on:click={() => handleAdjustTime(60)} title="Add 1 Minute">
        <Plus size={14} /> 1m
      </button>
      <button class="btn-chip" on:click={() => handleAdjustTime(300)} title="Add 5 Minutes">
        <Plus size={14} /> 5m
      </button>

      <button class="btn-chip custom-trigger" on:click={() => showCustomModal = !showCustomModal}>
        <Settings2 size={14} /> Custom
      </button>
    </div>
  {/if}

  <!-- Custom Duration Picker Modal -->
  {#if showCustomModal}
    <div class="custom-modal-backdrop" on:click|self={() => showCustomModal = false}>
      <div class="custom-modal">
        <h3>Set Custom Duration</h3>
        <div class="time-inputs">
          <div class="input-group">
            <label for="hours-input">Hours</label>
            <input id="hours-input" type="number" min="0" max="24" bind:value={customHours} />
          </div>
          <span class="colon">:</span>
          <div class="input-group">
            <label for="minutes-input">Mins</label>
            <input id="minutes-input" type="number" min="0" max="59" bind:value={customMinutes} />
          </div>
          <span class="colon">:</span>
          <div class="input-group">
            <label for="seconds-input">Secs</label>
            <input id="seconds-input" type="number" min="0" max="59" bind:value={customSeconds} />
          </div>
        </div>
        <div class="modal-actions">
          <button class="btn btn-secondary" on:click={() => showCustomModal = false}>Cancel</button>
          <button class="btn btn-primary" on:click={applyCustomTime}>Apply & Set</button>
        </div>
      </div>
    </div>
  {/if}
</div>

<style>
  .controls-wrapper {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1.25rem;
    width: 100%;
    max-width: 440px;
    margin: 0 auto;
  }

  .mode-tabs {
    display: flex;
    background: rgba(15, 23, 42, 0.6);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 9999px;
    padding: 4px;
    gap: 4px;
  }

  .tab-btn {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 0.5rem 1rem;
    border-radius: 9999px;
    border: none;
    background: transparent;
    color: var(--text-muted, #94a3b8);
    font-size: 0.875rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .tab-btn:hover {
    color: #ffffff;
  }

  .tab-btn.active {
    background: rgba(255, 255, 255, 0.15);
    color: #ffffff;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  }

  .primary-actions {
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  .btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    font-weight: 700;
    font-size: 1.05rem;
    padding: 0.85rem 1.75rem;
    border-radius: 12px;
    border: none;
    cursor: pointer;
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .btn-primary {
    background: linear-gradient(135deg, #ff3e00 0%, #ff6000 100%);
    color: white;
    box-shadow: 0 4px 20px rgba(255, 62, 0, 0.4);
  }

  .btn-primary:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 24px rgba(255, 62, 0, 0.55);
  }

  .btn-warning {
    background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
    color: white;
    box-shadow: 0 4px 20px rgba(245, 158, 11, 0.4);
  }

  .btn-warning:hover {
    transform: translateY(-2px);
  }

  .btn-success {
    background: linear-gradient(135deg, #10b981 0%, #059669 100%);
    color: white;
    box-shadow: 0 4px 20px rgba(16, 185, 129, 0.4);
  }

  .btn-secondary {
    background: rgba(255, 255, 255, 0.08);
    color: #e2e8f0;
    border: 1px solid rgba(255, 255, 255, 0.12);
  }

  .btn-secondary:hover {
    background: rgba(255, 255, 255, 0.16);
    color: white;
  }

  .time-adjustments {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
    justify-content: center;
  }

  .btn-chip {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    background: rgba(255, 255, 255, 0.06);
    border: 1px solid rgba(255, 255, 255, 0.1);
    color: #cbd5e1;
    font-size: 0.825rem;
    font-weight: 600;
    padding: 0.4rem 0.75rem;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .btn-chip:hover {
    background: rgba(255, 255, 255, 0.15);
    color: white;
    border-color: rgba(255, 255, 255, 0.25);
  }

  .custom-modal-backdrop {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: rgba(0, 0, 0, 0.75);
    backdrop-filter: blur(6px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 100;
  }

  .custom-modal {
    background: #0f172a;
    border: 1px solid rgba(255, 255, 255, 0.15);
    border-radius: 16px;
    padding: 1.5rem;
    width: 90%;
    max-width: 360px;
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.6);
  }

  .custom-modal h3 {
    margin: 0 0 1.25rem 0;
    color: white;
    font-size: 1.2rem;
    text-align: center;
  }

  .time-inputs {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    margin-bottom: 1.5rem;
  }

  .input-group {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.25rem;
  }

  .input-group label {
    font-size: 0.75rem;
    color: #94a3b8;
  }

  .input-group input {
    width: 60px;
    padding: 0.5rem;
    font-size: 1.25rem;
    font-weight: 700;
    text-align: center;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 8px;
    color: white;
  }

  .colon {
    font-size: 1.5rem;
    font-weight: bold;
    color: #64748b;
    margin-top: 1rem;
  }

  .modal-actions {
    display: flex;
    justify-content: flex-end;
    gap: 0.75rem;
  }
</style>
