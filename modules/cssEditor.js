const CSSEditor = (() => {
  let editorContainer = null;
  let isVisible = false;
  let styleElement = null;

  function init() {
    createEditor();
    attachKeyboardShortcuts();
    createStyleElement();
  }

  function createStyleElement() {
    if (styleElement) return;
    styleElement = document.createElement('style');
    styleElement.id = 'css-live-editor-styles';
    document.head.appendChild(styleElement);
  }

  function createEditor() {
    if (editorContainer) return;

    editorContainer = document.createElement('div');
    editorContainer.className = 'css-editor hidden';
    editorContainer.innerHTML = `
      <div class="editor-panel">
        <div class="editor-header">
          <h3>🎨 CSS Editor</h3>
          <div class="editor-controls">
            <button id="cssFormat" class="btn-outline">Format</button>
            <button id="cssApply" class="btn-primary">Apply</button>
            <button id="cssClear" class="btn-secondary">Clear</button>
            <button id="cssExport" class="btn-outline">Export</button>
            <button class="css-editor-close">✕</button>
          </div>
        </div>
        <div class="editor-content">
          <div class="editor-tabs">
            <button class="tab-btn active" data-tab="live">Live CSS</button>
            <button class="tab-btn" data-tab="extracted">Extract</button>
            <button class="tab-btn" data-tab="snippets">Snippets</button>
          </div>
          <div class="tab-content active" data-tab="live">
            <div class="gub-code-editor" data-lang="css">
              <div class="gub-code-gutter"></div>
              <div class="gub-code-body">
                <pre class="gub-code-highlight" aria-hidden="true"><code></code></pre>
                <textarea class="gub-code-input" id="cssTextarea" spellcheck="false"
                  placeholder="/* Enter your CSS here */"></textarea>
              </div>
            </div>
          </div>
          <div class="tab-content" data-tab="extracted">
            <div class="extracted-controls" style="display:flex;gap:8px;margin-bottom:12px;flex-wrap:wrap;">
              <button id="extractCurrentPage" class="btn-primary">Extract Page CSS</button>
              <button id="extractElement" class="btn-outline">Extract Element</button>
              <input type="text" id="extractSelector" placeholder="CSS selector (e.g. .header, #main)" style="flex:1;min-width:200px;">
            </div>
            <textarea id="extractedCss" readonly class="gub-output-textarea" placeholder="Extracted CSS will appear here..."></textarea>
          </div>
          <div class="tab-content" data-tab="snippets">
            <div style="display:flex;gap:8px;margin-bottom:12px;">
              <input type="text" id="snippetName" placeholder="Snippet name" style="flex:1;">
              <button id="saveSnippet" class="btn-primary">Save</button>
            </div>
            <div id="snippetsList"></div>
          </div>
        </div>
        <div class="editor-status">
          <span id="cssStatus">Ready</span>
          <span id="cssStats">0 rules</span>
        </div>
      </div>
    `;

    document.body.appendChild(editorContainer);
    attachEventListeners();
    loadSnippets();
  }

  function attachEventListeners() {
    const textarea = editorContainer.querySelector('#cssTextarea');
    const closeBtn = editorContainer.querySelector('.css-editor-close');

    closeBtn.addEventListener('click', hide);
    editorContainer.querySelector('#cssApply').addEventListener('click', applyCss);
    editorContainer.querySelector('#cssClear').addEventListener('click', clearCss);
    editorContainer.querySelector('#cssExport').addEventListener('click', exportCss);
    editorContainer.querySelector('#cssFormat').addEventListener('click', formatCss);

    textarea.addEventListener('input', () => { updateHighlight(textarea); debouncePreview(); });
    textarea.addEventListener('scroll', () => syncScroll(textarea));
    textarea.addEventListener('keydown', (e) => handleEditorKeys(e, textarea));

    editorContainer.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', (e) => switchTab(e.target.dataset.tab));
    });

    editorContainer.querySelector('#extractCurrentPage').addEventListener('click', extractCurrentPageCss);
    editorContainer.querySelector('#extractElement').addEventListener('click', extractElementCss);
    editorContainer.querySelector('#saveSnippet').addEventListener('click', saveSnippet);

    updateHighlight(textarea);
  }

  function switchTab(tabName) {
    editorContainer.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === tabName));
    editorContainer.querySelectorAll('.tab-content').forEach(c => c.classList.toggle('active', c.dataset.tab === tabName));
  }

  function applyCss() {
    try {
      styleElement.textContent = editorContainer.querySelector('#cssTextarea').value;
      updateStatus('CSS applied', 'success');
      updateStats();
    } catch (err) {
      updateStatus('Error: ' + err.message, 'error');
    }
  }

  const debouncePreview = debounce(() => {
    const css = editorContainer.querySelector('#cssTextarea').value;
    try {
      let s = document.querySelector('#css-live-preview');
      if (!s) { s = document.createElement('style'); s.id = 'css-live-preview'; document.head.appendChild(s); }
      s.textContent = css;
      updateStats();
    } catch {}
  }, 400);

  function clearCss() {
    styleElement.textContent = '';
    const ta = editorContainer.querySelector('#cssTextarea');
    ta.value = '';
    updateHighlight(ta);
    const s = document.querySelector('#css-live-preview');
    if (s) s.remove();
    updateStatus('Cleared', 'info');
    updateStats();
  }

  function exportCss() {
    const css = editorContainer.querySelector('#cssTextarea').value;
    if (!css.trim()) return;
    downloadText(css, `styles-${Date.now()}.css`, 'text/css');
    updateStatus('Exported', 'success');
  }

  function formatCss() {
    const ta = editorContainer.querySelector('#cssTextarea');
    ta.value = prettifyCss(ta.value);
    updateHighlight(ta);
    updateStatus('Formatted', 'success');
  }

  function extractCurrentPageCss() {
    let out = '';
    Array.from(document.styleSheets).forEach((sheet, i) => {
      try {
        const rules = Array.from(sheet.cssRules || []);
        if (rules.length) {
          out += `/* Sheet ${i + 1} */\n`;
          rules.forEach(r => { out += r.cssText + '\n'; });
          out += '\n';
        }
      } catch { out += `/* Sheet ${i + 1}: cross-origin */\n\n`; }
    });
    editorContainer.querySelector('#extractedCss').value = out;
    switchTab('extracted');
  }

  function extractElementCss() {
    const sel = editorContainer.querySelector('#extractSelector').value.trim();
    if (!sel) return updateStatus('Enter a selector', 'error');
    try {
      const els = document.querySelectorAll(sel);
      if (!els.length) return updateStatus('No elements found', 'error');
      let out = '';
      els.forEach((el, i) => {
        const cs = window.getComputedStyle(el);
        out += `/* Element ${i + 1} */\n${sel} {\n`;
        ['display','position','width','height','margin','padding','border','background','color','font','text-align','opacity','transform'].forEach(p => {
          const v = cs.getPropertyValue(p);
          if (v && v !== 'auto' && v !== 'none' && v !== 'normal') out += `  ${p}: ${v};\n`;
        });
        out += '}\n\n';
      });
      editorContainer.querySelector('#extractedCss').value = out;
      switchTab('extracted');
      updateStatus(`Extracted ${els.length} element(s)`, 'success');
    } catch (err) { updateStatus('Error: ' + err.message, 'error'); }
  }

  function saveSnippet() {
    const css = editorContainer.querySelector('#cssTextarea').value.trim();
    const name = editorContainer.querySelector('#snippetName').value.trim();
    if (!css) return updateStatus('No CSS to save', 'error');
    if (!name) return updateStatus('Enter a name', 'error');
    chrome.storage.local.get(['cssSnippets'], (res) => {
      const snippets = res.cssSnippets || {};
      snippets[name] = { css, created: new Date().toISOString() };
      chrome.storage.local.set({ cssSnippets: snippets }, () => {
        editorContainer.querySelector('#snippetName').value = '';
        loadSnippets();
        updateStatus('Saved', 'success');
      });
    });
  }

  function loadSnippets() {
    chrome.storage.local.get(['cssSnippets'], (res) => {
      const snippets = res.cssSnippets || {};
      const list = editorContainer.querySelector('#snippetsList');
      const entries = Object.entries(snippets);
      if (!entries.length) { list.innerHTML = '<div class="no-data">No saved snippets</div>'; return; }
      list.innerHTML = entries.map(([name, data]) => `
        <div style="background:var(--ganj-bg-alt,#f8fafc);border:1px solid var(--ganj-border,#e2e8f0);border-radius:8px;padding:10px;margin-bottom:8px;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
            <strong style="color:var(--ganj-text,#1e293b);">${escapeHtml(name)}</strong>
            <div style="display:flex;gap:4px;">
              <button class="btn-small btn-primary" data-snippet-load="${escapeHtml(name)}">Load</button>
              <button class="btn-small btn-danger" data-snippet-del="${escapeHtml(name)}">Del</button>
            </div>
          </div>
          <div style="font-size:12px;color:var(--ganj-text-muted,#64748b);font-family:var(--ganj-font-mono);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(data.css.substring(0, 80))}</div>
        </div>
      `).join('');
      list.querySelectorAll('[data-snippet-load]').forEach(b => b.onclick = () => loadSnippet(b.dataset.snippetLoad));
      list.querySelectorAll('[data-snippet-del]').forEach(b => b.onclick = () => deleteSnippet(b.dataset.snippetDel));
    });
  }

  function loadSnippet(name) {
    chrome.storage.local.get(['cssSnippets'], (res) => {
      if (res.cssSnippets?.[name]) {
        const ta = editorContainer.querySelector('#cssTextarea');
        ta.value = res.cssSnippets[name].css;
        updateHighlight(ta);
        switchTab('live');
      }
    });
  }

  function deleteSnippet(name) {
    chrome.storage.local.get(['cssSnippets'], (res) => {
      const s = res.cssSnippets || {};
      delete s[name];
      chrome.storage.local.set({ cssSnippets: s }, loadSnippets);
    });
  }

  function updateStatus(msg, type = 'info') {
    const el = editorContainer.querySelector('#cssStatus');
    el.textContent = msg;
    el.className = `status-${type}`;
  }

  function updateStats() {
    const css = editorContainer.querySelector('#cssTextarea').value;
    const n = (css.match(/\{[^}]*\}/g) || []).length;
    editorContainer.querySelector('#cssStats').textContent = `${n} rule${n !== 1 ? 's' : ''}`;
  }

  function attachKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'C') { e.preventDefault(); toggle(); }
      if (e.key === 'Escape' && isVisible) hide();
    });
  }

  function show() {
    if (!editorContainer) createEditor();
    editorContainer.classList.remove('hidden');
    isVisible = true;
    setTimeout(() => editorContainer.querySelector('#cssTextarea').focus(), 50);
  }

  function hide() {
    if (editorContainer) editorContainer.classList.add('hidden');
    isVisible = false;
  }

  function toggle() { isVisible ? hide() : show(); }

  return { init, show, hide, toggle };
})();

// --- Shared editor utilities ---

function highlightCSS(code) {
  return code
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/(\/\*[\s\S]*?\*\/)/g, '<span class="hl-comment">$1</span>')
    .replace(/(["'])((?:(?!\1)[^\\]|\\.)*)(\1)/g, '<span class="hl-string">$1$2$3</span>')
    .replace(/([.#][\w-]+)/g, '<span class="hl-selector">$1</span>')
    .replace(/\b(\d+(?:\.\d+)?)(px|em|rem|%|vh|vw|s|ms|deg|fr)?\b/g, '<span class="hl-number">$1$2</span>')
    .replace(/([\{;])\s*([\w-]+)\s*:/g, '$1 <span class="hl-property">$2</span>:')
    .replace(/(!important)/g, '<span class="hl-keyword">$1</span>');
}

function highlightJS(code) {
  const keywords = 'const|let|var|function|return|if|else|for|while|do|switch|case|break|continue|new|this|class|extends|import|export|default|from|try|catch|finally|throw|typeof|instanceof|in|of|async|await|yield|null|undefined|true|false|void|delete';
  return code
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/(\/\/[^\n]*)/g, '<span class="hl-comment">$1</span>')
    .replace(/(\/\*[\s\S]*?\*\/)/g, '<span class="hl-comment">$1</span>')
    .replace(/(["'`])((?:(?!\1)[^\\]|\\.)*)(\1)/g, '<span class="hl-string">$1$2$3</span>')
    .replace(/\b(\d+(?:\.\d+)?)\b/g, '<span class="hl-number">$1</span>')
    .replace(new RegExp(`\\b(${keywords})\\b`, 'g'), '<span class="hl-keyword">$1</span>')
    .replace(/\b(document|window|console|Math|JSON|Array|Object|String|Number|Promise|Error|RegExp|Date|Map|Set)\b/g, '<span class="hl-builtin">$1</span>')
    .replace(/\b(\w+)\s*\(/g, '<span class="hl-function">$1</span>(');
}

function updateHighlight(textarea) {
  const editor = textarea.closest('.gub-code-editor');
  if (!editor) return;
  const code = textarea.value;
  const lang = editor.dataset.lang;
  const codeEl = editor.querySelector('.gub-code-highlight code');
  const gutter = editor.querySelector('.gub-code-gutter');

  codeEl.innerHTML = (lang === 'css' ? highlightCSS(code) : highlightJS(code)) + '\n';

  const lines = code.split('\n').length;
  gutter.innerHTML = Array.from({ length: lines }, (_, i) => `<div>${i + 1}</div>`).join('');
}

function syncScroll(textarea) {
  const editor = textarea.closest('.gub-code-editor');
  if (!editor) return;
  const pre = editor.querySelector('.gub-code-highlight');
  const gutter = editor.querySelector('.gub-code-gutter');
  pre.scrollTop = textarea.scrollTop;
  pre.scrollLeft = textarea.scrollLeft;
  gutter.scrollTop = textarea.scrollTop;
}

function handleEditorKeys(e, textarea) {
  if (e.key === 'Tab') {
    e.preventDefault();
    const s = textarea.selectionStart, end = textarea.selectionEnd;
    textarea.value = textarea.value.substring(0, s) + '  ' + textarea.value.substring(end);
    textarea.selectionStart = textarea.selectionEnd = s + 2;
    updateHighlight(textarea);
  }
}

function prettifyCss(css) {
  return css
    .replace(/\s*\{\s*/g, ' {\n  ')
    .replace(/\s*;\s*/g, ';\n  ')
    .replace(/\s*\}\s*/g, '\n}\n\n')
    .replace(/  \n\}/g, '\n}')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function prettifyJs(code) {
  let indent = 0;
  return code.split('\n').map(line => {
    const trimmed = line.trim();
    if (!trimmed) return '';
    if (trimmed.startsWith('}') || trimmed.startsWith(']') || trimmed.startsWith(')')) indent = Math.max(0, indent - 1);
    const result = '  '.repeat(indent) + trimmed;
    if (trimmed.endsWith('{') || trimmed.endsWith('[') || trimmed.endsWith('(')) indent++;
    return result;
  }).join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

function downloadText(text, filename, type) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

function escapeHtml(text) {
  const d = document.createElement('div');
  d.textContent = text;
  return d.innerHTML;
}

function debounce(fn, ms) {
  let t;
  return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
}

window.CSSEditor = CSSEditor;
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', CSSEditor.init);
else CSSEditor.init();
