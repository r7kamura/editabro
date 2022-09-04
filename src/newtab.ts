import "./style.css";
import { monaco } from "./editor";
import { MarkdownExtension } from "./extensions";
import EditorWorker from "monaco-editor/esm/vs/editor/editor.worker?worker";
import { debounce } from "throttle-debounce";
import { contentKey } from "./constants";

declare global {
  interface Window {
    MonacoEnvironment: any;
  }
}

self.MonacoEnvironment = {
  getWorker() {
    return new EditorWorker();
  },
};

const element = document.getElementById("editor")!;

const editor = monaco.editor.create(element, {
  autoIndent: "full",
  automaticLayout: true,
  fontSize: 18,
  language: "markdown",
  lineDecorationsWidth: 0,
  lineHeight: 1.6,
  minimap: { enabled: false },
  padding: { bottom: 16, top: 16 },
  quickSuggestions: false,
  wordWrap: "on",
});

const extension = new MarkdownExtension();
extension.activate(editor);

const debounceFunction = debounce(400, () => {
  const content = editor.getValue();
  chrome.runtime.sendMessage({
    payload: { content },
    type: "saveContent",
  });
});

editor.onDidChangeModelContent(debounceFunction);

chrome.runtime.sendMessage({ type: "loadContent" }, ({ content }) => {
  editor.setValue(content);
});

chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace !== "sync") return;
  const content = changes[contentKey];
  if (!content) return;
  const { newValue } = content;
  if (editor.getValue() === newValue) return;
  editor.setValue(newValue);
});

if (window.matchMedia) {
  setTheme(window.matchMedia("(prefers-color-scheme: dark)").matches);
}

window
  .matchMedia("(prefers-color-scheme: dark)")
  .addEventListener("change", (event) => {
    setTheme(event.matches);
  });

function setTheme(isDark: boolean) {
  const theme = themeFor(isDark);
  monaco.editor.setTheme(theme);
}

function themeFor(isDark: boolean) {
  return isDark ? "vs-dark" : "vs";
}
