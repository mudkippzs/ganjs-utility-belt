const search = document.getElementById('search');
const sortBy = document.getElementById('sortBy');
const notesList = document.getElementById('notesList');
const stats = document.getElementById('stats');

function loadNotes() {
  chrome.storage.local.get({ stickyNotes: [] }, ({ stickyNotes }) => {
    renderNotes(stickyNotes);
  });
}

function renderNotes(notes) {
  const query = search.value.toLowerCase();
  let filtered = notes.filter(n => {
    if (!query) return true;
    return (n.title || '').toLowerCase().includes(query) ||
           (n.content || '').toLowerCase().includes(query) ||
           (n.url || '').toLowerCase().includes(query) ||
           (n.tags || []).some(t => t.includes(query)) ||
           (n.anchorText || '').toLowerCase().includes(query);
  });

  const sort = sortBy.value;
  filtered.sort((a, b) => {
    if (sort === 'newest') return new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt);
    if (sort === 'oldest') return new Date(a.createdAt) - new Date(b.createdAt);
    if (sort === 'alpha') return (a.title || '').localeCompare(b.title || '');
    if (sort === 'site') return (a.url || '').localeCompare(b.url || '');
    return 0;
  });

  stats.innerHTML = `<span>${filtered.length} note${filtered.length !== 1 ? 's' : ''}</span>
    <span>${new Set(filtered.map(n => n.url)).size} site${new Set(filtered.map(n => n.url)).size !== 1 ? 's' : ''}</span>
    <span>${filtered.reduce((s, n) => s + (n.tags?.length || 0), 0)} tags</span>`;

  if (!filtered.length) {
    notesList.innerHTML = '<div class="empty">No notes found</div>';
    return;
  }

  const grouped = {};
  filtered.forEach(n => {
    let site;
    try { site = new URL(n.url).hostname; } catch { site = 'Unknown'; }
    if (!grouped[site]) grouped[site] = [];
    grouped[site].push(n);
  });

  notesList.innerHTML = Object.entries(grouped).map(([site, notes]) => `
    <div class="site-group">
      <div class="site-header">
        <span class="site-name">${escapeHtml(site)}</span>
        <span class="site-count">${notes.length}</span>
      </div>
      ${notes.map(n => {
        const excerpt = (n.content || '').substring(0, 120).replace(/\n/g, ' ');
        const icon = n.media ? (n.media.type === 'image' ? '🖼️' : '🎥') : (n.anchorText ? '📌' : '📝');
        const tags = (n.tags || []).map(t => `<span class="note-tag">${escapeHtml(t)}</span>`).join(' ');
        const time = new Date(n.updatedAt || n.createdAt).toLocaleDateString();
        return `<div class="note-card" data-url="${escapeHtml(n.url)}" style="border-left-color:${n.color || '#fde68a'};">
          ${n.anchorText ? `<div class="note-anchor">📌 "${escapeHtml(n.anchorText.substring(0, 80))}"</div>` : ''}
          <div class="note-title">${icon} ${escapeHtml(n.title || 'Untitled')}</div>
          <div class="note-excerpt">${escapeHtml(excerpt)}</div>
          <div class="note-meta">
            <span>${time}</span>
            ${tags}
            ${n.reminder ? '<span>⏰</span>' : ''}
          </div>
        </div>`;
      }).join('')}
    </div>
  `).join('');

  notesList.querySelectorAll('.note-card').forEach(card => {
    card.addEventListener('click', () => {
      const url = card.dataset.url;
      if (url) chrome.tabs.create({ url });
    });
  });
}

function escapeHtml(text) {
  const d = document.createElement('div');
  d.textContent = text || '';
  return d.innerHTML;
}

search.addEventListener('input', loadNotes);
sortBy.addEventListener('change', loadNotes);

document.getElementById('exportAll').addEventListener('click', () => {
  chrome.storage.local.get({ stickyNotes: [] }, ({ stickyNotes }) => {
    const blob = new Blob([JSON.stringify(stickyNotes, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `notes-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  });
});

document.getElementById('clearAll').addEventListener('click', () => {
  if (!confirm('Delete ALL notes? This cannot be undone.')) return;
  chrome.storage.local.set({ stickyNotes: [] }, loadNotes);
});

loadNotes();
