document.addEventListener('DOMContentLoaded', () => {
  const pomodoroTask = document.getElementById('pomodoroTask');
  const pomodoroStart = document.getElementById('pomodoroStart');
  const pomodoroCancel = document.getElementById('pomodoroCancel');
  const pomodoroTimer = document.getElementById('pomodoroTimer');
  const toggleFloatingTimer = document.getElementById('toggleFloatingTimer');
  const toggleAutoFocus = document.getElementById('toggleAutoFocus');

  let countdownInterval = null;

  // Restore settings and ensure showFloatingTimer default
  chrome.storage.sync.get(['showFloatingTimer', 'autoStartNextFocus'], (res) => {
    console.log('[Popup] Loaded settings:', res);
    toggleFloatingTimer.checked = res.showFloatingTimer !== false; // Default to true
    toggleAutoFocus.checked = res.autoStartNextFocus ?? false;
    if (res.showFloatingTimer === undefined) {
      chrome.storage.sync.set({ showFloatingTimer: true });
    }
  });

  document.getElementById('testNotifications').addEventListener('click', () => {
    console.log('[Popup] Requesting notification permission and testing');
    Notification.requestPermission().then((permission) => {
      if (permission === 'granted') {
        console.log('[Popup] Notification permission granted');
        chrome.runtime.sendMessage(
          { action: 'testNotification' },
          () => {
            if (chrome.runtime.lastError) {
              console.error('[Popup] Test notification message error:', chrome.runtime.lastError.message);
            } else {
              console.log('[Popup] Test notification message sent');
            }
          }
        );
      } else {
        console.warn('[Popup] Notification permission denied');
        alert('Notifications are disabled. Please enable them in Chrome settings (chrome://settings/content/notifications) to receive Pomodoro alerts.');
      }
    });
  });

  function updateStartButtonState() {
    pomodoroStart.disabled = pomodoroTask.value.trim() === '' && !document.querySelector('#pomodoroSection input:focus');
  }

  pomodoroTask.addEventListener('input', updateStartButtonState);
  updateStartButtonState();

  pomodoroCancel.addEventListener('click', () => {
    console.log('[Popup] Cancel clicked');
    pomodoroTask.value = '';
    Pomodoro.clearState();
    chrome.storage.local.remove(['pomodoroPaused', 'pomodoroRemaining'], updatePomodoroUI);
  });

  pomodoroStart.addEventListener('click', () => {
    const task = pomodoroTask.value.trim();
    console.log('[Popup] Starting focus with task:', task);
    Pomodoro.startTimer('focus', task);
    updatePomodoroUI();
  });

  document.getElementById('viewReport').addEventListener('click', () => {
    chrome.tabs.create({ url: chrome.runtime.getURL('report.html') });
  });

  toggleFloatingTimer.addEventListener('change', () => {
    console.log('[Popup] Toggle floating timer:', toggleFloatingTimer.checked);
    chrome.storage.sync.set({ showFloatingTimer: toggleFloatingTimer.checked });
    chrome.runtime.sendMessage({ action: 'toggleFloatingTimer', enabled: toggleFloatingTimer.checked });
  });

  toggleAutoFocus.addEventListener('change', () => {
    console.log('[Popup] Toggle auto focus:', toggleAutoFocus.checked);
    chrome.storage.sync.set({ autoStartNextFocus: toggleAutoFocus.checked });
  });

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
        // Wait for state update from background.js
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
      console.log('[Popup] Updating UI:', res);
      const state = res.pomodoroState;
      const paused = res.pomodoroPaused ?? false;
      const remaining = res.pomodoroRemaining;

      if (!state) {
        console.log('[Popup] No state, resetting UI');
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
      console.log('[Popup] Storage changed:', changes.pomodoroState);
      updatePomodoroUI();
    }
  });

  document.getElementById('groupTabs').addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: 'groupTabs' });
  });

  document.getElementById('ungroupTabs').addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: 'ungroupTabs' });
  });

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
    Object.entries(sets).forEach(([name, tabs]) => {
      const wrapper = document.createElement('div');
      wrapper.className = 'tabSet';

      const title = document.createElement('div');
      title.className = 'tabSet-title';
      title.textContent = `${name} (${tabs.length} tabs)`;

      const actions = document.createElement('div');
      actions.className = 'tabSet-actions';

      const openBtn = document.createElement('button');
      openBtn.textContent = 'Open';
      openBtn.onclick = async () => {
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
// === NEW TOOL HANDLERS ===

// Quick Actions Hub
document.getElementById('openQuickActions').addEventListener('click', () => {
  chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
    chrome.scripting.executeScript({
      target: {tabId: tabs[0].id},
      func: () => { if (window.QuickActions) window.QuickActions.toggle(); }
    });
  });
  window.close();
});

// Developer Tools
document.getElementById('openCSSEditor').addEventListener('click', () => {
  chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
    chrome.scripting.executeScript({
      target: {tabId: tabs[0].id},
      func: () => { if (window.CSSEditor) window.CSSEditor.toggle(); }
    });
  });
  window.close();
});

document.getElementById('openJSEditor').addEventListener('click', () => {
  chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
    chrome.scripting.executeScript({
      target: {tabId: tabs[0].id},
      func: () => { if (window.JSEditor) window.JSEditor.toggle(); }
    });
  });
  window.close();
});

document.getElementById('openCrossTabSearch').addEventListener('click', () => {
  chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
    chrome.scripting.executeScript({
      target: {tabId: tabs[0].id},
      func: () => { if (window.CrossTabSearch) window.CrossTabSearch.toggle(); }
    });
  });
  window.close();
});

document.getElementById('openColorTools').addEventListener('click', () => {
  chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
    chrome.scripting.executeScript({
      target: {tabId: tabs[0].id},
      func: () => { if (window.ColorTools) window.ColorTools.toggle(); }
    });
  });
  window.close();
});

// Productivity Tools
document.getElementById('openAutoRefresh').addEventListener('click', () => {
  chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
    chrome.scripting.executeScript({
      target: {tabId: tabs[0].id},
      func: () => { if (window.AutoRefresh) window.AutoRefresh.toggle(); }
    });
  });
  window.close();
});

document.getElementById('openTextTools').addEventListener('click', () => {
  chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
    chrome.scripting.executeScript({
      target: {tabId: tabs[0].id},
      func: () => { if (window.TextTools) window.TextTools.toggle(); }
    });
  });
  window.close();
});

document.getElementById('openScreenshot').addEventListener('click', () => {
  chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
    chrome.scripting.executeScript({
      target: {tabId: tabs[0].id},
      func: () => { if (window.ScreenshotTools) window.ScreenshotTools.toggle(); }
    });
  });
  window.close();
});

document.getElementById('openRedirector').addEventListener('click', () => {
  chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
    chrome.scripting.executeScript({
      target: {tabId: tabs[0].id},
      func: () => { if (window.URLRedirector) window.URLRedirector.toggle(); }
    });
  });
  window.close();
});

// Image Tools
document.getElementById('toggleImageMagnifier').addEventListener('click', () => {
  chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
    chrome.scripting.executeScript({
      target: {tabId: tabs[0].id},
      func: () => { if (window.ImageMagnifier) window.ImageMagnifier.toggle(); }
    });
  });
  window.close();
});

// Developer Tools
document.getElementById('openNetworkTools').addEventListener('click', () => {
  chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
    chrome.scripting.executeScript({
      target: {tabId: tabs[0].id},
      func: () => { if (window.NetworkTools) window.NetworkTools.toggle(); }
    });
  });
  window.close();
});

document.getElementById('openDataTools').addEventListener('click', () => {
  chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
    chrome.scripting.executeScript({
      target: {tabId: tabs[0].id},
      func: () => { if (window.DataTools) window.DataTools.toggle(); }
    });
  });
  window.close();
});

