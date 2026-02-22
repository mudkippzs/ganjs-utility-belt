// Quick Actions Hub - Instant access to common utilities
const QuickActions = (() => {
  let container = null;
  let isVisible = false;

  function init() {
    createContainer();
    attachKeyboardShortcuts();
  }

  function createContainer() {
    if (container) return;

    container = document.createElement('div');
    container.className = 'quick-actions-hub hidden';
    container.innerHTML = `
      <div class="quick-actions-overlay">
        <div class="quick-actions-modal">
          <div class="quick-actions-header">
            <h3>🚀 Quick Actions</h3>
            <button class="quick-actions-close">✕</button>
          </div>
          <div class="quick-actions-grid">
            <button class="action-btn" data-action="reload">🔄 Reload Page</button>
            <button class="action-btn" data-action="clear-cache">🗑️ Clear Cache</button>
            <button class="action-btn" data-action="toggle-js">⚡ Toggle JS</button>
            <button class="action-btn" data-action="take-screenshot">📸 Screenshot</button>
            <button class="action-btn" data-action="extract-links">🔗 Extract Links</button>
            <button class="action-btn" data-action="view-source">📄 View Source</button>
            <button class="action-btn" data-action="responsive">📱 Responsive View</button>
            <button class="action-btn" data-action="print">🖨️ Print Page</button>
            <button class="action-btn" data-action="share">📤 Share URL</button>
            <button class="action-btn" data-action="bookmark">⭐ Quick Bookmark</button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(container);
    attachEventListeners();
  }

  function attachEventListeners() {
    container.querySelector('.quick-actions-close').addEventListener('click', hide);
    container.querySelector('.quick-actions-overlay').addEventListener('click', (e) => {
      if (e.target === e.currentTarget) hide();
    });

    container.querySelectorAll('.action-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const action = e.target.dataset.action;
        executeAction(action);
      });
    });
  }

  function executeAction(action) {
    switch (action) {
      case 'reload':
        location.reload();
        break;
      case 'clear-cache':
        if ('caches' in window) {
          caches.keys().then(names => {
            names.forEach(name => caches.delete(name));
          });
        }
        location.reload();
        break;
      case 'toggle-js':
        chrome.runtime.sendMessage({ action: 'toggleJS' });
        break;
      case 'take-screenshot':
        chrome.runtime.sendMessage({ action: 'takeScreenshot' });
        break;
      case 'extract-links':
        extractLinks();
        break;
      case 'view-source':
        window.open('view-source:' + location.href);
        break;
      case 'responsive':
        toggleResponsiveView();
        break;
      case 'print':
        window.print();
        break;
      case 'share':
        if (navigator.share) {
          navigator.share({ url: location.href, title: document.title });
        } else {
          navigator.clipboard.writeText(location.href);
          showNotification('URL copied to clipboard!');
        }
        break;
      case 'bookmark':
        chrome.runtime.sendMessage({ action: 'addBookmark', url: location.href, title: document.title });
        break;
    }
    hide();
  }

  function extractLinks() {
    const links = Array.from(document.querySelectorAll('a[href]')).map(a => ({
      text: a.textContent.trim(),
      href: a.href
    }));
    
    const popup = window.open('', '_blank', 'width=600,height=400');
    popup.document.write(`
      <html>
        <head><title>Extracted Links</title></head>
        <body>
          <h2>Links from ${location.hostname}</h2>
          <ul>
            ${links.map(link => `<li><a href="${link.href}" target="_blank">${link.text || link.href}</a></li>`).join('')}
          </ul>
        </body>
      </html>
    `);
  }

  function toggleResponsiveView() {
    const viewport = document.querySelector('meta[name="viewport"]');
    if (!viewport) {
      const meta = document.createElement('meta');
      meta.name = 'viewport';
      meta.content = 'width=device-width, initial-scale=1.0';
      document.head.appendChild(meta);
    }
    document.body.style.transform = document.body.style.transform === 'scale(0.5)' ? '' : 'scale(0.5)';
  }

  function showNotification(message) {
    const notification = document.createElement('div');
    notification.className = 'quick-notification';
    notification.textContent = message;
    notification.style.cssText = `
      position: fixed !important;
      top: 20px !important;
      right: 20px !important;
      background: #4CAF50 !important;
      color: white !important;
      padding: 12px 20px !important;
      border-radius: 4px !important;
      z-index: 1000000 !important;
      font-size: 14px !important;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
    `;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 3000);
  }

  function attachKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'Q') {
        e.preventDefault();
        toggle();
      }
      if (e.key === 'Escape' && isVisible) {
        hide();
      }
    });
  }

  function show() {
    if (!container) createContainer();
    container.classList.remove('hidden');
    isVisible = true;
  }

  function hide() {
    if (container) {
      container.classList.add('hidden');
    }
    isVisible = false;
  }

  function toggle() {
    isVisible ? hide() : show();
  }

  return { init, show, hide, toggle };
})();

// Make it globally accessible
window.QuickActions = QuickActions;

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', QuickActions.init);
} else {
  QuickActions.init();
}
