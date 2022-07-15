chrome.runtime.onMessage.addListener((request, _, sendResponse) => {
  switch (request.type) {
    case "saveContent":
      chrome.storage.sync.set({
        content: request.payload.content,
      });
      break;
    case "loadContent":
      chrome.storage.sync.get("content", ({ content }) => {
        sendResponse({
          content: content || "",
        });
      });
      return true;
  }
  return;
});
