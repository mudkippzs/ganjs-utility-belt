document.addEventListener('DOMContentLoaded', () => {
  const pomodoroTask = document.getElementById('pomodoroTask');
  const pomodoroStart = document.getElementById('pomodoroStart');
  const pomodoroCancel = document.getElementById('pomodoroCancel');
  const pomodoroTimer = document.getElementById('pomodoroTimer');
  const toggleFloatingTimer = document.getElementById('toggleFloatingTimer');
  const toggleAutoFocus = document.getElementById('toggleAutoFocus');

  let countdownInterval = null;
  const focusPanel = document.getElementById('focusPanel');
  const modeBadge = document.getElementById('modeBadge');
  const modeLabel = document.getElementById('modeLabel');
  const focusSub = document.getElementById('focusSub');
  const setsPanel = document.getElementById('setsPanel');
  const toggleSetsBtn = document.getElementById('toggleSets');
  const contextRail = document.getElementById('contextRail');

  // --- Inject SVG icons ---
  const ICONS = typeof POPUP_ICONS !== 'undefined' ? POPUP_ICONS : {};
  function injectIcons() {
    document.querySelectorAll('.hud-icon[data-icon]').forEach(el => {
      const key = el.getAttribute('data-icon');
      if (ICONS[key]) el.innerHTML = ICONS[key];
    });
    const mark = document.querySelector('.hud-mark');
    if (mark && ICONS.belt) mark.innerHTML = ICONS.belt;
  }
  injectIcons();

  // --- Live tab count ---
  chrome.tabs.query({ currentWindow: true }, (tabs) => {
    const n = (tabs || []).length;
    const el = document.getElementById('tabStat');
    if (el) el.textContent = `${n} TAB${n === 1 ? '' : 'S'}`;
  });

  // --- Site context chips ---
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (!tabs[0]?.url) return;
    let hostname;
    try { hostname = new URL(tabs[0].url).hostname; } catch { return; }

    chrome.storage.sync.get(['siteToolUrls'], (res) => {
      const siteUrls = res.siteToolUrls || SITE_TOOL_DEFAULTS;
      const siteTools = getSiteTools(hostname, siteUrls);
      if (!siteTools) return;

      contextRail.hidden = false;
      document.getElementById('contextCode').textContent = 'SITE';
      document.getElementById('contextTitle').textContent = siteTools.name;

      const container = document.getElementById('siteToolsContainer');
      container.innerHTML = '';
      siteTools.tools.forEach(t => {
        const chip = document.createElement('button');
        chip.type = 'button';
        chip.className = 'hud-chip';
        chip.textContent = t.label;
        chip.title = t.desc || t.label;
        chip.setAttribute('role', 'listitem');
        chip.addEventListener('click', () => {
          chrome.scripting.executeScript({
            target: { tabId: tabs[0].id },
            func: t.script
          });
          window.close();
        });
        container.appendChild(chip);
      });
    });
  });

  const SITE_TOOL_DEFAULTS = {
    reddit: ['reddit.com'],
    twitter: ['twitter.com', 'x.com'],
    youtube: ['youtube.com'],
    imgur: ['imgur.com'],
    chan: ['4chan.org', '4channel.org']
  };

  function getSiteTools(hostname, siteUrls) {
    const urls = siteUrls || SITE_TOOL_DEFAULTS;

    function matches(key) {
      return (urls[key] || []).some(pattern => hostname.includes(pattern));
    }

    if (matches('reddit')) return {
      name: 'Reddit', icon: '🟠',
      tools: [
        { id: 'r-collapse', icon: '📂', label: 'Collapse All', desc: 'Collapse all comment threads',
          script: () => {
            // Old reddit
            document.querySelectorAll('.comment .expand').forEach(b => { if (b.textContent.trim() === '[–]') b.click(); });
            // New reddit
            document.querySelectorAll('[data-testid="comment_toggle_icon"]').forEach(b => { if (!b.closest('[collapsed]')) b.click(); });
          }},
        { id: 'r-expand', icon: '📖', label: 'Expand All', desc: 'Expand all comment threads',
          script: () => {
            document.querySelectorAll('.comment .expand').forEach(b => { if (b.textContent.trim() === '[+]') b.click(); });
            document.querySelectorAll('[collapsed] [data-testid="comment_toggle_icon"]').forEach(b => b.click());
          }},
        { id: 'r-media', icon: '🖼️', label: 'Expand Media', desc: 'Expand all inline images/videos',
          script: () => {
            document.querySelectorAll('.expando-button.collapsed').forEach(b => b.click());
            document.querySelectorAll('[data-testid="outbound-link"]').forEach(b => { if (!b.classList.contains('expanded')) b.click(); });
          }},
        { id: 'r-op', icon: '👤', label: 'Highlight OP', desc: 'Highlight all comments by the post author',
          script: () => {
            // Old reddit: .tagline .submitter
            const opOld = document.querySelector('.side .tagline .author, .linklisting .author')?.textContent?.trim();
            const opNew = document.querySelector('[data-testid="post_author_link"]')?.textContent?.trim();
            const op = opOld || opNew;
            if (!op) { alert('Could not find OP'); return; }
            let n = 0;
            document.querySelectorAll('.comment .author, a[href*="/user/"]').forEach(a => {
              if (a.textContent.trim() === op) {
                const comment = a.closest('.comment, .entry, [data-testid="comment"]');
                if (comment) { comment.style.borderLeft = '3px solid #ff4500'; comment.style.paddingLeft = '8px'; n++; }
              }
            });
            alert(`Highlighted ${n} comments by ${op}`);
          }},
        { id: 'r-save-imgs', icon: '💾', label: 'Save Images', desc: 'Download all images from post/page',
          script: () => {
            const srcs = new Set();
            document.querySelectorAll('a[href$=".jpg"], a[href$=".png"], a[href$=".gif"], a[href$=".webp"]').forEach(a => srcs.add(a.href));
            document.querySelectorAll('img[src*="i.redd.it"], img[src*="preview.redd.it"], img[src*="i.imgur.com"]').forEach(i => {
              let src = i.src.replace(/\?.*/, '');
              if (src.includes('preview.redd.it')) src = src.replace('preview.redd.it', 'i.redd.it');
              srcs.add(src);
            });
            document.querySelectorAll('.media-preview-content img, .expando img').forEach(i => { if (i.src && !i.src.includes('pixel') && i.naturalWidth > 50) srcs.add(i.src); });
            if (!srcs.size) { alert('No images found'); return; }
            const list = [...srcs];
            list.forEach((src, i) => { setTimeout(() => { const a = document.createElement('a'); a.href = src; a.download = `reddit-img-${i+1}.${src.split('.').pop().split('?')[0] || 'jpg'}`; a.click(); }, i * 300); });
            alert(`Downloading ${list.length} images...`);
          }},
        { id: 'r-save-vid', icon: '🎬', label: 'Save Video', desc: 'Download embedded video/gif',
          script: () => {
            const video = document.querySelector('video source, video[src]');
            const src = video?.src || video?.getAttribute('src');
            if (src) { const a = document.createElement('a'); a.href = src; a.download = `reddit-video-${Date.now()}.mp4`; a.click(); alert('Downloading video...'); return; }
            const gif = document.querySelector('img[src*=".gif"], video[poster]');
            if (gif?.src) { const a = document.createElement('a'); a.href = gif.src; a.download = `reddit-gif-${Date.now()}.gif`; a.click(); alert('Downloading GIF...'); return; }
            alert('No video/gif found on this page');
          }},
        { id: 'r-links', icon: '🔗', label: 'Copy Links', desc: 'Copy all post/comment links',
          script: () => {
            const links = new Set();
            document.querySelectorAll('.thing .title a.title, .entry .title a, a[data-click-id="body"]').forEach(a => { if (a.href && !a.href.includes('/comments/')) links.add(a.href); });
            if (!links.size) {
              document.querySelectorAll('.comment .md a, [data-testid="comment"] a').forEach(a => { if (a.href && !a.href.includes('reddit.com/user/')) links.add(a.href); });
            }
            navigator.clipboard.writeText([...links].join('\n')).then(() => alert(`Copied ${links.size} links`));
          }},
        { id: 'r-switch', icon: '🔄', label: 'Switch UI', desc: 'Toggle between old and new Reddit',
          script: () => {
            const h = window.location.hostname;
            if (h.includes('old.reddit')) window.location.hostname = 'www.reddit.com';
            else if (h.includes('new.reddit')) window.location.hostname = 'www.reddit.com';
            else window.location.hostname = 'old.reddit.com';
          }},
      ]
    };

    if (matches('twitter')) return {
      name: 'X / Twitter', icon: '𝕏',
      tools: [
        { id: 'x-thread', icon: '🧵', label: 'Thread Reader', desc: 'Extract full thread text',
          script: () => { const tweets = [...document.querySelectorAll('[data-testid="tweetText"]')].map(t => t.innerText); const text = tweets.join('\n\n---\n\n'); navigator.clipboard.writeText(text).then(() => alert(`Copied ${tweets.length} tweets to clipboard`)); }},
        { id: 'x-media', icon: '🖼️', label: 'Media Only', desc: 'Hide non-media tweets in timeline',
          script: () => { document.querySelectorAll('article').forEach(a => { if (!a.querySelector('img[src*="media"], video')) a.style.display = 'none'; }); }},
        { id: 'x-links', icon: '🔗', label: 'Extract Links', desc: 'Copy all links from visible tweets',
          script: () => { const links = [...new Set([...document.querySelectorAll('article a[href]')].map(a => a.href).filter(h => !h.includes('twitter.com') && !h.includes('x.com')))]; navigator.clipboard.writeText(links.join('\n')).then(() => alert(`Copied ${links.length} external links`)); }},
        { id: 'x-nopromo', icon: '🚫', label: 'Hide Promoted', desc: 'Remove promoted/sponsored tweets',
          script: () => { let n = 0; document.querySelectorAll('article').forEach(a => { if (a.innerText.includes('Promoted') || a.querySelector('[data-testid="placementTracking"]')) { a.closest('[data-testid="cellInnerDiv"]')?.remove(); n++; } }); alert(`Removed ${n} promoted tweets`); }},
      ]
    };

    if (matches('youtube')) return {
      name: 'YouTube', icon: '▶️',
      tools: [
        { id: 'yt-speed', icon: '⏩', label: 'Speed 2x', desc: 'Set video playback to 2x speed',
          script: () => { const v = document.querySelector('video'); if (v) { v.playbackRate = 2; } }},
        { id: 'yt-speed1', icon: '▶️', label: 'Speed 1x', desc: 'Reset to normal speed',
          script: () => { const v = document.querySelector('video'); if (v) { v.playbackRate = 1; } }},
        { id: 'yt-loop', icon: '🔁', label: 'Loop', desc: 'Toggle video loop',
          script: () => { const v = document.querySelector('video'); if (v) { v.loop = !v.loop; } }},
        { id: 'yt-screenshot', icon: '📸', label: 'Frame Cap', desc: 'Screenshot current video frame',
          script: () => { const v = document.querySelector('video'); if (!v) return; const c = document.createElement('canvas'); c.width = v.videoWidth; c.height = v.videoHeight; c.getContext('2d').drawImage(v, 0, 0); const a = document.createElement('a'); a.download = `yt-frame-${Date.now()}.png`; a.href = c.toDataURL(); a.click(); }},
        { id: 'yt-chapters', icon: '📑', label: 'Chapters', desc: 'Extract chapter timestamps',
          script: () => { const chapters = [...document.querySelectorAll('#description ytd-macro-markers-list-item-renderer, .ytd-macro-markers-list-item-renderer')].map(c => c.innerText.trim()); if (chapters.length) { navigator.clipboard.writeText(chapters.join('\n')); alert(`Copied ${chapters.length} chapters`); } else { const desc = document.querySelector('#description-inner')?.innerText || ''; const ts = desc.match(/\d{1,2}:\d{2}(?::\d{2})?.*/g); if (ts) { navigator.clipboard.writeText(ts.join('\n')); alert(`Copied ${ts.length} timestamps`); } else alert('No chapters found'); } }},
        { id: 'yt-dl', icon: '💾', label: 'Download', desc: 'Copy yt-dlp command or video URL',
          script: () => {
            const url = window.location.href;
            const title = document.querySelector('h1.ytd-watch-metadata yt-formatted-string, #info-contents h1')?.textContent?.trim() || 'video';
            const cmds = [
              `# Download video:`,
              `yt-dlp "${url}"`,
              ``,
              `# Best quality:`,
              `yt-dlp -f "bestvideo+bestaudio" "${url}"`,
              ``,
              `# Audio only:`,
              `yt-dlp -x --audio-format mp3 "${url}"`,
              ``,
              `# Title: ${title}`,
            ].join('\n');
            navigator.clipboard.writeText(cmds).then(() => alert('yt-dlp commands copied to clipboard!\n\nInstall yt-dlp: pip install yt-dlp'));
          }},
        { id: 'yt-thumb', icon: '🖼️', label: 'Thumbnail', desc: 'Download video thumbnail in max quality',
          script: () => {
            const m = window.location.href.match(/[?&]v=([^&]+)/);
            if (!m) { alert('Not on a video page'); return; }
            const id = m[1];
            const a = document.createElement('a');
            a.href = `https://img.youtube.com/vi/${id}/maxresdefault.jpg`;
            a.download = `thumbnail-${id}.jpg`;
            a.click();
          }},
      ]
    };

    if (matches('imgur')) return {
      name: 'Imgur', icon: '📷',
      tools: [
        { id: 'im-download', icon: '💾', label: 'Download All', desc: 'Download all images from gallery',
          script: () => { const imgs = [...document.querySelectorAll('img.image-placeholder, img[src*="i.imgur.com"]')].map(i => i.src).filter(s => s.includes('i.imgur.com')); if (!imgs.length) { alert('No images found'); return; } imgs.forEach((src, i) => { setTimeout(() => { const a = document.createElement('a'); a.href = src; a.download = `imgur-${i+1}.jpg`; a.click(); }, i * 300); }); alert(`Downloading ${imgs.length} images...`); }},
        { id: 'im-links', icon: '🔗', label: 'Copy Links', desc: 'Copy direct image links',
          script: () => { const imgs = [...document.querySelectorAll('img[src*="i.imgur.com"]')].map(i => i.src); navigator.clipboard.writeText(imgs.join('\n')).then(() => alert(`Copied ${imgs.length} image links`)); }},
        { id: 'im-titles', icon: '📋', label: 'Copy Titles', desc: 'Copy all image titles/descriptions',
          script: () => { const titles = [...document.querySelectorAll('.post-image-title, .Gallery-Title, h1')].map(t => t.innerText.trim()).filter(Boolean); navigator.clipboard.writeText(titles.join('\n')).then(() => alert(`Copied ${titles.length} titles`)); }},
      ]
    };

    if (matches('chan')) return {
      name: '4chan', icon: '🍀',
      tools: [
        { id: 'ch-dlall', icon: '💾', label: 'Save All', desc: 'Download all images/webms in thread',
          script: () => {
            const files = [...document.querySelectorAll('.fileThumb, a.fileThumb')].map(a => {
              const href = a.href;
              return href && /\.(jpg|png|gif|webm|mp4)/i.test(href) ? href : null;
            }).filter(Boolean);
            if (!files.length) { alert('No files found'); return; }
            files.forEach((src, i) => {
              setTimeout(() => {
                const a = document.createElement('a');
                a.href = src;
                a.download = src.split('/').pop();
                a.click();
              }, i * 300);
            });
            alert(`Downloading ${files.length} files...`);
          }},
        { id: 'ch-webm', icon: '🎬', label: 'WebMs Only', desc: 'Download only webm/mp4 files',
          script: () => {
            const files = [...document.querySelectorAll('.fileThumb, a.fileThumb')].map(a => a.href).filter(h => h && /\.(webm|mp4)/i.test(h));
            if (!files.length) { alert('No webm/mp4 files found'); return; }
            files.forEach((src, i) => {
              setTimeout(() => { const a = document.createElement('a'); a.href = src; a.download = src.split('/').pop(); a.click(); }, i * 500);
            });
            alert(`Downloading ${files.length} video files...`);
          }},
        { id: 'ch-links', icon: '🔗', label: 'Copy Links', desc: 'Copy all file URLs',
          script: () => {
            const files = [...document.querySelectorAll('.fileThumb, a.fileThumb')].map(a => a.href).filter(Boolean);
            navigator.clipboard.writeText(files.join('\n')).then(() => alert(`Copied ${files.length} file links`));
          }},
        { id: 'ch-expand', icon: '🖼️', label: 'Expand All', desc: 'Expand all images inline',
          script: () => {
            let n = 0;
            document.querySelectorAll('.fileThumb img[data-md5], a.fileThumb img').forEach(img => {
              if (img.classList.contains('expanded-thumb')) return;
              const full = img.closest('.fileThumb')?.href;
              if (full && /\.(jpg|png|gif)/i.test(full)) {
                img.src = full;
                img.style.maxWidth = '100%';
                img.style.height = 'auto';
                img.classList.add('expanded-thumb');
                n++;
              }
            });
            alert(`Expanded ${n} images`);
          }},
        { id: 'ch-collapse', icon: '📂', label: 'Collapse All', desc: 'Restore thumbnails',
          script: () => {
            document.querySelectorAll('.expanded-thumb').forEach(img => {
              const thumb = img.getAttribute('data-thumb-src') || img.closest('.fileThumb')?.querySelector('img[src*="/s/"]')?.getAttribute('src');
              if (thumb) img.src = thumb;
              img.style.maxWidth = '';
              img.style.height = '';
              img.classList.remove('expanded-thumb');
            });
          }},
        { id: 'ch-text', icon: '📋', label: 'Copy Thread', desc: 'Copy all post text in thread',
          script: () => {
            const posts = [...document.querySelectorAll('.postMessage, blockquote.postMessage')].map((p, i) => {
              const id = p.closest('.post, .postContainer')?.id || `post-${i}`;
              return `>> ${id}\n${p.innerText.trim()}`;
            });
            navigator.clipboard.writeText(posts.join('\n\n')).then(() => alert(`Copied ${posts.length} posts`));
          }},
      ]
    };

    return null;
  }

  // --- Settings restore ---
  chrome.storage.sync.get(['showFloatingTimer', 'autoStartNextFocus'], (res) => {
    toggleFloatingTimer.checked = res.showFloatingTimer === true;
    toggleAutoFocus.checked = res.autoStartNextFocus ?? false;
    if (res.showFloatingTimer === undefined) {
      chrome.storage.sync.set({ showFloatingTimer: false });
    }
  });

  // --- On-demand page tools ---
  function bindPageTool(buttonId, toolName) {
    const btn = document.getElementById(buttonId);
    if (!btn) return;
    btn.addEventListener('click', () => {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (!tabs[0]?.id) return;
        chrome.runtime.sendMessage({
          action: 'openPageTool',
          tabId: tabs[0].id,
          tool: toolName
        });
      });
      window.close();
    });
  }

  bindPageTool('openCrossTabSearch', 'CrossTabSearch');
  bindPageTool('openMediaScanner', 'MediaScanner');

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
  function setMode(mode, sub) {
    const m = mode || 'idle';
    if (modeBadge) modeBadge.dataset.mode = m;
    if (modeLabel) modeLabel.textContent = m.toUpperCase();
    if (focusPanel) focusPanel.dataset.state = m;
    if (focusSub) focusSub.textContent = sub || (m === 'idle' ? 'Standby' : m === 'focus' ? 'Engaged' : 'Recovery');
  }

  function resetPomodoroUI() {
    clearInterval(countdownInterval);
    Pomodoro.getSettings().then(settings => {
      const min = Math.floor(settings.focusDuration / 60000);
      const sec = Math.floor((settings.focusDuration % 60000) / 1000);
      pomodoroTimer.textContent = `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
    });
    pomodoroTask.value = '';
    pomodoroTask.disabled = false;
    pomodoroStart.hidden = false;
    pomodoroCancel.hidden = true;
    setMode('idle', 'Standby');
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
      if (focusSub) focusSub.textContent = 'Paused';
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
      const mode = state.type === 'break' ? 'break' : 'focus';
      setMode(mode, paused ? 'Paused' : (state.longBreak ? 'Long break' : (mode === 'focus' ? (state.task || 'Engaged') : 'Recovery')));

      pomodoroTask.value = state.type === 'break' ? 'Break' : state.task || '';
      pomodoroTask.disabled = true;
      pomodoroStart.hidden = true;
      pomodoroCancel.hidden = false;

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

  // --- Sets drawer ---
  toggleSetsBtn.addEventListener('click', () => {
    const open = setsPanel.hidden;
    setsPanel.hidden = !open;
    toggleSetsBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
  });

  const saveForm = document.getElementById('saveForm');
  const setNameInput = document.getElementById('setName');
  const setsContainer = document.getElementById('setsContainer');

  TabSetSaver.getAllSets().then((sets) => {
    renderSets(sets);
    if (Object.keys(sets).length > 0) {
      // keep closed by default — operator opens Sets tile
    }
  });

  saveForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = setNameInput.value.trim();
    if (!name) return;
    await TabSetSaver.saveCurrentTabsAsSet(name);
    setNameInput.value = '';
    const sets = await TabSetSaver.getAllSets();
    renderSets(sets);
    setsPanel.hidden = false;
    toggleSetsBtn.setAttribute('aria-expanded', 'true');
  });

  function renderSets(sets) {
    setsContainer.innerHTML = '';
    const entries = Object.entries(sets);

    if (entries.length === 0) {
      setsContainer.innerHTML = '<div class="hud-empty">NO SETS STORED</div>';
      return;
    }

    entries.forEach(([name, tabs]) => {
      const row = document.createElement('div');
      row.className = 'hud-set-row';

      const title = document.createElement('span');
      title.className = 'hud-set-name';
      title.textContent = name;
      title.title = name;

      const count = document.createElement('span');
      count.className = 'hud-set-count';
      count.textContent = String(tabs.length);

      const openBtn = document.createElement('button');
      openBtn.type = 'button';
      openBtn.textContent = 'Open';
      openBtn.title = `Open all ${tabs.length} tabs from “${name}”`;
      openBtn.onclick = () => {
        chrome.runtime.sendMessage({ action: 'openTabSet', setName: name });
      };

      const deleteBtn = document.createElement('button');
      deleteBtn.type = 'button';
      deleteBtn.className = 'danger';
      deleteBtn.textContent = 'Del';
      deleteBtn.title = `Delete set “${name}”`;
      deleteBtn.onclick = async () => {
        await TabSetSaver.deleteSet(name);
        renderSets(await TabSetSaver.getAllSets());
      };

      row.appendChild(title);
      row.appendChild(count);
      row.appendChild(openBtn);
      row.appendChild(deleteBtn);
      setsContainer.appendChild(row);
    });
  }
});
