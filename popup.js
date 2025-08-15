document.addEventListener('DOMContentLoaded', function() {
  document.getElementById('send').addEventListener('click', function() {
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
      chrome.scripting.executeScript({
        target: { tabId: tabs[0].id },
        function: () => {
          const h1 = document.querySelector('h1');
          return h1 ? h1.textContent : '';
        }
      }, (results) => {
        const h1Content = results[0].result;
        chrome.runtime.sendNativeMessage('com.my.native_host', {
          text: h1Content
        }, function(response) {
          document.getElementById('response').innerHTML = response.text;
        });
      });
    });
  });
});