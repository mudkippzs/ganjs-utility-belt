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

    chrome.storage.sync.get(['siteToolUrls'], (res) => {
      const siteUrls = res.siteToolUrls || SITE_TOOL_DEFAULTS;
      const siteTools = getSiteTools(hostname, siteUrls);
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
        { id: 'x-stats', icon: '📊', label: 'Engagement', desc: 'Show engagement stats summary',
          script: () => { const tweets = document.querySelectorAll('article'); let total = 0; tweets.forEach(t => { const nums = [...t.querySelectorAll('[data-testid$="count"]')].map(n => parseInt(n.textContent.replace(/[^0-9]/g, '')) || 0); total += nums.reduce((a, b) => a + b, 0); }); alert(`${tweets.length} tweets visible\nTotal engagement: ${total.toLocaleString()}`); }},
        { id: 'x-nopromo', icon: '🚫', label: 'Hide Promoted', desc: 'Remove promoted/sponsored tweets',
          script: () => { let n = 0; document.querySelectorAll('article').forEach(a => { if (a.innerText.includes('Promoted') || a.querySelector('[data-testid="placementTracking"]')) { a.closest('[data-testid="cellInnerDiv"]')?.remove(); n++; } }); alert(`Removed ${n} promoted tweets`); }},
        { id: 'x-translate', icon: '🌐', label: 'Translate All', desc: 'Click all "Translate" buttons',
          script: () => { document.querySelectorAll('[data-testid="tweetText"] + div span[role="button"]').forEach(b => { if (b.textContent.includes('Translate')) b.click(); }); }},
      ]
    };

    if (matches('youtube')) return {
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
        { id: 'im-grid', icon: '🔲', label: 'Grid View', desc: 'Arrange images in a grid',
          script: () => { const container = document.querySelector('.post-images, .post-image-container, main'); if (container) { container.style.display = 'grid'; container.style.gridTemplateColumns = 'repeat(auto-fill, minmax(250px, 1fr))'; container.style.gap = '8px'; container.querySelectorAll('img').forEach(i => { i.style.width = '100%'; i.style.height = 'auto'; }); } }},
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
        { id: 'ch-gallery', icon: '🔲', label: 'Gallery', desc: 'View all images in a grid gallery',
          script: () => {
            const files = [...document.querySelectorAll('.fileThumb, a.fileThumb')].map(a => a.href).filter(h => h && /\.(jpg|png|gif|webm)/i.test(h));
            if (!files.length) { alert('No files found'); return; }
            const overlay = document.createElement('div');
            overlay.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(0,0,0,0.95);z-index:999999;overflow:auto;padding:20px;';
            const close = document.createElement('button');
            close.textContent = '✕ Close';
            close.style.cssText = 'position:fixed;top:10px;right:20px;z-index:1000000;background:#dc2626;color:white;border:none;padding:8px 16px;border-radius:8px;cursor:pointer;font-size:14px;';
            close.onclick = () => overlay.remove();
            overlay.appendChild(close);
            const grid = document.createElement('div');
            grid.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:8px;padding-top:40px;';
            files.forEach(src => {
              const item = document.createElement('div');
              item.style.cssText = 'border-radius:6px;overflow:hidden;cursor:pointer;background:#1e293b;';
              if (/\.(webm|mp4)/i.test(src)) {
                item.innerHTML = `<video src="${src}" style="width:100%;display:block;" preload="metadata" muted></video>`;
                item.querySelector('video').addEventListener('mouseenter', function() { this.play(); });
                item.querySelector('video').addEventListener('mouseleave', function() { this.pause(); this.currentTime = 0; });
              } else {
                item.innerHTML = `<img src="${src}" style="width:100%;display:block;" loading="lazy">`;
              }
              item.addEventListener('click', () => { window.open(src, '_blank'); });
              grid.appendChild(item);
            });
            const count = document.createElement('div');
            count.textContent = `${files.length} files`;
            count.style.cssText = 'position:fixed;top:14px;left:20px;color:white;font-size:14px;z-index:1000000;font-family:sans-serif;';
            overlay.appendChild(count);
            overlay.appendChild(grid);
            document.body.appendChild(overlay);
            document.addEventListener('keydown', function esc(e) { if (e.key === 'Escape') { overlay.remove(); document.removeEventListener('keydown', esc); } });
          }},
        { id: 'ch-text', icon: '📋', label: 'Copy Thread', desc: 'Copy all post text in thread',
          script: () => {
            const posts = [...document.querySelectorAll('.postMessage, blockquote.postMessage')].map((p, i) => {
              const id = p.closest('.post, .postContainer')?.id || `post-${i}`;
              return `>> ${id}\n${p.innerText.trim()}`;
            });
            navigator.clipboard.writeText(posts.join('\n\n')).then(() => alert(`Copied ${posts.length} posts`));
          }},
        { id: 'ch-dead', icon: '💀', label: 'Dead Links', desc: 'Highlight dead quote links',
          script: () => {
            const postIds = new Set([...document.querySelectorAll('.post, .postContainer')].map(p => p.id.replace('pc', '').replace('p', '')));
            let n = 0;
            document.querySelectorAll('.quotelink').forEach(a => {
              const target = a.textContent.replace('>>', '').trim();
              if (target && !postIds.has(target) && !a.href.includes('#p')) {
                a.style.color = '#dc2626';
                a.style.textDecoration = 'line-through';
                a.title = 'Dead link';
                n++;
              }
            });
            alert(`Found ${n} dead quote links`);
          }},
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
  bindToolToggle('openMediaScanner', 'MediaScanner');

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
