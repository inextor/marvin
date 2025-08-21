// Global variable to hold the native messaging port
let port = null;

// --- Action Handlers ---

/**
 * Handles the getTitles request from the native host.
 * Queries all tabs and sends back their ID and title.
 * @param {string} requestId - The ID of the original request.
 */
async function handleGetTitles(requestId) {
  try {
    const tabs = await chrome.tabs.query({});
    if (tabs.length === 0) {
        // Provide a specific message when no tabs are available
        port.postMessage({ action: 'response', id: requestId, data: { message: "No tabs found." } });
        return;
    }
    const tabInfo = tabs.filter(tab => tab.id).map(tab => ({ id: tab.id, title: tab.title }));
    port.postMessage({ action: 'response', id: requestId, data: tabInfo });
  } catch (e) {
    port.postMessage({ action: 'response', id: requestId, error: e.message });
  }
}

/**
 * Injects and executes a function in a tab to get content from the DOM.
 * @param {number} tabId - The ID of the target tab.
 * @param {string} selector - The CSS selector to query.
 * @returns {Promise<object>} - A promise that resolves with the content or an error.
 */
async function getContentFromTab(tabId, selector) {
    const results = await chrome.scripting.executeScript({
        target: { tabId: tabId },
        func: (sel) => {
            const element = document.querySelector(sel);
            if (element) {
                const clone = element.cloneNode(true);
                clone.removeAttribute('style');
                const descendants = clone.querySelectorAll('*');
                descendants.forEach(desc => desc.removeAttribute('style'));
                return { content: clone.outerHTML };
            }
            // More specific error when element is not found
            return { error: `Selector "${sel}" did not match any elements.` };
        },
        args: [selector],
    });

    // Error handling for injection results
    if (chrome.runtime.lastError) {
        // Handle cases where script injection itself fails
        return { error: `Failed to inject script into tab ${tabId}: ${chrome.runtime.lastError.message}` };
    }

    // The result from executeScript is an array of InjectionResult objects.
    // We expect one result from our single injection.
    return results[0].result;
}

/**
 * Handles the getContent request from the native host.
 * @param {string} requestId - The ID of the original request.
 * @param {number} tabId - The ID of the target tab.
 * @param {string} selector - The CSS selector to query.
 */
async function handleGetContent(requestId, tabId, selector) {
  try {
    const result = await getContentFromTab(tabId, selector);
    // Check if the result from the tab contains an error
    if (result.error) {
        port.postMessage({ action: 'response', id: requestId, error: result.error });
    } else {
        port.postMessage({ action: 'response', id: requestId, data: result });
    }
  } catch (e) {
    port.postMessage({ action: 'response', id: requestId, error: `Failed to get content from tab ${tabId}: ${e.message}` });
  }
}

/**
 * Handles the getTabContent request from the native host.
 * Finds a tab by title (case-insensitive substring match), and returns the innerHTML of an element matching the provided CSS selector.
 * @param {string} requestId - The ID of the original request.
 * @param {string} title - The title (or substring) of the target tab.
 * @param {string} query - The CSS selector to query within the tab.
 */
async function handleGetTabContent(requestId, title, query) {
  try {
    const allTabs = await chrome.tabs.query({});
    const lowerCaseTitle = title.toLowerCase();

    const matchingTabs = allTabs.filter(tab =>
      tab.title && tab.title.toLowerCase().includes(lowerCaseTitle)
    );

    if (matchingTabs.length === 0) {
      port.postMessage({ action: 'response', id: requestId, error: `No tab found with title containing: "${title}"` });
      return;
    }
    const targetTab = matchingTabs[0]; // Assuming the first matching tab is sufficient

    const results = await chrome.scripting.executeScript({
      target: { tabId: targetTab.id },
      func: (sel) => {
        const element = document.querySelector(sel);
        if (element) {
          // Create a temporary div to hold the content for processing
          const tempDiv = document.createElement('div');
          tempDiv.innerHTML = element.innerHTML;

          // Remove all style attributes
          tempDiv.querySelectorAll('*').forEach(el => {
            el.removeAttribute('style');
          });

          // Remove all empty attributes
          tempDiv.querySelectorAll('*').forEach(el => {
            Array.from(el.attributes).forEach(attr => {
              if (attr.value === '') {
                el.removeAttribute(attr.name);
              }
            });
          });

          return { content: tempDiv.innerHTML };
        } else {
          return { error: `CSS selector "${sel}" did not match any elements.` };
        }
      },
      args: [query],
    });

    if (chrome.runtime.lastError) {
      port.postMessage({ action: 'response', id: requestId, error: `Failed to inject script into tab ${targetTab.id}: ${chrome.runtime.lastError.message}` });
      return;
    }

    const scriptResult = results[0].result;
    if (scriptResult.error) {
      port.postMessage({ action: 'response', id: requestId, error: scriptResult.error });
    } else {
      port.postMessage({ action: 'response', id: requestId, data: scriptResult });
    }
  } catch (e) {
    port.postMessage({ action: 'response', id: requestId, error: `Failed to get tab content: ${e.message}` });
  }
}


// --- Native Host Communication ---

/**
 * Routes incoming messages from the native host to the correct handler.
 * @param {object} msg - The message from the native host.
 */
function onNativeMessage(msg) {
    console.log('Received message from native host:', msg);
    switch (msg.action) {
        case 'getTitles':
            handleGetTitles(msg.id);
            break;
        case 'getContent':
            if (msg.params && msg.params.tabId) {
                handleGetContent(msg.id, msg.params.tabId, msg.params.selector);
            } else {
                port.postMessage({ action: 'response', id: msg.id, error: 'Missing tabId for getContent' });
            }
            break;
        case 'getTabContent':
            if (msg.params && msg.params.title && msg.params.query) {
                handleGetTabContent(msg.id, msg.params.title, msg.params.query);
            } else {
                port.postMessage({ action: 'response', id: msg.id, error: 'Missing title or query for getTabContent' });
            }
            break;
        default:
            console.log(`Unknown action received: ${msg.action}`);
            port.postMessage({ action: 'response', id: msg.id, error: `Unknown action: ${msg.action}` });
            break;
    }
}

let reconnectTimer = null;

/**
 * Schedules a reconnection attempt after a delay.
 */
function scheduleReconnect() {
    if (reconnectTimer) {
        clearTimeout(reconnectTimer);
    }
    // Try to reconnect every 5 seconds
    reconnectTimer = setTimeout(reconnect, 5000);
}

/**
 * Tries to reconnect to the native host.
 */
function reconnect() {
    if (port) {
        console.log("Already connected, cancelling reconnect.");
        if (reconnectTimer) {
            clearTimeout(reconnectTimer);
            reconnectTimer = null;
        }
        return;
    }
    console.log("Attempting to reconnect to native host...");
    port = chrome.runtime.connectNative("com.my.native_host");
    port.onMessage.addListener(onNativeMessage);
    port.onDisconnect.addListener(onDisconnected);
}

/**
 * Handles disconnection from the native host.
 */
function onDisconnected() {
    console.log(`Native host disconnected: ${chrome.runtime.lastError ? chrome.runtime.lastError.message : "No error message"}`);
    port = null;
    chrome.runtime.sendMessage({ action: 'statusUpdate', isConnected: false }).catch(() => {});
    // Schedule a reconnection attempt
    scheduleReconnect();
}

// --- Popup Communication ---

/**
 * Listens for messages from other parts of the extension, like the popup.
 */
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.action === 'start') {
        // If a reconnect timer is running, cancel it
        if (reconnectTimer) {
            clearTimeout(reconnectTimer);
            reconnectTimer = null;
        }
        if (port) {
            console.log('Already connected to native host.');
            sendResponse({ isConnected: true });
            return true;
        }
        console.log('Connecting to native host...');
        port = chrome.runtime.connectNative("com.my.native_host");
        port.onMessage.addListener(onNativeMessage);
        port.onDisconnect.addListener(onDisconnected);
        sendResponse({ isConnected: true });
    } else if (msg.action === 'requestStatus') {
        sendResponse({ isConnected: !!port });
    } else if (msg.action === 'popupGetTitles') {
        (async () => {
            const tabs = await chrome.tabs.query({});
            const tabInfo = tabs.filter(tab => tab.id && tab.title).map(tab => ({ id: tab.id, title: tab.title }));
            sendResponse(tabInfo);
        })();
        return true; // Indicate async response
    } else if (msg.action === 'popupGetContent') {
        (async () => {
            try {
                const response = await getContentFromTab(msg.tabId, "h1");
                sendResponse(response);
            } catch (e) {
                sendResponse({ error: e.message });
            }
        })();
        return true; // Indicate async response
    }
});
