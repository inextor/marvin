document.addEventListener('DOMContentLoaded', function() {
  document.getElementById('start').addEventListener('click', function() {
    console.log('Start MCP Connection button clicked');
    chrome.runtime.sendMessage({ action: "start" });
  });

  document.getElementById('send').addEventListener('click', function() {
    const message = document.getElementById('message').value;
    chrome.runtime.sendMessage({ action: "send", message: message });
  });

  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "response") {
      document.getElementById('response').innerHTML = request.message;
    } else if (request.action === "mcpStatus") {
      document.getElementById('mcp-status').innerHTML = request.status;
    }
  });

  // Request status when popup loads
  chrome.runtime.sendMessage({ action: 'requestStatus' });
});