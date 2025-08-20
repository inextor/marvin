// Global variable to hold the native messaging port
let port = null;

// --- Listen for messages from the native host ---
function onNativeMessage(msg) {
    console.log('Received message from native host:', msg);
    // This is where the request from mcp-server.js arrives
    if (msg.action === 'getBrowserContent') {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs.length === 0) {
                port.postMessage({ action: 'response', id: msg.id, data: 'No active tab found.' });
                return;
            }
            // Execute a script in the active tab to get its title
            chrome.scripting.executeScript({
                target: { tabId: tabs[0].id },
                function: () => {
                    return document.title;
                }
            }, (results) => {
                // Send the result back to the native host
                const title = results && results[0] ? results[0].result : 'Could not get title.';
                port.postMessage({ action: 'response', id: msg.id, data: title });
            });
        });
    }
}

// --- Handle disconnection ---
function onDisconnected() {
    console.log(`Native host disconnected: ${chrome.runtime.lastError ? chrome.runtime.lastError.message : "No error message"}`);
    port = null;
    // Notify the popup that we are disconnected
    chrome.runtime.sendMessage({ action: 'statusUpdate', isConnected: false }).catch(() => {});
}

// --- Listen for messages from the popup ---
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.action === 'start') {
        if (port) {
            console.log('Already connected.');
            sendResponse({ isConnected: true });
            return;
        }
        console.log('Connecting to native host...');
        port = chrome.runtime.connectNative("com.my.native_host");
        port.onMessage.addListener(onNativeMessage);
        port.onDisconnect.addListener(onDisconnected);
        // We can't know if it's truly connected yet, but we can be optimistic
        // The onDisconnected handler will correct the state if it fails
        sendResponse({ isConnected: true }); 
    } else if (msg.action === 'requestStatus') {
        sendResponse({ isConnected: !!port });
    }
    return true; // Required for async sendResponse
});
