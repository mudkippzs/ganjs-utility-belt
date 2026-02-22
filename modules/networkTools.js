const NetworkTools = (() => {
  let container = null;
  let isVisible = false;
  let entries = [];
  let observer = null;
  let isMonitoring = false;
  let monitorStart = null;
  let durationTimer = null;

  function init() {
    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'N') { e.preventDefault(); toggle(); }
      if (e.key === 'Escape' && isVisible) hide();
    });
  }

  function bgFetch(url, options = {}) {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ action: 'fetchUrl', url, options }, (res) => {
        resolve(res || { error: 'No response from background' });
      });
    });
  }

  function createUI() {
    if (container) return;
    container = document.createElement('div');
    container.className = 'ganj-ext-network-tools hidden';
    container.innerHTML = `
      <div class="network-tools-panel">
        <div class="network-tools-header">
          <h3>🌐 Network Tools</h3>
          <div class="header-controls">
            <span class="shortcut-hint">Ctrl+Shift+N</span>
            <button class="network-tools-close">✕</button>
          </div>
        </div>
        <div class="network-tools-tabs">
          <button class="network-tab-btn active" data-tab="monitor">Monitor</button>
          <button class="network-tab-btn" data-tab="api">API Tester</button>
          <button class="network-tab-btn" data-tab="tools">Tools</button>
          <button class="network-tab-btn" data-tab="security">Security</button>
        </div>
        <div class="network-tools-content">

          <!-- Monitor -->
          <div class="network-tab-content active" data-tab="monitor">
            <div class="monitor-controls">
              <button id="ntStartMon" class="btn-primary">▶ Start</button>
              <button id="ntStopMon" class="btn-secondary" disabled>⏹ Stop</button>
              <button id="ntClearMon" class="btn-outline">Clear</button>
              <button id="ntExportMon" class="btn-outline">Export</button>
            </div>
            <div class="monitor-stats">
              <div class="stat-item"><span class="stat-label">Requests</span><span class="stat-value" id="ntTotal">0</span></div>
              <div class="stat-item"><span class="stat-label">Status</span><span class="stat-value" id="ntStatus">Stopped</span></div>
              <div class="stat-item"><span class="stat-label">Duration</span><span class="stat-value" id="ntDuration">—</span></div>
              <div class="stat-item"><span class="stat-label">Avg Time</span><span class="stat-value" id="ntAvg">—</span></div>
            </div>
            <div class="monitor-filters">
              <input type="text" id="ntFilterUrl" placeholder="Filter URL...">
              <select id="ntFilterType">
                <option value="">All types</option>
                <option value="xmlhttprequest">XHR</option>
                <option value="fetch">Fetch</option>
                <option value="script">Script</option>
                <option value="css">CSS</option>
                <option value="img">Image</option>
                <option value="font">Font</option>
              </select>
            </div>
            <div id="ntRequestList" class="request-list">
              <div class="no-data">Click Start to begin monitoring network activity.</div>
            </div>
          </div>

          <!-- API Tester -->
          <div class="network-tab-content" data-tab="api">
            <div class="api-test-form">
              <div class="request-line">
                <select id="ntMethod">
                  <option>GET</option><option>POST</option><option>PUT</option>
                  <option>DELETE</option><option>PATCH</option><option>HEAD</option><option>OPTIONS</option>
                </select>
                <input type="url" id="ntUrl" placeholder="https://api.example.com/endpoint">
                <button id="ntSend" class="btn-primary">Send</button>
              </div>
              <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:8px;">
                <button class="btn-small btn-outline" data-qt="https://httpbin.org/get">GET test</button>
                <button class="btn-small btn-outline" data-qt="https://httpbin.org/post" data-qm="POST">POST test</button>
                <button class="btn-small btn-outline" data-qt="https://httpbin.org/status/404">404 test</button>
                <button class="btn-small btn-outline" data-qt="https://httpbin.org/headers">Headers test</button>
                <button class="btn-small btn-outline" data-qt="https://httpbin.org/delay/1">Slow (1s)</button>
                <button class="btn-small btn-outline" data-qt="https://jsonplaceholder.typicode.com/todos/1">JSON API</button>
              </div>
              <details style="margin-bottom:8px;">
                <summary style="cursor:pointer;font-size:13px;color:var(--ganj-text-secondary,#475569);margin-bottom:8px;">Headers & Body</summary>
                <div id="ntHeaders" style="margin-bottom:8px;">
                  <div class="header-row" style="display:flex;gap:6px;margin-bottom:4px;">
                    <input type="text" placeholder="Header name" class="header-key" style="flex:1;">
                    <input type="text" placeholder="value" class="header-value" style="flex:1;">
                  </div>
                </div>
                <button id="ntAddHeader" class="btn-small btn-outline" style="margin-bottom:8px;">+ Header</button>
                <textarea id="ntBody" placeholder='{"key": "value"}' style="width:100%;height:80px;font-family:var(--ganj-font-mono,monospace);font-size:13px;padding:8px;border:1px solid var(--ganj-border,#e2e8f0);border-radius:6px;resize:vertical;color:var(--ganj-text,#1e293b);"></textarea>
              </details>
            </div>
            <div id="ntResponse" style="margin-top:12px;">
              <div class="no-data">Send a request to see the response.</div>
            </div>
          </div>

          <!-- Tools -->
          <div class="network-tab-content" data-tab="tools">
            <div class="network-tools-grid">
              <div class="tool-card">
                <h4>📡 Ping</h4>
                <div style="display:flex;gap:6px;">
                  <input type="text" id="ntPingHost" placeholder="example.com" style="flex:1;">
                  <button id="ntPing" class="btn-primary btn-small">Ping</button>
                </div>
                <div id="ntPingResult"></div>
              </div>
              <div class="tool-card">
                <h4>📄 HTTP Headers</h4>
                <div style="display:flex;gap:6px;">
                  <input type="url" id="ntHeadersUrl" placeholder="https://example.com" style="flex:1;">
                  <button id="ntCheckHeaders" class="btn-primary btn-small">Check</button>
                </div>
                <div id="ntHeadersResult"></div>
              </div>
              <div class="tool-card">
                <h4>🔗 URL Analyzer</h4>
                <div style="display:flex;gap:6px;">
                  <input type="url" id="ntAnalyzeUrl" placeholder="https://example.com/path?q=1" style="flex:1;">
                  <button id="ntAnalyze" class="btn-primary btn-small">Analyze</button>
                </div>
                <div id="ntAnalyzeResult"></div>
              </div>
              <div class="tool-card">
                <h4>🚀 Perf Test</h4>
                <div style="display:flex;gap:6px;">
                  <input type="url" id="ntPerfUrl" placeholder="https://example.com" style="flex:1;">
                  <input type="number" id="ntPerfCount" value="5" min="1" max="20" style="width:50px;">
                  <button id="ntPerf" class="btn-primary btn-small">Run</button>
                </div>
                <div id="ntPerfResult"></div>
              </div>
            </div>
          </div>

          <!-- Security -->
          <div class="network-tab-content" data-tab="security">
            <div style="margin-bottom:16px;">
              <button id="ntRunSecurity" class="btn-primary">🔒 Run Security Scan</button>
              <span style="font-size:12px;color:var(--ganj-text-muted,#64748b);margin-left:8px;">Checks current page headers & configuration</span>
            </div>
            <div id="ntSecurityResults"><div class="no-data">Click Run to scan this page for common security issues.</div></div>
          </div>

        </div>
      </div>
    `;
    document.body.appendChild(container);
    bindEvents();
  }

  function bindEvents() {
    container.querySelector('.network-tools-close').addEventListener('click', hide);

    container.querySelectorAll('.network-tab-btn').forEach(b => {
      b.addEventListener('click', () => {
        container.querySelectorAll('.network-tab-btn').forEach(x => x.classList.toggle('active', x === b));
        container.querySelectorAll('.network-tab-content').forEach(c => c.classList.toggle('active', c.dataset.tab === b.dataset.tab));
      });
    });

    // Monitor
    container.querySelector('#ntStartMon').addEventListener('click', startMonitor);
    container.querySelector('#ntStopMon').addEventListener('click', stopMonitor);
    container.querySelector('#ntClearMon').addEventListener('click', () => { entries = []; renderEntries(); updateMonitorStats(); });
    container.querySelector('#ntExportMon').addEventListener('click', () => {
      if (!entries.length) return;
      downloadText(JSON.stringify(entries, null, 2), `network-${Date.now()}.json`, 'application/json');
    });
    container.querySelector('#ntFilterUrl').addEventListener('input', renderEntries);
    container.querySelector('#ntFilterType').addEventListener('change', renderEntries);

    // API tester
    container.querySelector('#ntSend').addEventListener('click', sendRequest);
    container.querySelector('#ntAddHeader').addEventListener('click', () => {
      const row = document.createElement('div');
      row.className = 'header-row';
      row.style.cssText = 'display:flex;gap:6px;margin-bottom:4px;';
      row.innerHTML = `<input type="text" placeholder="Header" class="header-key" style="flex:1;">
        <input type="text" placeholder="value" class="header-value" style="flex:1;">
        <button class="btn-small btn-danger" style="padding:4px 8px;">×</button>`;
      row.querySelector('button').onclick = () => row.remove();
      container.querySelector('#ntHeaders').appendChild(row);
    });
    container.querySelectorAll('[data-qt]').forEach(b => {
      b.addEventListener('click', () => {
        container.querySelector('#ntUrl').value = b.dataset.qt;
        container.querySelector('#ntMethod').value = b.dataset.qm || 'GET';
        sendRequest();
      });
    });

    // Tools
    container.querySelector('#ntPing').addEventListener('click', pingHost);
    container.querySelector('#ntCheckHeaders').addEventListener('click', checkHeaders);
    container.querySelector('#ntAnalyze').addEventListener('click', analyzeUrl);
    container.querySelector('#ntPerf').addEventListener('click', perfTest);

    // Security
    container.querySelector('#ntRunSecurity').addEventListener('click', runSecurityScan);
  }

  // ---- Monitor (uses PerformanceObserver) ----

  function startMonitor() {
    if (isMonitoring) return;
    isMonitoring = true;
    monitorStart = Date.now();
    entries = [];

    observer = new PerformanceObserver((list) => {
      list.getEntries().forEach(e => {
        entries.push({
          url: e.name,
          type: e.initiatorType,
          duration: Math.round(e.duration),
          size: e.transferSize || 0,
          start: Math.round(e.startTime),
          status: e.responseStatus || 0,
          protocol: e.nextHopProtocol || ''
        });
      });
      renderEntries();
      updateMonitorStats();
    });
    observer.observe({ type: 'resource', buffered: false });

    container.querySelector('#ntStartMon').disabled = true;
    container.querySelector('#ntStopMon').disabled = false;
    container.querySelector('#ntStatus').textContent = 'Active';
    container.querySelector('#ntStatus').style.color = 'var(--ganj-success, #059669)';

    durationTimer = setInterval(() => {
      const s = Math.round((Date.now() - monitorStart) / 1000);
      container.querySelector('#ntDuration').textContent = s < 60 ? `${s}s` : `${Math.floor(s/60)}m ${s%60}s`;
    }, 1000);

    renderEntries();
    updateMonitorStats();
  }

  function stopMonitor() {
    isMonitoring = false;
    if (observer) { observer.disconnect(); observer = null; }
    clearInterval(durationTimer);

    container.querySelector('#ntStartMon').disabled = false;
    container.querySelector('#ntStopMon').disabled = true;
    container.querySelector('#ntStatus').textContent = 'Stopped';
    container.querySelector('#ntStatus').style.color = '';
  }

  function renderEntries() {
    const urlFilter = (container.querySelector('#ntFilterUrl')?.value || '').toLowerCase();
    const typeFilter = container.querySelector('#ntFilterType')?.value || '';
    const list = container.querySelector('#ntRequestList');

    let filtered = entries.filter(e => {
      if (urlFilter && !e.url.toLowerCase().includes(urlFilter)) return false;
      if (typeFilter && e.type !== typeFilter) return false;
      return true;
    });

    if (!filtered.length) {
      list.innerHTML = `<div class="no-data">${isMonitoring ? 'Waiting for requests...' : 'No requests recorded.'}</div>`;
      return;
    }

    list.innerHTML = filtered.slice(-100).reverse().map(e => {
      const domain = (() => { try { return new URL(e.url).hostname; } catch { return ''; } })();
      const shortUrl = e.url.length > 80 ? e.url.substring(0, 80) + '...' : e.url;
      const sizeStr = e.size > 1024 ? `${(e.size/1024).toFixed(1)}KB` : e.size > 0 ? `${e.size}B` : '';
      const badge = e.type === 'xmlhttprequest' ? 'XHR' : e.type === 'fetch' ? 'FETCH' : e.type.toUpperCase();
      const color = { xmlhttprequest: '#2563eb', fetch: '#2563eb', script: '#7c3aed', css: '#059669', img: '#d97706', font: '#64748b' }[e.type] || '#94a3b8';
      return `<div class="request-item">
        <div class="request-header">
          <span class="request-method" style="background:${color}!important;">${badge}</span>
          <span class="request-time">${e.duration}ms</span>
          ${sizeStr ? `<span class="request-time">${sizeStr}</span>` : ''}
          ${e.protocol ? `<span class="request-time">${e.protocol}</span>` : ''}
        </div>
        <div class="request-url" title="${escapeHtml(e.url)}">${escapeHtml(shortUrl)}</div>
      </div>`;
    }).join('');
  }

  function updateMonitorStats() {
    container.querySelector('#ntTotal').textContent = entries.length;
    if (entries.length) {
      const avg = entries.reduce((s, e) => s + e.duration, 0) / entries.length;
      container.querySelector('#ntAvg').textContent = `${Math.round(avg)}ms`;
    }
  }

  // ---- API Tester (routes through background.js to bypass CORS) ----

  async function sendRequest() {
    const method = container.querySelector('#ntMethod').value;
    const url = container.querySelector('#ntUrl').value.trim();
    if (!url) return;

    const headers = {};
    container.querySelectorAll('#ntHeaders .header-row').forEach(r => {
      const k = r.querySelector('.header-key')?.value.trim();
      const v = r.querySelector('.header-value')?.value.trim();
      if (k && v) headers[k] = v;
    });

    const opts = { method, headers };
    if (['POST', 'PUT', 'PATCH'].includes(method)) {
      const body = container.querySelector('#ntBody').value.trim();
      if (body) {
        opts.body = body;
        if (!headers['Content-Type']) opts.headers['Content-Type'] = 'application/json';
      }
    }

    const resDiv = container.querySelector('#ntResponse');
    resDiv.innerHTML = '<div class="no-data">Sending...</div>';

    const res = await bgFetch(url, opts);
    lastResponseBody = res.body || '';

    if (res.error) {
      resDiv.innerHTML = `<div class="tool-result error"><strong>Error:</strong> ${escapeHtml(res.error)}<br>Time: ${res.time}ms</div>`;
      return;
    }

    const statusColor = res.status < 300 ? '#059669' : res.status < 400 ? '#2563eb' : '#dc2626';

    let bodyHtml;
    let isJson = false;
    try {
      const parsed = JSON.parse(res.body);
      isJson = true;
      bodyHtml = buildJsonTree(parsed);
    } catch {
      bodyHtml = `<pre class="nt-raw-body">${escapeHtml(res.body)}</pre>`;
    }

    resDiv.innerHTML = `
      <div class="nt-response-bar">
        <span style="font-weight:700;color:${statusColor};">${res.status} ${res.statusText}</span>
        <span>${res.time}ms</span>
        <span>${(res.body?.length || 0).toLocaleString()} bytes</span>
        <div style="margin-left:auto;display:flex;gap:4px;">
          ${isJson ? '<button class="btn-small btn-outline" id="ntToggleView">Raw</button>' : ''}
          <button class="btn-small btn-primary" id="ntCopyBody">Copy</button>
        </div>
      </div>
      <div id="ntBodyContainer" style="margin-bottom:10px;">
        <div id="ntTreeView">${bodyHtml}</div>
        ${isJson ? `<pre class="nt-raw-body" id="ntRawView" style="display:none;">${escapeHtml(JSON.stringify(JSON.parse(res.body), null, 2))}</pre>` : ''}
      </div>
      <details>
        <summary style="cursor:pointer;font-weight:600;font-size:13px;margin-bottom:6px;">Response Headers</summary>
        <div class="nt-json-tree" style="padding:10px;">${buildJsonTree(res.headers)}</div>
      </details>
    `;

    resDiv.querySelector('#ntCopyBody').addEventListener('click', () => {
      navigator.clipboard.writeText(lastResponseBody).then(() => {
        const btn = resDiv.querySelector('#ntCopyBody');
        btn.textContent = 'Copied!';
        setTimeout(() => btn.textContent = 'Copy', 1500);
      });
    });

    if (isJson) {
      let showRaw = false;
      resDiv.querySelector('#ntToggleView').addEventListener('click', () => {
        showRaw = !showRaw;
        resDiv.querySelector('#ntTreeView').style.display = showRaw ? 'none' : '';
        resDiv.querySelector('#ntRawView').style.display = showRaw ? '' : 'none';
        resDiv.querySelector('#ntToggleView').textContent = showRaw ? 'Tree' : 'Raw';
      });
    }

    resDiv.querySelectorAll('.nt-toggle').forEach(el => {
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        const children = el.parentElement.querySelector('.nt-children');
        if (children) {
          const collapsed = children.style.display === 'none';
          children.style.display = collapsed ? '' : 'none';
          el.textContent = collapsed ? '▾' : '▸';
        }
      });
    });
  }

  let lastResponseBody = '';

  function buildJsonTree(data, depth = 0) {
    if (data === null) return '<span class="nt-v-null">null</span>';
    if (data === undefined) return '<span class="nt-v-null">undefined</span>';

    const type = typeof data;
    if (type === 'string') return `<span class="nt-v-str">"${escapeHtml(data)}"</span>`;
    if (type === 'number') return `<span class="nt-v-num">${data}</span>`;
    if (type === 'boolean') return `<span class="nt-v-bool">${data}</span>`;

    if (Array.isArray(data)) {
      if (data.length === 0) return '<span class="nt-v-bracket">[]</span>';
      const collapsed = depth > 1;
      const items = data.map((item, i) => {
        return `<div class="nt-prop"><span class="nt-key">${i}</span>: ${buildJsonTree(item, depth + 1)}${i < data.length - 1 ? ',' : ''}</div>`;
      }).join('');
      return `<span class="nt-toggle">${collapsed ? '▸' : '▾'}</span><span class="nt-v-bracket">[</span><span class="nt-count">${data.length}</span><div class="nt-children" style="${collapsed ? 'display:none;' : ''}">${items}</div><span class="nt-v-bracket">]</span>`;
    }

    if (type === 'object') {
      const keys = Object.keys(data);
      if (keys.length === 0) return '<span class="nt-v-bracket">{}</span>';
      const collapsed = depth > 1;
      const items = keys.map((key, i) => {
        return `<div class="nt-prop"><span class="nt-key">"${escapeHtml(key)}"</span>: ${buildJsonTree(data[key], depth + 1)}${i < keys.length - 1 ? ',' : ''}</div>`;
      }).join('');
      return `<span class="nt-toggle">${collapsed ? '▸' : '▾'}</span><span class="nt-v-bracket">{</span><span class="nt-count">${keys.length}</span><div class="nt-children" style="${collapsed ? 'display:none;' : ''}">${items}</div><span class="nt-v-bracket">}</span>`;
    }

    return escapeHtml(String(data));
  }

  // ---- Tools ----

  async function pingHost() {
    const host = container.querySelector('#ntPingHost').value.trim();
    if (!host) return;
    const el = container.querySelector('#ntPingResult');
    el.innerHTML = '<div class="tool-result">Pinging...</div>';

    const times = [];
    for (let i = 0; i < 3; i++) {
      const res = await bgFetch(`https://${host}`, { method: 'HEAD' });
      times.push(res.error ? null : res.time);
    }

    const valid = times.filter(t => t !== null);
    if (!valid.length) {
      el.innerHTML = `<div class="tool-result error">❌ ${escapeHtml(host)} — unreachable or blocks HEAD requests</div>`;
    } else {
      const avg = Math.round(valid.reduce((a, b) => a + b, 0) / valid.length);
      const min = Math.min(...valid);
      const max = Math.max(...valid);
      el.innerHTML = `<div class="tool-result">✅ ${escapeHtml(host)}<br>Avg: ${avg}ms · Min: ${min}ms · Max: ${max}ms · ${valid.length}/3 successful</div>`;
    }
  }

  async function checkHeaders() {
    const url = container.querySelector('#ntHeadersUrl').value.trim();
    if (!url) return;
    const el = container.querySelector('#ntHeadersResult');
    el.innerHTML = '<div class="tool-result">Fetching...</div>';

    const res = await bgFetch(url, { method: 'HEAD' });
    if (res.error) {
      el.innerHTML = `<div class="tool-result error">Error: ${escapeHtml(res.error)}</div>`;
      return;
    }

    const h = res.headers;
    const secHeaders = ['content-security-policy', 'strict-transport-security', 'x-frame-options', 'x-content-type-options', 'referrer-policy', 'permissions-policy'];
    const rows = Object.entries(h).map(([k, v]) => {
      const isSec = secHeaders.includes(k.toLowerCase());
      return `<div style="display:flex;gap:8px;padding:4px 0;border-bottom:1px solid var(--ganj-border,#e2e8f0);font-size:12px;">
        <span style="font-weight:600;min-width:200px;color:${isSec ? 'var(--ganj-primary,#2563eb)' : 'var(--ganj-text,#1e293b)'};">${escapeHtml(k)}</span>
        <span style="word-break:break-all;color:var(--ganj-text-secondary,#475569);">${escapeHtml(v)}</span>
      </div>`;
    }).join('');

    el.innerHTML = `<div class="tool-result"><strong>${res.status} ${res.statusText}</strong> · ${res.time}ms<div style="margin-top:8px;">${rows}</div></div>`;
  }

  function analyzeUrl() {
    const raw = container.querySelector('#ntAnalyzeUrl').value.trim();
    if (!raw) return;
    const el = container.querySelector('#ntAnalyzeResult');
    try {
      const u = new URL(raw);
      const params = [...u.searchParams.entries()];
      el.innerHTML = `<div class="tool-result">
        <div style="display:grid;grid-template-columns:auto 1fr;gap:4px 12px;font-size:12px;">
          <strong>Protocol</strong><span>${u.protocol}</span>
          <strong>Host</strong><span>${u.hostname}</span>
          <strong>Port</strong><span>${u.port || (u.protocol === 'https:' ? '443' : '80')}</span>
          <strong>Path</strong><span>${u.pathname}</span>
          ${u.hash ? `<strong>Hash</strong><span>${u.hash}</span>` : ''}
          ${params.length ? `<strong>Params</strong><span>${params.length}</span>` : ''}
        </div>
        ${params.length ? `<div style="margin-top:8px;padding-top:8px;border-top:1px solid var(--ganj-border,#e2e8f0);">
          ${params.map(([k, v]) => `<div style="font-size:12px;"><strong>${escapeHtml(k)}</strong> = ${escapeHtml(v)}</div>`).join('')}
        </div>` : ''}
      </div>`;
    } catch (err) {
      el.innerHTML = `<div class="tool-result error">Invalid URL: ${escapeHtml(err.message)}</div>`;
    }
  }

  async function perfTest() {
    const url = container.querySelector('#ntPerfUrl').value.trim();
    const count = Math.min(parseInt(container.querySelector('#ntPerfCount').value) || 5, 20);
    if (!url) return;
    const el = container.querySelector('#ntPerfResult');
    el.innerHTML = '<div class="tool-result">Running...</div>';

    const times = [];
    for (let i = 0; i < count; i++) {
      const res = await bgFetch(url + (url.includes('?') ? '&' : '?') + '_t=' + Date.now(), { method: 'GET' });
      times.push(res.error ? null : res.time);
    }

    const valid = times.filter(t => t !== null);
    if (!valid.length) {
      el.innerHTML = '<div class="tool-result error">All requests failed</div>';
      return;
    }

    const avg = Math.round(valid.reduce((a, b) => a + b, 0) / valid.length);
    const min = Math.min(...valid);
    const max = Math.max(...valid);
    const p95 = valid.sort((a, b) => a - b)[Math.floor(valid.length * 0.95)] || max;

    el.innerHTML = `<div class="tool-result">
      <strong>Results:</strong> ${valid.length}/${count} OK<br>
      Avg: ${avg}ms · Min: ${min}ms · Max: ${max}ms · P95: ${p95}ms
    </div>`;
  }

  // ---- Security Scan ----

  async function runSecurityScan() {
    const el = container.querySelector('#ntSecurityResults');
    el.innerHTML = '<div class="no-data">Scanning...</div>';

    const url = window.location.href;
    const res = await bgFetch(url, { method: 'GET' });
    const h = res.headers || {};

    const checks = [];

    function check(pass, label, detail) {
      checks.push({ pass, label, detail });
    }

    check(window.location.protocol === 'https:', 'HTTPS', window.location.protocol === 'https:' ? 'Connection is encrypted' : 'Page served over insecure HTTP');
    check(!!h['strict-transport-security'], 'HSTS', h['strict-transport-security'] || 'Missing Strict-Transport-Security header');
    check(!!h['content-security-policy'], 'CSP', h['content-security-policy'] ? 'Policy: ' + h['content-security-policy'].substring(0, 100) + '...' : 'Missing Content-Security-Policy header');
    check(!!h['x-frame-options'] || (h['content-security-policy'] || '').includes('frame-ancestors'), 'Clickjacking Protection', h['x-frame-options'] || 'Missing X-Frame-Options / frame-ancestors');
    check(h['x-content-type-options'] === 'nosniff', 'MIME Sniffing', h['x-content-type-options'] || 'Missing X-Content-Type-Options: nosniff');
    check(!!h['referrer-policy'], 'Referrer Policy', h['referrer-policy'] || 'Missing Referrer-Policy header');
    check(!!h['permissions-policy'] || !!h['feature-policy'], 'Permissions Policy', h['permissions-policy'] || h['feature-policy'] || 'Missing Permissions-Policy header');

    const mixedContent = document.querySelectorAll('img[src^="http:"], script[src^="http:"], link[href^="http:"]');
    check(mixedContent.length === 0, 'Mixed Content', mixedContent.length === 0 ? 'No mixed content found' : `${mixedContent.length} insecure resource(s) found`);

    const cookies = document.cookie;
    check(true, 'Cookies', cookies ? `${cookies.split(';').length} cookie(s) accessible via JS (HttpOnly cookies are hidden)` : 'No JS-accessible cookies');

    const forms = document.querySelectorAll('form:not([action^="https"])');
    const insecureForms = [...forms].filter(f => f.action && f.action.startsWith('http:'));
    check(insecureForms.length === 0, 'Form Security', insecureForms.length === 0 ? 'All forms use secure endpoints' : `${insecureForms.length} form(s) submit over HTTP`);

    const passCount = checks.filter(c => c.pass).length;
    const score = Math.round((passCount / checks.length) * 100);
    const scoreColor = score >= 80 ? 'var(--ganj-success,#059669)' : score >= 50 ? 'var(--ganj-warning,#d97706)' : 'var(--ganj-error,#dc2626)';

    el.innerHTML = `
      <div style="text-align:center;margin-bottom:16px;">
        <div style="font-size:36px;font-weight:700;color:${scoreColor};">${score}%</div>
        <div style="font-size:13px;color:var(--ganj-text-muted,#64748b);">${passCount}/${checks.length} checks passed</div>
      </div>
      ${checks.map(c => `
        <div style="display:flex;gap:10px;padding:10px;border:1px solid var(--ganj-border,#e2e8f0);border-radius:8px;margin-bottom:6px;align-items:flex-start;background:${c.pass ? 'var(--ganj-bg-alt,#f8fafc)' : 'var(--ganj-error-light,#fee2e2)'};">
          <span style="font-size:16px;flex-shrink:0;">${c.pass ? '✅' : '❌'}</span>
          <div>
            <div style="font-weight:600;font-size:13px;color:var(--ganj-text,#1e293b);">${c.label}</div>
            <div style="font-size:12px;color:var(--ganj-text-muted,#64748b);word-break:break-all;">${escapeHtml(c.detail)}</div>
          </div>
        </div>
      `).join('')}
    `;
  }

  // ---- Shared ----

  function show() {
    createUI();
    container.classList.remove('hidden');
    isVisible = true;
  }

  function hide() {
    if (container) container.classList.add('hidden');
    isVisible = false;
  }

  function toggle() { isVisible ? hide() : show(); }

  return { init, show, hide, toggle };
})();

window.NetworkTools = NetworkTools;
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', NetworkTools.init);
else NetworkTools.init();
