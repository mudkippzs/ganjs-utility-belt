const GUB = {
  Z_INDEX: {
    OVERLAY: 999999,
    MODAL: 999999,
    STICKY_NOTE: 10000,
    STICKY_NOTE_PINNED: 10001,
    NOTIFICATION: 1000000,
    FLOATING_TIMER: 99998
  },

  STORAGE: {
    POMODORO_STATE: 'pomodoroState',
    POMODORO_LOGS: 'pomodoroLogs',
    POMODORO_SETTINGS: 'pomodoroSettings',
    POMODORO_PAUSED: 'pomodoroPaused',
    POMODORO_REMAINING: 'pomodoroRemaining',
    STICKY_NOTES: 'stickyNotes',
    STICKY_SETTINGS: 'stickySettings',
    TAB_SETS: 'tabSets',
    REDIRECT_RULES: 'redirectRules',
    SHOW_FLOATING_TIMER: 'showFloatingTimer',
    AUTO_START_FOCUS: 'autoStartNextFocus',
    AUTO_GROUP_TABS: 'autoGroupTabs',
    COLLAPSED_SECTIONS: 'collapsedSections'
  },

  POMODORO: {
    FOCUS_DURATION: 25 * 60 * 1000,
    SHORT_BREAK: 5 * 60 * 1000,
    LONG_BREAK: 15 * 60 * 1000,
    SESSIONS_BEFORE_LONG_BREAK: 4,
    ALARM_NAME: 'pomodoroTimer'
  },

  NOTE_COLORS: ['#fffae6', '#e6faff', '#e6ffe6', '#fff0f5', '#f0f0f0', '#fdd'],
  NOTE_FONTS: ['Arial', 'Courier New', 'Georgia', 'Times New Roman'],

  TAB_GROUP_COLORS: ['grey', 'blue', 'red', 'green', 'yellow', 'pink', 'purple', 'cyan']
};

function escapeHtml(text) {
  const d = document.createElement('div');
  d.textContent = text;
  return d.innerHTML;
}

function downloadText(text, filename, type) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

function debounce(fn, ms) {
  let t;
  return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
}

if (typeof window !== 'undefined') {
  window.GUB = GUB;
}
