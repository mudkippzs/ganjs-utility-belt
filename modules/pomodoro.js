const Pomodoro = (() => {
  const DEFAULTS = {
    focusDuration: 25 * 60 * 1000,
    shortBreakDuration: 5 * 60 * 1000,
    longBreakDuration: 15 * 60 * 1000,
    sessionsBeforeLongBreak: 4
  };

  const STORAGE_KEY = 'pomodoroState';
  const LOG_KEY = 'pomodoroLogs';
  const SETTINGS_KEY = 'pomodoroSettings';

  async function getSettings() {
    return new Promise((resolve) => {
      chrome.storage.sync.get([SETTINGS_KEY], (res) => {
        resolve({ ...DEFAULTS, ...(res[SETTINGS_KEY] || {}) });
      });
    });
  }

  function saveSettings(settings) {
    return chrome.storage.sync.set({ [SETTINGS_KEY]: settings });
  }

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
    chrome.alarms.clear('pomodoroTimer');
  }

  async function startTimer(type = 'focus', task = '') {
    const settings = await getSettings();
    const duration = type === 'focus'
      ? settings.focusDuration
      : settings.shortBreakDuration;
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

  async function getDuration(type) {
    const settings = await getSettings();
    return type === 'focus'
      ? settings.focusDuration
      : settings.shortBreakDuration;
  }

  return {
    DEFAULTS,
    STORAGE_KEY,
    LOG_KEY,
    SETTINGS_KEY,
    getSettings,
    saveSettings,
    getState,
    saveState,
    clearState,
    startTimer,
    getLogs,
    clearLogs,
    getDuration
  };
})();

if (typeof window !== 'undefined') {
  window.Pomodoro = Pomodoro;
}
