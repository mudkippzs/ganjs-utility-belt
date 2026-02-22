// Smart Auto-Refresh - Intelligent page refresh with conditions
const AutoRefresh = (() => {
  let isActive = false;
  let interval = null;
  let settings = {
    delay: 30000,
    condition: 'always',
    selector: '',
    expectedValue: '',
    stopOnChange: false,
    onlyWhenVisible: true
  };
  let container = null;
  let changeCount = 0;
  let lastContent = '';

  function init() {
    createInterface();
    loadSettings();
  }

  function createInterface() {
    if (container) return;

    container = document.createElement('div');
    container.className = 'auto-refresh-panel hidden';
    container.innerHTML = `
      <div class="auto-refresh-modal">
        <div class="refresh-header">
          <h3>⏱️ Smart Auto-Refresh</h3>
          <button class="refresh-close">✕</button>
        </div>
        <div class="refresh-settings">
          <div class="setting-group">
            <label>Refresh Interval:</label>
            <select id="refreshInterval">
              <option value="5000">5 seconds</option>
              <option value="10000">10 seconds</option>
              <option value="30000" selected>30 seconds</option>
              <option value="60000">1 minute</option>
              <option value="300000">5 minutes</option>
              <option value="600000">10 minutes</option>
            </select>
          </div>
          
          <div class="setting-group">
            <label>Refresh Condition:</label>
            <select id="refreshCondition">
              <option value="always">Always refresh</option>
              <option value="element-change">When element changes</option>
              <option value="element-appears">When element appears</option>
              <option value="element-disappears">When element disappears</option>
              <option value="content-change">When page content changes</option>
            </select>
          </div>
          
          <div class="setting-group" id="selectorGroup" style="display: none;">
            <label>CSS Selector:</label>
            <input type="text" id="elementSelector" placeholder="e.g., .price, #status">
          </div>
          
          <div class="setting-group" id="valueGroup" style="display: none;">
            <label>Expected Value:</label>
            <input type="text" id="expectedValue" placeholder="Value to watch for">
          </div>
          
          <div class="setting-group">
            <label>
              <input type="checkbox" id="onlyWhenVisible" checked>
              Only refresh when tab is visible
            </label>
          </div>
          
          <div class="setting-group">
            <label>
              <input type="checkbox" id="stopOnChange">
              Stop refreshing when condition is met
            </label>
          </div>
        </div>
        
        <div class="refresh-status">
          <div id="refreshStatus">Inactive</div>
          <div id="refreshStats">Changes detected: 0</div>
        </div>
        
        <div class="refresh-controls">
          <button id="startRefresh" class="btn-primary">Start Auto-Refresh</button>
          <button id="stopRefresh" class="btn-secondary" style="display: none;">Stop Refresh</button>
          <button id="refreshNow" class="btn-outline">Refresh Now</button>
        </div>
      </div>
    `;

    document.body.appendChild(container);
    attachEventListeners();
  }

  function attachEventListeners() {
    const refreshCondition = container.querySelector('#refreshCondition');
    const selectorGroup = container.querySelector('#selectorGroup');
    const valueGroup = container.querySelector('#valueGroup');

    refreshCondition.addEventListener('change', (e) => {
      const condition = e.target.value;
      const needsSelector = ['element-change', 'element-appears', 'element-disappears'].includes(condition);
      const needsValue = condition === 'element-change';
      
      selectorGroup.style.display = needsSelector ? 'block' : 'none';
      valueGroup.style.display = needsValue ? 'block' : 'none';
    });

    container.querySelector('.refresh-close').addEventListener('click', hide);
    container.querySelector('#startRefresh').addEventListener('click', startRefresh);
    container.querySelector('#stopRefresh').addEventListener('click', stopRefresh);
    container.querySelector('#refreshNow').addEventListener('click', refreshNow);

    ['refreshInterval', 'refreshCondition', 'elementSelector', 'expectedValue', 'onlyWhenVisible', 'stopOnChange'].forEach(id => {
      const element = container.querySelector('#' + id);
      if (element) {
        element.addEventListener('change', saveSettings);
      }
    });
  }

  function startRefresh() {
    if (isActive) return;

    updateSettings();
    isActive = true;
    changeCount = 0;
    lastContent = getCurrentContent();

    interval = setInterval(() => {
      if (settings.onlyWhenVisible && document.hidden) return;

      if (shouldRefresh()) {
        refreshNow();
        changeCount++;
        updateStatus();

        if (settings.stopOnChange) {
          stopRefresh();
        }
      }
    }, settings.delay);

    updateUI();
    updateStatus();
  }

  function stopRefresh() {
    if (!isActive) return;

    isActive = false;
    if (interval) {
      clearInterval(interval);
      interval = null;
    }

    updateUI();
    updateStatus();
  }

  function shouldRefresh() {
    switch (settings.condition) {
      case 'always':
        return true;
      
      case 'element-change':
        if (!settings.selector) return false;
        const element = document.querySelector(settings.selector);
        if (!element) return false;
        
        const currentValue = element.textContent.trim();
        if (settings.expectedValue) {
          return currentValue === settings.expectedValue;
        } else {
          const changed = currentValue !== lastContent;
          lastContent = currentValue;
          return changed;
        }
      
      case 'element-appears':
        return settings.selector && document.querySelector(settings.selector) !== null;
      
      case 'element-disappears':
        return settings.selector && document.querySelector(settings.selector) === null;
      
      case 'content-change':
        const currentContent = getCurrentContent();
        const changed = currentContent !== lastContent;
        lastContent = currentContent;
        return changed;
      
      default:
        return false;
    }
  }

  function getCurrentContent() {
    return document.body.textContent.slice(0, 1000);
  }

  function refreshNow() {
    location.reload();
  }

  function updateSettings() {
    settings.delay = parseInt(container.querySelector('#refreshInterval').value);
    settings.condition = container.querySelector('#refreshCondition').value;
    settings.selector = container.querySelector('#elementSelector').value;
    settings.expectedValue = container.querySelector('#expectedValue').value;
    settings.onlyWhenVisible = container.querySelector('#onlyWhenVisible').checked;
    settings.stopOnChange = container.querySelector('#stopOnChange').checked;
  }

  function updateUI() {
    const startBtn = container.querySelector('#startRefresh');
    const stopBtn = container.querySelector('#stopRefresh');

    if (isActive) {
      startBtn.style.display = 'none';
      stopBtn.style.display = 'block';
    } else {
      startBtn.style.display = 'block';
      stopBtn.style.display = 'none';
    }
  }

  function updateStatus() {
    const statusEl = container.querySelector('#refreshStatus');
    const statsEl = container.querySelector('#refreshStats');

    if (isActive) {
      statusEl.textContent = `Active - Next refresh in ${settings.delay / 1000}s`;
      statusEl.className = 'status-active';
    } else {
      statusEl.textContent = 'Inactive';
      statusEl.className = 'status-inactive';
    }

    statsEl.textContent = `Changes detected: ${changeCount}`;
  }

  function saveSettings() {
    updateSettings();
    chrome.storage.local.set({ autoRefreshSettings: settings });
  }

  function loadSettings() {
    chrome.storage.local.get(['autoRefreshSettings'], (result) => {
      if (result.autoRefreshSettings) {
        settings = { ...settings, ...result.autoRefreshSettings };
        applySettings();
      }
    });
  }

  function applySettings() {
    if (!container) return;

    container.querySelector('#refreshInterval').value = settings.delay;
    container.querySelector('#refreshCondition').value = settings.condition;
    container.querySelector('#elementSelector').value = settings.selector;
    container.querySelector('#expectedValue').value = settings.expectedValue;
    container.querySelector('#onlyWhenVisible').checked = settings.onlyWhenVisible;
    container.querySelector('#stopOnChange').checked = settings.stopOnChange;

    container.querySelector('#refreshCondition').dispatchEvent(new Event('change'));
  }

  function show() {
    if (!container) createInterface();
    container.classList.remove('hidden');
  }

  function hide() {
    if (container) {
      container.classList.add('hidden');
    }
  }

  function toggle() {
    container && container.classList.contains('hidden') ? show() : hide();
  }

  window.addEventListener('beforeunload', () => {
    if (isActive) stopRefresh();
  });

  return { init, show, hide, toggle, startRefresh, stopRefresh };
})();

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', AutoRefresh.init);
} else {
  AutoRefresh.init();
}

// Make it globally accessible
window.AutoRefresh = AutoRefresh;
