import "./style.css";
import { Compartment, EditorState, Transaction } from "@codemirror/state";
import {
  EditorView,
  keymap,
  drawSelection,
  highlightActiveLine,
  highlightSpecialChars,
} from "@codemirror/view";
import {
  defaultKeymap,
  history,
  historyKeymap,
  indentWithTab,
} from "@codemirror/commands";
import {
  bracketMatching,
  defaultHighlightStyle,
  indentOnInput,
  syntaxHighlighting,
} from "@codemirror/language";
import { markdown } from "@codemirror/lang-markdown";
import { highlightSelectionMatches, searchKeymap } from "@codemirror/search";
import { closeBrackets, closeBracketsKeymap } from "@codemirror/autocomplete";
import { oneDark } from "@codemirror/theme-one-dark";
import { debounce } from "throttle-debounce";
import { contentKey } from "./constants";
import { diff } from "./sync";

function wrap(marker: string) {
  return (view: EditorView) => {
    view.dispatch(
      view.state.changeByRange((range) => {
        const text = view.state.sliceDoc(range.from, range.to);
        const n = marker.length;
        if (
          text.length >= n * 2 &&
          text.startsWith(marker) &&
          text.endsWith(marker)
        ) {
          return {
            changes: {
              from: range.from,
              to: range.to,
              insert: text.slice(n, -n),
            },
            range: range.extend(range.from, range.to - n * 2),
          };
        }
        return {
          changes: [
            { from: range.from, insert: marker },
            { from: range.to, insert: marker },
          ],
          range: range.empty
            ? range.extend(range.from + n)
            : range.extend(range.from, range.to + n * 2),
        };
      })
    );
    return true;
  };
}

const theme = new Compartment();
const darkQuery = window.matchMedia("(prefers-color-scheme: dark)");
const themeFor = (isDark: boolean) => (isDark ? oneDark : []);

// Values this tab saved, so their storage change events can be ignored.
const saved = new Set<string>();

const save = debounce(400, () => {
  const content = view.state.doc.toString();
  saved.add(content);
  if (saved.size > 20) saved.delete(saved.values().next().value!);
  chrome.runtime.sendMessage({
    payload: { content },
    type: "saveContent",
  });
});

const view = new EditorView({
  parent: document.getElementById("editor")!,
  state: EditorState.create({
    extensions: [
      highlightSpecialChars(),
      history(),
      drawSelection(),
      indentOnInput(),
      bracketMatching(),
      closeBrackets(),
      highlightActiveLine(),
      highlightSelectionMatches(),
      syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
      markdown(),
      EditorView.lineWrapping,
      keymap.of([
        { key: "Mod-b", run: wrap("**") },
        { key: "Mod-i", run: wrap("_") },
        { key: "Mod-`", run: wrap("`") },
        { key: "Alt-s", run: wrap("~~") },
        ...closeBracketsKeymap,
        ...defaultKeymap,
        ...searchKeymap,
        ...historyKeymap,
        indentWithTab,
      ]),
      theme.of(themeFor(darkQuery.matches)),
      EditorView.updateListener.of((update) => {
        if (update.docChanged && !update.transactions.some(isRemote)) {
          // Local edits win over content from other tabs not yet applied.
          pending = null;
          save();
        }
      }),
      EditorView.domEventHandlers({ blur: () => applyPending() }),
    ],
  }),
});

darkQuery.addEventListener("change", (event) => {
  view.dispatch({ effects: theme.reconfigure(themeFor(event.matches)) });
});

function isRemote(tr: { isUserEvent(e: string): boolean }) {
  return tr.isUserEvent("sync");
}

let pending: string | null = null;

// Apply content from storage without replacing the whole document, and never
// while the user is typing or composing, so the cursor and IME stay intact.
function applyRemote(content: string) {
  if (view.hasFocus || view.composing || view.compositionStarted) {
    pending = content;
    return;
  }
  pending = null;
  replaceWith(content);
}

function applyPending() {
  if (pending !== null) applyRemote(pending);
}

function replaceWith(content: string) {
  const change = diff(view.state.doc.toString(), content);
  if (!change) return;
  view.dispatch({
    annotations: Transaction.addToHistory.of(false),
    changes: change,
    userEvent: "sync",
  });
}

chrome.runtime.sendMessage({ type: "loadContent" }, ({ content }) => {
  replaceWith(content);
  view.focus();
});

chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace !== "sync") return;
  const content = changes[contentKey];
  if (!content) return;
  if (saved.has(content.newValue)) return;
  if (content.newValue === view.state.doc.toString()) {
    pending = null;
    return;
  }
  applyRemote(content.newValue);
});
