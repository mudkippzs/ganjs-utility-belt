// Network Tools - Developer network utilities
const NetworkTools = (() => {
  let container = null;
  let isVisible = false;
  let requestHistory = [];
  let isMonitoring = false;
  let monitoringStart = null;

  function init() {
    createInterface();
    setupKeyboardShortcut();
    loadRequestHistory();
  }

  function setupKeyboardShortcut() {
    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'N') {
        e.preventDefault();
        toggle();
      }
    });
  }

  function createInterface() {
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
          <button class="network-tab-btn active" data-tab="monitor">📊 Monitor</button>
          <button class="network-tab-btn" data-tab="api-test">🧪 API Test</button>
          <button class="network-tab-btn" data-tab="analysis">📈 Analysis</button>
          <button class="network-tab-btn" data-tab="tools">🔧 Tools</button>
        </div>
        
        <div class="network-tools-content">
          <!-- Monitor Tab -->
          <div class="network-tab-content active" data-tab="monitor">
            <div class="monitor-controls">
              <button id="startMonitoring" class="btn-primary">▶️ Start Monitoring</button>
              <button id="stopMonitoring" class="btn-secondary" disabled>⏹️ Stop</button>
              <button id="clearHistory" class="btn-outline">🗑️ Clear</button>
              <button id="exportRequests" class="btn-outline">💾 Export</button>
            </div>
            
            <div class="monitor-stats">
              <div class="stat-item">
                <span class="stat-label">Total Requests:</span>
                <span id="totalRequests">0</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">Monitoring:</span>
                <span id="monitoringStatus">Stopped</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">Duration:</span>
                <span id="monitoringDuration">0s</span>
              </div>
            </div>
            
            <div class="monitor-filters">
              <input type="text" id="filterUrl" placeholder="Filter by URL...">
              <select id="filterMethod">
                <option value="">All Methods</option>
                <option value="GET">GET</option>
                <option value="POST">POST</option>
                <option value="PUT">PUT</option>
                <option value="DELETE">DELETE</option>
                <option value="PATCH">PATCH</option>
              </select>
              <select id="filterStatus">
                <option value="">All Status</option>
                <option value="2xx">2xx Success</option>
                <option value="3xx">3xx Redirect</option>
                <option value="4xx">4xx Client Error</option>
                <option value="5xx">5xx Server Error</option>
              </select>
            </div>
            
            <div class="request-list" id="requestList">
              <div class="no-requests">No requests recorded. Start monitoring to see network activity.</div>
            </div>
          </div>
          
          <!-- API Test Tab -->
          <div class="network-tab-content" data-tab="api-test">
            <div class="api-test-form">
              <div class="request-builder">
                <div class="request-line">
                  <select id="requestMethod">
                    <option value="GET">GET</option>
                    <option value="POST">POST</option>
                    <option value="PUT">PUT</option>
                    <option value="DELETE">DELETE</option>
                    <option value="PATCH">PATCH</option>
                    <option value="OPTIONS">OPTIONS</option>
                    <option value="HEAD">HEAD</option>
                  </select>
                  <input type="url" id="requestUrl" placeholder="https://api.example.com/endpoint">
                  <button id="sendRequest" class="btn-primary">Send</button>
                </div>
                
                <div class="request-sections">
                  <div class="section">
                    <h4>Headers</h4>
                    <div class="headers-container">
                      <div class="header-row">
                        <input type="text" placeholder="Content-Type" class="header-key">
                        <input type="text" placeholder="application/json" class="header-value">
                        <button class="remove-header" style="display: none;">×</button>
                      </div>
                    </div>
                    <button id="addHeader" class="btn-outline btn-small">+ Add Header</button>
                  </div>
                  
                  <div class="section" id="bodySection" style="display: none;">
                    <h4>Request Body</h4>
                    <div class="body-type-selector">
                      <label><input type="radio" name="bodyType" value="json" checked> JSON</label>
                      <label><input type="radio" name="bodyType" value="text"> Text</label>
                      <label><input type="radio" name="bodyType" value="form"> Form Data</label>
                    </div>
                    <textarea id="requestBody" placeholder='{"key": "value"}'></textarea>
                  </div>
                </div>
              </div>
              
              <div class="quick-tests">
                <h4>🚀 Quick Tests</h4>
                <button class="quick-test-btn" data-url="https://httpbin.org/get">GET Test</button>
                <button class="quick-test-btn" data-url="https://httpbin.org/post" data-method="POST">POST Test</button>
                <button class="quick-test-btn" data-url="https://httpbin.org/status/404" data-status="404">404 Test</button>
                <button class="quick-test-btn" data-url="https://httpbin.org/delay/2">Slow Response</button>
              </div>
            </div>
            
            <div class="response-section">
              <h4>Response</h4>
              <div class="response-tabs">
                <button class="response-tab active" data-tab="body">Body</button>
                <button class="response-tab" data-tab="headers">Headers</button>
                <button class="response-tab" data-tab="timing">Timing</button>
              </div>
              
              <div class="response-info">
                <span id="responseStatus">Status: -</span>
                <span id="responseTime">Time: -</span>
                <span id="responseSize">Size: -</span>
              </div>
              
              <div class="response-content">
                <div class="response-body-content active" data-tab="body">
                  <pre id="responseBody">Make a request to see the response</pre>
                </div>
                <div class="response-body-content" data-tab="headers">
                  <pre id="responseHeaders">Response headers will appear here</pre>
                </div>
                <div class="response-body-content" data-tab="timing">
                  <pre id="responseTiming">Timing information will appear here</pre>
                </div>
              </div>
            </div>
          </div>
          
          <!-- Analysis Tab -->
          <div class="network-tab-content" data-tab="analysis">
            <div class="analysis-overview">
              <h4>📊 Request Analysis</h4>
              <div class="analysis-grid">
                <div class="analysis-card">
                  <h5>By Method</h5>
                  <div id="methodChart"></div>
                </div>
                <div class="analysis-card">
                  <h5>By Status Code</h5>
                  <div id="statusChart"></div>
                </div>
                <div class="analysis-card">
                  <h5>By Domain</h5>
                  <div id="domainChart"></div>
                </div>
                <div class="analysis-card">
                  <h5>Response Times</h5>
                  <div id="timingChart"></div>
                </div>
              </div>
            </div>
            
            <div class="analysis-insights">
              <h4>🔍 Insights</h4>
              <div id="insightsList">
                <div class="insight">Start monitoring to generate insights</div>
              </div>
            </div>
          </div>
          
          <!-- Tools Tab -->
          <div class="network-tab-content" data-tab="tools">
            <div class="network-tools-grid">
              <div class="tool-card">
                <h4>🌍 DNS Lookup</h4>
                <input type="text" id="dnsInput" placeholder="example.com">
                <button onclick="window.NetworkTools.performDNSLookup()" class="btn-primary">Lookup</button>
                <div id="dnsResult"></div>
              </div>
              
              <div class="tool-card">
                <h4>🔍 Port Scanner</h4>
                <input type="text" id="portHost" placeholder="example.com">
                <input type="text" id="portRange" placeholder="80,443,8080">
                <button onclick="window.NetworkTools.scanPorts()" class="btn-primary">Scan</button>
                <div id="portResult"></div>
              </div>
              
              <div class="tool-card">
                <h4>📡 Ping Test</h4>
                <input type="text" id="pingHost" placeholder="example.com">
                <button onclick="window.NetworkTools.pingHost()" class="btn-primary">Ping</button>
                <div id="pingResult"></div>
              </div>
              
              <div class="tool-card">
                <h4>🔗 URL Analyzer</h4>
                <input type="url" id="urlAnalyze" placeholder="https://example.com">
                <button onclick="window.NetworkTools.analyzeUrl()" class="btn-primary">Analyze</button>
                <div id="urlResult"></div>
              </div>
              
              <div class="tool-card">
                <h4>📄 HTTP Headers</h4>
                <input type="url" id="headersUrl" placeholder="https://example.com">
                <button onclick="window.NetworkTools.checkHeaders()" class="btn-primary">Check Headers</button>
                <div id="headersResult"></div>
              </div>
              
              <div class="tool-card">
                <h4>🚀 Performance Test</h4>
                <input type="url" id="perfUrl" placeholder="https://example.com">
                <input type="number" id="perfRequests" placeholder="10" min="1" max="50">
                <button onclick="window.NetworkTools.performanceTest()" class="btn-primary">Test</button>
                <div id="perfResult"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(container);
    attachEventListeners();
    updateStats();
  }

  function attachEventListeners() {
    // Close button
    container.querySelector('.network-tools-close').addEventListener('click', hide);
    
    // Tab switching
    container.querySelectorAll('.network-tab-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const tabName = e.target.dataset.tab;
        switchTab(tabName);
      });
    });
    
    // Monitor controls
    container.querySelector('#startMonitoring').addEventListener('click', startMonitoring);
    container.querySelector('#stopMonitoring').addEventListener('click', stopMonitoring);
    container.querySelector('#clearHistory').addEventListener('click', clearHistory);
    container.querySelector('#exportRequests').addEventListener('click', exportRequests);
    
    // API Test controls
    container.querySelector('#sendRequest').addEventListener('click', sendAPIRequest);
    container.querySelector('#addHeader').addEventListener('click', addHeaderRow);
    container.querySelector('#requestMethod').addEventListener('change', updateBodySection);
    
    // Response tabs
    container.querySelectorAll('.response-tab').forEach(tab => {
      tab.addEventListener('click', (e) => {
        switchResponseTab(e.target.dataset.tab);
      });
    });
    
    // Quick tests
    container.querySelectorAll('.quick-test-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const url = e.target.dataset.url;
        const method = e.target.dataset.method || 'GET';
        container.querySelector('#requestUrl').value = url;
        container.querySelector('#requestMethod').value = method;
        updateBodySection();
      });
    });
    
    // Filters
    container.querySelector('#filterUrl').addEventListener('input', updateRequestList);
    container.querySelector('#filterMethod').addEventListener('change', updateRequestList);
    container.querySelector('#filterStatus').addEventListener('change', updateRequestList);
  }

  function switchTab(tabName) {
    // Update tab buttons
    container.querySelectorAll('.network-tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tabName);
    });
    
    // Update tab content
    container.querySelectorAll('.network-tab-content').forEach(content => {
      content.classList.toggle('active', content.dataset.tab === tabName);
    });
    
    // Update analysis when switching to analysis tab
    if (tabName === 'analysis') {
      updateAnalysis();
    }
  }

  function switchResponseTab(tabName) {
    container.querySelectorAll('.response-tab').forEach(tab => {
      tab.classList.toggle('active', tab.dataset.tab === tabName);
    });
    
    container.querySelectorAll('.response-body-content').forEach(content => {
      content.classList.toggle('active', content.dataset.tab === tabName);
    });
  }

  function startMonitoring() {
    isMonitoring = true;
    monitoringStart = Date.now();
    
    container.querySelector('#startMonitoring').disabled = true;
    container.querySelector('#stopMonitoring').disabled = false;
    
    // Intercept fetch requests
    interceptFetchRequests();
    
    updateStats();
    showSuccess('Network monitoring started');
  }

  function stopMonitoring() {
    isMonitoring = false;
    
    container.querySelector('#startMonitoring').disabled = false;
    container.querySelector('#stopMonitoring').disabled = true;
    
    updateStats();
    showSuccess('Network monitoring stopped');
  }

  function interceptFetchRequests() {
    if (window.originalFetch) return; // Already intercepted
    
    window.originalFetch = window.fetch;
    window.fetch = async function(...args) {
      const [url, options = {}] = args;
      const startTime = Date.now();
      
      try {
        const response = await window.originalFetch(...args);
        const endTime = Date.now();
        
        if (isMonitoring) {
          recordRequest({
            url: url.toString(),
            method: options.method || 'GET',
            status: response.status,
            responseTime: endTime - startTime,
            timestamp: new Date().toISOString(),
            headers: Object.fromEntries(response.headers.entries()),
            type: 'fetch'
          });
        }
        
        return response;
      } catch (error) {
        const endTime = Date.now();
        
        if (isMonitoring) {
          recordRequest({
            url: url.toString(),
            method: options.method || 'GET',
            status: 0,
            responseTime: endTime - startTime,
            timestamp: new Date().toISOString(),
            error: error.message,
            type: 'fetch'
          });
        }
        
        throw error;
      }
    };
  }

  function recordRequest(request) {
    requestHistory.push(request);
    saveRequestHistory();
    updateRequestList();
    updateStats();
  }

  function updateBodySection() {
    const method = container.querySelector('#requestMethod').value;
    const bodySection = container.querySelector('#bodySection');
    
    if (['POST', 'PUT', 'PATCH'].includes(method)) {
      bodySection.style.display = 'block';
    } else {
      bodySection.style.display = 'none';
    }
  }

  function addHeaderRow() {
    const headersContainer = container.querySelector('.headers-container');
    const headerRow = document.createElement('div');
    headerRow.className = 'header-row';
    headerRow.innerHTML = `
      <input type="text" placeholder="Header name" class="header-key">
      <input type="text" placeholder="Header value" class="header-value">
      <button class="remove-header">×</button>
    `;
    
    headerRow.querySelector('.remove-header').addEventListener('click', () => {
      headerRow.remove();
    });
    
    headersContainer.appendChild(headerRow);
  }

  async function sendAPIRequest() {
    const method = container.querySelector('#requestMethod').value;
    const url = container.querySelector('#requestUrl').value.trim();
    
    if (!url) {
      showError('Please enter a URL');
      return;
    }
    
    try {
      // Collect headers
      const headers = {};
      container.querySelectorAll('.header-row').forEach(row => {
        const key = row.querySelector('.header-key').value.trim();
        const value = row.querySelector('.header-value').value.trim();
        if (key && value) {
          headers[key] = value;
        }
      });
      
      // Prepare request options
      const options = {
        method: method,
        headers: headers
      };
      
      // Add body for POST/PUT/PATCH
      if (['POST', 'PUT', 'PATCH'].includes(method)) {
        const bodyType = container.querySelector('input[name="bodyType"]:checked').value;
        const bodyContent = container.querySelector('#requestBody').value.trim();
        
        if (bodyContent) {
          if (bodyType === 'json') {
            options.headers['Content-Type'] = 'application/json';
            options.body = bodyContent;
          } else {
            options.body = bodyContent;
          }
        }
      }
      
      const startTime = Date.now();
      const response = await fetch(url, options);
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      
      const responseText = await response.text();
      const responseHeaders = Object.fromEntries(response.headers.entries());
      
      // Update response display
      container.querySelector('#responseStatus').textContent = `Status: ${response.status} ${response.statusText}`;
      container.querySelector('#responseTime').textContent = `Time: ${responseTime}ms`;
      container.querySelector('#responseSize').textContent = `Size: ${responseText.length} bytes`;
      
      container.querySelector('#responseBody').textContent = responseText;
      container.querySelector('#responseHeaders').textContent = JSON.stringify(responseHeaders, null, 2);
      container.querySelector('#responseTiming').textContent = JSON.stringify({
        responseTime: responseTime + 'ms',
        timestamp: new Date(startTime).toISOString(),
        url: url,
        method: method
      }, null, 2);
      
      showSuccess(`Request completed: ${response.status}`);
      
    } catch (error) {
      showError('Request failed: ' + error.message);
      container.querySelector('#responseBody').textContent = 'Error: ' + error.message;
    }
  }

  function updateRequestList() {
    const urlFilter = container.querySelector('#filterUrl').value.toLowerCase();
    const methodFilter = container.querySelector('#filterMethod').value;
    const statusFilter = container.querySelector('#filterStatus').value;
    
    let filtered = requestHistory.filter(req => {
      if (urlFilter && !req.url.toLowerCase().includes(urlFilter)) return false;
      if (methodFilter && req.method !== methodFilter) return false;
      if (statusFilter) {
        const status = req.status;
        if (statusFilter === '2xx' && (status < 200 || status >= 300)) return false;
        if (statusFilter === '3xx' && (status < 300 || status >= 400)) return false;
        if (statusFilter === '4xx' && (status < 400 || status >= 500)) return false;
        if (statusFilter === '5xx' && status < 500) return false;
      }
      return true;
    });
    
    const requestList = container.querySelector('#requestList');
    
    if (filtered.length === 0) {
      requestList.innerHTML = '<div class="no-requests">No requests match your filters</div>';
      return;
    }
    
    requestList.innerHTML = filtered.slice(-50).reverse().map(req => `
      <div class="request-item">
        <div class="request-header">
          <span class="request-method ${req.method.toLowerCase()}">${req.method}</span>
          <span class="request-status status-${Math.floor(req.status / 100)}xx">${req.status || 'ERR'}</span>
          <span class="request-time">${req.responseTime}ms</span>
          <span class="request-timestamp">${new Date(req.timestamp).toLocaleTimeString()}</span>
        </div>
        <div class="request-url">${escapeHtml(req.url)}</div>
        ${req.error ? `<div class="request-error">Error: ${escapeHtml(req.error)}</div>` : ''}
      </div>
    `).join('');
  }

  function updateStats() {
    const totalRequests = requestHistory.length;
    const monitoringStatus = isMonitoring ? 'Active' : 'Stopped';
    
    let duration = '0s';
    if (monitoringStart) {
      const elapsed = Math.floor((Date.now() - monitoringStart) / 1000);
      duration = elapsed < 60 ? `${elapsed}s` : `${Math.floor(elapsed / 60)}m ${elapsed % 60}s`;
    }
    
    container.querySelector('#totalRequests').textContent = totalRequests;
    container.querySelector('#monitoringStatus').textContent = monitoringStatus;
    container.querySelector('#monitoringDuration').textContent = duration;
  }

  function updateAnalysis() {
    if (requestHistory.length === 0) {
      container.querySelector('#methodChart').innerHTML = '<div class="no-data">No data</div>';
      container.querySelector('#statusChart').innerHTML = '<div class="no-data">No data</div>';
      container.querySelector('#domainChart').innerHTML = '<div class="no-data">No data</div>';
      container.querySelector('#timingChart').innerHTML = '<div class="no-data">No data</div>';
      return;
    }
    
    // Method distribution
    const methodCounts = {};
    requestHistory.forEach(req => {
      methodCounts[req.method] = (methodCounts[req.method] || 0) + 1;
    });
    
    container.querySelector('#methodChart').innerHTML = Object.entries(methodCounts)
      .map(([method, count]) => `<div class="chart-bar"><span>${method}</span><span>${count}</span></div>`)
      .join('');
    
    // Status distribution
    const statusCounts = {};
    requestHistory.forEach(req => {
      const statusGroup = Math.floor(req.status / 100) + 'xx';
      statusCounts[statusGroup] = (statusCounts[statusGroup] || 0) + 1;
    });
    
    container.querySelector('#statusChart').innerHTML = Object.entries(statusCounts)
      .map(([status, count]) => `<div class="chart-bar"><span>${status}</span><span>${count}</span></div>`)
      .join('');
    
    // Domain distribution
    const domainCounts = {};
    requestHistory.forEach(req => {
      try {
        const domain = new URL(req.url).hostname;
        domainCounts[domain] = (domainCounts[domain] || 0) + 1;
      } catch (e) {
        domainCounts['Unknown'] = (domainCounts['Unknown'] || 0) + 1;
      }
    });
    
    container.querySelector('#domainChart').innerHTML = Object.entries(domainCounts)
      .slice(0, 5)
      .map(([domain, count]) => `<div class="chart-bar"><span>${domain}</span><span>${count}</span></div>`)
      .join('');
    
    // Timing analysis
    const avgTime = requestHistory.reduce((sum, req) => sum + req.responseTime, 0) / requestHistory.length;
    const maxTime = Math.max(...requestHistory.map(req => req.responseTime));
    const minTime = Math.min(...requestHistory.map(req => req.responseTime));
    
    container.querySelector('#timingChart').innerHTML = `
      <div class="chart-bar"><span>Average</span><span>${Math.round(avgTime)}ms</span></div>
      <div class="chart-bar"><span>Max</span><span>${maxTime}ms</span></div>
      <div class="chart-bar"><span>Min</span><span>${minTime}ms</span></div>
    `;
    
    generateInsights();
  }

  function generateInsights() {
    const insights = [];
    
    if (requestHistory.length === 0) {
      insights.push('Start monitoring to generate insights');
    } else {
      const avgResponseTime = requestHistory.reduce((sum, req) => sum + req.responseTime, 0) / requestHistory.length;
      const slowRequests = requestHistory.filter(req => req.responseTime > 1000).length;
      const errorRequests = requestHistory.filter(req => req.status >= 400).length;
      
      if (avgResponseTime > 500) {
        insights.push(`⚠️ High average response time: ${Math.round(avgResponseTime)}ms`);
      }
      
      if (slowRequests > 0) {
        insights.push(`🐌 ${slowRequests} requests took over 1 second`);
      }
      
      if (errorRequests > 0) {
        insights.push(`❌ ${errorRequests} requests returned errors`);
      }
      
      if (insights.length === 0) {
        insights.push('✅ Network performance looks good!');
      }
    }
    
    container.querySelector('#insightsList').innerHTML = insights
      .map(insight => `<div class="insight">${insight}</div>`)
      .join('');
  }

  // Tool functions
  function performDNSLookup() {
    const domain = container.querySelector('#dnsInput').value.trim();
    if (!domain) return;
    
    // Simulate DNS lookup (actual DNS lookup requires different APIs)
    container.querySelector('#dnsResult').innerHTML = `
      <div class="tool-result">
        <strong>DNS Lookup for ${escapeHtml(domain)}:</strong><br>
        Note: Browser security limits prevent real DNS lookups.<br>
        Try using network debugging tools or server-side utilities.
      </div>
    `;
  }

  function scanPorts() {
    const host = container.querySelector('#portHost').value.trim();
    const ports = container.querySelector('#portRange').value.trim();
    
    if (!host || !ports) return;
    
    container.querySelector('#portResult').innerHTML = `
      <div class="tool-result">
        <strong>Port Scan for ${escapeHtml(host)}:</strong><br>
        Note: Browser security prevents direct port scanning.<br>
        Ports: ${escapeHtml(ports)}<br>
        Use specialized tools like nmap for actual port scanning.
      </div>
    `;
  }

  function pingHost() {
    const host = container.querySelector('#pingHost').value.trim();
    if (!host) return;
    
    // Simulate ping using a simple HTTP request
    fetch(`https://${host}`, { method: 'HEAD', mode: 'no-cors' })
      .then(() => {
        container.querySelector('#pingResult').innerHTML = `
          <div class="tool-result">
            ✅ ${escapeHtml(host)} appears to be reachable
          </div>
        `;
      })
      .catch(() => {
        container.querySelector('#pingResult').innerHTML = `
          <div class="tool-result">
            ❌ ${escapeHtml(host)} may not be reachable or blocks requests
          </div>
        `;
      });
  }

  function analyzeUrl() {
    const url = container.querySelector('#urlAnalyze').value.trim();
    if (!url) return;
    
    try {
      const urlObj = new URL(url);
      const analysis = {
        protocol: urlObj.protocol,
        hostname: urlObj.hostname,
        port: urlObj.port || (urlObj.protocol === 'https:' ? '443' : '80'),
        pathname: urlObj.pathname,
        search: urlObj.search,
        hash: urlObj.hash
      };
      
      container.querySelector('#urlResult').innerHTML = `
        <div class="tool-result">
          <strong>URL Analysis:</strong><br>
          ${Object.entries(analysis).map(([key, value]) => 
            `${key}: ${escapeHtml(value) || 'N/A'}`
          ).join('<br>')}
        </div>
      `;
    } catch (error) {
      container.querySelector('#urlResult').innerHTML = `
        <div class="tool-result error">Invalid URL: ${error.message}</div>
      `;
    }
  }

  async function checkHeaders() {
    const url = container.querySelector('#headersUrl').value.trim();
    if (!url) return;
    
    try {
      const response = await fetch(url, { method: 'HEAD' });
      const headers = Object.fromEntries(response.headers.entries());
      
      container.querySelector('#headersResult').innerHTML = `
        <div class="tool-result">
          <strong>HTTP Headers for ${escapeHtml(url)}:</strong><br>
          <pre>${JSON.stringify(headers, null, 2)}</pre>
        </div>
      `;
    } catch (error) {
      container.querySelector('#headersResult').innerHTML = `
        <div class="tool-result error">Error: ${error.message}</div>
      `;
    }
  }

  async function performanceTest() {
    const url = container.querySelector('#perfUrl').value.trim();
    const requests = parseInt(container.querySelector('#perfRequests').value) || 5;
    
    if (!url) return;
    
    container.querySelector('#perfResult').innerHTML = '<div class="tool-result">Running performance test...</div>';
    
    const results = [];
    
    for (let i = 0; i < Math.min(requests, 10); i++) {
      const start = Date.now();
      try {
        await fetch(url, { cache: 'no-cache' });
        results.push(Date.now() - start);
      } catch (error) {
        results.push(null);
      }
    }
    
    const validResults = results.filter(r => r !== null);
    if (validResults.length === 0) {
      container.querySelector('#perfResult').innerHTML = '<div class="tool-result error">All requests failed</div>';
      return;
    }
    
    const avg = validResults.reduce((a, b) => a + b, 0) / validResults.length;
    const min = Math.min(...validResults);
    const max = Math.max(...validResults);
    
    container.querySelector('#perfResult').innerHTML = `
      <div class="tool-result">
        <strong>Performance Test Results:</strong><br>
        Requests: ${validResults.length}/${requests}<br>
        Average: ${Math.round(avg)}ms<br>
        Min: ${min}ms<br>
        Max: ${max}ms
      </div>
    `;
  }

  function clearHistory() {
    if (!confirm('Clear all request history?')) return;
    
    requestHistory = [];
    saveRequestHistory();
    updateRequestList();
    updateStats();
    updateAnalysis();
    showSuccess('Request history cleared');
  }

  function exportRequests() {
    if (requestHistory.length === 0) {
      showError('No requests to export');
      return;
    }
    
    const data = JSON.stringify(requestHistory, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `network-requests-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    showSuccess('Request history exported');
  }

  function loadRequestHistory() {
    const stored = localStorage.getItem('ganj-network-tools-history');
    if (stored) {
      try {
        requestHistory = JSON.parse(stored);
      } catch (e) {
        requestHistory = [];
      }
    }
  }

  function saveRequestHistory() {
    // Keep only last 1000 requests
    if (requestHistory.length > 1000) {
      requestHistory = requestHistory.slice(-1000);
    }
    localStorage.setItem('ganj-network-tools-history', JSON.stringify(requestHistory));
  }

  function showSuccess(message) {
    const notification = document.createElement('div');
    notification.textContent = '✅ ' + message;
    notification.style.cssText = `
      position: fixed !important;
      top: 20px !important;
      right: 20px !important;
      background: #10b981 !important;
      color: white !important;
      padding: 12px 20px !important;
      border-radius: 6px !important;
      z-index: 1000000 !important;
      font-size: 14px !important;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
    `;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 3000);
  }

  function showError(message) {
    const notification = document.createElement('div');
    notification.textContent = '❌ ' + message;
    notification.style.cssText = `
      position: fixed !important;
      top: 20px !important;
      right: 20px !important;
      background: #ef4444 !important;
      color: white !important;
      padding: 12px 20px !important;
      border-radius: 6px !important;
      z-index: 1000000 !important;
      font-size: 14px !important;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
    `;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 4000);
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  function show() {
    if (!container) createInterface();
    container.classList.remove('hidden');
    isVisible = true;
  }

  function hide() {
    if (container) container.classList.add('hidden');
    isVisible = false;
  }

  function toggle() {
    isVisible ? hide() : show();
  }

  return { 
    init, show, hide, toggle,
    performDNSLookup, scanPorts, pingHost, analyzeUrl, checkHeaders, performanceTest
  };
})();

window.NetworkTools = NetworkTools;

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', NetworkTools.init);
} else {
  NetworkTools.init();
}
