document.addEventListener('DOMContentLoaded', () => {
  const pomodoroTask = document.getElementById('pomodoroTask');
  const pomodoroStart = document.getElementById('pomodoroStart');
  const pomodoroCancel = document.getElementById('pomodoroCancel');
  const pomodoroTimer = document.getElementById('pomodoroTimer');
  const toggleFloatingTimer = document.getElementById('toggleFloatingTimer');
  const toggleAutoFocus = document.getElementById('toggleAutoFocus');

  let countdownInterval = null;

  // --- Settings restore ---
  chrome.storage.sync.get(['showFloatingTimer', 'autoStartNextFocus'], (res) => {
    toggleFloatingTimer.checked = res.showFloatingTimer !== false;
    toggleAutoFocus.checked = res.autoStartNextFocus ?? false;
    if (res.showFloatingTimer === undefined) {
      chrome.storage.sync.set({ showFloatingTimer: true });
    }
  });

  // --- Tool toggle helper ---
  function bindToolToggle(buttonId, globalName) {
    document.getElementById(buttonId).addEventListener('click', () => {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (!tabs[0]) return;
        chrome.scripting.executeScript({
          target: { tabId: tabs[0].id },
          func: (name) => { if (window[name]) window[name].toggle(); },
          args: [globalName]
        });
      });
      window.close();
    });
  }

  bindToolToggle('openQuickActions', 'QuickActions');
  bindToolToggle('openCSSEditor', 'CSSEditor');
  bindToolToggle('openJSEditor', 'JSEditor');
  bindToolToggle('openCrossTabSearch', 'CrossTabSearch');
  bindToolToggle('openColorTools', 'ColorTools');
  bindToolToggle('openNetworkTools', 'NetworkTools');
  bindToolToggle('openDataTools', 'DataTools');
  bindToolToggle('openAutoRefresh', 'AutoRefresh');
  bindToolToggle('openTextTools', 'TextTools');
  bindToolToggle('openScreenshot', 'ScreenshotTools');
  bindToolToggle('openRedirector', 'URLRedirector');
  bindToolToggle('toggleImageMagnifier', 'ImageMagnifier');

  // --- Notification test ---
  document.getElementById('testNotifications').addEventListener('click', () => {
    Notification.requestPermission().then((permission) => {
      if (permission === 'granted') {
        chrome.runtime.sendMessage({ action: 'testNotification' });
      } else {
        alert('Notifications are disabled. Please enable them in Chrome settings to receive Pomodoro alerts.');
      }
    });
  });

  // --- Pomodoro start button state ---
  function updateStartButtonState() {
    pomodoroStart.disabled = pomodoroTask.value.trim() === '';
  }

  pomodoroTask.addEventListener('input', updateStartButtonState);
  updateStartButtonState();

  // --- Pomodoro controls ---
  pomodoroCancel.addEventListener('click', () => {
    pomodoroTask.value = '';
    Pomodoro.clearState();
    updatePomodoroUI();
  });

  pomodoroStart.addEventListener('click', () => {
    const task = pomodoroTask.value.trim();
    if (!task) return;
    Pomodoro.startTimer('focus', task);
    updatePomodoroUI();
  });

  document.getElementById('viewReport').addEventListener('click', () => {
    chrome.tabs.create({ url: chrome.runtime.getURL('report.html') });
  });

  toggleFloatingTimer.addEventListener('change', () => {
    chrome.storage.sync.set({ showFloatingTimer: toggleFloatingTimer.checked });
    chrome.runtime.sendMessage({ action: 'toggleFloatingTimer', enabled: toggleFloatingTimer.checked });
  });

  toggleAutoFocus.addEventListener('change', () => {
    chrome.storage.sync.set({ autoStartNextFocus: toggleAutoFocus.checked });
  });

  // --- Pomodoro UI helpers ---
  function resetPomodoroUI() {
    clearInterval(countdownInterval);
    Pomodoro.getSettings().then(settings => {
      const min = Math.floor(settings.focusDuration / 60000);
      const sec = Math.floor((settings.focusDuration % 60000) / 1000);
      pomodoroTimer.textContent = `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
    });
    pomodoroTask.value = '';
    pomodoroTask.disabled = false;
    pomodoroStart.style.display = 'block';
    pomodoroCancel.style.display = 'none';
    updateStartButtonState();
  }

  function updateDisplay(ms) {
    const min = Math.floor(ms / 60000);
    const sec = Math.floor((ms % 60000) / 1000);
    pomodoroTimer.textContent = `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  }

  function startCountdown(endTime, paused, msRemaining) {
    clearInterval(countdownInterval);
    if (paused && msRemaining) {
      updateDisplay(msRemaining);
      pomodoroTimer.textContent += ' (Paused)';
      return;
    }

    function loop() {
      const left = endTime - Date.now();
      if (left <= 0) {
        clearInterval(countdownInterval);
        pomodoroTimer.textContent = '00:00';
        setTimeout(updatePomodoroUI, 100);
      } else {
        updateDisplay(left);
      }
    }

    loop();
    countdownInterval = setInterval(loop, 1000);
  }

  function updatePomodoroUI() {
    chrome.storage.local.get(['pomodoroState', 'pomodoroPaused', 'pomodoroRemaining'], (res) => {
      const state = res.pomodoroState;
      const paused = res.pomodoroPaused ?? false;
      const remaining = res.pomodoroRemaining;

      if (!state) {
        resetPomodoroUI();
        return;
      }

      const msLeft = paused && remaining ? remaining : state.endTime - Date.now();

      pomodoroTask.value = state.type === 'break' ? 'Break' : state.task || '';
      pomodoroTask.disabled = true;
      pomodoroStart.style.display = 'none';
      pomodoroCancel.style.display = 'block';

      startCountdown(state.endTime, paused, msLeft);
    });
  }

  updatePomodoroUI();

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes.pomodoroState) {
      updatePomodoroUI();
    }
  });

  // --- Tab management ---
  document.getElementById('groupTabs').addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: 'groupTabs' });
  });

  document.getElementById('ungroupTabs').addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: 'ungroupTabs' });
  });

  // --- Tab sets ---
  const saveForm = document.getElementById('saveForm');
  const setNameInput = document.getElementById('setName');
  const setsContainer = document.getElementById('setsContainer');

  TabSetSaver.getAllSets().then(renderSets);

  saveForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = setNameInput.value.trim();
    if (!name) return;
    await TabSetSaver.saveCurrentTabsAsSet(name);
    setNameInput.value = '';
    const sets = await TabSetSaver.getAllSets();
    renderSets(sets);
  });

  function renderSets(sets) {
    setsContainer.innerHTML = '';
    const entries = Object.entries(sets);

    if (entries.length === 0) {
      setsContainer.innerHTML = '<div class="empty-state">No saved tab sets yet</div>';
      return;
    }

    entries.forEach(([name, tabs]) => {
      const wrapper = document.createElement('div');
      wrapper.className = 'tabSet';

      const title = document.createElement('div');
      title.className = 'tabSet-title';
      title.textContent = `${name} (${tabs.length} tabs)`;

      const actions = document.createElement('div');
      actions.className = 'tabSet-actions';

      const openBtn = document.createElement('button');
      openBtn.textContent = 'Open';
      openBtn.onclick = () => {
        chrome.runtime.sendMessage({ action: 'openTabSet', setName: name });
      };

      const deleteBtn = document.createElement('button');
      deleteBtn.textContent = 'Delete';
      deleteBtn.onclick = async () => {
        await TabSetSaver.deleteSet(name);
        const updated = await TabSetSaver.getAllSets();
        renderSets(updated);
      };

      actions.appendChild(openBtn);
      actions.appendChild(deleteBtn);
      wrapper.appendChild(title);
      wrapper.appendChild(actions);
      setsContainer.appendChild(wrapper);
    });
  }
});
