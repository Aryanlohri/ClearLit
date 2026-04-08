// content.js — CLEARLIT v2.0 (Fixed: Shadow DOM, stream safety, consistent injection)

(function () {
  "use strict";

  const PANEL_ID = "clearlit-root-host";

  // ─────────────────────────────────────────────────────────────
  // STATE
  // ─────────────────────────────────────────────────────────────
  let streamTimer = null;       // cancelable stream handle
  let cursorTimer = null;       // cancelable cursor blink handle
  let isCollapsed = false;
  let shadowRoot = null;        // shadow DOM root — style isolation

  // ─────────────────────────────────────────────────────────────
  // SHADOW DOM HOST
  // Attaches directly to document.body (always exists, never
  // re-rendered by SPAs). Uses shadow DOM so page CSS can't
  // interfere with our panel and vice versa.
  // ─────────────────────────────────────────────────────────────
  function getOrCreateHost() {
    let host = document.getElementById(PANEL_ID);
    if (!host) {
      host = document.createElement("div");
      host.id = PANEL_ID;
      host.style.cssText = [
        "all:initial",
        "position:fixed",
        "top:0",
        "left:0",
        "width:100%",
        "z-index:2147483647",   // max z-index — always on top
        "pointer-events:none",  // host is transparent to clicks
        "font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",
      ].join(";");

      document.body.appendChild(host);
      shadowRoot = host.attachShadow({ mode: "open" });
    }
    return host;
  }

  // ─────────────────────────────────────────────────────────────
  // SHADOW STYLES
  // Injected once into shadow DOM — page CSP doesn't apply here
  // ─────────────────────────────────────────────────────────────
  const SHADOW_CSS = `
    *{box-sizing:border-box;margin:0;padding:0}
    #cl-panel{
      all:initial;
      pointer-events:all;
      position:fixed;
      top:16px;
      left:50%;
      transform:translateX(-50%);
      width:min(820px,calc(100vw - 32px));
      background:#0c0c0c;
      color:#e0e0e0;
      border-radius:14px;
      border:1px solid #222;
      box-shadow:0 8px 40px rgba(0,0,0,0.7);
      overflow:hidden;
      font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
      font-size:14px;
      line-height:1.6;
      transition:box-shadow 0.2s;
    }
    #cl-header{
      display:flex;
      align-items:center;
      justify-content:space-between;
      padding:11px 16px;
      border-bottom:1px solid #1c1c1c;
      background:#0a0a0a;
      user-select:none;
    }
    #cl-header-left{display:flex;align-items:center;gap:10px}
    #cl-wordmark{font-size:13px;font-weight:600;letter-spacing:2px;color:#fff;text-transform:uppercase}
    #cl-wordmark span{color:#444}
    #cl-meta{font-size:11px;color:#444;letter-spacing:0.5px}
    #cl-header-right{display:flex;align-items:center;gap:6px}
    .cl-btn{
      all:unset;
      cursor:pointer;
      font-size:11px;
      color:#555;
      padding:4px 9px;
      border:1px solid #222;
      border-radius:6px;
      transition:color 0.15s,border-color 0.15s,background 0.15s;
      letter-spacing:0.4px;
      white-space:nowrap;
    }
    .cl-btn:hover{color:#ccc;border-color:#444;background:#111}
    .cl-btn.active{color:#fff;border-color:#555}
    .cl-btn-icon{
      all:unset;
      cursor:pointer;
      font-size:14px;
      color:#444;
      width:26px;height:26px;
      display:flex;align-items:center;justify-content:center;
      border-radius:6px;
      transition:color 0.15s,background 0.15s;
    }
    .cl-btn-icon:hover{color:#ccc;background:#141414}
    #cl-body{
      padding:16px;
      max-height:280px;
      overflow-y:auto;
      scrollbar-width:thin;
      scrollbar-color:#222 transparent;
      transition:max-height 0.25s ease,padding 0.25s ease;
    }
    #cl-body.collapsed{max-height:0;padding-top:0;padding-bottom:0;overflow:hidden}
    #cl-body::-webkit-scrollbar{width:4px}
    #cl-body::-webkit-scrollbar-track{background:transparent}
    #cl-body::-webkit-scrollbar-thumb{background:#222;border-radius:2px}
    #cl-text{color:#bbb;font-size:14px;line-height:1.75;white-space:pre-wrap}
    #cl-cursor{
      display:inline-block;
      width:2px;height:14px;
      background:#555;
      vertical-align:middle;
      margin-left:2px;
      transition:opacity 0.1s;
    }
    .cl-shimmer{
      height:11px;
      margin-bottom:10px;
      border-radius:4px;
      background:#161616;
      position:relative;
      overflow:hidden;
    }
    .cl-shimmer::after{
      content:'';
      position:absolute;
      inset:0;
      background:linear-gradient(90deg,transparent 0%,#202020 50%,transparent 100%);
      animation:sh 1.4s infinite;
    }
    @keyframes sh{0%{transform:translateX(-100%)}100%{transform:translateX(100%)}}
  `;

  function ensureShadowStyles() {
    if (!shadowRoot) return;
    if (!shadowRoot.querySelector("style")) {
      const s = document.createElement("style");
      s.textContent = SHADOW_CSS;
      shadowRoot.appendChild(s);
    }
  }

  // ─────────────────────────────────────────────────────────────
  // CLEANUP — cancel timers before rebuilding panel
  // ─────────────────────────────────────────────────────────────
  function cancelTimers() {
    if (streamTimer) { clearTimeout(streamTimer); streamTimer = null; }
    if (cursorTimer) { clearInterval(cursorTimer); cursorTimer = null; }
  }

  function removePanel() {
    cancelTimers();
    stopTTS();
    const host = document.getElementById(PANEL_ID);
    if (host) host.remove();
    shadowRoot = null;
    isCollapsed = false;
  }

  // ─────────────────────────────────────────────────────────────
  // TEXT EXTRACTION
  // Strips nav/ads/footer, normalises whitespace
  // ─────────────────────────────────────────────────────────────
  function extractText() {
    const clone = document.body.cloneNode(true);
    const JUNK = "script,style,noscript,nav,footer,header,aside,iframe," +
      "[class*='ad'],[class*='sidebar'],[class*='cookie'],[class*='banner']," +
      "[class*='popup'],[class*='modal'],[role='navigation'],[role='complementary']";
    clone.querySelectorAll(JUNK).forEach(el => el.remove());
    return (clone.innerText || clone.textContent || "")
      .replace(/[ \t]{2,}/g, " ")
      .replace(/\n{3,}/g, "\n\n")
      .trim()
      .slice(0, 8000);
  }

  // ─────────────────────────────────────────────────────────────
  // READING TIME
  // ─────────────────────────────────────────────────────────────
  function getReadingTime(text) {
    const words = text.trim().split(/\s+/).length;
    const mins = Math.max(1, Math.ceil(words / 200));
    return `${mins} min read`;
  }

  // ─────────────────────────────────────────────────────────────
  // TTS — word-boundary safe, with pause/resume
  // ─────────────────────────────────────────────────────────────
  let ttsActive = false;

  function speak(text) {
    try {
      window.speechSynthesis.cancel();
      ttsActive = true;

      // chunk to avoid browser 200-word TTS cutoff bug
      const CHUNK = 180;
      const words = text.replace(/\s+/g, " ").trim().split(" ");
      const chunks = [];
      for (let i = 0; i < words.length; i += CHUNK) {
        chunks.push(words.slice(i, i + CHUNK).join(" "));
      }

      let idx = 0;
      function speakNext() {
        if (idx >= chunks.length || !ttsActive) return;
        const u = new SpeechSynthesisUtterance(chunks[idx++]);
        u.rate = 1;
        u.pitch = 1;
        u.onend = speakNext;
        u.onerror = () => { ttsActive = false; updateTTSButton(); };
        window.speechSynthesis.speak(u);
      }

      const voices = window.speechSynthesis.getVoices();
      if (voices.length === 0) {
        window.speechSynthesis.onvoiceschanged = () => speakNext();
      } else {
        speakNext();
      }
    } catch (e) {
      console.error("[ClearLit] TTS error:", e);
      ttsActive = false;
    }
  }

  function stopTTS() {
    ttsActive = false;
    try { window.speechSynthesis.cancel(); } catch (_) {}
  }

  function updateTTSButton() {
    if (!shadowRoot) return;
    const btn = shadowRoot.getElementById("cl-tts");
    if (!btn) return;
    btn.textContent = ttsActive ? "⏹ Stop" : "🔊 Read";
    btn.classList.toggle("active", ttsActive);
  }

  // ─────────────────────────────────────────────────────────────
  // PANEL: LOADING
  // ─────────────────────────────────────────────────────────────
  function injectLoading() {
    cancelTimers();
    stopTTS();
    getOrCreateHost();
    ensureShadowStyles();

    const shimmers = Array.from({ length: 4 }, (_, i) =>
      `<div class="cl-shimmer" style="width:${[100,88,94,76][i]}%"></div>`
    ).join("");

    shadowRoot.innerHTML = shadowRoot.querySelector("style").outerHTML + `
      <div id="cl-panel">
        <div id="cl-header">
          <div id="cl-header-left">
            <div id="cl-wordmark">Clear<span>Lit</span></div>
            <div id="cl-meta">Generating…</div>
          </div>
          <div id="cl-header-right">
            <button class="cl-btn-icon" id="cl-close" title="Close">✕</button>
          </div>
        </div>
        <div id="cl-body">${shimmers}</div>
      </div>
    `;

    shadowRoot.getElementById("cl-close").onclick = removePanel;
  }

  // ─────────────────────────────────────────────────────────────
  // PANEL: SUMMARY + WORD STREAM
  // ─────────────────────────────────────────────────────────────
  function injectSummary(summaryText, pageText) {
    cancelTimers();
    stopTTS();
    getOrCreateHost();
    ensureShadowStyles();
    isCollapsed = false;

    const readingTime = getReadingTime(pageText);

    shadowRoot.innerHTML = shadowRoot.querySelector("style").outerHTML + `
      <div id="cl-panel">
        <div id="cl-header">
          <div id="cl-header-left">
            <div id="cl-wordmark">Clear<span>Lit</span></div>
            <div id="cl-meta">${readingTime}</div>
          </div>
          <div id="cl-header-right">
            <button class="cl-btn" id="cl-tts">🔊 Read</button>
            <button class="cl-btn" id="cl-toggle">Collapse</button>
            <button class="cl-btn-icon" id="cl-close" title="Close">✕</button>
          </div>
        </div>
        <div id="cl-body">
          <span id="cl-text"></span><span id="cl-cursor"></span>
        </div>
      </div>
    `;

    // Wire up controls
    shadowRoot.getElementById("cl-close").onclick = removePanel;

    shadowRoot.getElementById("cl-toggle").onclick = () => {
      isCollapsed = !isCollapsed;
      const body = shadowRoot.getElementById("cl-body");
      const btn = shadowRoot.getElementById("cl-toggle");
      body.classList.toggle("collapsed", isCollapsed);
      btn.textContent = isCollapsed ? "Expand" : "Collapse";
    };

    shadowRoot.getElementById("cl-tts").onclick = () => {
      if (ttsActive) {
        stopTTS();
        updateTTSButton();
      } else {
        speak(pageText);
        updateTTSButton();
        // update button when TTS finishes naturally
        const checkDone = setInterval(() => {
          if (!window.speechSynthesis.speaking) {
            ttsActive = false;
            updateTTSButton();
            clearInterval(checkDone);
          }
        }, 500);
      }
    };

    // ── Word streaming ──────────────────────────────────────────
    const words = summaryText.split(/\s+/).filter(Boolean);
    const textEl = shadowRoot.getElementById("cl-text");
    const cursorEl = shadowRoot.getElementById("cl-cursor");
    let i = 0;

    // adaptive speed: shorter summary → slower for readability
    const delay = words.length < 60 ? 40 : 22;

    function streamNext() {
      if (!shadowRoot || !textEl) { cancelTimers(); return; }
      if (i >= words.length) {
        // done — hide cursor
        if (cursorEl) cursorEl.style.display = "none";
        cancelTimers();
        return;
      }
      textEl.textContent += (i === 0 ? "" : " ") + words[i++];
      streamTimer = setTimeout(streamNext, delay);
    }

    streamNext();

    // cursor blink
    cursorTimer = setInterval(() => {
      if (!cursorEl) { cancelTimers(); return; }
      cursorEl.style.opacity = cursorEl.style.opacity === "0" ? "1" : "0";
    }, 500);
  }

  // ─────────────────────────────────────────────────────────────
  // PANEL: ERROR
  // ─────────────────────────────────────────────────────────────
  function injectError(msg) {
    cancelTimers();
    getOrCreateHost();
    ensureShadowStyles();

    shadowRoot.innerHTML = shadowRoot.querySelector("style").outerHTML + `
      <div id="cl-panel">
        <div id="cl-header">
          <div id="cl-header-left">
            <div id="cl-wordmark">Clear<span>Lit</span></div>
          </div>
          <div id="cl-header-right">
            <button class="cl-btn-icon" id="cl-close">✕</button>
          </div>
        </div>
        <div id="cl-body">
          <span style="color:#c0392b;font-size:13px;">⚠ ${msg}</span>
        </div>
      </div>
    `;

    shadowRoot.getElementById("cl-close").onclick = removePanel;
  }

  // ─────────────────────────────────────────────────────────────
  // MESSAGE LISTENER
  // ─────────────────────────────────────────────────────────────
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {

    if (request.action === "triggerSummary") {
      injectLoading();

      const pageText = extractText();

      if (!pageText || pageText.length < 50) {
        injectError("Not enough readable content on this page.");
        sendResponse({ received: true });
        return true;
      }

      chrome.runtime.sendMessage(
        { action: "generateSummary", text: pageText, mode: request.mode || "summary" },
        (res) => {
          if (chrome.runtime.lastError) {
            injectError("Extension error: " + chrome.runtime.lastError.message);
            return;
          }
          if (res && res.success) {
            injectSummary(res.summary, pageText);
          } else {
            injectError(res?.error || "Failed to generate summary.");
          }
        }
      );

      sendResponse({ received: true });
      return true;
    }

    if (request.action === "removeSummary") {
      removePanel();
      sendResponse({ received: true });
    }
  });

})();