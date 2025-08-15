let port;

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "start") {
    if (!port) {
      port = chrome.runtime.connectNative('com.my.native_host');

      port.onMessage.addListener((msg) => {
        if (msg.action === 'getBrowserContent') {
          chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0]) {
              chrome.scripting.executeScript({
                target: { tabId: tabs[0].id },
                function: () => {
                  const h1 = document.querySelector('h1');
                  return h1 ? h1.textContent : '';
                }
              }, (results) => {
                const h1Content = results[0].result;
                port.postMessage({ action: 'response', id: msg.id, data: h1Content });
              });
            }
          });
        }
      });

      port.onDisconnect.addListener(() => {
        port = null;
      });
    }
  }
});