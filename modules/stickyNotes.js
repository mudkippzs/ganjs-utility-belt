let lastRightClickCoords = { x: 100, y: 100 };

document.addEventListener('contextmenu', (e) => {
  lastRightClickCoords = { x: e.pageX, y: e.pageY };
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'getClickPosition') {
    sendResponse(lastRightClickCoords);
    return;
  }
  if (message.action === 'restoreStickyNotes' && Array.isArray(message.notes)) {
    console.log('Restoring notes:', message.notes);
    message.notes.forEach(renderStickyNote);
  }
});

function persistNote(note) {
  chrome.storage.local.get({ stickyNotes: [] }, ({ stickyNotes }) => {
    const origin = window.location.origin + window.location.pathname;
    note.url = origin;
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

function formatRelativeTime(timestamp) {
  const now = new Date();
  const then = new Date(timestamp);
  const seconds = Math.floor((now - then) / 1000);

  if (seconds < 5) return 'just now';
  if (seconds < 60) return `${seconds} seconds ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} day${days !== 1 ? 's' : ''} ago`;

  return then.toLocaleString();
}

function renderStickyNote(note) {
  const now = new Date().toISOString();
  if (!note.id) note.id = `${Date.now()}-${Math.random()}`;
  if (!note.createdAt) note.createdAt = now;
  if (!note.updatedAt) note.updatedAt = now;
  if (note.collapsed === undefined) note.collapsed = false;
  if (note.pinned === undefined) note.pinned = false;

  const noteEl = document.createElement('div');
  noteEl.className = 'sticky-note';
  Object.assign(noteEl.style, {
    left: `${note.x}px`,
    top: `${note.y}px`,
    background: note.color,
    fontFamily: note.font,
    padding: '10px',
    border: '1px solid #ccc',
    borderRadius: '8px',
    boxShadow: '2px 2px 6px rgba(0,0,0,0.2)',
    position: 'absolute',
    resize: 'both',
    zIndex: note.pinned ? 10001 : 10000,
    minWidth: '350px',
    maxWidth: '450px',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    transition: 'all 0.25s ease'
  });

  const headerRow = document.createElement('div');
  headerRow.style.display = 'flex';
  headerRow.style.justifyContent = 'space-between';
  headerRow.style.alignItems = 'center';
  headerRow.style.marginBottom = '5px';

  const collapseBtn = document.createElement('div');
  collapseBtn.textContent = note.collapsed ? '➕' : '➖';
  collapseBtn.style.cursor = 'pointer';
  collapseBtn.style.fontSize = '16px';

  const rightControls = document.createElement('div');
  rightControls.style.display = 'flex';
  rightControls.style.gap = '10px';
  rightControls.style.alignItems = 'center';

  const duplicateBtn = document.createElement('div');
  duplicateBtn.textContent = '📝';
  duplicateBtn.title = 'Duplicate note';
  duplicateBtn.style.cursor = 'pointer';
  duplicateBtn.style.fontSize = '16px';
  duplicateBtn.onclick = () => {
    const copy = { ...note };
    copy.id = `${Date.now()}-${Math.random()}`;
    copy.x += 20;
    copy.y += 20;
    copy.title = note.title + ' (Copy)';
    renderStickyNote(copy);
    chrome.storage.local.get({ stickyNotes: [] }, ({ stickyNotes }) => {
      stickyNotes.push(copy);
      chrome.storage.local.set({ stickyNotes });
    });
  };

  const pinBtn = document.createElement('div');
  pinBtn.innerHTML = note.pinned ? '📌' : '📍';
  pinBtn.style.cursor = 'pointer';
  pinBtn.style.transition = 'opacity 0.2s ease';
  pinBtn.style.fontSize = '16px';
  pinBtn.onclick = () => {
    pinBtn.style.opacity = 0;
    setTimeout(() => {
      note.pinned = !note.pinned;
      noteEl.style.zIndex = note.pinned ? 10001 : 10000;
      pinBtn.innerHTML = note.pinned ? '📌' : '📍';
      pinBtn.style.opacity = 1;
      persistNote(note);
    }, 100);
  };

  const deleteBtn = document.createElement('div');
  deleteBtn.textContent = '✖';
  Object.assign(deleteBtn.style, {
    cursor: 'pointer',
    fontSize: '16px',
    transition: 'color 0.2s ease, transform 0.1s ease',
    color: '#444'
  });
  deleteBtn.onmouseenter = () => deleteBtn.style.color = 'crimson';
  deleteBtn.onmouseleave = () => deleteBtn.style.color = '#444';
  deleteBtn.onmousedown = () => deleteBtn.style.transform = 'scale(0.85)';
  deleteBtn.onmouseup = () => deleteBtn.style.transform = 'scale(1)';
  deleteBtn.onclick = () => {
    chrome.storage.local.get({ stickyNotes: [] }, ({ stickyNotes }) => {
      const updated = stickyNotes.filter(n => n.id !== note.id);
      chrome.storage.local.set({ stickyNotes: updated }, () => {
        noteEl.remove();
      });
    });
  };

  collapseBtn.onclick = () => {
    note.collapsed = !note.collapsed;
    updateVisibility();
    collapseBtn.textContent = note.collapsed ? '➕' : '➖';
    persistNote(note);
  };

  rightControls.appendChild(duplicateBtn);
  rightControls.appendChild(pinBtn);
  rightControls.appendChild(deleteBtn);
  headerRow.appendChild(collapseBtn);
  headerRow.appendChild(rightControls);

  const toolbar = document.createElement('div');
  toolbar.style.display = note.collapsed ? 'none' : 'flex';
  toolbar.style.justifyContent = 'space-between';
  toolbar.style.alignItems = 'center';
  toolbar.style.marginBottom = '6px';
  toolbar.style.padding = '6px 0';
  toolbar.style.gap = '8px';
  toolbar.style.overflow = 'hidden';
  toolbar.style.transition = 'opacity 0.25s ease, max-height 0.25s ease';
  toolbar.style.maxHeight = note.collapsed ? '0px' : '80px';
  toolbar.style.opacity = note.collapsed ? '0' : '1';

  const colors = ['#fffae6', '#e6faff', '#e6ffe6', '#fff0f5', '#f0f0f0', '#fdd'];
  const colorPicker = document.createElement('div');
  colorPicker.style.display = 'flex';
  colorPicker.style.gap = '4px';

  colors.forEach(color => {
    const swatch = document.createElement('div');
    Object.assign(swatch.style, {
      width: '12px',
      height: '12px',
      margin: '1px',
      borderRadius: '50%',
      background: color,
      border: '1px solid #999',
      cursor: 'pointer',
      transition: 'box-shadow 0.2s ease'
    });
    swatch.style.boxShadow = color === note.color ? '0 0 0 2px #000' : 'none';
    swatch.onclick = () => {
      note.color = color;
      noteEl.style.background = color;
      persistNote(note);
      Array.from(colorPicker.children).forEach(c => c.style.boxShadow = 'none');
      swatch.style.boxShadow = '0 0 0 2px #000';
    };
    colorPicker.appendChild(swatch);
  });

  const fonts = ['Arial', 'Courier New', 'Georgia', 'Times New Roman'];
  const fontPicker = document.createElement('div');
  fontPicker.style.display = 'flex';
  fontPicker.style.gap = '6px';

  fonts.forEach(font => {
    const label = document.createElement('span');
    label.textContent = font.split(' ')[0];
    Object.assign(label.style, {
      fontFamily: font,
      fontSize: '12px',
      cursor: 'pointer',
      color: font === note.font ? '#000' : '#666',
      fontWeight: font === note.font ? 'bold' : 'normal',
    });
    label.onclick = () => {
      note.font = font;
      noteEl.style.fontFamily = font;
      persistNote(note);
      Array.from(fontPicker.children).forEach(l => {
        l.style.fontWeight = 'normal';
        l.style.color = '#666';
      });
      label.style.fontWeight = 'bold';
      label.style.color = '#000';
    };
    fontPicker.appendChild(label);
  });

  toolbar.appendChild(colorPicker);
  toolbar.appendChild(fontPicker);

  const titleInput = document.createElement('input');
  titleInput.type = 'text';
  titleInput.placeholder = 'Note Title';
  titleInput.value = note.title || '';
  Object.assign(titleInput.style, {
    border: 'none',
    background: 'transparent',
    outline: 'none',
    fontWeight: 'bold',
    fontFamily: 'inherit',
    width: '100%',
    marginBottom: '5px',
    display: note.collapsed ? 'none' : 'block',
    transition: 'opacity 0.2s ease'
  });
  titleInput.oninput = () => {
    note.title = titleInput.value;
    saveNote(note, updateFooter);
  };

  const textarea = document.createElement('textarea');
  textarea.value = note.content;
  Object.assign(textarea.style, {
    width: '100%',
    height: '110px',
    background: 'transparent',
    border: 'none',
    outline: 'none',
    resize: 'none',
    fontFamily: 'inherit',
    display: 'none'
  });

  const preview = document.createElement('div');
  Object.assign(preview.style, {
    fontFamily: 'inherit',
    fontSize: '14px',
    marginTop: '8px',
    borderTop: '1px solid #ccc',
    paddingTop: '6px',
    minHeight: '110px',
    display: note.collapsed ? 'none' : 'block',
    transition: 'opacity 0.2s ease'
  });
  preview.innerHTML = marked.parse(note.content || '');

  preview.onclick = () => {
    preview.style.display = 'none';
    textarea.style.display = 'block';
    textarea.focus();
  };

  textarea.onblur = () => {
    note.content = textarea.value;
    saveNote(note, updateFooter);
    preview.innerHTML = marked.parse(note.content || '');
    textarea.style.display = 'none';
    preview.style.display = note.collapsed ? 'none' : 'block';
  };

  const footer = document.createElement('div');
  Object.assign(footer.style, {
    fontSize: '10px',
    color: '#666',
    marginTop: 'auto',
    paddingTop: '6px',
    textAlign: 'right',
    userSelect: 'none'
  });

  function updateFooter() {
    const createdText = formatRelativeTime(note.createdAt);
    const updatedText = formatRelativeTime(note.updatedAt);
    const createdFull = new Date(note.createdAt).toLocaleString();
    const updatedFull = new Date(note.updatedAt).toLocaleString();

    footer.innerHTML = `
      <span title="${createdFull}">Created: ${createdText}</span> · 
      <span title="${updatedFull}">Edited: ${updatedText}</span>
    `;
  }

  updateFooter();
  setInterval(updateFooter, 60000); // refresh every minute

  const updateVisibility = () => {
    const visible = !note.collapsed;
    toolbar.style.maxHeight = visible ? '80px' : '0px';
    toolbar.style.opacity = visible ? '1' : '0';
    titleInput.style.display = visible ? 'block' : 'none';
    preview.style.display = visible ? 'block' : 'none';
    textarea.style.display = 'none';
  };

  noteEl.appendChild(headerRow);
  noteEl.appendChild(toolbar);
  noteEl.appendChild(titleInput);
  noteEl.appendChild(preview);
  noteEl.appendChild(textarea);
  noteEl.appendChild(footer);

  noteEl.onmousedown = function (e) {
    if (["TEXTAREA", "SELECT", "INPUT"].includes(e.target.tagName)) return;
    let offsetX = e.clientX - noteEl.offsetLeft;
    let offsetY = e.clientY - noteEl.offsetTop;
    const onMouseMove = e => {
      note.x = e.clientX - offsetX;
      note.y = e.clientY - offsetY;
      noteEl.style.left = `${note.x}px`;
      noteEl.style.top = `${note.y}px`;
    };
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', () => {
      document.removeEventListener('mousemove', onMouseMove);
      persistNote(note);
    }, { once: true });
  };

  document.body.appendChild(noteEl);
  persistNote(note);
}
