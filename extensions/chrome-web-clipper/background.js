let selectedText = '';
let activeUrl = '';

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "TEXT_SELECTED") {
    selectedText = message.text;
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        activeUrl = tabs[0].url;
      }
    });
    // Optional: return true; if we were to use sendResponse asynchronously here
  } else if (message.type === "GET_CLIPBOARD_DATA") {
    sendResponse({ text: selectedText, url: activeUrl });
    selectedText = '';
    activeUrl = '';
    return true; // Indicate that sendResponse will be called asynchronously
  }
});
