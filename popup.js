document.addEventListener('DOMContentLoaded', function() {
  const tabListContainer = document.getElementById('tab-list');

  // 1. Fetch and display the list of tabs when the popup opens
  chrome.runtime.sendMessage({ action: "popupGetTitles" }, (tabs) => {
    if (chrome.runtime.lastError) {
        tabListContainer.textContent = 'Error loading tabs.';
        console.error(chrome.runtime.lastError);
        return;
    }
    if (tabs && tabs.length > 0) {
      tabs.forEach(tab => {
        const tabElement = document.createElement('div');
        tabElement.textContent = tab.title;
        tabElement.dataset.tabId = tab.id; // Store tab ID
        tabElement.style.borderBottom = "1px solid #eee";
        tabElement.style.padding = "5px";
        tabListContainer.appendChild(tabElement);
      });
    } else {
      tabListContainer.textContent = 'No tabs found.';
    }
  });

  // 2. Add a single click listener to the container
  tabListContainer.addEventListener('click', (event) => {
    const target = event.target;
    if (target && target.dataset.tabId) {
      const tabId = parseInt(target.dataset.tabId, 10);
      console.log(`Requesting H1 content for tabId: ${tabId}`);
      
      // 3. Request content for the clicked tab
      chrome.runtime.sendMessage({ action: "popupGetContent", tabId: tabId }, (response) => {
        if (chrome.runtime.lastError) {
            console.error('Error getting content:', chrome.runtime.lastError.message);
            return;
        }
        console.log('Response from content script:', response);
      });
    }
  });

  // Keep original functionality for MCP connection if needed
  document.getElementById('start').addEventListener('click', function() {
    chrome.runtime.sendMessage({ action: "start" });
  });
});
