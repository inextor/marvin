document.addEventListener('DOMContentLoaded', function() {
  document.getElementById('send').addEventListener('click', function() {
    chrome.runtime.sendNativeMessage('com.my.native_host', {
      text: 'Hello'
    }, function(response) {
      document.getElementById('response').innerHTML = response.text;
    });
  });
});