const JSEditor = (() => {
  let container = null;
  let isVisible = false;
  let aceEditor = null;
  let aceLoaded = false;
  let executionHistory = [];

  function init() {
    attachKeyboardShortcuts();
  }

  function loadAce() {
    if (aceLoaded) return Promise.resolve();
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({
        action: 'injectScripts',
        files: ['libs/ace/ace.js', 'libs/ace/ext-language_tools.js', 'libs/beautify.js']
      }, () => {
        if (typeof ace !== 'undefined') {
          ace.config.set('basePath', chrome.runtime.getURL('libs/ace/'));
          aceLoaded = true;
        }
        resolve();
      });
    });
  }

  function createEditor() {
    if (container) return;

    container = document.createElement('div');
    container.className = 'js-editor hidden';
    container.innerHTML = `
      <div class="editor-panel">
        <div class="editor-header">
          <h3>💻 JavaScript Editor</h3>
          <div class="editor-controls">
            <button id="jsFormat" class="btn-outline">Format</button>
            <button id="jsExecute" class="btn-primary">Run ⌘↵</button>
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
            <div id="jsAceContainer" class="gub-ace-wrap"></div>
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

    document.body.appendChild(container);
  }

  function initAce() {
    aceEditor = ace.edit('jsAceContainer');
    aceEditor.setTheme('ace/theme/one_dark');
    aceEditor.session.setMode('ace/mode/javascript');
    aceEditor.session.setUseWorker(false);
    aceEditor.setOptions({
      fontSize: '14px',
      fontFamily: "'SF Mono','Cascadia Code','Fira Code','Monaco','Courier New',monospace",
      showPrintMargin: false,
      tabSize: 2,
      useSoftTabs: true,
      wrap: true,
      enableBasicAutocompletion: true,
      enableLiveAutocompletion: false,
      placeholder: '// JavaScript code here\nconsole.log("hello");'
    });

    aceEditor.commands.addCommand({
      name: 'execute',
      bindKey: { win: 'Ctrl-Enter', mac: 'Cmd-Enter' },
      exec: () => executeCode()
    });

    attachEventListeners();
    loadSavedFunctions();
  }

  function attachEventListeners() {
    container.querySelector('.js-editor-close').addEventListener('click', hide);
    container.querySelector('#jsExecute').addEventListener('click', executeCode);
    container.querySelector('#jsClear').addEventListener('click', clearCode);
    container.querySelector('#jsSave').addEventListener('click', () => switchTab('saved'));
    container.querySelector('#jsFormat').addEventListener('click', formatJs);

    container.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        switchTab(e.target.dataset.tab);
        setTimeout(() => aceEditor?.resize(), 50);
      });
    });

    const consoleInput = container.querySelector('#consoleInput');
    container.querySelector('#consoleExecute').addEventListener('click', executeConsoleInput);
    consoleInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); executeConsoleInput(); } });

    container.querySelector('#saveFunction').addEventListener('click', saveFunction);
    container.querySelector('#clearHistory').addEventListener('click', clearHistory);
  }

  function switchTab(name) {
    container.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === name));
    container.querySelectorAll('.tab-content').forEach(c => c.classList.toggle('active', c.dataset.tab === name));
  }

  function formatJs() {
    if (typeof js_beautify === 'function') {
      aceEditor.setValue(js_beautify(aceEditor.getValue(), { indent_size: 2, space_in_empty_paren: false }), -1);
    }
    status('Formatted', 'success');
  }

  // --- Execution ---

  function runInPageContext(code) {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ action: 'executeInPage', code }, (result) => {
        if (chrome.runtime.lastError) {
          resolve({ error: chrome.runtime.lastError.message });
        } else {
          resolve(result || { error: 'No response' });
        }
      });
    });
  }

  async function executeCode() {
    const code = aceEditor.getValue().trim();
    if (!code) return;

    status('Running...', 'info');
    switchTab('console');

    const out = container.querySelector('#consoleOutput');
    out.innerHTML = '';

    const result = await runInPageContext(code);
    if (result.logs) result.logs.forEach(l => addConsoleOutput(l.v, l.t));

    if (result.error) {
      addToHistory(code, null, result.error);
      status('Error: ' + result.error, 'error');
      addConsoleOutput(result.error, 'error');
    } else {
      addToHistory(code, result.value, null);
      status('Success', 'success');
      updateStats();
      if (result.value !== undefined) addConsoleOutput('→ ' + result.value, 'result');
    }
  }

  async function executeConsoleInput() {
    const input = container.querySelector('#consoleInput');
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
    const out = container.querySelector('#consoleOutput');
    const line = document.createElement('div');
    line.className = `console-line console-${type}`;
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    line.innerHTML = `<span class="console-timestamp">${time}</span><span class="console-value">${escapeHtml(String(text))}</span>`;
    out.appendChild(line);
    out.scrollTop = out.scrollHeight;
  }

  // --- Save/Load ---

  function saveFunction() {
    const code = aceEditor.getValue().trim();
    const name = container.querySelector('#functionName').value.trim();
    if (!code) return status('No code', 'error');
    if (!name) return status('Enter a name', 'error');
    chrome.storage.local.get(['jsFunctions'], (res) => {
      const fns = res.jsFunctions || {};
      fns[name] = { code, created: new Date().toISOString() };
      chrome.storage.local.set({ jsFunctions: fns }, () => {
        container.querySelector('#functionName').value = '';
        loadSavedFunctions();
        status('Saved: ' + name, 'success');
      });
    });
  }

  function loadSavedFunctions() {
    chrome.storage.local.get(['jsFunctions'], (res) => {
      const fns = res.jsFunctions || {};
      const list = container.querySelector('#savedFunctions');
      const entries = Object.entries(fns);
      if (!entries.length) { list.innerHTML = '<div class="no-data">No saved functions</div>'; return; }
      list.innerHTML = entries.map(([name, data]) => `
        <div class="gub-list-item">
          <div class="gub-list-item-header">
            <strong>${escapeHtml(name)}</strong>
            <div style="display:flex;gap:4px;">
              <button class="btn-small btn-primary" data-fn-load="${escapeHtml(name)}">Load</button>
              <button class="btn-small btn-outline" data-fn-run="${escapeHtml(name)}">Run</button>
              <button class="btn-small btn-danger" data-fn-del="${escapeHtml(name)}">Del</button>
            </div>
          </div>
          <div class="gub-list-item-preview">${escapeHtml(data.code.substring(0, 80))}</div>
        </div>
      `).join('');
      list.querySelectorAll('[data-fn-load]').forEach(b => b.onclick = () => {
        chrome.storage.local.get(['jsFunctions'], r => {
          if (r.jsFunctions?.[b.dataset.fnLoad]) { aceEditor.setValue(r.jsFunctions[b.dataset.fnLoad].code, -1); switchTab('editor'); }
        });
      });
      list.querySelectorAll('[data-fn-run]').forEach(b => b.onclick = () => {
        chrome.storage.local.get(['jsFunctions'], async r => {
          if (r.jsFunctions?.[b.dataset.fnRun]) { aceEditor.setValue(r.jsFunctions[b.dataset.fnRun].code, -1); await executeCode(); }
        });
      });
      list.querySelectorAll('[data-fn-del]').forEach(b => b.onclick = () => {
        chrome.storage.local.get(['jsFunctions'], r => {
          const fns = r.jsFunctions || {};
          delete fns[b.dataset.fnDel];
          chrome.storage.local.set({ jsFunctions: fns }, loadSavedFunctions);
        });
      });
    });
  }

  // --- History ---

  function addToHistory(code, result, error) {
    executionHistory.unshift({ code, result, error, ts: new Date().toISOString() });
    if (executionHistory.length > 30) executionHistory.length = 30;
    renderHistory();
  }

  function renderHistory() {
    const el = container.querySelector('#executionHistory');
    if (!executionHistory.length) { el.innerHTML = '<div class="no-data">No history</div>'; return; }
    el.innerHTML = executionHistory.map((h, i) => `
      <div class="gub-list-item" style="border-left:3px solid ${h.error ? 'var(--ganj-error,#dc2626)' : 'var(--ganj-success,#059669)'};">
        <div class="gub-list-item-header">
          <span style="font-size:11px;color:var(--ganj-text-muted,#64748b);">${new Date(h.ts).toLocaleString()}</span>
          <button class="btn-small btn-outline" data-hist="${i}">Load</button>
        </div>
        <div class="gub-list-item-preview">${escapeHtml(h.code.substring(0, 100))}</div>
        ${h.error ? `<div style="font-size:11px;color:var(--ganj-error,#dc2626);margin-top:2px;">✗ ${escapeHtml(h.error)}</div>` : ''}
        ${h.result != null ? `<div style="font-size:11px;color:var(--ganj-success,#059669);margin-top:2px;">→ ${escapeHtml(String(h.result).substring(0, 60))}</div>` : ''}
      </div>
    `).join('');
    el.querySelectorAll('[data-hist]').forEach(b => b.onclick = () => {
      const h = executionHistory[parseInt(b.dataset.hist)];
      if (h) { aceEditor.setValue(h.code, -1); switchTab('editor'); }
    });
  }

  function clearHistory() { executionHistory = []; renderHistory(); status('Cleared', 'info'); }

  function clearCode() { aceEditor.setValue('', -1); status('Cleared', 'info'); }

  function status(msg, type = 'info') {
    const el = container.querySelector('#jsStatus');
    if (el) { el.textContent = msg; el.className = `status-${type}`; }
  }

  function updateStats() {
    const el = container.querySelector('#jsStats');
    if (el) el.textContent = `${executionHistory.length} run${executionHistory.length !== 1 ? 's' : ''}`;
  }

  function attachKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'J') { e.preventDefault(); toggle(); }
      if (e.key === 'Escape' && isVisible) hide();
    });
  }

  async function show() {
    createEditor();
    container.classList.remove('hidden');
    isVisible = true;
    if (!aceEditor) {
      status('Loading editor...');
      await loadAce();
      if (typeof ace === 'undefined') {
        status('Failed to load editor — check extension permissions', 'error');
        return;
      }
      initAce();
      status('Ready');
    }
    setTimeout(() => aceEditor?.resize(), 50);
    aceEditor?.focus();
  }

  function hide() {
    if (container) container.classList.add('hidden');
    isVisible = false;
  }

  function toggle() { isVisible ? hide() : show(); }

  return { init, show, hide, toggle };
})();

window.JSEditor = JSEditor;
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', JSEditor.init);
else JSEditor.init();
