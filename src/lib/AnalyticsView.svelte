<script>
  import { TrendingUp, Award, Flame, Calendar, Tag, Clock, CheckCircle2, Download } from 'lucide-svelte';

  export let todos = [];
  export let activityHistory = {}; // { 'YYYY-MM-DD': { focusMinutes: 120, completedCount: 5 } }
  export let totalFocusSeconds = 0;
  export let roomId = 'shared-timer';

  const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

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
      const hours = (mins / 60).toFixed(1);
      const hoursNum = parseFloat(hours);

      let level = 0;
      if (mins > 0 && mins < 30) level = 1;        // < 0.5 hrs
      else if (mins >= 30 && mins < 90) level = 2;  // 0.5 - 1.5 hrs
      else if (mins >= 90 && mins < 180) level = 3; // 1.5 - 3.0 hrs
      else if (mins >= 180) level = 4;             // 3.0+ hrs

      const dayOfWeekIndex = (d.getDay() + 6) % 7;

      days.push({
        date: dateStr,
        displayDate: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        completedCount: entry.completedCount || 0,
        focusMinutes: mins,
        hoursDisplay: hoursNum > 0 ? (hoursNum % 1 === 0 ? hoursNum + 'h' : hours + 'h') : '',
        hoursNum,
        dayOfWeekIndex,
        level
      });
    }

    return days;
  }

  $: heatmapDays = generateHeatmapData(activityHistory || {});

  // Stats calculation
  $: totalCompleted = todos.filter(t => t.completed).length;

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

  $: totalFocusHours = (totalFocusSeconds / 3600).toFixed(1);

  // CSV Export
  function downloadCSV() {
    const headers = ['Date', 'Hours Studied', 'Focus Minutes', 'Targets Completed', 'Room ID'];
    const rows = [];

    const sortedDates = Object.keys(activityHistory || {}).sort().reverse();

    if (sortedDates.length === 0) {
      const today = new Date().toISOString().split('T')[0];
      rows.push([today, '0.0', '0', '0', roomId]);
    } else {
      sortedDates.forEach(dateStr => {
        const entry = activityHistory[dateStr];
        const mins = entry.focusMinutes || 0;
        const hrs = (mins / 60).toFixed(2);
        const done = entry.completedCount || 0;
        rows.push([dateStr, hrs, mins, done, roomId]);
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
    <h2>Study Analytics & Activity</h2>

    <button class="export-btn" on:click={downloadCSV} title="Export CSV Report">
      <Download size={16} />
      <span>Download CSV Report</span>
    </button>
  </div>

  <!-- Top Stat Cards -->
  <div class="stats-grid">
    <div class="stat-card">
      <div class="stat-icon icon-orange">
        <Clock size={22} />
      </div>
      <div class="stat-info">
        <span class="stat-label">Total Hours Studied</span>
        <span class="stat-value">{totalFocusHours} <small>hrs</small></span>
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
      <div class="stat-icon icon-flame">
        <Flame size={22} />
      </div>
      <div class="stat-info">
        <span class="stat-label">Active Streak</span>
        <span class="stat-value">{currentStreak} <small>days</small></span>
      </div>
    </div>
  </div>

  <!-- Large Calendar Heatmap Card with Weekdays and Hours Text -->
  <div class="card heatmap-card">
    <div class="card-header">
      <div class="header-left">
        <Calendar size={20} class="header-icon" />
        <h3>Study Hours Calendar Heatmap</h3>
      </div>
      <span class="sub-header">Last 12 Weeks (Active Study Hours)</span>
    </div>

    <div class="large-heatmap-wrapper">
      <!-- Weekday Row Labels Column -->
      <div class="weekday-labels">
        {#each dayLabels as day}
          <div class="day-label">{day}</div>
        {/each}
      </div>

      <!-- Large Heatmap Matrix -->
      <div class="large-heatmap-grid">
        {#each heatmapDays as day}
          <div
            class="large-heatmap-cell level-{day.level}"
            title="{day.displayDate}: {day.hoursNum > 0 ? day.hoursDisplay : '0h'} studied ({day.focusMinutes} mins), {day.completedCount} targets completed"
          >
            <span class="cell-date">{day.displayDate}</span>
            {#if day.hoursNum > 0}
              <span class="cell-hours active-hours">
                {day.hoursDisplay}
              </span>
            {/if}
          </div>
        {/each}
      </div>
    </div>

    <!-- Heatmap Legend -->
    <div class="heatmap-legend">
      <span>0 hrs</span>
      <div class="legend-cells">
        <div class="legend-cell level-0" title="0 hrs"></div>
        <div class="legend-cell level-1" title="< 0.5 hrs">&lt;0.5h</div>
        <div class="legend-cell level-2" title="0.5 - 1.5 hrs">1.5h</div>
        <div class="legend-cell level-3" title="1.5 - 3.0 hrs">3h</div>
        <div class="legend-cell level-4" title="3.0+ hrs">3h+</div>
      </div>
      <span>3+ hrs</span>
    </div>
  </div>

  <!-- Tag Category Analytics Card -->
  <div class="card tag-analytics-card">
    <div class="card-header">
      <Tag size={18} class="header-icon" />
      <h3>Subject / Tag Category Breakdown</h3>
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
    max-width: 960px;
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
    font-size: 1.35rem;
    font-weight: 800;
    color: white;
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

  .stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: 1rem;
  }

  .stat-card {
    background: rgba(15, 23, 42, 0.5);
    backdrop-filter: blur(12px);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 14px;
    padding: 1.25rem;
    display: flex;
    align-items: center;
    gap: 1rem;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
  }

  .stat-icon {
    width: 48px;
    height: 48px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .icon-orange {
    background: rgba(255, 62, 0, 0.15);
    color: #ff5722;
  }

  .icon-green {
    background: rgba(16, 185, 129, 0.15);
    color: #10b981;
  }

  .icon-flame {
    background: rgba(245, 158, 11, 0.15);
    color: #f59e0b;
  }

  .stat-info {
    display: flex;
    flex-direction: column;
  }

  .stat-label {
    font-size: 0.8rem;
    color: #94a3b8;
    font-weight: 500;
  }

  .stat-value {
    font-size: 1.6rem;
    font-weight: 800;
    color: #ffffff;
  }

  .stat-value small {
    font-size: 0.85rem;
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
    padding-bottom: 1rem;
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
  }

  .large-heatmap-cell:hover {
    transform: scale(1.12);
    z-index: 10;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.5);
  }

  .cell-date {
    font-size: 0.6rem;
    color: rgba(255, 255, 255, 0.5);
    line-height: 1;
    margin-bottom: 2px;
  }

  .cell-hours {
    font-size: 0.85rem;
    font-weight: 800;
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
    width: 32px;
    height: 24px;
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.65rem;
    font-weight: 700;
    color: white;
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
