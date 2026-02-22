// Utility to save, load, delete tab sets using chrome.storage

const TabSetSaver = (() => {
  const STORAGE_KEY = 'tabSets';

  // Fetch all saved sets
  async function getAllSets() {
    return new Promise((resolve) => {
      chrome.storage.local.get([STORAGE_KEY], (res) => {
        resolve(res[STORAGE_KEY] || {});
      });
    });
  }

  // Save current tabs as a new set
  async function saveCurrentTabsAsSet(setName) {
    const tabs = await chrome.tabs.query({ currentWindow: true });
    const urls = tabs.map(tab => ({ title: tab.title, url: tab.url }));
    const sets = await getAllSets();
    sets[setName] = urls;
    await chrome.storage.local.set({ [STORAGE_KEY]: sets });
  }

  // Restore a set
  async function openSet(setName) {
    const sets = await getAllSets();
    const urls = sets[setName] || [];
    for (const tab of urls) {
      await chrome.tabs.create({ url: tab.url });
    }
  }

  // Delete a set
  async function deleteSet(setName) {
    const sets = await getAllSets();
    delete sets[setName];
    await chrome.storage.local.set({ [STORAGE_KEY]: sets });
  }

  return {
    getAllSets,
    saveCurrentTabsAsSet,
    openSet,
    deleteSet
  };
})();

// Make available to popup.js or others
window.TabSetSaver = TabSetSaver;
