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
  // TURA palette: same tokens as popup.css, applied inside shadow DOM
  const SHADOW_CSS = `
    @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;1,9..40,300&family=DM+Mono:wght@400;500&display=swap');
    *{box-sizing:border-box;margin:0;padding:0}

    #cl-panel{
      all:initial;
      pointer-events:all;
      position:fixed;
      top:14px;
      left:50%;
      transform:translateX(-50%);
      width:min(820px,calc(100vw - 28px));
      background:#2b2e2f;
      color:#edecea;
      border:1px solid rgba(255,255,255,0.07);
      border-radius:14px;
      box-shadow:0 16px 64px rgba(0,0,0,0.75), 0 2px 8px rgba(0,0,0,0.4);
      overflow:hidden;
      font-family:'DM Sans',system-ui,sans-serif;
      font-size:13px;
      line-height:1.55;
    }

    /* ── Header ── */
    #cl-header{
      display:flex;
      align-items:center;
      justify-content:space-between;
      padding:11px 16px;
      border-bottom:1px solid rgba(255,255,255,0.07);
      background:#222527;
      user-select:none;
    }
    #cl-header-left{display:flex;align-items:center;gap:12px}

    #cl-wordmark{
      display:flex;align-items:flex-start;gap:1px;line-height:1;
    }
    #cl-wm-top{
      font-family:'DM Mono',monospace;
      font-size:12px;font-weight:500;letter-spacing:0.18em;color:#edecea;
    }
    #cl-wm-bot{
      font-family:'DM Mono',monospace;
      font-size:6.5px;font-weight:400;letter-spacing:0.14em;
      color:#424a4b;line-height:1.2;padding-top:2px;
    }

    #cl-meta{
      font-family:'DM Mono',monospace;
      font-size:9px;font-weight:400;letter-spacing:0.14em;
      color:#424a4b;text-transform:uppercase;
    }

    #cl-header-right{display:flex;align-items:center;gap:5px;flex-wrap:wrap}

    .cl-btn{
      all:unset;cursor:pointer;
      font-family:'DM Mono',monospace;
      font-size:9px;font-weight:500;letter-spacing:0.12em;text-transform:uppercase;
      color:#7c8585;
      padding:4px 9px;
      border:1px solid rgba(255,255,255,0.07);
      border-radius:6px;
      background:transparent;
      transition:color 0.15s,border-color 0.15s,background 0.15s;
      white-space:nowrap;
    }
    .cl-btn:hover{
      color:#edecea;
      border-color:rgba(255,255,255,0.18);
      background:rgba(255,255,255,0.05);
    }
    .cl-btn.active{
      color:#222527;
      background:#edecea;
      border-color:#edecea;
    }

    .cl-btn-icon{
      all:unset;cursor:pointer;
      font-size:13px;color:#424a4b;
      width:24px;height:24px;
      display:flex;align-items:center;justify-content:center;
      border-radius:6px;
      transition:color 0.15s,background 0.15s;
    }
    .cl-btn-icon:hover{color:#edecea;background:rgba(255,255,255,0.06)}

    /* ── Body ── */
    #cl-body{
      padding:15px 16px;
      max-height:260px;
      overflow-y:auto;
      scrollbar-width:thin;
      scrollbar-color:#363b3c transparent;
      transition:max-height 0.25s cubic-bezier(0.4,0,0.2,1),padding 0.25s;
    }
    #cl-body.collapsed{max-height:0;padding-top:0;padding-bottom:0;overflow:hidden}
    #cl-body::-webkit-scrollbar{width:3px}
    #cl-body::-webkit-scrollbar-thumb{background:#363b3c;border-radius:2px}

    #cl-text{
      font-family:'DM Sans',sans-serif;
      color:#b8bdbd;
      font-size:13px;
      font-weight:300;
      line-height:1.8;
      white-space:pre-wrap;
      letter-spacing:0.01em;
    }
    #cl-cursor{
      display:inline-block;
      width:2px;height:13px;
      background:#7c8585;
      vertical-align:middle;
      margin-left:2px;
      transition:opacity 0.1s;
    }

    /* Shimmer skeleton */
    .cl-shimmer{
      height:10px;margin-bottom:9px;border-radius:4px;
      background:#313536;position:relative;overflow:hidden;
    }
    .cl-shimmer::after{
      content:'';position:absolute;inset:0;
      background:linear-gradient(90deg,transparent 0%,#363b3c 50%,transparent 100%);
      animation:sh 1.5s ease-in-out infinite;
    }
    @keyframes sh{0%{transform:translateX(-100%)}100%{transform:translateX(100%)}}

    /* ── Tone bar ── */
    #cl-tone-bar{
      padding:9px 16px;
      border-top:1px solid rgba(255,255,255,0.06);
      background:#222527;
      display:flex;align-items:center;gap:10px;flex-wrap:wrap;
    }
    .cl-tone-chip{
      font-family:'DM Mono',monospace;
      font-size:8.5px;font-weight:500;letter-spacing:0.14em;text-transform:uppercase;
      padding:3px 8px;border-radius:4px;border:1px solid;
    }
    .cl-tone-chip.tone-neutral   {color:#6fcf85;border-color:rgba(111,207,133,0.2);background:rgba(111,207,133,0.06)}
    .cl-tone-chip.tone-persuasive{color:#c9a55a;border-color:rgba(201,165,90,0.2); background:rgba(201,165,90,0.06)}
    .cl-tone-chip.tone-emotional {color:#c99a70;border-color:rgba(201,154,112,0.2);background:rgba(201,154,112,0.06)}
    .cl-tone-chip.tone-alarming  {color:#c97070;border-color:rgba(201,112,112,0.2);background:rgba(201,112,112,0.06)}
    .cl-tone-chip.tone-promotional{color:#70a8c9;border-color:rgba(112,168,201,0.2);background:rgba(112,168,201,0.06)}

    .cl-bias-bar{display:flex;align-items:center;gap:7px;margin-left:auto}
    .cl-bias-label{
      font-family:'DM Mono',monospace;
      font-size:8px;font-weight:400;letter-spacing:0.12em;color:#424a4b;text-transform:uppercase;
    }
    .cl-bias-track{
      width:68px;height:3px;border-radius:2px;
      background:linear-gradient(90deg,#3a5090,#363b3c,#903a3a);
      position:relative;
    }
    .cl-bias-dot{
      position:absolute;top:50%;transform:translate(-50%,-50%);
      width:7px;height:7px;border-radius:50%;
      background:#edecea;border:1px solid #7c8585;
      transition:left 0.4s cubic-bezier(0.4,0,0.2,1);
    }
    .cl-signals{
      font-family:'DM Sans',sans-serif;
      font-size:10px;font-weight:300;color:#424a4b;font-style:italic;
    }

    /* ── Font controls panel ── */
    #cl-font-panel{
      padding:11px 16px;
      border-top:1px solid rgba(255,255,255,0.06);
      background:#222527;
      display:none;gap:12px;flex-wrap:wrap;align-items:center;
    }
    #cl-font-panel.open{display:flex}
    .cl-fc-label{
      font-family:'DM Mono',monospace;
      font-size:8px;font-weight:500;letter-spacing:0.14em;text-transform:uppercase;
      color:#424a4b;min-width:74px;
    }
    .cl-fc-row{display:flex;align-items:center;gap:8px}
    .cl-range{
      -webkit-appearance:none;appearance:none;
      width:88px;height:2px;border-radius:1px;
      background:#363b3c;outline:none;cursor:pointer;
    }
    .cl-range::-webkit-slider-thumb{
      -webkit-appearance:none;width:11px;height:11px;border-radius:50%;
      background:#7c8585;cursor:pointer;transition:background 0.15s;
    }
    .cl-range::-webkit-slider-thumb:hover{background:#edecea}
    .cl-val{
      font-family:'DM Mono',monospace;
      font-size:9px;color:#424a4b;min-width:26px;text-align:right;
    }
    .cl-select{
      background:#1c1f20;
      border:1px solid rgba(255,255,255,0.07);
      color:#7c8585;
      font-family:'DM Mono',monospace;
      font-size:9.5px;
      padding:3px 6px;
      border-radius:5px;
      cursor:pointer;
      outline:none;
      transition:border-color 0.15s;
    }
    .cl-select:hover{border-color:rgba(255,255,255,0.15)}

    /* ── Export panel ── */
    #cl-export-panel{
      padding:11px 16px;
      border-top:1px solid rgba(255,255,255,0.06);
      background:#222527;
      display:none;gap:6px;flex-wrap:wrap;align-items:center;
    }
    #cl-export-panel.open{display:flex}
    .cl-export-btn{
      all:unset;cursor:pointer;
      font-family:'DM Mono',monospace;
      font-size:9px;font-weight:500;letter-spacing:0.1em;text-transform:uppercase;
      color:#7c8585;
      padding:5px 10px;
      border:1px solid rgba(255,255,255,0.07);
      border-radius:6px;
      background:transparent;
      transition:all 0.15s;
      display:flex;align-items:center;gap:5px;
    }
    .cl-export-btn:hover{
      color:#edecea;
      border-color:rgba(255,255,255,0.18);
      background:rgba(255,255,255,0.05);
    }
    .cl-export-status{
      font-family:'DM Sans',sans-serif;
      font-size:10px;font-weight:300;color:#424a4b;font-style:italic;
    }
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
            <div id="cl-wordmark">
              <span id="cl-wm-top">CL</span>
              <span id="cl-wm-bot">EAR<br>LIT</span>
            </div>
            <div id="cl-meta">ANALYZING…</div>
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
            <div id="cl-wordmark">
              <span id="cl-wm-top">CL</span>
              <span id="cl-wm-bot">EAR<br>LIT</span>
            </div>
            <div id="cl-meta">${readingTime}</div>
          </div>
          <div id="cl-header-right">
            <button class="cl-btn" id="cl-tts">READ</button>
            <button class="cl-btn" id="cl-font-btn">Aa</button>
            <button class="cl-btn" id="cl-export-btn-hdr">EXPORT</button>
            <button class="cl-btn" id="cl-toggle">COLLAPSE</button>
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
          <div id="cl-header-left">
            <div id="cl-wordmark">
              <span id="cl-wm-top">CL</span>
              <span id="cl-wm-bot">EAR<br>LIT</span>
            </div>
          </div>
          <div id="cl-header-right"><button class="cl-btn-icon" id="cl-close">✕</button></div>
        </div>
        <div id="cl-body">
          <span style="font-family:'Barlow',sans-serif;font-size:12px;font-weight:300;color:#f0b8b8;">⚠ ${msg}</span>
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
