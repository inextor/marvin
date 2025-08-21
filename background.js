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
    const tabInfo = tabs.filter(tab => tab.id).map(tab => ({ id: tab.id, title: tab.title }));
    port.postMessage({ action: 'response', id: requestId, data: tabInfo });
  } catch (e) {
    port.postMessage({ action: 'response', id: requestId, error: e.message });
  }
}

/**
 * Handles the getContent request from the native host.
 * Forwards the request to the appropriate content script.
 * @param {string} requestId - The ID of the original request.
 * @param {number} tabId - The ID of the target tab.
 * @param {string} selector - The CSS selector to query.
 */
async function handleGetContent(requestId, tabId, selector) {
  try {
    // Ensure the tab exists before sending a message
    await chrome.tabs.get(tabId);
    const response = await chrome.tabs.sendMessage(tabId, { action: "getContent", selector: selector });
    port.postMessage({ action: 'response', id: requestId, data: response });
  } catch (e) {
    port.postMessage({ action: 'response', id: requestId, error: `Failed to get content from tab ${tabId}: ${e.message}` });
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
        default:
            console.log(`Unknown action received: ${msg.action}`);
            port.postMessage({ action: 'response', id: msg.id, error: `Unknown action: ${msg.action}` });
            break;
    }
}

/**
 * Handles disconnection from the native host.
 */
function onDisconnected() {
    console.log(`Native host disconnected: ${chrome.runtime.lastError ? chrome.runtime.lastError.message : "No error message"}`);
    port = null;
    chrome.runtime.sendMessage({ action: 'statusUpdate', isConnected: false }).catch(() => {});
}

// --- Popup Communication ---

/**
 * Listens for messages from other parts of the extension, like the popup.
 */
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.action === 'start') {
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
                const response = await chrome.tabs.sendMessage(msg.tabId, { action: "getContent", selector: "h1" });
                sendResponse(response);
            } catch (e) {
                sendResponse({ error: e.message });
            }
        })();
        return true; // Indicate async response
    }
});