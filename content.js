chrome.runtime.onMessage.addListener(
  function(request, sender, sendResponse) {
    if (request.action === "getContent") {
      const selector = request.selector || 'body';
      const element = document.querySelector(selector);
      if (element) {
        sendResponse({ content: element.innerHTML });
      } else {
        sendResponse({ content: null });
      }
      // Return true to indicate that the response is sent asynchronously.
      return true;
    }
  }
);