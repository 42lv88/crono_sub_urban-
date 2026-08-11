<script>
  import { onMount, onDestroy } from 'svelte';
  import confetti from 'canvas-confetti';
  import { Volume2, VolumeX, Sparkles, Clock, BarChart2, Maximize2, Minimize2, Target } from 'lucide-svelte';

  import { subscribeToRoom, updateRoomState, isUsingFirebase } from './firebase.js';
  import { playClickSound, playAlarmSound } from './lib/audio.js';

  import TimerDisplay from './lib/TimerDisplay.svelte';
  import TimerControls from './lib/TimerControls.svelte';
  import PresetBar from './lib/PresetBar.svelte';
  import RoomManager from './lib/RoomManager.svelte';
  import ConfigModal from './lib/ConfigModal.svelte';
  import TodoList from './lib/TodoList.svelte';
  import AnalyticsView from './lib/AnalyticsView.svelte';

  // --- STATE ---
  let roomId = 'shared-timer';
  let isFirebaseActive = false;
  let isConfigModalOpen = false;
  let soundEnabled = true;
  let activeTab = 'timer'; // 'timer' | 'analytics'
  let isFullscreen = false;
  let showFullscreenTargets = false;

  // Local clock state
  let currentTime = Date.now();
  let intervalId = null;
  let unsubscribeRoom = null;

  // Shared Cloud State
  let roomState = {
    targetTime: null,
    status: 'idle',
    mode: 'countdown',
    durationMs: 60000,
    pausedRemainingMs: 60000,
    startTime: null,
    pomodoroPhase: 'focus',
    pomodoroCount: 0,
    todos: [],
    activityHistory: {}, // { 'YYYY-MM-DD': { focusMinutes: 45, completedCount: 3 } }
    totalFocusSeconds: 0
  };

  let alarmFired = false;

  $: isRunning = roomState.status === 'running';
  $: isPaused = roomState.status === 'paused';

  $: timeRemainingMs = calculateTimeRemaining(roomState, currentTime);

  function calculateTimeRemaining(state, now) {
    if (state.mode === 'stopwatch') {
      if (state.status === 'running' && state.startTime) {
        return Math.max(0, now - state.startTime);
      } else if (state.status === 'paused') {
        return state.pausedRemainingMs || 0;
      }
      return 0;
    }

    if (state.status === 'running' && state.targetTime) {
      return Math.max(0, state.targetTime - now);
    } else if (state.status === 'paused') {
      return Math.max(0, state.pausedRemainingMs || 0);
    } else if (state.status === 'completed') {
      return 0;
    }
    return state.durationMs || 60000;
  }

  $: currentDurationMinutes = Math.round((roomState.durationMs || 60000) / 60000);

  $: if (
    isRunning &&
    roomState.mode !== 'stopwatch' &&
    timeRemainingMs <= 0 &&
    !alarmFired
  ) {
    handleTimerCompletion();
  }

  function recordActivity(addedFocusMins = 0, addedCompletedCount = 0) {
    const todayStr = new Date().toISOString().split('T')[0];
    const history = roomState.activityHistory || {};
    const todayEntry = history[todayStr] || { focusMinutes: 0, completedCount: 0 };

    const updatedToday = {
      focusMinutes: todayEntry.focusMinutes + addedFocusMins,
      completedCount: todayEntry.completedCount + addedCompletedCount
    };

    const updatedHistory = {
      ...history,
      [todayStr]: updatedToday
    };

    return updatedHistory;
  }

  function handleTimerCompletion() {
    alarmFired = true;
    if (soundEnabled) {
      playAlarmSound();
    }
    triggerConfetti();

    const focusMins = Math.round(roomState.durationMs / 60000);
    const updatedHistory = recordActivity(focusMins, 0);

    if (roomState.mode === 'pomodoro') {
      let nextPhase = roomState.pomodoroPhase === 'focus' ? 'shortBreak' : 'focus';
      let nextDuration = nextPhase === 'focus' ? 25 * 60000 : 5 * 60000;
      let nextCount = roomState.pomodoroPhase === 'focus' ? roomState.pomodoroCount + 1 : roomState.pomodoroCount;

      if (nextCount % 4 === 0 && roomState.pomodoroPhase === 'focus') {
        nextPhase = 'longBreak';
        nextDuration = 15 * 60000;
      }

      updateRoomState(roomId, {
        ...roomState,
        status: 'idle',
        pomodoroPhase: nextPhase,
        pomodoroCount: nextCount,
        durationMs: nextDuration,
        pausedRemainingMs: nextDuration,
        activityHistory: updatedHistory,
        totalFocusSeconds: (roomState.totalFocusSeconds || 0) + (focusMins * 60)
      });
    } else {
      updateRoomState(roomId, {
        ...roomState,
        status: 'completed',
        pausedRemainingMs: 0,
        activityHistory: updatedHistory,
        totalFocusSeconds: (roomState.totalFocusSeconds || 0) + (focusMins * 60)
      });
    }
  }

  function triggerConfetti() {
    try {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
    } catch (e) {}
  }

  // --- FULLSCREEN CONTROLS ---
  function toggleFullscreen() {
    if (!isFullscreen) {
      if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch(e => console.warn(e));
      }
      isFullscreen = true;
    } else {
      if (document.fullscreenElement && document.exitFullscreen) {
        document.exitFullscreen().catch(e => console.warn(e));
      }
      isFullscreen = false;
    }
  }

  function handleFullscreenChange() {
    isFullscreen = !!document.fullscreenElement;
  }

  // --- TIMER ACTIONS ---
  function startTimer() {
    if (soundEnabled) playClickSound();
    alarmFired = false;
    const now = Date.now();

    if (roomState.mode === 'stopwatch') {
      const startTime = now - (isPaused ? roomState.pausedRemainingMs : 0);
      updateRoomState(roomId, {
        ...roomState,
        status: 'running',
        startTime
      });
      return;
    }

    const duration = isPaused ? roomState.pausedRemainingMs : roomState.durationMs;
    const futureTime = now + duration;

    updateRoomState(roomId, {
      ...roomState,
      status: 'running',
      targetTime: futureTime
    });
  }

  function pauseTimer() {
    if (soundEnabled) playClickSound();
    const remaining = timeRemainingMs;

    updateRoomState(roomId, {
      ...roomState,
      status: 'paused',
      pausedRemainingMs: remaining
    });
  }

  function resumeTimer() {
    startTimer();
  }

  function resetTimer() {
    if (soundEnabled) playClickSound();
    alarmFired = false;

    let updatedHistory = roomState.activityHistory;
    let addedSeconds = 0;

    if (roomState.mode === 'stopwatch' && timeRemainingMs >= 60000) {
      const elapsedMins = Math.floor(timeRemainingMs / 60000);
      if (elapsedMins > 0) {
        updatedHistory = recordActivity(elapsedMins, 0);
        addedSeconds = elapsedMins * 60;
      }
    }

    updateRoomState(roomId, {
      ...roomState,
      status: 'idle',
      targetTime: null,
      startTime: null,
      pausedRemainingMs: roomState.mode === 'stopwatch' ? 0 : roomState.durationMs,
      activityHistory: updatedHistory || roomState.activityHistory || {},
      totalFocusSeconds: (roomState.totalFocusSeconds || 0) + addedSeconds
    });
  }

  function handleAdjustTime({ deltaSeconds }) {
    if (soundEnabled) playClickSound();
    const deltaMs = deltaSeconds * 1000;

    if (isRunning && roomState.targetTime) {
      const newTarget = roomState.targetTime + deltaMs;
      const newDuration = Math.max(10000, roomState.durationMs + deltaMs);
      updateRoomState(roomId, {
        ...roomState,
        targetTime: newTarget,
        durationMs: newDuration
      });
    } else {
      const newDuration = Math.max(10000, (roomState.pausedRemainingMs || roomState.durationMs) + deltaMs);
      updateRoomState(roomId, {
        ...roomState,
        durationMs: newDuration,
        pausedRemainingMs: newDuration
      });
    }
  }

  function handleSelectPreset({ minutes }) {
    if (soundEnabled) playClickSound();
    alarmFired = false;
    const durationMs = minutes * 60000;

    updateRoomState(roomId, {
      ...roomState,
      mode: 'countdown',
      status: 'idle',
      durationMs,
      pausedRemainingMs: durationMs,
      targetTime: null
    });
  }

  function handleSetCustomTime({ durationMs }) {
    if (soundEnabled) playClickSound();
    alarmFired = false;

    updateRoomState(roomId, {
      ...roomState,
      mode: 'countdown',
      status: 'idle',
      durationMs,
      pausedRemainingMs: durationMs,
      targetTime: null
    });
  }

  function handleChangeMode({ mode }) {
    if (soundEnabled) playClickSound();
    alarmFired = false;

    let defaultDuration = 60000;
    if (mode === 'pomodoro') defaultDuration = 25 * 60000;
    if (mode === 'stopwatch') defaultDuration = 0;

    updateRoomState(roomId, {
      ...roomState,
      mode,
      status: 'idle',
      durationMs: defaultDuration,
      pausedRemainingMs: defaultDuration,
      pomodoroPhase: 'focus',
      targetTime: null,
      startTime: null
    });
  }

  // --- REALTIME TODO ACTIONS (INSTANT OPTIMISTIC UPDATES) ---
  function handleAddTodo(todo) {
    if (soundEnabled) playClickSound();
    const todos = [todo, ...(roomState.todos || [])];
    const newState = { ...roomState, todos };
    roomState = newState;
    updateRoomState(roomId, newState);
  }

  function handleToggleTodo(id) {
    if (soundEnabled) playClickSound();
    let updatedHistory = roomState.activityHistory || {};
    const todos = (roomState.todos || []).map(t => {
      if (t.id === id) {
        const nextCompleted = !t.completed;
        if (nextCompleted) {
          updatedHistory = recordActivity(0, 1);
        }
        return { ...t, completed: nextCompleted };
      }
      return t;
    });

    const newState = { ...roomState, todos, activityHistory: updatedHistory };
    roomState = newState;
    updateRoomState(roomId, newState);
  }

  function handleDeleteTodo(id) {
    if (soundEnabled) playClickSound();
    const todos = (roomState.todos || []).filter(t => t.id !== id);
    const newState = { ...roomState, todos };
    roomState = newState;
    updateRoomState(roomId, newState);
  }

  function handleBulkAddTodos(newTodos) {
    if (soundEnabled) playClickSound();
    const todos = [...newTodos, ...(roomState.todos || [])];
    const newState = { ...roomState, todos };
    roomState = newState;
    updateRoomState(roomId, newState);
  }

  function handleClearCompletedTodos() {
    if (soundEnabled) playClickSound();
    const todos = (roomState.todos || []).filter(t => !t.completed);
    const newState = { ...roomState, todos };
    roomState = newState;
    updateRoomState(roomId, newState);
  }

  function switchRoom(newRoomId) {
    if (unsubscribeRoom) unsubscribeRoom();
    roomId = newRoomId;

    if (typeof window !== 'undefined' && window.history) {
      const url = new URL(window.location.href);
      url.searchParams.set('room', roomId);
      window.history.replaceState({}, '', url);
    }

    unsubscribeRoom = subscribeToRoom(roomId, (newCloudData) => {
      if (newCloudData) {
        roomState = { ...roomState, ...newCloudData };
      }
    });
  }

  // --- LIFECYCLE ---
  onMount(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const roomParam = urlParams.get('room');
    if (roomParam) {
      roomId = roomParam.toLowerCase().replace(/[^a-z0-9_-]/g, '-');
    }

    isFirebaseActive = isUsingFirebase();

    intervalId = setInterval(() => {
      currentTime = Date.now();
    }, 100);

    unsubscribeRoom = subscribeToRoom(roomId, (newCloudData) => {
      if (newCloudData) {
        roomState = { ...roomState, ...newCloudData };
      }
    });

    if (typeof document !== 'undefined') {
      document.addEventListener('fullscreenchange', handleFullscreenChange);
    }
  });

  onDestroy(() => {
    if (intervalId) clearInterval(intervalId);
    if (unsubscribeRoom) unsubscribeRoom();
    if (typeof document !== 'undefined') {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }
  });
</script>

<main class="app-root">
  <div class="ambient-backdrop" class:running={isRunning} class:completed={timeRemainingMs === 0 && !isRunning}></div>

  <header class="app-header">
    <div class="logo">
      <Sparkles size={24} class="logo-icon" />
      <h1>ChronoSync</h1>
      <span class="version-tag">RTDB</span>
    </div>

    <!-- View Switcher Navigation Tabs -->
    <nav class="view-nav">
      <button
        class="nav-tab"
        class:active={activeTab === 'timer'}
        on:click={() => activeTab = 'timer'}
      >
        <Clock size={16} />
        <span>Timer & Targets</span>
      </button>

      <button
        class="nav-tab"
        class:active={activeTab === 'analytics'}
        on:click={() => activeTab = 'analytics'}
      >
        <BarChart2 size={16} />
        <span>Analytics & Heatmap</span>
      </button>
    </nav>

    <div class="header-right-actions">
      <button
        class="action-btn"
        on:click={toggleFullscreen}
        title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
      >
        {#if isFullscreen}
          <Minimize2 size={18} />
        {:else}
          <Maximize2 size={18} />
        {/if}
      </button>

      <button class="sound-toggle" on:click={() => (soundEnabled = !soundEnabled)} title="Toggle Sound">
        {#if soundEnabled}
          <Volume2 size={18} />
        {:else}
          <VolumeX size={18} class="muted" />
        {/if}
      </button>
    </div>
  </header>

  <div class="app-container">
    <RoomManager
      currentRoomId={roomId}
      {isFirebaseActive}
      on:switchRoom={(e) => switchRoom(e.detail.roomId)}
      on:openConfig={() => (isConfigModalOpen = true)}
    />

    {#if activeTab === 'timer'}
      <div class="app-workspace-grid">
        <!-- Left Column: Timer Section -->
        <section class="timer-section">
          <div class="timer-section-header">
            <button class="btn-fullscreen-launch" on:click={toggleFullscreen} title="Full Screen Mode">
              <Maximize2 size={14} />
              <span>Full Screen</span>
            </button>
          </div>

          {#if roomState.mode === 'countdown'}
            <PresetBar
              activeDurationMinutes={currentDurationMinutes}
              on:select={(e) => handleSelectPreset(e.detail)}
            />
          {/if}

          <TimerDisplay
            {timeRemainingMs}
            totalDurationMs={roomState.durationMs}
            {isRunning}
            {isPaused}
            mode={roomState.mode}
            pomodoroPhase={roomState.pomodoroPhase}
            title="Room #{roomId}"
          />

          <TimerControls
            {isRunning}
            {isPaused}
            mode={roomState.mode}
            {currentDurationMinutes}
            on:start={startTimer}
            on:pause={pauseTimer}
            on:resume={resumeTimer}
            on:reset={resetTimer}
            on:adjust={(e) => handleAdjustTime(e.detail)}
            on:changeMode={(e) => handleChangeMode(e.detail)}
            on:setCustomTime={(e) => handleSetCustomTime(e.detail)}
          />
        </section>

        <!-- Right Column: Daily Targets / To-Do List Section -->
        <section class="todo-section">
          <TodoList
            todos={roomState.todos || []}
            {roomId}
            on:add={(e) => handleAddTodo(e.detail.todo)}
            on:toggle={(e) => handleToggleTodo(e.detail.id)}
            on:delete={(e) => handleDeleteTodo(e.detail.id)}
            on:bulkAdd={(e) => handleBulkAddTodos(e.detail.todos)}
            on:clearCompleted={handleClearCompletedTodos}
          />
        </section>
      </div>
    {:else}
      <!-- Analytics & Calendar Heatmap View -->
      <section class="analytics-section">
        <AnalyticsView
          todos={roomState.todos || []}
          activityHistory={roomState.activityHistory || {}}
          totalFocusSeconds={roomState.totalFocusSeconds || 0}
          {roomId}
        />
      </section>
    {/if}
  </div>

  <ConfigModal
    isOpen={isConfigModalOpen}
    on:close={() => (isConfigModalOpen = false)}
    on:configUpdated={(e) => { isFirebaseActive = e.detail.isConnected; switchRoom(roomId); }}
  />

  <!-- Fullscreen Immersive View Overlay -->
  {#if isFullscreen}
    <div class="fullscreen-view">
      <div class="fs-ambient-backdrop" class:running={isRunning} class:completed={timeRemainingMs === 0 && !isRunning}></div>

      <!-- Top Fullscreen Navbar -->
      <div class="fs-navbar">
        <div class="fs-logo">
          <Sparkles size={22} class="logo-icon" />
          <span class="fs-brand">ChronoSync</span>
          <span class="fs-room-tag">#{roomId}</span>
        </div>

        <div class="fs-actions">
          <button
            class="fs-btn"
            class:active={showFullscreenTargets}
            on:click={() => showFullscreenTargets = !showFullscreenTargets}
            title="Toggle Daily Targets Drawer"
          >
            <Target size={16} />
            <span>Targets ({(roomState.todos || []).filter(t => t.completed).length}/{(roomState.todos || []).length})</span>
          </button>

          <button class="fs-btn" on:click={() => soundEnabled = !soundEnabled} title="Toggle Sound">
            {#if soundEnabled}
              <Volume2 size={16} />
            {:else}
              <VolumeX size={16} class="muted" />
            {/if}
          </button>

          <button class="fs-btn btn-exit-fs" on:click={toggleFullscreen} title="Exit Full Screen (Esc)">
            <Minimize2 size={16} />
            <span>Exit Fullscreen</span>
          </button>
        </div>
      </div>

      <!-- Main Centered Fullscreen Container -->
      <div class="fs-content" class:with-drawer={showFullscreenTargets}>
        <div class="fs-timer-container">
          {#if roomState.mode === 'countdown'}
            <PresetBar
              activeDurationMinutes={currentDurationMinutes}
              on:select={(e) => handleSelectPreset(e.detail)}
            />
          {/if}

          <TimerDisplay
            {timeRemainingMs}
            totalDurationMs={roomState.durationMs}
            {isRunning}
            {isPaused}
            mode={roomState.mode}
            pomodoroPhase={roomState.pomodoroPhase}
            title="Room #{roomId}"
            isFullScreen={true}
          />

          <TimerControls
            {isRunning}
            {isPaused}
            mode={roomState.mode}
            {currentDurationMinutes}
            on:start={startTimer}
            on:pause={pauseTimer}
            on:resume={resumeTimer}
            on:reset={resetTimer}
            on:adjust={(e) => handleAdjustTime(e.detail)}
            on:changeMode={(e) => handleChangeMode(e.detail)}
            on:setCustomTime={(e) => handleSetCustomTime(e.detail)}
          />
        </div>

        {#if showFullscreenTargets}
          <div class="fs-drawer">
            <TodoList
              todos={roomState.todos || []}
              {roomId}
              on:add={(e) => handleAddTodo(e.detail.todo)}
              on:toggle={(e) => handleToggleTodo(e.detail.id)}
              on:delete={(e) => handleDeleteTodo(e.detail.id)}
              on:bulkAdd={(e) => handleBulkAddTodos(e.detail.todos)}
              on:clearCompleted={handleClearCompletedTodos}
            />
          </div>
        {/if}
      </div>
    </div>
  {/if}
</main>

<style>
  .app-root {
    min-height: 100vh;
    width: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    position: relative;
    overflow-x: hidden;
    background-color: #090d16;
    color: #f8fafc;
    font-family: 'Inter', system-ui, -apple-system, sans-serif;
  }

  .ambient-backdrop {
    position: absolute;
    top: 20%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 600px;
    height: 600px;
    background: radial-gradient(circle, rgba(255, 62, 0, 0.15) 0%, rgba(0, 242, 254, 0.05) 50%, rgba(0, 0, 0, 0) 70%);
    pointer-events: none;
    z-index: 0;
    transition: all 1s ease;
    filter: blur(40px);
  }

  .ambient-backdrop.running {
    background: radial-gradient(circle, rgba(0, 242, 254, 0.2) 0%, rgba(79, 172, 254, 0.08) 50%, rgba(0, 0, 0, 0) 70%);
    transform: translate(-50%, -45%) scale(1.15);
  }

  .ambient-backdrop.completed {
    background: radial-gradient(circle, rgba(56, 239, 125, 0.25) 0%, rgba(17, 153, 142, 0.1) 50%, rgba(0, 0, 0, 0) 70%);
  }

  .app-header {
    width: 100%;
    max-width: 1100px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1.5rem 1.5rem;
    z-index: 10;
    gap: 1rem;
    flex-wrap: wrap;
  }

  .logo {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  :global(.logo-icon) {
    color: #ff3e00;
  }

  h1 {
    font-size: 1.35rem;
    font-weight: 800;
    letter-spacing: -0.03em;
    margin: 0;
    background: linear-gradient(135deg, #ffffff 0%, #cbd5e1 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }

  .version-tag {
    font-size: 0.65rem;
    font-weight: 700;
    background: rgba(255, 62, 0, 0.15);
    color: #ff6b4a;
    border: 1px solid rgba(255, 62, 0, 0.3);
    padding: 0.15rem 0.45rem;
    border-radius: 6px;
    text-transform: uppercase;
  }

  .view-nav {
    display: flex;
    background: rgba(15, 23, 42, 0.6);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 9999px;
    padding: 3px;
    gap: 4px;
  }

  .nav-tab {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 0.4rem 0.85rem;
    border-radius: 9999px;
    border: none;
    background: transparent;
    color: #94a3b8;
    font-size: 0.825rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .nav-tab:hover {
    color: #ffffff;
  }

  .nav-tab.active {
    background: rgba(255, 62, 0, 0.2);
    color: #ff6b4a;
    border: 1px solid rgba(255, 62, 0, 0.35);
  }

  .header-right-actions {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .action-btn {
    background: rgba(255, 255, 255, 0.06);
    border: 1px solid rgba(255, 255, 255, 0.1);
    color: #cbd5e1;
    width: 38px;
    height: 38px;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .action-btn:hover {
    background: rgba(255, 62, 0, 0.2);
    color: #ff6b4a;
    border-color: rgba(255, 62, 0, 0.35);
  }

  .timer-section-header {
    width: 100%;
    display: flex;
    justify-content: flex-end;
    margin-bottom: 0.5rem;
  }

  .btn-fullscreen-launch {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    color: #94a3b8;
    font-size: 0.75rem;
    font-weight: 600;
    padding: 0.3rem 0.65rem;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .btn-fullscreen-launch:hover {
    background: rgba(255, 62, 0, 0.15);
    color: #ff6b4a;
    border-color: rgba(255, 62, 0, 0.3);
  }

  /* FULLSCREEN IMMERSIVE OVERLAY */
  .fullscreen-view {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: #060911;
    z-index: 9999;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .fs-ambient-backdrop {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 900px;
    height: 900px;
    background: radial-gradient(circle, rgba(255, 62, 0, 0.2) 0%, rgba(0, 242, 254, 0.08) 50%, rgba(0, 0, 0, 0) 75%);
    pointer-events: none;
    z-index: 0;
    filter: blur(60px);
    transition: all 1s ease;
  }

  .fs-ambient-backdrop.running {
    background: radial-gradient(circle, rgba(0, 242, 254, 0.28) 0%, rgba(79, 172, 254, 0.12) 50%, rgba(0, 0, 0, 0) 75%);
    transform: translate(-50%, -50%) scale(1.2);
  }

  .fs-navbar {
    position: relative;
    z-index: 10;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1.25rem 2rem;
    background: rgba(15, 23, 42, 0.4);
    backdrop-filter: blur(12px);
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  }

  .fs-logo {
    display: flex;
    align-items: center;
    gap: 0.6rem;
  }

  .fs-brand {
    font-size: 1.25rem;
    font-weight: 800;
    background: linear-gradient(135deg, #ffffff 0%, #cbd5e1 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }

  .fs-room-tag {
    font-size: 0.75rem;
    font-weight: 700;
    color: #ff6b4a;
    background: rgba(255, 62, 0, 0.15);
    border: 1px solid rgba(255, 62, 0, 0.3);
    padding: 0.2rem 0.55rem;
    border-radius: 6px;
  }

  .fs-actions {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .fs-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    background: rgba(255, 255, 255, 0.08);
    border: 1px solid rgba(255, 255, 255, 0.12);
    color: #cbd5e1;
    font-size: 0.85rem;
    font-weight: 600;
    padding: 0.5rem 0.9rem;
    border-radius: 10px;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .fs-btn:hover {
    background: rgba(255, 255, 255, 0.18);
    color: white;
  }

  .fs-btn.active {
    background: rgba(255, 62, 0, 0.2);
    color: #ff6b4a;
    border-color: rgba(255, 62, 0, 0.4);
  }

  .btn-exit-fs {
    background: rgba(255, 62, 0, 0.15);
    color: #ff6b4a;
    border-color: rgba(255, 62, 0, 0.35);
  }

  .btn-exit-fs:hover {
    background: rgba(255, 62, 0, 0.3);
    color: white;
  }

  .fs-content {
    position: relative;
    z-index: 5;
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 2rem;
    gap: 3rem;
    overflow-y: auto;
  }

  .fs-timer-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 1.5rem;
    max-width: 600px;
    width: 100%;
  }

  .fs-drawer {
    width: 400px;
    max-height: 80vh;
    overflow-y: auto;
    animation: fadeInRight 0.3s ease-out;
  }

  @keyframes fadeInRight {
    from {
      opacity: 0;
      transform: translateX(20px);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }
</style>
