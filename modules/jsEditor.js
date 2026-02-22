const JSEditor = (() => {
  let editorContainer = null;
  let isVisible = false;
  let executionHistory = [];

  function init() {
    createEditor();
    attachKeyboardShortcuts();
    loadSavedFunctions();
  }

  function createEditor() {
    if (editorContainer) return;

    editorContainer = document.createElement('div');
    editorContainer.className = 'js-editor hidden';
    editorContainer.innerHTML = `
      <div class="editor-panel">
        <div class="editor-header">
          <h3>💻 JavaScript Editor</h3>
          <div class="editor-controls">
            <button id="jsFormat" class="btn-outline">Format</button>
            <button id="jsExecute" class="btn-primary">Run (Ctrl+Enter)</button>
            <button id="jsClear" class="btn-secondary">Clear</button>
            <button id="jsSave" class="btn-outline">Save</button>
            <button class="js-editor-close">✕</button>
          </div>
        </div>
        <div class="editor-content">
          <div class="editor-tabs">
            <button class="tab-btn active" data-tab="editor">Editor</button>
            <button class="tab-btn" data-tab="console">Console</button>
            <button class="tab-btn" data-tab="saved">Saved</button>
            <button class="tab-btn" data-tab="history">History</button>
          </div>
          <div class="tab-content active" data-tab="editor">
            <div class="gub-code-editor" data-lang="js">
              <div class="gub-code-gutter"></div>
              <div class="gub-code-body">
                <pre class="gub-code-highlight" aria-hidden="true"><code></code></pre>
                <textarea class="gub-code-input" id="jsTextarea" spellcheck="false"
                  placeholder="// JavaScript code here&#10;console.log('hello');"></textarea>
              </div>
            </div>
          </div>
          <div class="tab-content" data-tab="console">
            <div class="console-output" id="consoleOutput">
              <div class="console-welcome">Console output appears here</div>
            </div>
            <div class="console-input-container">
              <input type="text" id="consoleInput" placeholder="Evaluate expression..." spellcheck="false">
              <button id="consoleExecute" class="btn-primary">Run</button>
            </div>
          </div>
          <div class="tab-content" data-tab="saved">
            <div style="display:flex;gap:8px;margin-bottom:12px;">
              <input type="text" id="functionName" placeholder="Function name" style="flex:1;">
              <button id="saveFunction" class="btn-primary">Save Current</button>
            </div>
            <div id="savedFunctions"></div>
          </div>
          <div class="tab-content" data-tab="history">
            <div style="margin-bottom:12px;"><button id="clearHistory" class="btn-secondary">Clear History</button></div>
            <div id="executionHistory"></div>
          </div>
        </div>
        <div class="editor-status">
          <span id="jsStatus">Ready</span>
          <span id="jsStats">0 runs</span>
        </div>
      </div>
    `;

    document.body.appendChild(editorContainer);
    attachEventListeners();
  }

  function attachEventListeners() {
    const textarea = editorContainer.querySelector('#jsTextarea');

    editorContainer.querySelector('.js-editor-close').addEventListener('click', hide);
    editorContainer.querySelector('#jsExecute').addEventListener('click', executeCode);
    editorContainer.querySelector('#jsClear').addEventListener('click', clearCode);
    editorContainer.querySelector('#jsSave').addEventListener('click', () => switchTab('saved'));
    editorContainer.querySelector('#jsFormat').addEventListener('click', formatJs);

    textarea.addEventListener('input', () => updateHighlight(textarea));
    textarea.addEventListener('scroll', () => syncScroll(textarea));
    textarea.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.key === 'Enter') { e.preventDefault(); executeCode(); return; }
      handleEditorKeys(e, textarea);
    });

    editorContainer.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', (e) => switchTab(e.target.dataset.tab));
    });

    const consoleInput = editorContainer.querySelector('#consoleInput');
    editorContainer.querySelector('#consoleExecute').addEventListener('click', executeConsoleInput);
    consoleInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); executeConsoleInput(); } });

    editorContainer.querySelector('#saveFunction').addEventListener('click', saveFunction);
    editorContainer.querySelector('#clearHistory').addEventListener('click', clearHistory);

    updateHighlight(textarea);
  }

  function switchTab(tabName) {
    editorContainer.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === tabName));
    editorContainer.querySelectorAll('.tab-content').forEach(c => c.classList.toggle('active', c.dataset.tab === tabName));
  }

  function formatJs() {
    const ta = editorContainer.querySelector('#jsTextarea');
    ta.value = prettifyJs(ta.value);
    updateHighlight(ta);
    updateStatus('Formatted', 'success');
  }

  // --- Execution ---

  function runInPageContext(code) {
    return new Promise((resolve) => {
      const resultId = 'gub-js-result-' + Date.now();
      const handler = (event) => {
        if (event.data?.type === resultId) {
          window.removeEventListener('message', handler);
          resolve(event.data);
        }
      };
      window.addEventListener('message', handler);

      const wrappedCode = `
        (function() {
          var __r = { type: '${resultId}' }, __logs = [];
          var __oL = console.log, __oE = console.error, __oW = console.warn;
          console.log = function() { __logs.push({ t:'log', v:Array.from(arguments).map(String).join(' ') }); __oL.apply(console,arguments); };
          console.error = function() { __logs.push({ t:'error', v:Array.from(arguments).map(String).join(' ') }); __oE.apply(console,arguments); };
          console.warn = function() { __logs.push({ t:'warn', v:Array.from(arguments).map(String).join(' ') }); __oW.apply(console,arguments); };
          try { var __v = (0,eval)(${JSON.stringify(code)}); __r.value = __v === undefined ? undefined : String(__v); }
          catch(e) { __r.error = e.message; }
          __r.logs = __logs;
          console.log = __oL; console.error = __oE; console.warn = __oW;
          window.postMessage(__r, '*');
        })();
      `;
      const s = document.createElement('script');
      s.textContent = wrappedCode;
      document.documentElement.appendChild(s);
      s.remove();
      setTimeout(() => { window.removeEventListener('message', handler); resolve({ error: 'Timed out' }); }, 5000);
    });
  }

  async function executeCode() {
    const code = editorContainer.querySelector('#jsTextarea').value.trim();
    if (!code) return;

    updateStatus('Running...', 'info');
    switchTab('console');

    const out = editorContainer.querySelector('#consoleOutput');
    out.innerHTML = '';

    const result = await runInPageContext(code);
    if (result.logs) result.logs.forEach(l => addConsoleOutput(l.v, l.t));

    if (result.error) {
      addToHistory(code, null, result.error);
      updateStatus('Error: ' + result.error, 'error');
      addConsoleOutput(result.error, 'error');
    } else {
      addToHistory(code, result.value, null);
      updateStatus('Success', 'success');
      updateStats();
      if (result.value !== undefined) addConsoleOutput('→ ' + result.value, 'result');
    }
  }

  async function executeConsoleInput() {
    const input = editorContainer.querySelector('#consoleInput');
    const code = input.value.trim();
    if (!code) return;

    addConsoleOutput('> ' + code, 'input');
    const result = await runInPageContext(code);
    if (result.logs) result.logs.forEach(l => addConsoleOutput(l.v, l.t));
    if (result.error) addConsoleOutput(result.error, 'error');
    else if (result.value !== undefined) addConsoleOutput('→ ' + result.value, 'result');
    input.value = '';
  }

  function addConsoleOutput(text, type = 'log') {
    const out = editorContainer.querySelector('#consoleOutput');
    const line = document.createElement('div');
    line.className = `console-line console-${type}`;
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    line.innerHTML = `<span class="console-timestamp">${time}</span><span class="console-value">${escapeHtml(String(text))}</span>`;
    out.appendChild(line);
    out.scrollTop = out.scrollHeight;
  }

  // --- Save/Load ---

  function saveFunction() {
    const code = editorContainer.querySelector('#jsTextarea').value.trim();
    const name = editorContainer.querySelector('#functionName').value.trim();
    if (!code) return updateStatus('No code to save', 'error');
    if (!name) return updateStatus('Enter a name', 'error');
    chrome.storage.local.get(['jsFunctions'], (res) => {
      const fns = res.jsFunctions || {};
      fns[name] = { code, created: new Date().toISOString() };
      chrome.storage.local.set({ jsFunctions: fns }, () => {
        editorContainer.querySelector('#functionName').value = '';
        loadSavedFunctions();
        updateStatus('Saved: ' + name, 'success');
      });
    });
  }

  function loadSavedFunctions() {
    chrome.storage.local.get(['jsFunctions'], (res) => {
      const fns = res.jsFunctions || {};
      const list = editorContainer.querySelector('#savedFunctions');
      const entries = Object.entries(fns);
      if (!entries.length) { list.innerHTML = '<div class="no-data">No saved functions</div>'; return; }
      list.innerHTML = entries.map(([name, data]) => `
        <div style="background:var(--ganj-bg-alt,#f8fafc);border:1px solid var(--ganj-border,#e2e8f0);border-radius:8px;padding:10px;margin-bottom:8px;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
            <strong style="color:var(--ganj-text,#1e293b);">${escapeHtml(name)}</strong>
            <div style="display:flex;gap:4px;">
              <button class="btn-small btn-primary" data-fn-load="${escapeHtml(name)}">Load</button>
              <button class="btn-small btn-outline" data-fn-run="${escapeHtml(name)}">Run</button>
              <button class="btn-small btn-danger" data-fn-del="${escapeHtml(name)}">Del</button>
            </div>
          </div>
          <div style="font-size:12px;color:var(--ganj-text-muted,#64748b);font-family:var(--ganj-font-mono);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(data.code.substring(0, 80))}</div>
        </div>
      `).join('');
      list.querySelectorAll('[data-fn-load]').forEach(b => b.onclick = () => loadFunction(b.dataset.fnLoad));
      list.querySelectorAll('[data-fn-run]').forEach(b => b.onclick = () => executeFunction(b.dataset.fnRun));
      list.querySelectorAll('[data-fn-del]').forEach(b => b.onclick = () => deleteFunction(b.dataset.fnDel));
    });
  }

  function loadFunction(name) {
    chrome.storage.local.get(['jsFunctions'], (res) => {
      if (res.jsFunctions?.[name]) {
        const ta = editorContainer.querySelector('#jsTextarea');
        ta.value = res.jsFunctions[name].code;
        updateHighlight(ta);
        switchTab('editor');
      }
    });
  }

  function executeFunction(name) {
    chrome.storage.local.get(['jsFunctions'], async (res) => {
      if (res.jsFunctions?.[name]) {
        editorContainer.querySelector('#jsTextarea').value = res.jsFunctions[name].code;
        updateHighlight(editorContainer.querySelector('#jsTextarea'));
        await executeCode();
      }
    });
  }

  function deleteFunction(name) {
    chrome.storage.local.get(['jsFunctions'], (res) => {
      const fns = res.jsFunctions || {};
      delete fns[name];
      chrome.storage.local.set({ jsFunctions: fns }, loadSavedFunctions);
    });
  }

  // --- History ---

  function addToHistory(code, result, error) {
    executionHistory.unshift({ code, result, error, ts: new Date().toISOString() });
    if (executionHistory.length > 30) executionHistory.length = 30;
    renderHistory();
  }

  function renderHistory() {
    const el = editorContainer.querySelector('#executionHistory');
    if (!executionHistory.length) { el.innerHTML = '<div class="no-data">No history</div>'; return; }
    el.innerHTML = executionHistory.map((h, i) => `
      <div style="background:var(--ganj-bg-alt,#f8fafc);border:1px solid ${h.error ? 'var(--ganj-error,#dc2626)' : 'var(--ganj-border,#e2e8f0)'};border-radius:8px;padding:10px;margin-bottom:8px;">
        <div style="display:flex;justify-content:space-between;font-size:11px;color:var(--ganj-text-muted,#64748b);margin-bottom:4px;">
          <span>${new Date(h.ts).toLocaleString()}</span>
          <button class="btn-small btn-outline" data-hist="${i}">Load</button>
        </div>
        <div style="font-size:12px;font-family:var(--ganj-font-mono);color:var(--ganj-text,#1e293b);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(h.code.substring(0, 100))}</div>
        ${h.error ? `<div style="font-size:11px;color:var(--ganj-error,#dc2626);margin-top:4px;">Error: ${escapeHtml(h.error)}</div>` : ''}
        ${h.result !== null && h.result !== undefined ? `<div style="font-size:11px;color:var(--ganj-success,#059669);margin-top:4px;">→ ${escapeHtml(String(h.result).substring(0, 60))}</div>` : ''}
      </div>
    `).join('');
    el.querySelectorAll('[data-hist]').forEach(b => b.onclick = () => loadHistoryItem(parseInt(b.dataset.hist)));
  }

  function loadHistoryItem(i) {
    const h = executionHistory[i];
    if (h) {
      const ta = editorContainer.querySelector('#jsTextarea');
      ta.value = h.code;
      updateHighlight(ta);
      switchTab('editor');
    }
  }

  function clearHistory() {
    executionHistory = [];
    renderHistory();
    updateStatus('History cleared', 'info');
  }

  function clearCode() {
    const ta = editorContainer.querySelector('#jsTextarea');
    ta.value = '';
    updateHighlight(ta);
    updateStatus('Cleared', 'info');
  }

  function updateStatus(msg, type = 'info') {
    const el = editorContainer.querySelector('#jsStatus');
    el.textContent = msg;
    el.className = `status-${type}`;
  }

  function updateStats() {
    editorContainer.querySelector('#jsStats').textContent = `${executionHistory.length} run${executionHistory.length !== 1 ? 's' : ''}`;
  }

  function attachKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'J') { e.preventDefault(); toggle(); }
      if (e.key === 'Escape' && isVisible) hide();
    });
  }

  function show() {
    if (!editorContainer) createEditor();
    editorContainer.classList.remove('hidden');
    isVisible = true;
    setTimeout(() => { const ta = editorContainer.querySelector('#jsTextarea'); updateHighlight(ta); ta.focus(); }, 50);
  }

  function hide() {
    if (editorContainer) editorContainer.classList.add('hidden');
    isVisible = false;
  }

  function toggle() { isVisible ? hide() : show(); }

  return { init, show, hide, toggle, loadFunction, executeFunction, deleteFunction, loadHistoryItem };
})();

window.JSEditor = JSEditor;
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', JSEditor.init);
else JSEditor.init();
