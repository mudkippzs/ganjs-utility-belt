// Text Tools - Advanced text manipulation utilities
const TextTools = (() => {
  let toolsContainer = null;
  let isVisible = false;

  function init() {
    createToolsContainer();
    attachKeyboardShortcuts();
  }

  function createToolsContainer() {
    if (toolsContainer) return;

    toolsContainer = document.createElement('div');
    toolsContainer.className = 'text-tools hidden';
    toolsContainer.innerHTML = `
      <div class="tools-panel">
        <div class="tools-header">
          <h3>📝 Text Tools</h3>
          <button class="tools-close">✕</button>
        </div>
        
        <div class="text-input-section">
          <textarea id="textInput" placeholder="Enter or paste your text here..."></textarea>
          <div class="text-stats">
            <span id="charCount">0 chars</span>
            <span id="wordCount">0 words</span>
            <span id="lineCount">0 lines</span>
          </div>
        </div>
        
        <div class="text-transformations">
          <h4>🔄 Transformations</h4>
          <div class="transform-buttons">
            <button class="transform-btn" data-transform="uppercase">UPPERCASE</button>
            <button class="transform-btn" data-transform="lowercase">lowercase</button>
            <button class="transform-btn" data-transform="titlecase">Title Case</button>
            <button class="transform-btn" data-transform="camelcase">camelCase</button>
            <button class="transform-btn" data-transform="snakecase">snake_case</button>
            <button class="transform-btn" data-transform="kebabcase">kebab-case</button>
            <button class="transform-btn" data-transform="reverse">esreveR</button>
            <button class="transform-btn" data-transform="removeSpaces">RemoveSpaces</button>
          </div>
        </div>
        
        <div class="text-utilities">
          <h4>🛠️ Utilities</h4>
          <div class="utility-buttons">
            <button class="utility-btn" data-utility="sort">Sort Lines</button>
            <button class="utility-btn" data-utility="removeDuplicates">Remove Duplicates</button>
            <button class="utility-btn" data-utility="removeEmpty">Remove Empty Lines</button>
            <button class="utility-btn" data-utility="trim">Trim Whitespace</button>
            <button class="utility-btn" data-utility="addNumbers">Add Line Numbers</button>
            <button class="utility-btn" data-utility="extractEmails">Extract Emails</button>
            <button class="utility-btn" data-utility="extractUrls">Extract URLs</button>
            <button class="utility-btn" data-utility="wordFreq">Word Frequency</button>
          </div>
        </div>
        
        <div class="encoding-section">
          <h4>🔐 Encoding/Decoding</h4>
          <div class="encoding-buttons">
            <button class="encode-btn" data-encode="base64encode">Base64 Encode</button>
            <button class="encode-btn" data-encode="base64decode">Base64 Decode</button>
            <button class="encode-btn" data-encode="urlencode">URL Encode</button>
            <button class="encode-btn" data-encode="urldecode">URL Decode</button>
            <button class="encode-btn" data-encode="htmlencode">HTML Encode</button>
            <button class="encode-btn" data-encode="htmldecode">HTML Decode</button>
          </div>
        </div>
        
        <div class="format-section">
          <h4>📋 Format</h4>
          <div class="format-buttons">
            <button class="format-btn" data-format="json">Format JSON</button>
            <button class="format-btn" data-format="minifyJson">Minify JSON</button>
            <button class="format-btn" data-format="csv">CSV to Table</button>
            <button class="format-btn" data-format="markdown">To Markdown List</button>
          </div>
        </div>
        
        <div class="output-section">
          <div class="output-controls">
            <button id="copyOutput" class="btn-primary">📋 Copy Result</button>
            <button id="clearText" class="btn-secondary">🗑️ Clear</button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(toolsContainer);
    attachEventListeners();
  }

  function attachEventListeners() {
    const textInput = toolsContainer.querySelector('#textInput');
    
    toolsContainer.querySelector('.tools-close').addEventListener('click', hide);
    toolsContainer.querySelector('#copyOutput').addEventListener('click', copyOutput);
    toolsContainer.querySelector('#clearText').addEventListener('click', clearText);
    
    textInput.addEventListener('input', updateStats);
    
    // Transform buttons
    toolsContainer.querySelectorAll('.transform-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const transform = e.target.dataset.transform;
        applyTransformation(transform);
      });
    });
    
    // Utility buttons
    toolsContainer.querySelectorAll('.utility-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const utility = e.target.dataset.utility;
        applyUtility(utility);
      });
    });
    
    // Encoding buttons
    toolsContainer.querySelectorAll('.encode-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const encoding = e.target.dataset.encode;
        applyEncoding(encoding);
      });
    });
    
    // Format buttons
    toolsContainer.querySelectorAll('.format-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const format = e.target.dataset.format;
        applyFormat(format);
      });
    });
    
    updateStats();
  }

  function updateStats() {
    const text = toolsContainer.querySelector('#textInput').value;
    const chars = text.length;
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;
    const lines = text.split('\n').length;
    
    toolsContainer.querySelector('#charCount').textContent = `${chars} chars`;
    toolsContainer.querySelector('#wordCount').textContent = `${words} words`;
    toolsContainer.querySelector('#lineCount').textContent = `${lines} lines`;
  }

  function applyTransformation(transform) {
    const textInput = toolsContainer.querySelector('#textInput');
    const text = textInput.value;
    let result = '';
    
    switch (transform) {
      case 'uppercase':
        result = text.toUpperCase();
        break;
      case 'lowercase':
        result = text.toLowerCase();
        break;
      case 'titlecase':
        result = text.replace(/\w\S*/g, txt => 
          txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
        );
        break;
      case 'camelcase':
        result = text.replace(/(?:^\w|[A-Z]|\b\w)/g, (word, index) => 
          index === 0 ? word.toLowerCase() : word.toUpperCase()
        ).replace(/\s+/g, '');
        break;
      case 'snakecase':
        result = text.toLowerCase().replace(/\s+/g, '_').replace(/[^\w_]/g, '');
        break;
      case 'kebabcase':
        result = text.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '');
        break;
      case 'reverse':
        result = text.split('').reverse().join('');
        break;
      case 'removeSpaces':
        result = text.replace(/\s+/g, '');
        break;
    }
    
    textInput.value = result;
    updateStats();
  }

  function applyUtility(utility) {
    const textInput = toolsContainer.querySelector('#textInput');
    const text = textInput.value;
    let result = '';
    
    switch (utility) {
      case 'sort':
        result = text.split('\n').sort().join('\n');
        break;
      case 'removeDuplicates':
        const lines = text.split('\n');
        result = [...new Set(lines)].join('\n');
        break;
      case 'removeEmpty':
        result = text.split('\n').filter(line => line.trim()).join('\n');
        break;
      case 'trim':
        result = text.split('\n').map(line => line.trim()).join('\n');
        break;
      case 'addNumbers':
        result = text.split('\n').map((line, i) => `${i + 1}. ${line}`).join('\n');
        break;
      case 'extractEmails':
        const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
        const emails = text.match(emailRegex) || [];
        result = emails.join('\n');
        break;
      case 'extractUrls':
        const urlRegex = /https?:\/\/[^\s]+/g;
        const urls = text.match(urlRegex) || [];
        result = urls.join('\n');
        break;
      case 'wordFreq':
        const words = text.toLowerCase().split(/\W+/).filter(w => w);
        const freq = {};
        words.forEach(word => freq[word] = (freq[word] || 0) + 1);
        result = Object.entries(freq)
          .sort((a, b) => b[1] - a[1])
          .map(([word, count]) => `${word}: ${count}`)
          .join('\n');
        break;
    }
    
    textInput.value = result;
    updateStats();
  }

  function applyEncoding(encoding) {
    const textInput = toolsContainer.querySelector('#textInput');
    const text = textInput.value;
    let result = '';
    
    try {
      switch (encoding) {
        case 'base64encode':
          result = btoa(text);
          break;
        case 'base64decode':
          result = atob(text);
          break;
        case 'urlencode':
          result = encodeURIComponent(text);
          break;
        case 'urldecode':
          result = decodeURIComponent(text);
          break;
        case 'htmlencode':
          result = text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#x27;');
          break;
        case 'htmldecode':
          result = text
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/&#x27;/g, "'");
          break;
      }
    } catch (error) {
      showNotification('Error: ' + error.message, 'error');
      return;
    }
    
    textInput.value = result;
    updateStats();
  }

  function applyFormat(format) {
    const textInput = toolsContainer.querySelector('#textInput');
    const text = textInput.value;
    let result = '';
    
    try {
      switch (format) {
        case 'json':
          const parsed = JSON.parse(text);
          result = JSON.stringify(parsed, null, 2);
          break;
        case 'minifyJson':
          const minified = JSON.parse(text);
          result = JSON.stringify(minified);
          break;
        case 'csv':
          const lines = text.split('\n');
          const headers = lines[0].split(',');
          const data = lines.slice(1).map(line => line.split(','));
          
          result = '<table border="1">\n';
          result += '<tr>' + headers.map(h => `<th>${h.trim()}</th>`).join('') + '</tr>\n';
          data.forEach(row => {
            result += '<tr>' + row.map(cell => `<td>${cell.trim()}</td>`).join('') + '</tr>\n';
          });
          result += '</table>';
          break;
        case 'markdown':
          result = text.split('\n')
            .filter(line => line.trim())
            .map(line => `- ${line.trim()}`)
            .join('\n');
          break;
      }
    } catch (error) {
      showNotification('Error: ' + error.message, 'error');
      return;
    }
    
    textInput.value = result;
    updateStats();
  }

  function copyOutput() {
    const text = toolsContainer.querySelector('#textInput').value;
    navigator.clipboard.writeText(text).then(() => {
      showNotification('Text copied to clipboard!');
    });
  }

  function clearText() {
    toolsContainer.querySelector('#textInput').value = '';
    updateStats();
  }

  function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `text-notification ${type}`;
    notification.textContent = message;
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: ${type === 'error' ? '#f44336' : '#4CAF50'};
      color: white;
      padding: 12px 20px;
      border-radius: 4px;
      z-index: 1000000;
      font-size: 14px;
    `;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 3000);
  }

  function attachKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'T') {
        e.preventDefault();
        toggle();
      }
      if (e.key === 'Escape' && isVisible) {
        hide();
      }
    });
  }

  function show() {
    if (!toolsContainer) createToolsContainer();
    toolsContainer.classList.remove('hidden');
    isVisible = true;
    
    setTimeout(() => {
      toolsContainer.querySelector('#textInput').focus();
    }, 100);
  }

  function hide() {
    if (toolsContainer) {
      toolsContainer.classList.add('hidden');
    }
    isVisible = false;
  }

  function toggle() {
    isVisible ? hide() : show();
  }

  return { init, show, hide, toggle };
})();

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', TextTools.init);
} else {
  TextTools.init();
}

// Make it globally accessible
window.TextTools = TextTools;
