// URL Redirector - Pattern-based URL redirection tool
const URLRedirector = (() => {
  let redirectRules = [];
  let container = null;
  let isVisible = false;
  let hasCheckedThisPage = false;

  function init() {
    loadRedirectRules(() => {
      setTimeout(() => {
        checkCurrentUrl();
      }, 100);
    });
    createInterface();
  }

  function createInterface() {
    if (container) return;

    container = document.createElement('div');
    container.className = 'url-redirector hidden';
    container.innerHTML = `
      <div class="redirector-panel">
        <div class="redirector-header">
          <h3>🔄 URL Redirector</h3>
          <button class="redirector-close">✕</button>
        </div>
        
        <div class="rule-creator">
          <h4>➕ Add New Rule</h4>
          <div class="rule-form">
            <div class="input-group">
              <label>From Pattern (be specific to avoid loops):</label>
              <input type="text" id="fromPattern" placeholder="e.g., *www.reddit.com*">
              <div class="pattern-help">
                ⚠️ Be specific! Use *www.reddit.com* not *reddit.com* to avoid redirect loops
              </div>
            </div>
            
            <div class="input-group">
              <label>To URL:</label>
              <input type="text" id="toUrl" placeholder="e.g., https://old.reddit.com$2">
              <div class="pattern-help">
                Use $1, $2 for wildcards. Include https:// for absolute URLs.
              </div>
            </div>
            
            <div class="input-group">
              <label>Test Current URL:</label>
              <div class="current-url-display">${window.location.href}</div>
              <button id="testRule" class="btn-outline">Test This Rule</button>
            </div>
            
            <div class="test-result" id="testResult"></div>
            
            <div class="rule-options">
              <label>
                <input type="checkbox" id="enableRule" checked>
                Enable this rule
              </label>
              <label>
                <input type="checkbox" id="autoRedirect" checked>
                Auto-redirect (1 second delay)
              </label>
            </div>
            
            <button id="addRule" class="btn-primary">Add Rule</button>
          </div>
        </div>
        
        <div class="quick-patterns">
          <h4>📋 Safe Quick Patterns</h4>
          <button class="quick-pattern-btn" data-from="*www.reddit.com*" data-to="https://old.reddit.com$2">www.reddit.com → old.reddit.com</button>
          <button class="quick-pattern-btn" data-from="*reddit.com/r/*" data-to="https://old.reddit.com/r/$2">reddit.com/r/ → old.reddit.com/r/</button>
          <button class="quick-pattern-btn" data-from="*://www.youtube.com*" data-to="https://invidio.us$2">YouTube → Invidious</button>
          <button class="quick-pattern-btn" data-from="*://twitter.com*" data-to="https://nitter.net$2">Twitter → Nitter</button>
          <button class="quick-pattern-btn" data-from="*://www.twitter.com*" data-to="https://nitter.net$2">www.Twitter → Nitter</button>
        </div>
        
        <div class="rules-list">
          <h4>📋 Active Rules (${redirectRules.length})</h4>
          <div id="rulesList"></div>
        </div>
        
        <div class="loop-protection">
          <h4>🛡️ Loop Protection</h4>
          <p>Rules are automatically disabled if they create redirect loops. Always test your patterns first!</p>
        </div>
      </div>
    `;

    document.body.appendChild(container);
    attachEventListeners();
    updateRulesList();
  }

  function attachEventListeners() {
    container.querySelector('.redirector-close').addEventListener('click', hide);
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && isVisible) hide();
    });
    container.querySelector('#addRule').addEventListener('click', addRule);
    container.querySelector('#testRule').addEventListener('click', testCurrentRule);
    
    // Quick pattern buttons
    container.querySelectorAll('.quick-pattern-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        container.querySelector('#fromPattern').value = e.target.dataset.from;
        container.querySelector('#toUrl').value = e.target.dataset.to;
        testCurrentRule();
      });
    });
  }

  function addRule() {
    const fromPattern = container.querySelector('#fromPattern').value.trim();
    const toUrl = container.querySelector('#toUrl').value.trim();
    const enabled = container.querySelector('#enableRule').checked;
    const autoRedirect = container.querySelector('#autoRedirect').checked;
    
    if (!fromPattern || !toUrl) {
      showError('Please fill in both pattern and URL fields');
      return;
    }
    
    // Test for potential loops
    const currentUrl = window.location.href;
    const testResult = matchPattern(fromPattern, currentUrl);
    if (testResult.matches) {
      const targetUrl = replacePlaceholders(toUrl, testResult.captures);
      const targetResult = matchPattern(fromPattern, targetUrl);
      
      if (targetResult.matches) {
        showError('⚠️ This rule would create a redirect loop! The target URL also matches the pattern.');
        return;
      }
    }
    
    const rule = {
      id: Date.now(),
      fromPattern: fromPattern,
      toUrl: toUrl,
      enabled: enabled,
      autoRedirect: autoRedirect,
      useCount: 0,
      created: new Date().toISOString(),
      lastUsed: null
    };
    
    redirectRules.push(rule);
    saveRedirectRules();
    updateRulesList();
    
    // Clear form
    container.querySelector('#fromPattern').value = '';
    container.querySelector('#toUrl').value = '';
    container.querySelector('#testResult').innerHTML = '';
    
    showSuccess('Rule added successfully!');
  }

  function testCurrentRule() {
    const fromPattern = container.querySelector('#fromPattern').value.trim();
    const toUrl = container.querySelector('#toUrl').value.trim();
    const currentUrl = window.location.href;
    
    if (!fromPattern || !toUrl) {
      showError('Please enter both pattern and target URL');
      return;
    }
    
    const result = matchPattern(fromPattern, currentUrl);
    const testResult = container.querySelector('#testResult');
    
    if (result.matches) {
      const targetUrl = replacePlaceholders(toUrl, result.captures);
      
      // Check for potential loop
      const loopCheck = matchPattern(fromPattern, targetUrl);
      const isLoop = loopCheck.matches;
      
      testResult.innerHTML = `
        <div class="${isLoop ? 'test-warning' : 'test-success'}">
          ${isLoop ? '⚠️' : '✅'} <strong>Pattern matches current URL</strong><br>
          <strong>Current:</strong> ${currentUrl}<br>
          <strong>Would redirect to:</strong> <a href="${targetUrl}" target="_blank">${targetUrl}</a><br>
          <strong>Captures:</strong> ${result.captures.map((c, i) => `$${i+1}="${c}"`).join(', ')}<br>
          ${isLoop ? '<strong style="color: red;">⚠️ WARNING: This would create a redirect loop!</strong>' : ''}
        </div>
      `;
    } else {
      testResult.innerHTML = `
        <div class="test-failure">
          ❌ <strong>Pattern does not match current URL</strong><br>
          Pattern: <code>${fromPattern}</code><br>
          Current URL: <code>${currentUrl}</code>
        </div>
      `;
    }
  }

  function matchPattern(pattern, url) {
    try {
      // Escape special regex characters except *
      const escaped = pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&');
      // Replace * with non-greedy capturing group
      const regexPattern = escaped.replace(/\*/g, '(.*?)');
      const regex = new RegExp('^' + regexPattern + '$', 'i');
      
      const match = url.match(regex);
      if (match) {
        return {
          matches: true,
          captures: match.slice(1) // Remove full match, keep captures
        };
      }
    } catch (error) {
      console.error('[Redirector] Pattern error:', error);
    }
    
    return { matches: false, captures: [] };
  }

  function replacePlaceholders(url, captures) {
    let result = url;
    
    // Replace $1, $2, etc. with captured values
    captures.forEach((capture, index) => {
      result = result.replace(new RegExp(`\\$${index + 1}`, 'g'), capture);
    });
    
    // If result doesn't start with http/https, try to make it absolute
    if (!result.match(/^https?:\/\//)) {
      // If it looks like a domain, add https://
      if (result.match(/^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/)) {
        result = 'https://' + result;
      }
    }
    
    return result;
  }

  function updateRulesList() {
    const rulesList = container.querySelector('#rulesList');
    
    if (redirectRules.length === 0) {
      rulesList.innerHTML = '<div class="no-rules">No redirect rules configured</div>';
      return;
    }
    
    rulesList.innerHTML = redirectRules.map(rule => `
      <div class="rule-item ${rule.enabled ? 'enabled' : 'disabled'}">
        <div class="rule-header">
          <span class="rule-pattern">${escapeHtml(rule.fromPattern)}</span>
          <span class="rule-arrow">→</span>
          <span class="rule-url">${escapeHtml(rule.toUrl)}</span>
        </div>
        <div class="rule-meta">
          <span class="rule-status ${rule.enabled ? 'enabled' : 'disabled'}">${rule.enabled ? '✅ Enabled' : '❌ Disabled'}</span>
          <span class="rule-type">${rule.autoRedirect ? 'Auto' : 'Manual'}</span>
          <span class="rule-usage">Used ${rule.useCount} times</span>
          ${rule.lastUsed ? `<span class="rule-last-used">Last: ${new Date(rule.lastUsed).toLocaleDateString()}</span>` : ''}
        </div>
        <div class="rule-actions">
          <button class="btn-small" onclick="window.URLRedirector.toggleRule(${rule.id})">
            ${rule.enabled ? 'Disable' : 'Enable'}
          </button>
          <button class="btn-small" onclick="window.URLRedirector.testRule(${rule.id})">Test</button>
          <button class="btn-small btn-danger" onclick="window.URLRedirector.deleteRule(${rule.id})">Delete</button>
        </div>
      </div>
    `).join('');
  }

  function toggleRule(ruleId) {
    const rule = redirectRules.find(r => r.id === ruleId);
    if (rule) {
      rule.enabled = !rule.enabled;
      saveRedirectRules();
      updateRulesList();
      showSuccess(`Rule ${rule.enabled ? 'enabled' : 'disabled'}`);
    }
  }

  function testRule(ruleId) {
    const rule = redirectRules.find(r => r.id === ruleId);
    if (!rule) return;
    
    const currentUrl = window.location.href;
    const result = matchPattern(rule.fromPattern, currentUrl);
    
    if (result.matches) {
      const targetUrl = replacePlaceholders(rule.toUrl, result.captures);
      showSuccess(`✅ Rule matches! Would redirect to: ${targetUrl}`);
    } else {
      showError(`❌ Rule does not match current URL`);
    }
  }

  function deleteRule(ruleId) {
    if (!confirm('Delete this redirect rule?')) return;
    
    redirectRules = redirectRules.filter(r => r.id !== ruleId);
    saveRedirectRules();
    updateRulesList();
    showSuccess('Rule deleted');
  }

  function checkCurrentUrl() {
    if (hasCheckedThisPage) return;
    
    const currentUrl = window.location.href;
    console.log('[Redirector] Checking URL:', currentUrl);
    
    for (const rule of redirectRules) {
      if (!rule.enabled) continue;
      
      const result = matchPattern(rule.fromPattern, currentUrl);
      
      if (result.matches) {
        const targetUrl = replacePlaceholders(rule.toUrl, result.captures);
        
        // Enhanced loop prevention
        if (targetUrl === currentUrl) {
          console.log('[Redirector] Skipping redirect to same URL');
          continue;
        }
        
        // Check if target would also match the pattern (loop detection)
        const loopCheck = matchPattern(rule.fromPattern, targetUrl);
        if (loopCheck.matches) {
          console.log('[Redirector] Loop detected, disabling rule:', rule.fromPattern);
          rule.enabled = false;
          saveRedirectRules();
          showError(`Rule "${rule.fromPattern}" disabled - it created a redirect loop!`);
          continue;
        }
        
        // Check if we've recently redirected (prevent rapid redirects)
        const now = Date.now();
        if (rule.lastUsed && (now - new Date(rule.lastUsed).getTime()) < 5000) {
          console.log('[Redirector] Recent redirect, skipping to prevent loops');
          continue;
        }
        
        rule.useCount++;
        rule.lastUsed = new Date().toISOString();
        saveRedirectRules();
        hasCheckedThisPage = true;
        
        console.log('[Redirector] Redirecting:', currentUrl, '→', targetUrl);
        
        if (rule.autoRedirect) {
          showNotification(`Redirecting to ${new URL(targetUrl).hostname}...`);
          setTimeout(() => {
            window.location.href = targetUrl;
          }, 1000);
        } else {
          if (confirm(`Redirect rule matched!\n\nFrom: ${currentUrl}\nTo: ${targetUrl}\n\nRedirect now?`)) {
            window.location.href = targetUrl;
          }
        }
        break;
      }
    }
    
    hasCheckedThisPage = true;
  }

  function loadRedirectRules(callback) {
    chrome.storage.local.get(['redirectRules'], (result) => {
      redirectRules = result.redirectRules || [];
      console.log('[Redirector] Loaded', redirectRules.length, 'rules');
      if (callback) callback();
    });
  }

  function saveRedirectRules() {
    chrome.storage.local.set({ redirectRules: redirectRules });
  }

  function showNotification(message) {
    const notification = document.createElement('div');
    notification.textContent = message;
    notification.style.cssText = `
      position: fixed !important;
      top: 20px !important;
      right: 20px !important;
      background: #3b82f6 !important;
      color: white !important;
      padding: 12px 20px !important;
      border-radius: 6px !important;
      z-index: 1000000 !important;
      font-size: 14px !important;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
      box-shadow: 0 4px 12px rgba(0,0,0,0.2) !important;
    `;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 3000);
  }

  function showSuccess(message) {
    showNotification('✅ ' + message);
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
    deleteRule, toggleRule, testRule 
  };
})();

window.URLRedirector = URLRedirector;

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', URLRedirector.init);
} else {
  URLRedirector.init();
}