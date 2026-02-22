// Screenshot Tools - Advanced screenshot and image utilities
const ScreenshotTools = (() => {
  let toolsContainer = null;
  let isVisible = false;
  let isSelecting = false;
  let selectionOverlay = null;

  function init() {
    createToolsContainer();
    attachKeyboardShortcuts();
  }

  function createToolsContainer() {
    if (toolsContainer) return;

    toolsContainer = document.createElement('div');
    toolsContainer.className = 'screenshot-tools hidden';
    toolsContainer.innerHTML = `
      <div class="tools-panel">
        <div class="tools-header">
          <h3>📸 Screenshot Tools</h3>
          <button class="tools-close">✕</button>
        </div>
        
        <div class="screenshot-options">
          <button id="captureVisible" class="capture-btn">📱 Visible Area</button>
          <button id="captureFullPage" class="capture-btn">📄 Full Page</button>
          <button id="captureSelection" class="capture-btn">🎯 Selection</button>
          <button id="captureElement" class="capture-btn">🔲 Element</button>
        </div>
        
        <div class="capture-settings">
          <div class="setting-group">
            <label>Format:</label>
            <select id="imageFormat">
              <option value="png">PNG</option>
              <option value="jpeg">JPEG</option>
              <option value="webp">WebP</option>
            </select>
          </div>
          
          <div class="setting-group">
            <label>Quality (JPEG/WebP):</label>
            <input type="range" id="imageQuality" min="0.1" max="1" step="0.1" value="0.9">
            <span id="qualityValue">90%</span>
          </div>
          
          <div class="setting-group">
            <label>
              <input type="checkbox" id="includeDate" checked>
              Include timestamp in filename
            </label>
          </div>
          
          <div class="setting-group">
            <label>
              <input type="checkbox" id="copyToClipboard">
              Copy to clipboard
            </label>
          </div>
        </div>
        
        <div class="tools-status">
          <span id="screenshotStatus">Ready to capture</span>
        </div>
      </div>
    `;

    document.body.appendChild(toolsContainer);
    attachEventListeners();
  }

  function attachEventListeners() {
    toolsContainer.querySelector('.tools-close').addEventListener('click', hide);
    
    // Capture buttons
    toolsContainer.querySelector('#captureVisible').addEventListener('click', captureVisible);
    toolsContainer.querySelector('#captureFullPage').addEventListener('click', captureFullPage);
    toolsContainer.querySelector('#captureSelection').addEventListener('click', startSelectionCapture);
    toolsContainer.querySelector('#captureElement').addEventListener('click', startElementCapture);
    
    // Quality slider
    const qualitySlider = toolsContainer.querySelector('#imageQuality');
    const qualityValue = toolsContainer.querySelector('#qualityValue');
    qualitySlider.addEventListener('input', (e) => {
      qualityValue.textContent = Math.round(e.target.value * 100) + '%';
    });
  }

  function captureVisible() {
    updateStatus('Capturing visible area...');
    chrome.runtime.sendMessage({ action: 'captureVisible' }, (response) => {
      if (response && response.dataUrl) {
        handleCapturedImage(response.dataUrl);
      } else {
        updateStatus('Failed to capture screenshot');
      }
    });
  }

  function captureFullPage() {
    updateStatus('Capturing visible area (full-page requires scroll-and-stitch)...');
    chrome.runtime.sendMessage({ action: 'captureVisible' }, (response) => {
      if (response?.dataUrl) {
        handleCapturedImage(response.dataUrl);
        updateStatus('Captured visible area. Full-page scroll capture is not yet supported.');
      } else {
        updateStatus('Failed to capture screenshot');
      }
    });
  }

  function startSelectionCapture() {
    updateStatus('Click and drag to select area...');
    hide();
    createSelectionOverlay();
  }

  function startElementCapture() {
    updateStatus('Click on element to capture...');
    hide();
    enableElementSelection();
  }

  function createSelectionOverlay() {
    if (selectionOverlay) return;

    selectionOverlay = document.createElement('div');
    selectionOverlay.className = 'selection-overlay';
    selectionOverlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: rgba(0,0,0,0.3);
      cursor: crosshair;
      z-index: 999999;
    `;

    let isDrawing = false;
    let startX, startY;
    let selectionBox = null;

    selectionOverlay.addEventListener('mousedown', (e) => {
      isDrawing = true;
      startX = e.clientX;
      startY = e.clientY;
      
      selectionBox = document.createElement('div');
      selectionBox.style.cssText = `
        position: absolute;
        border: 2px dashed #fff;
        background: rgba(255,255,255,0.1);
        pointer-events: none;
      `;
      selectionOverlay.appendChild(selectionBox);
    });

    selectionOverlay.addEventListener('mousemove', (e) => {
      if (!isDrawing || !selectionBox) return;
      
      const currentX = e.clientX;
      const currentY = e.clientY;
      
      const left = Math.min(startX, currentX);
      const top = Math.min(startY, currentY);
      const width = Math.abs(currentX - startX);
      const height = Math.abs(currentY - startY);
      
      selectionBox.style.left = left + 'px';
      selectionBox.style.top = top + 'px';
      selectionBox.style.width = width + 'px';
      selectionBox.style.height = height + 'px';
    });

    selectionOverlay.addEventListener('mouseup', (e) => {
      if (!isDrawing || !selectionBox) return;
      
      const rect = selectionBox.getBoundingClientRect();
      removeSelectionOverlay();
      
      if (rect.width > 10 && rect.height > 10) {
        captureSelection(rect);
      }
    });

    selectionOverlay.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        removeSelectionOverlay();
      }
    });

    document.body.appendChild(selectionOverlay);
    selectionOverlay.focus();
  }

  function removeSelectionOverlay() {
    if (selectionOverlay) {
      selectionOverlay.remove();
      selectionOverlay = null;
    }
  }

  function captureSelection(rect) {
    chrome.runtime.sendMessage({ action: 'captureVisible' }, (response) => {
      if (!response?.dataUrl) {
        updateStatus('Failed to capture screenshot');
        show();
        return;
      }

      const dpr = window.devicePixelRatio || 1;
      const img = new Image();
      img.onload = () => {
        const cropCanvas = document.createElement('canvas');
        cropCanvas.width = rect.width * dpr;
        cropCanvas.height = rect.height * dpr;
        const ctx = cropCanvas.getContext('2d');
        ctx.drawImage(
          img,
          rect.left * dpr, rect.top * dpr,
          rect.width * dpr, rect.height * dpr,
          0, 0,
          rect.width * dpr, rect.height * dpr
        );
        handleCapturedImage(cropCanvas.toDataURL('image/png'));
        show();
      };
      img.src = response.dataUrl;
    });
  }

  function enableElementSelection() {
    let highlightOverlay = null;
    
    function createHighlight(element) {
      removeHighlight();
      
      const rect = element.getBoundingClientRect();
      highlightOverlay = document.createElement('div');
      highlightOverlay.style.cssText = `
        position: fixed;
        top: ${rect.top}px;
        left: ${rect.left}px;
        width: ${rect.width}px;
        height: ${rect.height}px;
        border: 2px solid #4285f4;
        background: rgba(66, 133, 244, 0.1);
        pointer-events: none;
        z-index: 999998;
      `;
      document.body.appendChild(highlightOverlay);
    }
    
    function removeHighlight() {
      if (highlightOverlay) {
        highlightOverlay.remove();
        highlightOverlay = null;
      }
    }
    
    function handleMouseOver(e) {
      e.preventDefault();
      createHighlight(e.target);
    }
    
    function handleClick(e) {
      e.preventDefault();
      e.stopPropagation();
      
      const element = e.target;
      const rect = element.getBoundingClientRect();
      
      // Clean up
      document.removeEventListener('mouseover', handleMouseOver, true);
      document.removeEventListener('click', handleClick, true);
      document.removeEventListener('keydown', handleKeyDown, true);
      removeHighlight();
      
      // Capture element
      captureSelection(rect);
      show();
    }
    
    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        document.removeEventListener('mouseover', handleMouseOver, true);
        document.removeEventListener('click', handleClick, true);
        document.removeEventListener('keydown', handleKeyDown, true);
        removeHighlight();
        show();
      }
    }
    
    document.addEventListener('mouseover', handleMouseOver, true);
    document.addEventListener('click', handleClick, true);
    document.addEventListener('keydown', handleKeyDown, true);
  }

  function handleCapturedImage(dataUrl) {
    const settings = getSettings();
    
    if (settings.copyToClipboard) {
      copyImageToClipboard(dataUrl);
    }
    
    downloadImage(dataUrl);
    updateStatus('Screenshot captured successfully');
  }

  function downloadImage(dataUrl) {
    const settings = getSettings();
    const format = settings.format;
    
    try {
      const link = document.createElement('a');
      link.download = generateFilename();
      
      if (format === 'png') {
        link.href = dataUrl;
      } else {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0);
          link.href = canvas.toDataURL(`image/${format}`, settings.quality);
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          updateStatus('Image downloaded successfully ✅');
        };
        img.src = dataUrl;
        return;
      }
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      updateStatus('Image downloaded successfully ✅');
    } catch (error) {
      console.error('Download failed:', error);
      updateStatus('Download failed - try a different format');
    }
  }

  function copyImageToClipboard(dataUrl) {
    fetch(dataUrl)
      .then(res => res.blob())
      .then(blob => {
        navigator.clipboard.write([
          new ClipboardItem({ 'image/png': blob })
        ]).then(() => {
          updateStatus('Image copied to clipboard ✅');
        }).catch(error => {
          console.error('Clipboard copy failed:', error);
          updateStatus('Clipboard copy failed - try downloading instead');
        });
      })
      .catch(error => {
        console.error('Failed to process image for clipboard:', error);
        updateStatus('Failed to process image for clipboard');
      });
  }

  function getSettings() {
    return {
      format: toolsContainer.querySelector('#imageFormat').value,
      quality: parseFloat(toolsContainer.querySelector('#imageQuality').value),
      includeDate: toolsContainer.querySelector('#includeDate').checked,
      copyToClipboard: toolsContainer.querySelector('#copyToClipboard').checked
    };
  }

  function generateFilename() {
    const settings = getSettings();
    const timestamp = settings.includeDate ? '_' + new Date().toISOString().replace(/[:.]/g, '-') : '';
    return `screenshot${timestamp}.${settings.format}`;
  }

  function updateStatus(message) {
    toolsContainer.querySelector('#screenshotStatus').textContent = message;
  }

  function attachKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'S') {
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

// Make it globally accessible
window.ScreenshotTools = ScreenshotTools;

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', ScreenshotTools.init);
} else {
  ScreenshotTools.init();
}
