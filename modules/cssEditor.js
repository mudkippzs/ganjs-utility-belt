// CSS Live Editor - Edit and apply CSS styles in real-time
const CSSEditor = (() => {
  let editorContainer = null;
  let isVisible = false;
  let appliedStyles = new Map();
  let styleElement = null;
  let editor = null;

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
          <h3>🎨 CSS Live Editor</h3>
          <div class="editor-controls">
            <button id="cssApply" class="btn-primary">Apply CSS</button>
            <button id="cssClear" class="btn-secondary">Clear All</button>
            <button id="cssExport" class="btn-outline">Export</button>
            <button class="css-editor-close">✕</button>
          </div>
        </div>
        
        <div class="editor-content">
          <div class="editor-tabs">
            <button class="tab-btn active" data-tab="live">Live CSS</button>
            <button class="tab-btn" data-tab="extracted">Extracted CSS</button>
            <button class="tab-btn" data-tab="snippets">Snippets</button>
          </div>
          
          <div class="tab-content active" data-tab="live">
            <div class="css-textarea-container">
              <textarea id="cssTextarea" placeholder="/* Enter your CSS here */
body {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.highlight {
  background-color: yellow;
  padding: 2px 4px;
  border-radius: 3px;
}"></textarea>
              <div class="css-line-numbers"></div>
            </div>
            <div class="css-preview">
              <div class="preview-header">Live Preview</div>
              <div id="cssPreview">Changes will appear here as you type...</div>
            </div>
          </div>
          
          <div class="tab-content" data-tab="extracted">
            <div class="extracted-controls">
              <button id="extractCurrentPage">Extract Current Page CSS</button>
              <button id="extractElement">Extract Element CSS</button>
              <input type="text" id="extractSelector" placeholder="CSS selector (e.g., .header, #main)">
            </div>
            <textarea id="extractedCss" readonly placeholder="Extracted CSS will appear here..."></textarea>
          </div>
          
          <div class="tab-content" data-tab="snippets">
            <div class="snippets-controls">
              <button id="saveSnippet">Save Current CSS</button>
              <input type="text" id="snippetName" placeholder="Snippet name">
            </div>
            <div class="snippets-list" id="snippetsList">
              <!-- Saved snippets will appear here -->
            </div>
          </div>
        </div>
        
        <div class="editor-status">
          <span id="cssStatus">Ready</span>
          <span id="cssStats">0 rules applied</span>
        </div>
      </div>
    `;

    document.body.appendChild(editorContainer);
    attachEventListeners();
    loadSnippets();
  }

  function attachEventListeners() {
    const textarea = editorContainer.querySelector('#cssTextarea');
    const applyBtn = editorContainer.querySelector('#cssApply');
    const clearBtn = editorContainer.querySelector('#cssClear');
    const exportBtn = editorContainer.querySelector('#cssExport');
    const closeBtn = editorContainer.querySelector('.css-editor-close');

    closeBtn.addEventListener('click', hide);
    applyBtn.addEventListener('click', applyCss);
    clearBtn.addEventListener('click', clearCss);
    exportBtn.addEventListener('click', exportCss);

    // Live preview as you type
    textarea.addEventListener('input', debounce(livePreview, 500));
    textarea.addEventListener('scroll', syncLineNumbers);
    textarea.addEventListener('keydown', handleTabKey);

    // Tab switching
    editorContainer.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const tabName = e.target.dataset.tab;
        switchTab(tabName);
      });
    });

    // Extracted CSS controls
    editorContainer.querySelector('#extractCurrentPage').addEventListener('click', extractCurrentPageCss);
    editorContainer.querySelector('#extractElement').addEventListener('click', extractElementCss);

    // Snippet controls
    editorContainer.querySelector('#saveSnippet').addEventListener('click', saveSnippet);

    updateLineNumbers();
  }

  function switchTab(tabName) {
    // Update tab buttons
    editorContainer.querySelectorAll('.tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tabName);
    });

    // Update tab content
    editorContainer.querySelectorAll('.tab-content').forEach(content => {
      content.classList.toggle('active', content.dataset.tab === tabName);
    });
  }

  function applyCss() {
    const css = editorContainer.querySelector('#cssTextarea').value;
    
    try {
      styleElement.textContent = css;
      updateStatus('CSS applied successfully', 'success');
      updateStats();
    } catch (error) {
      updateStatus('Error applying CSS: ' + error.message, 'error');
    }
  }

  function livePreview() {
    const css = editorContainer.querySelector('#cssTextarea').value;
    const preview = editorContainer.querySelector('#cssPreview');
    
    try {
      // Create a temporary style element for preview
      let tempStyle = document.querySelector('#css-live-preview');
      if (!tempStyle) {
        tempStyle = document.createElement('style');
        tempStyle.id = 'css-live-preview';
        document.head.appendChild(tempStyle);
      }
      
      tempStyle.textContent = css;
      preview.innerHTML = `<div class="preview-success">✓ CSS is valid and applied</div>`;
      updateStats();
    } catch (error) {
      preview.innerHTML = `<div class="preview-error">✗ CSS Error: ${error.message}</div>`;
    }
  }

  function clearCss() {
    styleElement.textContent = '';
    editorContainer.querySelector('#cssTextarea').value = '';
    
    // Clear live preview
    const tempStyle = document.querySelector('#css-live-preview');
    if (tempStyle) {
      tempStyle.remove();
    }
    
    updateStatus('CSS cleared', 'info');
    updateStats();
  }

  function exportCss() {
    const css = editorContainer.querySelector('#cssTextarea').value;
    if (!css.trim()) return;

    // Create download link
    const blob = new Blob([css], { type: 'text/css' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `custom-styles-${new Date().getTime()}.css`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    updateStatus('CSS exported successfully', 'success');
  }

  function extractCurrentPageCss() {
    const stylesheets = Array.from(document.styleSheets);
    let extractedCss = '/* Extracted CSS from current page */\n\n';

    stylesheets.forEach((sheet, index) => {
      try {
        const rules = Array.from(sheet.cssRules || sheet.rules || []);
        if (rules.length > 0) {
          extractedCss += `/* Stylesheet ${index + 1} */\n`;
          rules.forEach(rule => {
            extractedCss += rule.cssText + '\n';
          });
          extractedCss += '\n';
        }
      } catch (e) {
        extractedCss += `/* Could not access stylesheet ${index + 1} (cross-origin) */\n\n`;
      }
    });

    editorContainer.querySelector('#extractedCss').value = extractedCss;
    switchTab('extracted');
  }

  function extractElementCss() {
    const selector = editorContainer.querySelector('#extractSelector').value.trim();
    if (!selector) {
      updateStatus('Please enter a CSS selector', 'error');
      return;
    }

    try {
      const elements = document.querySelectorAll(selector);
      if (elements.length === 0) {
        updateStatus('No elements found for selector: ' + selector, 'error');
        return;
      }

      let extractedCss = `/* Extracted CSS for selector: ${selector} */\n\n`;
      
      elements.forEach((element, index) => {
        const computedStyle = window.getComputedStyle(element);
        extractedCss += `/* Element ${index + 1} */\n${selector} {\n`;
        
        // Extract key CSS properties
        const importantProps = [
          'display', 'position', 'top', 'right', 'bottom', 'left',
          'width', 'height', 'margin', 'padding', 'border',
          'background', 'color', 'font', 'text-align',
          'opacity', 'transform', 'transition'
        ];

        importantProps.forEach(prop => {
          const value = computedStyle.getPropertyValue(prop);
          if (value && value !== 'auto' && value !== 'none' && value !== 'normal') {
            extractedCss += `  ${prop}: ${value};\n`;
          }
        });

        extractedCss += '}\n\n';
      });

      editorContainer.querySelector('#extractedCss').value = extractedCss;
      switchTab('extracted');
      updateStatus(`Extracted CSS for ${elements.length} elements`, 'success');
    } catch (error) {
      updateStatus('Error extracting CSS: ' + error.message, 'error');
    }
  }

  function saveSnippet() {
    const css = editorContainer.querySelector('#cssTextarea').value.trim();
    const name = editorContainer.querySelector('#snippetName').value.trim();

    if (!css) {
      updateStatus('No CSS to save', 'error');
      return;
    }

    if (!name) {
      updateStatus('Please enter a snippet name', 'error');
      return;
    }

    chrome.storage.local.get(['cssSnippets'], (result) => {
      const snippets = result.cssSnippets || {};
      snippets[name] = {
        css: css,
        created: new Date().toISOString()
      };

      chrome.storage.local.set({ cssSnippets: snippets }, () => {
        updateStatus('Snippet saved successfully', 'success');
        editorContainer.querySelector('#snippetName').value = '';
        loadSnippets();
      });
    });
  }

  function loadSnippets() {
    chrome.storage.local.get(['cssSnippets'], (result) => {
      const snippets = result.cssSnippets || {};
      const snippetsList = editorContainer.querySelector('#snippetsList');

      if (Object.keys(snippets).length === 0) {
        snippetsList.innerHTML = '<div class="no-snippets">No saved snippets</div>';
        return;
      }

      snippetsList.innerHTML = Object.entries(snippets).map(([name, data]) => `
        <div class="snippet-item">
          <div class="snippet-header">
            <span class="snippet-name">${escapeHtml(name)}</span>
            <div class="snippet-actions">
              <button class="btn-small" onclick="loadSnippet('${escapeHtml(name)}')">Load</button>
              <button class="btn-small btn-danger" onclick="deleteSnippet('${escapeHtml(name)}')">Delete</button>
            </div>
          </div>
          <div class="snippet-preview">${escapeHtml(data.css.substring(0, 100))}...</div>
        </div>
      `).join('');
    });
  }

  function loadSnippet(name) {
    chrome.storage.local.get(['cssSnippets'], (result) => {
      const snippets = result.cssSnippets || {};
      if (snippets[name]) {
        editorContainer.querySelector('#cssTextarea').value = snippets[name].css;
        switchTab('live');
        updateStatus('Snippet loaded: ' + name, 'success');
      }
    });
  }

  function deleteSnippet(name) {
    if (!confirm('Delete snippet "' + name + '"?')) return;

    chrome.storage.local.get(['cssSnippets'], (result) => {
      const snippets = result.cssSnippets || {};
      delete snippets[name];

      chrome.storage.local.set({ cssSnippets: snippets }, () => {
        updateStatus('Snippet deleted: ' + name, 'info');
        loadSnippets();
      });
    });
  }

  function handleTabKey(e) {
    if (e.key === 'Tab') {
      e.preventDefault();
      const textarea = e.target;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      
      textarea.value = textarea.value.substring(0, start) + '  ' + textarea.value.substring(end);
      textarea.selectionStart = textarea.selectionEnd = start + 2;
      
      updateLineNumbers();
    }
  }

  function syncLineNumbers() {
    const textarea = editorContainer.querySelector('#cssTextarea');
    const lineNumbers = editorContainer.querySelector('.css-line-numbers');
    lineNumbers.scrollTop = textarea.scrollTop;
  }

  function updateLineNumbers() {
    const textarea = editorContainer.querySelector('#cssTextarea');
    const lineNumbers = editorContainer.querySelector('.css-line-numbers');
    const lines = textarea.value.split('\n').length;
    
    lineNumbers.innerHTML = Array.from({length: lines}, (_, i) => i + 1).join('\n');
  }

  function updateStatus(message, type = 'info') {
    const status = editorContainer.querySelector('#cssStatus');
    status.textContent = message;
    status.className = `status-${type}`;
  }

  function updateStats() {
    const css = editorContainer.querySelector('#cssTextarea').value;
    const ruleCount = (css.match(/\{[^}]*\}/g) || []).length;
    editorContainer.querySelector('#cssStats').textContent = `${ruleCount} rules applied`;
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  function attachKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'C') {
        e.preventDefault();
        toggle();
      }
    });
  }

  function show() {
    if (!editorContainer) createEditor();
    editorContainer.classList.remove('hidden');
    isVisible = true;
    
    // Focus the textarea
    setTimeout(() => {
      editorContainer.querySelector('#cssTextarea').focus();
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

  // Global functions for snippet management
  window.loadSnippet = loadSnippet;
  window.deleteSnippet = deleteSnippet;

  return { init, show, hide, toggle };
})();

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', CSSEditor.init);
} else {
  CSSEditor.init();
}

// Make it globally accessible
window.CSSEditor = CSSEditor;
