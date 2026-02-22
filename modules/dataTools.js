const DataTools = (() => {
  let container = null;
  let isVisible = false;

  function init() {
    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'D') { e.preventDefault(); toggle(); }
      if (e.key === 'Escape' && isVisible) hide();
    });
  }

  function createUI() {
    if (container) return;
    container = document.createElement('div');
    container.className = 'ganj-ext-data-tools hidden';
    container.innerHTML = `
      <div class="data-tools-panel">
        <div class="data-tools-header">
          <h3>📊 Data Tools</h3>
          <div class="header-controls">
            <span class="shortcut-hint">Ctrl+Shift+D</span>
            <button class="data-tools-close">✕</button>
          </div>
        </div>
        <div class="data-tools-tabs">
          <button class="data-tab-btn active" data-tab="json">JSON</button>
          <button class="data-tab-btn" data-tab="csv">CSV</button>
          <button class="data-tab-btn" data-tab="xml">XML</button>
          <button class="data-tab-btn" data-tab="transform">Transform</button>
          <button class="data-tab-btn" data-tab="generate">Generate</button>
        </div>
        <div class="data-tools-content">

          <!-- JSON -->
          <div class="data-tab-content active" data-tab="json">
            <div class="tool-section">
              <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px;">
                <button class="btn-primary" data-act="jsonFormat">Format</button>
                <button class="btn-outline" data-act="jsonMinify">Minify</button>
                <button class="btn-outline" data-act="jsonValidate">Validate</button>
                <button class="btn-outline" data-act="jsonSample">Sample</button>
                <button class="btn-outline" data-act="jsonCopy">Copy</button>
              </div>
              <textarea id="dtJsonInput" class="dt-input" placeholder='{"key": "value", "array": [1, 2, 3]}'></textarea>
              <div class="dt-info" id="dtJsonInfo">Lines: 0 · Chars: 0</div>
            </div>
            <div class="tool-section">
              <h4>🔍 Path Query</h4>
              <div style="display:flex;gap:6px;">
                <input type="text" id="dtJsonPath" placeholder="$.users[0].name" style="flex:1;">
                <button class="btn-primary btn-small" data-act="jsonQuery">Query</button>
              </div>
              <div id="dtJsonPathResult"></div>
            </div>
            <div class="tool-section">
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
                <h4 style="margin:0!important;">🌳 Tree View</h4>
                <button class="btn-small btn-outline" data-act="jsonTreeRefresh">Refresh</button>
              </div>
              <div id="dtJsonTree" class="nt-json-tree" style="min-height:60px;"></div>
            </div>
          </div>

          <!-- CSV -->
          <div class="data-tab-content" data-tab="csv">
            <div class="tool-section">
              <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px;align-items:center;">
                <button class="btn-primary" data-act="csvParse">Parse</button>
                <button class="btn-outline" data-act="csvSample">Sample</button>
                <button class="btn-outline" data-act="csvToJson">→ JSON</button>
                <button class="btn-outline" data-act="csvCopy">Copy</button>
                <label style="font-size:12px;margin-left:8px;">
                  Delim: <select id="dtCsvDelim" style="padding:2px 4px;"><option value=",">,</option><option value=";">;</option><option value="\t">Tab</option><option value="|">|</option></select>
                </label>
                <label style="font-size:12px;"><input type="checkbox" id="dtCsvHeaders" checked> Headers</label>
              </div>
              <textarea id="dtCsvInput" class="dt-input" placeholder="name,age,city&#10;John,25,New York&#10;Jane,30,LA"></textarea>
            </div>
            <div class="tool-section">
              <h4>📈 Table View</h4>
              <div id="dtCsvTable"></div>
            </div>
            <div class="tool-section">
              <h4>→ JSON Output</h4>
              <div id="dtCsvJsonOut" class="nt-json-tree" style="min-height:40px;"></div>
            </div>
          </div>

          <!-- XML -->
          <div class="data-tab-content" data-tab="xml">
            <div class="tool-section">
              <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px;">
                <button class="btn-primary" data-act="xmlFormat">Format</button>
                <button class="btn-outline" data-act="xmlMinify">Minify</button>
                <button class="btn-outline" data-act="xmlValidate">Validate</button>
                <button class="btn-outline" data-act="xmlSample">Sample</button>
                <button class="btn-outline" data-act="xmlToJson">→ JSON</button>
                <button class="btn-outline" data-act="xmlCopy">Copy</button>
              </div>
              <textarea id="dtXmlInput" class="dt-input" placeholder="<root><item>value</item></root>"></textarea>
            </div>
            <div class="tool-section">
              <h4>🌳 Tree / Output</h4>
              <div id="dtXmlOut" class="nt-json-tree" style="min-height:60px;"></div>
            </div>
          </div>

          <!-- Transform -->
          <div class="data-tab-content" data-tab="transform">
            <div class="tool-section">
              <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:8px;align-items:center;">
                <select id="dtInFmt"><option value="json">JSON</option><option value="csv">CSV</option><option value="xml">XML</option></select>
                <span>→</span>
                <select id="dtOutFmt"><option value="json">JSON</option><option value="csv">CSV</option><option value="xml">XML</option><option value="yaml">YAML</option></select>
                <button class="btn-primary" data-act="transform">Transform</button>
                <button class="btn-outline" data-act="transformCopy">Copy Output</button>
              </div>
              <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:8px;">
                <label style="font-size:12px;"><input type="checkbox" id="dtSortKeys"> Sort keys</label>
                <label style="font-size:12px;"><input type="checkbox" id="dtRemoveEmpty"> Remove empty</label>
                <label style="font-size:12px;"><input type="checkbox" id="dtFlatten"> Flatten</label>
              </div>
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
                <div>
                  <div style="font-size:12px;font-weight:600;margin-bottom:4px;color:var(--ganj-text-secondary,#475569);">Input</div>
                  <textarea id="dtTransformIn" class="dt-input" style="height:250px;"></textarea>
                </div>
                <div>
                  <div style="font-size:12px;font-weight:600;margin-bottom:4px;color:var(--ganj-text-secondary,#475569);">Output</div>
                  <textarea id="dtTransformOut" class="dt-input" readonly style="height:250px;"></textarea>
                </div>
              </div>
            </div>
          </div>

          <!-- Generate -->
          <div class="data-tab-content" data-tab="generate">
            <div class="tool-section">
              <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px;align-items:center;">
                <select id="dtGenType">
                  <option value="users">Users</option><option value="products">Products</option>
                  <option value="orders">Orders</option><option value="logs">Logs</option>
                </select>
                <label style="font-size:12px;">Count: <input type="number" id="dtGenCount" value="10" min="1" max="500" style="width:60px;"></label>
                <button class="btn-primary" data-act="genMock">Generate</button>
                <span style="color:var(--ganj-text-muted,#64748b);font-size:12px;">|</span>
                <button class="btn-outline btn-small" data-act="genUuid">UUIDs</button>
                <button class="btn-outline btn-small" data-act="genNumbers">Numbers</button>
                <button class="btn-outline btn-small" data-act="genLorem">Lorem</button>
                <button class="btn-outline btn-small" data-act="genDates">Dates</button>
                <span style="color:var(--ganj-text-muted,#64748b);font-size:12px;">|</span>
                <button class="btn-outline btn-small" data-act="genCopy">Copy</button>
                <button class="btn-outline btn-small" data-act="genDownload">Download</button>
              </div>
              <div id="dtGenTree" class="nt-json-tree" style="min-height:100px;max-height:500px;"></div>
              <textarea id="dtGenRaw" class="dt-input" readonly style="display:none;"></textarea>
            </div>
            <div class="tool-section">
              <h4>🗂️ Schema Generator</h4>
              <div style="display:flex;gap:6px;margin-bottom:8px;align-items:flex-end;">
                <div style="flex:1;">
                  <div style="font-size:12px;margin-bottom:4px;color:var(--ganj-text-secondary,#475569);">Schema (type: string|number|boolean|email|uuid|date)</div>
                  <input type="text" id="dtSchemaInput" placeholder='{"name":"string","age":"number","active":"boolean"}' style="width:100%;">
                </div>
                <label style="font-size:12px;">×<input type="number" id="dtSchemaCount" value="5" min="1" max="100" style="width:50px;"></label>
                <button class="btn-primary btn-small" data-act="genSchema">Go</button>
              </div>
            </div>
          </div>

        </div>
      </div>
    `;
    document.body.appendChild(container);
    bindEvents();
  }

  // ---- Event binding ----

  function bindEvents() {
    container.querySelector('.data-tools-close').addEventListener('click', hide);

    container.querySelectorAll('.data-tab-btn').forEach(b => {
      b.addEventListener('click', () => {
        container.querySelectorAll('.data-tab-btn').forEach(x => x.classList.toggle('active', x === b));
        container.querySelectorAll('.data-tab-content').forEach(c => c.classList.toggle('active', c.dataset.tab === b.dataset.tab));
      });
    });

    const actions = {
      jsonFormat: () => jsonOp(v => JSON.stringify(JSON.parse(v), null, 2)),
      jsonMinify: () => jsonOp(v => JSON.stringify(JSON.parse(v))),
      jsonValidate: () => { try { JSON.parse(el('#dtJsonInput').value); toast('Valid JSON ✅'); } catch (e) { toast('Invalid: ' + e.message, true); }},
      jsonSample: () => { el('#dtJsonInput').value = JSON.stringify(SAMPLE_JSON, null, 2); updateJsonInfo(); updateJsonTree(); },
      jsonCopy: () => copyText(el('#dtJsonInput').value),
      jsonQuery: queryJsonPath,
      jsonTreeRefresh: updateJsonTree,
      csvParse: parseCSV,
      csvSample: () => { el('#dtCsvInput').value = SAMPLE_CSV; parseCSV(); },
      csvToJson: csvToJSON,
      csvCopy: () => copyText(el('#dtCsvInput').value),
      xmlFormat: () => xmlOp(v => formatXMLString(v)),
      xmlMinify: () => xmlOp(v => v.replace(/>\s+</g, '><').trim()),
      xmlValidate: () => { try { validateXML(el('#dtXmlInput').value); toast('Valid XML ✅'); } catch (e) { toast(e.message, true); }},
      xmlSample: () => { el('#dtXmlInput').value = SAMPLE_XML; },
      xmlToJson: xmlToJSON,
      xmlCopy: () => copyText(el('#dtXmlInput').value),
      transform: transformData,
      transformCopy: () => copyText(el('#dtTransformOut').value),
      genMock: generateMock,
      genUuid: () => genSimple(Array.from({ length: 10 }, () => crypto.randomUUID())),
      genNumbers: () => { const n = []; for (let i = 0; i < 20; i++) n.push(Math.floor(Math.random() * 1000)); genSimple(n); },
      genLorem: () => genSimple(generateLorem(3)),
      genDates: () => { const d = []; for (let i = 0; i < 10; i++) d.push(new Date(Date.now() - Math.random() * 365 * 86400000).toISOString().split('T')[0]); genSimple(d); },
      genCopy: () => copyText(el('#dtGenRaw').value),
      genDownload: () => { const v = el('#dtGenRaw').value; if (v) downloadText(v, `data-${Date.now()}.json`, 'application/json'); },
      genSchema: generateFromSchema,
    };

    container.querySelectorAll('[data-act]').forEach(b => {
      b.addEventListener('click', () => {
        const fn = actions[b.dataset.act];
        if (fn) fn();
      });
    });

    el('#dtJsonInput').addEventListener('input', debounce(() => { updateJsonInfo(); updateJsonTree(); }, 400));
    el('#dtCsvInput').addEventListener('input', debounce(parseCSV, 500));
  }

  function el(sel) { return container.querySelector(sel); }

  // ---- JSON ----

  function jsonOp(fn) {
    const ta = el('#dtJsonInput');
    try { ta.value = fn(ta.value.trim()); updateJsonInfo(); updateJsonTree(); toast('Done ✅'); }
    catch (e) { toast('Invalid JSON: ' + e.message, true); }
  }

  function updateJsonInfo() {
    const v = el('#dtJsonInput').value;
    el('#dtJsonInfo').textContent = `Lines: ${v.split('\n').length} · Chars: ${v.length} · ${new Blob([v]).size} bytes`;
  }

  function updateJsonTree() {
    const v = el('#dtJsonInput').value.trim();
    const tree = el('#dtJsonTree');
    if (!v) { tree.innerHTML = '<div class="no-data">Enter JSON above</div>'; return; }
    try {
      const data = JSON.parse(v);
      tree.innerHTML = buildJsonTree(data);
      bindTreeToggles(tree);
    } catch { tree.innerHTML = '<div class="no-data" style="color:#f87171;">Invalid JSON</div>'; }
  }

  function queryJsonPath() {
    const v = el('#dtJsonInput').value.trim();
    const path = el('#dtJsonPath').value.trim();
    if (!v || !path) return;
    try {
      const data = JSON.parse(v);
      const parts = path.replace(/^\$\.?/, '').split(/\.|\[|\]/).filter(p => p);
      let cur = data;
      for (const p of parts) { cur = cur[p.match(/^\d+$/) ? parseInt(p) : p]; if (cur === undefined) break; }
      const out = el('#dtJsonPathResult');
      out.className = 'nt-json-tree';
      out.style.marginTop = '8px';
      out.innerHTML = buildJsonTree(cur);
      bindTreeToggles(out);
    } catch (e) { el('#dtJsonPathResult').innerHTML = `<div class="tool-result error">${escapeHtml(e.message)}</div>`; }
  }

  // ---- CSV ----

  function parseCSV() {
    const v = el('#dtCsvInput').value.trim();
    if (!v) return;
    const delim = el('#dtCsvDelim').value;
    const hasH = el('#dtCsvHeaders').checked;
    const lines = v.split('\n');
    let headers = [];
    const data = [];
    if (hasH && lines.length) { headers = lines.shift().split(delim).map(h => h.trim().replace(/^"|"$/g, '')); }
    for (const line of lines) {
      const vals = line.split(delim).map(c => c.trim().replace(/^"|"$/g, ''));
      data.push(hasH ? Object.fromEntries(headers.map((h, i) => [h, vals[i] || ''])) : vals);
    }

    // Table
    const tbl = el('#dtCsvTable');
    if (!data.length) { tbl.innerHTML = '<div class="no-data">No data</div>'; return; }
    const cols = hasH ? headers : (data[0] || []).map((_, i) => `Col ${i + 1}`);
    tbl.innerHTML = `<div style="overflow-x:auto;"><table class="csv-table"><thead><tr>${cols.map(c => `<th>${escapeHtml(c)}</th>`).join('')}</tr></thead><tbody>${
      data.slice(0, 100).map(row => `<tr>${(Array.isArray(row) ? row : Object.values(row)).map(c => `<td>${escapeHtml(String(c))}</td>`).join('')}</tr>`).join('')
    }</tbody></table>${data.length > 100 ? `<div class="no-data">${data.length - 100} more rows...</div>` : ''}</div>`;
  }

  function csvToJSON() {
    const v = el('#dtCsvInput').value.trim();
    if (!v) return;
    const delim = el('#dtCsvDelim').value;
    const hasH = el('#dtCsvHeaders').checked;
    const lines = v.split('\n');
    let headers = [];
    const data = [];
    if (hasH && lines.length) headers = lines.shift().split(delim).map(h => h.trim().replace(/^"|"$/g, ''));
    for (const line of lines) {
      const vals = line.split(delim).map(c => c.trim().replace(/^"|"$/g, ''));
      data.push(hasH ? Object.fromEntries(headers.map((h, i) => [h, vals[i] || ''])) : vals);
    }
    const out = el('#dtCsvJsonOut');
    out.innerHTML = buildJsonTree(data);
    bindTreeToggles(out);
  }

  // ---- XML ----

  function xmlOp(fn) {
    const ta = el('#dtXmlInput');
    try { validateXML(ta.value.trim()); ta.value = fn(ta.value.trim()); toast('Done ✅'); }
    catch (e) { toast(e.message, true); }
  }

  function validateXML(str) {
    const doc = new DOMParser().parseFromString(str, 'text/xml');
    if (doc.querySelector('parsererror')) throw new Error('Invalid XML');
    return doc;
  }

  function xmlToJSON() {
    const v = el('#dtXmlInput').value.trim();
    if (!v) return;
    try {
      const doc = validateXML(v);
      const json = xmlNodeToJson(doc.documentElement);
      const result = { [doc.documentElement.tagName]: json };
      const out = el('#dtXmlOut');
      out.innerHTML = buildJsonTree(result);
      bindTreeToggles(out);
    } catch (e) { toast(e.message, true); }
  }

  function xmlNodeToJson(node) {
    if (node.nodeType === Node.TEXT_NODE) return node.textContent.trim();
    if (node.nodeType !== Node.ELEMENT_NODE) return null;
    const result = {};
    if (node.attributes.length) {
      result['@attr'] = {};
      for (const a of node.attributes) result['@attr'][a.name] = a.value;
    }
    const kids = [...node.childNodes];
    const textKids = kids.filter(n => n.nodeType === Node.TEXT_NODE).map(n => n.textContent.trim()).filter(Boolean).join(' ');
    const elKids = kids.filter(n => n.nodeType === Node.ELEMENT_NODE);
    if (!elKids.length) { if (textKids) result['#text'] = textKids; }
    else {
      for (const c of elKids) {
        const cj = xmlNodeToJson(c);
        if (result[c.tagName]) { if (!Array.isArray(result[c.tagName])) result[c.tagName] = [result[c.tagName]]; result[c.tagName].push(cj); }
        else result[c.tagName] = cj;
      }
      if (textKids) result['#text'] = textKids;
    }
    return result;
  }

  function formatXMLString(xml) {
    xml = xml.replace(/(>)(<)(\/*)/g, '$1\n$2$3');
    let pad = 0;
    return xml.split('\n').map(line => {
      let indent = 0;
      if (line.match(/.+<\/\w[^>]*>$/)) indent = 0;
      else if (line.match(/^<\/\w/) && pad > 0) pad--;
      else if (line.match(/^<\w[^>]*[^\/]>.*$/)) indent = 1;
      const out = '  '.repeat(pad) + line;
      pad += indent;
      return out;
    }).join('\n');
  }

  // ---- Transform ----

  function transformData() {
    const inVal = el('#dtTransformIn').value.trim();
    if (!inVal) return;
    const inFmt = el('#dtInFmt').value;
    const outFmt = el('#dtOutFmt').value;
    try {
      let data;
      if (inFmt === 'json') data = JSON.parse(inVal);
      else if (inFmt === 'csv') { const lines = inVal.split('\n'); const h = lines.shift().split(',').map(s => s.trim()); data = lines.map(l => Object.fromEntries(h.map((k, i) => [k, l.split(',')[i]?.trim() || '']))); }
      else if (inFmt === 'xml') { const doc = validateXML(inVal); data = { [doc.documentElement.tagName]: xmlNodeToJson(doc.documentElement) }; }

      if (el('#dtRemoveEmpty').checked) data = removeEmpty(data);
      if (el('#dtSortKeys').checked) data = sortKeys(data);
      if (el('#dtFlatten').checked) data = flatten(data);

      let out;
      if (outFmt === 'json') out = JSON.stringify(data, null, 2);
      else if (outFmt === 'csv') out = toCSV(Array.isArray(data) ? data : [data]);
      else if (outFmt === 'yaml') out = toYAML(data);
      else if (outFmt === 'xml') out = toXML(data);
      else out = JSON.stringify(data, null, 2);

      el('#dtTransformOut').value = out;
      toast('Transformed ✅');
    } catch (e) { toast('Error: ' + e.message, true); }
  }

  // ---- Generate ----

  function generateMock() {
    const count = Math.min(parseInt(el('#dtGenCount').value) || 10, 500);
    const type = el('#dtGenType').value;
    const generators = { users: genUser, products: genProduct, orders: genOrder, logs: genLog };
    const gen = generators[type] || genUser;
    const data = Array.from({ length: count }, (_, i) => gen(i + 1));
    showGenerated(data);
  }

  function generateFromSchema() {
    try {
      const schema = JSON.parse(el('#dtSchemaInput').value);
      const count = Math.min(parseInt(el('#dtSchemaCount').value) || 5, 100);
      const data = Array.from({ length: count }, () => {
        const row = {};
        for (const [k, t] of Object.entries(schema)) {
          const type = String(t).toLowerCase();
          if (type === 'string') row[k] = ['alpha', 'beta', 'gamma', 'delta', 'epsilon'][Math.floor(Math.random() * 5)];
          else if (type === 'number') row[k] = Math.floor(Math.random() * 1000);
          else if (type === 'boolean') row[k] = Math.random() > 0.5;
          else if (type === 'email') row[k] = `user${Math.floor(Math.random() * 999)}@example.com`;
          else if (type === 'uuid') row[k] = crypto.randomUUID();
          else if (type === 'date') row[k] = new Date(Date.now() - Math.random() * 365 * 86400000).toISOString().split('T')[0];
          else row[k] = null;
        }
        return row;
      });
      showGenerated(data);
    } catch (e) { toast('Invalid schema: ' + e.message, true); }
  }

  function genSimple(data) { showGenerated(data); }

  function showGenerated(data) {
    el('#dtGenRaw').value = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
    const tree = el('#dtGenTree');
    if (typeof data === 'string') { tree.innerHTML = `<pre style="margin:0;white-space:pre-wrap;">${escapeHtml(data)}</pre>`; return; }
    tree.innerHTML = buildJsonTree(data);
    bindTreeToggles(tree);
  }

  // ---- Data generators ----

  const NAMES = ['Liam', 'Emma', 'Noah', 'Olivia', 'James', 'Ava', 'William', 'Sophia', 'Oliver', 'Isabella'];
  const LASTS = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez'];
  const CITIES = ['New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix', 'San Antonio', 'Dallas', 'Austin', 'Seattle', 'Denver'];

  function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
  function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

  function genUser(id) {
    const fn = pick(NAMES), ln = pick(LASTS);
    return { id, name: `${fn} ${ln}`, email: `${fn.toLowerCase()}.${ln.toLowerCase()}@example.com`, age: randInt(18, 65), city: pick(CITIES), active: Math.random() > 0.3 };
  }
  function genProduct(id) {
    const items = ['Laptop', 'Phone', 'Tablet', 'Headphones', 'Keyboard', 'Mouse', 'Monitor', 'Camera'];
    const brands = ['Apple', 'Samsung', 'Sony', 'Dell', 'LG', 'Logitech', 'Bose', 'Anker'];
    return { id, name: pick(items), brand: pick(brands), price: randInt(25, 2000), rating: +(Math.random() * 4 + 1).toFixed(1), inStock: Math.random() > 0.2 };
  }
  function genOrder(id) {
    return { id, customerId: randInt(1, 200), items: randInt(1, 5), total: randInt(15, 1500), status: pick(['pending', 'shipped', 'delivered', 'cancelled']), date: new Date(Date.now() - Math.random() * 90 * 86400000).toISOString().split('T')[0] };
  }
  function genLog(id) {
    return { id, ts: new Date(Date.now() - Math.random() * 86400000).toISOString(), level: pick(['DEBUG', 'INFO', 'WARN', 'ERROR']), msg: pick(['Auth OK', 'DB connected', 'Cache miss', 'Rate limited', 'Timeout', 'File uploaded', 'Job started']), service: `svc-${randInt(1, 8)}` };
  }

  function generateLorem(n) {
    const words = 'lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua'.split(' ');
    let out = '';
    for (let i = 0; i < n; i++) { const len = randInt(20, 40); out += Array.from({ length: len }, () => pick(words)).join(' ') + '.\n\n'; }
    return out.trim();
  }

  // ---- Shared JSON tree (from network tools pattern) ----

  function buildJsonTree(data, depth = 0) {
    if (data === null) return '<span class="nt-v-null">null</span>';
    if (data === undefined) return '<span class="nt-v-null">undefined</span>';
    const t = typeof data;
    if (t === 'string') return `<span class="nt-v-str">"${escapeHtml(data.length > 200 ? data.slice(0, 200) + '…' : data)}"</span>`;
    if (t === 'number') return `<span class="nt-v-num">${data}</span>`;
    if (t === 'boolean') return `<span class="nt-v-bool">${data}</span>`;

    if (Array.isArray(data)) {
      if (!data.length) return '<span class="nt-v-bracket">[]</span>';
      const col = depth > 1;
      return `<span class="nt-toggle">${col ? '▸' : '▾'}</span><span class="nt-v-bracket">[</span><span class="nt-count">${data.length}</span><div class="nt-children" style="${col ? 'display:none;' : ''}">${
        data.map((v, i) => `<div class="nt-prop"><span class="nt-key">${i}</span>: ${buildJsonTree(v, depth + 1)}${i < data.length - 1 ? ',' : ''}</div>`).join('')
      }</div><span class="nt-v-bracket">]</span>`;
    }

    if (t === 'object') {
      const keys = Object.keys(data);
      if (!keys.length) return '<span class="nt-v-bracket">{}</span>';
      const col = depth > 1;
      return `<span class="nt-toggle">${col ? '▸' : '▾'}</span><span class="nt-v-bracket">{</span><span class="nt-count">${keys.length}</span><div class="nt-children" style="${col ? 'display:none;' : ''}">${
        keys.map((k, i) => `<div class="nt-prop"><span class="nt-key">"${escapeHtml(k)}"</span>: ${buildJsonTree(data[k], depth + 1)}${i < keys.length - 1 ? ',' : ''}</div>`).join('')
      }</div><span class="nt-v-bracket">}</span>`;
    }
    return escapeHtml(String(data));
  }

  function bindTreeToggles(root) {
    root.querySelectorAll('.nt-toggle').forEach(el => {
      el.onclick = (e) => {
        e.stopPropagation();
        const kids = el.parentElement.querySelector('.nt-children');
        if (kids) { const open = kids.style.display === 'none'; kids.style.display = open ? '' : 'none'; el.textContent = open ? '▾' : '▸'; }
      };
    });
  }

  // ---- Transform utilities ----

  function removeEmpty(o) {
    if (Array.isArray(o)) return o.map(removeEmpty).filter(v => v != null && v !== '' && !(Array.isArray(v) && !v.length));
    if (typeof o === 'object' && o !== null) { const r = {}; for (const [k, v] of Object.entries(o)) { const c = removeEmpty(v); if (c != null && c !== '') r[k] = c; } return r; }
    return o;
  }
  function sortKeys(o) {
    if (Array.isArray(o)) return o.map(sortKeys);
    if (typeof o === 'object' && o !== null) { const r = {}; Object.keys(o).sort().forEach(k => r[k] = sortKeys(o[k])); return r; }
    return o;
  }
  function flatten(o, prefix = '') {
    const r = {};
    for (const [k, v] of Object.entries(o)) {
      const nk = prefix ? `${prefix}.${k}` : k;
      if (typeof v === 'object' && v !== null && !Array.isArray(v)) Object.assign(r, flatten(v, nk));
      else r[nk] = v;
    }
    return r;
  }
  function toCSV(arr) {
    if (!arr.length) return '';
    const h = Object.keys(arr[0]);
    return [h.join(','), ...arr.map(r => h.map(k => { const v = String(r[k] ?? ''); return v.includes(',') ? `"${v}"` : v; }).join(','))].join('\n');
  }
  function toYAML(o, d = 0) {
    const sp = '  '.repeat(d);
    if (Array.isArray(o)) return o.map(v => `${sp}- ${typeof v === 'object' ? '\n' + toYAML(v, d + 1) : v}`).join('\n');
    if (typeof o === 'object' && o !== null) return Object.entries(o).map(([k, v]) => typeof v === 'object' && v !== null ? `${sp}${k}:\n${toYAML(v, d + 1)}` : `${sp}${k}: ${v}`).join('\n');
    return String(o);
  }
  function toXML(o, tag = 'root') {
    if (typeof o !== 'object' || o === null) return `<${tag}>${escapeHtml(String(o))}</${tag}>`;
    if (Array.isArray(o)) return o.map(v => toXML(v, 'item')).join('\n');
    let xml = `<${tag}>`;
    for (const [k, v] of Object.entries(o)) xml += toXML(v, k);
    return xml + `</${tag}>`;
  }

  // ---- Shared helpers ----

  function copyText(t) { if (t) navigator.clipboard.writeText(t).then(() => toast('Copied ✅')).catch(() => toast('Copy failed', true)); }
  function toast(msg, isErr = false) {
    const n = document.createElement('div');
    n.textContent = msg;
    n.style.cssText = `position:fixed!important;top:20px!important;right:20px!important;background:${isErr ? '#dc2626' : '#059669'}!important;color:white!important;padding:10px 18px!important;border-radius:8px!important;z-index:1000000!important;font-size:13px!important;font-family:var(--ganj-font-sans)!important;box-shadow:0 4px 12px rgba(0,0,0,0.15)!important;`;
    document.body.appendChild(n);
    setTimeout(() => n.remove(), 2500);
  }

  function show() { createUI(); container.classList.remove('hidden'); isVisible = true; }
  function hide() { if (container) container.classList.add('hidden'); isVisible = false; }
  function toggle() { isVisible ? hide() : show(); }

  // ---- Sample data ----
  const SAMPLE_JSON = { users: [{ id: 1, name: 'Liam Smith', email: 'liam@example.com', profile: { age: 28, city: 'NYC', tags: ['dev', 'gamer'] } }, { id: 2, name: 'Emma Jones', email: 'emma@example.com', profile: { age: 32, city: 'LA', tags: ['design', 'travel'] } }], meta: { total: 2, ts: new Date().toISOString() } };
  const SAMPLE_CSV = 'name,age,city,role,salary\nLiam Smith,28,New York,Engineer,95000\nEmma Jones,32,Los Angeles,Designer,85000\nNoah Brown,25,Chicago,Analyst,70000\nOlivia Garcia,30,Houston,Manager,90000';
  const SAMPLE_XML = `<?xml version="1.0"?>\n<catalog>\n  <product id="1">\n    <name>Laptop</name>\n    <price currency="USD">999.99</price>\n    <specs>\n      <cpu>Intel i7</cpu>\n      <ram>16GB</ram>\n    </specs>\n  </product>\n  <product id="2">\n    <name>Phone</name>\n    <price currency="USD">699.99</price>\n    <specs>\n      <cpu>A15</cpu>\n      <ram>6GB</ram>\n    </specs>\n  </product>\n</catalog>`;

  return { init, show, hide, toggle };
})();

window.DataTools = DataTools;
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', DataTools.init);
else DataTools.init();
