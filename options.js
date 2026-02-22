document.addEventListener('DOMContentLoaded', () => {
  chrome.storage.sync.get(['stickySettings'], ({ stickySettings }) => {
    if (stickySettings) {
      document.getElementById('enableSticky').checked = stickySettings.enabled;
      document.getElementById('noteTheme').value = stickySettings.color;
      document.getElementById('noteFont').value = stickySettings.font;
    }
  });

  document.querySelectorAll('input, select').forEach(el => {
    el.addEventListener('change', () => {
      const settings = {
        enabled: document.getElementById('enableSticky').checked,
        color: document.getElementById('noteTheme').value,
        font: document.getElementById('noteFont').value
      };
      chrome.storage.sync.set({ stickySettings: settings });
    });
  });

  // Export notes to JSON
  document.getElementById('exportNotes').addEventListener('click', () => {
    chrome.storage.local.get({ stickyNotes: [] }, ({ stickyNotes }) => {
      const blob = new Blob([JSON.stringify(stickyNotes, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const date = new Date().toISOString().replace(/[:.]/g, '-');
      a.href = url;
      a.download = `sticky-notes-export-${date}.json`;
      a.click();
      URL.revokeObjectURL(url);
    });
  });
});
