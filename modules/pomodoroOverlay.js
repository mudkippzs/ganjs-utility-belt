(() => {
  let container, canvas, ctx, text, icon;
  let radius = 30;
  let timer = null;
  let paused = false;
  let remaining = 0;
  let state = null;
  let warnedOneMinute = false;
  let lastEndTime = null;

  function createOverlay() {
    if (document.getElementById('pomodoro-floating-timer')) return;

    container = document.createElement('div');
    container.id = 'pomodoro-floating-timer';
    container.className = 'pomodoro-floating-timer';

    canvas = document.createElement('canvas');
    canvas.className = 'pomodoro-timer-canvas';
    canvas.width = 72;
    canvas.height = 72;
    ctx = canvas.getContext('2d');

    text = document.createElement('div');
    text.className = 'pomodoro-timer-text';

    icon = document.createElement('div');
    icon.className = 'pomodoro-timer-icon';
    icon.textContent = '⏸️';
    icon.style.display = 'none';

    container.appendChild(canvas);
    container.appendChild(text);
    container.appendChild(icon);
    document.body.appendChild(container);

    container.addEventListener('click', togglePause);
  }

  function togglePause() {
    paused = !paused;

    if (paused) {
      clearInterval(timer);
      remaining = state.endTime - Date.now();
      chrome.storage.local.set({ pomodoroPaused: true, pomodoroRemaining: remaining }, () => {
        updateOverlayStyle();
        updateText(remaining);
        const percent = remaining ? 1 - (remaining / Pomodoro.getDuration(state.type)) : 0;
        updateArc(percent);
      });
    } else {
      const newStart = Date.now();
      const newEnd = newStart + remaining;
      state.startTime = newStart;
      state.endTime = newEnd;

      chrome.storage.local.set({
        pomodoroState: state,
        pomodoroPaused: false,
        pomodoroRemaining: null
      }, () => {
        chrome.alarms.create('pomodoroTimer', { when: newEnd });
        updateOverlayStyle();
        lastEndTime = newEnd;
        warnedOneMinute = false;
        startTimerLoop();
      });
    }
  }

  function updateOverlayStyle() {
    if (!container) return;
    container.classList.toggle('paused', paused);
    container.classList.toggle('break', state?.type === 'break');
    icon.style.display = paused ? 'block' : 'none';
  }

  function removeOverlay() {
    if (container && container.parentNode) {
      container.parentNode.removeChild(container);
    }
    clearInterval(timer);
    container = null;
    ctx = null;
    timer = null;
    state = null;
    paused = false;
    remaining = 0;
    warnedOneMinute = false;
    lastEndTime = null;
  }

  function updateArc(percent) {
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.beginPath();
    ctx.strokeStyle = '#ddd';
    ctx.lineWidth = 4;
    ctx.arc(36, 36, radius, 0, Math.PI * 2);
    ctx.stroke();

    ctx.beginPath();
    ctx.strokeStyle = state?.type === 'focus' ? '#e74c3c' : '#10b981';
    ctx.lineWidth = 4;
    ctx.arc(36, 36, radius, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * percent);
    ctx.stroke();
  }

  function updateText(msRemaining) {
    const min = Math.floor(msRemaining / 60000);
    const sec = Math.floor((msRemaining % 60000) / 1000);
    text.textContent = `${min}:${String(sec).padStart(2, '0')}`;
  }

  function startTimerLoop() {
    if (!state || !container) return;

    clearInterval(timer);
    const duration = Pomodoro.getDuration(state.type);
    const endTime = state.endTime;
    warnedOneMinute = false;

    function loop() {
      if (paused || !state || !container) {
        clearInterval(timer);
        return;
      }

      const now = Date.now();
      remaining = endTime - now;

      if (remaining <= 1000) {
        clearInterval(timer);
        updateText(0);
        updateArc(0);
        return;
      }

      updateText(remaining);
      const percent = 1 - (remaining / duration);
      updateArc(percent);

      if (!warnedOneMinute && remaining <= 60000) {
        showToast('⏳ 1 minute left — get ready to switch.');
        warnedOneMinute = true;
      }
    }

    loop();
    timer = setInterval(loop, 1000);
  }

  let isToastLeader = false;

  function showToast(message) {
    if (!isToastLeader) return;

    chrome.runtime.sendMessage({ action: 'pomodoroToast', message });
  }

  function syncState(retryCount = 0) {
    chrome.storage.local.get(
      ['pomodoroState', 'pomodoroPaused', 'pomodoroRemaining', 'showFloatingTimer'],
      (res) => {
        state = res.pomodoroState;
        const show = res.showFloatingTimer !== false;

        if (!state && retryCount < 3) {
          setTimeout(() => syncState(retryCount + 1), 200);
          return;
        }

        if (!state || !show) {
          removeOverlay();
          return;
        }

        paused = res.pomodoroPaused ?? false;
        remaining = res.pomodoroRemaining ?? 0;

        createOverlay();
        chrome.runtime.sendMessage({ action: 'claimToastLeadership' }, (res) => {
          if (chrome.runtime.lastError) {
            console.warn('[PomodoroOverlay] Leadership check error:', chrome.runtime.lastError.message);
            return;
          }
          isToastLeader = !!res?.isLeader;
          console.log('[PomodoroOverlay] Toast leader:', isToastLeader);
        });

        updateOverlayStyle();

        if (!paused && (!lastEndTime || state.endTime !== lastEndTime)) {
          lastEndTime = state.endTime;
          warnedOneMinute = false;
          startTimerLoop();
        } else if (paused) {
          updateText(remaining);
          const percent = remaining ? 1 - (remaining / Pomodoro.getDuration(state.type)) : 0;
          updateArc(percent);
        }
      }
    );
  }

  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.action === 'toggleFloatingTimer') {
      chrome.storage.sync.set({ showFloatingTimer: msg.enabled }, () => {
        syncState();
      });
    }
  });

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes.pomodoroState) {
      syncState();
    }
  });

  chrome.storage.sync.get(['showFloatingTimer'], (res) => {
    if (res.showFloatingTimer === undefined) {
      chrome.storage.sync.set({ showFloatingTimer: true }, () => {
        syncState();
      });
    } else {
      syncState();
    }
  });

  setInterval(syncState, 5000);
})();
