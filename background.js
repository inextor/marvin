console.log('Background script loaded');

let port;
let currentMcpStatus = 'Disconnected';

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Message received in background script:', request);
  if (request.action === "start") {
    if (!port) {
      console.log('Attempting to connect to native host...');
      port = chrome.runtime.connectNative('com.my.native_host');

      port.onMessage.addListener((msg) => {
        console.log('Message from native host:', msg);
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
        } else if (msg.action === 'mcpStatus') {
          console.log('MCP Status:', msg.status);
          currentMcpStatus = msg.status;
          chrome.runtime.sendMessage({ action: 'mcpStatus', status: msg.status });
        } else if (msg.action === 'response') {
          chrome.runtime.sendMessage({ action: 'response', message: msg.text });
        }
      });

      port.onDisconnect.addListener(() => {
        console.log('Native host disconnected.');
        port = null;
        currentMcpStatus = 'Disconnected';
        chrome.runtime.sendMessage({ action: 'mcpStatus', status: currentMcpStatus });
      });
    } else {
      console.log('Already connected to native host.');
    }
  } else if (request.action === 'requestStatus') {
    console.log('Popup requested status.');
    chrome.runtime.sendMessage({ action: 'mcpStatus', status: currentMcpStatus });
  }
});