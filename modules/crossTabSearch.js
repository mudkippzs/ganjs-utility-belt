// Cross-Tab Search - Search across all open tabs instantly
const CrossTabSearch = (() => {
  let searchContainer = null;
  let isVisible = false;
  let searchResults = [];

  function init() {
    createSearchContainer();
    attachKeyboardShortcuts();
  }

  function createSearchContainer() {
    if (searchContainer) return;

    searchContainer = document.createElement('div');
    searchContainer.className = 'cross-tab-search hidden';
    searchContainer.innerHTML = `
      <div class="search-overlay">
        <div class="search-modal">
          <div class="search-header">
            <h3>🔍 Cross-Tab Search</h3>
            <button class="search-close">✕</button>
          </div>
          <div class="search-input-container">
            <input type="text" id="tabSearchInput" placeholder="Search across all open tabs..." autocomplete="off">
            <div class="search-options">
              <label><input type="checkbox" id="caseSensitive"> Case sensitive</label>
              <label><input type="checkbox" id="wholeWords"> Whole words</label>
              <label><input type="checkbox" id="useRegex"> Regex</label>
            </div>
          </div>
          <div class="search-stats">
            <span id="searchStats">Enter search term to begin</span>
          </div>
          <div class="search-results" id="searchResults">
            <!-- Results will be populated here -->
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(searchContainer);
    attachEventListeners();
  }

  function attachEventListeners() {
    const searchInput = searchContainer.querySelector('#tabSearchInput');
    const searchClose = searchContainer.querySelector('.search-close');
    const overlay = searchContainer.querySelector('.search-overlay');

    searchClose.addEventListener('click', hide);
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) hide();
    });

    searchInput.addEventListener('input', debounce(performSearch, 300));
    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        jumpToFirstResult();
      }
      if (e.key === 'Escape') {
        hide();
      }
    });

    // Search options
    ['caseSensitive', 'wholeWords', 'useRegex'].forEach(id => {
      searchContainer.querySelector('#' + id).addEventListener('change', () => {
        if (searchInput.value.trim()) {
          performSearch();
        }
      });
    });
  }

  function performSearch() {
    const query = searchContainer.querySelector('#tabSearchInput').value.trim();
    if (!query) {
      updateSearchStats('Enter search term to begin');
      clearResults();
      return;
    }

    updateSearchStats('Searching...');
    
    // Send message to background script to search all tabs
    chrome.runtime.sendMessage({
      action: 'searchAllTabs',
      query: query,
      options: {
        caseSensitive: searchContainer.querySelector('#caseSensitive').checked,
        wholeWords: searchContainer.querySelector('#wholeWords').checked,
        useRegex: searchContainer.querySelector('#useRegex').checked
      }
    }, (response) => {
      if (response && response.results) {
        displayResults(response.results, query);
      }
    });
  }

  function displayResults(results, query) {
    searchResults = results;
    const resultsContainer = searchContainer.querySelector('#searchResults');
    const totalMatches = results.reduce((sum, tab) => sum + tab.matches.length, 0);
    
    updateSearchStats(`Found ${totalMatches} matches across ${results.length} tabs`);

    if (results.length === 0) {
      resultsContainer.innerHTML = '<div class="no-results">No matches found</div>';
      return;
    }

    resultsContainer.innerHTML = results.map(tab => `
      <div class="tab-result">
        <div class="tab-header" data-tab-id="${tab.id}">
          <img src="${tab.favIconUrl || 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16"><rect width="16" height="16" fill="%23ddd"/></svg>'}" width="16" height="16">
          <span class="tab-title">${escapeHtml(tab.title)}</span>
          <span class="match-count">${tab.matches.length} matches</span>
        </div>
        <div class="tab-matches">
          ${tab.matches.map((match, index) => `
            <div class="match-item" data-tab-id="${tab.id}" data-match-index="${index}">
              <div class="match-context">${highlightMatch(match.context, query)}</div>
              <div class="match-position">Line ${match.line}</div>
            </div>
          `).join('')}
        </div>
      </div>
    `).join('');

    // Add click handlers
    resultsContainer.querySelectorAll('.tab-header').forEach(header => {
      header.addEventListener('click', () => {
        const tabId = parseInt(header.dataset.tabId);
        switchToTab(tabId);
      });
    });

    resultsContainer.querySelectorAll('.match-item').forEach(item => {
      item.addEventListener('click', () => {
        const tabId = parseInt(item.dataset.tabId);
        const matchIndex = parseInt(item.dataset.matchIndex);
        jumpToMatch(tabId, matchIndex);
      });
    });
  }

  function highlightMatch(context, query) {
    const options = {
      caseSensitive: searchContainer.querySelector('#caseSensitive').checked,
      wholeWords: searchContainer.querySelector('#wholeWords').checked,
      useRegex: searchContainer.querySelector('#useRegex').checked
    };

    try {
      let pattern;
      if (options.useRegex) {
        pattern = new RegExp(query, options.caseSensitive ? 'g' : 'gi');
      } else {
        const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const wordBoundary = options.wholeWords ? '\\b' : '';
        pattern = new RegExp(`${wordBoundary}${escapedQuery}${wordBoundary}`, options.caseSensitive ? 'g' : 'gi');
      }

      return escapeHtml(context).replace(pattern, '<mark>$&</mark>');
    } catch (e) {
      return escapeHtml(context);
    }
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  function switchToTab(tabId) {
    chrome.runtime.sendMessage({ action: 'switchToTab', tabId: tabId });
    hide();
  }

  function jumpToMatch(tabId, matchIndex) {
    chrome.runtime.sendMessage({ 
      action: 'jumpToMatch', 
      tabId: tabId, 
      matchIndex: matchIndex,
      query: searchContainer.querySelector('#tabSearchInput').value
    });
    hide();
  }

  function jumpToFirstResult() {
    if (searchResults.length > 0 && searchResults[0].matches.length > 0) {
      jumpToMatch(searchResults[0].id, 0);
    }
  }

  function updateSearchStats(text) {
    searchContainer.querySelector('#searchStats').textContent = text;
  }

  function clearResults() {
    searchContainer.querySelector('#searchResults').innerHTML = '';
  }

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

  function attachKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'F') {
        e.preventDefault();
        toggle();
      }
      if (e.key === 'Escape' && isVisible) {
        hide();
      }
    });
  }

  function show() {
    if (!searchContainer) createSearchContainer();
    searchContainer.classList.remove('hidden');
    isVisible = true;
    
    // Focus the search input
    setTimeout(() => {
      const input = searchContainer.querySelector('#tabSearchInput');
      input.focus();
      input.select();
    }, 100);
  }

  function hide() {
    if (searchContainer) {
      searchContainer.classList.add('hidden');
    }
    isVisible = false;
  }

  function toggle() {
    isVisible ? hide() : show();
  }

  return { init, show, hide, toggle };
})();

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', CrossTabSearch.init);
} else {
  CrossTabSearch.init();
}

// Make it globally accessible
window.CrossTabSearch = CrossTabSearch;
