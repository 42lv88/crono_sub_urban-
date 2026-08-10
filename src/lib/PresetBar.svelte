<script>
  import { createEventDispatcher } from 'svelte';

  export let activeDurationMinutes = 1;
  const dispatch = createEventDispatcher();

  const presets = [
    { label: '1m', minutes: 1 },
    { label: '5m', minutes: 5 },
    { label: '10m', minutes: 10 },
    { label: '15m', minutes: 15 },
    { label: '25m', minutes: 25 },
    { label: '45m', minutes: 45 },
    { label: '60m', minutes: 60 }
  ];

  function selectPreset(mins) {
    dispatch('select', { minutes: mins });
  }
</script>

<div class="presets-container">
  <span class="label">Presets:</span>
  <div class="preset-buttons">
    {#each presets as p}
      <button
        class="preset-btn"
        class:active={activeDurationMinutes === p.minutes}
        on:click={() => selectPreset(p.minutes)}
      >
        {p.label}
      </button>
    {/each}
  </div>
</div>

<style>
  .presets-container {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.75rem;
    flex-wrap: wrap;
    margin: 0.5rem 0;
  }

  .label {
    font-size: 0.8rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--text-muted, #94a3b8);
  }

  .preset-buttons {
    display: flex;
    gap: 0.4rem;
    flex-wrap: wrap;
  }

  .preset-btn {
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    color: #cbd5e1;
    font-size: 0.85rem;
    font-weight: 600;
    padding: 0.35rem 0.75rem;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .preset-btn:hover {
    background: rgba(255, 255, 255, 0.15);
    color: white;
  }

  .preset-btn.active {
    background: #ff3e00;
    color: white;
    border-color: #ff3e00;
    box-shadow: 0 2px 10px rgba(255, 62, 0, 0.35);
  }
</style>
