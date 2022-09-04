import { contentKey } from "./constants";

chrome.runtime.onMessage.addListener((request, _, sendResponse) => {
  switch (request.type) {
    case "loadContent":
      chrome.storage.sync.get(contentKey, ({ [contentKey]: content }) => {
        sendResponse({
          content: content || "",
        });
      });
      return true;
    case "saveContent":
      chrome.storage.sync.set({
        [contentKey]: request.payload.content,
      });
      break;
  }
  return;
});
