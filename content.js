chrome.runtime.onMessage.addListener((request) => {
  if (request.action === "change-bg") {
    document.body.style.backgroundColor = "red";
  }
});