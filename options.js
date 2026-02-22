document.addEventListener('DOMContentLoaded', () => {
  const toast = document.getElementById('toast');

  function showToast(message = 'Settings saved') {
    toast.textContent = message;
    toast.classList.add('visible');
    setTimeout(() => toast.classList.remove('visible'), 2000);
  }

  // --- Load all settings ---
  chrome.storage.sync.get([
    'pomodoroSettings', 'showFloatingTimer', 'autoStartNextFocus',
    'autoGroupTabs', 'stickySettings'
  ], (res) => {
    const pomo = res.pomodoroSettings || {};
    document.getElementById('focusDuration').value = pomo.focusDuration || 1500000;
    document.getElementById('shortBreakDuration').value = pomo.shortBreakDuration || 300000;
    document.getElementById('longBreakDuration').value = pomo.longBreakDuration || 900000;
    document.getElementById('autoStartNextFocus').checked = res.autoStartNextFocus ?? false;
    document.getElementById('showFloatingTimer').checked = res.showFloatingTimer !== false;
    document.getElementById('autoGroupTabs').checked = res.autoGroupTabs ?? false;

    const sticky = res.stickySettings || {};
    document.getElementById('enableSticky').checked = sticky.enabled !== false;
    document.getElementById('noteTheme').value = sticky.color || '#fffae6';
    document.getElementById('noteFont').value = sticky.font || 'Arial';
  });

  // --- Auto-save on change ---
  function saveAll() {
    const settings = {
      pomodoroSettings: {
        focusDuration: parseInt(document.getElementById('focusDuration').value),
        shortBreakDuration: parseInt(document.getElementById('shortBreakDuration').value),
        longBreakDuration: parseInt(document.getElementById('longBreakDuration').value)
      },
      autoStartNextFocus: document.getElementById('autoStartNextFocus').checked,
      showFloatingTimer: document.getElementById('showFloatingTimer').checked,
      autoGroupTabs: document.getElementById('autoGroupTabs').checked,
      stickySettings: {
        enabled: document.getElementById('enableSticky').checked,
        color: document.getElementById('noteTheme').value,
        font: document.getElementById('noteFont').value
      }
    };
    chrome.storage.sync.set(settings, () => showToast());
  }

  document.querySelectorAll('select, input[type="checkbox"]').forEach(el => {
    el.addEventListener('change', saveAll);
  });

  // --- Export notes ---
  document.getElementById('exportNotes').addEventListener('click', () => {
    chrome.storage.local.get({ stickyNotes: [] }, ({ stickyNotes }) => {
      const blob = new Blob([JSON.stringify(stickyNotes, null, 2)], { type: 'application/json' });
      downloadBlob(blob, `sticky-notes-${dateStamp()}.json`);
      showToast(`Exported ${stickyNotes.length} notes`);
    });
  });

  // --- Export focus log as CSV ---
  document.getElementById('exportPomodoro').addEventListener('click', () => {
    chrome.storage.local.get({ pomodoroLogs: [] }, ({ pomodoroLogs }) => {
      if (pomodoroLogs.length === 0) return showToast('No focus sessions to export');
      const csv = 'Start,Duration (min),Task\n' + pomodoroLogs.map(l =>
        `"${l.start}",${Math.round((l.duration || 0) / 60000)},"${(l.task || '').replace(/"/g, '""')}"`
      ).join('\n');
      downloadBlob(new Blob([csv], { type: 'text/csv' }), `focus-log-${dateStamp()}.csv`);
      showToast(`Exported ${pomodoroLogs.length} sessions`);
    });
  });

  // --- Clear focus history ---
  document.getElementById('clearPomodoro').addEventListener('click', () => {
    if (!confirm('Delete all focus session history? This cannot be undone.')) return;
    chrome.storage.local.remove('pomodoroLogs', () => showToast('Focus history cleared'));
  });

  // --- Site Tool URLs ---
  const SITE_URL_DEFAULTS = {
    reddit: ['reddit.com'],
    twitter: ['twitter.com', 'x.com'],
    youtube: ['youtube.com'],
    imgur: ['imgur.com'],
    chan: ['4chan.org', '4channel.org']
  };

  const siteUrlFields = {
    reddit: document.getElementById('siteUrlReddit'),
    twitter: document.getElementById('siteUrlTwitter'),
    youtube: document.getElementById('siteUrlYoutube'),
    imgur: document.getElementById('siteUrlImgur'),
    chan: document.getElementById('siteUrlChan'),
  };

  function loadSiteUrls() {
    chrome.storage.sync.get(['siteToolUrls'], (res) => {
      const urls = res.siteToolUrls || SITE_URL_DEFAULTS;
      Object.entries(siteUrlFields).forEach(([key, textarea]) => {
        textarea.value = (urls[key] || []).join('\n');
      });
    });
  }

  function saveSiteUrls() {
    const siteToolUrls = {};
    Object.entries(siteUrlFields).forEach(([key, textarea]) => {
      siteToolUrls[key] = textarea.value.split('\n').map(s => s.trim()).filter(Boolean);
    });
    chrome.storage.sync.set({ siteToolUrls }, () => showToast('Site URLs saved'));
  }

  loadSiteUrls();

  document.getElementById('saveSiteUrls').addEventListener('click', saveSiteUrls);
  document.getElementById('resetSiteUrls').addEventListener('click', () => {
    chrome.storage.sync.set({ siteToolUrls: SITE_URL_DEFAULTS }, () => {
      loadSiteUrls();
      showToast('Reset to defaults');
    });
  });

  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  function dateStamp() {
    return new Date().toISOString().slice(0, 10);
  }
});
