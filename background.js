let port;

function ensureConnected() {
  if (!port) {
    port = chrome.runtime.connectNative('com.my.native_host');

    port.onMessage.addListener((msg) => {
      chrome.runtime.sendMessage({ action: "response", message: msg.text });
    });

    port.onDisconnect.addListener(() => {
      port = null;
    });
  }
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "send") {
    ensureConnected();
    port.postMessage({ text: request.message });
  }
});