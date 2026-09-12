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

/** Canonical sticky-note page key: origin + pathname (no query/hash). */
function pageKeyFromUrl(url) {
  try {
    const u = new URL(url);
    return u.origin + u.pathname;
  } catch {
    return null;
  }
}

const PAGE_TOOL_FILES = {
  MediaScanner: ['modules/mediaScanner.js'],
  CrossTabSearch: ['modules/crossTabSearch.js']
};

function openPageTool(tabId, globalName) {
  const files = PAGE_TOOL_FILES[globalName];
  if (!files || !tabId) return;
  chrome.scripting.insertCSS({
    target: { tabId },
    files: ['tool-styles.css']
  }, () => {
    void chrome.runtime.lastError;
    chrome.scripting.executeScript({
      target: { tabId },
      files
    }, () => {
      if (chrome.runtime.lastError) return;
      chrome.scripting.executeScript({
        target: { tabId },
        func: (name) => {
          const tool = window[name];
          if (!tool) return;
          if (typeof tool.init === 'function') tool.init();
          if (typeof tool.toggle === 'function') tool.toggle();
        },
        args: [globalName]
      });
    });
  });
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
  if (alarm.name.startsWith('noteReminder-')) {
    chrome.storage.local.get({ noteReminders: {} }, ({ noteReminders }) => {
      const info = noteReminders[alarm.name];
      if (!info) return;
      notify('noteReminder', `📝 ${info.title}`, 'Time to revisit your note!');
      if (info.url) {
        chrome.tabs.query({ url: info.url + '*' }, (tabs) => {
          if (tabs?.length) {
            chrome.tabs.update(tabs[0].id, { active: true });
            chrome.tabs.reload(tabs[0].id);
          } else {
            chrome.tabs.create({ url: info.url });
          }
        });
      }
      delete noteReminders[alarm.name];
      chrome.storage.local.set({ noteReminders });
    });
    return;
  }

  if (alarm.name !== 'pomodoroTimer') return;

  chrome.storage.local.get(['pomodoroState', 'pomodoroLogs'], (localRes) => {
    chrome.storage.sync.get(['autoStartNextFocus', 'pomodoroSettings'], (syncRes) => {
      const state = localRes.pomodoroState;
      const logs = localRes.pomodoroLogs || [];
      const autoStart = syncRes.autoStartNextFocus ?? false;
      const settings = {
        focusDuration: 25 * 60 * 1000,
        shortBreakDuration: 5 * 60 * 1000,
        longBreakDuration: 15 * 60 * 1000,
        sessionsBeforeLongBreak: 4,
        ...(syncRes.pomodoroSettings || {})
      };

      if (!state) return;

      if (state.type === 'focus') {
        logs.push({
          start: new Date(state.startTime).toISOString(),
          duration: state.endTime - state.startTime,
          task: state.task || ''
        });

        const completed = (state.focusCompleted || 0) + 1;
        const useLong = completed % settings.sessionsBeforeLongBreak === 0;
        const breakDuration = useLong
          ? settings.longBreakDuration
          : settings.shortBreakDuration;
        const breakEnd = Date.now() + breakDuration;
        chrome.storage.local.set({
          pomodoroLogs: logs,
          pomodoroState: {
            type: 'break',
            startTime: Date.now(),
            endTime: breakEnd,
            task: '',
            focusCompleted: completed,
            longBreak: useLong
          },
          pomodoroPaused: false,
          pomodoroRemaining: null
        }, () => {
          chrome.alarms.clear('pomodoroTimer', () => {
            chrome.alarms.create('pomodoroTimer', { when: breakEnd });
            notify(
              'focusComplete',
              'Focus Complete!',
              useLong ? 'Time for a long break!' : 'Time to take a break!'
            );
          });
        });

      } else if (state.type === 'break') {
        chrome.alarms.clear('pomodoroTimer', () => {
          if (autoStart) {
            const focusEnd = Date.now() + settings.focusDuration;
            chrome.storage.local.set({
              pomodoroState: {
                type: 'focus',
                startTime: Date.now(),
                endTime: focusEnd,
                task: state.task || '',
                focusCompleted: state.focusCompleted || 0
              },
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
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({ id: 'stickyNote', title: 'Create Note Here', contexts: ['page'] });
    chrome.contextMenus.create({ id: 'annotateSelection', title: 'Annotate Selection', contexts: ['selection'] });
    chrome.contextMenus.create({ id: 'annotateImage', title: 'Annotate Image', contexts: ['image'] });
    chrome.contextMenus.create({ id: 'annotateVideo', title: 'Annotate Video', contexts: ['video'] });
    chrome.contextMenus.create({ id: 'sep1', type: 'separator', contexts: ['page'] });
    chrome.contextMenus.create({ id: 'mediaScanner', title: 'Scan Page Media', contexts: ['page'] });
    chrome.contextMenus.create({ id: 'crossTabSearch', title: 'Search Across Tabs', contexts: ['page'] });
    chrome.contextMenus.create({ id: 'sep2', type: 'separator', contexts: ['page'] });
    chrome.contextMenus.create({ id: 'groupTabs', title: 'Group Tabs by Domain', contexts: ['page'] });
    chrome.contextMenus.create({ id: 'ungroupTabs', title: 'Ungroup All Tabs', contexts: ['page'] });
  });

  chrome.storage.sync.get(['showFloatingTimer'], (res) => {
    if (res.showFloatingTimer === undefined) {
      chrome.storage.sync.set({ showFloatingTimer: false });
    }
  });
});

const TOOL_TOGGLE_MAP = {
  mediaScanner: 'MediaScanner',
  crossTabSearch: 'CrossTabSearch'
};

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (!tab?.id || !isWebUrl(tab.url)) return;

  // Sticky notes
  if (['stickyNote', 'annotateSelection', 'annotateImage', 'annotateVideo'].includes(info.menuItemId)) {
    chrome.tabs.sendMessage(tab.id, { action: 'getClickContext' }, (ctx) => {
      if (chrome.runtime.lastError) return;

      const cleanUrl = pageKeyFromUrl(tab.url);
      if (!cleanUrl) return;

      chrome.storage.sync.get(['stickySettings'], (syncRes) => {
        const color = syncRes.stickySettings?.color || '#fde68a';
        const noteData = {
          x: ctx?.coords?.x || 100, y: ctx?.coords?.y || 100,
          content: '', title: '', tags: [],
          color, url: cleanUrl,
          id: `${Date.now()}-${Math.random()}`,
          collapsed: false
        };

        if (info.menuItemId === 'annotateSelection' && (info.selectionText || ctx?.selection)) {
          noteData.anchorText = (info.selectionText || ctx.selection).trim();
          noteData.anchorKind = 'text';
          noteData.content = `> ${noteData.anchorText}\n\n`;
        }

        // Plain "Create Note" with a live selection also anchors + highlights text
        if (info.menuItemId === 'stickyNote' && (info.selectionText || ctx?.selection)) {
          noteData.anchorText = (info.selectionText || ctx.selection).trim();
          if (noteData.anchorText) {
            noteData.anchorKind = 'text';
            noteData.content = `> ${noteData.anchorText}\n\n`;
          }
        }

        if (info.menuItemId === 'annotateImage' && info.srcUrl) {
          noteData.media = { type: 'image', src: info.srcUrl };
          noteData.anchorKind = 'media';
          noteData.content = `![image](${info.srcUrl})\n\n`;
        }

        if (info.menuItemId === 'annotateVideo' && info.srcUrl) {
          noteData.media = { type: 'video', src: info.srcUrl };
          noteData.anchorKind = 'media';
          noteData.content = `🎥 [Video](${info.srcUrl})\n\n`;
        }

        // In-page highlight target: text selection, else the right-clicked element (incl. img/video)
        if (ctx?.elementSelector && ctx.elementTag && !['HTML', 'BODY'].includes(ctx.elementTag)) {
          const isMedia = ctx.elementTag === 'IMG' || ctx.elementTag === 'VIDEO' || noteData.media;
          if (noteData.anchorText && !isMedia) {
            // text note — highlight comes from anchorText only (no element wrap)
          } else if (isMedia || !noteData.anchorText) {
            noteData.anchorSelector = ctx.elementSelector;
            noteData.anchorKind = isMedia ? 'media' : 'element';
          }
        }
        // Fallback: find media by src if context menu gave srcUrl but no selector
        if (noteData.media?.src && !noteData.anchorSelector) {
          noteData.mediaSrc = noteData.media.src;
        }

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
    return;
  }

  // Tab management
  if (info.menuItemId === 'groupTabs' || info.menuItemId === 'ungroupTabs') {
    const handler = messageHandlers[info.menuItemId];
    if (handler) handler({}, { tab }, () => {});
    return;
  }

  const globalName = TOOL_TOGGLE_MAP[info.menuItemId];
  if (globalName) openPageTool(tab.id, globalName);
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

    const compareUrl = pageKeyFromUrl(url);
    if (!compareUrl) return sendResponse({ notes: [] });

    chrome.storage.local.get({ stickyNotes: [] }, ({ stickyNotes }) => {
      sendResponse({
        notes: stickyNotes.filter(n => pageKeyFromUrl(n.url) === compareUrl)
      });
    });
    return true;
  },

  openPageTool(message, sender, sendResponse) {
    const tabId = message.tabId || sender?.tab?.id;
    if (!tabId || !message.tool) return;
    openPageTool(tabId, message.tool);
    sendResponse({ ok: true });
  },

  groupTabs(message, sender, sendResponse) {
    chrome.tabs.query({ currentWindow: true }, async (tabs) => {
      const groups = {};
      for (const tab of tabs) {
        // Pinned tabs cannot join tab groups — including them fails the whole batch.
        if (tab.pinned) continue;
        const hostname = safeHostname(tab.url);
        if (!hostname) continue;
        const key = getGroupKey(hostname);
        if (!groups[key]) groups[key] = { tabs: [], hostname };
        groups[key].tabs.push(tab);
      }

      for (const key in groups) {
        const { tabs: groupTabs, hostname } = groups[key];
        const tabIds = groupTabs.map(t => t.id).filter(id => id != null);
        if (tabIds.length === 0) continue;

        const subdomains = new Set(
          groupTabs.map(t => parseDomain(safeHostname(t.url)).sub).filter(Boolean)
        );
        let label = getDisplayNameFromDomain(hostname);
        if (subdomains.size > 1) {
          label = getDisplayNameFromDomain(hostname.replace(/^[^.]+\./, ''));
        }

        try {
          let groupId;
          try {
            groupId = await chrome.tabs.group({ tabIds });
          } catch {
            // Partial failure (closed tab, race) — attach what we can one at a time.
            groupId = null;
            for (const id of tabIds) {
              try {
                if (groupId == null) {
                  groupId = await chrome.tabs.group({ tabIds: [id] });
                } else {
                  await chrome.tabs.group({ tabIds: [id], groupId });
                }
              } catch { /* skip this tab */ }
            }
          }
          if (groupId == null) continue;

          const members = (await chrome.tabs.query({ groupId })).length;
          await chrome.tabGroups.update(groupId, {
            title: `${label} · ${members}`,
            collapsed: true,
            color: deterministicColor(key)
          });
        } catch { /* group may have been removed */ }
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

  setNoteReminder(message, sender, sendResponse) {
    if (!message.noteId || !message.delayMs) return;
    const alarmName = `noteReminder-${message.noteId}`;
    chrome.alarms.create(alarmName, { delayInMinutes: message.delayMs / 60000 });
    chrome.storage.local.get({ noteReminders: {} }, ({ noteReminders }) => {
      noteReminders[alarmName] = { url: message.url, title: message.title, noteId: message.noteId };
      chrome.storage.local.set({ noteReminders });
    });
    sendResponse({ ok: true });
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

  const compareUrl = pageKeyFromUrl(tab.url);
  if (!compareUrl) return;

  chrome.storage.sync.get(['stickySettings'], (syncRes) => {
    if (syncRes.stickySettings?.enabled === false) return;

    chrome.storage.local.get({ stickyNotes: [] }, ({ stickyNotes }) => {
      const relevantNotes = stickyNotes.filter(n => pageKeyFromUrl(n.url) === compareUrl);
      if (relevantNotes.length === 0) return;

      // Normalize legacy URLs (with query/hash) to page keys
      let dirty = false;
      relevantNotes.forEach(n => {
        const key = pageKeyFromUrl(n.url);
        if (key && n.url !== key) { n.url = key; dirty = true; }
      });
      if (dirty) {
        chrome.storage.local.set({ stickyNotes });
      }

      const pushRestore = (attempt) => {
        chrome.tabs.sendMessage(tabId, { action: 'restoreStickyNotes', notes: relevantNotes }, () => {
          if (chrome.runtime.lastError && attempt < 8) {
            setTimeout(() => pushRestore(attempt + 1), 250 * (attempt + 1));
          }
        });
      };
      pushRestore(0);
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
      pattern.lastIndex = 0;
      if (!pattern.test(text)) {
        lineNumber += text.split('\n').length - 1;
        continue;
      }
      text.split('\n').forEach((line, index) => {
        pattern.lastIndex = 0;
        if (pattern.test(line)) {
          matches.push({ line: lineNumber + index, context: line.trim().substring(0, 200) });
        }
      });
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
