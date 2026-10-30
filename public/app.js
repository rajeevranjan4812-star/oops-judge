const problemList = document.querySelector("#problem-list");
const searchInput = document.querySelector("#problem-search");
const difficultyFilter = document.querySelector("#difficulty-filter");
const statusFilter = document.querySelector("#status-filter");
const topicFilter = document.querySelector("#topic-filter");
const problemCount = document.querySelector("#problem-count");
const visibleCount = document.querySelector("#visible-count");

const editor = document.querySelector("#code-editor");
const runButton = document.querySelector("#run-button");
const submitButton = document.querySelector("#submit-button");
const saveButton = document.querySelector("#save-button");
const resetButton = document.querySelector("#reset-button");
const fontDecreaseButton = document.querySelector("#font-decrease");
const fontIncreaseButton = document.querySelector("#font-increase");
const monacoContainer = document.querySelector("#monaco-editor");
const fallbackEditorWrap = document.querySelector("#fallback-editor-wrap");
const fallbackBanner = document.querySelector("#fallback-banner");
const output = document.querySelector("#console-output");
const lineNumbers = document.querySelector("#line-numbers");
const dirtyIndicator = document.querySelector("#dirty-indicator");
const saveStatus = document.querySelector("#save-status");

// Layout & Resizing
const workspace = document.querySelector("#workspace");
const problemPanel = document.querySelector("#problem-panel");
const rightColumn = document.querySelector("#right-column");
const editorPanel = document.querySelector("#editor-panel");
const consolePanel = document.querySelector("#console-panel");
const splitterV = document.querySelector("#splitter-vertical");
const splitterH = document.querySelector("#splitter-horizontal");
const collapseLeftBtn = document.querySelector("#collapse-left-btn");
const expandLeftBtn = document.querySelector("#expand-left-btn");
const maximizeEditorBtn = document.querySelector("#maximize-editor-btn");
const fullscreenEditorBtn = document.querySelector("#fullscreen-editor-btn");
const collapseConsoleBtn = document.querySelector("#collapse-console-btn");
const fullscreenAppBtn = document.querySelector("#fullscreen-app-btn");
const settingsBtn = document.querySelector("#settings-btn");

// Drawer & Topbar Navigation
const problemDrawer = document.querySelector("#problem-drawer");
const drawerBackdrop = document.querySelector("#drawer-backdrop");
const problemListBtn = document.querySelector("#problem-list-btn");
const drawerCloseBtn = document.querySelector("#drawer-close-btn");
const prevProblemBtn = document.querySelector("#prev-problem-btn");
const nextProblemBtn = document.querySelector("#next-problem-btn");
const randomProblemBtn = document.querySelector("#random-problem-btn");

// Metadata & Not Found States
const problemMetaHeader = document.querySelector("#problem-meta-header");
const problemDiffBadge = document.querySelector("#problem-diff-badge");
const problemTopicsList = document.querySelector("#problem-topics-list");
const welcomeState = document.querySelector("#welcome-state");
const notFoundState = document.querySelector("#not-found-state");
const notFoundPickBtn = document.querySelector("#not-found-pick-btn");
const notFoundMsg = document.querySelector("#not-found-msg");
const problemDescription = document.querySelector("#problem-description");
const problemIdTag = document.querySelector("#problem-id");

// Console & Mobile Navigation
const testcaseSampleContent = document.querySelector("#testcase-sample-content");
const mobileTabBar = document.querySelector("#mobile-tab-bar");
const mobileTabBtns = document.querySelectorAll(".mobile-tab-btn");

function getRunnerUrl() {
  try {
    const param = new URLSearchParams(window.location.search).get("runner_url");
    if (param) {
      const clean = param.replace(/\/+$/, "");
      localStorage.setItem("oops_runner_url", clean);
      return clean;
    }
    const stored = localStorage.getItem("oops_runner_url");
    if (stored) return stored.replace(/\/+$/, "");
  } catch (e) {}
  return ((window.CONFIG && window.CONFIG.RUNNER_URL) ? window.CONFIG.RUNNER_URL : "http://localhost:8000").replace(/\/+$/, "");
}

let problems = [];
let currentProblem = null;
let savedCode = "";
let currentStarterCode = "";
let requestVersion = 0;
let runStartedAt = 0;
let lastExecutionMode = "run";

// Session drafts: in-memory draft retention across problem switching within session
const sessionDrafts = new Map();

// Current User State
let currentUser = null;

function getUserProblemStatus(userId, problemId) {
  if (!userId || !problemId) return null;
  return localStorage.getItem(`oops_status:${userId}:${problemId}`) || null;
}

function setUserProblemStatus(userId, problemId, status) {
  if (!userId || !problemId) return;
  localStorage.setItem(`oops_status:${userId}:${problemId}`, status);
}

function getSubmissions(userId, problemId) {
  if (!userId || !problemId) return [];
  try {
    return JSON.parse(localStorage.getItem(`oops_sub:${userId}:${problemId}`) || "[]");
  } catch (e) {
    return [];
  }
}

function saveSubmission(userId, problemId, subData) {
  if (!userId || !problemId) return [];
  const subs = getSubmissions(userId, problemId);
  subs.unshift(subData);
  const trimmed = subs.slice(0, 20);
  localStorage.setItem(`oops_sub:${userId}:${problemId}`, JSON.stringify(trimmed));
  return trimmed;
}

function getStoredAccounts() {
  try {
    return JSON.parse(localStorage.getItem("oops_accounts") || "{}");
  } catch (e) {
    return {};
  }
}

function saveStoredAccounts(accounts) {
  localStorage.setItem("oops_accounts", JSON.stringify(accounts));
}

function generateSalt() {
  const bytes = new Uint8Array(16);
  if (window.crypto && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < 16; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  return Array.from(bytes).map(b => b.toString(16).padStart(2, "0")).join("");
}

async function hashPassword(password, salt) {
  if (window.crypto && crypto.subtle && crypto.subtle.digest) {
    const enc = new TextEncoder();
    const data = enc.encode(`${salt}:${password}`);
    const digest = await crypto.subtle.digest("SHA-256", data);
    return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, "0")).join("");
  }
  let h = 0x811c9dc5;
  const s = `${salt}:${password}`;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h += (h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24);
  }
  return (h >>> 0).toString(16);
}

let monacoEditor = null;
document.addEventListener("code-karo-theme-change", event => {
  if (!monacoEditor || !window.monaco) return;
  const theme = event.detail.theme === "light" ? "code-karo-light" : "code-karo-dark";
  window.monaco.editor.setTheme(theme);
});
let isMonacoReady = false;
let isFallbackActive = false;
let currentFontSize = parseInt(localStorage.getItem("oops_font_size") || "14", 10);

async function requestJson(url, options) {
  const response = await fetch(url, options);
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || `Request failed (${response.status}).`);
  return result;
}

function escapeHtml(value) {
  if (value === null || value === undefined) return "";
  return String(value).replace(/[&<>"']/g, character => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[character]);
}

function inlineMarkdown(text) {
  return escapeHtml(text)
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>");
}

function showToast(message, type = "info", duration = 3000) {
  const container = document.querySelector("#toast-container");
  if (!container) return;

  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;

  const iconMap = {
    saved: "💾",
    reset: "↺",
    runner: "⏱",
    error: "⚠",
    info: "ℹ"
  };
  const icon = iconMap[type] || "ℹ";

  toast.innerHTML = `
    <span class="toast-icon">${icon}</span>
    <span class="toast-msg">${escapeHtml(message)}</span>
    <button type="button" class="toast-close-btn" aria-label="Dismiss toast">✕</button>
  `;

  const closeBtn = toast.querySelector(".toast-close-btn");
  let timer = null;

  const dismiss = () => {
    if (timer) clearTimeout(timer);
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 260);
  };

  if (closeBtn) closeBtn.addEventListener("click", dismiss);
  container.appendChild(toast);

  requestAnimationFrame(() => {
    toast.classList.add("show");
  });

  timer = setTimeout(dismiss, duration);
}

function animateSaveDot() {
  const dot = document.querySelector("#save-dot");
  if (dot) {
    dot.classList.remove("pulse");
    void dot.offsetWidth; // force reflow
    dot.classList.add("pulse");
    setTimeout(() => dot.classList.remove("pulse"), 1000);
  }
}

function renderMarkdown(markdown, problemTitle = "") {
  const lines = markdown.split(/\r?\n/);
  const html = [];
  let paragraph = [];
  let listType = null;
  let tableRows = [];
  let inCode = false;
  let codeLines = [];
  let exampleIndex = 1;

  const flushParagraph = () => {
    if (paragraph.length) {
      html.push(`<p>${paragraph.map(inlineMarkdown).join("<br>")}</p>`);
      paragraph = [];
    }
  };
  const flushList = () => {
    if (listType) {
      html.push(`</${listType}>`);
      listType = null;
    }
  };
  const flushTable = () => {
    if (tableRows.length) {
      const rows = tableRows.filter(row => !/^\|?[\s|:-]+\|?$/.test(row.trim()));
      if (rows.length) {
        const cells = row => row.trim().replace(/^\||\|$/g, "").split("|").map(cell => cell.trim());
        const header = cells(rows[0]);
        html.push("<table><thead><tr>" + header.map(cell => `<th>${inlineMarkdown(cell)}</th>`).join("") + "</tr></thead><tbody>");
        for (const row of rows.slice(1)) {
          html.push("<tr>" + cells(row).map(cell => `<td>${inlineMarkdown(cell)}</td>`).join("") + "</tr>");
        }
        html.push("</tbody></table>");
      }
      tableRows = [];
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim().startsWith("```")) {
      flushParagraph();
      flushList();
      flushTable();
      if (inCode) {
        const blockCode = codeLines.join("\n");
        html.push(`
          <div class="code-block-wrap">
            <div class="code-block-header">
              <span class="code-block-lang">Java</span>
              <button type="button" class="code-copy-btn" data-code="${escapeHtml(blockCode)}" title="Copy code">Copy</button>
            </div>
            <pre><code>${escapeHtml(blockCode)}</code></pre>
          </div>
        `);
        codeLines = [];
      }
      inCode = !inCode;
      continue;
    }
    if (inCode) {
      codeLines.push(line);
      continue;
    }

    const trimmed = line.trim();
    if (trimmed.startsWith("|")) {
      flushParagraph();
      flushList();
      tableRows.push(trimmed);
      continue;
    }
    flushTable();

    // Constraints Section detection
    if (/^constraints:\s*/i.test(trimmed)) {
      flushParagraph();
      flushList();
      const rawConstraints = trimmed.replace(/^constraints:\s*/i, "");
      const items = rawConstraints.split(/,\s+(?=`?[0-9a-zA-Z_])/);
      html.push(`
        <div class="constraints-card">
          <div class="constraints-title"><span>⚡</span> Constraints</div>
          <ul class="constraints-list">
            ${items.map(it => `<li>${inlineMarkdown(it.trim())}</li>`).join("")}
          </ul>
        </div>
      `);
      continue;
    }

    // Example / Sample detection
    if ((/^sample:\s*/i.test(trimmed) || /^example(?:\s*\d+)?:\s*/i.test(trimmed) || (trimmed.includes(" -> ") && !trimmed.startsWith("#"))) && !trimmed.startsWith("Edit `Solution.java`")) {
      flushParagraph();
      flushList();
      const raw = trimmed.replace(/^(?:sample|example(?:\s*\d+)?):\s*/i, "");
      const pairs = raw.split(/,\s+(?=[^,]+?\s*->\s*)/);
      for (const pair of pairs) {
        if (pair.includes("->")) {
          const [inPart, outPart] = pair.split("->");
          let outVal = (outPart || "").trim();
          let explVal = "";
          const explMatch = /\((.*?)\)$/.exec(outVal);
          if (explMatch) {
            explVal = explMatch[1].trim();
            outVal = outVal.slice(0, explMatch.index).trim();
          }
          html.push(`
            <div class="example-card">
              <div class="example-card-header">
                <span class="example-card-title">Example ${exampleIndex++}</span>
              </div>
              <div class="example-card-body">
                <div class="example-row"><span class="example-label">Input</span><div class="example-value">${inlineMarkdown(inPart.trim())}</div></div>
                <div class="example-row"><span class="example-label">Output</span><div class="example-value">${inlineMarkdown(outVal)}</div></div>
                ${explVal ? `<div class="example-row"><span class="example-label">Explanation</span><div class="example-value" style="font-family: var(--font-sans);">${inlineMarkdown(explVal)}</div></div>` : ""}
              </div>
            </div>
          `);
        }
      }
      continue;
    }

    const heading = /^(#{1,3})\s+(.+)$/.exec(trimmed);
    if (heading) {
      flushParagraph();
      flushList();
      const level = heading[1].length;
      const headingText = heading[2].trim().toLowerCase();
      const cleanTitle = (problemTitle || "").trim().toLowerCase();
      // Skip top-level # Title or any heading matching the problem title
      // because the problem header component already displays the title.
      if (level === 1 || (cleanTitle && headingText === cleanTitle)) {
        continue;
      }
      html.push(`<h${level}>${inlineMarkdown(heading[2])}</h${level}>`);
      continue;
    }
    const listItem = /^[-*]\s+(.+)$/.exec(trimmed);
    if (listItem) {
      flushParagraph();
      if (listType !== "ul") {
        flushList();
        html.push("<ul>");
        listType = "ul";
      }
      html.push(`<li>${inlineMarkdown(listItem[1])}</li>`);
      continue;
    }
    if (!trimmed) {
      flushParagraph();
      flushList();
      continue;
    }
    if (trimmed.startsWith("*Source:")) continue;
    if (trimmed.startsWith("Edit `Solution.java`")) continue;
    paragraph.push(trimmed);
  }
  flushParagraph();
  flushList();
  flushTable();
  if (inCode) {
    const blockCode = codeLines.join("\n");
    html.push(`
      <div class="code-block-wrap">
        <div class="code-block-header">
          <span class="code-block-lang">Java</span>
          <button type="button" class="code-copy-btn" data-code="${escapeHtml(blockCode)}" title="Copy code">Copy</button>
        </div>
        <pre><code>${escapeHtml(blockCode)}</code></pre>
      </div>
    `);
  }
  return html.join("\n");
}

function renderProblemList() {
  const query = searchInput ? searchInput.value.trim().toLowerCase() : "";
  const diffVal = difficultyFilter ? difficultyFilter.value : "all";
  const statVal = statusFilter ? statusFilter.value : "all";
  const topicVal = topicFilter ? topicFilter.value : "all";

  let solvedCount = 0;
  problems.forEach(p => {
    if (currentUser && getUserProblemStatus(currentUser.id, p.id) === "solved") solvedCount++;
  });
  if (problemCount) {
    problemCount.textContent = `${solvedCount} / ${problems.length} solved`;
  }

  const filtered = problems.filter(problem => {
    if (query) {
      const matchText = (problem.title || "").toLowerCase().includes(query) ||
        (problem.id || "").toLowerCase().includes(query) ||
        (problem.summary || "").toLowerCase().includes(query);
      if (!matchText) return false;
    }
    if (diffVal !== "all" && problem.difficulty !== diffVal) {
      return false;
    }
    if (statVal !== "all") {
      const st = currentUser ? getUserProblemStatus(currentUser.id, problem.id) : null;
      if (statVal === "solved" && st !== "solved") return false;
      if (statVal === "attempted" && st !== "attempted") return false;
      if (statVal === "todo" && st) return false;
    }
    if (topicVal !== "all") {
      if (!problem.topics || !problem.topics.includes(topicVal)) return false;
    }
    return true;
  });

  if (visibleCount) {
    visibleCount.textContent = (query || diffVal !== "all" || statVal !== "all" || topicVal !== "all")
      ? `${filtered.length} shown`
      : "";
  }

  if (!filtered.length) {
    problemList.innerHTML = '<div class="empty-list">No matching problems found.</div>';
    return;
  }

  problemList.innerHTML = filtered.map(problem => {
    const status = currentUser ? getUserProblemStatus(currentUser.id, problem.id) : null;
    let markerHtml = "";
    if (status === "solved") {
      markerHtml = '<span class="status-marker solved" title="Solved">✓</span>';
    } else if (status === "attempted") {
      markerHtml = '<span class="status-marker attempted" title="Attempted">●</span>';
    } else {
      markerHtml = `<span class="problem-number">${String(problems.indexOf(problem) + 1).padStart(2, "0")}</span>`;
    }

    const diffClass = (problem.difficulty || "Easy").toLowerCase();
    const diffLabel = problem.difficulty || "Easy";

    return `
      <button class="problem-item${problem.id === currentProblem ? " selected" : ""}" data-problem="${escapeHtml(problem.id)}">
        ${markerHtml}
        <span class="problem-item-text">
          <span class="problem-title">${escapeHtml(problem.title)}</span>
          <span class="problem-item-sub">
            <span class="problem-slug">${escapeHtml(problem.id)}</span>
            <span class="problem-item-diff ${diffClass}">${diffLabel}</span>
          </span>
        </span>
      </button>
    `;
  }).join("");
}

function updateDirtyState() {
  const currentCode = getCode();
  const dirty = currentCode !== savedCode;
  dirtyIndicator.hidden = !dirty;
  saveButton.disabled = !currentProblem || !dirty;
  if (resetButton) resetButton.disabled = !currentProblem;
  if (runButton) runButton.disabled = !currentProblem;
  if (submitButton) submitButton.disabled = !currentProblem;
  const statusText = dirty ? "Unsaved changes" : (currentProblem ? "Saved" : "");
  saveStatus.textContent = statusText;
  const sbText = document.querySelector("#statusbar-save-text");
  if (sbText) sbText.textContent = statusText;
  const dot = document.querySelector("#save-dot");
  if (dot) {
    dot.classList.toggle("unsaved", dirty);
  }
}

function enableFallbackEditor() {
  if (isFallbackActive) return;
  isFallbackActive = true;
  if (fallbackEditorWrap) fallbackEditorWrap.hidden = false;
  if (fallbackBanner) fallbackBanner.hidden = false;
  if (monacoContainer) monacoContainer.hidden = true;
  if (editor) editor.disabled = !currentProblem;
  updateLineNumbers();
}

let monacoInitPromise = null;

function initMonaco() {
  if (monacoInitPromise) return monacoInitPromise;

  monacoInitPromise = new Promise((resolve) => {
    // 5-second CDN timeout fallback
    const timeout = setTimeout(() => {
      console.warn("Monaco loader timed out after 5s; falling back to textarea editor.");
      enableFallbackEditor();
      resolve(null);
    }, 5000);

    if (window.monacoLoadError || typeof window.require === "undefined") {
      clearTimeout(timeout);
      enableFallbackEditor();
      resolve(null);
      return;
    }

    try {
      window.require.config({
        paths: {
          vs: "https://cdn.jsdelivr.net/npm/monaco-editor@0.45.0/min/vs"
        }
      });

      window.MonacoEnvironment = {
        getWorker: function (workerId, label) {
          const workerScript = `
            self.MonacoEnvironment = {
              baseUrl: 'https://cdn.jsdelivr.net/npm/monaco-editor@0.45.0/min/'
            };
            importScripts('https://cdn.jsdelivr.net/npm/monaco-editor@0.45.0/min/vs/base/worker/workerMain.js');
          `;
          const blob = new Blob([workerScript], { type: "application/javascript" });
          return new Worker(URL.createObjectURL(blob));
        }
      };

      window.require(["vs/editor/editor.main"], function () {
        clearTimeout(timeout);
        try {
          // Define the dark editor theme to match the neutral workspace palette
          monaco.editor.defineTheme("code-karo-dark", {
            base: "vs-dark",
            inherit: true,
            rules: [
              { token: "keyword", foreground: "e87998", fontStyle: "bold" },
              { token: "keyword.java", foreground: "e87998", fontStyle: "bold" },
              { token: "type", foreground: "c3c5cc" },
              { token: "type.identifier", foreground: "c3c5cc" },
              { token: "string", foreground: "a3c77b" },
              { token: "string.escape", foreground: "d9b978" },
              { token: "comment", foreground: "858792", fontStyle: "italic" },
              { token: "number", foreground: "d9b978" },
              { token: "delimiter", foreground: "c3c5cc" },
              { token: "operator", foreground: "c3c5cc" },
              { token: "identifier", foreground: "e4e4e8" }
            ],
            colors: {
              "editor.background": "#17181e",
              "editor.foreground": "#e4e4e8",
              "editorLineNumber.foreground": "#62646e",
              "editorLineNumber.activeForeground": "#c3c5cc",
              "editorGutter.background": "#17181e",
              "editorCursor.foreground": "#e4e4e8",
              "editor.selectionBackground": "#85879233",
              "editor.inactiveSelectionBackground": "#8587921a",
              "editor.lineHighlightBackground": "#202127",
              "editor.lineHighlightBorder": "#00000000",
              "editorBracketMatch.background": "#85879222",
              "editorBracketMatch.border": "#858792",
              "editorOverviewRuler.border": "#202127",
              "editorIndentGuide.background": "#292a31",
              "editorIndentGuide.activeBackground": "#85879266",
              "scrollbarSlider.background": "#62646e66",
              "scrollbarSlider.hoverBackground": "#85879266",
              "scrollbarSlider.activeBackground": "#aeb1ba88"
            }
          });

          monaco.editor.defineTheme("code-karo-light", {
            base: "vs",
            inherit: true,
            rules: [
              { token: "keyword", foreground: "b75e7b", fontStyle: "bold" },
              { token: "keyword.java", foreground: "b75e7b", fontStyle: "bold" },
              { token: "type", foreground: "686a73" },
              { token: "type.identifier", foreground: "686a73" },
              { token: "string", foreground: "36775f" },
              { token: "string.escape", foreground: "8f701c" },
              { token: "comment", foreground: "888a92", fontStyle: "italic" },
              { token: "number", foreground: "8f701c" },
              { token: "delimiter", foreground: "565860" },
              { token: "operator", foreground: "565860" },
              { token: "identifier", foreground: "202126" }
            ],
            colors: {
              "editor.background": "#ffffff",
              "editor.foreground": "#202126",
              "editorLineNumber.foreground": "#888a92",
              "editorLineNumber.activeForeground": "#565860",
              "editorGutter.background": "#ffffff",
              "editorCursor.foreground": "#64666e",
              "editor.selectionBackground": "#aeb1ba55",
              "editor.inactiveSelectionBackground": "#aeb1ba33",
              "editor.lineHighlightBackground": "#f0f0f2",
              "editor.lineHighlightBorder": "#00000000",
              "editorBracketMatch.background": "#aeb1ba33",
              "editorBracketMatch.border": "#aeb1ba",
              "editorOverviewRuler.border": "#d0d0d6",
              "editorIndentGuide.background": "#d6d6dc",
              "editorIndentGuide.activeBackground": "#888a92",
              "scrollbarSlider.background": "#888a9255",
              "scrollbarSlider.hoverBackground": "#696b7488",
              "scrollbarSlider.activeBackground": "#42434a88"
            }
          });

          monacoEditor = monaco.editor.create(monacoContainer, {
            value: "",
            language: "java",
            theme: currentEditorTheme,
            automaticLayout: true,
            tabSize: 4,
            insertSpaces: true,
            detectIndentation: false,
            autoIndent: "full",
            autoClosingBrackets: "always",
            autoClosingQuotes: "always",
            autoClosingOvertype: "always",
            autoSurround: "languageDefined",
            matchBrackets: "always",
            bracketPairColorization: { enabled: true },
            lineNumbers: "on",
            lineNumbersMinChars: 3,
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            fontSize: currentFontSize,
            lineHeight: 23,
            fontLigatures: false,
            fontFamily: '"JetBrains Mono", Consolas, "Liberation Mono", Menlo, Courier, monospace',
            quickSuggestions: { other: true, comments: false, strings: false },
            parameterHints: { enabled: false },
            suggestOnTriggerCharacters: true,
            wordBasedSuggestions: "currentDocument",
            acceptSuggestionOnEnter: "on",
            renderWhitespace: "none",
            fixedOverflowWidgets: true,
            readOnly: true
          });

          // Hotkeys inside Monaco
          monacoEditor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
            if (!runButton.disabled) executeCode("run");
          });
          monacoEditor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.Enter, () => {
            if (!submitButton.disabled) executeCode("submit");
          });
          monacoEditor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
            if (!saveButton.disabled) saveSolution();
          });

          // Input & Cursor events
          monacoEditor.onDidChangeModelContent(() => {
            clearHighlights();
            updateDirtyState();
            if (currentProblem) {
              localStorage.setItem(`oops_code_${currentProblem}`, monacoEditor.getValue());
            }
          });

          monacoEditor.onDidChangeCursorPosition((e) => {
            document.querySelector("#cursor-position").textContent =
              `Ln ${e.position.lineNumber}, Col ${e.position.column}`;
          });

          // Auto-resize
          const wrap = document.querySelector("#editor-container-wrap");
          if (wrap && window.ResizeObserver) {
            new ResizeObserver(() => {
              monacoEditor.layout();
            }).observe(wrap);
          }

          isMonacoReady = true;
          resolve(monacoEditor);
        } catch (err) {
          console.error("Monaco create error:", err);
          enableFallbackEditor();
          resolve(null);
        }
      }, function (err) {
        clearTimeout(timeout);
        console.error("RequireJS failed:", err);
        enableFallbackEditor();
        resolve(null);
      });
    } catch (err) {
      clearTimeout(timeout);
      console.error("Monaco init exception:", err);
      enableFallbackEditor();
      resolve(null);
    }
  });

  return monacoInitPromise;
}

function getCode() {
  if (isMonacoReady && monacoEditor) {
    return monacoEditor.getValue();
  }
  return editor ? editor.value : "";
}

function setCode(text) {
  const val = text ?? "";
  if (isMonacoReady && monacoEditor) {
    monacoEditor.setValue(val);
  }
  if (editor) {
    editor.value = val;
    updateLineNumbers();
  }
  updateDirtyState();
}

function goToLine(lineNumber) {
  lineNumber = parseInt(lineNumber, 10);
  if (isNaN(lineNumber) || lineNumber < 1) return;

  if (isMonacoReady && monacoEditor) {
    monacoEditor.revealLineInCenter(lineNumber);
    monacoEditor.setPosition({ lineNumber: lineNumber, column: 1 });
    monacoEditor.focus();
  } else {
    jumpToEditorLine(lineNumber);
  }
}

let errorDecorations = [];

function highlightLine(lineNumber) {
  lineNumber = parseInt(lineNumber, 10);
  if (isNaN(lineNumber) || lineNumber < 1) return;

  if (isMonacoReady && monacoEditor) {
    errorDecorations = monacoEditor.deltaDecorations(errorDecorations, [
      {
        range: new monaco.Range(lineNumber, 1, lineNumber, 1),
        options: {
          isWholeLine: true,
          className: "monaco-error-line",
          linesDecorationsClassName: "monaco-error-line-number"
        }
      }
    ]);
  } else {
    highlightEditorLine(lineNumber);
  }
}

function clearHighlights() {
  if (isMonacoReady && monacoEditor) {
    errorDecorations = monacoEditor.deltaDecorations(errorDecorations, []);
  } else {
    highlightEditorLine(null);
  }
}

function resetSolution() {
  if (!currentProblem || !currentStarterCode) return;
  if (window.confirm("Reset Solution.java to starter code? Any unsaved edits will be discarded.")) {
    setCode(currentStarterCode);
    savedCode = currentStarterCode;
    sessionDrafts.set(currentProblem, currentStarterCode);
    updateDirtyState();
    clearHighlights();
    updateCursorPosition();
    animateSaveDot();
    showToast("Reset done", "reset", 2000);
  }
}

function setFontSize(newSize) {
  currentFontSize = Math.max(12, Math.min(22, newSize));
  localStorage.setItem("oops_font_size", String(currentFontSize));
  if (isMonacoReady && monacoEditor) {
    monacoEditor.updateOptions({ fontSize: currentFontSize });
  }
  if (editor) editor.style.fontSize = `${currentFontSize}px`;
  if (lineNumbers) lineNumbers.style.fontSize = `${currentFontSize}px`;
}

let currentEditorTheme = localStorage.getItem("oops_editor_theme") || "code-karo-dark";

function setEditorTheme(themeName) {
  currentEditorTheme = themeName;
  localStorage.setItem("oops_editor_theme", themeName);
  if (isMonacoReady && monacoEditor) {
    monaco.editor.setTheme(themeName);
  }
  const iconSpan = document.querySelector("#editor-theme-icon");
  const labelSpan = document.querySelector("#editor-theme-label");
  if (themeName === "code-karo-dark") {
    if (iconSpan) iconSpan.textContent = "🌙";
    if (labelSpan) labelSpan.textContent = "Dark";
  } else {
    if (iconSpan) iconSpan.textContent = "☀️";
    if (labelSpan) labelSpan.textContent = "Light";
  }
}

// Global helper exports as requested
window.getCode = getCode;
window.setCode = setCode;
window.goToLine = goToLine;
window.highlightLine = highlightLine;
window.clearHighlights = clearHighlights;
window.editorHelper = {
  getCode,
  setCode,
  goToLine,
  highlightLine,
  clearHighlights
};

// Per-problem memory of test execution results: problemId -> { result, duration, mode, activeCaseIndex }
const problemResults = new Map();
let highlightedLine = null;

function updateCursorPosition() {
  if (isMonacoReady && monacoEditor) {
    const pos = monacoEditor.getPosition();
    if (pos) {
      document.querySelector("#cursor-position").textContent = `Ln ${pos.lineNumber}, Col ${pos.column}`;
    }
  } else if (editor) {
    const text = editor.value.slice(0, editor.selectionStart || 0);
    const lines = text.split("\n");
    const line = lines.length;
    const col = lines[lines.length - 1].length + 1;
    document.querySelector("#cursor-position").textContent = `Ln ${line}, Col ${col}`;
  }
}

function updateLineNumbers(highlightLine = highlightedLine) {
  const count = editor.value.split("\n").length;
  if (highlightLine && highlightLine >= 1 && highlightLine <= count) {
    lineNumbers.innerHTML = Array.from({ length: count }, (_, index) => {
      const lineNum = index + 1;
      return lineNum === highlightLine
        ? `<span class="line-number-highlight">${lineNum}</span>`
        : `<span>${lineNum}</span>`;
    }).join("\n");
  } else {
    lineNumbers.textContent = Array.from({ length: count }, (_, index) => index + 1).join("\n");
  }
  lineNumbers.scrollTop = editor.scrollTop;
}

function highlightEditorLine(lineNumber) {
  highlightedLine = lineNumber;
  updateLineNumbers(lineNumber);
}

function jumpToEditorLine(lineNumber) {
  const lines = editor.value.split("\n");
  if (lineNumber < 1 || lineNumber > lines.length) return;

  let start = 0;
  for (let i = 0; i < lineNumber - 1; i++) {
    start += lines[i].length + 1; // +1 for newline
  }
  const end = start + lines[lineNumber - 1].length;

  editor.focus();
  editor.setSelectionRange(start, end);

  // Line height is 19px, line-numbers has padding 15px
  const lineHeight = 19;
  const targetScroll = Math.max(0, (lineNumber - 3) * lineHeight);
  editor.scrollTop = targetScroll;
  lineNumbers.scrollTop = targetScroll;

  highlightEditorLine(lineNumber);
}

function copyToClipboard(text, buttonElement) {
  if (text === null || text === undefined) text = "";
  const performCopy = () => {
    const originalText = buttonElement.textContent;
    buttonElement.textContent = "Copied!";
    buttonElement.classList.add("copied");
    setTimeout(() => {
      buttonElement.textContent = originalText;
      buttonElement.classList.remove("copied");
    }, 1500);
  };

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(performCopy).catch(() => {
      fallbackCopy(text, performCopy);
    });
  } else {
    fallbackCopy(text, performCopy);
  }
}

function fallbackCopy(text, callback) {
  const ta = document.createElement("textarea");
  ta.value = text;
  ta.style.position = "fixed";
  ta.style.opacity = "0";
  document.body.appendChild(ta);
  ta.focus();
  ta.select();
  try {
    document.execCommand("copy");
    if (callback) callback();
  } catch (err) {
    // Ignore error
  } finally {
    document.body.removeChild(ta);
  }
}

function findFirstDiffIndex(str1, str2) {
  if (str1 === str2) return -1;
  const s1 = String(str1 ?? "");
  const s2 = String(str2 ?? "");
  if (s1 === s2) return -1;
  const minLen = Math.min(s1.length, s2.length);
  for (let i = 0; i < minLen; i++) {
    if (s1.charAt(i) !== s2.charAt(i)) {
      return i;
    }
  }
  return minLen;
}

function formatInvisibleAndDiff(text, isExpected, diffIdx) {
  if (text === null || text === undefined) return '<em style="color:#717381">(empty)</em>';
  const str = String(text);
  if (str.length === 0) {
    if (diffIdx === 0) {
      return `<span class="diff-highlight diff-missing" title="First difference: empty text">[empty]</span>`;
    }
    return '<em style="color:#717381">(empty)</em>';
  }

  // Pre-identify trailing spaces on each line
  const isTrailingSpace = new Array(str.length).fill(false);
  let spaceRun = [];
  for (let i = 0; i < str.length; i++) {
    const ch = str[i];
    if (ch === " ") {
      spaceRun.push(i);
    } else {
      if (ch === "\n" || ch === "\r") {
        for (const idx of spaceRun) isTrailingSpace[idx] = true;
      }
      spaceRun = [];
    }
  }
  for (const idx of spaceRun) isTrailingSpace[idx] = true;

  let out = "";
  for (let i = 0; i < str.length; i++) {
    const ch = str[i];
    const isDiff = (i === diffIdx);
    let rendered = "";

    if (ch === "\0") {
      rendered = '<span class="invis-null" title="\\0 (null character)">\\0</span>';
    } else if (ch === " " && isTrailingSpace[i]) {
      rendered = '<span class="invis-space" title="Trailing space">␣</span>';
    } else if (ch === "\r") {
      rendered = '<span class="invis-cr" title="\\r">\\r</span>';
    } else if (ch === "\n") {
      rendered = '<span class="invis-nl" title="\\n (newline)">↵</span>\n';
    } else {
      rendered = escapeHtml(ch);
    }

    if (isDiff) {
      out += `<span class="diff-highlight ${isExpected ? "expected" : "actual"}" title="First difference here">${rendered}</span>`;
    } else {
      out += rendered;
    }
  }

  if (diffIdx !== -1 && diffIdx >= str.length) {
    out += `<span class="diff-highlight diff-missing" title="First difference: output ended early">[end of output]</span>`;
  }

  return out;
}

function parseExceptionInfo(rawText) {
  if (!rawText) return { type: "Runtime Error", message: "An unhandled exception occurred.", trace: "" };
  const lines = rawText.split(/\r?\n/);
  let type = "Runtime Error";
  let message = "";
  const traceLines = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Matches Java exception headers:
    // e.g. "Exception in thread "main" java.lang.NullPointerException: Cannot invoke ..."
    // or "Runtime Error: java.lang.ArrayIndexOutOfBoundsException: Index 5 out of bounds"
    // or "java.lang.ArithmeticException: / by zero"
    const excMatch = /^(?:Exception in thread "[^"]+"\s+|Runtime Error:\s+)?([a-zA-Z0-9_$.]+(?:Exception|Error))(?::\s*(.*))?$/.exec(trimmed);
    if (excMatch && type === "Runtime Error") {
      type = excMatch[1];
      message = excMatch[2] || "";
      continue;
    }

    if (trimmed.startsWith("at ")) {
      const isInternal = /at (Judge\.|Test\.|java\.base\/|jdk\.internal|sun\.|com\.sun\.|org\.junit)/.test(trimmed);
      if (!isInternal || trimmed.includes("Solution.")) {
        traceLines.push(trimmed);
      }
    } else {
      if (!message && type === "Runtime Error") {
        message = trimmed;
      } else if (!trimmed.startsWith("===") && !trimmed.startsWith("---") && !trimmed.startsWith("Result:")) {
        traceLines.push(trimmed);
      }
    }
  }

  return {
    type,
    message: message || "Program terminated with an exception.",
    trace: traceLines.join("\n")
  };
}

function showMessage(message, isError = false) {
  output.innerHTML = `
    <div class="result-container">
      <div class="verdict-header">
        <div class="verdict-row"><h2 class="verdict-title ${isError ? "wrong-answer" : "accepted"}">${escapeHtml(message)}</h2></div>
      </div>
    </div>
  `;
  document.querySelector("#run-duration").textContent = "";
}

function renderEmptyState() {
  output.innerHTML = `
    <div class="console-empty-state">
      <div class="empty-icon-mug">☕</div>
      <div class="empty-title">You must run your code first</div>
      <div class="empty-desc">Click <strong>Run (▶)</strong> for sample tests or <strong>Submit</strong> to evaluate all test cases.</div>
    </div>
  `;
  document.querySelector("#run-duration").textContent = "";
}

function renderLoadingState(message = "Running…") {
  const existingContainer = output.querySelector(".result-container");
  if (existingContainer) {
    existingContainer.classList.add("loading-dimmed");
    let pill = output.querySelector(".running-floating-pill");
    if (!pill) {
      pill = document.createElement("div");
      pill.className = "running-floating-pill";
      output.appendChild(pill);
    }
    pill.innerHTML = `<span class="spinner"></span><span>${escapeHtml(message)}</span>`;
    let shimmer = output.querySelector(".loading-shimmer-bar");
    if (!shimmer) {
      shimmer = document.createElement("div");
      shimmer.className = "loading-shimmer-bar";
      output.insertBefore(shimmer, output.firstChild);
    }
    return;
  }

  output.innerHTML = `
    <div class="skeleton-container" aria-busy="true" aria-label="Loading test results">
      <div class="skeleton-status-row" style="margin-bottom: 12px; display: flex; align-items: center; gap: 8px;">
        <span class="spinner"></span>
        <span>${escapeHtml(message)}</span>
      </div>
      <div class="shadow-panel w-full space-y-5 rounded-lg bg-transparent p-4">
        <div class="heroui-skeleton h-32 rounded-lg"></div>
        <div class="space-y-3">
          <div class="heroui-skeleton h-3 w-3/5 rounded-lg"></div>
          <div class="heroui-skeleton h-3 w-4/5 rounded-lg"></div>
          <div class="heroui-skeleton h-3 w-2/5 rounded-lg"></div>
        </div>
      </div>
    </div>
  `;
}

function renderSingleTestCaseDetail(test, isSubmit) {
  const isHidden = Boolean(isSubmit && !test.sample);
  const cards = [];

  // 1. Test Name Box (Never show names of hidden tests)
  if (!isHidden && test.name) {
    cards.push(`
      <div class="detail-card">
        <div class="detail-card-header">
          <span class="detail-card-title">Test Name</span>
        </div>
        <div class="detail-card-body">${escapeHtml(test.name)}</div>
      </div>
    `);
  }

  const hasExpected = (test.expected !== undefined && test.expected !== null);
  const hasActual = (test.actual !== undefined && test.actual !== null);
  const diffIdx = (!isHidden && hasExpected && hasActual) ? findFirstDiffIndex(test.expected, test.actual) : -1;

  // 2. Expected Box (Never show expected values of hidden tests)
  if (!isHidden && hasExpected) {
    const formattedExpected = formatInvisibleAndDiff(test.expected, true, diffIdx);
    cards.push(`
      <div class="detail-card">
        <div class="detail-card-header">
          <span class="detail-card-title">Expected</span>
          <button type="button" class="copy-btn" data-copy-text="${escapeHtml(String(test.expected))}">Copy</button>
        </div>
        <div class="detail-card-body">${formattedExpected}</div>
      </div>
    `);
  }

  // 3. Actual Box
  if (hasActual) {
    const formattedActual = formatInvisibleAndDiff(test.actual, false, diffIdx);
    cards.push(`
      <div class="detail-card">
        <div class="detail-card-header">
          <span class="detail-card-title">Actual</span>
          <button type="button" class="copy-btn" data-copy-text="${escapeHtml(String(test.actual))}">Copy</button>
        </div>
        <div class="detail-card-body">${formattedActual}</div>
      </div>
    `);
  }

  // 4. Console Box (user's System.out, only when not empty)
  if (test.stdout && String(test.stdout).trim().length > 0) {
    cards.push(`
      <div class="detail-card">
        <div class="detail-card-header">
          <span class="detail-card-title">Console</span>
          <button type="button" class="copy-btn" data-copy-text="${escapeHtml(String(test.stdout))}">Copy</button>
        </div>
        <div class="detail-card-body">${escapeHtml(String(test.stdout))}</div>
      </div>
    `);
  }

  return cards.join("");
}

function renderExecutionResult(result, duration, mode = "run", activeCaseIndex = null) {
  const isSubmit = mode === "submit";
  const runtimeDisplay = (result.runtimeMs !== undefined && result.runtimeMs !== null)
    ? `${result.runtimeMs} ms`
    : (duration ? `${Math.round(parseFloat(duration) * 1000)} ms` : "—");

  document.querySelector("#run-duration").textContent = runtimeDisplay;

  // 1. Verdict Color & Title
  let verdictTitle = "Accepted";
  let verdictClass = "accepted";
  if (result.status === "WRONG_ANSWER") {
    verdictTitle = "Wrong Answer";
    verdictClass = "wrong-answer";
  } else if (result.status === "COMPILE_ERROR") {
    verdictTitle = "Compile Error";
    verdictClass = "compile-error";
  } else if (result.status === "RUNTIME_ERROR") {
    verdictTitle = "Runtime Error";
    verdictClass = "runtime-error";
  } else if (result.status === "TIME_LIMIT_EXCEEDED") {
    verdictTitle = "Time Limit Exceeded";
    verdictClass = "time-limit";
  } else if (result.status && result.status !== "ACCEPTED") {
    verdictTitle = result.status;
    verdictClass = "wrong-answer";
  }

  const modeBadgeHtml = `<span class="mode-badge ${isSubmit ? "submit" : "run"}">${isSubmit ? "All tests" : "Sample tests"}</span>`;

  // 2. Verdict Header Meta Row
  const metaItems = [];
  if (result.status !== "COMPILE_ERROR") {
    const passedCount = result.passedTests ?? 0;
    const totalCount = result.totalTests ?? 0;
    metaItems.push(`<span class="meta-pill">${passedCount} / ${totalCount} testcases passed</span>`);
    metaItems.push(`<span class="meta-sep">•</span>`);
    metaItems.push(`<span class="meta-pill">Runtime: ${escapeHtml(runtimeDisplay)}</span>`);
    if (result.stoppedEarly) {
      const stoppedAt = (result.stoppedAtTest !== undefined && result.stoppedAtTest !== null) ? result.stoppedAtTest : 1;
      metaItems.push(`<span class="meta-sep">•</span>`);
      metaItems.push(`<span class="meta-notice">Stopped at test ${stoppedAt}, remaining tests were not run</span>`);
    }
  }

  const headerHtml = `
    <div class="verdict-header">
      <div class="verdict-row">
        <h2 class="verdict-title ${verdictClass}">${escapeHtml(verdictTitle)}</h2>
        ${modeBadgeHtml}
      </div>
      ${metaItems.length ? `<div class="verdict-meta-row">${metaItems.join("")}</div>` : ""}
    </div>
  `;

  // 3. Body Content
  let bodyHtml = "";

  // Compile Error: Monospace with line numbers and clickable Solution.java:LINE
  if (result.status === "COMPILE_ERROR" || result.compileError) {
    const rawError = result.compileError || result.output || "Compilation error.";
    const lines = rawError.split(/\r?\n/);
    const numberedLines = lines.map((line, idx) => {
      let escaped = escapeHtml(line);
      escaped = escaped.replace(/Solution\.java:(\d+)/g, (_, lineNum) => {
        return `<button type="button" class="error-line-link" data-line="${lineNum}" title="Go to line ${lineNum} in editor">Solution.java:${lineNum}</button>`;
      });
      return `<div class="numbered-line"><span class="line-no">${idx + 1}</span><span class="line-code">${escaped}</span></div>`;
    }).join("");

    bodyHtml = `<div class="code-block-numbered" role="region" aria-label="Compiler output">${numberedLines}</div>`;
  }
  // Time Limit Exceeded
  else if (result.status === "TIME_LIMIT_EXCEEDED") {
    const testNum = (result.stoppedAtTest !== undefined && result.stoppedAtTest !== null)
      ? result.stoppedAtTest
      : ((result.firstFailedIndex !== undefined && result.firstFailedIndex !== null) ? result.firstFailedIndex + 1 : 1);
    bodyHtml = `
      <div class="tle-card" role="region" aria-label="Time limit exceeded notice">
        <span class="tle-icon" aria-hidden="true">⏱</span>
        <div class="tle-message">
          Your code took more than 2000 ms on test ${testNum}. Check for infinite loops.
          ${result.stoppedEarly ? `<br><small style="color:#d1d2d8;opacity:0.85">Stopped at test ${testNum}, remaining tests were not run.</small>` : ""}
        </div>
      </div>
    `;
  }
  // Runtime Error: Trimmed stack trace with clickable lines
  else if (result.status === "RUNTIME_ERROR") {
    const rawErr = result.output || result.error || "Runtime exception.";
    const exc = parseExceptionInfo(rawErr);
    let escapedTrace = escapeHtml(exc.trace).replace(/Solution\.java:(\d+)/g, (_, lineNum) => {
      return `<button type="button" class="error-line-link" data-line="${lineNum}" title="Go to line ${lineNum} in editor">Solution.java:${lineNum}</button>`;
    });

    bodyHtml = `
      <div class="runtime-error-card" role="region" aria-label="Runtime error details">
        <div class="runtime-error-header">
          <span class="exception-type">${escapeHtml(exc.type)}</span>
          ${exc.message ? `<span class="exception-message">${escapeHtml(exc.message)}</span>` : ""}
        </div>
        ${exc.trace ? `
          <div class="runtime-trace-label">Stack Trace (user code):</div>
          <div class="stack-trace-box">${escapedTrace}</div>
        ` : ""}
      </div>
    `;
  }
  // Submit Mode: Accepted -> All N tests passed
  else if (isSubmit && result.status === "ACCEPTED") {
    bodyHtml = `
      <div class="submit-success-card">
        <div class="success-icon-wrap" aria-hidden="true">
          <svg class="success-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
        </div>
        <div class="success-content">
          <div class="success-title">Accepted</div>
          <div class="success-subtitle">All ${result.totalTests ?? (result.passedTests ?? "all")} tests passed</div>
          <div class="success-meta">
            <span class="success-pill">Runtime: ${escapeHtml(runtimeDisplay)}</span>
            <span class="success-pill">Mode: Submit</span>
          </div>
        </div>
      </div>
    `;
  }
  // Submit Mode: Failure -> "Failed at test N of M" and details of that one test only
  else if (isSubmit && result.status !== "ACCEPTED") {
    const testCases = Array.isArray(result.testCases) ? result.testCases : [];
    const failedTest = testCases.find(t => !t.passed) || testCases[0];
    const failedNum = (result.firstFailedIndex !== undefined && result.firstFailedIndex !== null)
      ? result.firstFailedIndex + 1
      : (failedTest && failedTest.index !== undefined ? failedTest.index + 1 : 1);
    const totalCount = result.totalTests ?? (testCases.length || "all");

    let testDetailHtml = "";
    if (failedTest) {
      testDetailHtml = renderSingleTestCaseDetail(failedTest, isSubmit);
    }

    const stoppedNotice = result.stoppedEarly
      ? ` • Stopped at test ${result.stoppedAtTest ?? failedNum}, remaining tests were not run`
      : "";

    bodyHtml = `
      <div class="case-tabs-container">
        <div class="submit-failure-banner">
          Failed at test ${failedNum} of ${totalCount}${stoppedNotice}
        </div>
        ${testDetailHtml}
      </div>
    `;
  }
  // Run Mode: Case tabs for sample tests
  else {
    const testCases = Array.isArray(result.testCases) ? result.testCases : [];
    if (testCases.length === 0) {
      if (result.output) {
        bodyHtml = `<div class="detail-card"><pre class="detail-card-body">${escapeHtml(result.output)}</pre></div>`;
      } else {
        bodyHtml = `<div class="empty-sub">No test cases returned.</div>`;
      }
    } else {
      if (activeCaseIndex === null || activeCaseIndex < 0 || activeCaseIndex >= testCases.length) {
        const failIdx = testCases.findIndex(t => !t.passed);
        activeCaseIndex = (failIdx !== -1) ? failIdx : 0;
      }

      const tabsHtml = testCases.map((test, idx) => {
        const isPass = Boolean(test.passed);
        const isActive = (idx === activeCaseIndex);
        return `
          <button role="tab" class="case-tab ${isActive ? "active" : ""}" id="case-tab-${idx}" aria-selected="${isActive}" aria-controls="case-panel-${idx}" data-case-index="${idx}" tabindex="${isActive ? "0" : "-1"}">
            <span class="case-dot ${isPass ? "pass" : "fail"}" aria-hidden="true"></span>
            <span>Case ${idx + 1}</span>
          </button>
        `;
      }).join("");

      const panelsHtml = testCases.map((test, idx) => {
        const isActive = (idx === activeCaseIndex);
        const detailHtml = renderSingleTestCaseDetail(test, false);
        return `
          <div role="tabpanel" id="case-panel-${idx}" class="case-panel" aria-labelledby="case-tab-${idx}" ${isActive ? "" : "hidden"}>
            ${detailHtml}
          </div>
        `;
      }).join("");

      bodyHtml = `
        <div class="case-tabs-container">
          <div class="case-tabs-bar" role="tablist" aria-label="Test cases">${tabsHtml}</div>
          <div class="case-panels-container">${panelsHtml}</div>
        </div>
      `;
    }
  }

  output.innerHTML = `
    <div class="result-container">
      ${headerHtml}
      ${bodyHtml}
    </div>
  `;

  attachResultPanelEvents(result, duration, mode, activeCaseIndex);
}

function attachResultPanelEvents(result, duration, mode, currentActiveIndex) {
  // 1. Copy Buttons
  const copyButtons = output.querySelectorAll(".copy-btn");
  copyButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      copyToClipboard(btn.dataset.copyText, btn);
    });
  });

  // 2. Clickable Error Lines in Compiler or Runtime Trace
  const errorLinks = output.querySelectorAll(".error-line-link");
  errorLinks.forEach(link => {
    link.addEventListener("click", () => {
      const lineNum = parseInt(link.dataset.line, 10);
      if (!isNaN(lineNum)) {
        goToLine(lineNum);
        highlightLine(lineNum);
      }
    });
  });

  // 3. Case Tabs Navigation
  const tabList = output.querySelector(".case-tabs-bar");
  if (!tabList) return;

  const tabs = Array.from(tabList.querySelectorAll(".case-tab"));
  const panels = Array.from(output.querySelectorAll(".case-panel"));

  const switchTab = (newIndex) => {
    tabs.forEach((tab, idx) => {
      const isSelected = (idx === newIndex);
      tab.classList.toggle("active", isSelected);
      tab.setAttribute("aria-selected", isSelected ? "true" : "false");
      tab.setAttribute("tabindex", isSelected ? "0" : "-1");
    });
    panels.forEach((panel, idx) => {
      panel.hidden = (idx !== newIndex);
    });

    if (currentProblem && problemResults.has(currentProblem)) {
      const entry = problemResults.get(currentProblem);
      entry.activeCaseIndex = newIndex;
    }
  };

  tabs.forEach((tab, idx) => {
    tab.addEventListener("click", () => {
      switchTab(idx);
    });

    tab.addEventListener("keydown", (event) => {
      let targetIdx = null;
      if (event.key === "ArrowRight") {
        targetIdx = (idx + 1) % tabs.length;
      } else if (event.key === "ArrowLeft") {
        targetIdx = (idx - 1 + tabs.length) % tabs.length;
      } else if (event.key === "Home") {
        targetIdx = 0;
      } else if (event.key === "End") {
        targetIdx = tabs.length - 1;
      }

      if (targetIdx !== null) {
        event.preventDefault();
        tabs[targetIdx].focus();
        switchTab(targetIdx);
      }
    });
  });
}

function showNotFound(problemId) {
  if (welcomeState) welcomeState.hidden = true;
  if (problemDescription) problemDescription.hidden = true;
  if (problemMetaHeader) problemMetaHeader.hidden = true;
  if (notFoundState) {
    notFoundState.hidden = false;
    if (notFoundMsg) notFoundMsg.textContent = `The problem "${escapeHtml(problemId)}" was not found in the judge catalogue.`;
  }
  document.title = "Problem Not Found — Code-Karo.dev";
  if (problemIdTag) problemIdTag.textContent = "404";
  if (editor) editor.disabled = true;
  if (monacoEditor) monacoEditor.updateOptions({ readOnly: true });
  if (runButton) runButton.disabled = true;
  if (submitButton) submitButton.disabled = true;
  if (resetButton) resetButton.disabled = true;
  saveButton.disabled = true;
}

let currentSampleCases = [];
let currentActiveSampleCase = 0;

function renderSampleTestcases(problem, activeIdx = 0) {
  const tabsContainer = document.querySelector("#sample-case-tabs");
  const detailContainer = document.querySelector("#sample-case-detail");
  if (!tabsContainer || !detailContainer) return;

  if (problem && Array.isArray(problem.sample_cases) && problem.sample_cases.length > 0) {
    currentSampleCases = problem.sample_cases;
  } else {
    currentSampleCases = [];
    if (problem && problem.readme) {
      const lines = problem.readme.split("\n");
      for (const line of lines) {
        const trimmed = line.trim();
        if ((trimmed.startsWith("Sample:") || trimmed.startsWith("Example:") || trimmed.includes(" -> ")) && !trimmed.startsWith("Edit `Solution.java`") && !trimmed.startsWith("#")) {
          const raw = trimmed.replace(/^(?:sample|example(?:\s*\d+)?):\s*/i, "");
          const pairs = raw.split(/,\s+(?=[^,]+?\s*->\s*)/);
          for (const pair of pairs) {
            if (pair.includes("->")) {
              const [inPart, outPart] = pair.split("->");
              currentSampleCases.push({
                name: `Sample Case ${currentSampleCases.length + 1}`,
                input: inPart.trim().replace(/^`|`$/g, ""),
                expected: outPart.trim().replace(/^`|`$/g, "")
              });
            }
          }
        }
      }
    }
  }

  if (currentSampleCases.length === 0) {
    currentSampleCases = [
      { name: "Sample 1", input: "Default sample input", expected: "Expected return value" }
    ];
  }

  currentActiveSampleCase = Math.max(0, Math.min(activeIdx, currentSampleCases.length - 1));

  tabsContainer.innerHTML = currentSampleCases.map((c, i) => `
    <button type="button" class="sample-case-tab ${i === currentActiveSampleCase ? "active" : ""}" data-sample-idx="${i}" role="tab" aria-selected="${i === currentActiveSampleCase}">
      Case ${i + 1}
    </button>
  `).join("");

  const active = currentSampleCases[currentActiveSampleCase];
  detailContainer.innerHTML = `
    <div class="detail-card">
      <div class="detail-card-header">
        <span class="detail-card-title">Test Name</span>
      </div>
      <div class="detail-card-body" style="font-family: var(--font-sans); font-size: 13px;">${escapeHtml(active.name || `Case ${currentActiveSampleCase + 1}`)}</div>
    </div>
    ${active.input ? `
      <div class="detail-card">
        <div class="detail-card-header">
          <span class="detail-card-title">Input</span>
          <button type="button" class="copy-btn" data-copy-text="${escapeHtml(active.input)}">Copy</button>
        </div>
        <pre class="detail-card-body">${escapeHtml(active.input)}</pre>
      </div>
    ` : ""}
    ${active.expected !== undefined && active.expected !== null ? `
      <div class="detail-card">
        <div class="detail-card-header">
          <span class="detail-card-title">Expected</span>
          <button type="button" class="copy-btn" data-copy-text="${escapeHtml(active.expected)}">Copy</button>
        </div>
        <pre class="detail-card-body">${escapeHtml(active.expected)}</pre>
      </div>
    ` : ""}
  `;

  tabsContainer.querySelectorAll(".sample-case-tab").forEach(tab => {
    tab.addEventListener("click", () => {
      const idx = parseInt(tab.dataset.sampleIdx, 10);
      renderSampleTestcases(problem, idx);
    });
  });

  detailContainer.querySelectorAll(".copy-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      copyToClipboard(btn.dataset.copyText, btn);
    });
  });
}

let currentProblemHints = [];
let revealedHintsCount = 1;

function renderHintsDrawer(hints, count) {
  currentProblemHints = hints || [];
  revealedHintsCount = Math.max(1, count);
  const drawer = document.querySelector("#problem-hints-drawer");
  if (!drawer) return;

  const visible = currentProblemHints.slice(0, revealedHintsCount);
  let html = visible.map((h, i) => `
    <div class="hint-item">
      <span class="hint-badge">Hint ${i + 1}</span>
      <span class="hint-text">${inlineMarkdown(h)}</span>
    </div>
  `).join("");

  if (revealedHintsCount < currentProblemHints.length) {
    html += `
      <button type="button" id="reveal-next-hint-btn" class="hint-reveal-btn">
        💡 Reveal Hint ${revealedHintsCount + 1} (${revealedHintsCount + 1}/${currentProblemHints.length})
      </button>
    `;
  }

  drawer.innerHTML = html;

  const nextBtn = drawer.querySelector("#reveal-next-hint-btn");
  if (nextBtn) {
    nextBtn.addEventListener("click", () => {
      renderHintsDrawer(currentProblemHints, revealedHintsCount + 1);
    });
  }
}

function updateFooterBarStatus(problemId) {
  const pill = document.querySelector("#problem-status-pill");
  const text = document.querySelector("#problem-status-text");
  if (!pill || !text) return;

  const status = currentUser ? getUserProblemStatus(currentUser.id, problemId) : null;
  if (status === "solved") {
    pill.className = "footer-status-pill solved";
    text.textContent = "Solved ✓";
  } else if (status === "attempted") {
    pill.className = "footer-status-pill attempted";
    text.textContent = "Attempted ●";
  } else {
    pill.className = "footer-status-pill todo";
    text.textContent = "Todo ○";
  }
}

function updateNavButtons() {
  if (!prevProblemBtn || !nextProblemBtn) return;
  const currIdx = problems.findIndex(p => p.id === currentProblem);
  prevProblemBtn.disabled = currIdx <= 0;
  nextProblemBtn.disabled = currIdx < 0 || currIdx >= problems.length - 1;
}

function pickRandomProblem() {
  if (!problems.length) return;
  if (problems.length === 1) {
    selectProblem(problems[0].id);
    return;
  }
  const pool = problems.filter(p => p.id !== currentProblem);
  const choice = pool[Math.floor(Math.random() * pool.length)];
  selectProblem(choice.id);
}

function openDrawer() {
  if (problemDrawer) {
    problemDrawer.classList.add("open");
    problemDrawer.setAttribute("aria-hidden", "false");
  }
  if (drawerBackdrop) {
    drawerBackdrop.hidden = false;
    drawerBackdrop.classList.add("open");
  }
  if (searchInput) {
    setTimeout(() => searchInput.focus(), 60);
  }
}

function closeDrawer() {
  if (problemDrawer) {
    problemDrawer.classList.remove("open");
    problemDrawer.setAttribute("aria-hidden", "true");
  }
  if (drawerBackdrop) {
    drawerBackdrop.classList.remove("open");
    drawerBackdrop.hidden = true;
  }
}

function initLeftTabs() {
  const tabs = document.querySelectorAll("[data-left-tab]");
  const panes = {
    description: document.querySelector("#tab-content-description"),
    submissions: document.querySelector("#tab-content-submissions"),
    hints: document.querySelector("#tab-content-hints"),
  };

  tabs.forEach(tab => {
    tab.addEventListener("click", () => {
      const target = tab.dataset.leftTab;
      tabs.forEach(t => t.classList.toggle("active", t === tab));
      Object.entries(panes).forEach(([key, pane]) => {
        if (pane) pane.hidden = (key !== target);
      });
      if (target === "submissions") {
        renderSubmissionsTab();
      }
    });
  });
}

function initConsoleTabs() {
  const tabs = document.querySelectorAll("[data-console-tab]");
  const panes = {
    testcase: document.querySelector("#console-testcase-pane"),
    result: document.querySelector("#console-result-pane"),
  };

  tabs.forEach(tab => {
    tab.addEventListener("click", () => {
      const target = tab.dataset.consoleTab;
      tabs.forEach(t => t.classList.toggle("active", t === tab));
      Object.entries(panes).forEach(([key, pane]) => {
        if (pane) {
          if (key === target) {
            pane.removeAttribute("hidden");
            pane.classList.add("active");
          } else {
            pane.setAttribute("hidden", "");
            pane.classList.remove("active");
          }
        }
      });
    });
  });
}

function switchToResultTab() {
  const resultTab = document.querySelector('[data-console-tab="result"]');
  if (resultTab) resultTab.click();
}

function initMobileTabs() {
  if (!mobileTabBtns) return;
  mobileTabBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      const view = btn.dataset.mobileView;
      mobileTabBtns.forEach(b => b.classList.toggle("active", b === btn));
      if (workspace) workspace.setAttribute("data-mobile-active", view);
      if (monacoEditor) {
        setTimeout(() => monacoEditor.layout(), 50);
      }
    });
  });
}

function initSplitters() {
  const savedV = localStorage.getItem("oops_split_v");
  const savedH = localStorage.getItem("oops_split_h");
  if (savedV && workspace) {
    workspace.style.setProperty("--split-v", savedV);
  }
  if (savedH && rightColumn) {
    rightColumn.style.setProperty("--split-h", savedH);
  }

  if (localStorage.getItem("oops_left_collapsed") === "true") {
    if (workspace) workspace.classList.add("left-collapsed");
  }
  if (localStorage.getItem("oops_console_collapsed") === "true") {
    if (rightColumn) {
      rightColumn.classList.add("console-collapsed");
      if (collapseConsoleBtn) collapseConsoleBtn.textContent = "▲";
    }
  }
  if (localStorage.getItem("oops_editor_maximized") === "true") {
    if (rightColumn) {
      rightColumn.classList.add("editor-maximized");
      if (maximizeEditorBtn) maximizeEditorBtn.textContent = "⤡";
    }
  }

  let isDraggingV = false;
  let isDraggingH = false;

  const triggerMonacoLayout = () => {
    if (isMonacoReady && monacoEditor) {
      monacoEditor.layout();
    }
  };

  // Vertical Splitter Dragging
  if (splitterV) {
    splitterV.addEventListener("mousedown", (e) => {
      if (e.button !== 0) return;
      isDraggingV = true;
      document.body.classList.add("is-resizing", "resizing-col");
      splitterV.classList.add("active");
      e.preventDefault();
    });

    // Double-click to reset (45%)
    splitterV.addEventListener("dblclick", () => {
      if (workspace) {
        workspace.style.setProperty("--split-v", "45%");
        workspace.classList.remove("left-collapsed");
        localStorage.removeItem("oops_left_collapsed");
        localStorage.setItem("oops_split_v", "45%");
        triggerMonacoLayout();
      }
    });

    // Keyboard accessibility: ArrowLeft / ArrowRight move by 10px
    splitterV.addEventListener("keydown", (e) => {
      if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
        e.preventDefault();
        const delta = e.key === "ArrowRight" ? 10 : -10;
        const wsRect = workspace.getBoundingClientRect();
        const currentPct = parseFloat(getComputedStyle(workspace).getPropertyValue("--split-v")) || 45;
        const currentPx = (currentPct / 100) * wsRect.width;
        const newPx = Math.max(280, Math.min(currentPx + delta, wsRect.width - 360));
        const pct = ((newPx / wsRect.width) * 100).toFixed(2) + "%";
        workspace.style.setProperty("--split-v", pct);
        localStorage.setItem("oops_split_v", pct);
        triggerMonacoLayout();
      }
    });
  }

  // Horizontal Splitter Dragging
  if (splitterH) {
    splitterH.addEventListener("mousedown", (e) => {
      if (e.button !== 0) return;
      isDraggingH = true;
      document.body.classList.add("is-resizing", "resizing-row");
      splitterH.classList.add("active");
      e.preventDefault();
    });

    // Double-click to reset (60%)
    splitterH.addEventListener("dblclick", () => {
      if (rightColumn) {
        rightColumn.style.setProperty("--split-h", "60%");
        rightColumn.classList.remove("editor-maximized", "console-collapsed");
        localStorage.removeItem("oops_editor_maximized");
        localStorage.removeItem("oops_console_collapsed");
        localStorage.setItem("oops_split_h", "60%");
        if (collapseConsoleBtn) collapseConsoleBtn.textContent = "▼";
        if (maximizeEditorBtn) maximizeEditorBtn.textContent = "⤢";
        triggerMonacoLayout();
      }
    });

    // Keyboard accessibility: ArrowUp / ArrowDown move by 10px
    splitterH.addEventListener("keydown", (e) => {
      if (e.key === "ArrowUp" || e.key === "ArrowDown") {
        e.preventDefault();
        const delta = e.key === "ArrowDown" ? 10 : -10;
        const rcRect = rightColumn.getBoundingClientRect();
        const currentPct = parseFloat(getComputedStyle(rightColumn).getPropertyValue("--split-h")) || 60;
        const currentPx = (currentPct / 100) * rcRect.height;
        const newPx = Math.max(160, Math.min(currentPx + delta, rcRect.height - 120));
        const pct = ((newPx / rcRect.height) * 100).toFixed(2) + "%";
        rightColumn.style.setProperty("--split-h", pct);
        localStorage.setItem("oops_split_h", pct);
        triggerMonacoLayout();
      }
    });
  }

  window.addEventListener("mousemove", (e) => {
    if (!isDraggingV && !isDraggingH) return;

    if (isDraggingV && workspace) {
      const wsRect = workspace.getBoundingClientRect();
      const newWidth = e.clientX - wsRect.left;
      const minLeft = 280;
      const maxLeft = wsRect.width - 360;
      const clampedWidth = Math.max(minLeft, Math.min(newWidth, maxLeft));
      const pct = ((clampedWidth / wsRect.width) * 100).toFixed(2) + "%";
      workspace.style.setProperty("--split-v", pct);
      triggerMonacoLayout();
    }

    if (isDraggingH && rightColumn) {
      const rcRect = rightColumn.getBoundingClientRect();
      const newHeight = e.clientY - rcRect.top;
      const minEditor = 160;
      const maxEditor = rcRect.height - 120;
      const clampedHeight = Math.max(minEditor, Math.min(newHeight, maxEditor));
      const pct = ((clampedHeight / rcRect.height) * 100).toFixed(2) + "%";
      rightColumn.style.setProperty("--split-h", pct);
      triggerMonacoLayout();
    }
  });

  window.addEventListener("mouseup", () => {
    if (isDraggingV) {
      isDraggingV = false;
      document.body.classList.remove("is-resizing", "resizing-col");
      if (splitterV) splitterV.classList.remove("active");
      if (workspace) {
        localStorage.setItem("oops_split_v", workspace.style.getPropertyValue("--split-v") || "45%");
      }
      triggerMonacoLayout();
    }
    if (isDraggingH) {
      isDraggingH = false;
      document.body.classList.remove("is-resizing", "resizing-row");
      if (splitterH) splitterH.classList.remove("active");
      if (rightColumn) {
        localStorage.setItem("oops_split_h", rightColumn.style.getPropertyValue("--split-h") || "60%");
      }
      triggerMonacoLayout();
    }
  });

  window.addEventListener("resize", () => {
    triggerMonacoLayout();
  });
}

function initPanelActions() {
  if (collapseLeftBtn && expandLeftBtn && workspace) {
    collapseLeftBtn.addEventListener("click", () => {
      workspace.classList.add("left-collapsed");
      localStorage.setItem("oops_left_collapsed", "true");
      if (monacoEditor) monacoEditor.layout();
    });

    expandLeftBtn.addEventListener("click", () => {
      workspace.classList.remove("left-collapsed");
      localStorage.setItem("oops_left_collapsed", "false");
      if (monacoEditor) monacoEditor.layout();
    });
  }

  if (maximizeEditorBtn && rightColumn) {
    maximizeEditorBtn.addEventListener("click", () => {
      const isMax = rightColumn.classList.toggle("editor-maximized");
      rightColumn.classList.remove("console-collapsed");
      localStorage.removeItem("oops_console_collapsed");
      if (collapseConsoleBtn) collapseConsoleBtn.textContent = "▼";
      maximizeEditorBtn.textContent = isMax ? "⤡" : "⤢";
      maximizeEditorBtn.title = isMax ? "Restore editor height" : "Maximize editor";
      localStorage.setItem("oops_editor_maximized", isMax ? "true" : "false");
      if (monacoEditor) monacoEditor.layout();
    });
  }

  if (collapseConsoleBtn && rightColumn) {
    collapseConsoleBtn.addEventListener("click", () => {
      const isCollapsed = rightColumn.classList.toggle("console-collapsed");
      rightColumn.classList.remove("editor-maximized");
      localStorage.removeItem("oops_editor_maximized");
      if (maximizeEditorBtn) maximizeEditorBtn.textContent = "⤢";
      collapseConsoleBtn.textContent = isCollapsed ? "▲" : "▼";
      collapseConsoleBtn.title = isCollapsed ? "Expand console" : "Collapse console";
      localStorage.setItem("oops_console_collapsed", isCollapsed ? "true" : "false");
      if (monacoEditor) monacoEditor.layout();
    });
  }

  if (fullscreenEditorBtn && editorPanel) {
    fullscreenEditorBtn.addEventListener("click", () => {
      const isFs = editorPanel.classList.toggle("is-fullscreen");
      fullscreenEditorBtn.title = isFs ? "Exit fullscreen (Esc)" : "Fullscreen editor (Esc exits)";
      if (monacoEditor) {
        setTimeout(() => monacoEditor.layout(), 30);
      }
    });
  }

  if (fullscreenAppBtn) {
    fullscreenAppBtn.addEventListener("click", () => {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(() => {});
      } else {
        document.exitFullscreen().catch(() => {});
      }
    });
  }

  if (settingsBtn) {
    settingsBtn.addEventListener("click", () => {
      const currentUrl = getRunnerUrl();
      const entered = prompt(
        "⚙ Code-Karo.dev Settings\n\n• Language: Java (OpenJDK 11+)\n• Editor: Monaco Editor (Java OOP)\n• Hotkeys: Run (Ctrl+Enter), Submit (Ctrl+Shift+Enter), Save (Ctrl+S)\n\nExecution Runner URL (leave blank to reset to default):",
        currentUrl
      );
      if (entered !== null) {
        const trimmed = entered.trim().replace(/\/+$/, "");
        if (trimmed) {
          localStorage.setItem("oops_runner_url", trimmed);
          if (window.CONFIG) window.CONFIG.RUNNER_URL = trimmed;
          showToast(`Runner URL set to: ${trimmed}`, "info", 3000);
        } else {
          localStorage.removeItem("oops_runner_url");
          if (window.CONFIG) {
            const isLocal = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
            window.CONFIG.RUNNER_URL = isLocal ? window.CONFIG.LOCAL_RUNNER_URL : window.CONFIG.PROD_RUNNER_URL;
          }
          showToast("Runner URL reset to default", "info", 3000);
        }
        checkRunnerHealthOnStartup();
      }
    });
  }

  if (notFoundPickBtn) {
    notFoundPickBtn.addEventListener("click", () => {
      openDrawer();
    });
  }
}

async function selectProblem(problemId, pushState = true) {
  if (currentProblem && currentProblem !== problemId) {
    sessionDrafts.set(currentProblem, getCode());
  }
  const version = ++requestVersion;
  currentProblem = problemId;
  highlightedLine = null;
  renderProblemList();
  updateNavButtons();
  closeDrawer();
  renderSubmissionsTab();

  if (pushState) {
    const url = new URL(window.location);
    url.searchParams.set("problem", problemId);
    window.history.pushState({ problem: problemId }, "", url);
  }

  if (editor) editor.disabled = true;
  if (monacoEditor) monacoEditor.updateOptions({ readOnly: true });
  if (runButton) runButton.disabled = true;
  if (submitButton) submitButton.disabled = true;
  if (resetButton) resetButton.disabled = true;
  saveButton.disabled = true;

  const descSkeleton = document.querySelector("#description-skeleton");
  const editorSkeleton = document.querySelector("#editor-skeleton");
  const descError = document.querySelector("#description-error");
  const footerBar = document.querySelector("#problem-footer-bar");
  if (descSkeleton) descSkeleton.hidden = false;
  if (editorSkeleton) editorSkeleton.hidden = false;
  if (descError) descError.hidden = true;
  if (welcomeState) welcomeState.hidden = true;
  if (notFoundState) notFoundState.hidden = true;
  if (problemDescription) problemDescription.hidden = true;
  if (problemMetaHeader) problemMetaHeader.hidden = true;
  if (footerBar) footerBar.hidden = true;
  if (problemIdTag) problemIdTag.textContent = "";

  try {
    const [problem] = await Promise.all([
      requestJson(`/api/problems/${encodeURIComponent(problemId)}`),
      new Promise(resolve => setTimeout(resolve, 420)),
    ]);
    if (version !== requestVersion) return;

    if (descSkeleton) descSkeleton.hidden = true;
    if (editorSkeleton) editorSkeleton.hidden = true;

    // 1. Problem number + title (e.g. "12. Employee")
    const problemIndex = problems.findIndex(p => p.id === problem.id);
    const displayNum = problemIndex !== -1 ? `${problemIndex + 1}. ` : "";
    document.title = `${displayNum}${problem.title} — Code-Karo.dev`;
    if (problemIdTag) problemIdTag.textContent = problem.id;

    const titleEl = document.querySelector("#problem-display-title");
    if (titleEl) {
      titleEl.textContent = `${displayNum}${problem.title}`;
    }

    // 2. Metadata row: difficulty pill, Topics chip, Hint chip
    if (problemMetaHeader && problemDiffBadge) {
      const diff = problem.difficulty || "Easy";
      problemDiffBadge.className = `diff-badge ${diff.toLowerCase()}`;
      problemDiffBadge.textContent = diff;

      // Topics chip
      const topics = problem.topics || [];
      const topicsBtn = document.querySelector("#topics-toggle-btn");
      const topicsList = document.querySelector("#problem-topics-list");
      if (topics.length > 0 && topicsBtn && topicsList) {
        topicsBtn.hidden = false;
        topicsBtn.setAttribute("aria-expanded", "false");
        topicsList.hidden = true;
        topicsList.innerHTML = topics.map(t => `<span class="topic-tag">${escapeHtml(t)}</span>`).join("");
      } else if (topicsBtn) {
        topicsBtn.hidden = true;
        if (topicsList) topicsList.hidden = true;
      }

      // Hints chip (reveals hints one at a time)
      const hints = problem.hints || [];
      const hintsBtn = document.querySelector("#hints-toggle-btn");
      const hintsDrawer = document.querySelector("#problem-hints-drawer");
      if (hints.length > 0 && hintsBtn && hintsDrawer) {
        hintsBtn.hidden = false;
        hintsBtn.setAttribute("aria-expanded", "false");
        hintsDrawer.hidden = true;
        renderHintsDrawer(hints, 1);
      } else if (hintsBtn) {
        hintsBtn.hidden = true;
        if (hintsDrawer) hintsDrawer.hidden = true;
      }

      problemMetaHeader.hidden = false;
    }

    // 3. Description body
    if (problemDescription) {
      problemDescription.innerHTML = renderMarkdown(problem.readme, problem.title);
      problemDescription.hidden = false;
    }

    // 4. Bottom action bar (social bar)
    if (footerBar) {
      updateFooterBarStatus(problem.id);
      footerBar.hidden = false;
    }

    // 5. Testcase tab
    renderSampleTestcases(problem, 0);

    // 6. Starter code & Editor setup
    currentStarterCode = problem.solution;
    const codeToShow = sessionDrafts.has(problemId) ? sessionDrafts.get(problemId) : problem.solution;

    await initMonaco();

    setCode(codeToShow);
    savedCode = codeToShow;
    if (editor) editor.disabled = false;
    if (monacoEditor) monacoEditor.updateOptions({ readOnly: false });
    if (resetButton) resetButton.disabled = false;
    updateDirtyState();
    clearHighlights();
    updateCursorPosition();

    // 7. Results cache
    if (problemResults.has(problemId)) {
      const cached = problemResults.get(problemId);
      renderExecutionResult(cached.result, cached.duration, cached.mode, cached.activeCaseIndex);
    } else {
      renderEmptyState();
    }
  } catch (error) {
    if (version !== requestVersion) return;
    if (descSkeleton) descSkeleton.hidden = true;
    if (editorSkeleton) editorSkeleton.hidden = true;
    const descError = document.querySelector("#description-error");
    const descErrorMsg = document.querySelector("#description-error-msg");
    const descRetryBtn = document.querySelector("#description-retry-btn");
    if (descError) {
      descError.hidden = false;
      if (descErrorMsg) descErrorMsg.textContent = error.message || "Could not load problem.";
      if (descRetryBtn) {
        descRetryBtn.onclick = () => selectProblem(problemId, false);
      }
    } else {
      showNotFound(problemId);
    }
  }
}

async function saveSolution() {
  if (!currentProblem) return;
  const problemId = currentProblem;
  const source = getCode();
  saveButton.disabled = true;
  saveStatus.textContent = "Saving…";
  try {
    sessionDrafts.set(problemId, source);
    await requestJson(`/api/problems/${encodeURIComponent(problemId)}/save`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: source }),
    });
    savedCode = source;
    updateDirtyState();
    animateSaveDot();
    showToast("Saved", "saved", 2200);
  } catch (error) {
    savedCode = source;
    updateDirtyState();
    animateSaveDot();
    showToast("Saved", "saved", 2200);
  }
}

let isFirstRequest = true;

async function executeCode(mode = "run") {
  if (!currentProblem) return;

  // Guest submit guard
  if (mode === "submit" && !currentUser) {
    showToast("Sign in to submit and save your progress", "runner", 3500);
    openAuthModal("signin");
    return;
  }

  clearHighlights();
  lastExecutionMode = mode;
  const problemId = currentProblem;
  const version = requestVersion;
  const source = getCode();

  // Auto switch console tab to Result
  switchToResultTab();
  if (rightColumn && rightColumn.classList.contains("console-collapsed")) {
    rightColumn.classList.remove("console-collapsed");
    if (collapseConsoleBtn) collapseConsoleBtn.textContent = "▼";
    if (monacoEditor) monacoEditor.layout();
  }
  if (window.innerWidth < 900) {
    const resTabBtn = document.querySelector('[data-mobile-view="result"]');
    if (resTabBtn) resTabBtn.click();
  }

  if (runButton) runButton.disabled = true;
  if (submitButton) submitButton.disabled = true;
  saveButton.disabled = true;
  saveStatus.textContent = mode === "run" ? "Running…" : "Submitting…";

  runStartedAt = performance.now();
  renderLoadingState(mode === "run" ? "Running…" : "Submitting…");
  document.querySelector("#run-duration").textContent = "";

  // If no response after 3s, show wake-up notice and toast
  const wakeTimer = setTimeout(() => {
    if (version !== requestVersion || currentProblem !== problemId) return;
    renderLoadingState("Waking up the runner (free hosting can take up to a minute)…");
    showToast("Runner waking up…", "runner", 4000);
  }, 3000);

  // Client timeout: 60s for the first request, 20s for subsequent requests
  const timeoutLimitMs = isFirstRequest ? 60000 : 20000;
  const controller = new AbortController();
  const timeoutTimer = setTimeout(() => {
    controller.abort();
  }, timeoutLimitMs);

  try {
    sessionDrafts.set(problemId, source);

    const runnerUrl = getRunnerUrl();
    const response = await fetch(`${runnerUrl}/problems/${encodeURIComponent(problemId)}/run`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code: source,
        mode: mode,
        userId: currentUser ? (currentUser.uid || currentUser.id) : null,
      }),
      signal: controller.signal,
    });

    clearTimeout(wakeTimer);
    clearTimeout(timeoutTimer);

    if (version !== requestVersion || currentProblem !== problemId) return;

    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.error || `Runner returned status ${response.status}`);
    }

    isFirstRequest = false;

    if (getCode() === source) savedCode = source;
    updateDirtyState();

    const duration = ((performance.now() - runStartedAt) / 1000).toFixed(2);

    // Update problem status and record submission in localStorage on Submit
    if (mode === "submit" && currentUser) {
      const runtimeMs = (result.runtimeMs !== undefined && result.runtimeMs !== null)
        ? result.runtimeMs
        : Math.round(parseFloat(duration) * 1000);
      const passedCount = result.passedTests ?? 0;
      const totalCount = result.totalTests ?? (result.testCases ? result.testCases.length : 0);

      const subRecord = {
        id: result.submissionId || ("sub_" + Date.now()),
        problemId,
        code: source,
        status: result.status,
        passedTests: passedCount,
        totalTests: totalCount,
        runtimeMs,
        time: new Date().toISOString()
      };
      saveSubmission(currentUser.id, problemId, subRecord);

      if (result.status === "ACCEPTED") {
        setUserProblemStatus(currentUser.id, problemId, "solved");
      } else if (getUserProblemStatus(currentUser.id, problemId) !== "solved") {
        setUserProblemStatus(currentUser.id, problemId, "attempted");
      }
      renderProblemList();
      updateFooterBarStatus(problemId);
      updateAuthUI();
      renderSubmissionsTab();
    }

    const initialCaseIdx = (result.testCases && result.testCases.findIndex(t => !t.passed) !== -1)
      ? result.testCases.findIndex(t => !t.passed)
      : 0;

    problemResults.set(problemId, {
      result,
      duration,
      mode,
      activeCaseIndex: initialCaseIdx,
    });

    renderExecutionResult(result, duration, mode, initialCaseIdx);

  } catch (error) {
    clearTimeout(wakeTimer);
    clearTimeout(timeoutTimer);
    if (version !== requestVersion || currentProblem !== problemId) return;

    const isTimeout = error.name === "AbortError";
    const isNetworkError = error instanceof TypeError ||
      (error.message && (error.message.includes("Failed to fetch") || error.message.includes("NetworkError")));

    if (isNetworkError) {
      showToast("Network error: Could not reach the runner", "error", 4000);
    }

    let errHtml = "";
    if (isTimeout) {
      const waitSeconds = Math.round(timeoutLimitMs / 1000);
      errHtml = `
        <div class="result-container">
          <div class="verdict-header">
            <div class="verdict-row"><h2 class="verdict-title wrong-answer">⏱ Client Timeout</h2></div>
            <div class="verdict-meta-row"><span class="meta-notice">The runner took longer than ${waitSeconds}s to respond.${isFirstRequest ? " Free hosting can take up to a minute to wake up on the first request." : " The request timed out."}</span></div>
          </div>
          <button id="retry-button" class="button button-retry">↻ Retry</button>
        </div>
      `;
    } else if (isNetworkError) {
      const currentRunner = getRunnerUrl();
      errHtml = `
        <div class="result-container">
          <div class="verdict-header">
            <div class="verdict-row"><h2 class="verdict-title wrong-answer">⚠ Connection Error</h2></div>
            <div class="verdict-meta-row"><span class="meta-notice">Cannot connect to the runner at <strong>${escapeHtml(currentRunner)}</strong></span></div>
          </div>
          <div class="detail-card-body" style="padding: 12px; margin-top: 8px; background: rgba(255,255,255,0.03); border-radius: 8px; font-size: 13px; line-height: 1.6;">
            <p style="margin: 0 0 10px 0; color: var(--text-secondary);">
              The Java execution runner is offline or unreachable. Java compilation requires a running backend container.
            </p>
            <div style="margin-bottom: 12px;">
              <label for="runner-url-input" style="display:block; font-weight:600; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: var(--text-muted); margin-bottom: 4px;">Update Runner URL:</label>
              <div style="display:flex; gap: 6px;">
                <input id="runner-url-input" type="url" value="${escapeHtml(currentRunner)}" style="flex:1; background: var(--surface-bg-alt, #1e222b); border: 1px solid var(--border-color, #30363d); border-radius: 6px; padding: 6px 10px; color: var(--text-primary); font-size: 12px; font-family: monospace;" placeholder="https://your-service.onrender.com">
                <button id="save-runner-url-btn" class="button button-primary" style="padding: 6px 14px; font-size: 12px;" type="button">Save & Retry</button>
              </div>
            </div>
            <div style="border-top: 1px solid var(--border-color, #30363d); padding-top: 8px; font-size: 12px; color: var(--text-muted);">
              <strong>How to fix:</strong>
              <ul style="margin: 6px 0 0 18px; padding: 0;">
                <li style="margin-bottom: 4px;"><strong>Run locally (instant):</strong> In terminal run <code>py app.py</code>, then open <a href="http://127.0.0.1:8000" target="_blank" style="color: var(--accent, #aeb1ba);">http://127.0.0.1:8000</a> in your browser.</li>
                <li><strong>Deploy cloud runner:</strong> Deploy this repo to <a href="https://render.com" target="_blank" style="color: var(--accent, #aeb1ba);">Render.com</a> as a Web Service (Docker) and paste your assigned URL above.</li>
              </ul>
            </div>
          </div>
          <button id="retry-button" class="button button-retry" style="margin-top: 8px;">↻ Retry</button>
        </div>
      `;
    } else {
      errHtml = `
        <div class="result-container">
          <div class="verdict-header">
            <div class="verdict-row"><h2 class="verdict-title wrong-answer">× Request Failed</h2></div>
          </div>
          <pre class="detail-card-body">${escapeHtml(error.message)}</pre>
          <button id="retry-button" class="button button-retry">↻ Retry</button>
        </div>
      `;
    }

    output.innerHTML = errHtml;
    const retryBtn = document.querySelector("#retry-button");
    if (retryBtn) {
      retryBtn.addEventListener("click", () => executeCode(lastExecutionMode));
    }
    const saveRunnerBtn = document.querySelector("#save-runner-url-btn");
    const runnerUrlInput = document.querySelector("#runner-url-input");
    if (saveRunnerBtn && runnerUrlInput) {
      saveRunnerBtn.addEventListener("click", () => {
        const newUrl = runnerUrlInput.value.trim().replace(/\/+$/, "");
        if (newUrl) {
          localStorage.setItem("oops_runner_url", newUrl);
          if (window.CONFIG) window.CONFIG.RUNNER_URL = newUrl;
          showToast(`Runner URL updated to ${newUrl}`, "info", 3000);
          checkRunnerHealthOnStartup();
          executeCode(lastExecutionMode);
        }
      });
    }
  } finally {
    if (version === requestVersion && currentProblem === problemId) {
      updateDirtyState();
    }
  }
}

problemList.addEventListener("click", event => {
  const button = event.target.closest("[data-problem]");
  if (!button || button.dataset.problem === currentProblem) return;
  if (getCode() !== savedCode && !window.confirm("You have unsaved changes. Discard them and open another problem?")) return;
  selectProblem(button.dataset.problem);
});

if (searchInput) searchInput.addEventListener("input", renderProblemList);
if (difficultyFilter) difficultyFilter.addEventListener("change", renderProblemList);
if (statusFilter) statusFilter.addEventListener("change", renderProblemList);
if (topicFilter) topicFilter.addEventListener("change", renderProblemList);

// Drawer Toggles
if (problemListBtn) problemListBtn.addEventListener("click", openDrawer);
if (drawerCloseBtn) drawerCloseBtn.addEventListener("click", closeDrawer);
if (drawerBackdrop) drawerBackdrop.addEventListener("click", closeDrawer);

// Navigation Buttons
if (prevProblemBtn) {
  prevProblemBtn.addEventListener("click", () => {
    const currIdx = problems.findIndex(p => p.id === currentProblem);
    if (currIdx > 0) selectProblem(problems[currIdx - 1].id);
  });
}
if (nextProblemBtn) {
  nextProblemBtn.addEventListener("click", () => {
    const currIdx = problems.findIndex(p => p.id === currentProblem);
    if (currIdx >= 0 && currIdx < problems.length - 1) selectProblem(problems[currIdx + 1].id);
  });
}
if (randomProblemBtn) randomProblemBtn.addEventListener("click", pickRandomProblem);

editor.addEventListener("input", () => {
  if (highlightedLine !== null) {
    highlightedLine = null;
  }
  updateDirtyState();
  updateLineNumbers();
  updateCursorPosition();
});
editor.addEventListener("scroll", () => { lineNumbers.scrollTop = editor.scrollTop; });
editor.addEventListener("click", () => {
  if (highlightedLine !== null) {
    highlightedLine = null;
    updateLineNumbers();
  }
  updateCursorPosition();
});
editor.addEventListener("keyup", updateCursorPosition);
editor.addEventListener("keydown", event => {
  if (event.key === "Tab") {
    event.preventDefault();
    const start = editor.selectionStart;
    const end = editor.selectionEnd;
    editor.setRangeText("    ", start, end, "end");
    editor.dispatchEvent(new Event("input"));
  }
  if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
    event.preventDefault();
    if (event.shiftKey) {
      executeCode("submit");
    } else {
      executeCode("run");
    }
  }
});

saveButton.addEventListener("click", () => saveSolution());
if (runButton) runButton.addEventListener("click", () => executeCode("run"));
if (submitButton) submitButton.addEventListener("click", () => executeCode("submit"));
if (resetButton) resetButton.addEventListener("click", resetSolution);
if (fontDecreaseButton) fontDecreaseButton.addEventListener("click", () => setFontSize(currentFontSize - 1));
if (fontIncreaseButton) fontIncreaseButton.addEventListener("click", () => setFontSize(currentFontSize + 1));
const editorThemeBtn = document.querySelector("#editor-theme-btn");
if (editorThemeBtn) {
  editorThemeBtn.addEventListener("click", () => {
    const nextTheme = currentEditorTheme === "code-karo-dark" ? "code-karo-light" : "code-karo-dark";
    setEditorTheme(nextTheme);
  });
}
const refreshBtn = document.querySelector("#refresh-button");
if (refreshBtn) refreshBtn.addEventListener("click", loadProblems);

if (problemDescription) {
  problemDescription.addEventListener("click", event => {
    const btn = event.target.closest(".code-copy-btn");
    if (!btn) return;
    const code = btn.dataset.code || "";
    copyToClipboard(code, btn);
  });
}

document.addEventListener("keydown", event => {
  const isEditorFocused = (document.activeElement === editor) ||
    (monacoContainer && monacoContainer.contains(document.activeElement));

  const modal = document.querySelector("#shortcuts-modal");

  if (event.key === "Escape") {
    const authModal = document.querySelector("#auth-modal");
    if (authModal && authModal.open) {
      event.preventDefault();
      authModal.close();
      return;
    }
    const viewCodeModal = document.querySelector("#view-code-modal");
    if (viewCodeModal && viewCodeModal.open) {
      event.preventDefault();
      viewCodeModal.close();
      return;
    }
    if (modal && modal.open) {
      event.preventDefault();
      modal.close();
      return;
    }
    if (editorPanel && editorPanel.classList.contains("is-fullscreen")) {
      event.preventDefault();
      editorPanel.classList.remove("is-fullscreen");
      if (fullscreenEditorBtn) fullscreenEditorBtn.title = "Fullscreen editor (Esc exits)";
      if (monacoEditor) monacoEditor.layout();
      return;
    }
    if (problemDrawer && problemDrawer.classList.contains("open")) {
      event.preventDefault();
      closeDrawer();
      return;
    }
  }

  // Keyboard shortcut help modal: ?
  if (event.key === "?" && !isEditorFocused && document.activeElement !== searchInput) {
    event.preventDefault();
    if (modal) {
      if (modal.open) {
        modal.close();
      } else {
        modal.showModal();
      }
    }
    return;
  }

  if (event.key === "/" && document.activeElement !== searchInput && !isEditorFocused) {
    event.preventDefault();
    openDrawer();
  }
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
    if (!isEditorFocused) {
      event.preventDefault();
      if (!saveButton.disabled) saveSolution();
    }
  }
  if ((event.ctrlKey || event.metaKey) && event.key === "Enter" && !isEditorFocused) {
    event.preventDefault();
    if (event.shiftKey) {
      if (!submitButton.disabled) executeCode("submit");
    } else {
      if (!runButton.disabled) executeCode("run");
    }
  }
});

function initShortcutsModal() {
  const modal = document.querySelector("#shortcuts-modal");
  const closeBtn = document.querySelector("#shortcuts-close-btn");
  if (closeBtn && modal) {
    closeBtn.addEventListener("click", () => modal.close());
  }
  if (modal) {
    modal.addEventListener("click", (e) => {
      if (e.target === modal) modal.close();
    });
  }
}

function initFooterBar() {
  const copyBtn = document.querySelector("#copy-problem-link-btn");
  const label = document.querySelector("#copy-link-label");
  if (copyBtn && label) {
    copyBtn.addEventListener("click", () => {
      if (!currentProblem) return;
      const url = new URL(window.location);
      url.searchParams.set("problem", currentProblem);
      const text = url.href;

      const finish = () => {
        label.textContent = "Copied!";
        copyBtn.classList.add("copied");
        showToast("Problem URL copied to clipboard", "saved", 2000);
        setTimeout(() => {
          label.textContent = "Copy link";
          copyBtn.classList.remove("copied");
        }, 2000);
      };

      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(finish).catch(() => fallbackCopy(text, finish));
      } else {
        fallbackCopy(text, finish);
      }
    });
  }
}

function initMetaChips() {
  const topicsBtn = document.querySelector("#topics-toggle-btn");
  const topicsList = document.querySelector("#problem-topics-list");
  if (topicsBtn && topicsList) {
    topicsBtn.addEventListener("click", () => {
      const isExpanded = topicsBtn.getAttribute("aria-expanded") === "true";
      topicsBtn.setAttribute("aria-expanded", String(!isExpanded));
      topicsList.hidden = isExpanded;
    });
  }

  const hintsBtn = document.querySelector("#hints-toggle-btn");
  const hintsDrawer = document.querySelector("#problem-hints-drawer");
  if (hintsBtn && hintsDrawer) {
    hintsBtn.addEventListener("click", () => {
      const isExpanded = hintsBtn.getAttribute("aria-expanded") === "true";
      hintsBtn.setAttribute("aria-expanded", String(!isExpanded));
      hintsDrawer.hidden = isExpanded;
    });
  }
}

window.addEventListener("popstate", () => {
  const urlParams = new URLSearchParams(window.location.search);
  const problemParam = urlParams.get("problem");
  if (problemParam) {
    if (problemParam !== currentProblem) {
      const match = problems.find(p => p.id === problemParam);
      if (match) {
        selectProblem(match.id, false);
      } else {
        showNotFound(problemParam);
      }
    }
  } else if (problems.length) {
    selectProblem(problems[0].id, false);
  }
});

async function loadProblems() {
  problemList.innerHTML = `
    <div class="shadow-panel w-full space-y-5 rounded-lg bg-transparent p-4" style="margin: 8px 0;">
      <div class="heroui-skeleton h-32 rounded-lg"></div>
      <div class="space-y-3">
        <div class="heroui-skeleton h-3 w-3/5 rounded-lg"></div>
        <div class="heroui-skeleton h-3 w-4/5 rounded-lg"></div>
        <div class="heroui-skeleton h-3 w-2/5 rounded-lg"></div>
      </div>
    </div>
  `;
  try {
    const result = await requestJson("/api/problems");
    problems = result.problems;
    renderProblemList();

    const urlParams = new URLSearchParams(window.location.search);
    const problemParam = urlParams.get("problem");

    if (problemParam) {
      const match = problems.find(p => p.id === problemParam);
      if (match) {
        selectProblem(match.id, false);
      } else {
        showNotFound(problemParam);
      }
    } else if (problems.length && !currentProblem) {
      selectProblem(problems[0].id, true);
    }
  } catch (error) {
    problemList.innerHTML = `
      <div class="description-error-card" style="margin: 12px 6px;">
        <div class="error-card-title">Failed to load problems</div>
        <p class="error-card-msg">${escapeHtml(error.message || "Network error loading problem list.")}</p>
        <button id="problem-list-retry-btn" class="button button-retry" style="margin-top:6px;" type="button">↻ Retry</button>
      </div>
    `;
    const retryBtn = document.querySelector("#problem-list-retry-btn");
    if (retryBtn) retryBtn.addEventListener("click", loadProblems);
  }
}

async function checkRunnerHealthOnStartup() {
  const dot = document.querySelector("#runner-status-dot");
  const text = document.querySelector("#runner-status-text");
  if (!dot || !text) return;

  const runnerUrl = getRunnerUrl();
  const isLocal = runnerUrl.includes("localhost") || runnerUrl.includes("127.0.0.1");
  const indicator = document.querySelector(".runner-indicator-wrap");

  if (indicator && !indicator.dataset.hasClickListener) {
    indicator.dataset.hasClickListener = "true";
    indicator.style.cursor = "pointer";
    indicator.title = "Click to configure runner URL or check status";
    indicator.addEventListener("click", () => {
      if (settingsBtn) settingsBtn.click();
    });
  }

  const wakeTimer = setTimeout(() => {
    dot.className = "status-dot waking";
    text.textContent = "⏱ Waking up runner (free tier wakes in ~30-60s)…";
    showToast("Runner waking up…", "runner", 4000);
  }, 3000);

  try {
    const res = await fetch(`${runnerUrl}/health`, { method: "GET", mode: "cors" });
    clearTimeout(wakeTimer);
    if (res.ok) {
      dot.className = "status-dot";
      text.textContent = isLocal ? "Local runner ready" : "Cloud runner ready";
    } else {
      dot.className = "status-dot waking";
      text.textContent = `Runner status ${res.status}`;
    }
  } catch (err) {
    clearTimeout(wakeTimer);
    dot.className = "status-dot offline";
    text.textContent = "Runner offline (click to configure)";
  }
}

/* =====================================================================
   8. USER ACCOUNTS, AUTH MODAL & SUBMISSIONS MANAGEMENT
   ===================================================================== */
let authModalMode = "signin"; // "signin" | "signup"
let currentViewingSubCode = "";

function formatSubmissionTime(iso) {
  if (!iso) return "recently";
  try {
    const date = new Date(iso);
    const now = new Date();
    const diffSec = Math.floor((now - date) / 1000);
    if (diffSec < 45) return "Just now";
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
    return date.toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  } catch (e) {
    return "recently";
  }
}

function updateAuthUI() {
  const guestBtns = document.querySelector("#guest-auth-btns");
  const userMenuContainer = document.querySelector("#user-menu-container");
  const userAvatar = document.querySelector("#user-avatar");
  const userHandle = document.querySelector("#user-handle");
  const dropdownName = document.querySelector("#user-dropdown-name");
  const dropdownSolved = document.querySelector("#user-dropdown-solved");
  const userDropdown = document.querySelector("#user-menu-dropdown");

  if (!currentUser) {
    if (guestBtns) guestBtns.hidden = false;
    if (userMenuContainer) userMenuContainer.hidden = true;
    if (userDropdown) userDropdown.hidden = true;
  } else {
    if (guestBtns) guestBtns.hidden = true;
    if (userMenuContainer) userMenuContainer.hidden = false;
    if (userAvatar) userAvatar.textContent = (currentUser.username || "OJ").slice(0, 2).toUpperCase();
    if (userHandle) userHandle.textContent = "@" + currentUser.username;
    if (dropdownName) dropdownName.textContent = currentUser.username;

    let userSolved = 0;
    problems.forEach(p => {
      if (getUserProblemStatus(currentUser.id, p.id) === "solved") userSolved++;
    });
    if (dropdownSolved) dropdownSolved.textContent = `${userSolved} / ${problems.length} solved`;
  }
}

function openAuthModal(mode = "signin") {
  const modal = document.querySelector("#auth-modal");
  if (!modal) return;
  authModalMode = mode;
  updateAuthModalState();
  clearAuthErrors();

  const uInput = document.querySelector("#auth-username");
  const pInput = document.querySelector("#auth-password");
  const cpInput = document.querySelector("#auth-confirm-password");
  if (uInput) uInput.value = "";
  if (pInput) pInput.value = "";
  if (cpInput) cpInput.value = "";

  if (!modal.open) modal.showModal();
  setTimeout(() => { if (uInput) uInput.focus(); }, 50);
}

function closeAuthModal() {
  const modal = document.querySelector("#auth-modal");
  if (modal && modal.open) modal.close();
}

function updateAuthModalState() {
  const isSignIn = (authModalMode === "signin");
  const title = document.querySelector("#auth-modal-title");
  const tabSignIn = document.querySelector("#auth-tab-signin");
  const tabSignUp = document.querySelector("#auth-tab-signup");
  const confirmGroup = document.querySelector("#confirm-password-group");
  const submitBtn = document.querySelector("#auth-submit-btn");

  if (title) title.textContent = isSignIn ? "Sign in to Code-Karo.dev" : "Create an Account";
  if (tabSignIn) {
    tabSignIn.classList.toggle("active", isSignIn);
    tabSignIn.setAttribute("aria-selected", String(isSignIn));
  }
  if (tabSignUp) {
    tabSignUp.classList.toggle("active", !isSignIn);
    tabSignUp.setAttribute("aria-selected", String(!isSignIn));
  }
  if (confirmGroup) confirmGroup.hidden = isSignIn;
  if (submitBtn) submitBtn.textContent = isSignIn ? "Sign In" : "Sign Up";
}

function clearAuthErrors() {
  const errBox = document.querySelector("#auth-error-box");
  if (errBox) {
    errBox.hidden = true;
    errBox.textContent = "";
  }
}

function showAuthError(msg) {
  const errBox = document.querySelector("#auth-error-box");
  if (errBox) {
    errBox.textContent = msg;
    errBox.hidden = false;
  }
}

function setCurrentUser(userObj) {
  currentUser = { id: userObj.id, username: userObj.username };
  localStorage.setItem("oops_session", JSON.stringify(currentUser));
  updateAuthUI();
  renderProblemList();
  if (currentProblem) updateFooterBarStatus(currentProblem);
  renderSubmissionsTab();
}

function handleLogout() {
  currentUser = null;
  localStorage.removeItem("oops_session");
  updateAuthUI();
  renderProblemList();
  if (currentProblem) updateFooterBarStatus(currentProblem);
  renderSubmissionsTab();
  showToast("Signed out", "reset", 2000);
}

async function handleAuthSubmit() {
  clearAuthErrors();
  const u = (document.querySelector("#auth-username")?.value || "").trim();
  const p = document.querySelector("#auth-password")?.value || "";
  const cp = document.querySelector("#auth-confirm-password")?.value || "";

  try {
    if (!u || u.length < 3) throw new Error("Username must be at least 3 characters.");
    if (!/^[a-zA-Z0-9_-]+$/.test(u)) throw new Error("Username can only contain letters, numbers, hyphens, and underscores.");
    if (!p || p.length < 4) throw new Error("Password must be at least 4 characters.");

    const accounts = getStoredAccounts();

    if (authModalMode === "signup") {
      if (p !== cp) throw new Error("Passwords do not match.");
      if (accounts[u.toLowerCase()]) throw new Error("Username is already taken.");
      const salt = generateSalt();
      const hash = await hashPassword(p, salt);
      const newUser = {
        id: "u_" + u.toLowerCase() + "_" + Date.now().toString(36),
        username: u,
        salt,
        hash,
        createdAt: Date.now()
      };
      accounts[u.toLowerCase()] = newUser;
      saveStoredAccounts(accounts);
      closeAuthModal();
      setCurrentUser(newUser);
      showToast(`Account created! Welcome, ${u}`, "saved", 2500);
    } else {
      const userObj = accounts[u.toLowerCase()];
      if (!userObj) throw new Error("Invalid username or password.");
      const testHash = await hashPassword(p, userObj.salt);
      if (testHash !== userObj.hash) throw new Error("Invalid username or password.");
      closeAuthModal();
      setCurrentUser(userObj);
      showToast(`Welcome back, ${userObj.username}!`, "saved", 2500);
    }
  } catch (err) {
    showAuthError(err.message || "Authentication failed.");
  }
}

function renderSubmissionsTab() {
  const container = document.querySelector("#submissions-container");
  if (!container) return;

  if (!currentUser) {
    container.innerHTML = `
      <div class="sub-guest-card">
        <div class="sub-guest-icon">📋</div>
        <h3 class="sub-guest-title">Submission History</h3>
        <p class="sub-guest-desc">Sign in to submit your solutions and track your verdicts, runtime, and progress.</p>
        <button type="button" id="submissions-guest-signin-btn" class="button button-primary">Sign in</button>
      </div>
    `;
    const signinBtn = container.querySelector("#submissions-guest-signin-btn");
    if (signinBtn) signinBtn.addEventListener("click", () => openAuthModal("signin"));
    return;
  }

  if (!currentProblem) {
    container.innerHTML = `
      <div class="sub-guest-card">
        <div class="sub-guest-icon">📄</div>
        <h3 class="sub-guest-title">Select a problem</h3>
        <p class="sub-guest-desc">Choose a problem from the list to view its submission history.</p>
      </div>
    `;
    return;
  }

  const subs = getSubmissions(currentUser.id, currentProblem);
  if (subs.length === 0) {
    container.innerHTML = `
      <div class="sub-guest-card">
        <div class="sub-guest-icon">📋</div>
        <h3 class="sub-guest-title">No submissions yet</h3>
        <p class="sub-guest-desc">Submit your solution for <strong>${escapeHtml(currentProblem)}</strong> to see your verdicts and history here.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = subs.map((sub, idx) => {
    let verdictClass = "wrong-answer";
    let verdictLabel = "Wrong Answer";
    if (sub.status === "ACCEPTED") {
      verdictClass = "accepted";
      verdictLabel = "Accepted";
    } else if (sub.status === "COMPILE_ERROR") {
      verdictClass = "compile-error";
      verdictLabel = "Compile Error";
    } else if (sub.status === "TIME_LIMIT_EXCEEDED") {
      verdictClass = "time-limit";
      verdictLabel = "Time Limit Exceeded";
    } else if (sub.status === "RUNTIME_ERROR") {
      verdictClass = "runtime-error";
      verdictLabel = "Runtime Error";
    } else if (sub.status) {
      verdictLabel = sub.status;
    }

    const timeStr = formatSubmissionTime(sub.time);

    return `
      <div class="submission-card" data-sub-id="${escapeHtml(sub.id || String(idx))}">
        <div class="sub-card-row-top">
          <span class="sub-card-verdict ${verdictClass}">${escapeHtml(verdictLabel)}</span>
          <span class="sub-card-time">${escapeHtml(timeStr)}</span>
        </div>
        <div class="sub-card-row-mid">
          <span class="meta-pill">Runtime: ${sub.runtimeMs ?? 0} ms</span>
          <span class="meta-sep">•</span>
          <span class="meta-pill">${sub.passedTests ?? 0} / ${sub.totalTests ?? 0} passed</span>
        </div>
        <div class="sub-card-row-bottom">
          <button type="button" class="sub-action-btn view-code-btn" data-sub-idx="${idx}">View code</button>
          <button type="button" class="sub-action-btn restore-code-btn" data-sub-idx="${idx}">Restore to editor</button>
        </div>
      </div>
    `;
  }).join("");

  container.querySelectorAll(".view-code-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const idx = parseInt(btn.dataset.subIdx, 10);
      const sub = subs[idx];
      if (sub) openViewCodeModal(sub);
    });
  });

  container.querySelectorAll(".restore-code-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const idx = parseInt(btn.dataset.subIdx, 10);
      const sub = subs[idx];
      if (sub && sub.code) {
        setCode(sub.code);
        savedCode = sub.code;
        sessionDrafts.set(currentProblem, sub.code);
        updateDirtyState();
        clearHighlights();
        updateCursorPosition();
        animateSaveDot();
        showToast("Restored submission to editor", "saved", 2000);
      }
    });
  });
}

function openViewCodeModal(sub) {
  const modal = document.querySelector("#view-code-modal");
  if (!modal) return;

  currentViewingSubCode = sub.code || "";
  const verdictEl = document.querySelector("#code-modal-verdict");
  const runtimeEl = document.querySelector("#code-modal-runtime");
  const passedEl = document.querySelector("#code-modal-passed");
  const timeEl = document.querySelector("#code-modal-time");
  const codePre = document.querySelector("#code-modal-pre");

  if (verdictEl) {
    let vClass = (sub.status || "").toLowerCase();
    if (vClass === "accepted") verdictEl.className = "diff-badge easy";
    else if (vClass === "compile_error" || vClass === "time_limit_exceeded") verdictEl.className = "diff-badge medium";
    else verdictEl.className = "diff-badge hard";
    verdictEl.textContent = sub.status || "Verdict";
  }

  if (runtimeEl) runtimeEl.textContent = `Runtime: ${sub.runtimeMs ?? 0} ms`;
  if (passedEl) passedEl.textContent = `${sub.passedTests ?? 0} / ${sub.totalTests ?? 0} passed`;
  if (timeEl) timeEl.textContent = formatSubmissionTime(sub.time);
  if (codePre) codePre.textContent = currentViewingSubCode;

  modal.showModal();
}

function initViewCodeModal() {
  const modal = document.querySelector("#view-code-modal");
  const closeBtn = document.querySelector("#view-code-close-btn");
  const copyBtn = document.querySelector("#copy-submitted-code-btn");
  const restoreBtn = document.querySelector("#restore-from-modal-btn");

  if (closeBtn && modal) {
    closeBtn.addEventListener("click", () => modal.close());
  }
  if (modal) {
    modal.addEventListener("click", (e) => {
      if (e.target === modal) modal.close();
    });
  }
  if (copyBtn) {
    copyBtn.addEventListener("click", () => {
      copyToClipboard(currentViewingSubCode, copyBtn);
    });
  }
  if (restoreBtn) {
    restoreBtn.addEventListener("click", () => {
      if (currentViewingSubCode && currentProblem) {
        setCode(currentViewingSubCode);
        savedCode = currentViewingSubCode;
        sessionDrafts.set(currentProblem, currentViewingSubCode);
        updateDirtyState();
        clearHighlights();
        updateCursorPosition();
        animateSaveDot();
        if (modal && modal.open) modal.close();
        showToast("Restored submission to editor", "saved", 2000);
      }
    });
  }
}

function initAuth() {
  try {
    const raw = localStorage.getItem("oops_session");
    if (raw) {
      currentUser = JSON.parse(raw);
    }
  } catch (e) {
    currentUser = null;
  }
  updateAuthUI();

  const signinBtn = document.querySelector("#signin-btn");
  const signupBtn = document.querySelector("#signup-btn");
  const tabSignin = document.querySelector("#auth-tab-signin");
  const tabSignup = document.querySelector("#auth-tab-signup");
  const modalClose = document.querySelector("#auth-modal-close");
  const modal = document.querySelector("#auth-modal");
  const authForm = document.querySelector("#auth-form");
  const userMenuBtn = document.querySelector("#user-menu-btn");
  const userDropdown = document.querySelector("#user-menu-dropdown");
  const logoutBtn = document.querySelector("#logout-btn");

  if (signinBtn) signinBtn.addEventListener("click", () => openAuthModal("signin"));
  if (signupBtn) signupBtn.addEventListener("click", () => openAuthModal("signup"));

  if (tabSignin) tabSignin.addEventListener("click", () => {
    authModalMode = "signin";
    updateAuthModalState();
    clearAuthErrors();
  });
  if (tabSignup) tabSignup.addEventListener("click", () => {
    authModalMode = "signup";
    updateAuthModalState();
    clearAuthErrors();
  });

  if (modalClose) modalClose.addEventListener("click", closeAuthModal);
  if (modal) {
    modal.addEventListener("click", (e) => {
      if (e.target === modal) closeAuthModal();
    });
  }

  if (authForm) {
    authForm.addEventListener("submit", (e) => {
      e.preventDefault();
      handleAuthSubmit();
    });
  }

  if (userMenuBtn && userDropdown) {
    userMenuBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      const isHidden = userDropdown.hidden;
      userDropdown.hidden = !isHidden;
      userMenuBtn.setAttribute("aria-expanded", String(isHidden));
    });
    document.addEventListener("click", (e) => {
      if (!userMenuBtn.contains(e.target) && !userDropdown.contains(e.target)) {
        userDropdown.hidden = true;
        userMenuBtn.setAttribute("aria-expanded", "false");
      }
    });
  }

  if (logoutBtn) logoutBtn.addEventListener("click", handleLogout);

  const requestedAuthMode = new URLSearchParams(window.location.search).get("auth");
  if (requestedAuthMode === "signin" || requestedAuthMode === "signup") {
    openAuthModal(requestedAuthMode);
  }
}

setFontSize(currentFontSize);
setEditorTheme(currentEditorTheme);
initLeftTabs();
initConsoleTabs();
initMobileTabs();
initSplitters();
initPanelActions();
initShortcutsModal();
initFooterBar();
initMetaChips();
initAuth();
initViewCodeModal();
loadProblems();
checkRunnerHealthOnStartup();
