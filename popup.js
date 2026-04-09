// popup.js — CLEARLIT v2.1 · TURA THEME

"use strict";

const $ = id => document.getElementById(id);

// ─── INIT ────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", async () => {
  await detectAuthLabel();
  await loadSettings();
  setupNav();
  setupModePills();
  setupToggles();
  setupPomodoro();
  setupGenerate();
  setupSettings();
});

// ─── AUTH LABEL ──────────────────────────────────────────────
async function detectAuthLabel() {
  const label = $("ai-label");
  try {
    const res = await fetch(chrome.runtime.getURL("credentials.json"));
    if (res.ok) {
      const d = await res.json();
      if (d.client_email && d.private_key) {
        label.textContent = "GEMINI · GOOGLE VERTEX AI";
        return;
      }
    }
  } catch (_) {}
  const { apiKey } = await chrome.storage.sync.get("apiKey");
  label.textContent = apiKey ? "CLAUDE · ANTHROPIC" : "NO KEY — ADD IN SETTINGS";
}

// ─── LOAD SAVED SETTINGS ─────────────────────────────────────
async function loadSettings() {
  const s = await new Promise(r => chrome.storage.sync.get(null, r));
  if (s.apiKey)        $("input-api-key").value    = s.apiKey;
  if (s.notionKey)     $("input-notion-key").value  = s.notionKey;
  if (s.notionDbId)    $("input-notion-db").value   = s.notionDbId;
  if (s.focusHighlight) $("toggle-focus").checked   = true;
  if (s.bionic)         $("toggle-bionic").checked  = true;
  if (s.cinematic)      $("toggle-cinematic").checked = true;
}

// ─── NAV TABS ────────────────────────────────────────────────
function setupNav() {
  $("nav-settings-btn").addEventListener("click", () => {
    $("popup-main").classList.add("hidden");
    $("settings-page").classList.remove("hidden");
  });
  $("settings-back").addEventListener("click", () => {
    $("settings-page").classList.add("hidden");
    $("popup-main").classList.remove("hidden");
  });
}

// ─── MODE PILLS ──────────────────────────────────────────────
let selectedMode = "summary";
function setupModePills() {
  document.querySelectorAll(".mode-pill").forEach(p => {
    p.addEventListener("click", () => {
      document.querySelectorAll(".mode-pill").forEach(x => x.classList.remove("active"));
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
  return `${String(Math.floor(s/60)).padStart(2,"0")}:${String(s%60).padStart(2,"0")}`;
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
  $("pomo-start").textContent = "PAUSE";
  $("pomo-display").className = "clock running";
  pomoTimer = setInterval(() => {
    pomoSecs--;
    $("pomo-display").textContent = fmt(pomoSecs);
    if (pomoSecs <= 0) {
      clearInterval(pomoTimer); pomoRunning = false;
      $("pomo-display").className = "clock done";
      $("pomo-start").textContent = "START SESSION";
      chrome.runtime.sendMessage({ action: "pomodoroComplete", isBreak: pomoBreak });
      pomoBreak = !pomoBreak;
      pomoSecs = pomoBreak ? 5 * 60 : pomoMins * 60;
      $("pomo-display").textContent = fmt(pomoSecs);
      $("pomo-display").className = "clock";
    }
  }, 1000);
}

function pausePomo() {
  clearInterval(pomoTimer); pomoRunning = false;
  $("pomo-start").textContent = "RESUME";
  $("pomo-display").className = "clock";
}

function resetPomo() {
  clearInterval(pomoTimer); pomoRunning = false; pomoBreak = false;
  pomoSecs = pomoMins * 60;
  $("pomo-display").textContent = fmt(pomoSecs);
  $("pomo-display").className = "clock";
  $("pomo-start").textContent = "START SESSION";
}

// ─── GENERATE ────────────────────────────────────────────────
function setupGenerate() {
  $("btn-generate").addEventListener("click", () => {
    const btn = $("btn-generate");
    if (btn.disabled) return;
    btn.disabled = true;
    $("btn-label").textContent = "ANALYZING…";

    // Show skeleton
    $("status-card").innerHTML =
      `<div class="skel" style="width:90%"></div>
       <div class="skel" style="width:75%"></div>
       <div class="skel"></div>`;

    chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
      chrome.tabs.sendMessage(
        tabs[0].id,
        { action: "triggerSummary", mode: selectedMode },
        res => {
          btn.disabled = false;
          if (chrome.runtime.lastError) {
            showErr("Cannot run on this page.");
            return;
          }
          $("btn-label").textContent = "REGENERATE";
          $("btn-remove").classList.remove("hidden");
          $("btn-remove").classList.remove("tura-btn");
          $("btn-remove").className = "tura-btn full";
          $("status-card").innerHTML =
            `<p class="loaded">Summary generated — see panel on page ↓</p>`;
        }
      );
    });
  });

  $("btn-remove").addEventListener("click", () => {
    chrome.tabs.query({ active: true, currentWindow: true }, tabs =>
      chrome.tabs.sendMessage(tabs[0].id, { action: "removeSummary" }));
    $("btn-remove").classList.add("hidden");
    $("btn-label").textContent = "GENERATE SUMMARY";
    $("status-card").innerHTML = `<p>Waiting for page content</p>`;
  });
}

function showErr(msg) {
  $("btn-generate").disabled = false;
  $("btn-label").textContent = "GENERATE SUMMARY";
  $("status-card").innerHTML = `<p style="color:#f0b8b8">${msg}</p>`;
}

// ─── SETTINGS ────────────────────────────────────────────────
function setupSettings() {
  $("settings-save").addEventListener("click", async () => {
    await new Promise(r => chrome.storage.sync.set({
      apiKey:     $("input-api-key").value.trim(),
      notionKey:  $("input-notion-key").value.trim(),
      notionDbId: $("input-notion-db").value.trim()
    }, r));
    const conf = $("save-confirm");
    conf.classList.remove("hidden");
    setTimeout(() => conf.classList.add("hidden"), 2000);
    await detectAuthLabel();
  });
}
