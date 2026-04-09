// content.js — CLEARLIT v2.1
// Medium features: font/spacing controls, focus highlight line, bias & tone detector,
// source credibility badge, keyboard shortcuts

(function () {
  "use strict";

  const PANEL_ID = "clearlit-root-host";
  const FOCUS_BAR_ID = "clearlit-focus-bar";
  const CRED_BADGE_ID = "clearlit-cred-badge";

  // ─── STATE ───────────────────────────────────────────────────
  let streamTimer = null;
  let cursorTimer = null;
  let isCollapsed = false;
  let shadowRoot = null;
  let currentSummary = "";
  let currentPageText = "";
  let focusActive = false;
  let focusBarEl = null;
  let credBadgeEl = null;
  let shortcutsEnabled = true;

  // ─── SHADOW DOM HOST ─────────────────────────────────────────
  function getOrCreateHost() {
    let host = document.getElementById(PANEL_ID);
    if (!host) {
      host = document.createElement("div");
      host.id = PANEL_ID;
      host.style.cssText = [
        "all:initial","position:fixed","top:0","left:0","width:100%",
        "z-index:2147483647","pointer-events:none",
        "font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif"
      ].join(";");
      document.body.appendChild(host);
      shadowRoot = host.attachShadow({ mode: "open" });
    }
    return host;
  }

  // ─── SHADOW STYLES ───────────────────────────────────────────
  const SHADOW_CSS = `
    *{box-sizing:border-box;margin:0;padding:0}
    #cl-panel{
      all:initial;pointer-events:all;position:fixed;
      top:16px;left:50%;transform:translateX(-50%);
      width:min(860px,calc(100vw - 32px));
      background:#0c0c0c;color:#e0e0e0;
      border-radius:14px;border:1px solid #222;
      box-shadow:0 8px 40px rgba(0,0,0,0.7);overflow:hidden;
      font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
      font-size:14px;line-height:1.6;
    }
    #cl-header{
      display:flex;align-items:center;justify-content:space-between;
      padding:11px 16px;border-bottom:1px solid #1c1c1c;
      background:#0a0a0a;user-select:none;
    }
    #cl-header-left{display:flex;align-items:center;gap:10px}
    #cl-wordmark{font-size:13px;font-weight:600;letter-spacing:2px;color:#fff;text-transform:uppercase}
    #cl-wordmark span{color:#444}
    #cl-meta{font-size:11px;color:#444;letter-spacing:0.5px}
    #cl-header-right{display:flex;align-items:center;gap:6px;flex-wrap:wrap}
    .cl-btn{
      all:unset;cursor:pointer;font-size:11px;color:#555;
      padding:4px 9px;border:1px solid #222;border-radius:6px;
      transition:color 0.15s,border-color 0.15s,background 0.15s;
      letter-spacing:0.4px;white-space:nowrap;
    }
    .cl-btn:hover{color:#ccc;border-color:#444;background:#111}
    .cl-btn.active{color:#fff;border-color:#555;background:#1a1a1a}
    .cl-btn-icon{
      all:unset;cursor:pointer;font-size:14px;color:#444;
      width:26px;height:26px;display:flex;align-items:center;
      justify-content:center;border-radius:6px;
      transition:color 0.15s,background 0.15s;
    }
    .cl-btn-icon:hover{color:#ccc;background:#141414}
    #cl-body{
      padding:16px;max-height:320px;overflow-y:auto;
      scrollbar-width:thin;scrollbar-color:#222 transparent;
      transition:max-height 0.25s ease,padding 0.25s ease;
    }
    #cl-body.collapsed{max-height:0;padding-top:0;padding-bottom:0;overflow:hidden}
    #cl-body::-webkit-scrollbar{width:4px}
    #cl-body::-webkit-scrollbar-track{background:transparent}
    #cl-body::-webkit-scrollbar-thumb{background:#222;border-radius:2px}
    #cl-text{color:#bbb;font-size:14px;line-height:1.75;white-space:pre-wrap}
    #cl-cursor{
      display:inline-block;width:2px;height:14px;background:#555;
      vertical-align:middle;margin-left:2px;transition:opacity 0.1s;
    }
    .cl-shimmer{
      height:11px;margin-bottom:10px;border-radius:4px;
      background:#161616;position:relative;overflow:hidden;
    }
    .cl-shimmer::after{
      content:'';position:absolute;inset:0;
      background:linear-gradient(90deg,transparent 0%,#202020 50%,transparent 100%);
      animation:sh 1.4s infinite;
    }
    @keyframes sh{0%{transform:translateX(-100%)}100%{transform:translateX(100%)}}

    /* ── TONE BAR ── */
    #cl-tone-bar{
      padding:10px 16px;border-top:1px solid #1a1a1a;
      background:#080808;display:flex;align-items:center;gap:12px;
      flex-wrap:wrap;
    }
    .cl-tone-chip{
      font-size:10px;letter-spacing:0.5px;padding:3px 8px;
      border-radius:100px;border:1px solid #222;color:#666;
    }
    .cl-tone-chip.tone-neutral{color:#8aad8a;border-color:#2a3d2a}
    .cl-tone-chip.tone-persuasive{color:#adad8a;border-color:#3d3d2a}
    .cl-tone-chip.tone-emotional{color:#ad8a8a;border-color:#3d2a2a}
    .cl-tone-chip.tone-alarming{color:#c06060;border-color:#3d2020}
    .cl-tone-chip.tone-promotional{color:#8aadc0;border-color:#2a3040}
    .cl-bias-bar{display:flex;align-items:center;gap:6px;margin-left:auto}
    .cl-bias-label{font-size:10px;color:#444;letter-spacing:0.3px}
    .cl-bias-track{
      width:80px;height:4px;border-radius:2px;
      background:linear-gradient(90deg,#3060c0,#444,#c03030);
      position:relative;
    }
    .cl-bias-dot{
      position:absolute;top:50%;transform:translate(-50%,-50%);
      width:8px;height:8px;border-radius:50%;background:#fff;
      border:1px solid #555;transition:left 0.4s;
    }
    .cl-signals{font-size:10px;color:#3a3a3a;font-style:italic}

    /* ── FONT CONTROLS PANEL ── */
    #cl-font-panel{
      padding:12px 16px;border-top:1px solid #1a1a1a;
      background:#060606;display:none;gap:14px;flex-wrap:wrap;align-items:center;
    }
    #cl-font-panel.open{display:flex}
    .cl-fc-label{font-size:10px;color:#444;letter-spacing:0.4px;min-width:70px}
    .cl-fc-row{display:flex;align-items:center;gap:8px}
    .cl-range{
      -webkit-appearance:none;appearance:none;
      width:90px;height:3px;border-radius:2px;
      background:#222;outline:none;cursor:pointer;
    }
    .cl-range::-webkit-slider-thumb{
      -webkit-appearance:none;width:12px;height:12px;border-radius:50%;
      background:#555;cursor:pointer;transition:background 0.15s;
    }
    .cl-range::-webkit-slider-thumb:hover{background:#aaa}
    .cl-val{font-size:10px;color:#555;min-width:24px;text-align:right}
    .cl-select{
      background:#111;border:1px solid #222;color:#888;
      font-size:11px;padding:2px 6px;border-radius:4px;cursor:pointer;
    }
    .cl-select:focus{outline:none;border-color:#444}

    /* ── EXPORT PANEL ── */
    #cl-export-panel{
      padding:12px 16px;border-top:1px solid #1a1a1a;
      background:#060606;display:none;gap:8px;flex-wrap:wrap;align-items:center;
    }
    #cl-export-panel.open{display:flex}
    .cl-export-btn{
      all:unset;cursor:pointer;font-size:11px;color:#666;
      padding:5px 12px;border:1px solid #222;border-radius:6px;
      transition:all 0.15s;display:flex;align-items:center;gap:5px;
    }
    .cl-export-btn:hover{color:#ccc;border-color:#444;background:#111}
    .cl-export-status{font-size:11px;color:#555;font-style:italic}
  `;

  function ensureShadowStyles() {
    if (!shadowRoot || shadowRoot.querySelector("style")) return;
    const s = document.createElement("style");
    s.textContent = SHADOW_CSS;
    shadowRoot.appendChild(s);
  }

  // ─── TIMERS ──────────────────────────────────────────────────
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

  // ─── TEXT EXTRACTION ─────────────────────────────────────────
  function extractText() {
    const clone = document.body.cloneNode(true);
    const JUNK = "script,style,noscript,nav,footer,header,aside,iframe," +
      "[class*='ad'],[class*='sidebar'],[class*='cookie'],[class*='banner']," +
      "[class*='popup'],[class*='modal'],[role='navigation'],[role='complementary']";
    clone.querySelectorAll(JUNK).forEach(el => el.remove());
    return (clone.innerText || clone.textContent || "")
      .replace(/[ \t]{2,}/g, " ").replace(/\n{3,}/g, "\n\n").trim().slice(0, 8000);
  }

  function getReadingTime(text) {
    const words = text.trim().split(/\s+/).length;
    return `${Math.max(1, Math.ceil(words / 200))} min read`;
  }

  // ─── TTS ─────────────────────────────────────────────────────
  let ttsActive = false;

  function speak(text) {
    try {
      window.speechSynthesis.cancel();
      ttsActive = true;
      const CHUNK = 180;
      const words = text.replace(/\s+/g, " ").trim().split(" ");
      const chunks = [];
      for (let i = 0; i < words.length; i += CHUNK) chunks.push(words.slice(i, i + CHUNK).join(" "));
      let idx = 0;
      function speakNext() {
        if (idx >= chunks.length || !ttsActive) return;
        const u = new SpeechSynthesisUtterance(chunks[idx++]);
        u.rate = 1; u.pitch = 1;
        u.onend = speakNext;
        u.onerror = () => { ttsActive = false; updateTTSButton(); };
        window.speechSynthesis.speak(u);
      }
      const voices = window.speechSynthesis.getVoices();
      if (!voices.length) window.speechSynthesis.onvoiceschanged = speakNext;
      else speakNext();
    } catch(e) { ttsActive = false; }
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

  // ─── PANEL: LOADING ──────────────────────────────────────────
  function injectLoading() {
    cancelTimers(); stopTTS();
    getOrCreateHost(); ensureShadowStyles();
    const shimmers = Array.from({length:4},(_,i) =>
      `<div class="cl-shimmer" style="width:${[100,88,94,76][i]}%"></div>`
    ).join("");
    shadowRoot.innerHTML = shadowRoot.querySelector("style").outerHTML + `
      <div id="cl-panel">
        <div id="cl-header">
          <div id="cl-header-left">
            <div id="cl-wordmark">Clear<span>Lit</span></div>
            <div id="cl-meta">Analyzing…</div>
          </div>
          <div id="cl-header-right">
            <button class="cl-btn-icon" id="cl-close">✕</button>
          </div>
        </div>
        <div id="cl-body">${shimmers}</div>
      </div>`;
    shadowRoot.getElementById("cl-close").onclick = removePanel;
  }

  // ─── TONE BAR HTML ───────────────────────────────────────────
  function buildToneBar(toneData) {
    if (!toneData || toneData.tone === "unknown") return "";
    const biasPositions = {
      "left": 5, "center-left": 25, "center": 50,
      "center-right": 75, "right": 95, "unknown": 50
    };
    const pos = biasPositions[toneData.bias] ?? 50;
    const signals = (toneData.signals || []).slice(0, 2).map(s => `"${s}"`).join(" · ");
    return `
      <div id="cl-tone-bar">
        <span class="cl-tone-chip tone-${toneData.tone}">${toneData.tone.toUpperCase()}</span>
        ${signals ? `<span class="cl-signals">${signals}</span>` : ""}
        <div class="cl-bias-bar">
          <span class="cl-bias-label">BIAS</span>
          <div class="cl-bias-track">
            <div class="cl-bias-dot" style="left:${pos}%"></div>
          </div>
          <span class="cl-bias-label" style="color:#555">${toneData.bias}</span>
        </div>
      </div>`;
  }

  // ─── FONT CONTROLS HTML ──────────────────────────────────────
  function buildFontPanel() {
    return `
      <div id="cl-font-panel">
        <div class="cl-fc-row">
          <span class="cl-fc-label">FONT SIZE</span>
          <input class="cl-range" id="fc-size" type="range" min="12" max="24" value="16" step="1">
          <span class="cl-val" id="fc-size-val">16px</span>
        </div>
        <div class="cl-fc-row">
          <span class="cl-fc-label">LINE HEIGHT</span>
          <input class="cl-range" id="fc-lh" type="range" min="1.2" max="2.4" value="1.6" step="0.1">
          <span class="cl-val" id="fc-lh-val">1.6</span>
        </div>
        <div class="cl-fc-row">
          <span class="cl-fc-label">COLUMN WIDTH</span>
          <input class="cl-range" id="fc-col" type="range" min="40" max="100" value="75" step="5">
          <span class="cl-val" id="fc-col-val">75%</span>
        </div>
        <div class="cl-fc-row">
          <span class="cl-fc-label">FONT FAMILY</span>
          <select class="cl-select" id="fc-font">
            <option value="inherit">Default</option>
            <option value="Georgia,serif">Georgia</option>
            <option value="'Times New Roman',serif">Times</option>
            <option value="'Courier New',monospace">Mono</option>
            <option value="OpenDyslexic,sans-serif">Dyslexic</option>
          </select>
        </div>
      </div>`;
  }

  // ─── EXPORT PANEL HTML ───────────────────────────────────────
  function buildExportPanel() {
    return `
      <div id="cl-export-panel">
        <button class="cl-export-btn" id="cl-exp-copy">📋 Copy</button>
        <button class="cl-export-btn" id="cl-exp-notion">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
            <path d="M4.459 4.208c.746.606 1.026.56 2.428.466l13.215-.793c.28 0 .047-.28-.046-.326L17.86 1.968c-.42-.326-.981-.7-2.055-.607L3.01 2.295c-.466.046-.56.28-.374.466zm.793 3.08v13.904c0 .747.373 1.027 1.214.98l14.523-.84c.841-.046.935-.56.935-1.167V6.354c0-.606-.233-.933-.748-.887l-15.177.887c-.56.047-.747.327-.747.933zm14.337.745c.093.42 0 .84-.42.888l-.7.14v10.264c-.608.327-1.168.514-1.635.514-.748 0-.935-.234-1.495-.933l-4.577-7.186v6.952L12.21 19s0 .84-1.168.84l-3.222.186c-.093-.186 0-.653.327-.746l.84-.233V9.854L7.822 9.76c-.094-.42.14-1.026.793-1.073l3.456-.233 4.764 7.279v-6.44l-1.215-.139c-.093-.514.28-.887.747-.933zM1.936 1.035l13.31-.98c1.634-.14 2.055-.047 3.082.7l4.249 2.986c.7.513.934.653.934 1.213v16.378c0 1.026-.373 1.634-1.68 1.726l-15.458.934c-.98.047-1.448-.093-1.962-.747l-3.129-4.06c-.56-.747-.793-1.306-.793-1.96V2.667c0-.839.374-1.54 1.447-1.632z"/>
          </svg>
          Notion
        </button>
        <button class="cl-export-btn" id="cl-exp-obsidian">📓 Obsidian</button>
        <span class="cl-export-status" id="cl-exp-status"></span>
      </div>`;
  }

  // ─── PANEL: SUMMARY ──────────────────────────────────────────
  function injectSummary(summaryText, pageText, toneData) {
    cancelTimers(); stopTTS();
    getOrCreateHost(); ensureShadowStyles();
    isCollapsed = false;
    currentSummary = summaryText;
    currentPageText = pageText;

    const readingTime = getReadingTime(pageText);
    const toneBar = buildToneBar(toneData);
    const fontPanel = buildFontPanel();
    const exportPanel = buildExportPanel();

    shadowRoot.innerHTML = shadowRoot.querySelector("style").outerHTML + `
      <div id="cl-panel">
        <div id="cl-header">
          <div id="cl-header-left">
            <div id="cl-wordmark">Clear<span>Lit</span></div>
            <div id="cl-meta">${readingTime}</div>
          </div>
          <div id="cl-header-right">
            <button class="cl-btn" id="cl-tts">🔊 Read</button>
            <button class="cl-btn" id="cl-font-btn">Aa</button>
            <button class="cl-btn" id="cl-export-btn-hdr">Export</button>
            <button class="cl-btn" id="cl-toggle">Collapse</button>
            <button class="cl-btn-icon" id="cl-close">✕</button>
          </div>
        </div>
        <div id="cl-body">
          <span id="cl-text"></span><span id="cl-cursor"></span>
        </div>
        ${toneBar}
        ${fontPanel}
        ${exportPanel}
      </div>`;

    // Controls
    shadowRoot.getElementById("cl-close").onclick = removePanel;

    shadowRoot.getElementById("cl-toggle").onclick = () => {
      isCollapsed = !isCollapsed;
      shadowRoot.getElementById("cl-body").classList.toggle("collapsed", isCollapsed);
      shadowRoot.getElementById("cl-toggle").textContent = isCollapsed ? "Expand" : "Collapse";
    };

    shadowRoot.getElementById("cl-tts").onclick = () => {
      if (ttsActive) { stopTTS(); updateTTSButton(); }
      else {
        speak(pageText); updateTTSButton();
        const check = setInterval(() => {
          if (!window.speechSynthesis.speaking) { ttsActive=false; updateTTSButton(); clearInterval(check); }
        }, 500);
      }
    };

    // Font controls toggle
    shadowRoot.getElementById("cl-font-btn").onclick = () => {
      const fp = shadowRoot.getElementById("cl-font-panel");
      fp.classList.toggle("open");
      shadowRoot.getElementById("cl-font-btn").classList.toggle("active", fp.classList.contains("open"));
    };

    // Export panel toggle
    shadowRoot.getElementById("cl-export-btn-hdr").onclick = () => {
      const ep = shadowRoot.getElementById("cl-export-panel");
      ep.classList.toggle("open");
      shadowRoot.getElementById("cl-export-btn-hdr").classList.toggle("active", ep.classList.contains("open"));
    };

    // Font controls
    wireFontControls();

    // Export actions
    wireExportActions();

    // Word stream
    const words = summaryText.split(/\s+/).filter(Boolean);
    const textEl = shadowRoot.getElementById("cl-text");
    const cursorEl = shadowRoot.getElementById("cl-cursor");
    let i = 0;
    const delay = words.length < 60 ? 40 : 22;

    function streamNext() {
      if (!shadowRoot || !textEl) { cancelTimers(); return; }
      if (i >= words.length) { if (cursorEl) cursorEl.style.display = "none"; cancelTimers(); return; }
      textEl.textContent += (i === 0 ? "" : " ") + words[i++];
      streamTimer = setTimeout(streamNext, delay);
    }
    streamNext();
    cursorTimer = setInterval(() => {
      if (!cursorEl) { cancelTimers(); return; }
      cursorEl.style.opacity = cursorEl.style.opacity === "0" ? "1" : "0";
    }, 500);
  }

  // ─── FONT CONTROLS WIRING ────────────────────────────────────
  function wireFontControls() {
    if (!shadowRoot) return;

    // OpenDyslexic font injection (inline base — browser will load from Google fallback)
    const style = document.createElement("style");
    style.id = "clearlit-page-font";
    document.head.appendChild(style);

    function applyPageStyles() {
      const size = shadowRoot.getElementById("fc-size")?.value || 16;
      const lh = shadowRoot.getElementById("fc-lh")?.value || 1.6;
      const col = shadowRoot.getElementById("fc-col")?.value || 75;
      const font = shadowRoot.getElementById("fc-font")?.value || "inherit";

      shadowRoot.getElementById("fc-size-val").textContent = size + "px";
      shadowRoot.getElementById("fc-lh-val").textContent = parseFloat(lh).toFixed(1);
      shadowRoot.getElementById("fc-col-val").textContent = col + "%";

      // If dyslexic font, inject @import
      if (font.includes("OpenDyslexic")) {
        style.textContent = `
          @import url('https://fonts.googleapis.com/css2?family=Lexend:wght@300;400;500&display=swap');
          article, main, .article, .post, .content, p, h1, h2, h3, h4 {
            font-family: 'Lexend', sans-serif !important;
            font-size: ${size}px !important;
            line-height: ${lh} !important;
            max-width: ${col}% !important;
            margin-left: auto !important;
            margin-right: auto !important;
          }`;
      } else {
        style.textContent = `
          article, main, .article, .post, .content, p {
            font-family: ${font} !important;
            font-size: ${size}px !important;
            line-height: ${lh} !important;
            max-width: ${col}% !important;
            margin-left: auto !important;
            margin-right: auto !important;
          }`;
      }
    }

    ["fc-size","fc-lh","fc-col"].forEach(id => {
      shadowRoot.getElementById(id)?.addEventListener("input", applyPageStyles);
    });
    shadowRoot.getElementById("fc-font")?.addEventListener("change", applyPageStyles);
  }

  // ─── EXPORT WIRING ───────────────────────────────────────────
  function wireExportActions() {
    if (!shadowRoot) return;

    const setStatus = (msg, ok = true) => {
      const el = shadowRoot.getElementById("cl-exp-status");
      if (el) { el.textContent = msg; el.style.color = ok ? "#4a8a4a" : "#8a4a4a"; }
    };

    // Copy to clipboard
    shadowRoot.getElementById("cl-exp-copy").onclick = () => {
      const text = `${document.title}\n${window.location.href}\n\n${currentSummary}`;
      navigator.clipboard.writeText(text)
        .then(() => setStatus("Copied!"))
        .catch(() => setStatus("Copy failed", false));
    };

    // Notion export
    shadowRoot.getElementById("cl-exp-notion").onclick = () => {
      setStatus("Exporting to Notion…");
      chrome.runtime.sendMessage({
        action: "exportToNotion",
        title: document.title,
        summary: currentSummary,
        url: window.location.href
      }, res => {
        if (res?.success) setStatus("Saved to Notion ✓");
        else setStatus(res?.error || "Notion export failed", false);
      });
    };

    // Obsidian (deep link)
    shadowRoot.getElementById("cl-exp-obsidian").onclick = () => {
      const vault = ""; // user's vault name — blank opens default
      const title = encodeURIComponent(document.title);
      const content = encodeURIComponent(
        `# ${document.title}\n**URL:** ${window.location.href}\n**Date:** ${new Date().toLocaleDateString()}\n\n## Summary\n${currentSummary}`
      );
      window.open(`obsidian://new?vault=${vault}&name=${title}&content=${content}`, "_blank");
      setStatus("Opened in Obsidian");
    };
  }

  // ─── PANEL: ERROR ────────────────────────────────────────────
  function injectError(msg) {
    cancelTimers();
    getOrCreateHost(); ensureShadowStyles();
    shadowRoot.innerHTML = shadowRoot.querySelector("style").outerHTML + `
      <div id="cl-panel">
        <div id="cl-header">
          <div id="cl-header-left"><div id="cl-wordmark">Clear<span>Lit</span></div></div>
          <div id="cl-header-right"><button class="cl-btn-icon" id="cl-close">✕</button></div>
        </div>
        <div id="cl-body">
          <span style="color:#c0392b;font-size:13px;">⚠ ${msg}</span>
        </div>
      </div>`;
    shadowRoot.getElementById("cl-close").onclick = removePanel;
  }

  // ─── FOCUS HIGHLIGHT ─────────────────────────────────────────
  function enableFocusHighlight() {
    if (focusActive) return;
    focusActive = true;

    const overlay = document.createElement("div");
    overlay.id = FOCUS_BAR_ID;
    overlay.style.cssText = [
      "position:fixed","left:0","right:0","pointer-events:none",
      "z-index:2147483640","transition:top 0.1s ease"
    ].join(";");
    document.body.appendChild(overlay);
    focusBarEl = overlay;

    const bar = document.createElement("div");
    bar.style.cssText = [
      "position:absolute","left:0","right:0",
      "height:2.5em","background:rgba(255,255,200,0.06)",
      "border-top:1px solid rgba(255,255,200,0.1)",
      "border-bottom:1px solid rgba(255,255,200,0.1)",
      "pointer-events:none"
    ].join(";");
    overlay.appendChild(bar);

    // Top shadow (dims above)
    const topShade = document.createElement("div");
    topShade.style.cssText = [
      "position:fixed","left:0","right:0","top:0",
      "pointer-events:none","z-index:2147483639",
      "transition:height 0.1s ease"
    ].join(";");
    document.body.appendChild(topShade);

    // Bottom shadow (dims below)
    const botShade = document.createElement("div");
    botShade.style.cssText = [
      "position:fixed","left:0","right:0","bottom:0",
      "pointer-events:none","z-index:2147483639",
      "transition:height 0.1s ease"
    ].join(";");
    document.body.appendChild(botShade);

    overlay._topShade = topShade;
    overlay._botShade = botShade;

    document.addEventListener("mousemove", onFocusMove);
  }

  function onFocusMove(e) {
    if (!focusBarEl) return;
    const y = e.clientY;
    const lineH = 28;
    const barTop = y - lineH / 2;
    focusBarEl.style.top = barTop + "px";
    focusBarEl.children[0].style.top = "0";

    focusBarEl._topShade.style.height = Math.max(0, barTop) + "px";
    focusBarEl._topShade.style.background = "rgba(0,0,0,0.45)";
    focusBarEl._botShade.style.height = Math.max(0, window.innerHeight - barTop - lineH) + "px";
    focusBarEl._botShade.style.background = "rgba(0,0,0,0.45)";
  }

  function disableFocusHighlight() {
    focusActive = false;
    document.removeEventListener("mousemove", onFocusMove);
    if (focusBarEl) {
      if (focusBarEl._topShade) focusBarEl._topShade.remove();
      if (focusBarEl._botShade) focusBarEl._botShade.remove();
      focusBarEl.remove();
      focusBarEl = null;
    }
  }

  // ─── CREDIBILITY BADGE ───────────────────────────────────────
  function injectCredibilityBadge(scoreData) {
    if (credBadgeEl) credBadgeEl.remove();

    const colors = {
      high: { bg: "#0a1f0a", text: "#4ade80", border: "#1a3d1a" },
      moderate: { bg: "#1f1a0a", text: "#facc15", border: "#3d3010" },
      low: { bg: "#1f0a0a", text: "#f87171", border: "#3d1010" },
      "very-low": { bg: "#2a0505", text: "#ef4444", border: "#5a0a0a" },
      unknown: { bg: "#141414", text: "#666", border: "#222" }
    };

    const c = colors[scoreData.tier] || colors.unknown;

    const badge = document.createElement("div");
    badge.id = CRED_BADGE_ID;
    badge.style.cssText = [
      "position:fixed","bottom:20px","right:20px",
      `background:${c.bg}`,`color:${c.text}`,`border:1px solid ${c.border}`,
      "border-radius:100px","padding:5px 12px","font-size:11px",
      "font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",
      "letter-spacing:0.5px","z-index:2147483646","cursor:pointer",
      "transition:opacity 0.3s","display:flex","align-items:center","gap:6px"
    ].join(";");

    const tierLabels = { high: "High trust", moderate: "Moderate trust", low: "Low trust", "very-low": "Low trust", unknown: "Unknown source" };
    badge.innerHTML = `<span style="font-weight:600">${scoreData.score}</span><span style="opacity:0.7">${tierLabels[scoreData.tier] || "Unknown"}</span>`;
    badge.title = `Domain: ${scoreData.domain}\nCredibility score: ${scoreData.score}/100\nSource: ${scoreData.source}`;

    badge.onclick = () => badge.style.opacity = "0";

    document.body.appendChild(badge);
    credBadgeEl = badge;

    // Auto-fade after 6s
    setTimeout(() => { if (badge.parentNode) badge.style.opacity = "0.3"; }, 6000);
  }

  // ─── KEYBOARD SHORTCUTS ──────────────────────────────────────
  function setupShortcuts() {
    document.addEventListener("keydown", (e) => {
      if (!shortcutsEnabled) return;
      // Don't fire in inputs
      if (["INPUT","TEXTAREA","SELECT"].includes(document.activeElement.tagName)) return;
      if (document.activeElement.isContentEditable) return;

      const meta = e.ctrlKey || e.metaKey;
      const shift = e.shiftKey;

      // Alt+S — summarize
      if (e.altKey && e.key === "s") {
        e.preventDefault();
        chrome.runtime.sendMessage({ action: "triggerSummaryFromPage", mode: "summary" });
      }

      // Alt+K — key points
      if (e.altKey && e.key === "k") {
        e.preventDefault();
        chrome.runtime.sendMessage({ action: "triggerSummaryFromPage", mode: "keypoints" });
      }

      // Alt+X — close panel
      if (e.altKey && e.key === "x") {
        e.preventDefault();
        removePanel();
      }

      // Alt+F — focus highlight toggle
      if (e.altKey && e.key === "f") {
        e.preventDefault();
        focusActive ? disableFocusHighlight() : enableFocusHighlight();
      }

      // Alt+R — read aloud toggle
      if (e.altKey && e.key === "r") {
        e.preventDefault();
        if (ttsActive) { stopTTS(); updateTTSButton(); }
        else if (currentPageText) { speak(currentPageText); updateTTSButton(); }
      }
    });
  }

  // ─── MESSAGE LISTENER ────────────────────────────────────────
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {

    if (request.action === "triggerSummary" || request.action === "triggerSummaryFromPage") {
      injectLoading();
      const pageText = extractText();

      if (!pageText || pageText.length < 50) {
        injectError("Not enough readable content on this page.");
        sendResponse({ received: true });
        return true;
      }

      // Fire credibility check in parallel
      const domain = window.location.hostname;
      chrome.runtime.sendMessage({ action: "getCredibilityScore", domain }, res => {
        if (res?.success) injectCredibilityBadge(res.score);
      });

      // Main summary + tone analysis in parallel
      const mode = request.mode || "summary";

      chrome.runtime.sendMessage(
        { action: "generateSummary", text: pageText, mode },
        summaryRes => {
          if (chrome.runtime.lastError) {
            injectError("Extension error: " + chrome.runtime.lastError.message);
            return;
          }
          if (!summaryRes?.success) {
            injectError(summaryRes?.error || "Failed to generate summary.");
            return;
          }

          // Tone analysis after summary
          chrome.runtime.sendMessage(
            { action: "generateSummary", text: pageText, mode: "tone" },
            toneRes => {
              let toneData = null;
              if (toneRes?.success) {
                try {
                  const clean = toneRes.summary.replace(/```json|```/g, "").trim();
                  toneData = JSON.parse(clean);
                } catch (_) {}
              }
              injectSummary(summaryRes.summary, pageText, toneData);
            }
          );
        }
      );

      sendResponse({ received: true });
      return true;
    }

    if (request.action === "removeSummary") {
      removePanel();
      sendResponse({ received: true });
    }

    if (request.action === "toggleFocusHighlight") {
      focusActive ? disableFocusHighlight() : enableFocusHighlight();
      sendResponse({ active: focusActive });
    }

    if (request.action === "getPageInfo") {
      sendResponse({
        domain: window.location.hostname,
        title: document.title,
        url: window.location.href
      });
    }
  });

  // ─── INIT ────────────────────────────────────────────────────
  setupShortcuts();

})();
