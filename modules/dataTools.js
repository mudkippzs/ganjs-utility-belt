// Data Tools - Data processing and transformation utilities
const DataTools = (() => {
  let container = null;
  let isVisible = false;

  function init() {
    createInterface();
    setupKeyboardShortcut();
  }

  function setupKeyboardShortcut() {
    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'D') {
        e.preventDefault();
        toggle();
      }
    });
  }

  function createInterface() {
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
          <button class="data-tab-btn active" data-tab="json">📄 JSON</button>
          <button class="data-tab-btn" data-tab="csv">📊 CSV</button>
          <button class="data-tab-btn" data-tab="xml">🏷️ XML</button>
          <button class="data-tab-btn" data-tab="transform">🔄 Transform</button>
          <button class="data-tab-btn" data-tab="generate">🎲 Generate</button>
        </div>
        
        <div class="data-tools-content">
          <!-- JSON Tab -->
          <div class="data-tab-content active" data-tab="json">
            <div class="tool-section">
              <h4>📝 JSON Editor & Validator</h4>
              <div class="json-controls">
                <button onclick="window.DataTools.formatJSON()" class="btn-primary">Format</button>
                <button onclick="window.DataTools.minifyJSON()" class="btn-outline">Minify</button>
                <button onclick="window.DataTools.validateJSON()" class="btn-outline">Validate</button>
                <button onclick="window.DataTools.loadSampleJSON()" class="btn-outline">Sample</button>
              </div>
              <textarea id="jsonInput" placeholder='{"key": "value", "array": [1, 2, 3]}'></textarea>
              <div class="json-info" id="jsonInfo">
                <span>Lines: 0</span>
                <span>Characters: 0</span>
                <span>Size: 0 bytes</span>
              </div>
            </div>
            
            <div class="tool-section">
              <h4>🔍 JSON Path Query</h4>
              <input type="text" id="jsonPath" placeholder="$.users[0].name">
              <button onclick="window.DataTools.queryJSONPath()" class="btn-primary">Query</button>
              <div id="jsonPathResult"></div>
            </div>
            
            <div class="tool-section">
              <h4>🌳 JSON Tree View</h4>
              <div id="jsonTree"></div>
            </div>
          </div>
          
          <!-- CSV Tab -->
          <div class="data-tab-content" data-tab="csv">
            <div class="tool-section">
              <h4>📊 CSV Processor</h4>
              <div class="csv-controls">
                <button onclick="window.DataTools.parseCSV()" class="btn-primary">Parse</button>
                <button onclick="window.DataTools.generateCSV()" class="btn-outline">Generate</button>
                <button onclick="window.DataTools.loadSampleCSV()" class="btn-outline">Sample</button>
                <label>
                  Delimiter: 
                  <select id="csvDelimiter">
                    <option value=",">,</option>
                    <option value=";">;</option>
                    <option value="\t">Tab</option>
                    <option value="|">|</option>
                  </select>
                </label>
                <label>
                  <input type="checkbox" id="csvHeaders" checked> Has Headers
                </label>
              </div>
              <textarea id="csvInput" placeholder="name,age,city
John,25,New York
Jane,30,Los Angeles"></textarea>
            </div>
            
            <div class="tool-section">
              <h4>📈 CSV Analysis</h4>
              <div id="csvStats"></div>
            </div>
            
            <div class="tool-section">
              <h4>🗂️ CSV Table View</h4>
              <div id="csvTable"></div>
            </div>
            
            <div class="tool-section">
              <h4>🔄 CSV to JSON Conversion</h4>
              <button onclick="window.DataTools.csvToJSON()" class="btn-primary">Convert to JSON</button>
              <textarea id="csvJsonOutput" readonly></textarea>
            </div>
          </div>
          
          <!-- XML Tab -->
          <div class="data-tab-content" data-tab="xml">
            <div class="tool-section">
              <h4>🏷️ XML Editor & Validator</h4>
              <div class="xml-controls">
                <button onclick="window.DataTools.formatXML()" class="btn-primary">Format</button>
                <button onclick="window.DataTools.minifyXML()" class="btn-outline">Minify</button>
                <button onclick="window.DataTools.validateXML()" class="btn-outline">Validate</button>
                <button onclick="window.DataTools.loadSampleXML()" class="btn-outline">Sample</button>
              </div>
              <textarea id="xmlInput" placeholder="<root><item>value</item></root>"></textarea>
            </div>
            
            <div class="tool-section">
              <h4>🔍 XPath Query</h4>
              <input type="text" id="xpathQuery" placeholder="//item[@id='1']">
              <button onclick="window.DataTools.queryXPath()" class="btn-primary">Query</button>
              <div id="xpathResult"></div>
            </div>
            
            <div class="tool-section">
              <h4>🌳 XML Tree View</h4>
              <div id="xmlTree"></div>
            </div>
            
            <div class="tool-section">
              <h4>🔄 XML Conversions</h4>
              <button onclick="window.DataTools.xmlToJSON()" class="btn-primary">XML to JSON</button>
              <button onclick="window.DataTools.jsonToXML()" class="btn-outline">JSON to XML</button>
              <textarea id="xmlConversionOutput" readonly></textarea>
            </div>
          </div>
          
          <!-- Transform Tab -->
          <div class="data-tab-content" data-tab="transform">
            <div class="tool-section">
              <h4>🔄 Data Transformation</h4>
              <div class="transform-grid">
                <div class="transform-input">
                  <h5>Input Data</h5>
                  <select id="inputFormat">
                    <option value="json">JSON</option>
                    <option value="csv">CSV</option>
                    <option value="xml">XML</option>
                    <option value="yaml">YAML</option>
                    <option value="text">Text</option>
                  </select>
                  <textarea id="transformInput"></textarea>
                </div>
                
                <div class="transform-options">
                  <h5>Transform Options</h5>
                  <div class="transform-controls">
                    <label>
                      <input type="checkbox" id="sortKeys"> Sort Keys
                    </label>
                    <label>
                      <input type="checkbox" id="removeEmpty"> Remove Empty
                    </label>
                    <label>
                      <input type="checkbox" id="flattenObjects"> Flatten Objects
                    </label>
                    <label>
                      <input type="checkbox" id="normalizeData"> Normalize Data
                    </label>
                  </div>
                  
                  <div class="filter-section">
                    <h6>Filters</h6>
                    <input type="text" id="includeFields" placeholder="Include fields (comma-separated)">
                    <input type="text" id="excludeFields" placeholder="Exclude fields (comma-separated)">
                  </div>
                  
                  <button onclick="window.DataTools.transformData()" class="btn-primary">Transform</button>
                </div>
                
                <div class="transform-output">
                  <h5>Output Data</h5>
                  <select id="outputFormat">
                    <option value="json">JSON</option>
                    <option value="csv">CSV</option>
                    <option value="xml">XML</option>
                    <option value="yaml">YAML</option>
                    <option value="table">Table</option>
                  </select>
                  <textarea id="transformOutput" readonly></textarea>
                </div>
              </div>
            </div>
            
            <div class="tool-section">
              <h4>🧮 Data Operations</h4>
              <div class="operations-grid">
                <button onclick="window.DataTools.mergeSets()" class="btn-outline">Merge Datasets</button>
                <button onclick="window.DataTools.deduplicateData()" class="btn-outline">Remove Duplicates</button>
                <button onclick="window.DataTools.sortData()" class="btn-outline">Sort Data</button>
                <button onclick="window.DataTools.groupData()" class="btn-outline">Group By</button>
                <button onclick="window.DataTools.aggregateData()" class="btn-outline">Aggregate</button>
                <button onclick="window.DataTools.pivotData()" class="btn-outline">Pivot Table</button>
              </div>
            </div>
          </div>
          
          <!-- Generate Tab -->
          <div class="data-tab-content" data-tab="generate">
            <div class="tool-section">
              <h4>🎲 Data Generator</h4>
              <div class="generator-grid">
                <div class="generator-card">
                  <h5>📊 Mock Data</h5>
                  <label>Records: <input type="number" id="mockRecords" value="10" min="1" max="1000"></label>
                  <label>
                    Type:
                    <select id="mockType">
                      <option value="users">Users</option>
                      <option value="products">Products</option>
                      <option value="orders">Orders</option>
                      <option value="logs">Logs</option>
                      <option value="custom">Custom</option>
                    </select>
                  </label>
                  <button onclick="window.DataTools.generateMockData()" class="btn-primary">Generate</button>
                </div>
                
                <div class="generator-card">
                  <h5>🔢 Numbers</h5>
                  <label>Count: <input type="number" id="numberCount" value="10" min="1" max="1000"></label>
                  <label>Min: <input type="number" id="numberMin" value="1"></label>
                  <label>Max: <input type="number" id="numberMax" value="100"></label>
                  <label><input type="checkbox" id="numberDecimals"> Decimals</label>
                  <button onclick="window.DataTools.generateNumbers()" class="btn-primary">Generate</button>
                </div>
                
                <div class="generator-card">
                  <h5>📝 Text</h5>
                  <label>Paragraphs: <input type="number" id="textParagraphs" value="3" min="1" max="20"></label>
                  <label>
                    Type:
                    <select id="textType">
                      <option value="lorem">Lorem Ipsum</option>
                      <option value="english">English</option>
                      <option value="tech">Tech</option>
                      <option value="names">Names</option>
                    </select>
                  </label>
                  <button onclick="window.DataTools.generateText()" class="btn-primary">Generate</button>
                </div>
                
                <div class="generator-card">
                  <h5>📅 Dates</h5>
                  <label>Count: <input type="number" id="dateCount" value="10" min="1" max="100"></label>
                  <label>Start: <input type="date" id="dateStart"></label>
                  <label>End: <input type="date" id="dateEnd"></label>
                  <label>
                    Format:
                    <select id="dateFormat">
                      <option value="iso">ISO (2023-12-25)</option>
                      <option value="us">US (12/25/2023)</option>
                      <option value="eu">EU (25/12/2023)</option>
                      <option value="timestamp">Timestamp</option>
                    </select>
                  </label>
                  <button onclick="window.DataTools.generateDates()" class="btn-primary">Generate</button>
                </div>
                
                <div class="generator-card">
                  <h5>🎯 UUIDs</h5>
                  <label>Count: <input type="number" id="uuidCount" value="5" min="1" max="100"></label>
                  <label>
                    Version:
                    <select id="uuidVersion">
                      <option value="v4">v4 (Random)</option>
                      <option value="v1">v1 (Timestamp)</option>
                      <option value="short">Short</option>
                    </select>
                  </label>
                  <button onclick="window.DataTools.generateUUIDs()" class="btn-primary">Generate</button>
                </div>
                
                <div class="generator-card">
                  <h5>🗂️ Schema</h5>
                  <textarea id="customSchema" placeholder='{"name": "string", "age": "number", "active": "boolean"}'></textarea>
                  <label>Records: <input type="number" id="schemaRecords" value="5" min="1" max="100"></label>
                  <button onclick="window.DataTools.generateFromSchema()" class="btn-primary">Generate</button>
                </div>
              </div>
              
              <div class="generator-output">
                <h4>Generated Data</h4>
                <div class="output-controls">
                  <button onclick="window.DataTools.copyGeneratedData()" class="btn-outline">Copy</button>
                  <button onclick="window.DataTools.downloadGeneratedData()" class="btn-outline">Download</button>
                  <button onclick="window.DataTools.clearGeneratedData()" class="btn-outline">Clear</button>
                </div>
                <textarea id="generatedOutput" readonly></textarea>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(container);
    attachEventListeners();
    setupInputListeners();
  }

  function attachEventListeners() {
    // Close button
    container.querySelector('.data-tools-close').addEventListener('click', hide);
    
    // Tab switching
    container.querySelectorAll('.data-tab-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const tabName = e.target.dataset.tab;
        switchTab(tabName);
      });
    });
  }

  function setupInputListeners() {
    // JSON input listener for real-time info
    const jsonInput = container.querySelector('#jsonInput');
    jsonInput.addEventListener('input', updateJSONInfo);
    
    // CSV input listener
    const csvInput = container.querySelector('#csvInput');
    csvInput.addEventListener('input', debounce(() => {
      if (csvInput.value.trim()) {
        parseCSV();
      }
    }, 500));
    
    // XML input listener  
    const xmlInput = container.querySelector('#xmlInput');
    xmlInput.addEventListener('input', debounce(() => {
      if (xmlInput.value.trim()) {
        updateXMLTree();
      }
    }, 500));
  }

  function switchTab(tabName) {
    // Update tab buttons
    container.querySelectorAll('.data-tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tabName);
    });
    
    // Update tab content
    container.querySelectorAll('.data-tab-content').forEach(content => {
      content.classList.toggle('active', content.dataset.tab === tabName);
    });
  }

  // JSON Functions
  function formatJSON() {
    const input = container.querySelector('#jsonInput').value.trim();
    if (!input) return;
    
    try {
      const parsed = JSON.parse(input);
      const formatted = JSON.stringify(parsed, null, 2);
      container.querySelector('#jsonInput').value = formatted;
      updateJSONInfo();
      updateJSONTree();
      showSuccess('JSON formatted successfully');
    } catch (error) {
      showError('Invalid JSON: ' + error.message);
    }
  }

  function minifyJSON() {
    const input = container.querySelector('#jsonInput').value.trim();
    if (!input) return;
    
    try {
      const parsed = JSON.parse(input);
      const minified = JSON.stringify(parsed);
      container.querySelector('#jsonInput').value = minified;
      updateJSONInfo();
      showSuccess('JSON minified successfully');
    } catch (error) {
      showError('Invalid JSON: ' + error.message);
    }
  }

  function validateJSON() {
    const input = container.querySelector('#jsonInput').value.trim();
    if (!input) {
      showError('Please enter JSON to validate');
      return;
    }
    
    try {
      JSON.parse(input);
      showSuccess('JSON is valid ✅');
    } catch (error) {
      showError('Invalid JSON: ' + error.message);
    }
  }

  function loadSampleJSON() {
    const sample = {
      users: [
        {
          id: 1,
          name: "John Doe",
          email: "john@example.com",
          profile: {
            age: 30,
            city: "New York",
            preferences: ["coding", "reading", "gaming"]
          }
        },
        {
          id: 2,
          name: "Jane Smith",
          email: "jane@example.com",
          profile: {
            age: 25,
            city: "Los Angeles",
            preferences: ["design", "travel", "photography"]
          }
        }
      ],
      meta: {
        total: 2,
        timestamp: new Date().toISOString()
      }
    };
    
    container.querySelector('#jsonInput').value = JSON.stringify(sample, null, 2);
    updateJSONInfo();
    updateJSONTree();
  }

  function updateJSONInfo() {
    const input = container.querySelector('#jsonInput').value;
    const lines = input.split('\n').length;
    const chars = input.length;
    const bytes = new Blob([input]).size;
    
    container.querySelector('#jsonInfo').innerHTML = `
      <span>Lines: ${lines}</span>
      <span>Characters: ${chars}</span>
      <span>Size: ${bytes} bytes</span>
    `;
  }

  function queryJSONPath() {
    const input = container.querySelector('#jsonInput').value.trim();
    const path = container.querySelector('#jsonPath').value.trim();
    
    if (!input || !path) return;
    
    try {
      const data = JSON.parse(input);
      const result = evaluateJSONPath(data, path);
      container.querySelector('#jsonPathResult').innerHTML = `
        <div class="query-result">
          <strong>Query Result:</strong>
          <pre>${JSON.stringify(result, null, 2)}</pre>
        </div>
      `;
    } catch (error) {
      container.querySelector('#jsonPathResult').innerHTML = `
        <div class="query-result error">Error: ${error.message}</div>
      `;
    }
  }

  function updateJSONTree() {
    const input = container.querySelector('#jsonInput').value.trim();
    if (!input) {
      container.querySelector('#jsonTree').innerHTML = '';
      return;
    }
    
    try {
      const data = JSON.parse(input);
      container.querySelector('#jsonTree').innerHTML = generateTreeHTML(data);
    } catch (error) {
      container.querySelector('#jsonTree').innerHTML = `<div class="error">Invalid JSON</div>`;
    }
  }

  // CSV Functions
  function parseCSV() {
    const input = container.querySelector('#csvInput').value.trim();
    if (!input) return;
    
    const delimiter = container.querySelector('#csvDelimiter').value;
    const hasHeaders = container.querySelector('#csvHeaders').checked;
    
    try {
      const parsed = parseCSVData(input, delimiter, hasHeaders);
      updateCSVStats(parsed);
      updateCSVTable(parsed);
      showSuccess('CSV parsed successfully');
    } catch (error) {
      showError('CSV parsing error: ' + error.message);
    }
  }

  function generateCSV() {
    const sample = `name,age,city,department,salary
John Doe,30,New York,Engineering,75000
Jane Smith,25,Los Angeles,Design,65000
Bob Johnson,35,Chicago,Marketing,60000
Alice Brown,28,Boston,Engineering,80000
Charlie Wilson,32,Seattle,Sales,55000`;
    
    container.querySelector('#csvInput').value = sample;
    parseCSV();
  }

  function loadSampleCSV() {
    generateCSV();
  }

  function csvToJSON() {
    const input = container.querySelector('#csvInput').value.trim();
    if (!input) return;
    
    const delimiter = container.querySelector('#csvDelimiter').value;
    const hasHeaders = container.querySelector('#csvHeaders').checked;
    
    try {
      const parsed = parseCSVData(input, delimiter, hasHeaders);
      const json = JSON.stringify(parsed.data, null, 2);
      container.querySelector('#csvJsonOutput').value = json;
      showSuccess('CSV converted to JSON');
    } catch (error) {
      showError('Conversion error: ' + error.message);
    }
  }

  // XML Functions
  function formatXML() {
    const input = container.querySelector('#xmlInput').value.trim();
    if (!input) return;
    
    try {
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(input, 'text/xml');
      
      if (xmlDoc.getElementsByTagName('parsererror').length > 0) {
        throw new Error('Invalid XML');
      }
      
      const formatted = formatXMLString(input);
      container.querySelector('#xmlInput').value = formatted;
      updateXMLTree();
      showSuccess('XML formatted successfully');
    } catch (error) {
      showError('XML formatting error: ' + error.message);
    }
  }

  function minifyXML() {
    const input = container.querySelector('#xmlInput').value.trim();
    if (!input) return;
    
    try {
      const minified = input.replace(/>\s+</g, '><').trim();
      container.querySelector('#xmlInput').value = minified;
      showSuccess('XML minified successfully');
    } catch (error) {
      showError('XML minification error: ' + error.message);
    }
  }

  function validateXML() {
    const input = container.querySelector('#xmlInput').value.trim();
    if (!input) return;
    
    try {
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(input, 'text/xml');
      
      if (xmlDoc.getElementsByTagName('parsererror').length > 0) {
        throw new Error('Invalid XML structure');
      }
      
      showSuccess('XML is valid ✅');
    } catch (error) {
      showError('Invalid XML: ' + error.message);
    }
  }

  function loadSampleXML() {
    const sample = `<?xml version="1.0" encoding="UTF-8"?>
<catalog>
  <product id="1">
    <name>Laptop</name>
    <price currency="USD">999.99</price>
    <specs>
      <processor>Intel i7</processor>
      <memory>16GB</memory>
      <storage>512GB SSD</storage>
    </specs>
    <tags>
      <tag>electronics</tag>
      <tag>computers</tag>
    </tags>
  </product>
  <product id="2">
    <name>Smartphone</name>
    <price currency="USD">699.99</price>
    <specs>
      <processor>A15 Bionic</processor>
      <memory>6GB</memory>
      <storage>128GB</storage>
    </specs>
    <tags>
      <tag>electronics</tag>
      <tag>mobile</tag>
    </tags>
  </product>
</catalog>`;
    
    container.querySelector('#xmlInput').value = sample;
    updateXMLTree();
  }

  function updateXMLTree() {
    const input = container.querySelector('#xmlInput').value.trim();
    if (!input) {
      container.querySelector('#xmlTree').innerHTML = '';
      return;
    }
    
    try {
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(input, 'text/xml');
      
      if (xmlDoc.getElementsByTagName('parsererror').length > 0) {
        throw new Error('Invalid XML');
      }
      
      container.querySelector('#xmlTree').innerHTML = generateXMLTreeHTML(xmlDoc);
    } catch (error) {
      container.querySelector('#xmlTree').innerHTML = `<div class="error">Invalid XML</div>`;
    }
  }

  function xmlToJSON() {
    const input = container.querySelector('#xmlInput').value.trim();
    if (!input) return;
    
    try {
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(input, 'text/xml');
      const json = xmlToJSONConverter(xmlDoc);
      container.querySelector('#xmlConversionOutput').value = JSON.stringify(json, null, 2);
      showSuccess('XML converted to JSON');
    } catch (error) {
      showError('Conversion error: ' + error.message);
    }
  }

  function jsonToXML() {
    const input = container.querySelector('#jsonInput').value.trim();
    if (!input) return;
    
    try {
      const data = JSON.parse(input);
      const xml = jsonToXMLConverter(data);
      container.querySelector('#xmlConversionOutput').value = xml;
      showSuccess('JSON converted to XML');
    } catch (error) {
      showError('Conversion error: ' + error.message);
    }
  }

  // Transform Functions
  function transformData() {
    const input = container.querySelector('#transformInput').value.trim();
    const inputFormat = container.querySelector('#inputFormat').value;
    const outputFormat = container.querySelector('#outputFormat').value;
    
    if (!input) return;
    
    try {
      let data = parseInputData(input, inputFormat);
      data = applyTransformations(data);
      const output = formatOutputData(data, outputFormat);
      container.querySelector('#transformOutput').value = output;
      showSuccess('Data transformed successfully');
    } catch (error) {
      showError('Transformation error: ' + error.message);
    }
  }

  // Generate Functions
  function generateMockData() {
    const count = parseInt(container.querySelector('#mockRecords').value) || 10;
    const type = container.querySelector('#mockType').value;
    
    let data = [];
    
    for (let i = 0; i < count; i++) {
      switch (type) {
        case 'users':
          data.push(generateUser(i + 1));
          break;
        case 'products':
          data.push(generateProduct(i + 1));
          break;
        case 'orders':
          data.push(generateOrder(i + 1));
          break;
        case 'logs':
          data.push(generateLogEntry(i + 1));
          break;
        default:
          data.push(generateUser(i + 1));
      }
    }
    
    container.querySelector('#generatedOutput').value = JSON.stringify(data, null, 2);
    showSuccess(`Generated ${count} ${type} records`);
  }

  function generateNumbers() {
    const count = parseInt(container.querySelector('#numberCount').value) || 10;
    const min = parseFloat(container.querySelector('#numberMin').value) || 1;
    const max = parseFloat(container.querySelector('#numberMax').value) || 100;
    const decimals = container.querySelector('#numberDecimals').checked;
    
    const numbers = [];
    for (let i = 0; i < count; i++) {
      let num = Math.random() * (max - min) + min;
      if (!decimals) num = Math.floor(num);
      numbers.push(num);
    }
    
    container.querySelector('#generatedOutput').value = JSON.stringify(numbers, null, 2);
    showSuccess(`Generated ${count} numbers`);
  }

  function generateText() {
    const paragraphs = parseInt(container.querySelector('#textParagraphs').value) || 3;
    const type = container.querySelector('#textType').value;
    
    let text = '';
    
    for (let i = 0; i < paragraphs; i++) {
      switch (type) {
        case 'lorem':
          text += generateLoremParagraph() + '\n\n';
          break;
        case 'english':
          text += generateEnglishParagraph() + '\n\n';
          break;
        case 'tech':
          text += generateTechParagraph() + '\n\n';
          break;
        case 'names':
          text += generateNames(10).join(', ') + '\n\n';
          break;
      }
    }
    
    container.querySelector('#generatedOutput').value = text.trim();
    showSuccess(`Generated ${paragraphs} paragraphs of ${type} text`);
  }

  function generateDates() {
    const count = parseInt(container.querySelector('#dateCount').value) || 10;
    const start = container.querySelector('#dateStart').value;
    const end = container.querySelector('#dateEnd').value;
    const format = container.querySelector('#dateFormat').value;
    
    const startDate = start ? new Date(start) : new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
    const endDate = end ? new Date(end) : new Date();
    
    const dates = [];
    for (let i = 0; i < count; i++) {
      const randomTime = startDate.getTime() + Math.random() * (endDate.getTime() - startDate.getTime());
      const date = new Date(randomTime);
      
      switch (format) {
        case 'iso':
          dates.push(date.toISOString().split('T')[0]);
          break;
        case 'us':
          dates.push(date.toLocaleDateString('en-US'));
          break;
        case 'eu':
          dates.push(date.toLocaleDateString('en-GB'));
          break;
        case 'timestamp':
          dates.push(date.getTime());
          break;
        default:
          dates.push(date.toISOString());
      }
    }
    
    container.querySelector('#generatedOutput').value = JSON.stringify(dates, null, 2);
    showSuccess(`Generated ${count} dates`);
  }

  function generateUUIDs() {
    const count = parseInt(container.querySelector('#uuidCount').value) || 5;
    const version = container.querySelector('#uuidVersion').value;
    
    const uuids = [];
    for (let i = 0; i < count; i++) {
      switch (version) {
        case 'v4':
          uuids.push(generateUUIDv4());
          break;
        case 'v1':
          uuids.push(generateUUIDv1());
          break;
        case 'short':
          uuids.push(generateShortUUID());
          break;
        default:
          uuids.push(generateUUIDv4());
      }
    }
    
    container.querySelector('#generatedOutput').value = JSON.stringify(uuids, null, 2);
    showSuccess(`Generated ${count} UUIDs`);
  }

  function generateFromSchema() {
    const schema = container.querySelector('#customSchema').value.trim();
    const count = parseInt(container.querySelector('#schemaRecords').value) || 5;
    
    if (!schema) {
      showError('Please enter a schema');
      return;
    }
    
    try {
      const schemaObj = JSON.parse(schema);
      const data = [];
      
      for (let i = 0; i < count; i++) {
        data.push(generateFromSchemaObject(schemaObj));
      }
      
      container.querySelector('#generatedOutput').value = JSON.stringify(data, null, 2);
      showSuccess(`Generated ${count} records from schema`);
    } catch (error) {
      showError('Invalid schema: ' + error.message);
    }
  }

  function copyGeneratedData() {
    const output = container.querySelector('#generatedOutput').value;
    if (!output) return;
    
    navigator.clipboard.writeText(output).then(() => {
      showSuccess('Data copied to clipboard');
    }).catch(() => {
      showError('Failed to copy data');
    });
  }

  function downloadGeneratedData() {
    const output = container.querySelector('#generatedOutput').value;
    if (!output) return;
    
    const blob = new Blob([output], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `generated-data-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    showSuccess('Data downloaded');
  }

  function clearGeneratedData() {
    container.querySelector('#generatedOutput').value = '';
  }

  // Helper Functions
  function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  function evaluateJSONPath(data, path) {
    // Simple JSONPath implementation
    if (path === '$') return data;
    
    const parts = path.replace(/^\$\.?/, '').split(/\.|\[|\]/).filter(p => p);
    let current = data;
    
    for (const part of parts) {
      if (part.match(/^\d+$/)) {
        current = current[parseInt(part)];
      } else {
        current = current[part];
      }
      
      if (current === undefined) break;
    }
    
    return current;
  }

  function generateTreeHTML(obj, depth = 0) {
    if (obj === null) return '<span class="json-null">null</span>';
    if (typeof obj === 'boolean') return `<span class="json-boolean">${obj}</span>`;
    if (typeof obj === 'number') return `<span class="json-number">${obj}</span>`;
    if (typeof obj === 'string') return `<span class="json-string">"${escapeHtml(obj)}"</span>`;
    
    if (Array.isArray(obj)) {
      if (obj.length === 0) return '<span class="json-array">[]</span>';
      
      let html = '<div class="json-array">[<div class="json-indent">';
      obj.forEach((item, index) => {
        html += `<div class="json-item">${generateTreeHTML(item, depth + 1)}${index < obj.length - 1 ? ',' : ''}</div>`;
      });
      html += '</div>]</div>';
      return html;
    }
    
    if (typeof obj === 'object') {
      const keys = Object.keys(obj);
      if (keys.length === 0) return '<span class="json-object">{}</span>';
      
      let html = '<div class="json-object">{<div class="json-indent">';
      keys.forEach((key, index) => {
        html += `<div class="json-property"><span class="json-key">"${escapeHtml(key)}"</span>: ${generateTreeHTML(obj[key], depth + 1)}${index < keys.length - 1 ? ',' : ''}</div>`;
      });
      html += '</div>}</div>';
      return html;
    }
    
    return '<span class="json-unknown">unknown</span>';
  }

  function parseCSVData(input, delimiter, hasHeaders) {
    const lines = input.trim().split('\n');
    const data = [];
    let headers = [];
    
    if (hasHeaders && lines.length > 0) {
      headers = lines[0].split(delimiter).map(h => h.trim().replace(/^"|"$/g, ''));
      lines.shift();
    }
    
    for (const line of lines) {
      const values = line.split(delimiter).map(v => v.trim().replace(/^"|"$/g, ''));
      
      if (hasHeaders) {
        const row = {};
        headers.forEach((header, index) => {
          row[header] = values[index] || '';
        });
        data.push(row);
      } else {
        data.push(values);
      }
    }
    
    return { data, headers, rowCount: data.length };
  }

  function updateCSVStats(parsed) {
    const stats = {
      rows: parsed.rowCount,
      columns: parsed.headers.length || (parsed.data[0] ? parsed.data[0].length : 0),
      headers: parsed.headers.join(', ') || 'No headers'
    };
    
    container.querySelector('#csvStats').innerHTML = `
      <div class="stats-grid">
        <div class="stat-item"><strong>Rows:</strong> ${stats.rows}</div>
        <div class="stat-item"><strong>Columns:</strong> ${stats.columns}</div>
        <div class="stat-item"><strong>Headers:</strong> ${stats.headers}</div>
      </div>
    `;
  }

  function updateCSVTable(parsed) {
    if (parsed.data.length === 0) {
      container.querySelector('#csvTable').innerHTML = '<div class="no-data">No data</div>';
      return;
    }
    
    let html = '<table class="csv-table">';
    
    // Headers
    if (parsed.headers.length > 0) {
      html += '<thead><tr>';
      parsed.headers.forEach(header => {
        html += `<th>${escapeHtml(header)}</th>`;
      });
      html += '</tr></thead>';
    }
    
    // Data rows (limit to first 100 for performance)
    html += '<tbody>';
    const displayData = parsed.data.slice(0, 100);
    displayData.forEach(row => {
      html += '<tr>';
      if (Array.isArray(row)) {
        row.forEach(cell => {
          html += `<td>${escapeHtml(cell || '')}</td>`;
        });
      } else {
        Object.values(row).forEach(cell => {
          html += `<td>${escapeHtml(cell || '')}</td>`;
        });
      }
      html += '</tr>';
    });
    html += '</tbody></table>';
    
    if (parsed.data.length > 100) {
      html += `<div class="table-note">Showing first 100 of ${parsed.data.length} rows</div>`;
    }
    
    container.querySelector('#csvTable').innerHTML = html;
  }

  function formatXMLString(xml) {
    const PADDING = ' '.repeat(2);
    const reg = /(>)(<)(\/*)/g;
    xml = xml.replace(reg, '$1\r\n$2$3');
    
    let formatted = '';
    let pad = 0;
    
    xml.split('\r\n').forEach(line => {
      let indent = 0;
      if (line.match(/.+<\/\w[^>]*>$/)) {
        indent = 0;
      } else if (line.match(/^<\/\w/) && pad > 0) {
        pad -= 1;
      } else if (line.match(/^<\w[^>]*[^\/]>.*$/)) {
        indent = 1;
      } else {
        indent = 0;
      }
      
      formatted += PADDING.repeat(pad) + line + '\r\n';
      pad += indent;
    });
    
    return formatted;
  }

  function generateXMLTreeHTML(xmlDoc) {
    return generateXMLNodeHTML(xmlDoc.documentElement);
  }

  function generateXMLNodeHTML(node, depth = 0) {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent.trim();
      return text ? `<span class="xml-text">${escapeHtml(text)}</span>` : '';
    }
    
    if (node.nodeType === Node.ELEMENT_NODE) {
      let html = `<div class="xml-element" style="margin-left: ${depth * 20}px">`;
      html += `<span class="xml-tag">&lt;${node.tagName}`;
      
      // Attributes
      if (node.attributes.length > 0) {
        for (const attr of node.attributes) {
          html += ` <span class="xml-attr">${attr.name}="<span class="xml-attr-value">${escapeHtml(attr.value)}</span>"</span>`;
        }
      }
      
      if (node.childNodes.length === 0) {
        html += '/&gt;</span></div>';
      } else {
        html += '&gt;</span>';
        
        // Children
        for (const child of node.childNodes) {
          const childHTML = generateXMLNodeHTML(child, depth + 1);
          if (childHTML) html += childHTML;
        }
        
        html += `<span class="xml-tag" style="margin-left: ${depth * 20}px">&lt;/${node.tagName}&gt;</span></div>`;
      }
      
      return html;
    }
    
    return '';
  }

  function xmlToJSONConverter(xmlDoc) {
    function xmlNodeToJSON(node) {
      if (node.nodeType === Node.TEXT_NODE) {
        return node.textContent.trim();
      }
      
      if (node.nodeType === Node.ELEMENT_NODE) {
        const result = {};
        
        // Add attributes
        if (node.attributes.length > 0) {
          result['@attributes'] = {};
          for (const attr of node.attributes) {
            result['@attributes'][attr.name] = attr.value;
          }
        }
        
        // Add children
        const children = Array.from(node.childNodes);
        const textContent = children.filter(n => n.nodeType === Node.TEXT_NODE)
                                  .map(n => n.textContent.trim())
                                  .filter(t => t)
                                  .join(' ');
        
        const elementChildren = children.filter(n => n.nodeType === Node.ELEMENT_NODE);
        
        if (elementChildren.length === 0) {
          if (textContent) {
            result['#text'] = textContent;
          }
        } else {
          elementChildren.forEach(child => {
            const childName = child.tagName;
            const childJSON = xmlNodeToJSON(child);
            
            if (result[childName]) {
              if (!Array.isArray(result[childName])) {
                result[childName] = [result[childName]];
              }
              result[childName].push(childJSON);
            } else {
              result[childName] = childJSON;
            }
          });
          
          if (textContent) {
            result['#text'] = textContent;
          }
        }
        
        return result;
      }
      
      return null;
    }
    
    return { [xmlDoc.documentElement.tagName]: xmlNodeToJSON(xmlDoc.documentElement) };
  }

  function jsonToXMLConverter(data, rootName = 'root') {
    function jsonToXMLRecursive(obj, tagName) {
      if (obj === null || obj === undefined) {
        return `<${tagName}></${tagName}>`;
      }
      
      if (typeof obj === 'string' || typeof obj === 'number' || typeof obj === 'boolean') {
        return `<${tagName}>${escapeXML(obj.toString())}</${tagName}>`;
      }
      
      if (Array.isArray(obj)) {
        return obj.map(item => jsonToXMLRecursive(item, tagName)).join('');
      }
      
      if (typeof obj === 'object') {
        let xml = `<${tagName}>`;
        
        Object.entries(obj).forEach(([key, value]) => {
          if (key === '@attributes') {
            // Handle attributes (would need to be processed at parent level)
            return;
          }
          
          if (key === '#text') {
            xml += escapeXML(value.toString());
          } else {
            xml += jsonToXMLRecursive(value, key);
          }
        });
        
        xml += `</${tagName}>`;
        return xml;
      }
      
      return '';
    }
    
    return `<?xml version="1.0" encoding="UTF-8"?>\n${jsonToXMLRecursive(data, rootName)}`;
  }

  function escapeXML(text) {
    return text.replace(/&/g, '&amp;')
               .replace(/</g, '&lt;')
               .replace(/>/g, '&gt;')
               .replace(/"/g, '&quot;')
               .replace(/'/g, '&#39;');
  }

  function parseInputData(input, format) {
    switch (format) {
      case 'json':
        return JSON.parse(input);
      case 'csv':
        return parseCSVData(input, ',', true).data;
      case 'xml':
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(input, 'text/xml');
        return xmlToJSONConverter(xmlDoc);
      case 'yaml':
        // Basic YAML parsing (limited)
        return parseBasicYAML(input);
      case 'text':
        return { text: input };
      default:
        return {};
    }
  }

  function applyTransformations(data) {
    const sortKeys = container.querySelector('#sortKeys').checked;
    const removeEmpty = container.querySelector('#removeEmpty').checked;
    const flattenObjects = container.querySelector('#flattenObjects').checked;
    const normalizeData = container.querySelector('#normalizeData').checked;
    
    let result = data;
    
    if (removeEmpty) {
      result = removeEmptyValues(result);
    }
    
    if (sortKeys) {
      result = sortObjectKeys(result);
    }
    
    if (flattenObjects) {
      result = flattenObject(result);
    }
    
    if (normalizeData) {
      result = normalizeDataValues(result);
    }
    
    return result;
  }

  function formatOutputData(data, format) {
    switch (format) {
      case 'json':
        return JSON.stringify(data, null, 2);
      case 'csv':
        return arrayToCSV(Array.isArray(data) ? data : [data]);
      case 'xml':
        return jsonToXMLConverter(data);
      case 'yaml':
        return jsonToBasicYAML(data);
      case 'table':
        return generateTableHTML(data);
      default:
        return JSON.stringify(data, null, 2);
    }
  }

  // Generator helper functions
  function generateUser(id) {
    const firstNames = ['John', 'Jane', 'Bob', 'Alice', 'Charlie', 'Diana', 'Frank', 'Grace'];
    const lastNames = ['Doe', 'Smith', 'Johnson', 'Brown', 'Wilson', 'Miller', 'Davis', 'Garcia'];
    const cities = ['New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix', 'Philadelphia'];
    
    const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
    const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
    
    return {
      id: id,
      name: `${firstName} ${lastName}`,
      email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@example.com`,
      age: Math.floor(Math.random() * 50) + 18,
      city: cities[Math.floor(Math.random() * cities.length)],
      active: Math.random() > 0.3,
      joinDate: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString()
    };
  }

  function generateProduct(id) {
    const products = ['Laptop', 'Smartphone', 'Tablet', 'Headphones', 'Keyboard', 'Mouse'];
    const brands = ['Apple', 'Samsung', 'Microsoft', 'Sony', 'Logitech', 'Dell'];
    const categories = ['Electronics', 'Computers', 'Accessories', 'Mobile', 'Gaming'];
    
    return {
      id: id,
      name: products[Math.floor(Math.random() * products.length)],
      brand: brands[Math.floor(Math.random() * brands.length)],
      category: categories[Math.floor(Math.random() * categories.length)],
      price: Math.floor(Math.random() * 1000) + 50,
      inStock: Math.random() > 0.2,
      rating: Math.round((Math.random() * 4 + 1) * 10) / 10
    };
  }

  function generateOrder(id) {
    return {
      id: id,
      customerId: Math.floor(Math.random() * 100) + 1,
      products: Array.from({ length: Math.floor(Math.random() * 5) + 1 }, () => ({
        productId: Math.floor(Math.random() * 50) + 1,
        quantity: Math.floor(Math.random() * 3) + 1,
        price: Math.floor(Math.random() * 500) + 25
      })),
      total: Math.floor(Math.random() * 1000) + 50,
      status: ['pending', 'processing', 'shipped', 'delivered'][Math.floor(Math.random() * 4)],
      orderDate: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString()
    };
  }

  function generateLogEntry(id) {
    const levels = ['DEBUG', 'INFO', 'WARN', 'ERROR'];
    const messages = [
      'User authentication successful',
      'Database connection established',
      'File not found',
      'Invalid input parameter',
      'Request processing completed',
      'Cache invalidated',
      'Backup created successfully'
    ];
    
    return {
      id: id,
      timestamp: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000).toISOString(),
      level: levels[Math.floor(Math.random() * levels.length)],
      message: messages[Math.floor(Math.random() * messages.length)],
      source: `service-${Math.floor(Math.random() * 5) + 1}`,
      userId: Math.random() > 0.3 ? Math.floor(Math.random() * 100) + 1 : null
    };
  }

  function generateLoremParagraph() {
    const words = ['lorem', 'ipsum', 'dolor', 'sit', 'amet', 'consectetur', 'adipiscing', 'elit', 'sed', 'do', 'eiusmod', 'tempor', 'incididunt', 'ut', 'labore', 'et', 'dolore', 'magna', 'aliqua'];
    const length = Math.floor(Math.random() * 30) + 20;
    let paragraph = '';
    
    for (let i = 0; i < length; i++) {
      paragraph += words[Math.floor(Math.random() * words.length)] + ' ';
    }
    
    return paragraph.trim() + '.';
  }

  function generateEnglishParagraph() {
    const sentences = [
      'The quick brown fox jumps over the lazy dog.',
      'Technology continues to evolve at an unprecedented pace.',
      'Innovation drives progress in every industry.',
      'Data analysis reveals important insights for decision making.',
      'Collaboration between teams leads to better outcomes.',
      'Quality assurance ensures product reliability.',
      'User experience design focuses on customer satisfaction.'
    ];
    
    const count = Math.floor(Math.random() * 4) + 3;
    let paragraph = '';
    
    for (let i = 0; i < count; i++) {
      paragraph += sentences[Math.floor(Math.random() * sentences.length)] + ' ';
    }
    
    return paragraph.trim();
  }

  function generateTechParagraph() {
    const terms = ['API', 'database', 'algorithm', 'framework', 'microservice', 'cloud', 'container', 'deployment', 'monitoring', 'scalability'];
    const verbs = ['implements', 'processes', 'optimizes', 'manages', 'integrates', 'executes', 'validates', 'transforms'];
    const adjectives = ['efficient', 'robust', 'scalable', 'secure', 'reliable', 'flexible', 'performant', 'maintainable'];
    
    const sentences = 3 + Math.floor(Math.random() * 3);
    let paragraph = '';
    
    for (let i = 0; i < sentences; i++) {
      const subject = terms[Math.floor(Math.random() * terms.length)];
      const verb = verbs[Math.floor(Math.random() * verbs.length)];
      const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
      const object = terms[Math.floor(Math.random() * terms.length)];
      
      paragraph += `The ${adjective} ${subject} ${verb} ${object} effectively. `;
    }
    
    return paragraph.trim();
  }

  function generateNames(count) {
    const firstNames = ['Alex', 'Jordan', 'Casey', 'Taylor', 'Morgan', 'Cameron', 'Riley', 'Avery', 'Quinn', 'Sage'];
    const lastNames = ['Anderson', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez'];
    
    const names = [];
    for (let i = 0; i < count; i++) {
      const first = firstNames[Math.floor(Math.random() * firstNames.length)];
      const last = lastNames[Math.floor(Math.random() * lastNames.length)];
      names.push(`${first} ${last}`);
    }
    
    return names;
  }

  function generateUUIDv4() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  function generateUUIDv1() {
    // Simplified v1 UUID (timestamp-based)
    const timestamp = Date.now();
    return `${timestamp.toString(16)}-xxxx-1xxx-yxxx-xxxxxxxxxxxx`.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  function generateShortUUID() {
    return Math.random().toString(36).substr(2, 9);
  }

  function generateFromSchemaObject(schema) {
    const result = {};
    
    Object.entries(schema).forEach(([key, type]) => {
      switch (type.toLowerCase()) {
        case 'string':
          result[key] = generateRandomString();
          break;
        case 'number':
          result[key] = Math.floor(Math.random() * 1000);
          break;
        case 'boolean':
          result[key] = Math.random() > 0.5;
          break;
        case 'date':
          result[key] = new Date().toISOString();
          break;
        case 'email':
          result[key] = `user${Math.floor(Math.random() * 1000)}@example.com`;
          break;
        case 'uuid':
          result[key] = generateUUIDv4();
          break;
        default:
          result[key] = null;
      }
    });
    
    return result;
  }

  function generateRandomString() {
    const words = ['alpha', 'beta', 'gamma', 'delta', 'epsilon', 'zeta', 'eta', 'theta'];
    return words[Math.floor(Math.random() * words.length)];
  }

  // Utility functions
  function removeEmptyValues(obj) {
    if (Array.isArray(obj)) {
      return obj.map(removeEmptyValues).filter(item => 
        item !== null && item !== undefined && item !== '' && 
        !(Array.isArray(item) && item.length === 0) &&
        !(typeof item === 'object' && Object.keys(item).length === 0)
      );
    }
    
    if (typeof obj === 'object' && obj !== null) {
      const result = {};
      Object.entries(obj).forEach(([key, value]) => {
        const cleanValue = removeEmptyValues(value);
        if (cleanValue !== null && cleanValue !== undefined && cleanValue !== '' && 
            !(Array.isArray(cleanValue) && cleanValue.length === 0) &&
            !(typeof cleanValue === 'object' && Object.keys(cleanValue).length === 0)) {
          result[key] = cleanValue;
        }
      });
      return result;
    }
    
    return obj;
  }

  function sortObjectKeys(obj) {
    if (Array.isArray(obj)) {
      return obj.map(sortObjectKeys);
    }
    
    if (typeof obj === 'object' && obj !== null) {
      const result = {};
      Object.keys(obj).sort().forEach(key => {
        result[key] = sortObjectKeys(obj[key]);
      });
      return result;
    }
    
    return obj;
  }

  function flattenObject(obj, prefix = '') {
    const result = {};
    
    Object.entries(obj).forEach(([key, value]) => {
      const newKey = prefix ? `${prefix}.${key}` : key;
      
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        Object.assign(result, flattenObject(value, newKey));
      } else {
        result[newKey] = value;
      }
    });
    
    return result;
  }

  function normalizeDataValues(obj) {
    if (Array.isArray(obj)) {
      return obj.map(normalizeDataValues);
    }
    
    if (typeof obj === 'object' && obj !== null) {
      const result = {};
      Object.entries(obj).forEach(([key, value]) => {
        result[key] = normalizeDataValues(value);
      });
      return result;
    }
    
    if (typeof obj === 'string') {
      // Try to parse numbers
      if (!isNaN(obj) && !isNaN(parseFloat(obj))) {
        return parseFloat(obj);
      }
      // Try to parse booleans
      if (obj.toLowerCase() === 'true') return true;
      if (obj.toLowerCase() === 'false') return false;
      // Try to parse dates
      if (obj.match(/^\d{4}-\d{2}-\d{2}/)) {
        const date = new Date(obj);
        if (!isNaN(date.getTime())) {
          return date.toISOString();
        }
      }
    }
    
    return obj;
  }

  function arrayToCSV(data) {
    if (!Array.isArray(data) || data.length === 0) return '';
    
    const headers = Object.keys(data[0]);
    const csvRows = [headers.join(',')];
    
    data.forEach(row => {
      const values = headers.map(header => {
        const value = row[header];
        return typeof value === 'string' && value.includes(',') ? `"${value}"` : value;
      });
      csvRows.push(values.join(','));
    });
    
    return csvRows.join('\n');
  }

  function parseBasicYAML(yaml) {
    // Very basic YAML parser - for demo purposes only
    const result = {};
    const lines = yaml.split('\n');
    
    lines.forEach(line => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const colonIndex = trimmed.indexOf(':');
        if (colonIndex > 0) {
          const key = trimmed.substring(0, colonIndex).trim();
          const value = trimmed.substring(colonIndex + 1).trim();
          result[key] = value;
        }
      }
    });
    
    return result;
  }

  function jsonToBasicYAML(obj, indent = 0) {
    let yaml = '';
    const spaces = '  '.repeat(indent);
    
    Object.entries(obj).forEach(([key, value]) => {
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        yaml += `${spaces}${key}:\n${jsonToBasicYAML(value, indent + 1)}`;
      } else if (Array.isArray(value)) {
        yaml += `${spaces}${key}:\n`;
        value.forEach(item => {
          yaml += `${spaces}  - ${item}\n`;
        });
      } else {
        yaml += `${spaces}${key}: ${value}\n`;
      }
    });
    
    return yaml;
  }

  function generateTableHTML(data) {
    if (!Array.isArray(data) || data.length === 0) {
      return '<div class="no-data">No data to display</div>';
    }
    
    const headers = Object.keys(data[0]);
    let html = '<table class="data-table"><thead><tr>';
    
    headers.forEach(header => {
      html += `<th>${escapeHtml(header)}</th>`;
    });
    html += '</tr></thead><tbody>';
    
    data.forEach(row => {
      html += '<tr>';
      headers.forEach(header => {
        html += `<td>${escapeHtml(row[header] || '')}</td>`;
      });
      html += '</tr>';
    });
    
    html += '</tbody></table>';
    return html;
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
    formatJSON, minifyJSON, validateJSON, loadSampleJSON, queryJSONPath,
    parseCSV, generateCSV, loadSampleCSV, csvToJSON,
    formatXML, minifyXML, validateXML, loadSampleXML, xmlToJSON, jsonToXML,
    transformData,
    generateMockData, generateNumbers, generateText, generateDates, generateUUIDs, generateFromSchema,
    copyGeneratedData, downloadGeneratedData, clearGeneratedData
  };
})();

window.DataTools = DataTools;

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', DataTools.init);
} else {
  DataTools.init();
}
