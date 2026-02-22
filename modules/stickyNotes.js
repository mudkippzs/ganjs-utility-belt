(() => {
  let lastRightClickCoords = { x: 100, y: 100 };
  let lastRightClickTarget = null;
  const activeTimers = new Map();

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
      const target = lastRightClickTarget;
      let media = null;
      if (target?.tagName === 'IMG') media = { type: 'image', src: target.src, alt: target.alt || '' };
      else if (target?.tagName === 'VIDEO') media = { type: 'video', src: target.src || target.querySelector('source')?.src || '' };
      sendResponse({ coords: lastRightClickCoords, selection: sel, media });
      return;
    }
    if (message.action === 'restoreStickyNotes' && Array.isArray(message.notes)) {
      message.notes.forEach(n => renderNote(n));
      restoreHighlights(message.notes);
    }
  });

  // ---- Storage ----

  function persistNote(note) {
    chrome.storage.local.get({ stickyNotes: [] }, ({ stickyNotes }) => {
      note.url = window.location.origin + window.location.pathname;
      const i = stickyNotes.findIndex(n => n.id === note.id);
      if (i > -1) stickyNotes[i] = note;
      else stickyNotes.push(note);
      chrome.storage.local.set({ stickyNotes });
    });
  }

  function deleteNote(noteId) {
    chrome.storage.local.get({ stickyNotes: [] }, ({ stickyNotes }) => {
      chrome.storage.local.set({ stickyNotes: stickyNotes.filter(n => n.id !== noteId) });
    });
  }

  // ---- Highlight anchoring ----

  function restoreHighlights(notes) {
    notes.filter(n => n.anchorText).forEach(n => {
      highlightTextOnPage(n.anchorText, n.id, n.color);
    });
  }

  function highlightTextOnPage(text, noteId, color) {
    if (!text || text.length < 3) return;
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let node;
    while (node = walker.nextNode()) {
      const idx = node.textContent.indexOf(text);
      if (idx === -1) continue;
      if (node.parentElement.closest('.gub-note, .gub-note-pill')) continue;

      const range = document.createRange();
      range.setStart(node, idx);
      range.setEnd(node, idx + text.length);
      const mark = document.createElement('mark');
      mark.className = 'gub-highlight';
      mark.dataset.noteId = noteId;
      mark.style.backgroundColor = color || '#fde68a';
      mark.style.cursor = 'pointer';
      mark.style.borderRadius = '2px';
      mark.style.padding = '1px 0';
      mark.addEventListener('click', () => {
        const el = document.querySelector(`[data-note-id="${noteId}"]`);
        if (el) { expandNote(noteId); el.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
      });
      range.surroundContents(mark);
      break;
    }
  }

  function expandNote(noteId) {
    const pill = document.querySelector(`.gub-note-pill[data-note-id="${noteId}"]`);
    if (pill) pill.click();
  }

  // ---- Rendering ----

  function renderNote(note) {
    const now = new Date().toISOString();
    if (!note.id) note.id = `${Date.now()}-${Math.random()}`;
    if (!note.createdAt) note.createdAt = now;
    if (!note.updatedAt) note.updatedAt = now;
    if (!note.tags) note.tags = [];
    if (note.collapsed === undefined) note.collapsed = true;

    if (document.querySelector(`[data-note-id="${note.id}"]`)) return;

    if (note.anchorText) highlightTextOnPage(note.anchorText, note.id, note.color);

    if (note.collapsed) {
      renderPill(note);
    } else {
      renderExpanded(note);
    }
  }

  // ---- Pill (minimized) ----

  function renderPill(note) {
    const existing = document.querySelector(`[data-note-id="${note.id}"]`);
    if (existing) existing.remove();

    const pill = document.createElement('div');
    pill.className = 'gub-note-pill';
    pill.dataset.noteId = note.id;
    pill.style.left = `${note.x}px`;
    pill.style.top = `${note.y}px`;
    pill.style.borderLeftColor = note.color || '#fde68a';
    pill.title = note.title || note.content?.substring(0, 50) || 'Note';

    const icon = note.media ? (note.media.type === 'image' ? '🖼️' : '🎥') : (note.anchorText ? '📌' : '📝');
    const label = note.title || note.content?.substring(0, 30) || 'Untitled';
    pill.innerHTML = `<span class="gub-pill-icon">${icon}</span><span class="gub-pill-label">${escapeHtml(label)}</span>`;

    pill.addEventListener('click', (e) => {
      e.stopPropagation();
      note.collapsed = false;
      persistNote(note);
      pill.remove();
      renderExpanded(note);
    });

    // Drag
    pill.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return;
      let moved = false;
      const ox = e.clientX - pill.offsetLeft, oy = e.clientY - pill.offsetTop;
      const onMove = (e) => {
        moved = true;
        note.x = e.clientX - ox; note.y = e.clientY - oy;
        pill.style.left = note.x + 'px'; pill.style.top = note.y + 'px';
      };
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', () => {
        document.removeEventListener('mousemove', onMove);
        if (moved) persistNote(note);
      }, { once: true });
    });

    document.body.appendChild(pill);
  }

  // ---- Expanded note ----

  function renderExpanded(note) {
    const existing = document.querySelector(`[data-note-id="${note.id}"]`);
    if (existing) existing.remove();

    const el = document.createElement('div');
    el.className = 'gub-note';
    el.dataset.noteId = note.id;
    el.style.left = `${note.x}px`;
    el.style.top = `${note.y}px`;

    const accentColor = note.color || '#fde68a';

    el.innerHTML = `
      <div class="gub-note-header" style="border-bottom-color:${accentColor};">
        <input class="gub-note-title" value="${escapeHtml(note.title || '')}" placeholder="Title..." spellcheck="false">
        <div class="gub-note-actions">
          <button class="gub-note-btn" data-act="collapse" title="Minimize">▾</button>
          <button class="gub-note-btn" data-act="delete" title="Delete">✕</button>
        </div>
      </div>
      ${note.media ? `<div class="gub-note-media">${note.media.type === 'image' ? `<img src="${escapeHtml(note.media.src)}" style="max-width:100%;max-height:120px;border-radius:4px;">` : `<div style="font-size:12px;color:var(--ganj-text-muted,#64748b);">🎥 ${escapeHtml(note.media.src?.substring(0, 60) || 'Video')}</div>`}</div>` : ''}
      ${note.anchorText ? `<div class="gub-note-anchor" title="Anchored text">📌 <em>${escapeHtml(note.anchorText.substring(0, 60))}${note.anchorText.length > 60 ? '…' : ''}</em></div>` : ''}
      <div class="gub-note-toolbar">
        <button data-fmt="**" title="Bold"><b>B</b></button>
        <button data-fmt="*" title="Italic"><i>I</i></button>
        <button data-fmt="\`" title="Code"><code>⌘</code></button>
        <button data-fmt="~~" title="Strike"><s>S</s></button>
        <button data-pre="- " title="List">☰</button>
        <button data-pre=">" title="Quote">❝</button>
        <button data-link title="Link">🔗</button>
        <span style="flex:1;"></span>
        ${buildColorDots(accentColor)}
      </div>
      <textarea class="gub-note-editor" spellcheck="false" placeholder="Write markdown...">${escapeHtml(note.content || '')}</textarea>
      <div class="gub-note-preview">${sanitizeHtml(marked.parse(note.content || ''))}</div>
      <div class="gub-note-footer">
        <div class="gub-note-tags">${(note.tags || []).map(t => `<span class="gub-tag">${escapeHtml(t)} <span class="gub-tag-x" data-tag="${escapeHtml(t)}">×</span></span>`).join('')}<input class="gub-tag-input" placeholder="+ tag" spellcheck="false"></div>
        <div class="gub-note-meta">
          <button class="gub-note-btn-sm" data-act="remind" title="Set reminder">⏰</button>
          <button class="gub-note-btn-sm" data-act="copy" title="Copy note">📋</button>
          <span class="gub-note-time" title="${new Date(note.createdAt).toLocaleString()}">${formatRelativeTime(note.updatedAt)}</span>
        </div>
      </div>
    `;

    document.body.appendChild(el);
    bindNoteEvents(el, note);
  }

  function buildColorDots(active) {
    const colors = ['#fde68a', '#bfdbfe', '#bbf7d0', '#fecaca', '#e9d5ff', '#f1f5f9'];
    return colors.map(c => `<span class="gub-color-dot${c === active ? ' active' : ''}" data-color="${c}" style="background:${c};"></span>`).join('');
  }

  function bindNoteEvents(el, note) {
    const titleInput = el.querySelector('.gub-note-title');
    const editor = el.querySelector('.gub-note-editor');
    const preview = el.querySelector('.gub-note-preview');
    let editMode = false;

    // Toggle edit/preview
    preview.addEventListener('click', () => {
      editMode = true;
      editor.style.display = 'block';
      preview.style.display = 'none';
      editor.focus();
    });

    editor.addEventListener('blur', () => {
      setTimeout(() => {
        editMode = false;
        note.content = editor.value;
        note.updatedAt = new Date().toISOString();
        persistNote(note);
        preview.innerHTML = sanitizeHtml(marked.parse(note.content || ''));
        editor.style.display = 'none';
        preview.style.display = '';
        el.querySelector('.gub-note-time').textContent = formatRelativeTime(note.updatedAt);
      }, 150);
    });

    titleInput.addEventListener('input', () => {
      note.title = titleInput.value;
      note.updatedAt = new Date().toISOString();
      persistNote(note);
    });

    // Actions
    el.querySelector('[data-act="collapse"]').addEventListener('click', () => {
      note.collapsed = true;
      persistNote(note);
      el.remove();
      renderPill(note);
    });

    el.querySelector('[data-act="delete"]').addEventListener('click', () => {
      clearTimer(note.id);
      document.querySelectorAll(`.gub-highlight[data-note-id="${note.id}"]`).forEach(m => {
        const parent = m.parentNode;
        parent.replaceChild(document.createTextNode(m.textContent), m);
        parent.normalize();
      });
      deleteNote(note.id);
      el.remove();
    });

    // Formatting toolbar
    el.querySelectorAll('[data-fmt]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        if (!editMode) { preview.click(); return; }
        const wrap = btn.dataset.fmt;
        const s = editor.selectionStart, end = editor.selectionEnd;
        const sel = editor.value.substring(s, end);
        editor.value = editor.value.substring(0, s) + wrap + sel + wrap + editor.value.substring(end);
        editor.selectionStart = s + wrap.length;
        editor.selectionEnd = end + wrap.length;
        editor.focus();
      });
    });

    el.querySelectorAll('[data-pre]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        if (!editMode) { preview.click(); return; }
        const pre = btn.dataset.pre;
        const s = editor.selectionStart;
        const lineStart = editor.value.lastIndexOf('\n', s - 1) + 1;
        editor.value = editor.value.substring(0, lineStart) + pre + editor.value.substring(lineStart);
        editor.focus();
      });
    });

    el.querySelector('[data-link]')?.addEventListener('click', (e) => {
      e.preventDefault();
      if (!editMode) { preview.click(); return; }
      const url = prompt('URL:');
      if (!url) return;
      const s = editor.selectionStart, end = editor.selectionEnd;
      const text = editor.value.substring(s, end) || 'link';
      editor.value = editor.value.substring(0, s) + `[${text}](${url})` + editor.value.substring(end);
      editor.focus();
    });

    // Color dots
    el.querySelectorAll('.gub-color-dot').forEach(dot => {
      dot.addEventListener('click', () => {
        note.color = dot.dataset.color;
        persistNote(note);
        el.querySelectorAll('.gub-color-dot').forEach(d => d.classList.remove('active'));
        dot.classList.add('active');
        el.querySelector('.gub-note-header').style.borderBottomColor = note.color;
      });
    });

    // Tags
    const tagInput = el.querySelector('.gub-tag-input');
    tagInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && tagInput.value.trim()) {
        e.preventDefault();
        const tag = tagInput.value.trim().toLowerCase();
        if (!note.tags.includes(tag)) {
          note.tags.push(tag);
          persistNote(note);
          refreshTags(el, note);
        }
        tagInput.value = '';
      }
    });

    el.querySelectorAll('.gub-tag-x').forEach(x => {
      x.addEventListener('click', () => {
        note.tags = note.tags.filter(t => t !== x.dataset.tag);
        persistNote(note);
        refreshTags(el, note);
      });
    });

    // Reminder
    el.querySelector('[data-act="remind"]')?.addEventListener('click', () => {
      const when = prompt('Remind me in (e.g. 30m, 2h, 1d):');
      if (!when) return;
      const ms = parseTimeStr(when);
      if (!ms) return;
      note.reminder = Date.now() + ms;
      persistNote(note);
      chrome.runtime.sendMessage({ action: 'setNoteReminder', noteId: note.id, url: note.url, title: note.title || 'Note', delayMs: ms });
      toast(`Reminder set for ${when}`);
    });

    // Copy
    el.querySelector('[data-act="copy"]')?.addEventListener('click', () => {
      navigator.clipboard.writeText(note.content || '').then(() => toast('Copied'));
    });

    // Drag
    const header = el.querySelector('.gub-note-header');
    header.addEventListener('mousedown', (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'BUTTON') return;
      let moved = false;
      const ox = e.clientX - el.offsetLeft, oy = e.clientY - el.offsetTop;
      const onMove = (ev) => {
        moved = true;
        note.x = ev.clientX - ox; note.y = ev.clientY - oy;
        el.style.left = note.x + 'px'; el.style.top = note.y + 'px';
      };
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', () => {
        document.removeEventListener('mousemove', onMove);
        if (moved) persistNote(note);
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
        persistNote(note);
        refreshTags(el, note);
      });
      container.appendChild(span);
    });
    container.appendChild(input);
  }

  // ---- Utilities ----

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
    n.style.cssText = 'position:fixed!important;top:20px!important;right:20px!important;background:#1e293b!important;color:white!important;padding:10px 18px!important;border-radius:8px!important;z-index:1000001!important;font-size:13px!important;font-family:var(--ganj-font-sans)!important;box-shadow:0 4px 12px rgba(0,0,0,0.2)!important;';
    document.body.appendChild(n);
    setTimeout(() => n.remove(), 2000);
  }

  function escapeHtml(text) {
    const d = document.createElement('div');
    d.textContent = text || '';
    return d.innerHTML;
  }
})();
