const Pomodoro = (() => {
  const FOCUS_DURATION = 2 * 60 * 1000; // 2 minutes for testing
  const BREAK_DURATION = 2 * 60 * 1000; // 2 minutes for testing
  const STORAGE_KEY = 'pomodoroState';
  const LOG_KEY = 'pomodoroLogs';

  async function getState() {
    return new Promise((resolve) => {
      chrome.storage.local.get([STORAGE_KEY], (res) => {
        resolve(res[STORAGE_KEY] || null);
      });
    });
  }

  function saveState(state) {
    chrome.storage.local.set({ [STORAGE_KEY]: state });
  }

  function clearState() {
    chrome.storage.local.remove([STORAGE_KEY, 'pomodoroPaused', 'pomodoroRemaining']);
  }

  function startTimer(type = 'focus', task = '') {
    const duration = type === 'focus' ? FOCUS_DURATION : BREAK_DURATION;
    const endTime = Date.now() + duration;
    const state = { type, startTime: Date.now(), endTime, task };

    chrome.alarms.create('pomodoroTimer', { when: endTime });
    saveState(state);
  }

  function getLogs() {
    return new Promise((resolve) => {
      chrome.storage.local.get([LOG_KEY], (res) => {
        resolve(res[LOG_KEY] || []);
      });
    });
  }

  function clearLogs() {
    chrome.storage.local.remove(LOG_KEY);
  }

  function getDuration(type) {
    return type === 'focus' ? FOCUS_DURATION : BREAK_DURATION;
  }

  return {
    getState,
    saveState,
    clearState,
    startTimer,
    getLogs,
    clearLogs,
    FOCUS_DURATION,
    BREAK_DURATION,
    getDuration
  };
})();

window.Pomodoro = Pomodoro;