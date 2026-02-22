const MediaScanner = (() => {
  let overlay = null;
  let isVisible = false;
  let mediaItems = [];

  function init() {
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && isVisible) hide();
    });
  }

  function scan() {
    mediaItems = [];
    const seen = new Set();

    function add(src, type, thumb, w, h, el) {
      if (!src || seen.has(src) || src.startsWith('data:') || src.includes('pixel') || src.includes('spacer')) return;
      seen.add(src);
      mediaItems.push({ src, type, thumb: thumb || src, w: w || 0, h: h || 0, size: 0, selected: false, el });
    }

    document.querySelectorAll('img').forEach(img => {
      if (img.naturalWidth < 30 || img.naturalHeight < 30) return;
      const src = img.currentSrc || img.src;
      add(src, guessType(src, 'image'), src, img.naturalWidth, img.naturalHeight, img);
    });

    document.querySelectorAll('video').forEach(v => {
      const src = v.currentSrc || v.src || v.querySelector('source')?.src;
      add(src, 'video', v.poster || '', v.videoWidth, v.videoHeight, v);
    });

    document.querySelectorAll('audio, audio source').forEach(a => {
      const src = a.src || a.currentSrc;
      add(src, 'audio', '', 0, 0, a);
    });

    document.querySelectorAll('source[src]').forEach(s => {
      if (s.closest('video, audio')) return;
      add(s.src, guessType(s.src, s.type?.split('/')[0] || 'media'), '', 0, 0, s);
    });

    document.querySelectorAll('a[href]').forEach(a => {
      const href = a.href;
      if (/\.(jpe?g|png|gif|webp|svg|mp4|webm|mov|mp3|ogg|wav|flac)(\?|$)/i.test(href)) {
        add(href, guessType(href, 'media'), /\.(mp4|webm|mov)/i.test(href) ? '' : href, 0, 0, a);
      }
    });

    document.querySelectorAll('[style*="background-image"]').forEach(el => {
      const m = el.style.backgroundImage.match(/url\(["']?([^"')]+)/);
      if (m && m[1] && !m[1].startsWith('data:')) add(m[1], guessType(m[1], 'image'), m[1], 0, 0, el);
    });

    return mediaItems;
  }

  function guessType(src, fallback) {
    if (/\.(jpe?g|png|gif|webp|svg|bmp|ico|avif)/i.test(src)) return 'image';
    if (/\.(mp4|webm|mov|avi|mkv|m4v)/i.test(src)) return 'video';
    if (/\.(mp3|ogg|wav|flac|aac|m4a)/i.test(src)) return 'audio';
    return fallback || 'media';
  }

  function guessExt(src) {
    const m = src.match(/\.([a-z0-9]{2,5})(?:\?|$)/i);
    return m ? m[1].toLowerCase() : 'bin';
  }

  function formatSize(bytes) {
    if (!bytes) return '?';
    if (bytes < 1024) return bytes + 'B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + 'KB';
    return (bytes / 1048576).toFixed(1) + 'MB';
  }

  async function fetchSizes() {
    const promises = mediaItems.map((item, i) => {
      return new Promise((resolve) => {
        chrome.runtime.sendMessage({ action: 'fetchUrl', url: item.src, options: { method: 'HEAD' } }, (res) => {
          if (res?.headers?.['content-length']) {
            mediaItems[i].size = parseInt(res.headers['content-length']) || 0;
          }
          resolve();
        });
      });
    });
    await Promise.all(promises);
    mediaItems.sort((a, b) => b.size - a.size);
  }

  function show() {
    scan();
    if (!mediaItems.length) {
      alert('No media found on this page.');
      return;
    }

    isVisible = true;

    overlay = document.createElement('div');
    overlay.className = 'gub-media-overlay';
    overlay.innerHTML = `
      <div class="gub-media-panel">
        <div class="gub-media-header">
          <h3>📁 Page Media · <span id="gmCount">${mediaItems.length}</span> items</h3>
          <div style="display:flex;gap:6px;align-items:center;">
            <button id="gmSelectAll" class="btn-small btn-outline">Select All</button>
            <button id="gmDeselectAll" class="btn-small btn-outline">Deselect</button>
            <button id="gmDownload" class="btn-small btn-primary">💾 Download Selected</button>
            <button id="gmCopyLinks" class="btn-small btn-outline">🔗 Copy Links</button>
            <button class="gub-media-close">✕</button>
          </div>
        </div>
        <div class="gub-media-filters">
          <button class="gub-filter active" data-filter="all">All</button>
          <button class="gub-filter" data-filter="image">🖼️ Images</button>
          <button class="gub-filter" data-filter="video">🎬 Videos</button>
          <button class="gub-filter" data-filter="audio">🎵 Audio</button>
          <span id="gmSelected" style="margin-left:auto;font-size:12px;color:#94a3b8;">0 selected</span>
        </div>
        <div class="gub-media-grid" id="gmGrid">
          <div style="text-align:center;padding:40px;color:#94a3b8;">Scanning file sizes...</div>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    overlay.querySelector('.gub-media-close').addEventListener('click', hide);
    overlay.querySelector('#gmSelectAll').addEventListener('click', () => toggleAll(true));
    overlay.querySelector('#gmDeselectAll').addEventListener('click', () => toggleAll(false));
    overlay.querySelector('#gmDownload').addEventListener('click', downloadSelected);
    overlay.querySelector('#gmCopyLinks').addEventListener('click', copySelectedLinks);

    overlay.querySelectorAll('.gub-filter').forEach(f => {
      f.addEventListener('click', () => {
        overlay.querySelectorAll('.gub-filter').forEach(x => x.classList.remove('active'));
        f.classList.add('active');
        renderGrid(f.dataset.filter);
      });
    });

    fetchSizes().then(() => renderGrid('all'));
  }

  function renderGrid(filter) {
    const grid = overlay.querySelector('#gmGrid');
    const filtered = filter === 'all' ? mediaItems : mediaItems.filter(m => m.type === filter);
    overlay.querySelector('#gmCount').textContent = filtered.length;

    if (!filtered.length) {
      grid.innerHTML = '<div style="text-align:center;padding:40px;color:#94a3b8;">No items match this filter</div>';
      return;
    }

    grid.innerHTML = filtered.map((item, i) => {
      const idx = mediaItems.indexOf(item);
      const ext = guessExt(item.src).toUpperCase();
      const typeColor = item.type === 'image' ? '#2563eb' : item.type === 'video' ? '#dc2626' : '#059669';
      const dims = item.w && item.h ? `${item.w}×${item.h}` : '';
      const thumbHtml = item.type === 'image' && item.thumb
        ? `<img src="${escapeAttr(item.thumb)}" loading="lazy">`
        : item.type === 'video' && item.thumb
        ? `<img src="${escapeAttr(item.thumb)}" loading="lazy">`
        : item.type === 'video'
        ? `<div class="gub-media-icon">🎬</div>`
        : `<div class="gub-media-icon">🎵</div>`;

      return `<div class="gub-media-card ${item.selected ? 'selected' : ''}" data-idx="${idx}">
        <div class="gub-media-thumb">${thumbHtml}</div>
        <div class="gub-media-info">
          <span class="gub-media-badge" style="background:${typeColor};">${ext}</span>
          <span class="gub-media-size">${formatSize(item.size)}</span>
          ${dims ? `<span class="gub-media-dims">${dims}</span>` : ''}
        </div>
        <div class="gub-media-check">${item.selected ? '☑' : '☐'}</div>
      </div>`;
    }).join('');

    grid.querySelectorAll('.gub-media-card').forEach(card => {
      card.addEventListener('click', () => {
        const idx = parseInt(card.dataset.idx);
        mediaItems[idx].selected = !mediaItems[idx].selected;
        card.classList.toggle('selected', mediaItems[idx].selected);
        card.querySelector('.gub-media-check').textContent = mediaItems[idx].selected ? '☑' : '☐';
        updateSelectedCount();
      });
    });

    updateSelectedCount();
  }

  function updateSelectedCount() {
    const n = mediaItems.filter(m => m.selected).length;
    const el = overlay?.querySelector('#gmSelected');
    if (el) el.textContent = `${n} selected`;
  }

  function toggleAll(state) {
    const filter = overlay.querySelector('.gub-filter.active')?.dataset.filter || 'all';
    mediaItems.forEach(m => {
      if (filter === 'all' || m.type === filter) m.selected = state;
    });
    renderGrid(filter);
  }

  function downloadSelected() {
    const selected = mediaItems.filter(m => m.selected);
    if (!selected.length) { alert('Select items to download'); return; }
    selected.forEach((item, i) => {
      setTimeout(() => {
        const a = document.createElement('a');
        a.href = item.src;
        a.download = `media-${i + 1}.${guessExt(item.src)}`;
        a.click();
      }, i * 400);
    });
    alert(`Downloading ${selected.length} files...`);
  }

  function copySelectedLinks() {
    const selected = mediaItems.filter(m => m.selected);
    if (!selected.length) {
      navigator.clipboard.writeText(mediaItems.map(m => m.src).join('\n')).then(() => alert(`Copied ${mediaItems.length} links (all)`));
    } else {
      navigator.clipboard.writeText(selected.map(m => m.src).join('\n')).then(() => alert(`Copied ${selected.length} links`));
    }
  }

  function escapeAttr(s) { return (s || '').replace(/"/g, '&quot;').replace(/</g, '&lt;'); }

  function hide() {
    if (overlay) { overlay.remove(); overlay = null; }
    isVisible = false;
    mediaItems = [];
  }

  function toggle() { isVisible ? hide() : show(); }

  return { init, show, hide, toggle, scan };
})();

window.MediaScanner = MediaScanner;
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', MediaScanner.init);
else MediaScanner.init();
