const MULTI_PART_TLDS = [
  'co.uk', 'org.uk', 'gov.uk', 'ac.uk', 'me.uk', 'net.uk',
  'com.au', 'net.au', 'org.au', 'edu.au',
  'co.in', 'net.in', 'org.in',
  'co.nz', 'net.nz', 'org.nz',
  'co.za', 'co.jp', 'co.kr',
  'com.br', 'com.mx', 'com.ar', 'com.cn', 'com.tw', 'com.hk',
  'com.sg', 'com.my', 'com.ph', 'com.pk', 'com.ng', 'com.eg',
  'com.tr', 'com.ua', 'com.pl'
];

const KNOWN_BRANDS = {
  'google': 'Google', 'github': 'GitHub', 'youtube': 'YouTube',
  'stackoverflow': 'StackOverflow', 'gitlab': 'GitLab', 'linkedin': 'LinkedIn',
  'reddit': 'Reddit', 'twitter': 'Twitter', 'facebook': 'Facebook',
  'instagram': 'Instagram', 'whatsapp': 'WhatsApp', 'wikipedia': 'Wikipedia',
  'microsoft': 'Microsoft', 'openai': 'OpenAI', 'amazon': 'Amazon',
  'netflix': 'Netflix', 'spotify': 'Spotify', 'twitch': 'Twitch',
  'discord': 'Discord', 'slack': 'Slack', 'notion': 'Notion',
  'figma': 'Figma', 'vercel': 'Vercel', 'netlify': 'Netlify',
  'cloudflare': 'Cloudflare', 'digitalocean': 'DigitalOcean',
  'bitbucket': 'Bitbucket', 'npmjs': 'npm', 'pypi': 'PyPI',
  'localhost': 'Localhost'
};

function parseDomain(hostname) {
  if (!hostname) return { base: '', domain: '', sub: '' };

  if (/^(\d{1,3}\.){3}\d{1,3}$/.test(hostname) || hostname === 'localhost') {
    return { base: hostname, domain: hostname, sub: '' };
  }

  const parts = hostname.split('.');
  if (parts.length < 2) return { base: hostname, domain: hostname, sub: '' };

  const tld2 = parts.slice(-2).join('.');
  const isMultiTLD = MULTI_PART_TLDS.includes(tld2);

  const domainIndex = isMultiTLD ? -3 : -2;
  const domain = parts.slice(domainIndex, domainIndex + 1)[0] || hostname;
  const sub = parts.slice(0, domainIndex).filter(s => s && s !== 'www').join('.');
  const base = parts.slice(domainIndex).join('.');

  return { base, domain, sub };
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function getDisplayNameFromDomain(hostname) {
  const { domain, sub } = parseDomain(hostname);
  const brandName = KNOWN_BRANDS[domain.toLowerCase()] || capitalize(domain);

  if (!sub) return brandName;

  const subLabel = sub.split('.').map(capitalize).join(' ');
  return `${brandName} ${subLabel}`;
}

function getGroupKey(hostname) {
  return parseDomain(hostname).base;
}

function deterministicColor(str) {
  const colors = ['grey', 'blue', 'red', 'green', 'yellow', 'pink', 'purple', 'cyan'];
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
  }
  return colors[Math.abs(hash) % colors.length];
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
        const key = getGroupKey(hostname);
        if (!groups[key]) groups[key] = { tabs: [], hostname };
        groups[key].tabs.push(tab);
      }

      for (const key in groups) {
        const { tabs: groupTabs, hostname } = groups[key];
        const tabIds = groupTabs.map(t => t.id);

        const subdomains = new Set(
          groupTabs.map(t => parseDomain(safeHostname(t.url)).sub).filter(Boolean)
        );
        let label = getDisplayNameFromDomain(hostname);
        if (subdomains.size > 1) {
          label = getDisplayNameFromDomain(hostname.replace(/^[^.]+\./, ''));
        }

        try {
          const groupId = await chrome.tabs.group({ tabIds });
          await chrome.tabGroups.update(groupId, {
            title: `${label} · ${tabIds.length}`,
            collapsed: true,
            color: deterministicColor(key)
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
  },

  injectScripts(message, sender, sendResponse) {
    if (!sender.tab?.id || !Array.isArray(message.files)) return;
    chrome.scripting.executeScript({
      target: { tabId: sender.tab.id },
      files: message.files
    }, () => {
      sendResponse(chrome.runtime.lastError ? { error: chrome.runtime.lastError.message } : { ok: true });
    });
    return true;
  },

  fetchUrl(message, sender, sendResponse) {
    if (!message.url) return;
    const start = Date.now();
    const opts = message.options || {};
    fetch(message.url, opts).then(async (res) => {
      const body = await res.text();
      sendResponse({
        status: res.status,
        statusText: res.statusText,
        headers: Object.fromEntries(res.headers.entries()),
        body,
        time: Date.now() - start
      });
    }).catch(err => {
      sendResponse({ error: err.message, time: Date.now() - start });
    });
    return true;
  },

  executeInPage(message, sender, sendResponse) {
    if (!sender.tab?.id || !message.code) return;
    chrome.scripting.executeScript({
      target: { tabId: sender.tab.id },
      world: 'MAIN',
      func: (code) => {
        const logs = [];
        const oL = console.log, oE = console.error, oW = console.warn;
        console.log = function() { logs.push({ t: 'log', v: Array.from(arguments).map(String).join(' ') }); oL.apply(console, arguments); };
        console.error = function() { logs.push({ t: 'error', v: Array.from(arguments).map(String).join(' ') }); oE.apply(console, arguments); };
        console.warn = function() { logs.push({ t: 'warn', v: Array.from(arguments).map(String).join(' ') }); oW.apply(console, arguments); };
        try {
          const val = (0, eval)(code);
          return { value: val === undefined ? undefined : String(val), logs };
        } catch (e) {
          return { error: e.message, logs };
        } finally {
          console.log = oL; console.error = oE; console.warn = oW;
        }
      },
      args: [message.code]
    }, (results) => {
      if (chrome.runtime.lastError) {
        sendResponse({ error: chrome.runtime.lastError.message });
      } else {
        sendResponse(results?.[0]?.result || { error: 'No result' });
      }
    });
    return true;
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

function autoGroupTab(tabId, url) {
  chrome.storage.sync.get(['autoGroupTabs'], (res) => {
    if (!res.autoGroupTabs) return;
    if (!isWebUrl(url)) return;

    const hostname = safeHostname(url);
    if (!hostname) return;
    const key = getGroupKey(hostname);

    chrome.tabGroups.query({}, (groups) => {
      chrome.tabs.query({}, (allTabs) => {
        for (const group of groups) {
          const member = allTabs.find(t => t.groupId === group.id && isWebUrl(t.url));
          if (!member) continue;

          if (getGroupKey(safeHostname(member.url)) === key) {
            chrome.tabs.group({ tabIds: [tabId], groupId: group.id }).then(() => {
              updateGroupLabel(group.id);
            }).catch(() => {});
            return;
          }
        }

        chrome.tabs.group({ tabIds: [tabId] }, async (groupId) => {
          if (chrome.runtime.lastError) return;
          try {
            await chrome.tabGroups.update(groupId, {
              title: `${getDisplayNameFromDomain(hostname)} · 1`,
              collapsed: false,
              color: deterministicColor(key)
            });
          } catch { /* group may have been removed */ }
        });
      });
    });
  });
}

function updateGroupLabel(groupId) {
  chrome.tabs.query({ groupId }, (tabsInGroup) => {
    if (!tabsInGroup || tabsInGroup.length === 0) return;

    const hostnames = tabsInGroup
      .map(t => safeHostname(t.url))
      .filter(Boolean);
    if (hostnames.length === 0) return;

    const key = getGroupKey(hostnames[0]);
    const subdomains = new Set(hostnames.map(h => parseDomain(h).sub).filter(Boolean));

    let label;
    if (subdomains.size > 1) {
      label = getDisplayNameFromDomain(parseDomain(hostnames[0]).base);
    } else {
      label = getDisplayNameFromDomain(hostnames[0]);
    }

    try {
      chrome.tabGroups.update(groupId, {
        title: `${label} · ${tabsInGroup.length}`
      });
    } catch { /* ignore */ }
  });
}

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.url && isWebUrl(changeInfo.url)) {
    autoGroupTab(tabId, changeInfo.url);
  }
});

chrome.tabs.onRemoved.addListener((tabId, removeInfo) => {
  if (removeInfo.isWindowClosing) return;

  chrome.storage.sync.get(['autoGroupTabs'], (res) => {
    if (!res.autoGroupTabs) return;

    chrome.tabGroups.query({}, (groups) => {
      groups.forEach((group) => updateGroupLabel(group.id));
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
