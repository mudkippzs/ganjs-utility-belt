// JS Editor - Execute JavaScript code with saveable functions
const JSEditor = (() => {
  let editorContainer = null;
  let isVisible = false;
  let savedFunctions = new Map();
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
            <button id="jsExecute" class="btn-primary">Execute (Ctrl+Enter)</button>
            <button id="jsClear" class="btn-secondary">Clear</button>
            <button id="jsSave" class="btn-outline">Save Function</button>
            <button class="js-editor-close">✕</button>
          </div>
        </div>
        
        <div class="editor-content">
          <div class="editor-tabs">
            <button class="tab-btn active" data-tab="editor">Code Editor</button>
            <button class="tab-btn" data-tab="saved">Saved Functions</button>
            <button class="tab-btn" data-tab="history">History</button>
            <button class="tab-btn" data-tab="console">Console</button>
          </div>
          
          <div class="tab-content active" data-tab="editor">
            <div class="js-textarea-container">
              <textarea id="jsTextarea" placeholder="// Enter JavaScript code here
// Example: Find all links on page
const links = document.querySelectorAll('a');
console.log('Found', links.length, 'links');

// Example: Highlight all text
document.body.style.backgroundColor = 'yellow';

// Example: Get page info
console.log({
  title: document.title,
  url: location.href,
  images: document.images.length
});"></textarea>
              <div class="js-line-numbers"></div>
            </div>
          </div>
          
          <div class="tab-content" data-tab="saved">
            <div class="saved-controls">
              <input type="text" id="functionName" placeholder="Function name">
              <button id="saveFunction">Save Current Code</button>
            </div>
            <div class="saved-functions" id="savedFunctions">
              <!-- Saved functions will appear here -->
            </div>
          </div>
          
          <div class="tab-content" data-tab="history">
            <div class="history-controls">
              <button id="clearHistory">Clear History</button>
            </div>
            <div class="execution-history" id="executionHistory">
              <!-- Execution history will appear here -->
            </div>
          </div>
          
          <div class="tab-content" data-tab="console">
            <div class="console-output" id="consoleOutput">
              <div class="console-welcome">JavaScript Console Output</div>
            </div>
            <div class="console-input-container">
              <input type="text" id="consoleInput" placeholder="Enter JavaScript expression...">
              <button id="consoleExecute">Run</button>
            </div>
          </div>
        </div>
        
        <div class="editor-status">
          <span id="jsStatus">Ready</span>
          <span id="jsStats">No executions</span>
        </div>
      </div>
    `;

    document.body.appendChild(editorContainer);
    attachEventListeners();
    interceptConsole();
  }

  function attachEventListeners() {
    const textarea = editorContainer.querySelector('#jsTextarea');
    const executeBtn = editorContainer.querySelector('#jsExecute');
    const clearBtn = editorContainer.querySelector('#jsClear');
    const saveBtn = editorContainer.querySelector('#jsSave');
    const closeBtn = editorContainer.querySelector('.js-editor-close');

    closeBtn.addEventListener('click', hide);
    executeBtn.addEventListener('click', executeCode);
    clearBtn.addEventListener('click', clearCode);
    saveBtn.addEventListener('click', saveFunction);

    textarea.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.key === 'Enter') {
        e.preventDefault();
        executeCode();
      }
      if (e.key === 'Tab') {
        e.preventDefault();
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        textarea.value = textarea.value.substring(0, start) + '  ' + textarea.value.substring(end);
        textarea.selectionStart = textarea.selectionEnd = start + 2;
        updateLineNumbers();
      }
    });

    textarea.addEventListener('input', updateLineNumbers);
    textarea.addEventListener('scroll', syncLineNumbers);

    // Tab switching
    editorContainer.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const tabName = e.target.dataset.tab;
        switchTab(tabName);
      });
    });

    // Console input
    const consoleInput = editorContainer.querySelector('#consoleInput');
    const consoleExecute = editorContainer.querySelector('#consoleExecute');
    
    consoleExecute.addEventListener('click', executeConsoleInput);
    consoleInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        executeConsoleInput();
      }
    });

    // History controls
    editorContainer.querySelector('#clearHistory').addEventListener('click', clearHistory);

    updateLineNumbers();
  }

  function switchTab(tabName) {
    editorContainer.querySelectorAll('.tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tabName);
    });

    editorContainer.querySelectorAll('.tab-content').forEach(content => {
      content.classList.toggle('active', content.dataset.tab === tabName);
    });
  }

  function executeCode() {
    const code = editorContainer.querySelector('#jsTextarea').value.trim();
    if (!code) return;

    try {
      updateStatus('Executing...', 'info');
      
      // Clear previous console output for this execution
      const consoleOutput = editorContainer.querySelector('#consoleOutput');
      consoleOutput.innerHTML = '<div class="console-welcome">JavaScript Console Output</div>';
      
      // Execute the code
      const result = eval(code);
      
      // Add to history
      addToHistory(code, result, null);
      
      updateStatus('Executed successfully', 'success');
      updateStats();
      
      // Show result in console if it's not undefined
      if (result !== undefined) {
        addConsoleOutput('Return value:', result, 'result');
      }
      
    } catch (error) {
      addToHistory(code, null, error);
      updateStatus('Execution error: ' + error.message, 'error');
      addConsoleOutput('Error:', error.message, 'error');
    }
  }

  function executeConsoleInput() {
    const input = editorContainer.querySelector('#consoleInput');
    const code = input.value.trim();
    if (!code) return;

    try {
      const result = eval(code);
      addConsoleOutput('> ' + code, result, 'input');
      input.value = '';
    } catch (error) {
      addConsoleOutput('> ' + code, error.message, 'error');
      input.value = '';
    }
  }

  function addConsoleOutput(label, value, type = 'log') {
    const consoleOutput = editorContainer.querySelector('#consoleOutput');
    const outputDiv = document.createElement('div');
    outputDiv.className = `console-line console-${type}`;
    
    const timestamp = new Date().toLocaleTimeString();
    let valueStr = '';
    
    try {
      if (typeof value === 'object' && value !== null) {
        valueStr = JSON.stringify(value, null, 2);
      } else {
        valueStr = String(value);
      }
    } catch (e) {
      valueStr = '[Object object]';
    }
    
    outputDiv.innerHTML = `
      <span class="console-timestamp">${timestamp}</span>
      <span class="console-label">${escapeHtml(label)}</span>
      <span class="console-value">${escapeHtml(valueStr)}</span>
    `;
    
    consoleOutput.appendChild(outputDiv);
    consoleOutput.scrollTop = consoleOutput.scrollHeight;
  }

  function interceptConsole() {
    const originalLog = console.log;
    const originalError = console.error;
    const originalWarn = console.warn;

    console.log = function(...args) {
      originalLog.apply(console, args);
      if (editorContainer && !editorContainer.classList.contains('hidden')) {
        addConsoleOutput('LOG:', args.join(' '), 'log');
      }
    };

    console.error = function(...args) {
      originalError.apply(console, args);
      if (editorContainer && !editorContainer.classList.contains('hidden')) {
        addConsoleOutput('ERROR:', args.join(' '), 'error');
      }
    };

    console.warn = function(...args) {
      originalWarn.apply(console, args);
      if (editorContainer && !editorContainer.classList.contains('hidden')) {
        addConsoleOutput('WARN:', args.join(' '), 'warn');
      }
    };
  }

  function clearCode() {
    editorContainer.querySelector('#jsTextarea').value = '';
    updateLineNumbers();
    updateStatus('Code cleared', 'info');
  }

  function saveFunction() {
    const code = editorContainer.querySelector('#jsTextarea').value.trim();
    const name = editorContainer.querySelector('#functionName').value.trim();

    if (!code) {
      updateStatus('No code to save', 'error');
      return;
    }

    if (!name) {
      updateStatus('Please enter a function name', 'error');
      return;
    }

    chrome.storage.local.get(['jsFunctions'], (result) => {
      const functions = result.jsFunctions || {};
      functions[name] = {
        code: code,
        created: new Date().toISOString()
      };

      chrome.storage.local.set({ jsFunctions: functions }, () => {
        updateStatus('Function saved: ' + name, 'success');
        editorContainer.querySelector('#functionName').value = '';
        loadSavedFunctions();
      });
    });
  }

  function loadSavedFunctions() {
    chrome.storage.local.get(['jsFunctions'], (result) => {
      const functions = result.jsFunctions || {};
      const functionsList = editorContainer.querySelector('#savedFunctions');

      if (Object.keys(functions).length === 0) {
        functionsList.innerHTML = '<div class="no-functions">No saved functions</div>';
        return;
      }

      functionsList.innerHTML = Object.entries(functions).map(([name, data]) => `
        <div class="function-item">
          <div class="function-header">
            <span class="function-name">${escapeHtml(name)}</span>
            <div class="function-actions">
              <button class="btn-small" onclick="window.JSEditor.loadFunction('${escapeHtml(name)}')">Load</button>
              <button class="btn-small" onclick="window.JSEditor.executeFunction('${escapeHtml(name)}')">Execute</button>
              <button class="btn-small btn-danger" onclick="window.JSEditor.deleteFunction('${escapeHtml(name)}')">Delete</button>
            </div>
          </div>
          <div class="function-preview">${escapeHtml(data.code.substring(0, 100))}...</div>
        </div>
      `).join('');
    });
  }

  function loadFunction(name) {
    chrome.storage.local.get(['jsFunctions'], (result) => {
      const functions = result.jsFunctions || {};
      if (functions[name]) {
        editorContainer.querySelector('#jsTextarea').value = functions[name].code;
        switchTab('editor');
        updateStatus('Function loaded: ' + name, 'success');
        updateLineNumbers();
      }
    });
  }

  function executeFunction(name) {
    chrome.storage.local.get(['jsFunctions'], (result) => {
      const functions = result.jsFunctions || {};
      if (functions[name]) {
        editorContainer.querySelector('#jsTextarea').value = functions[name].code;
        executeCode();
        updateStatus('Function executed: ' + name, 'success');
      }
    });
  }

  function deleteFunction(name) {
    if (!confirm('Delete function "' + name + '"?')) return;

    chrome.storage.local.get(['jsFunctions'], (result) => {
      const functions = result.jsFunctions || {};
      delete functions[name];

      chrome.storage.local.set({ jsFunctions: functions }, () => {
        updateStatus('Function deleted: ' + name, 'info');
        loadSavedFunctions();
      });
    });
  }

  function addToHistory(code, result, error) {
    const historyEntry = {
      code: code,
      result: result,
      error: error,
      timestamp: new Date().toISOString()
    };

    executionHistory.unshift(historyEntry);
    if (executionHistory.length > 50) {
      executionHistory = executionHistory.slice(0, 50);
    }

    updateHistoryDisplay();
  }

  function updateHistoryDisplay() {
    const historyContainer = editorContainer.querySelector('#executionHistory');
    
    if (executionHistory.length === 0) {
      historyContainer.innerHTML = '<div class="no-history">No execution history</div>';
      return;
    }

    historyContainer.innerHTML = executionHistory.map((entry, index) => `
      <div class="history-item ${entry.error ? 'history-error' : 'history-success'}">
        <div class="history-header">
          <span class="history-timestamp">${new Date(entry.timestamp).toLocaleString()}</span>
          <button class="btn-small" onclick="window.JSEditor.loadHistoryItem(${index})">Load</button>
        </div>
        <div class="history-code">${escapeHtml(entry.code.substring(0, 100))}${entry.code.length > 100 ? '...' : ''}</div>
        ${entry.error ? 
          `<div class="history-error-msg">Error: ${escapeHtml(entry.error.message)}</div>` :
          entry.result !== undefined ? `<div class="history-result">Result: ${escapeHtml(String(entry.result).substring(0, 50))}</div>` : ''
        }
      </div>
    `).join('');
  }

  function loadHistoryItem(index) {
    const entry = executionHistory[index];
    if (entry) {
      editorContainer.querySelector('#jsTextarea').value = entry.code;
      switchTab('editor');
      updateLineNumbers();
      updateStatus('History item loaded', 'success');
    }
  }

  function clearHistory() {
    if (!confirm('Clear all execution history?')) return;
    
    executionHistory = [];
    updateHistoryDisplay();
    updateStatus('History cleared', 'info');
    updateStats();
  }

  function updateLineNumbers() {
    const textarea = editorContainer.querySelector('#jsTextarea');
    const lineNumbers = editorContainer.querySelector('.js-line-numbers');
    const lines = textarea.value.split('\n').length;
    
    lineNumbers.innerHTML = Array.from({length: lines}, (_, i) => i + 1).join('\n');
  }

  function syncLineNumbers() {
    const textarea = editorContainer.querySelector('#jsTextarea');
    const lineNumbers = editorContainer.querySelector('.js-line-numbers');
    lineNumbers.scrollTop = textarea.scrollTop;
  }

  function updateStatus(message, type = 'info') {
    const status = editorContainer.querySelector('#jsStatus');
    status.textContent = message;
    status.className = `status-${type}`;
  }

  function updateStats() {
    const stats = editorContainer.querySelector('#jsStats');
    stats.textContent = `${executionHistory.length} executions`;
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  function attachKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'J') {
        e.preventDefault();
        toggle();
      }
    });
  }

  function show() {
    if (!editorContainer) createEditor();
    editorContainer.classList.remove('hidden');
    isVisible = true;
    
    setTimeout(() => {
      editorContainer.querySelector('#jsTextarea').focus();
    }, 100);
  }

  function hide() {
    if (editorContainer) {
      editorContainer.classList.add('hidden');
    }
    isVisible = false;
  }

  function toggle() {
    isVisible ? hide() : show();
  }

  return { 
    init, 
    show, 
    hide, 
    toggle, 
    loadFunction, 
    executeFunction, 
    deleteFunction, 
    loadHistoryItem 
  };
})();

// Make it globally accessible
window.JSEditor = JSEditor;

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', JSEditor.init);
} else {
  JSEditor.init();
}
