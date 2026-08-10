<script>
  export let timeRemainingMs = 0;
  export let totalDurationMs = 60000;
  export let isRunning = false;
  export let isPaused = false;
  export let mode = 'countdown'; // 'countdown' | 'pomodoro' | 'stopwatch'
  export let pomodoroPhase = 'focus'; // 'focus' | 'shortBreak' | 'longBreak'
  export let title = '';

  $: totalSeconds = Math.max(0, Math.floor(timeRemainingMs / 1000));
  $: hours = Math.floor(totalSeconds / 3600);
  $: minutes = Math.floor((totalSeconds % 3600) / 60);
  $: seconds = totalSeconds % 60;
  $: tenths = Math.floor((timeRemainingMs % 1000) / 100);

  $: formattedMinutes = String(minutes).padStart(2, '0');
  $: formattedSeconds = String(seconds).padStart(2, '0');
  $: formattedHours = String(hours).padStart(2, '0');

  // Progress percentage (0 to 1)
  $: progressRatio = mode === 'stopwatch'
    ? 1
    : totalDurationMs > 0
      ? Math.min(1, Math.max(0, timeRemainingMs / totalDurationMs))
      : 0;

  // SVG parameters
  const size = 320;
  const strokeWidth = 14;
  const center = size / 2;
  const radius = center - strokeWidth - 4;
  const circumference = 2 * Math.PI * radius;

  $: dashOffset = circumference * (1 - progressRatio);

  // Status label & accent class
  $: statusLabel = isRunning 
    ? (mode === 'stopwatch' ? 'Counting Up' : 'Ticking Down') 
    : isPaused 
      ? 'Paused' 
      : timeRemainingMs === 0 && totalDurationMs > 0 && mode !== 'stopwatch'
        ? 'Completed 🎉'
        : 'Ready';

  $: accentClass = mode === 'pomodoro'
    ? (pomodoroPhase === 'focus' ? 'theme-focus' : 'theme-break')
    : isRunning
      ? 'theme-active'
      : isPaused
        ? 'theme-paused'
        : 'theme-idle';
</script>

<div class="timer-display-container {accentClass}">
  <div class="svg-wrapper">
    <svg width={size} height={size} viewBox="0 0 {size} {size}">
      <defs>
        <!-- Dynamic Gradient Definitions -->
        <linearGradient id="gradient-active" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#00f2fe" />
          <stop offset="100%" stop-color="#4facfe" />
        </linearGradient>

        <linearGradient id="gradient-paused" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#f6d365" />
          <stop offset="100%" stop-color="#fda085" />
        </linearGradient>

        <linearGradient id="gradient-focus" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#ff0844" />
          <stop offset="100%" stop-color="#ffb199" />
        </linearGradient>

        <linearGradient id="gradient-break" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#b19ffb" />
          <stop offset="100%" stop-color="#6930c3" />
        </linearGradient>

        <linearGradient id="gradient-completed" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#11998e" />
          <stop offset="100%" stop-color="#38ef7d" />
        </linearGradient>

        <!-- Drop Shadow / Glow Filter -->
        <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="8" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>

      <!-- Background Track -->
      <circle
        cx={center}
        cy={center}
        r={radius}
        class="circle-bg"
        stroke-width={strokeWidth}
      />

      <!-- Progress Fill Circle -->
      <circle
        cx={center}
        cy={center}
        r={radius}
        class="circle-progress"
        stroke-width={strokeWidth}
        stroke-dasharray={circumference}
        stroke-dashoffset={dashOffset}
        stroke-linecap="round"
        filter="url(#glow)"
        transform="rotate(-90 {center} {center})"
      />
    </svg>

    <div class="timer-center-content">
      {#if mode === 'pomodoro'}
        <span class="badge phase-badge">
          {pomodoroPhase === 'focus' ? '🔥 Focus Session' : '☕ Break Time'}
        </span>
      {:else}
        <span class="badge status-badge">{statusLabel}</span>
      {/if}

      <div class="time-digits" class:pulse={isRunning}>
        {#if hours > 0}
          <span class="part">{formattedHours}</span><span class="sep">:</span>
        {/if}
        <span class="part">{formattedMinutes}</span>
        <span class="sep">:</span>
        <span class="part">{formattedSeconds}</span>
        <span class="tenths">.{tenths}</span>
      </div>

      {#if title}
        <span class="room-title">{title}</span>
      {/if}
    </div>
  </div>
</div>

<style>
  .timer-display-container {
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 1.5rem;
    position: relative;
  }

  .svg-wrapper {
    position: relative;
    width: 320px;
    height: 320px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  svg {
    transform: rotate(0deg);
    overflow: visible;
  }

  .circle-bg {
    fill: none;
    stroke: rgba(255, 255, 255, 0.07);
  }

  .circle-progress {
    fill: none;
    transition: stroke-dashoffset 0.1s linear, stroke 0.3s ease;
  }

  .theme-active .circle-progress {
    stroke: url(#gradient-active);
  }

  .theme-paused .circle-progress {
    stroke: url(#gradient-paused);
  }

  .theme-focus .circle-progress {
    stroke: url(#gradient-focus);
  }

  .theme-break .circle-progress {
    stroke: url(#gradient-break);
  }

  .theme-idle .circle-progress {
    stroke: url(#gradient-completed);
  }

  .timer-center-content {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    pointer-events: none;
  }

  .badge {
    font-size: 0.8rem;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    padding: 0.3rem 0.85rem;
    border-radius: 9999px;
    backdrop-filter: blur(8px);
    margin-bottom: 0.5rem;
  }

  .status-badge {
    background: rgba(255, 255, 255, 0.08);
    color: var(--text-secondary, #cbd5e1);
    border: 1px solid rgba(255, 255, 255, 0.12);
  }

  .phase-badge {
    background: rgba(255, 62, 0, 0.15);
    color: #ff6b4a;
    border: 1px solid rgba(255, 62, 0, 0.3);
  }

  .time-digits {
    font-family: 'Inter', system-ui, -apple-system, monospace;
    font-variant-numeric: tabular-nums;
    font-size: 3.5rem;
    font-weight: 800;
    line-height: 1;
    color: #ffffff;
    letter-spacing: -0.02em;
    text-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: baseline;
  }

  .time-digits.pulse {
    animation: gentle-pulse 2s infinite ease-in-out;
  }

  @keyframes gentle-pulse {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.015); }
  }

  .tenths {
    font-size: 1.5rem;
    opacity: 0.6;
    margin-left: 2px;
    font-weight: 600;
  }

  .sep {
    margin: 0 1px;
    opacity: 0.7;
  }

  .room-title {
    margin-top: 0.6rem;
    font-size: 0.85rem;
    color: var(--text-muted, #94a3b8);
    font-weight: 500;
  }
</style>
