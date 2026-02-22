// Color Tools - Advanced color utilities and design helpers
const ColorTools = (() => {
  let toolsContainer = null;
  let isVisible = false;
  let isPicking = false;
  let eyedropper = null;

  function init() {
    createToolsContainer();
    attachKeyboardShortcuts();
  }

  function createToolsContainer() {
    if (toolsContainer) return;

    toolsContainer = document.createElement('div');
    toolsContainer.className = 'color-tools hidden';
    toolsContainer.innerHTML = `
      <div class="tools-panel">
        <div class="tools-header">
          <h3>🎨 Color & Design Tools</h3>
          <button class="tools-close">✕</button>
        </div>
        
        <div class="color-picker-section">
          <button id="startEyedropper" class="tool-btn">🎯 Color Picker</button>
          <div class="picked-color" id="pickedColor">
            <div class="color-swatch" style="background: #ffffff;"></div>
            <div class="color-values">
              <div>HEX: <span id="hexValue">#ffffff</span></div>
              <div>RGB: <span id="rgbValue">rgb(255, 255, 255)</span></div>
              <div>HSL: <span id="hslValue">hsl(0, 0%, 100%)</span></div>
            </div>
          </div>
        </div>
        
        <div class="palette-section">
          <h4>🎨 Color Palette Generator</h4>
          <input type="color" id="baseColor" value="#3498db">
          <select id="paletteType">
            <option value="complementary">Complementary</option>
            <option value="triadic">Triadic</option>
            <option value="analogous">Analogous</option>
            <option value="monochromatic">Monochromatic</option>
          </select>
          <button id="generatePalette">Generate</button>
          <div class="palette-display" id="paletteDisplay"></div>
        </div>
        
        <div class="contrast-section">
          <h4>📊 Contrast Checker</h4>
          <div class="contrast-inputs">
            <input type="color" id="foregroundColor" value="#000000">
            <label>Foreground</label>
            <input type="color" id="backgroundColor" value="#ffffff">
            <label>Background</label>
          </div>
          <div class="contrast-result" id="contrastResult">
            <div class="contrast-ratio">Ratio: <span id="ratioValue">21:1</span></div>
            <div class="wcag-grades">
              <span class="grade" id="aaGrade">AA ✓</span>
              <span class="grade" id="aaaGrade">AAA ✓</span>
            </div>
          </div>
        </div>
        
        <div class="gradient-section">
          <h4>🌈 Gradient Generator</h4>
          <div class="gradient-controls">
            <input type="color" id="gradientStart" value="#ff7e5f">
            <input type="color" id="gradientEnd" value="#feb47b">
            <select id="gradientDirection">
              <option value="to right">Left to Right</option>
              <option value="to bottom">Top to Bottom</option>
              <option value="45deg">Diagonal (45°)</option>
              <option value="135deg">Diagonal (135°)</option>
              <option value="radial">Radial</option>
            </select>
          </div>
          <div class="gradient-preview" id="gradientPreview"></div>
          <div class="gradient-css" id="gradientCSS">
            background: linear-gradient(to right, #ff7e5f, #feb47b);
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(toolsContainer);
    attachEventListeners();
  }

  function attachEventListeners() {
    toolsContainer.querySelector('.tools-close').addEventListener('click', hide);
    toolsContainer.querySelector('#startEyedropper').addEventListener('click', startEyedropper);
    toolsContainer.querySelector('#generatePalette').addEventListener('click', generatePalette);
    
    // Contrast checker
    ['foregroundColor', 'backgroundColor'].forEach(id => {
      toolsContainer.querySelector('#' + id).addEventListener('input', updateContrast);
    });
    
    // Gradient generator
    ['gradientStart', 'gradientEnd', 'gradientDirection'].forEach(id => {
      toolsContainer.querySelector('#' + id).addEventListener('input', updateGradient);
    });
    
    // Color copy functionality
    ['hexValue', 'rgbValue', 'hslValue'].forEach(id => {
      toolsContainer.querySelector('#' + id).addEventListener('click', (e) => {
        navigator.clipboard.writeText(e.target.textContent);
        showNotification('Color value copied!');
      });
    });
    
    toolsContainer.querySelector('#gradientCSS').addEventListener('click', (e) => {
      navigator.clipboard.writeText(e.target.textContent);
      showNotification('CSS gradient copied!');
    });
    
    updateContrast();
    updateGradient();
  }

  function startEyedropper() {
    if ('EyeDropper' in window) {
      const eyeDropper = new EyeDropper();
      eyeDropper.open().then(result => {
        updatePickedColor(result.sRGBHex);
      }).catch(err => {
        console.log('Eyedropper cancelled or failed:', err);
      });
    } else {
      // Fallback for browsers without EyeDropper API
      showNotification('EyeDropper not supported. Click on any element to pick its color.');
      enableFallbackColorPicker();
    }
  }

  function enableFallbackColorPicker() {
    isPicking = true;
    document.body.style.cursor = 'crosshair';
    
    function handleClick(e) {
      e.preventDefault();
      e.stopPropagation();
      
      const element = e.target;
      const computedStyle = window.getComputedStyle(element);
      const color = computedStyle.backgroundColor || computedStyle.color;
      
      if (color && color !== 'rgba(0, 0, 0, 0)' && color !== 'transparent') {
        updatePickedColor(rgbToHex(color));
      }
      
      // Clean up
      isPicking = false;
      document.body.style.cursor = '';
      document.removeEventListener('click', handleClick, true);
    }
    
    document.addEventListener('click', handleClick, true);
  }

  function updatePickedColor(hex) {
    const rgb = hexToRgb(hex);
    const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
    
    toolsContainer.querySelector('.color-swatch').style.background = hex;
    toolsContainer.querySelector('#hexValue').textContent = hex;
    toolsContainer.querySelector('#rgbValue').textContent = `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;
    toolsContainer.querySelector('#hslValue').textContent = `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`;
  }

  function generatePalette() {
    const baseColor = toolsContainer.querySelector('#baseColor').value;
    const type = toolsContainer.querySelector('#paletteType').value;
    const paletteDisplay = toolsContainer.querySelector('#paletteDisplay');
    
    const rgb = hexToRgb(baseColor);
    const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
    let colors = [];
    
    switch (type) {
      case 'complementary':
        colors = [
          baseColor,
          hslToHex((hsl.h + 180) % 360, hsl.s, hsl.l)
        ];
        break;
      case 'triadic':
        colors = [
          baseColor,
          hslToHex((hsl.h + 120) % 360, hsl.s, hsl.l),
          hslToHex((hsl.h + 240) % 360, hsl.s, hsl.l)
        ];
        break;
      case 'analogous':
        colors = [
          hslToHex((hsl.h - 30 + 360) % 360, hsl.s, hsl.l),
          baseColor,
          hslToHex((hsl.h + 30) % 360, hsl.s, hsl.l),
          hslToHex((hsl.h + 60) % 360, hsl.s, hsl.l)
        ];
        break;
      case 'monochromatic':
        colors = [
          hslToHex(hsl.h, hsl.s, Math.max(hsl.l - 40, 0)),
          hslToHex(hsl.h, hsl.s, Math.max(hsl.l - 20, 0)),
          baseColor,
          hslToHex(hsl.h, hsl.s, Math.min(hsl.l + 20, 100)),
          hslToHex(hsl.h, hsl.s, Math.min(hsl.l + 40, 100))
        ];
        break;
    }
    
    paletteDisplay.innerHTML = colors.map(color => `
      <div class="palette-color" style="background: ${color};" data-color="${color}">
        <span class="color-hex">${color}</span>
      </div>
    `).join('');
    
    // Add click handlers for copying colors
    paletteDisplay.querySelectorAll('.palette-color').forEach(el => {
      el.addEventListener('click', () => {
        navigator.clipboard.writeText(el.dataset.color);
        showNotification('Color copied: ' + el.dataset.color);
      });
    });
  }

  function updateContrast() {
    const fg = toolsContainer.querySelector('#foregroundColor').value;
    const bg = toolsContainer.querySelector('#backgroundColor').value;
    
    const ratio = getContrastRatio(fg, bg);
    const ratioValue = toolsContainer.querySelector('#ratioValue');
    const aaGrade = toolsContainer.querySelector('#aaGrade');
    const aaaGrade = toolsContainer.querySelector('#aaaGrade');
    
    ratioValue.textContent = ratio.toFixed(2) + ':1';
    
    // WCAG guidelines
    const aaPass = ratio >= 4.5;
    const aaaPass = ratio >= 7;
    
    aaGrade.textContent = aaPass ? 'AA ✓' : 'AA ✗';
    aaGrade.className = 'grade ' + (aaPass ? 'pass' : 'fail');
    
    aaaGrade.textContent = aaaPass ? 'AAA ✓' : 'AAA ✗';
    aaaGrade.className = 'grade ' + (aaaPass ? 'pass' : 'fail');
  }

  function updateGradient() {
    const start = toolsContainer.querySelector('#gradientStart').value;
    const end = toolsContainer.querySelector('#gradientEnd').value;
    const direction = toolsContainer.querySelector('#gradientDirection').value;
    
    const preview = toolsContainer.querySelector('#gradientPreview');
    const cssDisplay = toolsContainer.querySelector('#gradientCSS');
    
    let gradientCSS;
    if (direction === 'radial') {
      gradientCSS = `radial-gradient(circle, ${start}, ${end})`;
    } else {
      gradientCSS = `linear-gradient(${direction}, ${start}, ${end})`;
    }
    
    preview.style.background = gradientCSS;
    cssDisplay.textContent = `background: ${gradientCSS};`;
  }

  // Color conversion utilities
  function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  }

  function rgbToHex(rgb) {
    if (rgb.startsWith('rgb')) {
      const values = rgb.match(/\d+/g);
      const r = parseInt(values[0]);
      const g = parseInt(values[1]);
      const b = parseInt(values[2]);
      return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
    }
    return rgb;
  }

  function rgbToHsl(r, g, b) {
    r /= 255;
    g /= 255;
    b /= 255;
    
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;
    
    if (max === min) {
      h = s = 0;
    } else {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        case b: h = (r - g) / d + 4; break;
      }
      h /= 6;
    }
    
    return {
      h: Math.round(h * 360),
      s: Math.round(s * 100),
      l: Math.round(l * 100)
    };
  }

  function hslToHex(h, s, l) {
    l /= 100;
    const a = s * Math.min(l, 1 - l) / 100;
    const f = n => {
      const k = (n + h / 30) % 12;
      const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
      return Math.round(255 * color).toString(16).padStart(2, '0');
    };
    return `#${f(0)}${f(8)}${f(4)}`;
  }

  function getContrastRatio(color1, color2) {
    const rgb1 = hexToRgb(color1);
    const rgb2 = hexToRgb(color2);
    
    const l1 = getLuminance(rgb1.r, rgb1.g, rgb1.b);
    const l2 = getLuminance(rgb2.r, rgb2.g, rgb2.b);
    
    const lighter = Math.max(l1, l2);
    const darker = Math.min(l1, l2);
    
    return (lighter + 0.05) / (darker + 0.05);
  }

  function getLuminance(r, g, b) {
    const [rs, gs, bs] = [r, g, b].map(c => {
      c /= 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
  }

  function showNotification(message) {
    const notification = document.createElement('div');
    notification.className = 'color-notification';
    notification.textContent = message;
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #4CAF50;
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
      if (e.ctrlKey && e.shiftKey && e.key === 'P') {
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

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', ColorTools.init);
} else {
  ColorTools.init();
}

// Make it globally accessible
window.ColorTools = ColorTools;
