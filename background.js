function getDisplayNameFromDomain(hostname) {
  const multiPartTLDs = ['co.uk', 'org.uk', 'gov.uk', 'ac.uk', 'com.au', 'co.in'];
  const parts = hostname.split('.');
  if (parts.length < 2) return hostname;

  const tld = parts.slice(-2).join('.');
  let domain, sub;

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

function safeHostname(url) {
  try { return new URL(url).hostname; }
  catch { return null; }
}

function isWebUrl(url) {
  return url && /^https?:\/\//.test(url);
}

function notify(id, title, message) {
  chrome.notifications.create(id + '-' + Date.now(), {
    type: 'basic',
    iconUrl: 'icon.png',
    title,
    message,
    priority: 2
  });
}

// --- Pomodoro alarm ---

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name !== 'pomodoroTimer') return;

  chrome.storage.local.get(['pomodoroState', 'pomodoroLogs'], (localRes) => {
    chrome.storage.sync.get(['autoStartNextFocus', 'pomodoroSettings'], (syncRes) => {
      const state = localRes.pomodoroState;
      const logs = localRes.pomodoroLogs || [];
      const autoStart = syncRes.autoStartNextFocus ?? false;
      const settings = syncRes.pomodoroSettings || {};
      const focusDuration = settings.focusDuration || 25 * 60 * 1000;
      const breakDuration = settings.shortBreakDuration || 5 * 60 * 1000;

      if (!state) return;

      if (state.type === 'focus') {
        logs.push({
          start: new Date(state.startTime).toISOString(),
          duration: state.endTime - state.startTime,
          task: state.task || ''
        });

        const breakEnd = Date.now() + breakDuration;
        chrome.storage.local.set({
          pomodoroLogs: logs,
          pomodoroState: { type: 'break', startTime: Date.now(), endTime: breakEnd, task: '' },
          pomodoroPaused: false,
          pomodoroRemaining: null
        }, () => {
          chrome.alarms.clear('pomodoroTimer', () => {
            chrome.alarms.create('pomodoroTimer', { when: breakEnd });
            notify('focusComplete', 'Focus Complete!', 'Time to take a break!');
          });
        });

      } else if (state.type === 'break') {
        chrome.alarms.clear('pomodoroTimer', () => {
          if (autoStart) {
            const focusEnd = Date.now() + focusDuration;
            chrome.storage.local.set({
              pomodoroState: { type: 'focus', startTime: Date.now(), endTime: focusEnd, task: state.task || '' },
              pomodoroPaused: false,
              pomodoroRemaining: null
            }, () => {
              chrome.alarms.create('pomodoroTimer', { when: focusEnd });
              notify('breakComplete', 'Break Complete!', 'Time to resume focus!');
            });
          } else {
            chrome.storage.local.remove(['pomodoroState', 'pomodoroPaused', 'pomodoroRemaining'], () => {
              notify('breakComplete', 'Break Complete!', 'Time to resume focus or start a new session!');
            });
          }
        });
      }
    });
  });
});

// --- Installation ---

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'createStickyNote',
    title: 'Create Sticky Note Here',
    contexts: ['page', 'selection']
  });

  chrome.storage.sync.get(['showFloatingTimer'], (res) => {
    if (res.showFloatingTimer === undefined) {
      chrome.storage.sync.set({ showFloatingTimer: true });
    }
  });

  chrome.storage.local.get(['redirectRules'], (result) => {
    if (!result.redirectRules) {
      chrome.storage.local.set({ redirectRules: [] });
    }
  });
});

// --- Context menu ---

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId !== 'createStickyNote') return;
  if (!tab?.id || !isWebUrl(tab.url)) return;

  chrome.tabs.sendMessage(tab.id, { action: 'getClickPosition' }, (coords) => {
    if (chrome.runtime.lastError) return;

    let cleanUrl;
    try {
      const pageUrl = new URL(tab.url);
      pageUrl.hash = '';
      cleanUrl = pageUrl.toString();
    } catch { return; }

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
          void chrome.runtime.lastError;
        });
      });
    });
  });
});

// --- Unified message handler ---

let toastLeaderTabId = null;

const messageHandlers = {
  deleteStickyNote(message) {
    if (!message.id) return;
    chrome.storage.local.get({ stickyNotes: [] }, ({ stickyNotes }) => {
      chrome.storage.local.set({ stickyNotes: stickyNotes.filter(n => n.id !== message.id) });
    });
  },

  loadStickyNotes(message, sender, sendResponse) {
    const url = sender?.tab?.url;
    if (!url || !isWebUrl(url)) return sendResponse({ notes: [] });

    let compareUrl;
    try {
      const parsed = new URL(url);
      parsed.hash = '';
      compareUrl = parsed.toString();
    } catch { return sendResponse({ notes: [] }); }

    chrome.storage.local.get({ stickyNotes: [] }, ({ stickyNotes }) => {
      sendResponse({ notes: stickyNotes.filter(n => n.url === compareUrl) });
    });
    return true;
  },

  groupTabs(message, sender, sendResponse) {
    chrome.tabs.query({ currentWindow: true }, async (tabs) => {
      const groups = {};
      for (const tab of tabs) {
        const hostname = safeHostname(tab.url);
        if (!hostname) continue;
        if (!groups[hostname]) groups[hostname] = [];
        groups[hostname].push(tab);
      }

      const colors = ['grey', 'blue', 'red', 'green', 'yellow', 'pink', 'purple', 'cyan'];
      for (const domain in groups) {
        const tabIds = groups[domain].map(t => t.id);
        try {
          const groupId = await chrome.tabs.group({ tabIds });
          await chrome.tabGroups.update(groupId, {
            title: `${getDisplayNameFromDomain(domain)} (${tabIds.length})`,
            collapsed: true,
            color: colors[Math.floor(Math.random() * colors.length)]
          });
        } catch { /* tab may have been closed */ }
      }
      sendResponse({ success: true });
    });
    return true;
  },

  ungroupTabs(message, sender, sendResponse) {
    chrome.tabs.query({ currentWindow: true }, async (tabs) => {
      for (const tab of tabs) {
        if (tab.groupId !== chrome.tabGroups.TAB_GROUP_ID_NONE) {
          try { await chrome.tabs.ungroup(tab.id); } catch { /* ignore */ }
        }
      }
      sendResponse({ success: true });
    });
    return true;
  },

  openTabSet(message) {
    if (!message.setName) return;
    chrome.storage.local.get(['tabSets'], (res) => {
      const urls = res.tabSets?.[message.setName] || [];
      urls.forEach((tab, i) => {
        setTimeout(() => chrome.tabs.create({ url: tab.url }), i * 150);
      });
    });
  },

  claimToastLeadership(message, sender, sendResponse) {
    if (toastLeaderTabId === null || !sender.tab || sender.tab.id < toastLeaderTabId) {
      toastLeaderTabId = sender.tab?.id ?? null;
    }
    sendResponse({ isLeader: toastLeaderTabId === sender.tab?.id });
    return true;
  },

  pomodoroToast(message, sender) {
    if (sender.tab && sender.tab.id !== toastLeaderTabId) return;
    notify('pomodoroToast', 'Pomodoro', message.message);
  },

  testNotification() {
    notify('test', 'Test Notification', 'This is a test notification.');
  },

  takeScreenshot(message, sender, sendResponse) {
    chrome.tabs.captureVisibleTab(null, { format: 'png' }, (dataUrl) => {
      if (chrome.runtime.lastError) {
        sendResponse({ error: chrome.runtime.lastError.message });
      } else {
        sendResponse({ dataUrl });
      }
    });
    return true;
  },

  captureVisible(message, sender, sendResponse) {
    return messageHandlers.takeScreenshot(message, sender, sendResponse);
  },

  captureFullPage(message, sender, sendResponse) {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs[0]) return sendResponse({ error: 'No active tab' });
      chrome.tabs.captureVisibleTab(null, { format: 'png' }, (dataUrl) => {
        if (chrome.runtime.lastError) {
          sendResponse({ error: chrome.runtime.lastError.message });
        } else {
          sendResponse({ dataUrl, note: 'Full page capture requires scroll-and-stitch on the client side.' });
        }
      });
    });
    return true;
  },

  captureSelection(message, sender, sendResponse) {
    chrome.tabs.captureVisibleTab(null, { format: 'png' }, (dataUrl) => {
      if (chrome.runtime.lastError) {
        sendResponse({ error: chrome.runtime.lastError.message });
      } else {
        sendResponse({ dataUrl, selection: message.selection });
      }
    });
    return true;
  },

  searchAllTabs(message, sender, sendResponse) {
    searchAllTabs(message.query, message.options).then(results => {
      sendResponse({ results });
    }).catch(error => {
      sendResponse({ error: error.message });
    });
    return true;
  },

  switchToTab(message) {
    chrome.tabs.update(message.tabId, { active: true });
    chrome.tabs.get(message.tabId, (tab) => {
      if (tab) chrome.windows.update(tab.windowId, { focused: true });
    });
  },

  jumpToMatch(message) {
    chrome.tabs.update(message.tabId, { active: true }, () => {
      chrome.scripting.executeScript({
        target: { tabId: message.tabId },
        func: highlightSearchTerm,
        args: [message.query]
      });
    });
  },

  addBookmark(message) {
    chrome.bookmarks.create({ title: message.title, url: message.url });
  },

  toggleJS() {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs[0]) return;
      chrome.scripting.executeScript({
        target: { tabId: tabs[0].id },
        func: () => {
          if (document.body.dataset.jsDisabled === 'true') {
            document.body.dataset.jsDisabled = 'false';
            location.reload();
          } else {
            document.body.dataset.jsDisabled = 'true';
            document.querySelectorAll('script').forEach(s => s.remove());
          }
        }
      });
    });
  }
};

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const handler = messageHandlers[message.action];
  if (handler) {
    return handler(message, sender, sendResponse);
  }
});

// --- Tab events: sticky notes restore ---

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status !== 'complete' || !isWebUrl(tab.url)) return;

  let compareUrl;
  try {
    const parsed = new URL(tab.url);
    parsed.hash = '';
    compareUrl = parsed.toString();
  } catch { return; }

  chrome.storage.local.get({ stickyNotes: [] }, ({ stickyNotes }) => {
    const relevantNotes = stickyNotes.filter(n => n.url === compareUrl);
    if (relevantNotes.length === 0) return;
    chrome.tabs.sendMessage(tabId, { action: 'restoreStickyNotes', notes: relevantNotes }, () => {
      void chrome.runtime.lastError;
    });
  });
});

// --- Tab events: auto-grouping (gated by setting) ---

chrome.tabs.onCreated.addListener((tab) => {
  chrome.storage.sync.get(['autoGroupTabs'], (res) => {
    if (!res.autoGroupTabs) return;

    if (!isWebUrl(tab.url)) return;
    const newHostname = safeHostname(tab.url);
    if (!newHostname) return;

    chrome.tabGroups.query({}, (groups) => {
      chrome.tabs.query({}, (allTabs) => {
        for (const group of groups) {
          const groupTabs = allTabs.filter(t => t.groupId === group.id);
          const exampleTab = groupTabs.find(t => isWebUrl(t.url));
          if (!exampleTab) continue;

          if (safeHostname(exampleTab.url) === newHostname) {
            chrome.tabs.group({ tabIds: [tab.id], groupId: group.id }).catch(() => {});
            return;
          }
        }

        chrome.tabs.group({ tabIds: [tab.id] }, async (groupId) => {
          if (chrome.runtime.lastError) return;
          const colors = ['grey', 'blue', 'red', 'green', 'yellow', 'pink', 'purple', 'cyan'];
          try {
            await chrome.tabGroups.update(groupId, {
              title: `${getDisplayNameFromDomain(newHostname)} (1)`,
              collapsed: true,
              color: colors[Math.floor(Math.random() * colors.length)]
            });
          } catch { /* group may have been removed */ }
        });
      });
    });
  });
});

chrome.tabs.onRemoved.addListener((tabId, removeInfo) => {
  if (removeInfo.isWindowClosing) return;

  chrome.storage.sync.get(['autoGroupTabs'], (res) => {
    if (!res.autoGroupTabs) return;

    chrome.tabGroups.query({}, (groups) => {
      groups.forEach((group) => {
        chrome.tabs.query({ groupId: group.id }, (tabsInGroup) => {
          if (tabsInGroup.length === 0) return;
          const hostname = safeHostname(tabsInGroup[0].url);
          if (!hostname) return;
          try {
            chrome.tabGroups.update(group.id, {
              title: `${getDisplayNameFromDomain(hostname)} (${tabsInGroup.length})`
            });
          } catch { /* ignore */ }
        });
      });
    });
  });
});

// --- Cross-tab search helpers (injected into pages) ---

async function searchAllTabs(query, options) {
  const tabs = await chrome.tabs.query({});
  const results = [];

  for (const tab of tabs) {
    if (!isWebUrl(tab.url)) continue;
    try {
      const searchResults = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: searchInPage,
        args: [query, options]
      });
      if (searchResults?.[0]?.result?.length > 0) {
        results.push({
          id: tab.id,
          title: tab.title,
          url: tab.url,
          favIconUrl: tab.favIconUrl,
          matches: searchResults[0].result
        });
      }
    } catch { /* can't inject into some tabs */ }
  }
  return results;
}

function searchInPage(query, options) {
  const matches = [];
  try {
    let pattern;
    if (options.useRegex) {
      pattern = new RegExp(query, options.caseSensitive ? 'g' : 'gi');
    } else {
      const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const wb = options.wholeWords ? '\\b' : '';
      pattern = new RegExp(`${wb}${escaped}${wb}`, options.caseSensitive ? 'g' : 'gi');
    }

    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null, false);
    let node, lineNumber = 1;

    while (node = walker.nextNode()) {
      const text = node.textContent;
      if (pattern.test(text)) {
        text.split('\n').forEach((line, index) => {
          if (pattern.test(line)) {
            matches.push({ line: lineNumber + index, context: line.trim().substring(0, 200) });
          }
        });
      }
      lineNumber += text.split('\n').length - 1;
    }
  } catch { /* invalid regex */ }
  return matches.slice(0, 50);
}

function highlightSearchTerm(query) {
  document.querySelectorAll('.ganj-search-highlight').forEach(el => {
    el.outerHTML = el.innerHTML;
  });

  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null, false);
  const textNodes = [];
  let node;
  while (node = walker.nextNode()) textNodes.push(node);

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

  const first = document.querySelector('.ganj-search-highlight');
  if (first) first.scrollIntoView({ behavior: 'smooth', block: 'center' });
}
