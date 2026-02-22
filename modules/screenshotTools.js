const ScreenshotTools = (() => {
  let container = null;
  let isVisible = false;
  let canvas, ctx, img;
  let tool = null;
  let drawing = false;
  let drawStart = null;
  let annotations = [];
  let undoStack = [];
  let color = '#ef4444';
  let lineWidth = 3;
  let selectionOverlay = null;

  function init() {
    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'S') { e.preventDefault(); toggle(); }
      if (e.key === 'Escape' && isVisible) hide();
    });
  }

  function createUI() {
    if (container) return;
    container = document.createElement('div');
    container.className = 'screenshot-tools hidden';
    container.innerHTML = `
      <div class="tools-header" style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">
        <h3 style="margin:0;font-size:16px;font-weight:600;color:var(--ganj-text,#1e293b);">📸 Screenshot</h3>
        <button class="tools-close">✕</button>
      </div>

      <!-- Capture mode -->
      <div id="ssCapture">
        <div class="screenshot-options">
          <button class="capture-btn" data-cap="visible">📱 Visible Area</button>
          <button class="capture-btn" data-cap="selection">🎯 Selection</button>
          <button class="capture-btn" data-cap="element">🔲 Element</button>
          <button class="capture-btn" data-cap="fullpage">📄 Full Page</button>
        </div>
        <div class="capture-settings">
          <div style="display:flex;gap:12px;flex-wrap:wrap;align-items:center;">
            <label style="font-size:12px;">Format:
              <select id="ssFormat"><option value="png">PNG</option><option value="jpeg">JPEG</option><option value="webp">WebP</option></select>
            </label>
            <label style="font-size:12px;">Quality:
              <input type="range" id="ssQuality" min="0.1" max="1" step="0.1" value="0.9" style="width:80px;vertical-align:middle;">
              <span id="ssQualityVal">90%</span>
            </label>
          </div>
        </div>
        <div id="ssStatus" style="font-size:12px;color:var(--ganj-text-muted,#64748b);margin-top:8px;">Ready to capture</div>
      </div>

      <!-- Editor mode -->
      <div id="ssEditor" style="display:none;">
        <div style="display:flex;gap:4px;flex-wrap:wrap;margin-bottom:10px;align-items:center;">
          <button class="ss-tool-btn active" data-tool="draw" title="Draw">✏️</button>
          <button class="ss-tool-btn" data-tool="arrow" title="Arrow">➡️</button>
          <button class="ss-tool-btn" data-tool="rect" title="Rectangle">⬜</button>
          <button class="ss-tool-btn" data-tool="text" title="Text">🔤</button>
          <button class="ss-tool-btn" data-tool="highlight" title="Highlight">🖍️</button>
          <button class="ss-tool-btn" data-tool="blur" title="Blur">🌫️</button>
          <button class="ss-tool-btn" data-tool="crop" title="Crop">✂️</button>
          <span style="width:1px;height:20px;background:var(--ganj-border,#e2e8f0);margin:0 4px;"></span>
          <input type="color" id="ssColor" value="#ef4444" title="Color" style="width:28px;height:28px;border:none;padding:0;cursor:pointer;border-radius:4px;">
          <select id="ssLineWidth" title="Size" style="padding:2px 4px;font-size:11px;border-radius:4px;">
            <option value="2">Thin</option>
            <option value="3" selected>Medium</option>
            <option value="5">Thick</option>
            <option value="8">Bold</option>
          </select>
          <span style="width:1px;height:20px;background:var(--ganj-border,#e2e8f0);margin:0 4px;"></span>
          <button class="btn-small btn-outline" id="ssUndo" title="Undo">↩️</button>
          <button class="btn-small btn-outline" id="ssReset" title="Reset">🔄</button>
          <span style="flex:1;"></span>
          <button class="btn-small btn-outline" id="ssCopy">📋 Copy</button>
          <button class="btn-small btn-primary" id="ssDownload">💾 Save</button>
        </div>
        <div id="ssCanvasWrap" style="border:1px solid var(--ganj-border,#e2e8f0);border-radius:8px;overflow:auto;max-height:60vh;background:#1e293b;text-align:center;cursor:crosshair;">
          <canvas id="ssCanvas" style="max-width:100%;"></canvas>
        </div>
      </div>
    `;
    document.body.appendChild(container);

    container.querySelector('.tools-close').addEventListener('click', hide);
    container.querySelector('#ssQuality').addEventListener('input', (e) => {
      container.querySelector('#ssQualityVal').textContent = Math.round(e.target.value * 100) + '%';
    });

    container.querySelectorAll('[data-cap]').forEach(b => {
      b.addEventListener('click', () => {
        const mode = b.dataset.cap;
        if (mode === 'visible') captureVisible();
        else if (mode === 'selection') startSelectionCapture();
        else if (mode === 'element') startElementCapture();
        else if (mode === 'fullpage') captureVisible();
      });
    });

    container.querySelectorAll('.ss-tool-btn').forEach(b => {
      b.addEventListener('click', () => {
        container.querySelectorAll('.ss-tool-btn').forEach(x => x.classList.remove('active'));
        b.classList.add('active');
        tool = b.dataset.tool;
        const wrap = container.querySelector('#ssCanvasWrap');
        wrap.style.cursor = tool === 'text' ? 'text' : 'crosshair';
      });
    });

    container.querySelector('#ssColor').addEventListener('input', (e) => { color = e.target.value; });
    container.querySelector('#ssLineWidth').addEventListener('change', (e) => { lineWidth = parseInt(e.target.value); });
    container.querySelector('#ssUndo').addEventListener('click', undo);
    container.querySelector('#ssReset').addEventListener('click', resetEditor);
    container.querySelector('#ssCopy').addEventListener('click', copyImage);
    container.querySelector('#ssDownload').addEventListener('click', downloadImage);
  }

  // ---- Capture ----

  function setStatus(msg) {
    const el = container.querySelector('#ssStatus');
    if (el) el.textContent = msg;
  }

  function captureVisible() {
    setStatus('Capturing...');
    chrome.runtime.sendMessage({ action: 'captureVisible' }, (res) => {
      if (res?.dataUrl) openEditor(res.dataUrl);
      else setStatus('Capture failed');
    });
  }

  function startSelectionCapture() {
    hide();
    if (selectionOverlay) return;
    selectionOverlay = document.createElement('div');
    selectionOverlay.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(15,23,42,0.3);cursor:crosshair;z-index:999999;';
    let drawing = false, sx, sy, box;

    selectionOverlay.addEventListener('mousedown', (e) => {
      drawing = true; sx = e.clientX; sy = e.clientY;
      box = document.createElement('div');
      box.style.cssText = 'position:absolute;border:2px dashed #fff;background:rgba(255,255,255,0.1);pointer-events:none;';
      selectionOverlay.appendChild(box);
    });
    selectionOverlay.addEventListener('mousemove', (e) => {
      if (!drawing || !box) return;
      const l = Math.min(sx, e.clientX), t = Math.min(sy, e.clientY);
      box.style.left = l + 'px'; box.style.top = t + 'px';
      box.style.width = Math.abs(e.clientX - sx) + 'px'; box.style.height = Math.abs(e.clientY - sy) + 'px';
    });
    selectionOverlay.addEventListener('mouseup', () => {
      if (!box) return;
      const r = box.getBoundingClientRect();
      removeSelOverlay();
      if (r.width > 10 && r.height > 10) captureAndCrop(r);
      else show();
    });
    document.addEventListener('keydown', function esc(e) {
      if (e.key === 'Escape') { removeSelOverlay(); show(); document.removeEventListener('keydown', esc); }
    });
    document.body.appendChild(selectionOverlay);
  }

  function removeSelOverlay() { if (selectionOverlay) { selectionOverlay.remove(); selectionOverlay = null; } }

  function startElementCapture() {
    hide();
    let hl = null;
    const onOver = (e) => { if (hl) hl.remove(); const r = e.target.getBoundingClientRect(); hl = document.createElement('div'); hl.style.cssText = `position:fixed;top:${r.top}px;left:${r.left}px;width:${r.width}px;height:${r.height}px;border:2px solid #2563eb;background:rgba(37,99,235,0.1);pointer-events:none;z-index:999998;`; document.body.appendChild(hl); };
    const cleanup = () => { document.removeEventListener('mouseover', onOver, true); document.removeEventListener('click', onClick, true); document.removeEventListener('keydown', onKey, true); if (hl) hl.remove(); };
    const onClick = (e) => { e.preventDefault(); e.stopPropagation(); cleanup(); captureAndCrop(e.target.getBoundingClientRect()); };
    const onKey = (e) => { if (e.key === 'Escape') { cleanup(); show(); } };
    document.addEventListener('mouseover', onOver, true);
    document.addEventListener('click', onClick, true);
    document.addEventListener('keydown', onKey, true);
  }

  function captureAndCrop(rect) {
    chrome.runtime.sendMessage({ action: 'captureVisible' }, (res) => {
      if (!res?.dataUrl) { show(); return; }
      const dpr = window.devicePixelRatio || 1;
      const im = new Image();
      im.onload = () => {
        const c = document.createElement('canvas');
        c.width = rect.width * dpr; c.height = rect.height * dpr;
        c.getContext('2d').drawImage(im, rect.left * dpr, rect.top * dpr, rect.width * dpr, rect.height * dpr, 0, 0, c.width, c.height);
        openEditor(c.toDataURL('image/png'));
      };
      im.src = res.dataUrl;
    });
  }

  // ---- Editor ----

  function openEditor(dataUrl) {
    show();
    container.querySelector('#ssCapture').style.display = 'none';
    container.querySelector('#ssEditor').style.display = '';
    container.style.maxWidth = '90vw';
    container.style.width = 'auto';

    canvas = container.querySelector('#ssCanvas');
    ctx = canvas.getContext('2d');
    img = new Image();
    annotations = [];
    undoStack = [];
    tool = 'draw';

    container.querySelectorAll('.ss-tool-btn').forEach(b => b.classList.toggle('active', b.dataset.tool === 'draw'));

    img.onload = () => {
      const maxW = window.innerWidth * 0.85;
      const scale = img.width > maxW ? maxW / img.width : 1;
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      redraw();
      bindCanvasEvents();
    };
    img.src = dataUrl;
  }

  function closeEditor() {
    container.querySelector('#ssCapture').style.display = '';
    container.querySelector('#ssEditor').style.display = 'none';
    container.style.maxWidth = '';
    container.style.width = '';
    canvas = null; ctx = null; img = null;
    annotations = []; undoStack = [];
  }

  function resetEditor() {
    annotations = [];
    undoStack = [];
    redraw();
  }

  function redraw() {
    if (!ctx || !img) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    for (const a of annotations) {
      drawAnnotation(a);
    }
  }

  function drawAnnotation(a) {
    ctx.save();
    ctx.strokeStyle = a.color;
    ctx.fillStyle = a.color;
    ctx.lineWidth = a.lineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (a.type === 'draw' && a.points.length > 1) {
      ctx.beginPath();
      ctx.moveTo(a.points[0].x, a.points[0].y);
      for (let i = 1; i < a.points.length; i++) ctx.lineTo(a.points[i].x, a.points[i].y);
      ctx.stroke();

    } else if (a.type === 'arrow') {
      const dx = a.ex - a.sx, dy = a.ey - a.sy;
      const angle = Math.atan2(dy, dx);
      const headLen = 14;
      ctx.beginPath();
      ctx.moveTo(a.sx, a.sy); ctx.lineTo(a.ex, a.ey); ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(a.ex, a.ey);
      ctx.lineTo(a.ex - headLen * Math.cos(angle - 0.4), a.ey - headLen * Math.sin(angle - 0.4));
      ctx.lineTo(a.ex - headLen * Math.cos(angle + 0.4), a.ey - headLen * Math.sin(angle + 0.4));
      ctx.closePath(); ctx.fill();

    } else if (a.type === 'rect') {
      ctx.strokeRect(a.sx, a.sy, a.ex - a.sx, a.ey - a.sy);

    } else if (a.type === 'highlight') {
      ctx.globalAlpha = 0.35;
      ctx.fillRect(a.sx, a.sy, a.ex - a.sx, a.ey - a.sy);
      ctx.globalAlpha = 1;

    } else if (a.type === 'blur') {
      const x = Math.min(a.sx, a.ex), y = Math.min(a.sy, a.ey);
      const w = Math.abs(a.ex - a.sx), h = Math.abs(a.ey - a.sy);
      if (w > 2 && h > 2) {
        const imgData = ctx.getImageData(x, y, w, h);
        const blurred = boxBlur(imgData, 8);
        ctx.putImageData(blurred, x, y);
      }

    } else if (a.type === 'text') {
      ctx.font = `${a.lineWidth * 5 + 10}px sans-serif`;
      ctx.fillText(a.text, a.sx, a.sy);

    } else if (a.type === 'crop') {
      const cx = Math.min(a.sx, a.ex), cy = Math.min(a.sy, a.ey);
      const cw = Math.abs(a.ex - a.sx), ch = Math.abs(a.ey - a.sy);
      if (cw > 5 && ch > 5) {
        const cropped = ctx.getImageData(cx, cy, cw, ch);
        canvas.width = cw; canvas.height = ch;
        ctx.putImageData(cropped, 0, 0);
        img = new Image();
        img.src = canvas.toDataURL();
        annotations = [];
      }
    }

    ctx.restore();
  }

  function boxBlur(imageData, radius) {
    const { data, width, height } = imageData;
    const out = new Uint8ClampedArray(data);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let r = 0, g = 0, b = 0, count = 0;
        for (let dy = -radius; dy <= radius; dy++) {
          for (let dx = -radius; dx <= radius; dx++) {
            const nx = x + dx, ny = y + dy;
            if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
              const i = (ny * width + nx) * 4;
              r += data[i]; g += data[i + 1]; b += data[i + 2]; count++;
            }
          }
        }
        const i = (y * width + x) * 4;
        out[i] = r / count; out[i + 1] = g / count; out[i + 2] = b / count;
      }
    }
    return new ImageData(out, width, height);
  }

  function bindCanvasEvents() {
    canvas.onmousedown = (e) => {
      const r = canvas.getBoundingClientRect();
      const x = (e.clientX - r.left) * (canvas.width / r.width);
      const y = (e.clientY - r.top) * (canvas.height / r.height);

      if (tool === 'text') {
        const text = prompt('Enter text:');
        if (text) {
          annotations.push({ type: 'text', sx: x, sy: y, text, color, lineWidth });
          redraw();
        }
        return;
      }

      drawing = true;
      drawStart = { x, y };
      undoStack.push([...annotations]);

      if (tool === 'draw') {
        annotations.push({ type: 'draw', points: [{ x, y }], color, lineWidth });
      }
    };

    canvas.onmousemove = (e) => {
      if (!drawing) return;
      const r = canvas.getBoundingClientRect();
      const x = (e.clientX - r.left) * (canvas.width / r.width);
      const y = (e.clientY - r.top) * (canvas.height / r.height);

      if (tool === 'draw') {
        const last = annotations[annotations.length - 1];
        last.points.push({ x, y });
        redraw();
      } else {
        redraw();
        ctx.save();
        ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = lineWidth; ctx.setLineDash([4, 4]);
        if (tool === 'rect' || tool === 'crop') ctx.strokeRect(drawStart.x, drawStart.y, x - drawStart.x, y - drawStart.y);
        else if (tool === 'highlight') { ctx.globalAlpha = 0.35; ctx.fillRect(drawStart.x, drawStart.y, x - drawStart.x, y - drawStart.y); }
        else if (tool === 'blur') ctx.strokeRect(drawStart.x, drawStart.y, x - drawStart.x, y - drawStart.y);
        else if (tool === 'arrow') { ctx.setLineDash([]); ctx.beginPath(); ctx.moveTo(drawStart.x, drawStart.y); ctx.lineTo(x, y); ctx.stroke(); }
        ctx.restore();
      }
    };

    canvas.onmouseup = (e) => {
      if (!drawing) return;
      drawing = false;
      const r = canvas.getBoundingClientRect();
      const x = (e.clientX - r.left) * (canvas.width / r.width);
      const y = (e.clientY - r.top) * (canvas.height / r.height);

      if (tool !== 'draw') {
        annotations.push({ type: tool, sx: drawStart.x, sy: drawStart.y, ex: x, ey: y, color, lineWidth });
      }
      redraw();
    };
  }

  function undo() {
    if (undoStack.length) {
      annotations = undoStack.pop();
      redraw();
    }
  }

  // ---- Save / Copy ----

  function downloadImage() {
    if (!canvas) return;
    const fmt = container.querySelector('#ssFormat').value;
    const quality = parseFloat(container.querySelector('#ssQuality').value);
    const ts = new Date().toISOString().replace(/[:.]/g, '-');
    const a = document.createElement('a');
    a.download = `screenshot_${ts}.${fmt}`;
    a.href = canvas.toDataURL(`image/${fmt}`, quality);
    a.click();
  }

  function copyImage() {
    if (!canvas) return;
    canvas.toBlob((blob) => {
      if (blob) {
        navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]).then(() => {
          const btn = container.querySelector('#ssCopy');
          btn.textContent = '✅ Copied!';
          setTimeout(() => btn.textContent = '📋 Copy', 1500);
        }).catch(() => {});
      }
    });
  }

  // ---- Show / Hide ----

  function show() {
    createUI();
    container.classList.remove('hidden');
    isVisible = true;
  }

  function hide() {
    if (container) {
      container.classList.add('hidden');
      closeEditor();
    }
    isVisible = false;
  }

  function toggle() { isVisible ? hide() : show(); }

  return { init, show, hide, toggle };
})();

window.ScreenshotTools = ScreenshotTools;
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ScreenshotTools.init);
else ScreenshotTools.init();
