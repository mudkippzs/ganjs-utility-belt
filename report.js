const rangeSelect = document.getElementById('rangeSelect');
const summary = document.getElementById('summary');
const ctx = document.getElementById('reportChart').getContext('2d');
let chart;

function loadLogs(callback) {
  chrome.storage.local.get(['pomodoroLogs'], ({ pomodoroLogs }) => {
    callback(pomodoroLogs || []);
  });
}

function filterLogs(logs, range) {
  const now = new Date();
  const filtered = logs.filter(entry => {
    const date = new Date(entry.start);
    if (range === 'today') {
      return date.toDateString() === now.toDateString();
    }
    if (range === 'week') {
      const weekAgo = new Date();
      weekAgo.setDate(now.getDate() - 6);
      return date >= weekAgo && date <= now;
    }
    if (range === 'month') {
      return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
    }
    return false;
  });
  return filtered;
}

function groupByDate(logs) {
  const map = {};
  logs.forEach(log => {
    const key = new Date(log.start).toISOString().split('T')[0]; // yyyy-mm-dd
    if (!map[key]) map[key] = 0;
    map[key] += log.duration / 60000; // convert to minutes
  });
  return map;
}

function renderChart(logs, range) {
  const grouped = groupByDate(logs);
  const labels = Object.keys(grouped).sort();
  const data = labels.map(date => grouped[date]);

  if (chart) chart.destroy();

  chart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Minutes Focused',
        data,
        backgroundColor: '#4CAF50'
      }]
    },
    options: {
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            stepSize: 15
          }
        }
      }
    }
  });

  const total = logs.reduce((acc, log) => acc + (log.duration || 0), 0);
  summary.textContent = `${logs.length} session(s) · ${Math.round(total / 60000)} total minutes`;
}

function updateReport() {
  const range = rangeSelect.value;
  loadLogs((logs) => {
    const filtered = filterLogs(logs, range);
    renderChart(filtered, range);
  });
}

rangeSelect.addEventListener('change', updateReport);
updateReport();
