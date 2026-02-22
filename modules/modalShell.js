/**
 * Modal chrome: draggable, resizable, position/size persistence.
 * Persists to chrome.storage.local key `modalState`: { [modalId]: { left, top, width, height } }.
 * Use in content scripts: call restorePosition(modalEl, id) on show; call makeDraggable/makeResizable after creation.
 */

const MODAL_STORAGE_KEY = 'modalState';

function getStorage() {
  return new Promise((resolve) => {
    chrome.storage.local.get([MODAL_STORAGE_KEY], (data) => {
      resolve(data[MODAL_STORAGE_KEY] || {});
    });
  });
}

function setStorage(state) {
  return new Promise((resolve) => {
    chrome.storage.local.set({ [MODAL_STORAGE_KEY]: state }, resolve);
  });
}

/**
 * Restore modal position and size from storage. Call when showing the modal.
 * @param {HTMLElement} el - The modal panel element (will get position: fixed and left/top/width/height if saved).
 * @param {string} id - Unique modal id for storage key.
 */
function restorePosition(el, id) {
  if (!el || !id) return Promise.resolve();
  return getStorage().then((state) => {
    const s = state[id];
    if (!s) return;
    el.style.position = 'fixed';
    if (s.left != null) el.style.left = `${s.left}px`;
    if (s.top != null) el.style.top = `${s.top}px`;
    if (s.width != null) el.style.width = `${s.width}px`;
    if (s.height != null) el.style.height = `${s.height}px`;
  });
}

function savePosition(el, id) {
  if (!el || !id) return;
  const rect = el.getBoundingClientRect();
  getStorage().then((state) => {
    state[id] = {
      left: Math.round(rect.left),
      top: Math.round(rect.top),
      width: Math.round(rect.width),
      height: Math.round(rect.height),
    };
    setStorage(state);
  });
}

const debounceMs = 300;
let saveTimeouts = {};

function debouncedSave(el, id) {
  clearTimeout(saveTimeouts[id]);
  saveTimeouts[id] = setTimeout(() => {
    savePosition(el, id);
    saveTimeouts[id] = null;
  }, debounceMs);
}

/**
 * Make modal draggable by a header/handle. Saves position on drag end (debounced).
 * @param {HTMLElement} el - The modal panel element.
 * @param {string} id - Unique modal id.
 * @param {{ handle?: string }} options - handle: selector for drag handle (default '.ganj-modal-drag-handle' or first .ganj-modal-header).
 */
function makeDraggable(el, id, options = {}) {
  if (!el || !id) return;
  const handleSelector = options.handle || '.ganj-modal-drag-handle, .ganj-modal-header';
  const handle = el.querySelector(handleSelector) || el;
  let startX, startY, startLeft, startTop;

  handle.addEventListener('mousedown', (e) => {
    if (e.button !== 0) return;
    e.preventDefault();
    const rect = el.getBoundingClientRect();
    startLeft = rect.left;
    startTop = rect.top;
    startX = e.clientX;
    startY = e.clientY;
    el.style.position = 'fixed';
    el.style.left = `${startLeft}px`;
    el.style.top = `${startTop}px`;

    function move(e) {
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      el.style.left = `${startLeft + dx}px`;
      el.style.top = `${startTop + dy}px`;
    }
    function up() {
      document.removeEventListener('mousemove', move);
      document.removeEventListener('mouseup', up);
      debouncedSave(el, id);
    }
    document.addEventListener('mousemove', move);
    document.addEventListener('mouseup', up);
  });
}

/**
 * Make modal resizable via a bottom-right handle. Saves size on resize end (debounced).
 * @param {HTMLElement} el - The modal panel element.
 * @param {string} id - Unique modal id.
 */
function makeResizable(el, id) {
  if (!el || !id) return;
  let resizeHandle = el.querySelector('.ganj-modal-resize-handle');
  if (!resizeHandle) {
    resizeHandle = document.createElement('div');
    resizeHandle.className = 'ganj-modal-resize-handle';
    resizeHandle.setAttribute('aria-hidden', 'true');
    el.appendChild(resizeHandle);
  }

  let startX, startY, startWidth, startHeight;

  resizeHandle.addEventListener('mousedown', (e) => {
    if (e.button !== 0) return;
    e.preventDefault();
    const rect = el.getBoundingClientRect();
    startWidth = rect.width;
    startHeight = rect.height;
    startX = e.clientX;
    startY = e.clientY;
    el.style.position = 'fixed';
    el.style.left = `${rect.left}px`;
    el.style.top = `${rect.top}px`;
    el.style.width = `${startWidth}px`;
    el.style.height = `${startHeight}px`;

    function move(e) {
      const dw = e.clientX - startX;
      const dh = e.clientY - startY;
      el.style.width = `${Math.max(200, startWidth + dw)}px`;
      el.style.height = `${Math.max(120, startHeight + dh)}px`;
    }
    function up() {
      document.removeEventListener('mousemove', move);
      document.removeEventListener('mouseup', up);
      debouncedSave(el, id);
    }
    document.addEventListener('mousemove', move);
    document.addEventListener('mouseup', up);
  });
}

// Export for use in content scripts (IIFE or global)
if (typeof window !== 'undefined') {
  window.ModalShell = { restorePosition, makeDraggable, makeResizable };
}
