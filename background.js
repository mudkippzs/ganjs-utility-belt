function getDisplayNameFromDomain(hostname) {
  const multiPartTLDs = ['co.uk', 'org.uk', 'gov.uk', 'ac.uk', 'com.au', 'co.in'];
  const parts = hostname.split('.');

  if (parts.length < 2) return hostname;

  const tld = parts.slice(-2).join('.');
  const tld3 = parts.slice(-3).join('.');

  let domain = '';
  let sub = '';

  if (multiPartTLDs.includes(tld)) {
    domain = parts.slice(-3, -2)[0];
    sub = parts.slice(0, -3).join('.');
  } else {
    domain = parts.slice(-2, -1)[0];
    sub = parts.slice(0, -2).join('.');
  }

  const capitalizedDomain = domain.charAt(0).toUpperCase() + domain.slice(1);
  const capitalizedSub = sub
    .split('.')
    .filter(s => s && s !== 'www')
    .map(s => s.charAt(0).toUpperCase() + s.slice(1))
    .join(' - ');

  return capitalizedSub ? `${capitalizedDomain} - ${capitalizedSub}` : capitalizedDomain;
}

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'pomodoroTimer') {
    chrome.storage.local.get(['pomodoroState', 'pomodoroLogs', 'autoStartNextFocus'], (res) => {
      const state = res.pomodoroState;
      const logs = res.pomodoroLogs || [];

      console.log('[Background] Alarm triggered:', { state, autoStartNextFocus: res.autoStartNextFocus });

      if (!state) {
        console.log('[Background] No state, skipping alarm');
        return;
      }

      if (state.type === 'focus') {
        // Log the completed focus session
        logs.push({
          start: new Date(state.startTime).toISOString(),
          duration: 2 * 60 * 1000, // 2 minutes for testing
          task: state.task || ''
        });

        chrome.storage.local.set({ pomodoroLogs: logs }, () => {
          console.log('[Background] Focus logged:', logs[logs.length - 1]);

          // Transition to break
          const breakStart = Date.now();
          const breakEnd = breakStart + 2 * 60 * 1000; // 2 minutes for testing

          chrome.storage.local.set({
            pomodoroState: {
              type: 'break',
              startTime: breakStart,
              endTime: breakEnd,
              task: ''
            },
            pomodoroPaused: false,
            pomodoroRemaining: null
          }, () => {
            console.log('[Background] Break state set:', { type: 'break', startTime: breakStart, endTime: breakEnd });
            chrome.alarms.clear('pomodoroTimer', () => {
              chrome.alarms.create('pomodoroTimer', { when: breakEnd });
              console.log('[Background] Created break alarm for', new Date(breakEnd));
              chrome.notifications.create(
                'focusComplete-' + Date.now(),
                {
                  type: 'basic',
                  iconUrl: 'icon.png',
                  title: 'Focus Complete!',
                  message: 'Time to take a break!',
                  priority: 2 // Higher priority to ensure visibility
                },
                () => {
                  if (chrome.runtime.lastError) {
                    console.error('[Background] Focus complete notification error:', chrome.runtime.lastError.message);
                  } else {
                    console.log('[Background] Focus complete notification created successfully');
                  }
                }
              );
            });
          });
        });
      } else if (state.type === 'break') {
        console.log('[Background] Break ended, autoStart:', res.autoStartNextFocus);
        chrome.alarms.clear('pomodoroTimer', () => {
          if (res.autoStartNextFocus) {
            // Start a new focus session
            const focusStart = Date.now();
            const focusEnd = focusStart + 2 * 60 * 1000; // 2 minutes for testing

            chrome.storage.local.set({
              pomodoroState: {
                type: 'focus',
                startTime: focusStart,
                endTime: focusEnd,
                task: state.task || ''
              },
              pomodoroPaused: false,
              pomodoroRemaining: null
            }, () => {
              console.log('[Background] New focus state set:', { type: 'focus', startTime: focusStart, endTime: focusEnd });
              chrome.alarms.create('pomodoroTimer', { when: focusEnd });
              console.log('[Background] Created focus alarm for', new Date(focusEnd));
              chrome.notifications.create(
                'breakComplete-' + Date.now(),
                {
                  type: 'basic',
                  iconUrl: 'icon.png',
                  title: 'Break Complete!',
                  message: 'Time to resume focus!',
                  priority: 2
                },
                () => {
                  if (chrome.runtime.lastError) {
                    console.error('[Background] Break complete notification error:', chrome.runtime.lastError.message);
                  } else {
                    console.log('[Background] Break complete notification created successfully');
                  }
                }
              );
            });
          } else {
            // Clear state if autoStartNextFocus is false
            chrome.storage.local.remove(['pomodoroState', 'pomodoroPaused', 'pomodoroRemaining'], () => {
              console.log('[Background] Break state cleared');
              chrome.notifications.create(
                'breakComplete-' + Date.now(),
                {
                  type: 'basic',
                  iconUrl: 'icon.png',
                  title: 'Break Complete!',
                  message: 'Time to resume focus or start a new session!',
                  priority: 2
                },
                () => {
                  if (chrome.runtime.lastError) {
                    console.error('[Background] Break complete (no auto focus) notification error:', chrome.runtime.lastError.message);
                  } else {
                    console.log('[Background] Break complete (no auto focus) notification created successfully');
                  }
                }
              );
            });
          }
        });
      }
    });
  }
});

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "createStickyNote",
    title: "Create Sticky Note Here",
    contexts: ["page", "selection"]
  });
  // Initialize showFloatingTimer default
  chrome.storage.sync.get(['showFloatingTimer'], (res) => {
    if (res.showFloatingTimer === undefined) {
      chrome.storage.sync.set({ showFloatingTimer: true });
      console.log('[Background] Initialized showFloatingTimer to true');
    }
  });
  
  // Initialize default redirect rules
  chrome.storage.local.get(['redirectRules'], (result) => {
    if (!result.redirectRules) {
      chrome.storage.local.set({ redirectRules: [] });
      console.log('[Background] Initialized empty redirect rules');
    }
  });
});

// ===== URL REDIRECTOR SUPPORT =====

// Early redirect interception
chrome.webNavigation.onBeforeRequest.addListener(
  (details) => {
    if (details.frameId !== 0) return; // Only main frame
    
    checkAndRedirect(details.url, details.tabId);
  },
  { url: [{ urlMatches: 'https?://.*' }] },
  ['blocking']
);

async function checkAndRedirect(currentUrl, tabId) {
  try {
    const result = await chrome.storage.local.get(['redirectRules']);
    const redirectRules = result.redirectRules || [];
    
    console.log('[Background Redirector] Checking URL:', currentUrl);
    
    for (const rule of redirectRules) {
      if (!rule.enabled) continue;
      
      const matchResult = matchPattern(rule.fromPattern, currentUrl);
      
      if (matchResult.matches) {
        const targetUrl = replacePlaceholders(rule.toUrl, matchResult.captures);
        
        // Enhanced loop prevention
        if (targetUrl === currentUrl) {
          console.log('[Background Redirector] Skipping redirect to same URL');
          continue;
        }
        
        // Check if target would also match the pattern (loop detection)
        const loopCheck = matchPattern(rule.fromPattern, targetUrl);
        if (loopCheck.matches) {
          console.log('[Background Redirector] Loop detected, disabling rule:', rule.fromPattern);
          rule.enabled = false;
          await chrome.storage.local.set({ redirectRules: redirectRules });
          
          // Notify user about disabled rule
          chrome.notifications.create(
            'redirectLoop-' + Date.now(),
            {
              type: 'basic',
              iconUrl: 'icon.png',
              title: '🔄 Redirect Loop Prevented',
              message: `Rule "${rule.fromPattern}" was disabled to prevent a redirect loop.`,
              priority: 2
            }
          );
          continue;
        }
        
        // Check if we've recently redirected (prevent rapid redirects)
        const now = Date.now();
        if (rule.lastUsed && (now - new Date(rule.lastUsed).getTime()) < 5000) {
          console.log('[Background Redirector] Recent redirect, skipping to prevent loops');
          continue;
        }
        
        rule.useCount++;
        rule.lastUsed = new Date().toISOString();
        await chrome.storage.local.set({ redirectRules: redirectRules });
        
        console.log('[Background Redirector] Redirecting:', currentUrl, '→', targetUrl);
        
        // Perform the redirect
        chrome.tabs.update(tabId, { url: targetUrl });
        break;
      }
    }
  } catch (error) {
    console.error('[Background Redirector] Error checking redirects:', error);
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
    console.error('[Background Redirector] Pattern error:', error);
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

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId !== 'createStickyNote') return;
  if (!tab || !tab.id || !/^https?:\/\//.test(tab.url)) return;

  chrome.tabs.sendMessage(tab.id, { action: 'getClickPosition' }, (coords) => {
    if (chrome.runtime.lastError) {
      console.warn('Could not get click position:', chrome.runtime.lastError.message);
      return;
    }

    const pageUrl = new URL(tab.url);
    pageUrl.hash = '';
    const cleanUrl = pageUrl.toString();

    const noteData = {
      x: coords?.x || 100,
      y: coords?.y || 100,
      content: info.selectionText || '',
      title: '',
      color: '#fffae6',
      font: 'Arial',
      url: cleanUrl,
      id: `${Date.now()}-${Math.random()}`
    };

    chrome.storage.local.get({ stickyNotes: [] }, ({ stickyNotes }) => {
      stickyNotes.push(noteData);
      chrome.storage.local.set({ stickyNotes }, () => {
        chrome.tabs.sendMessage(tab.id, { action: 'restoreStickyNotes', notes: [noteData] }, () => {
          if (chrome.runtime.lastError) {
            console.warn('Sticky note injection failed:', chrome.runtime.lastError.message);
          }
        });
      });
    });
  });
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'deleteStickyNote' && message.id) {
    chrome.storage.local.get({ stickyNotes: [] }, ({ stickyNotes }) => {
      const updated = stickyNotes.filter(n => n.id !== message.id);
      chrome.storage.local.set({ stickyNotes: updated });
    });
    return;
  }

  if (message.action === 'loadStickyNotes') {
    const url = sender?.tab?.url;
    if (!url || !/^https?:\/\//.test(url)) return sendResponse({ notes: [] });

    const cleanUrl = new URL(url);
    cleanUrl.hash = '';
    const compareUrl = cleanUrl.toString();

    chrome.storage.local.get({ stickyNotes: [] }, ({ stickyNotes }) => {
      const notes = stickyNotes.filter(n => n.url === compareUrl);
      sendResponse({ notes });
    });
    return true;
  }

  if (message.action === 'groupTabs') {
    chrome.tabs.query({ currentWindow: true }, async (tabs) => {
      const groups = {};
      for (const tab of tabs) {
        if (!/^https?:\/\//.test(tab.url)) continue;
        let domain;
        try {
          domain = new URL(tab.url).hostname;
        } catch (e) {
          domain = 'Unknown';
        }
        if (!groups[domain]) groups[domain] = [];
        groups[domain].push(tab);
      }

      for (const domain in groups) {
        const tabIds = groups[domain].map(t => t.id);
        const groupId = await chrome.tabs.group({ tabIds });
        const colors = ['grey', 'blue', 'red', 'green', 'yellow', 'pink', 'purple', 'cyan'];
        const nextColor = colors[Math.floor(Math.random() * colors.length)];
        try {
          await chrome.tabGroups.update(groupId, {
            title: `${getDisplayNameFromDomain(domain)} (${tabIds.length})`,
            collapsed: true,
            color: nextColor
          });
        } catch (e) {
          console.warn(`Failed to update tab group for domain ${domain}`, e);
        }
      }
      sendResponse({ success: true });
    });
    return true;
  }

  if (message.action === 'ungroupTabs') {
    chrome.tabs.query({ currentWindow: true }, async (tabs) => {
      const groupedTabs = tabs.filter(t => t.groupId !== chrome.tabGroups.TAB_GROUP_ID_NONE);
      for (const tab of groupedTabs) {
        try {
          await chrome.tabs.ungroup(tab.id);
        } catch (e) {
          console.warn(`Failed to ungroup tab ${tab.id}`, e);
        }
      }
      sendResponse({ success: true });
    });
    return true;
  }

  if (message.action === 'openTabSet' && message.setName) {
    chrome.storage.local.get(['tabSets'], (res) => {
      const urls = res.tabSets?.[message.setName] || [];
      urls.forEach((tab, i) => {
        setTimeout(() => chrome.tabs.create({ url: tab.url }), i * 150);
      });
    });
  }

  if (message.action === 'pomodoroToast') {
    console.log('[Background] Received pomodoroToast message:', message.message);
    chrome.notifications.create(
      'pomodoroToast-' + Date.now(),
      {
        type: 'basic',
        iconUrl: 'icon.png',
        title: 'Pomodoro',
        message: message.message,
        priority: 2
      },
      () => {
        if (chrome.runtime.lastError) {
          console.error('[Background] Toast notification error:', chrome.runtime.lastError.message);
        } else {
          console.log('[Background] Toast notification created successfully:', message.message);
        }
      }
    );
  }

  // Add a test notification action for debugging
  if (message.action === 'testNotification') {
    console.log('[Background] Triggering test notification');
    chrome.notifications.create(
      'test-' + Date.now(),
      {
        type: 'basic',
        iconUrl: 'icon.png',
        title: 'Test Notification',
        message: 'This is a test notification.',
        priority: 2
      },
      () => {
        if (chrome.runtime.lastError) {
          console.error('[Background] Test notification error:', chrome.runtime.lastError.message);
        } else {
          console.log('[Background] Test notification created successfully');
        }
      }
    );
  }
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url && /^https?:\/\//.test(tab.url)) {
    const cleanUrl = new URL(tab.url);
    cleanUrl.hash = '';
    const compareUrl = cleanUrl.toString();
    chrome.storage.local.get({ stickyNotes: [] }, ({ stickyNotes }) => {
      const relevantNotes = stickyNotes.filter(n => n.url === compareUrl);
      chrome.tabs.sendMessage(tabId, { action: 'restoreStickyNotes', notes: relevantNotes }, () => {
        if (chrome.runtime.lastError) {
          console.warn('Could not inject sticky notes:', chrome.runtime.lastError.message);
        }
      });
    });
  }
});

chrome.tabs.onCreated.addListener((tab) => {
  if (!tab.url || !/^https?:\/\//.test(tab.url)) return;
  const newHostname = new URL(tab.url).hostname;

  chrome.tabGroups.query({}, (groups) => {
    chrome.tabs.query({}, (allTabs) => {
      for (const group of groups) {
        const groupTabs = allTabs.filter(t => t.groupId === group.id);
        if (groupTabs.length === 0) continue;

        const exampleTab = groupTabs.find(t => t.url && /^https?:\/\//.test(t.url));
        if (!exampleTab) continue;

        const groupHostname = new URL(exampleTab.url).hostname;
        if (groupHostname === newHostname) {
          chrome.tabs.group({ tabIds: [tab.id], groupId: group.id });
          return;
        }
      }

      chrome.tabs.group({ tabIds: [tab.id] }, async (groupId) => {
        const groupTitle = `${getDisplayNameFromDomain(newHostname)} (1)`;
        const colors = ['grey', 'blue', 'red', 'green', 'yellow', 'pink', 'purple', 'cyan'];
        const nextColor = colors[Math.floor(Math.random() * colors.length)];
        await chrome.tabGroups.update(groupId, {
          title: groupTitle,
          collapsed: true,
          color: nextColor
        });
      });
    });
  });
});

chrome.tabs.onRemoved.addListener((tabId, removeInfo) => {
  if (removeInfo.isWindowClosing) return;

  chrome.tabGroups.query({}, (groups) => {
    groups.forEach((group) => {
      chrome.tabs.query({ groupId: group.id }, (tabsInGroup) => {
        if (tabsInGroup.length === 0) return;

        const hostname = new URL(tabsInGroup[0].url).hostname;
        const label = getDisplayNameFromDomain(hostname);
        chrome.tabGroups.update(group.id, {
          title: `${label} (${tabsInGroup.length})`
        });
      });
    });
  });
});

let toastLeaderTabId = null;

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Claim toast leader
  if (message.action === 'claimToastLeadership') {
    if (toastLeaderTabId === null || !sender.tab || sender.tab.id < toastLeaderTabId) {
      toastLeaderTabId = sender.tab.id;
      console.log('[Background] Toast leader assigned to tab:', toastLeaderTabId);
    }
    sendResponse({ isLeader: toastLeaderTabId === sender.tab.id });
    return true;
  }

  // Toast request
  if (message.action === 'pomodoroToast') {
    if (sender.tab && sender.tab.id !== toastLeaderTabId) {
      console.log('[Background] Ignoring toast from non-leader tab:', sender.tab.id);
      return;
    }

    chrome.notifications.create(
      'pomodoroToast-' + Date.now(),
      {
        type: 'basic',
        iconUrl: 'icon.png',
        title: 'Pomodoro',
        message: message.message,
        priority: 2
      },
      () => {
        if (chrome.runtime.lastError) {
          console.error('[Background] Toast notification error:', chrome.runtime.lastError.message);
        } else {
          console.log('[Background] Toast shown:', message.message);
        }
      }
    );
  }
});

// ===== NEW TOOL HANDLERS =====

// Screenshot Tool Support
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('[Background] Received message:', request.action);

  if (request.action === 'takeScreenshot' || request.action === 'captureVisible') {
    chrome.tabs.captureVisibleTab(null, { format: 'png' }, (dataUrl) => {
      if (chrome.runtime.lastError) {
        console.error('[Background] Screenshot error:', chrome.runtime.lastError.message);
        sendResponse({ error: chrome.runtime.lastError.message });
      } else {
        console.log('[Background] Screenshot captured successfully');
        sendResponse({ dataUrl: dataUrl });
      }
    });
    return true; // Will respond asynchronously
  }

  if (request.action === 'captureFullPage') {
    // For full page screenshots, we need to scroll and stitch
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.scripting.executeScript({
        target: { tabId: tabs[0].id },
        func: captureFullPageHelper
      }, (results) => {
        if (results && results[0]) {
          sendResponse({ dataUrl: results[0].result });
        } else {
          sendResponse({ error: 'Failed to capture full page' });
        }
      });
    });
    return true;
  }

  if (request.action === 'captureSelection') {
    chrome.tabs.captureVisibleTab(null, { format: 'png' }, (dataUrl) => {
      if (chrome.runtime.lastError) {
        sendResponse({ error: chrome.runtime.lastError.message });
      } else {
        // Crop the image to the selection area
        sendResponse({ dataUrl: dataUrl });
      }
    });
    return true;
  }

  // Cross-Tab Search Support
  if (request.action === 'searchAllTabs') {
    searchAllTabs(request.query, request.options).then(results => {
      sendResponse({ results: results });
    }).catch(error => {
      sendResponse({ error: error.message });
    });
    return true;
  }

  if (request.action === 'switchToTab') {
    chrome.tabs.update(request.tabId, { active: true });
    chrome.tabs.get(request.tabId, (tab) => {
      chrome.windows.update(tab.windowId, { focused: true });
    });
  }

  if (request.action === 'jumpToMatch') {
    chrome.tabs.update(request.tabId, { active: true }, () => {
      chrome.scripting.executeScript({
        target: { tabId: request.tabId },
        func: highlightSearchTerm,
        args: [request.query]
      });
    });
  }

  // Quick Actions Support
  if (request.action === 'addBookmark') {
    chrome.bookmarks.create({
      title: request.title,
      url: request.url
    }, (bookmark) => {
      console.log('[Background] Bookmark created:', bookmark);
    });
  }

  if (request.action === 'toggleJS') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.scripting.executeScript({
        target: { tabId: tabs[0].id },
        func: () => {
          // Simple JS toggle (this is limited, but works for demonstration)
          const scripts = document.querySelectorAll('script');
          if (document.body.dataset.jsDisabled === 'true') {
            document.body.dataset.jsDisabled = 'false';
            location.reload();
          } else {
            document.body.dataset.jsDisabled = 'true';
            scripts.forEach(script => script.remove());
          }
        }
      });
    });
  }
});

// Helper function for full page screenshot
function captureFullPageHelper() {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    // Get page dimensions
    const width = Math.max(
      document.body.scrollWidth,
      document.body.offsetWidth,
      document.documentElement.clientWidth,
      document.documentElement.scrollWidth,
      document.documentElement.offsetWidth
    );
    
    const height = Math.max(
      document.body.scrollHeight,
      document.body.offsetHeight,
      document.documentElement.clientHeight,
      document.documentElement.scrollHeight,
      document.documentElement.offsetHeight
    );
    
    canvas.width = width;
    canvas.height = height;
    
    // Use html2canvas if available, otherwise fallback to basic capture
    if (typeof html2canvas !== 'undefined') {
      html2canvas(document.body).then(canvas => {
        resolve(canvas.toDataURL());
      });
    } else {
      // Fallback: just capture current viewport
      resolve(null);
    }
  });
}

// Cross-tab search functionality
async function searchAllTabs(query, options) {
  const tabs = await chrome.tabs.query({});
  const results = [];
  
  for (const tab of tabs) {
    try {
      if (tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) {
        continue; // Skip chrome internal pages
      }
      
      const searchResults = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: searchInPage,
        args: [query, options]
      });
      
      if (searchResults && searchResults[0] && searchResults[0].result.length > 0) {
        results.push({
          id: tab.id,
          title: tab.title,
          url: tab.url,
          favIconUrl: tab.favIconUrl,
          matches: searchResults[0].result
        });
      }
    } catch (error) {
      console.log(`[Background] Could not search tab ${tab.id}:`, error.message);
    }
  }
  
  return results;
}

// Search function to be injected into pages
function searchInPage(query, options) {
  const matches = [];
  
  try {
    let pattern;
    if (options.useRegex) {
      pattern = new RegExp(query, options.caseSensitive ? 'g' : 'gi');
    } else {
      const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const wordBoundary = options.wholeWords ? '\\b' : '';
      pattern = new RegExp(`${wordBoundary}${escapedQuery}${wordBoundary}`, options.caseSensitive ? 'g' : 'gi');
    }
    
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
      null,
      false
    );
    
    let node;
    let lineNumber = 1;
    
    while (node = walker.nextNode()) {
      const text = node.textContent;
      if (pattern.test(text)) {
        const lines = text.split('\n');
        lines.forEach((line, index) => {
          if (pattern.test(line)) {
            matches.push({
              line: lineNumber + index,
              context: line.trim().substring(0, 200)
            });
          }
        });
      }
      lineNumber += text.split('\n').length - 1;
    }
  } catch (error) {
    console.error('Search error:', error);
  }
  
  return matches.slice(0, 50); // Limit results
}

// Highlight search term function
function highlightSearchTerm(query) {
  // Remove existing highlights
  document.querySelectorAll('.ganj-search-highlight').forEach(el => {
    el.outerHTML = el.innerHTML;
  });
  
  // Add new highlights
  const walker = document.createTreeWalker(
    document.body,
    NodeFilter.SHOW_TEXT,
    null,
    false
  );
  
  const textNodes = [];
  let node;
  while (node = walker.nextNode()) {
    textNodes.push(node);
  }
  
  textNodes.forEach(textNode => {
    if (textNode.textContent.toLowerCase().includes(query.toLowerCase())) {
      const parent = textNode.parentNode;
      const wrapper = document.createElement('span');
      wrapper.innerHTML = textNode.textContent.replace(
        new RegExp(query, 'gi'),
        '<span class="ganj-search-highlight" style="background-color: yellow; padding: 2px;">$&</span>'
      );
      parent.replaceChild(wrapper, textNode);
    }
  });
  
  // Scroll to first highlight
  const firstHighlight = document.querySelector('.ganj-search-highlight');
  if (firstHighlight) {
    firstHighlight.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}

console.log('[Background] New tool handlers loaded successfully');
