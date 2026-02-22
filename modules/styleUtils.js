// Style Utilities - Inject scoped CSS for extension tools
const StyleUtils = (() => {
  let stylesInjected = false;

  function injectExtensionStyles() {
    if (stylesInjected) return;

    const styleElement = document.createElement('style');
    styleElement.id = 'ganj-extension-styles';
    styleElement.textContent = `
/* ===== SCOPED EXTENSION STYLES ===== */
:root {
  --ganj-primary: #3b82f6;
  --ganj-primary-hover: #2563eb;
  --ganj-success: #10b981;
  --ganj-error: #ef4444;
  --ganj-warning: #f59e0b;
  --ganj-gray-50: #f9fafb;
  --ganj-gray-100: #f3f4f6;
  --ganj-gray-200: #e5e7eb;
  --ganj-gray-300: #d1d5db;
  --ganj-gray-500: #6b7280;
  --ganj-gray-600: #4b5563;
  --ganj-gray-700: #374151;
  --ganj-gray-900: #111827;
  --ganj-font-sans: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  --ganj-shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
  --ganj-transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

/* ===== QUICK ACTIONS HUB ===== */
.quick-actions-hub {
  position: fixed !important;
  top: 0 !important;
  left: 0 !important;
  width: 100vw !important;
  height: 100vh !important;
  background: rgba(0, 0, 0, 0.7) !important;
  z-index: 999999 !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  font-family: var(--ganj-font-sans) !important;
}

.quick-actions-overlay {
  position: absolute !important;
  top: 0 !important;
  left: 0 !important;
  width: 100% !important;
  height: 100% !important;
}

.quick-actions-modal {
  background: white !important;
  border-radius: 12px !important;
  padding: 24px !important;
  max-width: 500px !important;
  width: 90% !important;
  max-height: 80vh !important;
  overflow-y: auto !important;
  box-shadow: var(--ganj-shadow-lg) !important;
  font-family: var(--ganj-font-sans) !important;
}

.quick-actions-header {
  display: flex !important;
  justify-content: space-between !important;
  align-items: center !important;
  margin-bottom: 20px !important;
}

.quick-actions-header h3 {
  margin: 0 !important;
  font-size: 18px !important;
  color: var(--ganj-gray-900) !important;
}

.quick-actions-close {
  background: none !important;
  border: none !important;
  font-size: 20px !important;
  cursor: pointer !important;
  padding: 4px !important;
  color: var(--ganj-gray-500) !important;
}

.quick-actions-grid {
  display: grid !important;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)) !important;
  gap: 12px !important;
}

.action-btn {
  padding: 16px 12px !important;
  background: var(--ganj-gray-50) !important;
  border: 2px solid var(--ganj-gray-200) !important;
  border-radius: 8px !important;
  cursor: pointer !important;
  transition: var(--ganj-transition) !important;
  text-align: center !important;
  font-size: 12px !important;
  font-family: var(--ganj-font-sans) !important;
  color: var(--ganj-gray-700) !important;
}

.action-btn:hover {
  background: var(--ganj-primary) !important;
  color: white !important;
  border-color: var(--ganj-primary) !important;
  transform: translateY(-2px) !important;
}

/* ===== JS EDITOR ===== */
.js-editor {
  position: fixed !important;
  top: 5% !important;
  left: 5% !important;
  width: 90% !important;
  height: 90% !important;
  background: white !important;
  border-radius: 12px !important;
  box-shadow: var(--ganj-shadow-lg) !important;
  z-index: 999999 !important;
  display: flex !important;
  flex-direction: column !important;
  font-family: var(--ganj-font-sans) !important;
}

.editor-panel {
  display: flex !important;
  flex-direction: column !important;
  height: 100% !important;
}

.editor-header {
  display: flex !important;
  justify-content: space-between !important;
  align-items: center !important;
  padding: 16px 20px !important;
  border-bottom: 1px solid var(--ganj-gray-200) !important;
  background: var(--ganj-gray-50) !important;
  border-radius: 12px 12px 0 0 !important;
}

.editor-header h3 {
  margin: 0 !important;
  font-size: 16px !important;
  color: var(--ganj-gray-900) !important;
}

.editor-controls {
  display: flex !important;
  gap: 8px !important;
  align-items: center !important;
}

.editor-content {
  flex: 1 !important;
  display: flex !important;
  flex-direction: column !important;
  overflow: hidden !important;
}

.editor-tabs {
  display: flex !important;
  background: var(--ganj-gray-100) !important;
  border-bottom: 1px solid var(--ganj-gray-200) !important;
}

.tab-btn {
  padding: 12px 16px !important;
  background: none !important;
  border: none !important;
  cursor: pointer !important;
  font-size: 12px !important;
  color: var(--ganj-gray-600) !important;
  border-bottom: 2px solid transparent !important;
  font-family: var(--ganj-font-sans) !important;
}

.tab-btn.active {
  color: var(--ganj-primary) !important;
  border-bottom-color: var(--ganj-primary) !important;
  background: white !important;
}

.tab-content {
  flex: 1 !important;
  padding: 16px !important;
  display: none !important;
  overflow: auto !important;
}

.tab-content.active {
  display: flex !important;
  flex-direction: column !important;
}

.js-textarea-container {
  position: relative !important;
  flex: 1 !important;
  display: flex !important;
}

.js-textarea-container textarea {
  flex: 1 !important;
  font-family: 'Monaco', 'Courier New', monospace !important;
  font-size: 12px !important;
  line-height: 1.4 !important;
  padding: 12px 12px 12px 50px !important;
  border: 1px solid var(--ganj-gray-300) !important;
  border-radius: 4px !important;
  resize: none !important;
  outline: none !important;
  background: white !important;
  color: var(--ganj-gray-900) !important;
}

.js-line-numbers {
  position: absolute !important;
  left: 0 !important;
  top: 0 !important;
  background: var(--ganj-gray-100) !important;
  color: var(--ganj-gray-500) !important;
  font-family: 'Monaco', 'Courier New', monospace !important;
  font-size: 12px !important;
  line-height: 1.4 !important;
  padding: 12px 8px !important;
  border-right: 1px solid var(--ganj-gray-300) !important;
  user-select: none !important;
  white-space: pre !important;
  text-align: right !important;
  width: 40px !important;
}

.console-output {
  background: #1a1a1a !important;
  color: #fff !important;
  font-family: 'Monaco', 'Courier New', monospace !important;
  font-size: 11px !important;
  padding: 12px !important;
  height: 200px !important;
  overflow-y: auto !important;
  border-radius: 4px !important;
  margin-bottom: 8px !important;
}

.console-line {
  margin-bottom: 4px !important;
  display: flex !important;
  gap: 8px !important;
}

.console-timestamp {
  color: #888 !important;
}

.console-log .console-value {
  color: #4CAF50 !important;
}

.console-error .console-value {
  color: #f44336 !important;
}

.console-warn .console-value {
  color: #ff9800 !important;
}

.console-input-container {
  display: flex !important;
  gap: 8px !important;
}

.console-input-container input {
  flex: 1 !important;
  padding: 8px !important;
  border: 1px solid var(--ganj-gray-300) !important;
  border-radius: 4px !important;
  font-family: 'Monaco', 'Courier New', monospace !important;
  font-size: 12px !important;
}

.editor-status {
  display: flex !important;
  justify-content: space-between !important;
  padding: 8px 20px !important;
  background: var(--ganj-gray-50) !important;
  border-top: 1px solid var(--ganj-gray-200) !important;
  font-size: 12px !important;
}

/* ===== CSS EDITOR ===== */
.css-editor {
  position: fixed !important;
  top: 5% !important;
  left: 5% !important;
  width: 90% !important;
  height: 90% !important;
  background: white !important;
  border-radius: 12px !important;
  box-shadow: var(--ganj-shadow-lg) !important;
  z-index: 999999 !important;
  display: flex !important;
  flex-direction: column !important;
  font-family: var(--ganj-font-sans) !important;
}

.css-textarea-container {
  position: relative !important;
  flex: 1 !important;
  display: flex !important;
}

.css-textarea-container textarea {
  flex: 1 !important;
  font-family: 'Monaco', 'Courier New', monospace !important;
  font-size: 12px !important;
  line-height: 1.4 !important;
  padding: 12px !important;
  border: 1px solid var(--ganj-gray-300) !important;
  border-radius: 4px !important;
  resize: none !important;
  outline: none !important;
  background: white !important;
  color: var(--ganj-gray-900) !important;
}

/* ===== TEXT TOOLS ===== */
.text-tools {
  position: fixed !important;
  top: 5% !important;
  left: 5% !important;
  width: 90% !important;
  height: 90% !important;
  background: white !important;
  border-radius: 12px !important;
  box-shadow: var(--ganj-shadow-lg) !important;
  z-index: 999999 !important;
  display: flex !important;
  flex-direction: column !important;
  font-family: var(--ganj-font-sans) !important;
}

/* ===== COLOR TOOLS ===== */
.color-tools {
  position: fixed !important;
  top: 5% !important;
  right: 5% !important;
  width: 320px !important;
  max-height: 90vh !important;
  background: white !important;
  border-radius: 12px !important;
  box-shadow: var(--ganj-shadow-lg) !important;
  z-index: 999999 !important;
  overflow-y: auto !important;
  font-family: var(--ganj-font-sans) !important;
}

/* ===== SCREENSHOT TOOLS ===== */
.screenshot-tools {
  position: fixed !important;
  top: 50% !important;
  left: 50% !important;
  transform: translate(-50%, -50%) !important;
  background: white !important;
  border-radius: 12px !important;
  padding: 24px !important;
  max-width: 500px !important;
  width: 90% !important;
  max-height: 80vh !important;
  overflow-y: auto !important;
  box-shadow: var(--ganj-shadow-lg) !important;
  z-index: 999999 !important;
  font-family: var(--ganj-font-sans) !important;
}

/* ===== AUTO REFRESH PANEL ===== */
.auto-refresh-panel {
  position: fixed !important;
  top: 50% !important;
  left: 50% !important;
  transform: translate(-50%, -50%) !important;
  background: white !important;
  border-radius: 12px !important;
  padding: 24px !important;
  max-width: 400px !important;
  width: 90% !important;
  box-shadow: var(--ganj-shadow-lg) !important;
  z-index: 999999 !important;
  font-family: var(--ganj-font-sans) !important;
}

/* ===== CROSS TAB SEARCH ===== */
.cross-tab-search {
  position: fixed !important;
  top: 0 !important;
  left: 0 !important;
  width: 100vw !important;
  height: 100vh !important;
  background: rgba(0, 0, 0, 0.8) !important;
  z-index: 999999 !important;
  display: flex !important;
  align-items: flex-start !important;
  justify-content: center !important;
  padding-top: 10vh !important;
  font-family: var(--ganj-font-sans) !important;
}

.search-modal {
  background: white !important;
  border-radius: 12px !important;
  padding: 24px !important;
  max-width: 700px !important;
  width: 90% !important;
  max-height: 80vh !important;
  display: flex !important;
  flex-direction: column !important;
  box-shadow: var(--ganj-shadow-lg) !important;
}

/* ===== URL REDIRECTOR ===== */
.url-redirector {
  position: fixed !important;
  top: 50% !important;
  left: 50% !important;
  transform: translate(-50%, -50%) !important;
  background: white !important;
  border-radius: 12px !important;
  padding: 24px !important;
  max-width: 600px !important;
  width: 90% !important;
  max-height: 80vh !important;
  overflow-y: auto !important;
  box-shadow: var(--ganj-shadow-lg) !important;
  z-index: 999999 !important;
  font-family: var(--ganj-font-sans) !important;
}

/* ===== SHARED BUTTON STYLES ===== */
.btn-primary,
#jsExecute,
#cssApply,
#startRefresh {
  background: var(--ganj-primary) !important;
  color: white !important;
  border: none !important;
  padding: 8px 16px !important;
  border-radius: 6px !important;
  cursor: pointer !important;
  font-size: 12px !important;
  font-family: var(--ganj-font-sans) !important;
  transition: var(--ganj-transition) !important;
}

.btn-primary:hover,
#jsExecute:hover,
#cssApply:hover,
#startRefresh:hover {
  background: var(--ganj-primary-hover) !important;
}

.btn-secondary,
#jsClear,
#cssClear {
  background: var(--ganj-gray-500) !important;
  color: white !important;
  border: none !important;
  padding: 8px 16px !important;
  border-radius: 6px !important;
  cursor: pointer !important;
  font-size: 12px !important;
  font-family: var(--ganj-font-sans) !important;
  transition: var(--ganj-transition) !important;
}

.btn-outline,
#jsSave,
#cssExport {
  background: transparent !important;
  color: var(--ganj-primary) !important;
  border: 1px solid var(--ganj-primary) !important;
  padding: 8px 16px !important;
  border-radius: 6px !important;
  cursor: pointer !important;
  font-size: 12px !important;
  font-family: var(--ganj-font-sans) !important;
  transition: var(--ganj-transition) !important;
}

.btn-outline:hover,
#jsSave:hover,
#cssExport:hover {
  background: var(--ganj-primary) !important;
  color: white !important;
}

/* ===== CLOSE BUTTONS ===== */
.js-editor-close,
.css-editor-close,
.tools-close {
  background: none !important;
  border: none !important;
  font-size: 18px !important;
  cursor: pointer !important;
  color: var(--ganj-gray-500) !important;
  padding: 4px !important;
  border-radius: 4px !important;
  transition: var(--ganj-transition) !important;
  font-family: var(--ganj-font-sans) !important;
}

.js-editor-close:hover,
.css-editor-close:hover,
.tools-close:hover {
  background: var(--ganj-gray-100) !important;
  color: var(--ganj-gray-700) !important;
}

/* ===== SHARED STYLES ===== */
.hidden {
  display: none !important;
}

.quick-notification,
.color-notification,
.text-notification,
.magnifier-notification {
  position: fixed !important;
  top: 20px !important;
  right: 20px !important;
  padding: 12px 20px !important;
  border-radius: 6px !important;
  color: white !important;
  font-size: 13px !important;
  z-index: 1000000 !important;
  font-family: var(--ganj-font-sans) !important;
  background: var(--ganj-success) !important;
  animation: ganjSlideIn 0.3s ease !important;
}

@keyframes ganjSlideIn {
  from { transform: translateX(100%); opacity: 0; }
  to { transform: translateX(0); opacity: 1; }
}

.image-magnifier {
  border: 3px solid #fff !important;
  box-shadow: 0 0 15px rgba(0,0,0,0.3) !important;
}

.selection-overlay {
  position: fixed !important;
  top: 0 !important;
  left: 0 !important;
  width: 100vw !important;
  height: 100vh !important;
  background: rgba(0,0,0,0.3) !important;
  cursor: crosshair !important;
  z-index: 999999 !important;
}

/* ===== NETWORK TOOLS ===== */
.ganj-ext-network-tools {
  position: fixed !important;
  top: 5% !important;
  left: 5% !important;
  width: 90% !important;
  height: 85% !important;
  background: white !important;
  border-radius: 8px !important;
  box-shadow: 0 4px 20px rgba(0,0,0,0.15) !important;
  z-index: 999999 !important;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
  display: flex !important;
  flex-direction: column !important;
}

.network-tools-panel {
  display: flex !important;
  flex-direction: column !important;
  height: 100% !important;
}

.network-tools-header {
  display: flex !important;
  justify-content: space-between !important;
  align-items: center !important;
  padding: 16px 24px !important;
  border-bottom: 1px solid var(--ganj-gray-200) !important;
  background: var(--ganj-gray-50) !important;
  border-radius: 8px 8px 0 0 !important;
}

.network-tools-header h3 {
  margin: 0 !important;
  font-size: 18px !important;
  font-weight: 600 !important;
  color: var(--ganj-gray-900) !important;
}

.network-tools-close {
  background: none !important;
  border: none !important;
  font-size: 18px !important;
  cursor: pointer !important;
  padding: 4px 8px !important;
  border-radius: 4px !important;
  color: var(--ganj-gray-600) !important;
}

.network-tools-close:hover {
  background: var(--ganj-gray-200) !important;
  color: var(--ganj-gray-900) !important;
}

.network-tools-tabs {
  display: flex !important;
  background: var(--ganj-gray-100) !important;
  border-bottom: 1px solid var(--ganj-gray-200) !important;
  padding: 0 20px !important;
}

.network-tab-btn {
  background: none !important;
  border: none !important;
  padding: 12px 20px !important;
  cursor: pointer !important;
  font-size: 14px !important;
  font-weight: 500 !important;
  color: var(--ganj-gray-600) !important;
  border-bottom: 2px solid transparent !important;
  transition: all 0.2s ease !important;
}

.network-tab-btn.active,
.network-tab-btn:hover {
  color: var(--ganj-blue-600) !important;
  border-bottom-color: var(--ganj-blue-600) !important;
}

.network-tools-content {
  flex: 1 !important;
  overflow: auto !important;
  padding: 20px !important;
}

.network-tab-content {
  display: none !important;
}

.network-tab-content.active {
  display: block !important;
}

.monitor-controls {
  display: flex !important;
  gap: 12px !important;
  margin-bottom: 16px !important;
}

.monitor-stats {
  display: flex !important;
  gap: 20px !important;
  margin-bottom: 16px !important;
  padding: 12px !important;
  background: var(--ganj-gray-50) !important;
  border-radius: 6px !important;
}

.stat-item {
  display: flex !important;
  gap: 8px !important;
  font-size: 14px !important;
}

.stat-label {
  color: var(--ganj-gray-600) !important;
}

.monitor-filters {
  display: flex !important;
  gap: 12px !important;
  margin-bottom: 16px !important;
}

.monitor-filters input,
.monitor-filters select {
  padding: 8px 12px !important;
  border: 1px solid var(--ganj-gray-300) !important;
  border-radius: 4px !important;
  font-size: 14px !important;
}

.request-list {
  max-height: 400px !important;
  overflow-y: auto !important;
  border: 1px solid var(--ganj-gray-200) !important;
  border-radius: 6px !important;
}

.request-item {
  padding: 12px !important;
  border-bottom: 1px solid var(--ganj-gray-100) !important;
}

.request-header {
  display: flex !important;
  gap: 12px !important;
  align-items: center !important;
  margin-bottom: 4px !important;
}

.request-method {
  padding: 2px 8px !important;
  border-radius: 4px !important;
  font-size: 12px !important;
  font-weight: 600 !important;
  color: white !important;
}

.request-method.get { background: var(--ganj-green-500) !important; }
.request-method.post { background: var(--ganj-blue-500) !important; }
.request-method.put { background: var(--ganj-orange-500) !important; }
.request-method.delete { background: var(--ganj-red-500) !important; }

.request-status {
  padding: 2px 8px !important;
  border-radius: 4px !important;
  font-size: 12px !important;
  font-weight: 600 !important;
  color: white !important;
}

.request-status.status-2xx { background: var(--ganj-green-500) !important; }
.request-status.status-3xx { background: var(--ganj-blue-500) !important; }
.request-status.status-4xx { background: var(--ganj-orange-500) !important; }
.request-status.status-5xx { background: var(--ganj-red-500) !important; }

.request-time {
  font-size: 12px !important;
  color: var(--ganj-gray-600) !important;
}

.request-url {
  font-size: 12px !important;
  color: var(--ganj-gray-700) !important;
  word-break: break-all !important;
}

.api-test-form {
  display: flex !important;
  flex-direction: column !important;
  gap: 20px !important;
}

.request-line {
  display: flex !important;
  gap: 12px !important;
  align-items: center !important;
}

.request-line select {
  width: 100px !important;
}

.request-line input {
  flex: 1 !important;
}

.response-section {
  margin-top: 20px !important;
  border-top: 1px solid var(--ganj-gray-200) !important;
  padding-top: 20px !important;
}

.response-tabs {
  display: flex !important;
  gap: 12px !important;
  margin-bottom: 12px !important;
}

.response-tab {
  background: var(--ganj-gray-100) !important;
  border: none !important;
  padding: 8px 16px !important;
  border-radius: 4px !important;
  cursor: pointer !important;
  font-size: 14px !important;
}

.response-tab.active {
  background: var(--ganj-blue-500) !important;
  color: white !important;
}

.response-info {
  display: flex !important;
  gap: 20px !important;
  margin-bottom: 12px !important;
  font-size: 14px !important;
  color: var(--ganj-gray-600) !important;
}

.response-content {
  position: relative !important;
}

.response-body-content {
  display: none !important;
}

.response-body-content.active {
  display: block !important;
}

.response-body-content pre {
  background: var(--ganj-gray-50) !important;
  padding: 16px !important;
  border-radius: 6px !important;
  font-family: 'Monaco', 'Courier New', monospace !important;
  font-size: 12px !important;
  overflow: auto !important;
  max-height: 300px !important;
}

.analysis-grid {
  display: grid !important;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)) !important;
  gap: 16px !important;
  margin-bottom: 20px !important;
}

.analysis-card {
  background: var(--ganj-gray-50) !important;
  padding: 16px !important;
  border-radius: 6px !important;
  border: 1px solid var(--ganj-gray-200) !important;
}

.analysis-card h5 {
  margin: 0 0 12px 0 !important;
  font-size: 14px !important;
  font-weight: 600 !important;
  color: var(--ganj-gray-900) !important;
}

.chart-bar {
  display: flex !important;
  justify-content: space-between !important;
  padding: 4px 0 !important;
  font-size: 12px !important;
}

.network-tools-grid {
  display: grid !important;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)) !important;
  gap: 16px !important;
}

.tool-card {
  background: var(--ganj-gray-50) !important;
  padding: 16px !important;
  border-radius: 6px !important;
  border: 1px solid var(--ganj-gray-200) !important;
}

.tool-card h4 {
  margin: 0 0 12px 0 !important;
  font-size: 14px !important;
  font-weight: 600 !important;
  color: var(--ganj-gray-900) !important;
}

.tool-card input {
  width: 100% !important;
  margin-bottom: 8px !important;
  padding: 8px 12px !important;
  border: 1px solid var(--ganj-gray-300) !important;
  border-radius: 4px !important;
  font-size: 14px !important;
}

.tool-result {
  margin-top: 12px !important;
  padding: 12px !important;
  background: var(--ganj-blue-50) !important;
  border-radius: 4px !important;
  font-size: 12px !important;
  font-family: 'Monaco', 'Courier New', monospace !important;
}

.tool-result.error {
  background: var(--ganj-red-50) !important;
  color: var(--ganj-red-700) !important;
}

/* ===== DATA TOOLS ===== */
.ganj-ext-data-tools {
  position: fixed !important;
  top: 5% !important;
  left: 5% !important;
  width: 90% !important;
  height: 85% !important;
  background: white !important;
  border-radius: 8px !important;
  box-shadow: 0 4px 20px rgba(0,0,0,0.15) !important;
  z-index: 999999 !important;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
  display: flex !important;
  flex-direction: column !important;
}

.data-tools-panel {
  display: flex !important;
  flex-direction: column !important;
  height: 100% !important;
}

.data-tools-header {
  display: flex !important;
  justify-content: space-between !important;
  align-items: center !important;
  padding: 16px 24px !important;
  border-bottom: 1px solid var(--ganj-gray-200) !important;
  background: var(--ganj-gray-50) !important;
  border-radius: 8px 8px 0 0 !important;
}

.data-tools-header h3 {
  margin: 0 !important;
  font-size: 18px !important;
  font-weight: 600 !important;
  color: var(--ganj-gray-900) !important;
}

.data-tools-close {
  background: none !important;
  border: none !important;
  font-size: 18px !important;
  cursor: pointer !important;
  padding: 4px 8px !important;
  border-radius: 4px !important;
  color: var(--ganj-gray-600) !important;
}

.data-tools-close:hover {
  background: var(--ganj-gray-200) !important;
  color: var(--ganj-gray-900) !important;
}

.data-tools-tabs {
  display: flex !important;
  background: var(--ganj-gray-100) !important;
  border-bottom: 1px solid var(--ganj-gray-200) !important;
  padding: 0 20px !important;
}

.data-tab-btn {
  background: none !important;
  border: none !important;
  padding: 12px 20px !important;
  cursor: pointer !important;
  font-size: 14px !important;
  font-weight: 500 !important;
  color: var(--ganj-gray-600) !important;
  border-bottom: 2px solid transparent !important;
  transition: all 0.2s ease !important;
}

.data-tab-btn.active,
.data-tab-btn:hover {
  color: var(--ganj-blue-600) !important;
  border-bottom-color: var(--ganj-blue-600) !important;
}

.data-tools-content {
  flex: 1 !important;
  overflow: auto !important;
  padding: 20px !important;
}

.data-tab-content {
  display: none !important;
}

.data-tab-content.active {
  display: block !important;
}

.tool-section {
  margin-bottom: 24px !important;
  padding-bottom: 20px !important;
  border-bottom: 1px solid var(--ganj-gray-200) !important;
}

.tool-section:last-child {
  border-bottom: none !important;
}

.tool-section h4 {
  margin: 0 0 12px 0 !important;
  font-size: 16px !important;
  font-weight: 600 !important;
  color: var(--ganj-gray-900) !important;
}

.json-controls,
.csv-controls,
.xml-controls {
  display: flex !important;
  gap: 12px !important;
  margin-bottom: 12px !important;
  flex-wrap: wrap !important;
}

.json-controls label,
.csv-controls label,
.xml-controls label {
  display: flex !important;
  align-items: center !important;
  gap: 6px !important;
  font-size: 14px !important;
  color: var(--ganj-gray-700) !important;
}

#jsonInput,
#csvInput,
#xmlInput,
#transformInput,
#transformOutput,
#generatedOutput,
#csvJsonOutput,
#xmlConversionOutput {
  width: 100% !important;
  height: 200px !important;
  padding: 12px !important;
  border: 1px solid var(--ganj-gray-300) !important;
  border-radius: 6px !important;
  font-family: 'Monaco', 'Courier New', monospace !important;
  font-size: 12px !important;
  line-height: 1.4 !important;
  resize: vertical !important;
  background: var(--ganj-gray-50) !important;
}

.json-info,
.csv-stats {
  display: flex !important;
  gap: 20px !important;
  margin-top: 8px !important;
  font-size: 12px !important;
  color: var(--ganj-gray-600) !important;
}

.json-tree,
.xml-tree {
  background: var(--ganj-gray-50) !important;
  border: 1px solid var(--ganj-gray-200) !important;
  border-radius: 6px !important;
  padding: 16px !important;
  max-height: 300px !important;
  overflow: auto !important;
  font-family: 'Monaco', 'Courier New', monospace !important;
  font-size: 12px !important;
}

.json-object,
.json-array {
  margin-left: 16px !important;
}

.json-property {
  margin: 2px 0 !important;
}

.json-key {
  color: var(--ganj-blue-600) !important;
  font-weight: 500 !important;
}

.json-string {
  color: var(--ganj-green-600) !important;
}

.json-number {
  color: var(--ganj-orange-600) !important;
}

.json-boolean {
  color: var(--ganj-purple-600) !important;
}

.json-null {
  color: var(--ganj-gray-500) !important;
  font-style: italic !important;
}

.csv-table {
  width: 100% !important;
  border-collapse: collapse !important;
  margin: 12px 0 !important;
  font-size: 12px !important;
}

.csv-table th,
.csv-table td {
  padding: 8px 12px !important;
  border: 1px solid var(--ganj-gray-300) !important;
  text-align: left !important;
}

.csv-table th {
  background: var(--ganj-gray-100) !important;
  font-weight: 600 !important;
  color: var(--ganj-gray-900) !important;
}

.transform-grid {
  display: grid !important;
  grid-template-columns: 1fr auto 1fr !important;
  gap: 20px !important;
  margin-bottom: 20px !important;
}

.transform-input,
.transform-output {
  display: flex !important;
  flex-direction: column !important;
}

.transform-options {
  display: flex !important;
  flex-direction: column !important;
  gap: 12px !important;
  min-width: 200px !important;
  padding: 16px !important;
  background: var(--ganj-gray-50) !important;
  border-radius: 6px !important;
}

.transform-controls {
  display: flex !important;
  flex-direction: column !important;
  gap: 8px !important;
}

.generator-grid {
  display: grid !important;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)) !important;
  gap: 16px !important;
  margin-bottom: 20px !important;
}

.generator-card {
  background: var(--ganj-gray-50) !important;
  padding: 16px !important;
  border-radius: 6px !important;
  border: 1px solid var(--ganj-gray-200) !important;
  display: flex !important;
  flex-direction: column !important;
  gap: 8px !important;
}

.generator-card h5 {
  margin: 0 0 8px 0 !important;
  font-size: 14px !important;
  font-weight: 600 !important;
  color: var(--ganj-gray-900) !important;
}

.generator-card label {
  display: flex !important;
  align-items: center !important;
  gap: 8px !important;
  font-size: 12px !important;
  color: var(--ganj-gray-700) !important;
}

.generator-card input,
.generator-card select,
.generator-card textarea {
  padding: 6px 8px !important;
  border: 1px solid var(--ganj-gray-300) !important;
  border-radius: 4px !important;
  font-size: 12px !important;
}

.generator-output {
  margin-top: 20px !important;
  padding-top: 20px !important;
  border-top: 1px solid var(--ganj-gray-200) !important;
}

.output-controls {
  display: flex !important;
  gap: 12px !important;
  margin-bottom: 12px !important;
}

.query-result {
  margin-top: 12px !important;
  padding: 12px !important;
  background: var(--ganj-blue-50) !important;
  border-radius: 4px !important;
  font-size: 12px !important;
}

.query-result.error {
  background: var(--ganj-red-50) !important;
  color: var(--ganj-red-700) !important;
}

.test-success {
  background: var(--ganj-green-50) !important;
  color: var(--ganj-green-700) !important;
  padding: 12px !important;
  border-radius: 4px !important;
  font-size: 12px !important;
}

.test-failure {
  background: var(--ganj-red-50) !important;
  color: var(--ganj-red-700) !important;
  padding: 12px !important;
  border-radius: 4px !important;
  font-size: 12px !important;
}

.test-warning {
  background: var(--ganj-orange-50) !important;
  color: var(--ganj-orange-700) !important;
  padding: 12px !important;
  border-radius: 4px !important;
  font-size: 12px !important;
}

.data-table {
  width: 100% !important;
  border-collapse: collapse !important;
  margin: 12px 0 !important;
  font-size: 12px !important;
}

.data-table th,
.data-table td {
  padding: 8px 12px !important;
  border: 1px solid var(--ganj-gray-300) !important;
  text-align: left !important;
}

.data-table th {
  background: var(--ganj-gray-100) !important;
  font-weight: 600 !important;
  color: var(--ganj-gray-900) !important;
}

.no-data {
  text-align: center !important;
  color: var(--ganj-gray-500) !important;
  padding: 20px !important;
  font-style: italic !important;
}

.header-controls {
  display: flex !important;
  align-items: center !important;
  gap: 12px !important;
}

.shortcut-hint {
  font-size: 11px !important;
  color: var(--ganj-gray-500) !important;
  background: var(--ganj-gray-100) !important;
  padding: 2px 6px !important;
  border-radius: 3px !important;
}
    `;

    document.head.appendChild(styleElement);
    stylesInjected = true;
  }

  return { injectExtensionStyles };
})();

// Auto-inject styles when this utility is loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', StyleUtils.injectExtensionStyles);
} else {
  StyleUtils.injectExtensionStyles();
}
