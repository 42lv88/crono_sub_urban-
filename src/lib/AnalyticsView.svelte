<script>
  import { TrendingUp, Award, Flame, Calendar, Tag, Clock, CheckCircle2, Download, ChevronLeft, ChevronRight, Zap, Target } from 'lucide-svelte';

  export let todos = [];
  export let activityHistory = {}; // { 'YYYY-MM-DD': { focusMinutes: 120, completedCount: 5 } }
  export let totalFocusSeconds = 0;
  export let roomId = 'shared-timer';

  const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  let selectedDateStr = new Date().toISOString().split('T')[0];

  function formatExactTime(mins) {
    if (!mins || mins <= 0) return '';
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (h === 0) return `${m}m`;
    if (m === 0) return `${h}h`;
    return `${h}h ${m}m`;
  }

  function formatExactTimeVerbose(mins) {
    if (!mins || mins <= 0) return '0 minutes';
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (h === 0) return `${m} minute${m === 1 ? '' : 's'}`;
    if (m === 0) return `${h} hour${h === 1 ? '' : 's'}`;
    return `${h} hour${h === 1 ? '' : 's'}, ${m} minute${m === 1 ? '' : 's'}`;
  }

  // Generate calendar heatmap grid (7 rows for Mon-Sun, columns for past 12 weeks)
  function generateHeatmapData(history) {
    const today = new Date();
    const currentDayOfWeek = (today.getDay() + 6) % 7; // 0 = Mon, 6 = Sun
    
    const totalDays = 84; // 12 weeks
    const days = [];

    for (let i = totalDays - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - (i - (6 - currentDayOfWeek)));
      
      const dateStr = d.toISOString().split('T')[0];
      const entry = history[dateStr] || { focusMinutes: 0, completedCount: 0 };
      const mins = entry.focusMinutes || 0;

      let level = 0;
      if (mins > 0 && mins < 30) level = 1;        // < 30 mins
      else if (mins >= 30 && mins < 90) level = 2;  // 30m - 1.5h
      else if (mins >= 90 && mins < 180) level = 3; // 1.5h - 3.0h
      else if (mins >= 180) level = 4;             // 3.0+ hrs

      const dayOfWeekIndex = (d.getDay() + 6) % 7;

      days.push({
        date: dateStr,
        displayDate: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        fullDate: d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' }),
        completedCount: entry.completedCount || 0,
        focusMinutes: mins,
        exactTime: formatExactTime(mins),
        exactTimeVerbose: formatExactTimeVerbose(mins),
        dayOfWeekIndex,
        level,
        isToday: dateStr === today.toISOString().split('T')[0]
      });
    }

    return days;
  }

  $: heatmapDays = generateHeatmapData(activityHistory || {});

  // Selected Day state and computations
  $: selectedDay = heatmapDays.find(d => d.date === selectedDateStr) || heatmapDays[heatmapDays.length - 1];
  $: selectedDayIndex = heatmapDays.findIndex(d => d.date === selectedDateStr);

  function selectPreviousDay() {
    if (selectedDayIndex > 0) {
      selectedDateStr = heatmapDays[selectedDayIndex - 1].date;
    }
  }

  function selectNextDay() {
    if (selectedDayIndex < heatmapDays.length - 1) {
      selectedDateStr = heatmapDays[selectedDayIndex + 1].date;
    }
  }

  function selectToday() {
    selectedDateStr = new Date().toISOString().split('T')[0];
  }

  // General Key Metrics
  $: totalCompleted = todos.filter(t => t.completed).length;

  $: todayDateStr = new Date().toISOString().split('T')[0];
  $: todayEntry = (activityHistory || {})[todayDateStr] || { focusMinutes: 0, completedCount: 0 };
  $: todayMins = todayEntry.focusMinutes || 0;
  $: todayExactTime = formatExactTimeVerbose(todayMins);

  $: totalMinutesCalculated = Object.values(activityHistory || {}).reduce((acc, curr) => acc + (curr.focusMinutes || 0), 0);
  $: totalMinsAll = Math.max(Math.floor((totalFocusSeconds || 0) / 60), totalMinutesCalculated);
  $: totalTimeFormatted = formatExactTimeVerbose(totalMinsAll);

  $: bestDay = calculateBestDay(activityHistory || {});

  function calculateBestDay(history) {
    let maxMins = 0;
    let bestDate = null;

    Object.entries(history).forEach(([dateStr, data]) => {
      const mins = data.focusMinutes || 0;
      if (mins > maxMins) {
        maxMins = mins;
        bestDate = dateStr;
      }
    });

    if (!bestDate || maxMins === 0) return { mins: 0, label: 'None yet', exactTime: '0 minutes' };
    const d = new Date(bestDate + 'T00:00:00');
    return {
      mins: maxMins,
      label: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      exactTime: formatExactTimeVerbose(maxMins)
    };
  }

  // Tag Breakdown Calculation
  $: tagStats = calculateTagStats(todos);

  function calculateTagStats(todoList) {
    const counts = {};
    todoList.forEach(t => {
      const tags = t.tags && t.tags.length > 0 ? t.tags : ['General'];
      tags.forEach(tag => {
        if (!counts[tag]) counts[tag] = { total: 0, completed: 0 };
        counts[tag].total += 1;
        if (t.completed) counts[tag].completed += 1;
      });
    });

    return Object.entries(counts).map(([name, data]) => ({
      name,
      total: data.total,
      completed: data.completed,
      pct: data.total > 0 ? Math.round((data.completed / data.total) * 100) : 0
    })).sort((a, b) => b.total - a.total);
  }

  // Calculate Streak
  $: currentStreak = calculateStreak(activityHistory || {});

  function calculateStreak(history) {
    let streak = 0;
    const today = new Date();
    for (let i = 0; i < 365; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const entry = history[dateStr];
      if (entry && (entry.completedCount > 0 || entry.focusMinutes > 0)) {
        streak++;
      } else if (i > 0) {
        break;
      }
    }
    return streak;
  }

  // CSV Export
  function downloadCSV() {
    const headers = ['Date', 'Exact Study Time', 'Focus Minutes', 'Targets Completed', 'Room ID'];
    const rows = [];

    const sortedDates = Object.keys(activityHistory || {}).sort().reverse();

    if (sortedDates.length === 0) {
      const today = new Date().toISOString().split('T')[0];
      rows.push([today, '0 minutes', '0', '0', roomId]);
    } else {
      sortedDates.forEach(dateStr => {
        const entry = activityHistory[dateStr];
        const mins = entry.focusMinutes || 0;
        const exact = formatExactTimeVerbose(mins);
        const done = entry.completedCount || 0;
        rows.push([dateStr, `"${exact}"`, mins, done, roomId]);
      });
    }

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `chronosync_study_analytics_${roomId}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
</script>

<div class="analytics-container">
  <!-- Header Bar with Export Button -->
  <div class="analytics-header">
    <div>
      <h2>Study Analytics & Daily Heatmap</h2>
      <p class="header-subtitle">Track your exact daily study hours, streaks, and target completions.</p>
    </div>

    <button class="export-btn" on:click={downloadCSV} title="Export Detailed CSV Report">
      <Download size={16} />
      <span>Export CSV Report</span>
    </button>
  </div>

  <!-- Top Stat Cards Grid -->
  <div class="stats-grid">
    <div class="stat-card">
      <div class="stat-icon icon-orange">
        <Clock size={22} />
      </div>
      <div class="stat-info">
        <span class="stat-label">Total Time Studied</span>
        <span class="stat-value">{totalTimeFormatted}</span>
      </div>
    </div>

    <div class="stat-card highlight-today">
      <div class="stat-icon icon-cyan">
        <Zap size={22} />
      </div>
      <div class="stat-info">
        <span class="stat-label">Studied Today</span>
        <span class="stat-value">{todayExactTime}</span>
      </div>
    </div>

    <div class="stat-card">
      <div class="stat-icon icon-flame">
        <Flame size={22} />
      </div>
      <div class="stat-info">
        <span class="stat-label">Active Streak</span>
        <span class="stat-value">{currentStreak} <small>days</small></span>
      </div>
    </div>

    <div class="stat-card">
      <div class="stat-icon icon-green">
        <CheckCircle2 size={22} />
      </div>
      <div class="stat-info">
        <span class="stat-label">Targets Completed</span>
        <span class="stat-value">{totalCompleted}</span>
      </div>
    </div>

    <div class="stat-card">
      <div class="stat-icon icon-purple">
        <Award size={22} />
      </div>
      <div class="stat-info">
        <span class="stat-label">Best Day Record</span>
        <span class="stat-value">{bestDay.exactTime} <small>({bestDay.label})</small></span>
      </div>
    </div>
  </div>

  <!-- Large Calendar Heatmap Card with Weekdays and Exact Hours Labels -->
  <div class="card heatmap-card">
    <div class="card-header">
      <div class="header-left">
        <Calendar size={20} class="header-icon" />
        <h3>12-Week Daily Study Heatmap</h3>
      </div>
      <span class="sub-header">Click any day cell to view exact breakdown below</span>
    </div>

    <div class="large-heatmap-wrapper">
      <!-- Weekday Row Labels Column -->
      <div class="weekday-labels">
        {#each dayLabels as day}
          <div class="day-label">{day}</div>
        {/each}
      </div>

      <!-- Heatmap Grid -->
      <div class="large-heatmap-grid">
        {#each heatmapDays as day}
          <button
            type="button"
            class="large-heatmap-cell level-{day.level}"
            class:is-selected={day.date === selectedDateStr}
            class:is-today-cell={day.isToday}
            on:click={() => selectedDateStr = day.date}
            title="{day.displayDate}: {day.exactTimeVerbose} studied ({day.focusMinutes} mins), {day.completedCount} targets completed"
          >
            <span class="cell-date">{day.displayDate}</span>
            <span class="cell-hours" class:active-hours={day.focusMinutes > 0}>
              {day.focusMinutes > 0 ? day.exactTime : '-'}
            </span>
          </button>
        {/each}
      </div>
    </div>

    <!-- Heatmap Legend -->
    <div class="heatmap-legend">
      <span>0m</span>
      <div class="legend-cells">
        <div class="legend-cell level-0" title="0 mins">0m</div>
        <div class="legend-cell level-1" title="< 30 mins">&lt;30m</div>
        <div class="legend-cell level-2" title="30m - 1.5h">1.5h</div>
        <div class="legend-cell level-3" title="1.5h - 3h">3h</div>
        <div class="legend-cell level-4" title="3h+">3h+</div>
      </div>
      <span>3h+</span>
    </div>
  </div>

  <!-- Selected Day Breakdown Inspector Card -->
  {#if selectedDay}
    <div class="card day-inspector-card">
      <div class="inspector-header">
        <div class="header-left">
          <Calendar size={20} class="header-icon" />
          <div class="inspector-title">
            <h3>{selectedDay.fullDate}</h3>
            {#if selectedDay.isToday}
              <span class="today-badge">Today</span>
            {/if}
          </div>
        </div>

        <div class="day-nav-actions">
          <button 
            class="nav-arrow-btn" 
            on:click={selectPreviousDay} 
            disabled={selectedDayIndex <= 0}
            title="Previous Day"
          >
            <ChevronLeft size={16} />
          </button>

          <button class="btn-today" on:click={selectToday} class:active={selectedDay.isToday}>
            Today
          </button>

          <button 
            class="nav-arrow-btn" 
            on:click={selectNextDay} 
            disabled={selectedDayIndex >= heatmapDays.length - 1}
            title="Next Day"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      <div class="day-stats-grid">
        <div class="day-stat-box focus-time-box">
          <div class="stat-box-icon orange">
            <Clock size={20} />
          </div>
          <div class="stat-box-content">
            <span class="box-label">Exact Study Time</span>
            <span class="box-value">{selectedDay.exactTimeVerbose}</span>
            <span class="box-sub">({selectedDay.focusMinutes} total minutes recorded)</span>
          </div>
        </div>

        <div class="day-stat-box target-count-box">
          <div class="stat-box-icon green">
            <CheckCircle2 size={20} />
          </div>
          <div class="stat-box-content">
            <span class="box-label">Targets Completed</span>
            <span class="box-value">{selectedDay.completedCount} {selectedDay.completedCount === 1 ? 'target' : 'targets'}</span>
            <span class="box-sub">Finished on this date</span>
          </div>
        </div>

        <div class="day-stat-box intensity-box">
          <div class="stat-box-icon yellow">
            <Zap size={20} />
          </div>
          <div class="stat-box-content">
            <span class="box-label">Focus Intensity</span>
            <span class="box-value">
              {#if selectedDay.level === 4}
                🔥 High Focus (3h+)
              {:else if selectedDay.level === 3}
                ⚡ Great Focus (1.5h-3h)
              {:else if selectedDay.level === 2}
                🌱 Steady Focus (30m-1.5h)
              {:else if selectedDay.level === 1}
                ✨ Light Focus (&lt;30m)
              {:else}
                💤 Rest / No Focus
              {/if}
            </span>
            <span class="box-sub">Heatmap Level {selectedDay.level} / 4</span>
          </div>
        </div>
      </div>

      <!-- Daily Goal Progress Bar -->
      <div class="daily-goal-bar">
        <div class="goal-header">
          <span>Daily 2-Hour Goal Progress</span>
          <span class="goal-pct">{Math.min(100, Math.round((selectedDay.focusMinutes / 120) * 100))}% ({selectedDay.exactTimeVerbose} / 2 hrs)</span>
        </div>
        <div class="goal-track">
          <div 
            class="goal-fill" 
            style="width: {Math.min(100, Math.round((selectedDay.focusMinutes / 120) * 100))}%"
          ></div>
        </div>
      </div>
    </div>
  {/if}

  <!-- Tag Category Analytics Card -->
  <div class="card tag-analytics-card">
    <div class="card-header">
      <Tag size={18} class="header-icon" />
      <h3>Subject & Tag Category Breakdown</h3>
    </div>

    {#if tagStats.length === 0}
      <p class="empty-text">No tagged targets available yet. Add tags using <code>#subject</code> when creating targets!</p>
    {:else}
      <div class="tag-bars">
        {#each tagStats as t}
          <div class="tag-stat-row">
            <div class="tag-row-header">
              <span class="tag-badge">#{t.name}</span>
              <span class="tag-count">{t.completed}/{t.total} ({t.pct}%)</span>
            </div>
            <div class="tag-bar-track">
              <div class="tag-bar-fill" style="width: {t.pct}%"></div>
            </div>
          </div>
        {/each}
      </div>
    {/if}
  </div>
</div>

<style>
  .analytics-container {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
    width: 100%;
    max-width: 980px;
    margin: 0 auto;
  }

  .analytics-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    flex-wrap: wrap;
  }

  .analytics-header h2 {
    margin: 0;
    font-size: 1.4rem;
    font-weight: 800;
    color: white;
  }

  .header-subtitle {
    margin: 0.25rem 0 0 0;
    font-size: 0.8rem;
    color: #94a3b8;
  }

  .export-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    background: linear-gradient(135deg, #10b981 0%, #059669 100%);
    color: white;
    font-size: 0.85rem;
    font-weight: 700;
    padding: 0.55rem 1.15rem;
    border-radius: 10px;
    border: none;
    cursor: pointer;
    box-shadow: 0 4px 14px rgba(16, 185, 129, 0.35);
    transition: all 0.2s ease;
  }

  .export-btn:hover {
    transform: translateY(-1px);
    box-shadow: 0 6px 18px rgba(16, 185, 129, 0.45);
  }

  /* Stats Grid */
  .stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 1rem;
  }

  .stat-card {
    background: rgba(15, 23, 42, 0.5);
    backdrop-filter: blur(12px);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 14px;
    padding: 1.1rem;
    display: flex;
    align-items: center;
    gap: 0.85rem;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
    transition: all 0.2s ease;
  }

  .stat-card.highlight-today {
    background: rgba(0, 242, 254, 0.06);
    border-color: rgba(0, 242, 254, 0.25);
  }

  .stat-card:hover {
    transform: translateY(-2px);
    border-color: rgba(255, 255, 255, 0.18);
  }

  .stat-icon {
    width: 44px;
    height: 44px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .icon-orange {
    background: rgba(255, 62, 0, 0.15);
    color: #ff5722;
  }

  .icon-cyan {
    background: rgba(0, 242, 254, 0.15);
    color: #00f2fe;
  }

  .icon-green {
    background: rgba(16, 185, 129, 0.15);
    color: #10b981;
  }

  .icon-flame {
    background: rgba(245, 158, 11, 0.15);
    color: #f59e0b;
  }

  .icon-purple {
    background: rgba(168, 85, 247, 0.15);
    color: #c084fc;
  }

  .stat-info {
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .stat-label {
    font-size: 0.75rem;
    color: #94a3b8;
    font-weight: 500;
    white-space: nowrap;
  }

  .stat-value {
    font-size: 1.15rem;
    font-weight: 800;
    color: #ffffff;
    line-height: 1.25;
    word-break: break-word;
  }

  .stat-value small {
    font-size: 0.75rem;
    font-weight: 500;
    color: #94a3b8;
  }

  .card {
    background: rgba(15, 23, 42, 0.5);
    backdrop-filter: blur(12px);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 16px;
    padding: 1.5rem;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.25);
  }

  .card-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 1.25rem;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .header-left {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  :global(.header-icon) {
    color: #ff3e00;
  }

  .card-header h3 {
    margin: 0;
    font-size: 1.15rem;
    color: #ffffff;
    font-weight: 700;
  }

  .sub-header {
    font-size: 0.75rem;
    color: #64748b;
  }

  /* Large Calendar Heatmap Styling */
  .large-heatmap-wrapper {
    display: flex;
    gap: 0.75rem;
    align-items: flex-start;
    overflow-x: auto;
    padding-bottom: 0.75rem;
  }

  .weekday-labels {
    display: grid;
    grid-template-rows: repeat(7, 54px);
    gap: 6px;
    padding-top: 2px;
  }

  .day-label {
    height: 54px;
    display: flex;
    align-items: center;
    font-size: 0.75rem;
    font-weight: 700;
    color: #94a3b8;
    padding-right: 0.35rem;
  }

  .large-heatmap-grid {
    display: grid;
    grid-template-rows: repeat(7, 54px);
    grid-auto-flow: column;
    grid-auto-columns: 54px;
    gap: 6px;
  }

  .large-heatmap-cell {
    width: 54px;
    height: 54px;
    border-radius: 8px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 2px;
    cursor: pointer;
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    border: 1px solid rgba(255, 255, 255, 0.05);
    position: relative;
    user-select: none;
    font-family: inherit;
    margin: 0;
    outline: none;
  }

  .large-heatmap-cell:hover {
    transform: scale(1.12);
    z-index: 10;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.5);
    border-color: rgba(255, 255, 255, 0.4);
  }

  .large-heatmap-cell.is-selected {
    border: 2px solid #ff3e00 !important;
    box-shadow: 0 0 14px rgba(255, 62, 0, 0.65) !important;
    transform: scale(1.08);
    z-index: 12;
  }

  .large-heatmap-cell.is-today-cell::after {
    content: '';
    position: absolute;
    top: 3px;
    right: 3px;
    width: 6px;
    height: 6px;
    background: #00f2fe;
    border-radius: 50%;
    box-shadow: 0 0 6px #00f2fe;
  }

  .cell-date {
    font-size: 0.58rem;
    color: rgba(255, 255, 255, 0.55);
    line-height: 1;
    margin-bottom: 2px;
  }

  .cell-hours {
    font-size: 0.78rem;
    font-weight: 800;
    color: rgba(255, 255, 255, 0.3);
  }

  .cell-hours.active-hours {
    color: #ffffff;
    text-shadow: 0 1px 4px rgba(0, 0, 0, 0.6);
  }

  /* Heatmap Intensity Level Colors */
  .level-0 {
    background: rgba(255, 255, 255, 0.04);
  }

  .level-1 {
    background: #064e3b;
    border-color: #047857;
  }

  .level-2 {
    background: #047857;
    border-color: #10b981;
  }

  .level-3 {
    background: #059669;
    border-color: #34d399;
    box-shadow: 0 0 10px rgba(5, 150, 105, 0.3);
  }

  .level-4 {
    background: #10b981;
    border-color: #6ee7b7;
    box-shadow: 0 0 14px rgba(16, 185, 129, 0.5);
  }

  .heatmap-legend {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 0.5rem;
    font-size: 0.75rem;
    color: #64748b;
    margin-top: 0.75rem;
  }

  .legend-cells {
    display: flex;
    gap: 6px;
  }

  .legend-cell {
    width: 34px;
    height: 24px;
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.65rem;
    font-weight: 700;
    color: white;
  }

  /* Day Inspector Card Styling */
  .day-inspector-card {
    background: linear-gradient(145deg, rgba(30, 41, 59, 0.7) 0%, rgba(15, 23, 42, 0.7) 100%);
    border: 1px solid rgba(255, 62, 0, 0.3);
    box-shadow: 0 10px 30px rgba(255, 62, 0, 0.12);
  }

  .inspector-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    margin-bottom: 1.25rem;
    flex-wrap: wrap;
  }

  .inspector-title {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .inspector-title h3 {
    margin: 0;
    font-size: 1.2rem;
    color: white;
    font-weight: 800;
  }

  .today-badge {
    background: rgba(0, 242, 254, 0.2);
    color: #00f2fe;
    border: 1px solid rgba(0, 242, 254, 0.4);
    font-size: 0.7rem;
    font-weight: 700;
    padding: 0.15rem 0.5rem;
    border-radius: 6px;
    text-transform: uppercase;
  }

  .day-nav-actions {
    display: flex;
    align-items: center;
    gap: 0.35rem;
  }

  .nav-arrow-btn {
    background: rgba(255, 255, 255, 0.08);
    border: 1px solid rgba(255, 255, 255, 0.12);
    color: white;
    width: 32px;
    height: 32px;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .nav-arrow-btn:hover:not(:disabled) {
    background: rgba(255, 62, 0, 0.25);
    border-color: rgba(255, 62, 0, 0.4);
  }

  .nav-arrow-btn:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }

  .btn-today {
    background: rgba(255, 255, 255, 0.08);
    border: 1px solid rgba(255, 255, 255, 0.12);
    color: #cbd5e1;
    font-size: 0.75rem;
    font-weight: 700;
    padding: 0.35rem 0.75rem;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .btn-today:hover, .btn-today.active {
    background: rgba(255, 62, 0, 0.2);
    color: #ff6b4a;
    border-color: rgba(255, 62, 0, 0.35);
  }

  .day-stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: 1rem;
    margin-bottom: 1.25rem;
  }

  .day-stat-box {
    background: rgba(15, 23, 42, 0.6);
    border: 1px solid rgba(255, 255, 255, 0.06);
    border-radius: 12px;
    padding: 1rem;
    display: flex;
    align-items: center;
    gap: 0.85rem;
  }

  .stat-box-icon {
    width: 40px;
    height: 40px;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .stat-box-icon.orange {
    background: rgba(255, 62, 0, 0.15);
    color: #ff5722;
  }

  .stat-box-icon.green {
    background: rgba(16, 185, 129, 0.15);
    color: #10b981;
  }

  .stat-box-icon.yellow {
    background: rgba(245, 158, 11, 0.15);
    color: #f59e0b;
  }

  .stat-box-content {
    display: flex;
    flex-direction: column;
  }

  .box-label {
    font-size: 0.75rem;
    color: #94a3b8;
    font-weight: 500;
  }

  .box-value {
    font-size: 1.05rem;
    font-weight: 800;
    color: white;
  }

  .box-sub {
    font-size: 0.7rem;
    color: #64748b;
  }

  /* Daily Goal Bar */
  .daily-goal-bar {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
    background: rgba(15, 23, 42, 0.4);
    border-radius: 10px;
    padding: 0.75rem 1rem;
  }

  .goal-header {
    display: flex;
    justify-content: space-between;
    font-size: 0.78rem;
    color: #cbd5e1;
    font-weight: 600;
  }

  .goal-pct {
    color: #10b981;
    font-weight: 700;
  }

  .goal-track {
    width: 100%;
    height: 8px;
    background: rgba(255, 255, 255, 0.08);
    border-radius: 9999px;
    overflow: hidden;
  }

  .goal-fill {
    height: 100%;
    background: linear-gradient(90deg, #ff3e00 0%, #10b981 100%);
    border-radius: 9999px;
    transition: width 0.4s ease;
  }

  /* Tag Breakdown */
  .tag-bars {
    display: flex;
    flex-direction: column;
    gap: 0.85rem;
  }

  .tag-stat-row {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
  }

  .tag-row-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .tag-badge {
    background: rgba(255, 62, 0, 0.12);
    color: #ff6b4a;
    font-size: 0.8rem;
    font-weight: 700;
    padding: 0.2rem 0.6rem;
    border-radius: 6px;
    border: 1px solid rgba(255, 62, 0, 0.25);
  }

  .tag-count {
    font-size: 0.8rem;
    color: #94a3b8;
    font-weight: 600;
  }

  .tag-bar-track {
    width: 100%;
    height: 8px;
    background: rgba(255, 255, 255, 0.06);
    border-radius: 9999px;
    overflow: hidden;
  }

  .tag-bar-fill {
    height: 100%;
    background: linear-gradient(90deg, #ff3e00 0%, #10b981 100%);
    border-radius: 9999px;
    transition: width 0.4s ease;
  }

  .empty-text {
    color: #64748b;
    font-size: 0.875rem;
    margin: 0;
  }

  .empty-text code {
    background: rgba(255, 255, 255, 0.1);
    color: #ff6b4a;
    padding: 0.1rem 0.3rem;
    border-radius: 4px;
  }
</style>
