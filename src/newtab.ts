import "./style.css";
import * as monaco from "monaco-editor";
import EditorWorker from "monaco-editor/esm/vs/editor/editor.worker?worker";
import { debounce } from "throttle-debounce";

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
  theme: "vs-dark",
  wordWrap: "on",
});

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
