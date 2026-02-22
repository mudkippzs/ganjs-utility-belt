document.addEventListener('DOMContentLoaded', () => {
  const pomodoroTask = document.getElementById('pomodoroTask');
  const pomodoroStart = document.getElementById('pomodoroStart');
  const pomodoroCancel = document.getElementById('pomodoroCancel');
  const pomodoroTimer = document.getElementById('pomodoroTimer');
  const toggleFloatingTimer = document.getElementById('toggleFloatingTimer');
  const toggleAutoFocus = document.getElementById('toggleAutoFocus');

  let countdownInterval = null;

  // --- Collapsible sections ---
  chrome.storage.sync.get(['collapsedSections'], (res) => {
    const collapsed = res.collapsedSections || [];
    document.querySelectorAll('.section.collapsible').forEach(section => {
      const toggle = section.querySelector('.section-toggle');
      const body = section.querySelector('.section-body');
      const chevron = section.querySelector('.chevron');

      if (collapsed.includes(section.id)) {
        body.style.display = 'none';
        chevron.textContent = '▸';
      }

      toggle.addEventListener('click', () => {
        const isCollapsed = body.style.display === 'none';
        body.style.display = isCollapsed ? '' : 'none';
        chevron.textContent = isCollapsed ? '▾' : '▸';

        chrome.storage.sync.get(['collapsedSections'], (r) => {
          let list = r.collapsedSections || [];
          if (isCollapsed) {
            list = list.filter(id => id !== section.id);
          } else {
            list.push(section.id);
          }
          chrome.storage.sync.set({ collapsedSections: list });
        });
      });
    });
  });

  // --- Site-specific tools ---
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (!tabs[0]?.url) return;
    let hostname;
    try { hostname = new URL(tabs[0].url).hostname; } catch { return; }

    const siteTools = getSiteTools(hostname);
    if (!siteTools) return;

    const container = document.getElementById('siteToolsContainer');
    const section = document.createElement('div');
    section.className = 'section site-tools-section';
    section.innerHTML = `
      <h2 style="display:flex;align-items:center;gap:8px;margin-bottom:10px;">
        <span>${siteTools.icon}</span>
        <span>${siteTools.name} Tools</span>
      </h2>
      <div class="tool-grid">
        ${siteTools.tools.map(t => `<button class="tool-btn site-tool-btn" data-site-tool="${t.id}" title="${t.desc || ''}">${t.icon} ${t.label}</button>`).join('')}
      </div>
    `;
    container.appendChild(section);

    section.querySelectorAll('.site-tool-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const toolId = btn.dataset.siteTool;
        const tool = siteTools.tools.find(t => t.id === toolId);
        if (tool?.script) {
          chrome.scripting.executeScript({
            target: { tabId: tabs[0].id },
            func: tool.script
          });
          window.close();
        }
      });
    });
  });

  function getSiteTools(hostname) {
    if (hostname.includes('reddit.com')) return {
      name: 'Reddit', icon: '🟠',
      tools: [
        { id: 'r-collapse', icon: '📂', label: 'Collapse All', desc: 'Collapse all comment threads',
          script: () => { document.querySelectorAll('[data-testid="comment_toggle_icon"], .icon-collapse').forEach(b => { if (!b.closest('[collapsed]')) b.click(); }); }},
        { id: 'r-expand', icon: '📖', label: 'Expand All', desc: 'Expand all comment threads',
          script: () => { document.querySelectorAll('[collapsed] [data-testid="comment_toggle_icon"], .icon-expand').forEach(b => b.click()); }},
        { id: 'r-old', icon: '🔄', label: 'Old Reddit', desc: 'Switch to old.reddit.com',
          script: () => { window.location.href = window.location.href.replace('www.reddit.com', 'old.reddit.com'); }},
        { id: 'r-hideread', icon: '👁️', label: 'Dim Visited', desc: 'Dim already-visited links',
          script: () => { document.querySelectorAll('a:visited').forEach(a => { a.closest('article, .thing, [data-testid="post-container"]')?.style.setProperty('opacity', '0.4'); }); }},
        { id: 'r-media', icon: '🖼️', label: 'Show Media', desc: 'Expand all inline images/videos',
          script: () => { document.querySelectorAll('[data-testid="outbound-link"], .expando-button').forEach(b => { if (!b.classList.contains('expanded')) b.click(); }); }},
        { id: 'r-users', icon: '👤', label: 'Highlight OP', desc: 'Highlight all comments by the post author',
          script: () => { const op = document.querySelector('[data-testid="post_author_link"]')?.textContent; if (!op) return; document.querySelectorAll('a[href*="/user/"]').forEach(a => { if (a.textContent.trim() === op) a.closest('.comment, [data-testid="comment"]')?.style.setProperty('border-left', '3px solid #ff4500'); }); }},
      ]
    };

    if (hostname.includes('twitter.com') || hostname.includes('x.com')) return {
      name: 'X / Twitter', icon: '𝕏',
      tools: [
        { id: 'x-thread', icon: '🧵', label: 'Thread Reader', desc: 'Extract full thread text',
          script: () => { const tweets = [...document.querySelectorAll('[data-testid="tweetText"]')].map(t => t.innerText); const text = tweets.join('\n\n---\n\n'); navigator.clipboard.writeText(text).then(() => alert(`Copied ${tweets.length} tweets to clipboard`)); }},
        { id: 'x-media', icon: '🖼️', label: 'Media Only', desc: 'Hide non-media tweets in timeline',
          script: () => { document.querySelectorAll('article').forEach(a => { if (!a.querySelector('img[src*="media"], video')) a.style.display = 'none'; }); }},
        { id: 'x-links', icon: '🔗', label: 'Extract Links', desc: 'Copy all links from visible tweets',
          script: () => { const links = [...new Set([...document.querySelectorAll('article a[href]')].map(a => a.href).filter(h => !h.includes('twitter.com') && !h.includes('x.com')))]; navigator.clipboard.writeText(links.join('\n')).then(() => alert(`Copied ${links.length} external links`)); }},
        { id: 'x-stats', icon: '📊', label: 'Engagement', desc: 'Show engagement stats summary',
          script: () => { const tweets = document.querySelectorAll('article'); let total = 0; tweets.forEach(t => { const nums = [...t.querySelectorAll('[data-testid$="count"]')].map(n => parseInt(n.textContent.replace(/[^0-9]/g, '')) || 0); total += nums.reduce((a, b) => a + b, 0); }); alert(`${tweets.length} tweets visible\nTotal engagement: ${total.toLocaleString()}`); }},
        { id: 'x-nopromo', icon: '🚫', label: 'Hide Promoted', desc: 'Remove promoted/sponsored tweets',
          script: () => { let n = 0; document.querySelectorAll('article').forEach(a => { if (a.innerText.includes('Promoted') || a.querySelector('[data-testid="placementTracking"]')) { a.closest('[data-testid="cellInnerDiv"]')?.remove(); n++; } }); alert(`Removed ${n} promoted tweets`); }},
        { id: 'x-translate', icon: '🌐', label: 'Translate All', desc: 'Click all "Translate" buttons',
          script: () => { document.querySelectorAll('[data-testid="tweetText"] + div span[role="button"]').forEach(b => { if (b.textContent.includes('Translate')) b.click(); }); }},
      ]
    };

    if (hostname.includes('youtube.com')) return {
      name: 'YouTube', icon: '▶️',
      tools: [
        { id: 'yt-speed', icon: '⏩', label: 'Speed 2x', desc: 'Set video playback to 2x speed',
          script: () => { const v = document.querySelector('video'); if (v) { v.playbackRate = 2; alert('Playback speed: 2x'); } }},
        { id: 'yt-speed1', icon: '▶️', label: 'Speed 1x', desc: 'Reset to normal speed',
          script: () => { const v = document.querySelector('video'); if (v) { v.playbackRate = 1; alert('Playback speed: 1x'); } }},
        { id: 'yt-loop', icon: '🔁', label: 'Loop', desc: 'Toggle video loop',
          script: () => { const v = document.querySelector('video'); if (v) { v.loop = !v.loop; alert(`Loop: ${v.loop ? 'ON' : 'OFF'}`); } }},
        { id: 'yt-screenshot', icon: '📸', label: 'Frame Cap', desc: 'Screenshot current video frame',
          script: () => { const v = document.querySelector('video'); if (!v) return; const c = document.createElement('canvas'); c.width = v.videoWidth; c.height = v.videoHeight; c.getContext('2d').drawImage(v, 0, 0); const a = document.createElement('a'); a.download = `yt-frame-${Date.now()}.png`; a.href = c.toDataURL(); a.click(); }},
        { id: 'yt-chapters', icon: '📑', label: 'Chapters', desc: 'Extract chapter timestamps',
          script: () => { const chapters = [...document.querySelectorAll('#description ytd-macro-markers-list-item-renderer, .ytd-macro-markers-list-item-renderer')].map(c => c.innerText.trim()); if (chapters.length) { navigator.clipboard.writeText(chapters.join('\n')); alert(`Copied ${chapters.length} chapters`); } else { const desc = document.querySelector('#description-inner')?.innerText || ''; const ts = desc.match(/\d{1,2}:\d{2}(?::\d{2})?.*/g); if (ts) { navigator.clipboard.writeText(ts.join('\n')); alert(`Copied ${ts.length} timestamps`); } else alert('No chapters found'); } }},
        { id: 'yt-transcript', icon: '📝', label: 'Transcript', desc: 'Open transcript panel',
          script: () => { const btn = [...document.querySelectorAll('button, ytd-button-renderer')].find(b => b.innerText?.includes('transcript') || b.innerText?.includes('Transcript') || b.ariaLabel?.includes('transcript')); if (btn) btn.click(); else alert('Transcript button not found — try opening the description first'); }},
      ]
    };

    if (hostname.includes('imgur.com')) return {
      name: 'Imgur', icon: '📷',
      tools: [
        { id: 'im-download', icon: '💾', label: 'Download All', desc: 'Download all images from gallery',
          script: () => { const imgs = [...document.querySelectorAll('img.image-placeholder, img[src*="i.imgur.com"]')].map(i => i.src).filter(s => s.includes('i.imgur.com')); if (!imgs.length) { alert('No images found'); return; } imgs.forEach((src, i) => { setTimeout(() => { const a = document.createElement('a'); a.href = src; a.download = `imgur-${i+1}.jpg`; a.click(); }, i * 300); }); alert(`Downloading ${imgs.length} images...`); }},
        { id: 'im-links', icon: '🔗', label: 'Copy Links', desc: 'Copy direct image links',
          script: () => { const imgs = [...document.querySelectorAll('img[src*="i.imgur.com"]')].map(i => i.src); navigator.clipboard.writeText(imgs.join('\n')).then(() => alert(`Copied ${imgs.length} image links`)); }},
        { id: 'im-grid', icon: '🔲', label: 'Grid View', desc: 'Arrange images in a grid',
          script: () => { const container = document.querySelector('.post-images, .post-image-container, main'); if (container) { container.style.display = 'grid'; container.style.gridTemplateColumns = 'repeat(auto-fill, minmax(250px, 1fr))'; container.style.gap = '8px'; container.querySelectorAll('img').forEach(i => { i.style.width = '100%'; i.style.height = 'auto'; }); } }},
        { id: 'im-titles', icon: '📋', label: 'Copy Titles', desc: 'Copy all image titles/descriptions',
          script: () => { const titles = [...document.querySelectorAll('.post-image-title, .Gallery-Title, h1')].map(t => t.innerText.trim()).filter(Boolean); navigator.clipboard.writeText(titles.join('\n')).then(() => alert(`Copied ${titles.length} titles`)); }},
      ]
    };

    return null;
  }

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

  document.getElementById('viewAllNotes').addEventListener('click', () => {
    chrome.tabs.create({ url: chrome.runtime.getURL('notes.html') });
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
