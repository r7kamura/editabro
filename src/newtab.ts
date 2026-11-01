import "./style.css";
import { debounce } from "throttle-debounce";
import { contentKey } from "./constants";
import { diff } from "./sync";

const editor = document.getElementById("editor") as HTMLTextAreaElement;

// Values this tab saved, so their storage change events can be ignored.
const saved = new Set<string>();
let pending: string | null = null;
let composing = false;

const save = debounce(400, () => {
  const content = editor.value;
  saved.add(content);
  if (saved.size > 20) saved.delete(saved.values().next().value!);
  chrome.runtime.sendMessage({ payload: { content }, type: "saveContent" });
});

editor.addEventListener("input", () => {
  // Local edits win over content from other tabs not yet applied.
  pending = null;
  save();
});
editor.addEventListener("compositionstart", () => (composing = true));
editor.addEventListener("compositionend", () => (composing = false));
editor.addEventListener("blur", () => {
  if (pending !== null) applyRemote(pending);
});

// Apply content from storage without replacing the whole value, and never
// while the user is typing or composing, so the cursor and IME stay intact.
function applyRemote(content: string) {
  if (document.activeElement === editor || composing) {
    pending = content;
    return;
  }
  pending = null;
  replaceWith(content);
}

function replaceWith(content: string) {
  const change = diff(editor.value, content);
  if (!change) return;
  editor.setRangeText(change.insert, change.from, change.to, "preserve");
}

chrome.runtime.sendMessage({ type: "loadContent" }, ({ content }) => {
  replaceWith(content);
  editor.setSelectionRange(0, 0);
  editor.focus();
});

chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace !== "sync") return;
  const content = changes[contentKey];
  if (!content) return;
  if (saved.has(content.newValue)) return;
  if (content.newValue === editor.value) {
    pending = null;
    return;
  }
  applyRemote(content.newValue);
});
