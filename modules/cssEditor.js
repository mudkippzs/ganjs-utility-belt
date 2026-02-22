const CSSEditor = (() => {
  let container = null;
  let isVisible = false;
  let aceEditor = null;
  let styleElement = null;
  let aceLoaded = false;

  function init() {
    attachKeyboardShortcuts();
  }

  function createStyleElement() {
    if (styleElement) return;
    styleElement = document.createElement('style');
    styleElement.id = 'css-live-editor-styles';
    document.head.appendChild(styleElement);
  }

  function loadAce() {
    if (aceLoaded) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const base = chrome.runtime.getURL('libs/ace/');
      const script = document.createElement('script');
      script.src = chrome.runtime.getURL('libs/ace/ace.js');
      script.onload = () => {
        ace.config.set('basePath', base);
        aceLoaded = true;
        const bs = document.createElement('script');
        bs.src = chrome.runtime.getURL('libs/beautify-css.js');
        bs.onload = resolve;
        bs.onerror = resolve;
        document.head.appendChild(bs);
      };
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  function createEditor() {
    if (container) return;

    container = document.createElement('div');
    container.className = 'css-editor hidden';
    container.innerHTML = `
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
            <div id="cssAceContainer" class="gub-ace-wrap"></div>
          </div>
          <div class="tab-content" data-tab="extracted">
            <div style="display:flex;gap:8px;margin-bottom:12px;flex-wrap:wrap;">
              <button id="extractCurrentPage" class="btn-primary">Extract Page CSS</button>
              <button id="extractElement" class="btn-outline">Extract Element</button>
              <input type="text" id="extractSelector" placeholder="CSS selector (e.g. .header)" style="flex:1;min-width:180px;">
            </div>
            <div id="extractedAceContainer" class="gub-ace-wrap"></div>
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

    document.body.appendChild(container);
  }

  function initAce() {
    aceEditor = ace.edit('cssAceContainer');
    aceEditor.setTheme('ace/theme/one_dark');
    aceEditor.session.setMode('ace/mode/css');
    aceEditor.setOptions({
      fontSize: '14px',
      fontFamily: "'SF Mono','Cascadia Code','Fira Code','Monaco','Courier New',monospace",
      showPrintMargin: false,
      tabSize: 2,
      useSoftTabs: true,
      wrap: true,
      enableBasicAutocompletion: true,
      enableLiveAutocompletion: false,
      placeholder: '/* Enter CSS here */'
    });

    aceEditor.session.on('change', debounce(() => {
      livePreview();
      updateStats();
    }, 400));

    const extractedEditor = ace.edit('extractedAceContainer');
    extractedEditor.setTheme('ace/theme/one_dark');
    extractedEditor.session.setMode('ace/mode/css');
    extractedEditor.setOptions({ fontSize: '14px', showPrintMargin: false, readOnly: true, wrap: true });
    container._extractedEditor = extractedEditor;

    attachEventListeners();
    loadSnippets();
  }

  function attachEventListeners() {
    container.querySelector('.css-editor-close').addEventListener('click', hide);
    container.querySelector('#cssApply').addEventListener('click', applyCss);
    container.querySelector('#cssClear').addEventListener('click', clearCss);
    container.querySelector('#cssExport').addEventListener('click', exportCss);
    container.querySelector('#cssFormat').addEventListener('click', formatCss);

    container.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        switchTab(e.target.dataset.tab);
        setTimeout(() => {
          aceEditor?.resize();
          container._extractedEditor?.resize();
        }, 50);
      });
    });

    container.querySelector('#extractCurrentPage').addEventListener('click', extractPageCss);
    container.querySelector('#extractElement').addEventListener('click', extractElementCss);
    container.querySelector('#saveSnippet').addEventListener('click', saveSnippet);
  }

  function switchTab(name) {
    container.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === name));
    container.querySelectorAll('.tab-content').forEach(c => c.classList.toggle('active', c.dataset.tab === name));
  }

  function applyCss() {
    createStyleElement();
    try {
      styleElement.textContent = aceEditor.getValue();
      status('CSS applied', 'success');
      updateStats();
    } catch (err) { status('Error: ' + err.message, 'error'); }
  }

  function livePreview() {
    createStyleElement();
    try {
      let s = document.querySelector('#css-live-preview');
      if (!s) { s = document.createElement('style'); s.id = 'css-live-preview'; document.head.appendChild(s); }
      s.textContent = aceEditor.getValue();
    } catch {}
  }

  function clearCss() {
    createStyleElement();
    styleElement.textContent = '';
    aceEditor.setValue('', -1);
    const s = document.querySelector('#css-live-preview');
    if (s) s.remove();
    status('Cleared', 'info');
    updateStats();
  }

  function exportCss() {
    const css = aceEditor.getValue();
    if (!css.trim()) return;
    downloadText(css, `styles-${Date.now()}.css`, 'text/css');
    status('Exported', 'success');
  }

  function formatCss() {
    if (typeof css_beautify === 'function') {
      aceEditor.setValue(css_beautify(aceEditor.getValue(), { indent_size: 2 }), -1);
    } else {
      const val = aceEditor.getValue();
      aceEditor.setValue(val.replace(/\s*\{\s*/g, ' {\n  ').replace(/;\s*/g, ';\n  ').replace(/\s*\}\s*/g, '\n}\n\n').replace(/  \n\}/g, '\n}').replace(/\n{3,}/g, '\n\n').trim(), -1);
    }
    status('Formatted', 'success');
  }

  function extractPageCss() {
    let out = '';
    Array.from(document.styleSheets).forEach((sheet, i) => {
      try {
        const rules = Array.from(sheet.cssRules || []);
        if (rules.length) { out += `/* Sheet ${i + 1} */\n`; rules.forEach(r => { out += r.cssText + '\n'; }); out += '\n'; }
      } catch { out += `/* Sheet ${i + 1}: cross-origin */\n\n`; }
    });
    container._extractedEditor.setValue(out, -1);
    switchTab('extracted');
  }

  function extractElementCss() {
    const sel = container.querySelector('#extractSelector').value.trim();
    if (!sel) return status('Enter a selector', 'error');
    try {
      const els = document.querySelectorAll(sel);
      if (!els.length) return status('No elements found', 'error');
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
      container._extractedEditor.setValue(out, -1);
      switchTab('extracted');
      status(`Extracted ${els.length} element(s)`, 'success');
    } catch (err) { status('Error: ' + err.message, 'error'); }
  }

  function saveSnippet() {
    const css = aceEditor.getValue().trim();
    const name = container.querySelector('#snippetName').value.trim();
    if (!css) return status('No CSS to save', 'error');
    if (!name) return status('Enter a name', 'error');
    chrome.storage.local.get(['cssSnippets'], (res) => {
      const snippets = res.cssSnippets || {};
      snippets[name] = { css, created: new Date().toISOString() };
      chrome.storage.local.set({ cssSnippets: snippets }, () => {
        container.querySelector('#snippetName').value = '';
        loadSnippets();
        status('Saved', 'success');
      });
    });
  }

  function loadSnippets() {
    chrome.storage.local.get(['cssSnippets'], (res) => {
      const snippets = res.cssSnippets || {};
      const list = container.querySelector('#snippetsList');
      const entries = Object.entries(snippets);
      if (!entries.length) { list.innerHTML = '<div class="no-data">No saved snippets</div>'; return; }
      list.innerHTML = entries.map(([name, data]) => `
        <div class="gub-list-item">
          <div class="gub-list-item-header">
            <strong>${escapeHtml(name)}</strong>
            <div style="display:flex;gap:4px;">
              <button class="btn-small btn-primary" data-snippet-load="${escapeHtml(name)}">Load</button>
              <button class="btn-small btn-danger" data-snippet-del="${escapeHtml(name)}">Del</button>
            </div>
          </div>
          <div class="gub-list-item-preview">${escapeHtml(data.css.substring(0, 80))}</div>
        </div>
      `).join('');
      list.querySelectorAll('[data-snippet-load]').forEach(b => b.onclick = () => {
        chrome.storage.local.get(['cssSnippets'], r => {
          if (r.cssSnippets?.[b.dataset.snippetLoad]) {
            aceEditor.setValue(r.cssSnippets[b.dataset.snippetLoad].css, -1);
            switchTab('live');
          }
        });
      });
      list.querySelectorAll('[data-snippet-del]').forEach(b => b.onclick = () => {
        chrome.storage.local.get(['cssSnippets'], r => {
          const s = r.cssSnippets || {};
          delete s[b.dataset.snippetDel];
          chrome.storage.local.set({ cssSnippets: s }, loadSnippets);
        });
      });
    });
  }

  function status(msg, type = 'info') {
    const el = container.querySelector('#cssStatus');
    if (el) { el.textContent = msg; el.className = `status-${type}`; }
  }

  function updateStats() {
    const css = aceEditor?.getValue() || '';
    const n = (css.match(/\{[^}]*\}/g) || []).length;
    const el = container.querySelector('#cssStats');
    if (el) el.textContent = `${n} rule${n !== 1 ? 's' : ''}`;
  }

  function attachKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'C') { e.preventDefault(); toggle(); }
      if (e.key === 'Escape' && isVisible) hide();
    });
  }

  async function show() {
    createEditor();
    container.classList.remove('hidden');
    isVisible = true;
    if (!aceLoaded) {
      status('Loading editor...');
      await loadAce();
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

window.CSSEditor = CSSEditor;
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', CSSEditor.init);
else CSSEditor.init();
