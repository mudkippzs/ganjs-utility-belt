(() => {
  let lastRightClickCoords = { x: 100, y: 100 };
  let lastRightClickTarget = null;
  const activeTimers = new Map();
  const persistTimers = new Map();
  let stickyEnabled = true;

  chrome.storage.sync.get(['stickySettings'], (res) => {
    stickyEnabled = res.stickySettings?.enabled !== false;
  });
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'sync' && changes.stickySettings) {
      stickyEnabled = changes.stickySettings.newValue?.enabled !== false;
    }
  });

  document.addEventListener('contextmenu', (e) => {
    lastRightClickCoords = { x: e.pageX, y: e.pageY };
    lastRightClickTarget = e.target;
  });

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'getClickPosition') {
      sendResponse(lastRightClickCoords);
      return;
    }
    if (message.action === 'getClickContext') {
      const sel = window.getSelection()?.toString()?.trim() || '';
      let target = lastRightClickTarget;
      // Prefer the media element when clicking overlays/controls on top of it
      const mediaEl = target?.closest?.('img, video, audio, picture');
      if (mediaEl) {
        target = mediaEl.tagName === 'PICTURE' ? (mediaEl.querySelector('img') || mediaEl) : mediaEl;
      }
      let media = null;
      if (target?.tagName === 'IMG') media = { type: 'image', src: target.currentSrc || target.src, alt: target.alt || '' };
      else if (target?.tagName === 'VIDEO') media = { type: 'video', src: target.currentSrc || target.src || target.querySelector('source')?.src || '' };
      else if (target?.tagName === 'AUDIO') media = { type: 'audio', src: target.currentSrc || target.src || target.querySelector('source')?.src || '' };
      const elementSelector = target ? cssPath(target) : '';
      sendResponse({
        coords: lastRightClickCoords,
        selection: sel,
        media,
        elementSelector,
        elementTag: target?.tagName || ''
      });
      return;
    }
    if (message.action === 'restoreStickyNotes' && Array.isArray(message.notes)) {
      if (!stickyEnabled) return;
      applyRestoredNotes(message.notes);
    }
  });

  function applyRestoredNotes(notes) {
    if (!Array.isArray(notes) || !notes.length) return;
    notes.forEach(n => renderNote(n));
    restoreHighlights(notes);
    // SPA / late DOM: retry until marks land or attempts run out
    [400, 1200, 3000, 7000].forEach(ms => {
      setTimeout(() => restoreHighlights(notes), ms);
    });
  }

  function pullNotesFromBackground(attempt) {
    chrome.runtime.sendMessage({ action: 'loadStickyNotes' }, (res) => {
      if (chrome.runtime.lastError) {
        if ((attempt || 0) < 6) {
          setTimeout(() => pullNotesFromBackground((attempt || 0) + 1), 200 * ((attempt || 0) + 1));
        }
        return;
      }
      if (!stickyEnabled) return;
      applyRestoredNotes(res?.notes || []);
    });
  }

  // ---- Storage ----

  function persistNote(note, immediate) {
    note.url = window.location.origin + window.location.pathname;
    note.updatedAt = new Date().toISOString();

    const write = () => {
      chrome.storage.local.get({ stickyNotes: [] }, ({ stickyNotes }) => {
        const i = stickyNotes.findIndex(n => n.id === note.id);
        // Clone plain data — avoid storing DOM-tainted refs
        const payload = {
          id: note.id,
          url: note.url,
          x: note.x,
          y: note.y,
          title: note.title || '',
          content: note.content || '',
          color: note.color || '#fde68a',
          tags: Array.isArray(note.tags) ? [...note.tags] : [],
          collapsed: !!note.collapsed,
          createdAt: note.createdAt,
          updatedAt: note.updatedAt,
          anchorText: note.anchorText || '',
          anchorSelector: note.anchorSelector || '',
          anchorKind: note.anchorKind || (note.anchorSelector ? 'element' : (note.anchorText ? 'text' : '')),
          media: note.media || null,
          mediaSrc: note.mediaSrc || note.media?.src || '',
          reminder: note.reminder || null
        };
        if (i > -1) stickyNotes[i] = payload;
        else stickyNotes.push(payload);
        chrome.storage.local.set({ stickyNotes });
      });
    };

    const prev = persistTimers.get(note.id);
    if (prev) clearTimeout(prev);
    if (immediate) {
      persistTimers.delete(note.id);
      write();
    } else {
      persistTimers.set(note.id, setTimeout(() => {
        persistTimers.delete(note.id);
        write();
      }, 250));
    }
  }

  function deleteNote(noteId) {
    const t = persistTimers.get(noteId);
    if (t) clearTimeout(t);
    persistTimers.delete(noteId);
    chrome.storage.local.get({ stickyNotes: [] }, ({ stickyNotes }) => {
      chrome.storage.local.set({ stickyNotes: stickyNotes.filter(n => n.id !== noteId) });
    });
    chrome.runtime.sendMessage({ action: 'deleteStickyNote', id: noteId }, () => {
      void chrome.runtime.lastError;
    });
  }

  /** Pull latest title/content from open editor before save/collapse. */
  function syncNoteFromDom(el, note) {
    if (!el) return;
    const titleInput = el.querySelector('.gub-note-title');
    const editor = el.querySelector('.gub-note-editor');
    if (titleInput) note.title = titleInput.value;
    if (editor && (editor.style.display === 'block' || editor.offsetParent !== null || window.getComputedStyle(editor).display !== 'none')) {
      note.content = editor.value;
    } else if (editor) {
      // Editor hidden but may still hold typed value if preview shown after blur race
      note.content = editor.value;
    }
  }

  // ---- Color helpers ----

  function atrId(id) {
    return String(id).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  }

  function hexToRgba(hex, alpha) {
    const h = (hex || '#fde68a').replace('#', '');
    const full = h.length === 3 ? h.split('').map(c => c + c).join('') : h;
    const n = parseInt(full, 16);
    if (Number.isNaN(n)) return `rgba(253, 230, 138, ${alpha})`;
    const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  // ---- Text highlights (CSS Custom Highlight API — never mutates page text) ----

  const canCssHighlight = typeof Highlight !== 'undefined' && CSS?.highlights;

  function hlKey(noteId) {
    return `gub-hl-${String(noteId).replace(/[^a-zA-Z0-9_-]/g, '_')}`;
  }

  function ensureCssHighlightStyle(noteId, color) {
    const key = hlKey(noteId);
    const styleId = `gub-hl-style-${key}`;
    let style = document.getElementById(styleId);
    if (!style) {
      style = document.createElement('style');
      style.id = styleId;
      (document.head || document.documentElement).appendChild(style);
    }
    const c = color || '#fde68a';
    style.textContent = `
      ::highlight(${key}) {
        background-color: ${hexToRgba(c, 0.55)};
        color: Inherit;
        text-decoration: underline;
        text-decoration-color: ${hexToRgba(c, 0.95)};
        text-decoration-thickness: 2px;
      }
    `.replace('Inherit', 'inherit');
  }

  function clearCssHighlight(noteId) {
    if (!canCssHighlight) return;
    try { CSS.highlights.delete(hlKey(noteId)); } catch { /* ignore */ }
    document.getElementById(`gub-hl-style-${hlKey(noteId)}`)?.remove();
  }

  function setCssHighlight(noteId, color, ranges) {
    if (!canCssHighlight || !ranges?.length) return false;
    ensureCssHighlightStyle(noteId, color);
    try {
      const hl = new Highlight(...ranges);
      CSS.highlights.set(hlKey(noteId), hl);
      return true;
    } catch {
      return false;
    }
  }

  /** Unwrap legacy <span class="gub-highlight"> marks without losing text. */
  function unwrapLegacySpans(noteId) {
    document.querySelectorAll(`span.gub-highlight[data-note-id="${atrId(noteId)}"]`).forEach(m => {
      const parent = m.parentNode;
      if (!parent) return;
      while (m.firstChild) parent.insertBefore(m.firstChild, m);
      parent.removeChild(m);
      parent.normalize();
    });
  }

  function pageTextNodes() {
    const accept = {
      acceptNode(node) {
        if (!node.textContent) return NodeFilter.FILTER_REJECT;
        if (node.parentElement?.closest('.gub-note, .gub-note-pill, script, style, noscript, textarea, [contenteditable="true"]')) {
          return NodeFilter.FILTER_REJECT;
        }
        return NodeFilter.FILTER_ACCEPT;
      }
    };
    const nodes = [];
    if (!document.body) return nodes;
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, accept);
    let node;
    while ((node = walker.nextNode())) nodes.push(node);
    return nodes;
  }

  /** Build a DOM Range covering [start, end) in the concatenated page text. */
  function rangeFromFlatOffsets(nodes, start, end) {
    if (end <= start || !nodes.length) return null;
    let cursor = 0;
    let startNode = null;
    let startOff = 0;
    let endNode = null;
    let endOff = 0;
    for (const node of nodes) {
      const len = node.textContent.length;
      if (!startNode && start < cursor + len) {
        startNode = node;
        startOff = start - cursor;
      }
      if (end <= cursor + len) {
        endNode = node;
        endOff = end - cursor;
        break;
      }
      cursor += len;
    }
    if (!startNode || !endNode) return null;
    try {
      const range = document.createRange();
      range.setStart(startNode, Math.max(0, Math.min(startOff, startNode.textContent.length)));
      range.setEnd(endNode, Math.max(0, Math.min(endOff, endNode.textContent.length)));
      return range.collapsed ? null : range;
    } catch {
      return null;
    }
  }

  function findInHaystack(haystack, needle, ignoreCase) {
    if (!ignoreCase) return haystack.indexOf(needle);
    return haystack.toLowerCase().indexOf(needle.toLowerCase());
  }

  /** Locate needle in the page; returns a Range or null. Never mutates the DOM. */
  function findTextRange(text) {
    if (!text || text.length < 2 || !document.body) return null;
    const needle = text.trim();
    const nodes = pageTextNodes();
    if (!nodes.length) return null;

    let haystack = '';
    for (const node of nodes) haystack += node.textContent;

    // Exact (and case-insensitive) across nodes
    let idx = findInHaystack(haystack, needle, false);
    if (idx === -1) idx = findInHaystack(haystack, needle, true);
    if (idx !== -1) {
      const r = rangeFromFlatOffsets(nodes, idx, idx + needle.length);
      if (r) return r;
    }

    // Whitespace-collapsed match
    const needleN = needle.replace(/\s+/g, ' ').trim();
    if (needleN.length < 2) return null;

    const collapsed = [];
    const origAt = [];
    let lastSpace = true;
    for (let i = 0; i < haystack.length; i++) {
      if (/\s/.test(haystack[i])) {
        if (!lastSpace) {
          collapsed.push(' ');
          origAt.push(i);
          lastSpace = true;
        }
      } else {
        collapsed.push(haystack[i]);
        origAt.push(i);
        lastSpace = false;
      }
    }
    while (collapsed.length && collapsed[collapsed.length - 1] === ' ') {
      collapsed.pop();
      origAt.pop();
    }

    const cStr = collapsed.join('');
    let cIdx = findInHaystack(cStr, needleN, false);
    if (cIdx === -1) cIdx = findInHaystack(cStr, needleN, true);
    if (cIdx === -1) {
      if (needleN.length > 48) return findTextRange(needleN.slice(0, 48));
      return null;
    }
    const start = origAt[cIdx];
    const endChar = origAt[cIdx + needleN.length - 1];
    if (start == null || endChar == null) return null;
    return rangeFromFlatOffsets(nodes, start, endChar + 1);
  }

  function hasTextHighlight(noteId) {
    if (canCssHighlight && CSS.highlights.has(hlKey(noteId))) return true;
    return !!document.querySelector(`span.gub-highlight[data-note-id="${atrId(noteId)}"]`);
  }

  /**
   * Paint a text highlight without destroying page content.
   * Prefers CSS Custom Highlight API; never wraps DOM text nodes.
   */
  function highlightTextOnPage(text, noteId, color) {
    if (!text || text.length < 2) return false;
    const range = findTextRange(text);
    if (!range) return hasTextHighlight(noteId);
    return setCssHighlight(noteId, color, [range]);
  }

  /** Highlight the live Selection — paint only, never wrap/mutate text nodes. */
  function highlightCurrentSelection(note) {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || !sel.rangeCount) {
      toast('Select text on the page first');
      return false;
    }
    const range = sel.getRangeAt(0).cloneRange();
    if (range.commonAncestorContainer?.parentElement?.closest('.gub-note, .gub-note-pill')) {
      toast('Select text on the page, not inside the note');
      return false;
    }
    const text = sel.toString().trim();
    if (text.length < 2) return false;

    note.anchorText = text;
    note.anchorSelector = '';
    note.anchorKind = 'text';

    // Clear previous CSS paint first (safe). Unwrap legacy spans AFTER painting
    // so we never invalidate the selection range before using it.
    clearCssHighlight(note.id);
    document.querySelectorAll(`.gub-el-highlight[data-note-id="${atrId(note.id)}"]`).forEach(m => {
      m.classList.remove('gub-el-highlight', 'gub-media-highlight');
      m.removeAttribute('data-note-id');
      m.style.outline = '';
      m.style.outlineOffset = '';
      m.style.boxShadow = '';
    });

    let ok = setCssHighlight(note.id, note.color, [range]);
    unwrapLegacySpans(note.id);
    if (!ok) ok = highlightTextOnPage(text, note.id, note.color);

    sel.removeAllRanges();
    if (!ok) {
      toast('Could not highlight that selection');
      return false;
    }
    return true;
  }

  function applyElementHighlightStyle(el, color) {
    const c = color || '#fde68a';
    el.classList.add('gub-el-highlight');
    if (el.tagName === 'IMG' || el.tagName === 'VIDEO' || el.tagName === 'PICTURE' || el.tagName === 'AUDIO') {
      el.classList.add('gub-media-highlight');
    }
    el.style.setProperty('outline', `3px solid ${c}`, 'important');
    el.style.setProperty('outline-offset', '3px', 'important');
    el.style.setProperty('box-shadow', `0 0 0 6px ${hexToRgba(c, 0.28)}, 0 0 24px ${hexToRgba(c, 0.35)}`, 'important');
    el.style.setProperty('--gub-hl', c);
  }

  function highlightMediaBySrc(src, noteId, color) {
    if (!src) return;
    if (document.querySelector(`.gub-el-highlight[data-note-id="${atrId(noteId)}"]`)) return;

    const bare = src.split('?')[0];
    const file = bare.split('/').pop();
    const candidates = [...document.querySelectorAll('img, video, audio, source')];
    let el = candidates.find(n => {
      const s = n.currentSrc || n.src || '';
      return s === src || s.startsWith(bare) || (file && s.includes(file));
    });
    if (el?.tagName === 'SOURCE') el = el.closest('video, audio') || el;
    if (!el) return;

    el.classList.add('gub-el-highlight');
    el.dataset.noteId = noteId;
    applyElementHighlightStyle(el, color);
    el.addEventListener('click', onElHighlightClick);
  }

  function updateNoteHighlightColors(noteId, color) {
    if (canCssHighlight && CSS.highlights.has(hlKey(noteId))) {
      ensureCssHighlightStyle(noteId, color);
    }
    document.querySelectorAll(`.gub-el-highlight[data-note-id="${atrId(noteId)}"]`).forEach(m => {
      applyElementHighlightStyle(m, color);
    });
  }

  function cssPath(el) {
    if (!el || el === document.body || el === document.documentElement) return '';
    if (el.id && !/\d{4,}/.test(el.id)) return `#${CSS.escape(el.id)}`;
    const parts = [];
    let cur = el;
    while (cur && cur !== document.body && parts.length < 6) {
      let part = cur.tagName.toLowerCase();
      if (cur.classList?.length) {
        const cls = [...cur.classList].filter(c => !c.startsWith('gub-') && !c.startsWith('ganj-')).slice(0, 2);
        if (cls.length) part += cls.map(c => `.${CSS.escape(c)}`).join('');
      }
      const parent = cur.parentElement;
      if (parent) {
        const siblings = [...parent.children].filter(c => c.tagName === cur.tagName);
        if (siblings.length > 1) part += `:nth-of-type(${siblings.indexOf(cur) + 1})`;
      }
      parts.unshift(part);
      cur = parent;
    }
    return parts.join(' > ');
  }

  function restoreHighlights(notes) {
    if (!notes?.length || !document.body) return;
    notes.forEach(n => {
      // Exclusive: element/media outline OR text paint — never both
      if (n.anchorSelector) {
        highlightElementBySelector(n.anchorSelector, n.id, n.color);
      } else if (n.media?.src || n.mediaSrc) {
        highlightMediaBySrc(n.media?.src || n.mediaSrc, n.id, n.color);
      } else if (n.anchorText) {
        highlightTextOnPage(n.anchorText, n.id, n.color);
      }
    });
  }

  function removeHighlightsForNote(noteId) {
    clearCssHighlight(noteId);
    unwrapLegacySpans(noteId);
    document.querySelectorAll(`.gub-el-highlight[data-note-id="${atrId(noteId)}"]`).forEach(m => {
      m.classList.remove('gub-el-highlight', 'gub-media-highlight');
      m.removeAttribute('data-note-id');
      m.style.outline = '';
      m.style.outlineOffset = '';
      m.style.boxShadow = '';
    });
  }

  function highlightElementBySelector(selector, noteId, color) {
    if (!selector) return;
    if (document.querySelector(`.gub-el-highlight[data-note-id="${atrId(noteId)}"]`)) return;
    let el;
    try { el = document.querySelector(selector); } catch { return; }
    if (!el || el.closest('.gub-note, .gub-note-pill')) return;
    el.classList.add('gub-el-highlight');
    el.dataset.noteId = noteId;
    applyElementHighlightStyle(el, color);
    el.addEventListener('click', onElHighlightClick);
  }

  function onElHighlightClick(e) {
    const el = e.currentTarget;
    const noteId = el.dataset.noteId;
    if (!noteId) return;
    // Don't steal clicks from interactive controls unless modifier
    if (e.target.closest('a, button, input, textarea, select') && !e.altKey) return;
    expandNote(noteId);
  }

  function highlightCurrentElement(note) {
    let target = lastRightClickTarget || document.activeElement;
    const mediaEl = target?.closest?.('img, video, audio, picture');
    if (mediaEl) {
      target = mediaEl.tagName === 'PICTURE' ? (mediaEl.querySelector('img') || mediaEl) : mediaEl;
    }
    if (!target || target === document.body || target.closest?.('.gub-note, .gub-note-pill')) {
      toast('Right-click a page element (or image/video), then Highlight element');
      return false;
    }
    removeHighlightsForNote(note.id);
    const selector = cssPath(target);
    note.anchorSelector = selector;
    note.anchorKind = 'element';
    // Do NOT set anchorText from element innerText — that caused text wraps that nuked content
    if (target.tagName === 'IMG' || target.tagName === 'VIDEO' || target.tagName === 'AUDIO') {
      note.media = {
        type: target.tagName === 'IMG' ? 'image' : target.tagName.toLowerCase(),
        src: target.currentSrc || target.src || target.querySelector?.('source')?.src || ''
      };
      note.mediaSrc = note.media.src;
      note.anchorKind = 'media';
    }
    highlightElementBySelector(selector, note.id, note.color);
    return true;
  }

  function expandNote(noteId) {
    const pill = document.querySelector(`.gub-note-pill[data-note-id="${atrId(noteId)}"]`);
    if (pill) pill.click();
  }

  // Click a CSS text highlight → open linked note
  document.addEventListener('click', (e) => {
    if (!canCssHighlight || e.target.closest?.('.gub-note, .gub-note-pill')) return;
    const x = e.clientX;
    const y = e.clientY;
    for (const [name, highlight] of CSS.highlights.entries()) {
      if (!name.startsWith('gub-hl-')) continue;
      for (const range of highlight) {
        for (const rect of range.getClientRects()) {
          if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) continue;
          const matchEl = [...document.querySelectorAll('.gub-note-pill[data-note-id], .gub-note[data-note-id]')]
            .find(el => hlKey(el.dataset.noteId) === name);
          if (matchEl) {
            e.preventDefault();
            e.stopPropagation();
            expandNote(matchEl.dataset.noteId);
          }
          return;
        }
      }
    }
  }, true);

  // ---- Rendering ----

  function renderNote(note) {
    const now = new Date().toISOString();
    if (!note.id) note.id = `${Date.now()}-${Math.random()}`;
    if (!note.createdAt) note.createdAt = now;
    if (!note.updatedAt) note.updatedAt = now;
    if (!note.tags) note.tags = [];
    if (note.collapsed === undefined) note.collapsed = true;

    if (document.querySelector(`[data-note-id="${atrId(note.id)}"]`)) return;

    if (note.anchorSelector) {
      highlightElementBySelector(note.anchorSelector, note.id, note.color);
    } else if (note.media?.src || note.mediaSrc) {
      highlightMediaBySrc(note.media?.src || note.mediaSrc, note.id, note.color);
    } else if (note.anchorText) {
      highlightTextOnPage(note.anchorText, note.id, note.color);
    }

    if (note.collapsed) renderPill(note);
    else renderExpanded(note);
  }

  function renderPill(note) {
    const existing = document.querySelector(`[data-note-id="${atrId(note.id)}"]`);
    if (existing) existing.remove();

    const pill = document.createElement('div');
    pill.className = 'gub-note-pill';
    pill.dataset.noteId = note.id;
    pill.style.left = `${note.x}px`;
    pill.style.top = `${note.y}px`;
    pill.style.borderLeftColor = note.color || '#fde68a';
    pill.title = note.title || note.content?.substring(0, 50) || 'Note';

    const icon = note.media ? (note.media.type === 'image' ? '🖼️' : '🎥') : (note.anchorText || note.anchorSelector ? '📌' : '📝');
    const label = note.title || note.content?.substring(0, 30) || 'Untitled';
    pill.innerHTML = `<span class="gub-pill-icon">${icon}</span><span class="gub-pill-label">${escapeHtml(label)}</span>`;

    let dragMoved = false;
    pill.addEventListener('click', (e) => {
      e.stopPropagation();
      if (dragMoved) return;
      note.collapsed = false;
      persistNote(note, true);
      pill.remove();
      renderExpanded(note);
    });

    pill.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return;
      dragMoved = false;
      const ox = e.clientX - pill.offsetLeft, oy = e.clientY - pill.offsetTop;
      const onMove = (ev) => {
        dragMoved = true;
        note.x = Math.max(0, ev.clientX - ox);
        note.y = Math.max(0, ev.clientY - oy);
        pill.style.left = note.x + 'px';
        pill.style.top = note.y + 'px';
      };
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', () => {
        document.removeEventListener('mousemove', onMove);
        if (dragMoved) persistNote(note, true);
      }, { once: true });
    });

    document.body.appendChild(pill);
  }

  function renderExpanded(note) {
    const existing = document.querySelector(`[data-note-id="${atrId(note.id)}"]`);
    if (existing) existing.remove();

    const el = document.createElement('div');
    el.className = 'gub-note';
    el.dataset.noteId = note.id;
    el.style.left = `${note.x}px`;
    el.style.top = `${note.y}px`;

    const accentColor = note.color || '#fde68a';
    const anchorHint = note.anchorText
      ? escapeHtml(note.anchorText.substring(0, 60)) + (note.anchorText.length > 60 ? '…' : '')
      : (note.anchorSelector ? escapeHtml(note.anchorSelector.substring(0, 60)) : '');

    el.innerHTML = `
      <div class="gub-note-header" style="border-bottom-color:${accentColor};">
        <input class="gub-note-title" value="${escapeHtml(note.title || '')}" placeholder="Title..." spellcheck="false">
        <div class="gub-note-actions">
          <button type="button" class="gub-note-btn" data-act="collapse" title="Minimize — saves content">▾</button>
          <button type="button" class="gub-note-btn" data-act="delete" title="Delete note and highlights">✕</button>
        </div>
      </div>
      ${note.media ? `<div class="gub-note-media">${note.media.type === 'image' ? `<img src="${escapeHtml(note.media.src)}" alt="">` : `<div class="gub-note-media-video">🎥 ${escapeHtml(note.media.src?.substring(0, 60) || 'Video')}</div>`}</div>` : ''}
      ${anchorHint ? `<div class="gub-note-anchor" title="Anchored selection">📌 <em>${anchorHint}</em></div>` : ''}
      <div class="gub-note-toolbar">
        <button type="button" data-fmt="**" title="Bold"><b>B</b></button>
        <button type="button" data-fmt="*" title="Italic"><i>I</i></button>
        <button type="button" data-fmt="\`" title="Code"><code>⌘</code></button>
        <button type="button" data-fmt="~~" title="Strike"><s>S</s></button>
        <button type="button" data-pre="- " title="List">☰</button>
        <button type="button" data-pre=">" title="Quote">❝</button>
        <button type="button" data-link title="Link">🔗</button>
        <span class="gub-toolbar-spacer"></span>
        <button type="button" data-act="hl-text" title="Highlight the current page text selection in this note’s colour">🖍 Text</button>
        <button type="button" data-act="hl-el" title="Highlight the last right-clicked element in this note’s colour">⬚ El</button>
        <span class="gub-toolbar-spacer"></span>
        ${buildColorDots(accentColor)}
      </div>
      <textarea class="gub-note-editor" spellcheck="false" placeholder="Write markdown…">${escapeHtml(note.content || '')}</textarea>
      <div class="gub-note-preview">${sanitizeHtml(typeof marked !== 'undefined' ? marked.parse(note.content || '') : (note.content || ''))}</div>
      <div class="gub-note-footer">
        <div class="gub-note-tags">${(note.tags || []).map(t => `<span class="gub-tag">${escapeHtml(t)} <span class="gub-tag-x" data-tag="${escapeHtml(t)}">×</span></span>`).join('')}<input class="gub-tag-input" placeholder="+ tag" spellcheck="false"></div>
        <div class="gub-note-meta">
          <button type="button" class="gub-note-btn-sm" data-act="remind" title="Set reminder">⏰</button>
          <button type="button" class="gub-note-btn-sm" data-act="copy" title="Copy note">📋</button>
          <span class="gub-note-time" title="${new Date(note.createdAt).toLocaleString()}">${formatRelativeTime(note.updatedAt)}</span>
        </div>
      </div>
    `;

    document.body.appendChild(el);
    bindNoteEvents(el, note);
  }

  function buildColorDots(active) {
    const colors = ['#fde68a', '#bfdbfe', '#bbf7d0', '#fecaca', '#e9d5ff', '#f1f5f9'];
    return colors.map(c => `<span class="gub-color-dot${c === active ? ' gub-active' : ''}" data-color="${c}" style="background:${c};" title="Note colour"></span>`).join('');
  }

  function bindNoteEvents(el, note) {
    const titleInput = el.querySelector('.gub-note-title');
    const editor = el.querySelector('.gub-note-editor');
    const preview = el.querySelector('.gub-note-preview');
    let editMode = false;

    const saveFromDom = (immediate) => {
      syncNoteFromDom(el, note);
      persistNote(note, immediate);
      if (preview && !editMode) {
        preview.innerHTML = sanitizeHtml(typeof marked !== 'undefined' ? marked.parse(note.content || '') : (note.content || ''));
      }
      const timeEl = el.querySelector('.gub-note-time');
      if (timeEl) timeEl.textContent = formatRelativeTime(note.updatedAt);
    };

    preview.addEventListener('click', () => {
      editMode = true;
      editor.style.display = 'block';
      preview.style.display = 'none';
      editor.focus();
    });

    editor.addEventListener('input', () => {
      note.content = editor.value;
      persistNote(note, false);
    });

    editor.addEventListener('blur', () => {
      setTimeout(() => {
        // Keep edit mode if focus moved to toolbar inside note
        if (el.contains(document.activeElement)) return;
        editMode = false;
        saveFromDom(true);
        preview.innerHTML = sanitizeHtml(typeof marked !== 'undefined' ? marked.parse(note.content || '') : (note.content || ''));
        editor.style.display = 'none';
        preview.style.display = '';
      }, 180);
    });

    titleInput.addEventListener('input', () => {
      note.title = titleInput.value;
      persistNote(note, false);
    });

    el.querySelector('[data-act="collapse"]').addEventListener('click', () => {
      syncNoteFromDom(el, note);
      note.collapsed = true;
      persistNote(note, true);
      el.remove();
      renderPill(note);
    });

    el.querySelector('[data-act="delete"]').addEventListener('click', () => {
      clearTimer(note.id);
      removeHighlightsForNote(note.id);
      deleteNote(note.id);
      el.remove();
    });

    el.querySelector('[data-act="hl-text"]')?.addEventListener('mousedown', (e) => {
      e.preventDefault(); // keep selection; avoid stealing focus before read
    });
    el.querySelector('[data-act="hl-text"]')?.addEventListener('click', (e) => {
      e.preventDefault();
      if (highlightCurrentSelection(note)) {
        syncNoteFromDom(el, note);
        persistNote(note, true);
        // Refresh anchor strip
        let anchor = el.querySelector('.gub-note-anchor');
        if (!anchor) {
          anchor = document.createElement('div');
          anchor.className = 'gub-note-anchor';
          el.querySelector('.gub-note-toolbar')?.before(anchor);
        }
        anchor.innerHTML = `📌 <em>${escapeHtml(note.anchorText.substring(0, 60))}${note.anchorText.length > 60 ? '…' : ''}</em>`;
        toast('Text highlighted');
      }
    });

    el.querySelector('[data-act="hl-el"]')?.addEventListener('click', (e) => {
      e.preventDefault();
      if (highlightCurrentElement(note)) {
        syncNoteFromDom(el, note);
        persistNote(note, true);
        toast('Element highlighted');
      }
    });

    el.querySelectorAll('[data-fmt]').forEach(btn => {
      btn.addEventListener('mousedown', (e) => e.preventDefault());
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        if (!editMode) { preview.click(); }
        const wrap = btn.dataset.fmt;
        const s = editor.selectionStart, end = editor.selectionEnd;
        const sel = editor.value.substring(s, end);
        editor.value = editor.value.substring(0, s) + wrap + sel + wrap + editor.value.substring(end);
        editor.selectionStart = s + wrap.length;
        editor.selectionEnd = end + wrap.length;
        note.content = editor.value;
        persistNote(note, false);
        editor.focus();
      });
    });

    el.querySelectorAll('[data-pre]').forEach(btn => {
      btn.addEventListener('mousedown', (e) => e.preventDefault());
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        if (!editMode) { preview.click(); }
        const pre = btn.dataset.pre;
        const s = editor.selectionStart;
        const lineStart = editor.value.lastIndexOf('\n', s - 1) + 1;
        editor.value = editor.value.substring(0, lineStart) + pre + editor.value.substring(lineStart);
        note.content = editor.value;
        persistNote(note, false);
        editor.focus();
      });
    });

    el.querySelector('[data-link]')?.addEventListener('click', (e) => {
      e.preventDefault();
      if (!editMode) { preview.click(); }
      const url = prompt('URL:');
      if (!url) return;
      const s = editor.selectionStart, end = editor.selectionEnd;
      const text = editor.value.substring(s, end) || 'link';
      editor.value = editor.value.substring(0, s) + `[${text}](${url})` + editor.value.substring(end);
      note.content = editor.value;
      persistNote(note, false);
      editor.focus();
    });

    el.querySelectorAll('.gub-color-dot').forEach(dot => {
      dot.addEventListener('click', () => {
        note.color = dot.dataset.color;
        syncNoteFromDom(el, note);
        persistNote(note, true);
        el.querySelectorAll('.gub-color-dot').forEach(d => d.classList.remove('gub-active'));
        dot.classList.add('gub-active');
        el.querySelector('.gub-note-header').style.borderBottomColor = note.color;
        const pillBorder = document.querySelector(`.gub-note-pill[data-note-id="${atrId(note.id)}"]`);
        if (pillBorder) pillBorder.style.borderLeftColor = note.color;
        updateNoteHighlightColors(note.id, note.color);
      });
    });

    const tagInput = el.querySelector('.gub-tag-input');
    tagInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && tagInput.value.trim()) {
        e.preventDefault();
        const tag = tagInput.value.trim().toLowerCase();
        if (!note.tags.includes(tag)) {
          note.tags.push(tag);
          syncNoteFromDom(el, note);
          persistNote(note, true);
          refreshTags(el, note);
        }
        tagInput.value = '';
      }
    });

    el.querySelectorAll('.gub-tag-x').forEach(x => {
      x.addEventListener('click', () => {
        note.tags = note.tags.filter(t => t !== x.dataset.tag);
        persistNote(note, true);
        refreshTags(el, note);
      });
    });

    el.querySelector('[data-act="remind"]')?.addEventListener('click', () => {
      const when = prompt('Remind me in (e.g. 30m, 2h, 1d):');
      if (!when) return;
      const ms = parseTimeStr(when);
      if (!ms) return;
      syncNoteFromDom(el, note);
      note.reminder = Date.now() + ms;
      persistNote(note, true);
      chrome.runtime.sendMessage({ action: 'setNoteReminder', noteId: note.id, url: note.url, title: note.title || 'Note', delayMs: ms });
      toast(`Reminder set for ${when}`);
    });

    el.querySelector('[data-act="copy"]')?.addEventListener('click', () => {
      syncNoteFromDom(el, note);
      navigator.clipboard.writeText(note.content || '').then(() => toast('Copied'));
    });

    const header = el.querySelector('.gub-note-header');
    header.addEventListener('mousedown', (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'BUTTON') return;
      let moved = false;
      const ox = e.clientX - el.offsetLeft, oy = e.clientY - el.offsetTop;
      const onMove = (ev) => {
        moved = true;
        note.x = Math.max(0, ev.clientX - ox);
        note.y = Math.max(0, ev.clientY - oy);
        el.style.left = note.x + 'px';
        el.style.top = note.y + 'px';
      };
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', () => {
        document.removeEventListener('mousemove', onMove);
        if (moved) {
          syncNoteFromDom(el, note);
          persistNote(note, true);
        }
      }, { once: true });
    });
  }

  function refreshTags(el, note) {
    const container = el.querySelector('.gub-note-tags');
    const input = container.querySelector('.gub-tag-input');
    container.innerHTML = '';
    note.tags.forEach(t => {
      const span = document.createElement('span');
      span.className = 'gub-tag';
      span.innerHTML = `${escapeHtml(t)} <span class="gub-tag-x">×</span>`;
      span.querySelector('.gub-tag-x').addEventListener('click', () => {
        note.tags = note.tags.filter(x => x !== t);
        persistNote(note, true);
        refreshTags(el, note);
      });
      container.appendChild(span);
    });
    container.appendChild(input);
  }

  function sanitizeHtml(html) {
    const div = document.createElement('div');
    div.innerHTML = html;
    div.querySelectorAll('script,iframe,object,embed').forEach(e => e.remove());
    div.querySelectorAll('*').forEach(e => {
      for (const a of [...e.attributes]) {
        if (a.name.startsWith('on') || a.value.trim().toLowerCase().startsWith('javascript:')) e.removeAttribute(a.name);
      }
    });
    return div.innerHTML;
  }

  function formatRelativeTime(ts) {
    const s = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
    if (s < 60) return 'now';
    if (s < 3600) return `${Math.floor(s / 60)}m`;
    if (s < 86400) return `${Math.floor(s / 3600)}h`;
    if (s < 604800) return `${Math.floor(s / 86400)}d`;
    return new Date(ts).toLocaleDateString();
  }

  function parseTimeStr(s) {
    const m = s.match(/^(\d+)\s*(m|min|h|hr|hour|d|day)s?$/i);
    if (!m) return null;
    const n = parseInt(m[1]);
    const unit = m[2].toLowerCase();
    if (unit.startsWith('m')) return n * 60000;
    if (unit.startsWith('h')) return n * 3600000;
    if (unit.startsWith('d')) return n * 86400000;
    return null;
  }

  function clearTimer(id) {
    const t = activeTimers.get(id);
    if (t) { clearInterval(t); activeTimers.delete(id); }
  }

  function toast(msg) {
    const n = document.createElement('div');
    n.textContent = msg;
    n.style.cssText = 'position:fixed!important;top:20px!important;right:20px!important;background:#1e293b!important;color:white!important;padding:10px 18px!important;border-radius:8px!important;z-index:1000001!important;font-size:13px!important;font-family:sans-serif!important;box-shadow:0 4px 12px rgba(0,0,0,0.2)!important;';
    document.body.appendChild(n);
    setTimeout(() => n.remove(), 2000);
  }

  function escapeHtml(text) {
    const d = document.createElement('div');
    d.textContent = text || '';
    return d.innerHTML;
  }

  // Don't rely only on background push (often races content-script inject)
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => pullNotesFromBackground(0), { once: true });
  } else {
    pullNotesFromBackground(0);
  }
})();
