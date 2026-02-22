const rangeSelect = document.getElementById('rangeSelect');
const ctx = document.getElementById('reportChart').getContext('2d');
let chart;

function loadLogs(callback) {
  chrome.storage.local.get(['pomodoroLogs'], ({ pomodoroLogs }) => {
    callback(pomodoroLogs || []);
  });
}

function filterLogs(logs, range) {
  const now = new Date();
  return logs.filter(entry => {
    const date = new Date(entry.start);
    switch (range) {
      case 'today':
        return date.toDateString() === now.toDateString();
      case 'week': {
        const weekAgo = new Date();
        weekAgo.setDate(now.getDate() - 6);
        weekAgo.setHours(0, 0, 0, 0);
        return date >= weekAgo;
      }
      case 'month':
        return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
      case 'all':
        return true;
      default:
        return false;
    }
  });
}

function groupByDate(logs) {
  const map = {};
  logs.forEach(log => {
    const key = new Date(log.start).toISOString().split('T')[0];
    map[key] = (map[key] || 0) + (log.duration || 0) / 60000;
  });
  return map;
}

function groupByTask(logs) {
  const map = {};
  logs.forEach(log => {
    const task = log.task || 'Untitled';
    if (!map[task]) map[task] = { sessions: 0, minutes: 0 };
    map[task].sessions++;
    map[task].minutes += (log.duration || 0) / 60000;
  });
  return Object.entries(map)
    .sort((a, b) => b[1].minutes - a[1].minutes);
}

function calculateStreak(logs) {
  if (logs.length === 0) return 0;
  const days = new Set(logs.map(l => new Date(l.start).toDateString()));
  let streak = 0;
  const d = new Date();
  while (days.has(d.toDateString())) {
    streak++;
    d.setDate(d.getDate() - 1);
  }
  return streak;
}

function renderChart(logs) {
  const grouped = groupByDate(logs);
  const labels = Object.keys(grouped).sort();
  const data = labels.map(d => Math.round(grouped[d]));

  if (chart) chart.destroy();

  chart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels.map(d => {
        const date = new Date(d + 'T00:00:00');
        return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      }),
      datasets: [{
        label: 'Minutes Focused',
        data,
        backgroundColor: '#3b82f6',
        borderRadius: 6,
        barPercentage: 0.6
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: {
        y: { beginAtZero: true, ticks: { stepSize: 15 }, grid: { color: '#f3f4f6' } },
        x: { grid: { display: false } }
      }
    }
  });
}

function renderStats(logs, allLogs) {
  const totalMin = logs.reduce((s, l) => s + (l.duration || 0), 0) / 60000;
  document.getElementById('totalSessions').textContent = logs.length;
  document.getElementById('totalMinutes').textContent = Math.round(totalMin);
  document.getElementById('avgSession').textContent = logs.length ? Math.round(totalMin / logs.length) : 0;
  document.getElementById('streak').textContent = calculateStreak(allLogs);
}

function renderTaskBreakdown(logs) {
  const list = document.getElementById('taskList');
  const tasks = groupByTask(logs);

  if (tasks.length === 0) {
    list.innerHTML = '<li class="empty-state">No focus sessions in this period</li>';
    return;
  }

  list.innerHTML = tasks.map(([name, data]) =>
    `<li class="task-item">
      <span class="task-name">${escapeHtml(name)}</span>
      <span class="task-sessions">${data.sessions} session${data.sessions !== 1 ? 's' : ''}</span>
      <span class="task-time">${Math.round(data.minutes)}m</span>
    </li>`
  ).join('');
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function updateReport() {
  const range = rangeSelect.value;
  loadLogs((allLogs) => {
    const filtered = filterLogs(allLogs, range);
    renderChart(filtered);
    renderStats(filtered, allLogs);
    renderTaskBreakdown(filtered);
  });
}

rangeSelect.addEventListener('change', updateReport);

document.getElementById('exportBtn').addEventListener('click', () => {
  loadLogs((logs) => {
    if (logs.length === 0) return alert('No data to export');
    const csv = 'Start,Duration (min),Task\n' + logs.map(l =>
      `"${l.start}",${Math.round((l.duration || 0) / 60000)},"${(l.task || '').replace(/"/g, '""')}"`
    ).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `focus-report-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  });
});

document.getElementById('clearBtn').addEventListener('click', () => {
  if (!confirm('Delete all focus session history? This cannot be undone.')) return;
  chrome.storage.local.remove('pomodoroLogs', updateReport);
});

updateReport();
