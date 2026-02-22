(() => {
  let lastRightClickCoords = { x: 100, y: 100 };
  const activeIntervals = new Map();

  document.addEventListener('contextmenu', (e) => {
    lastRightClickCoords = { x: e.pageX, y: e.pageY };
  });

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'getClickPosition') {
      sendResponse(lastRightClickCoords);
      return;
    }
    if (message.action === 'restoreStickyNotes' && Array.isArray(message.notes)) {
      message.notes.forEach(renderStickyNote);
    }
  });

  function persistNote(note) {
    chrome.storage.local.get({ stickyNotes: [] }, ({ stickyNotes }) => {
      note.url = window.location.origin + window.location.pathname;
      const index = stickyNotes.findIndex(n => n.id === note.id);
      if (index > -1) {
        stickyNotes[index] = note;
      } else {
        stickyNotes.push(note);
      }
      chrome.storage.local.set({ stickyNotes });
    });
  }

  function saveNote(note, updateFooter) {
    note.updatedAt = new Date().toISOString();
    persistNote(note);
    if (typeof updateFooter === 'function') updateFooter();
  }

  function sanitizeHtml(html) {
    const div = document.createElement('div');
    div.innerHTML = html;
    div.querySelectorAll('script, iframe, object, embed, link[rel="import"]').forEach(el => el.remove());
    div.querySelectorAll('*').forEach(el => {
      for (const attr of [...el.attributes]) {
        if (attr.name.startsWith('on') || attr.value.trim().toLowerCase().startsWith('javascript:')) {
          el.removeAttribute(attr.name);
        }
      }
    });
    return div.innerHTML;
  }

  function renderMarkdown(content) {
    return sanitizeHtml(marked.parse(content || ''));
  }

  function formatRelativeTime(timestamp) {
    const seconds = Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000);
    if (seconds < 5) return 'just now';
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return new Date(timestamp).toLocaleDateString();
  }

  function cleanupNote(noteId) {
    const intervalId = activeIntervals.get(noteId);
    if (intervalId) {
      clearInterval(intervalId);
      activeIntervals.delete(noteId);
    }
  }

  function renderStickyNote(note) {
    const now = new Date().toISOString();
    if (!note.id) note.id = `${Date.now()}-${Math.random()}`;
    if (!note.createdAt) note.createdAt = now;
    if (!note.updatedAt) note.updatedAt = now;
    if (note.collapsed === undefined) note.collapsed = false;
    if (note.pinned === undefined) note.pinned = false;

    if (document.querySelector(`[data-note-id="${note.id}"]`)) return;

    const noteEl = document.createElement('div');
    noteEl.className = 'gub-sticky-note' + (note.pinned ? ' pinned' : '');
    noteEl.dataset.noteId = note.id;
    noteEl.style.left = `${note.x}px`;
    noteEl.style.top = `${note.y}px`;
    noteEl.style.background = note.color;
    noteEl.style.fontFamily = note.font;

    // Header
    const headerRow = document.createElement('div');
    headerRow.className = 'gub-sticky-header';

    const collapseBtn = document.createElement('button');
    collapseBtn.className = 'gub-sticky-btn';
    collapseBtn.textContent = note.collapsed ? '+' : '-';

    const rightControls = document.createElement('div');
    rightControls.className = 'gub-sticky-controls';

    const duplicateBtn = document.createElement('button');
    duplicateBtn.className = 'gub-sticky-btn';
    duplicateBtn.textContent = '📝';
    duplicateBtn.title = 'Duplicate';
    duplicateBtn.onclick = () => {
      const copy = { ...note, id: `${Date.now()}-${Math.random()}`, x: note.x + 20, y: note.y + 20, title: (note.title || '') + ' (Copy)' };
      renderStickyNote(copy);
      persistNote(copy);
    };

    const pinBtn = document.createElement('button');
    pinBtn.className = 'gub-sticky-btn';
    pinBtn.textContent = note.pinned ? '📌' : '📍';
    pinBtn.onclick = () => {
      note.pinned = !note.pinned;
      noteEl.classList.toggle('pinned', note.pinned);
      pinBtn.textContent = note.pinned ? '📌' : '📍';
      persistNote(note);
    };

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'gub-sticky-btn gub-sticky-delete';
    deleteBtn.textContent = '✖';
    deleteBtn.onclick = () => {
      cleanupNote(note.id);
      chrome.storage.local.get({ stickyNotes: [] }, ({ stickyNotes }) => {
        chrome.storage.local.set({ stickyNotes: stickyNotes.filter(n => n.id !== note.id) }, () => {
          noteEl.remove();
        });
      });
    };

    collapseBtn.onclick = () => {
      note.collapsed = !note.collapsed;
      collapseBtn.textContent = note.collapsed ? '+' : '-';
      updateVisibility();
      persistNote(note);
    };

    rightControls.append(duplicateBtn, pinBtn, deleteBtn);
    headerRow.append(collapseBtn, rightControls);

    // Toolbar
    const toolbar = document.createElement('div');
    toolbar.className = 'gub-sticky-toolbar';
    if (note.collapsed) toolbar.style.display = 'none';

    const COLORS = ['#fffae6', '#e6faff', '#e6ffe6', '#fff0f5', '#f0f0f0', '#fdd'];
    const colorPicker = document.createElement('div');
    colorPicker.className = 'gub-color-picker';
    COLORS.forEach(color => {
      const swatch = document.createElement('div');
      swatch.className = 'gub-color-swatch' + (color === note.color ? ' active' : '');
      swatch.style.background = color;
      swatch.onclick = () => {
        note.color = color;
        noteEl.style.background = color;
        persistNote(note);
        colorPicker.querySelectorAll('.gub-color-swatch').forEach(s => s.classList.remove('active'));
        swatch.classList.add('active');
      };
      colorPicker.appendChild(swatch);
    });

    const FONTS = ['Arial', 'Courier New', 'Georgia', 'Times New Roman'];
    const fontPicker = document.createElement('div');
    fontPicker.className = 'gub-font-picker';
    FONTS.forEach(font => {
      const label = document.createElement('span');
      label.textContent = font.split(' ')[0];
      label.className = 'gub-font-option' + (font === note.font ? ' active' : '');
      label.style.fontFamily = font;
      label.onclick = () => {
        note.font = font;
        noteEl.style.fontFamily = font;
        persistNote(note);
        fontPicker.querySelectorAll('.gub-font-option').forEach(l => l.classList.remove('active'));
        label.classList.add('active');
      };
      fontPicker.appendChild(label);
    });

    toolbar.append(colorPicker, fontPicker);

    // Title
    const titleInput = document.createElement('input');
    titleInput.type = 'text';
    titleInput.className = 'gub-sticky-title';
    titleInput.placeholder = 'Note Title';
    titleInput.value = note.title || '';
    if (note.collapsed) titleInput.style.display = 'none';
    titleInput.oninput = () => {
      note.title = titleInput.value;
      saveNote(note, updateFooter);
    };

    // Content
    const textarea = document.createElement('textarea');
    textarea.className = 'gub-sticky-textarea';
    textarea.value = note.content || '';

    const preview = document.createElement('div');
    preview.className = 'gub-sticky-preview';
    if (note.collapsed) preview.style.display = 'none';
    preview.innerHTML = renderMarkdown(note.content);

    preview.onclick = () => {
      preview.style.display = 'none';
      textarea.style.display = 'block';
      textarea.focus();
    };

    textarea.onblur = () => {
      note.content = textarea.value;
      saveNote(note, updateFooter);
      preview.innerHTML = renderMarkdown(note.content);
      textarea.style.display = 'none';
      preview.style.display = note.collapsed ? 'none' : 'block';
    };

    // Footer
    const footer = document.createElement('div');
    footer.className = 'gub-sticky-footer';

    function updateFooter() {
      footer.textContent = `Created: ${formatRelativeTime(note.createdAt)} · Edited: ${formatRelativeTime(note.updatedAt)}`;
    }
    updateFooter();
    const intervalId = setInterval(updateFooter, 60000);
    activeIntervals.set(note.id, intervalId);

    function updateVisibility() {
      const visible = !note.collapsed;
      toolbar.style.display = visible ? '' : 'none';
      titleInput.style.display = visible ? '' : 'none';
      preview.style.display = visible ? '' : 'none';
      textarea.style.display = 'none';
    }

    noteEl.append(headerRow, toolbar, titleInput, preview, textarea, footer);

    // Drag
    noteEl.onmousedown = (e) => {
      if (['TEXTAREA', 'SELECT', 'INPUT', 'BUTTON'].includes(e.target.tagName)) return;
      const offsetX = e.clientX - noteEl.offsetLeft;
      const offsetY = e.clientY - noteEl.offsetTop;
      const onMove = (e) => {
        note.x = e.clientX - offsetX;
        note.y = e.clientY - offsetY;
        noteEl.style.left = `${note.x}px`;
        noteEl.style.top = `${note.y}px`;
      };
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', () => {
        document.removeEventListener('mousemove', onMove);
        persistNote(note);
      }, { once: true });
    };

    document.body.appendChild(noteEl);
    persistNote(note);
  }
})();
