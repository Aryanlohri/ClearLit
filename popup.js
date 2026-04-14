// popup.js — CLEARLIT v2.1

"use strict";

const $ = id => document.getElementById(id);

document.addEventListener("DOMContentLoaded", async () => {
  await detectAuthLabel();
  await loadSettings();
  setupModePills();
  setupToggles();
  setupPomodoro();
  setupGenerate();
  setupSettings();
  setupFontBtn();
});

// ─── AUTH LABEL ──────────────────────────────────────────────
async function detectAuthLabel() {
  try {
    const res = await fetch(chrome.runtime.getURL("credentials.json"));
    if (res.ok) {
      const d = await res.json();
      if (d.client_email && d.private_key) {
        $("summary-ai-label").textContent = "GEMINI · GOOGLE VERTEX AI";
        return;
      }
    }
  } catch (_) {}
  const { apiKey } = await chrome.storage.sync.get("apiKey");
  $("summary-ai-label").textContent = apiKey ? "CLAUDE · ANTHROPIC" : "NO KEY — ADD IN SETTINGS";
}

// ─── LOAD SETTINGS ───────────────────────────────────────────
async function loadSettings() {
  const s = await new Promise(r => chrome.storage.sync.get(null, r));
  if (s.apiKey)         $("input-api-key").value      = s.apiKey;
  if (s.notionKey)      $("input-notion-key").value   = s.notionKey;
  if (s.notionDbId)     $("input-notion-db").value    = s.notionDbId;
  if (s.focusHighlight) $("toggle-focus").checked     = true;
  if (s.bionic)         $("toggle-bionic").checked    = true;
  if (s.cinematic)      $("toggle-cinematic").checked = true;
}

// ─── MODE PILLS ──────────────────────────────────────────────
let selectedMode = "summary";
function setupModePills() {
  document.querySelectorAll(".pill[data-mode]").forEach(p => {
    p.addEventListener("click", () => {
      document.querySelectorAll(".pill[data-mode]").forEach(x => x.classList.remove("active"));
      p.classList.add("active");
      selectedMode = p.dataset.mode;
    });
  });
}

// ─── TOGGLES ─────────────────────────────────────────────────
function setupToggles() {
  const send = (action, extra = {}) =>
    chrome.tabs.query({ active: true, currentWindow: true }, tabs =>
      chrome.tabs.sendMessage(tabs[0].id, { action, ...extra }));

  $("toggle-focus").addEventListener("change", e => {
    send("toggleFocusHighlight");
    chrome.storage.sync.set({ focusHighlight: e.target.checked });
  });
  $("toggle-cinematic").addEventListener("change", e => {
    send("toggleCinematic", { enabled: e.target.checked });
    chrome.storage.sync.set({ cinematic: e.target.checked });
  });
  $("toggle-bionic").addEventListener("change", e => {
    send("toggleBionic", { enabled: e.target.checked });
    chrome.storage.sync.set({ bionic: e.target.checked });
  });
  $("toggle-tts").addEventListener("change", e => {
    if (e.target.checked) send("toggleTTS");
  });
}

// ─── POMODORO ────────────────────────────────────────────────
let pomoTimer = null, pomoSecs = 25 * 60, pomoRunning = false;
let pomoBreak = false, pomoMins = 25;

function fmt(s) {
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

function setupPomodoro() {
  document.querySelectorAll(".pomo-pill").forEach(p => {
    p.addEventListener("click", () => {
      document.querySelectorAll(".pomo-pill").forEach(x => x.classList.remove("active"));
      p.classList.add("active");
      pomoMins = parseInt(p.dataset.mins);
      resetPomo();
    });
  });
  $("pomo-start").addEventListener("click", () => pomoRunning ? pausePomo() : startPomo());
  $("pomo-reset").addEventListener("click", resetPomo);
}

function startPomo() {
  pomoRunning = true;
  $("pomo-start").textContent = "Pause";
  $("pomo-start").classList.add("active-run");
  $("pomo-display").className = "pomo-display running";
  pomoTimer = setInterval(() => {
    pomoSecs--;
    $("pomo-display").textContent = fmt(pomoSecs);
    if (pomoSecs <= 0) {
      clearInterval(pomoTimer); pomoRunning = false;
      $("pomo-display").className = "pomo-display done";
      $("pomo-start").textContent = "Start";
      $("pomo-start").classList.remove("active-run");
      chrome.runtime.sendMessage({ action: "pomodoroComplete", isBreak: pomoBreak });
      pomoBreak = !pomoBreak;
      pomoSecs = pomoBreak ? 5 * 60 : pomoMins * 60;
      $("pomo-display").textContent = fmt(pomoSecs);
      $("pomo-display").className = "pomo-display";
    }
  }, 1000);
}

function pausePomo() {
  clearInterval(pomoTimer); pomoRunning = false;
  $("pomo-start").textContent = "Resume";
  $("pomo-start").classList.remove("active-run");
  $("pomo-display").className = "pomo-display";
}

function resetPomo() {
  clearInterval(pomoTimer); pomoRunning = false; pomoBreak = false;
  pomoSecs = pomoMins * 60;
  $("pomo-display").textContent = fmt(pomoSecs);
  $("pomo-display").className = "pomo-display";
  $("pomo-start").textContent = "Start";
  $("pomo-start").classList.remove("active-run");
}

// ─── GENERATE ────────────────────────────────────────────────
function setupGenerate() {
  $("btn-generate").addEventListener("click", () => {
    const btn = $("btn-generate");
    if (btn.disabled) return;
    btn.disabled = true;
    $("btn-label").textContent = "Analyzing…";
    $("status-dot").className = "header-dot loading";

    $("summary-card").innerHTML = `
      <div class="summary-card-tag">${$("summary-ai-label").textContent}</div>
      <div class="skeleton-line" style="width:90%"></div>
      <div class="skeleton-line" style="width:78%"></div>
      <div class="skeleton-line"></div>`;

    chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
      chrome.tabs.sendMessage(tabs[0].id, { action: "triggerSummary", mode: selectedMode }, res => {
        btn.disabled = false;
        if (chrome.runtime.lastError) { showErr("Cannot run on this page."); return; }
        $("status-dot").className = "header-dot active";
        $("btn-label").textContent = "Regenerate";
        $("btn-remove").classList.remove("hidden");
        $("summary-card").innerHTML = `
          <div class="summary-card-tag">${$("summary-ai-label").textContent}</div>
          <div class="summary-card-text loaded">Summary generated — see panel on page</div>`;
      });
    });
  });

  $("btn-remove").addEventListener("click", () => {
    chrome.tabs.query({ active: true, currentWindow: true }, tabs =>
      chrome.tabs.sendMessage(tabs[0].id, { action: "removeSummary" }));
    $("btn-remove").classList.add("hidden");
    $("btn-label").textContent = "Generate smart summary";
    $("status-dot").className = "header-dot";
    $("summary-card").innerHTML = `
      <div class="summary-card-tag">${$("summary-ai-label").textContent}</div>
      <div class="summary-card-text">Waiting for page content</div>`;
  });
}

function showErr(msg) {
  $("btn-generate").disabled = false;
  $("btn-label").textContent = "Generate smart summary";
  $("status-dot").className = "header-dot";
  $("summary-card").innerHTML = `
    <div class="summary-card-tag">ERROR</div>
    <div class="summary-card-text" style="color:#cf7a7a">${msg}</div>`;
}

// ─── SETTINGS ────────────────────────────────────────────────
function setupSettings() {
  $("quick-settings").addEventListener("click", () => {
    $("popup-main").classList.add("hidden");
    $("settings-page").classList.remove("hidden");
  });
  $("settings-back").addEventListener("click", () => {
    $("settings-page").classList.add("hidden");
    $("popup-main").classList.remove("hidden");
  });
  $("settings-save").addEventListener("click", async () => {
    await new Promise(r => chrome.storage.sync.set({
      apiKey:     $("input-api-key").value.trim(),
      notionKey:  $("input-notion-key").value.trim(),
      notionDbId: $("input-notion-db").value.trim()
    }, r));
    const s = $("settings-status");
    s.classList.remove("hidden");
    setTimeout(() => s.classList.add("hidden"), 2000);
    await detectAuthLabel();
  });
}

// ─── FONT QUICK BTN ──────────────────────────────────────────
function setupFontBtn() {
  $("quick-font").addEventListener("click", () => {
    chrome.tabs.query({ active: true, currentWindow: true }, tabs =>
      chrome.tabs.sendMessage(tabs[0].id, { action: "toggleFontPanel" }));
  });
}
