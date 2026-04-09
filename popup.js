// popup.js — CLEARLIT v2.1

"use strict";

// ─── ELEMENTS ────────────────────────────────────────────────
const $ = id => document.getElementById(id);
const statusDot    = $("status-dot");
const btnGenerate  = $("btn-generate");
const btnRemove    = $("btn-remove");
const btnLabel     = $("btn-label");
const summaryCard  = $("summary-card");
const summaryStatus = $("summary-status");
const summaryAiLabel = $("summary-ai-label");

// Pomodoro
const pomoDisplay  = $("pomo-display");
const pomoStart    = $("pomo-start");
const pomoReset    = $("pomo-reset");

// Settings
const quickSettings = $("quick-settings");
const settingsPage  = $("settings-page");
const settingsBack  = $("settings-back");
const settingsSave  = $("settings-save");
const settingsStatus = $("settings-status");
const popupMain     = document.querySelector(".popup");

// ─── STATE ───────────────────────────────────────────────────
let selectedMode = "summary";
let summaryVisible = false;

// Pomodoro state
let pomoTimer = null;
let pomoSecondsLeft = 25 * 60;
let pomoRunning = false;
let pomoBreak = false;
let pomoDefaultMins = 25;

// ─── INIT ────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", async () => {
  await detectAndSetAuthLabel();
  await loadSettings();
  setupModePills();
  setupToggles();
  setupPomodoro();
  setupSettingsPage();
  setupGenerateButton();
  setupFontQuickBtn();
});

// ─── AUTH MODE LABEL ─────────────────────────────────────────
async function detectAndSetAuthLabel() {
  try {
    const url = chrome.runtime.getURL("credentials.json");
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      if (data.client_email && data.private_key) {
        summaryAiLabel.textContent = "GEMINI · GOOGLE VERTEX AI";
        return;
      }
    }
  } catch (_) {}

  // Check for stored Anthropic key
  const { apiKey } = await chrome.storage.sync.get("apiKey");
  if (apiKey) {
    summaryAiLabel.textContent = "CLAUDE · ANTHROPIC";
  } else {
    summaryAiLabel.textContent = "NO KEY CONFIGURED";
    summaryStatus.textContent = "Add an API key in Settings →";
  }
}

// ─── LOAD SETTINGS ───────────────────────────────────────────
async function loadSettings() {
  const settings = await new Promise(res => chrome.storage.sync.get(null, res));

  if (settings.apiKey)     $("input-api-key").value   = settings.apiKey;
  if (settings.notionKey)  $("input-notion-key").value = settings.notionKey;
  if (settings.notionDbId) $("input-notion-db").value  = settings.notionDbId;

  // Restore toggle states
  if (settings.focusHighlight) $("toggle-focus").checked = true;
  if (settings.bionic)         $("toggle-bionic").checked = true;
  if (settings.cinematic)      $("toggle-cinematic").checked = true;
}

// ─── MODE PILLS ──────────────────────────────────────────────
function setupModePills() {
  document.querySelectorAll(".pill[data-mode]").forEach(pill => {
    pill.addEventListener("click", () => {
      document.querySelectorAll(".pill[data-mode]").forEach(p => p.classList.remove("active"));
      pill.classList.add("active");
      selectedMode = pill.dataset.mode;
    });
  });
}

// ─── TOGGLES ─────────────────────────────────────────────────
function setupToggles() {
  // Focus highlight
  $("toggle-focus").addEventListener("change", (e) => {
    chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
      chrome.tabs.sendMessage(tabs[0].id, { action: "toggleFocusHighlight" });
    });
    chrome.storage.sync.set({ focusHighlight: e.target.checked });
  });

  // TTS (handled in content script via generate button flow)
  $("toggle-tts").addEventListener("change", (e) => {
    if (e.target.checked) {
      chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
        chrome.tabs.sendMessage(tabs[0].id, { action: "toggleTTS" });
      });
    }
  });

  // Cinematic / Bionic — save state
  $("toggle-cinematic").addEventListener("change", (e) => {
    chrome.storage.sync.set({ cinematic: e.target.checked });
    chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
      chrome.tabs.sendMessage(tabs[0].id, { action: "toggleCinematic", enabled: e.target.checked });
    });
  });

  $("toggle-bionic").addEventListener("change", (e) => {
    chrome.storage.sync.set({ bionic: e.target.checked });
    chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
      chrome.tabs.sendMessage(tabs[0].id, { action: "toggleBionic", enabled: e.target.checked });
    });
  });
}

// ─── POMODORO TIMER ──────────────────────────────────────────
function setupPomodoro() {
  // Mode pills
  document.querySelectorAll(".pomo-pill").forEach(pill => {
    pill.addEventListener("click", () => {
      document.querySelectorAll(".pomo-pill").forEach(p => p.classList.remove("active"));
      pill.classList.add("active");
      pomoDefaultMins = parseInt(pill.dataset.mins);
      resetPomodoro();
    });
  });

  pomoStart.addEventListener("click", () => {
    if (pomoRunning) {
      pausePomodoro();
    } else {
      startPomodoro();
    }
  });

  pomoReset.addEventListener("click", resetPomodoro);
}

function formatTime(secs) {
  const m = Math.floor(secs / 60).toString().padStart(2, "0");
  const s = (secs % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

function startPomodoro() {
  pomoRunning = true;
  pomoStart.textContent = "Pause";
  pomoStart.classList.add("active-run");
  pomoDisplay.className = pomoBreak ? "pomo-display break" : "pomo-display running";

  pomoTimer = setInterval(() => {
    pomoSecondsLeft--;
    pomoDisplay.textContent = formatTime(pomoSecondsLeft);

    if (pomoSecondsLeft <= 0) {
      clearInterval(pomoTimer);
      pomoRunning = false;
      pomoDisplay.className = "pomo-display done";
      pomoStart.textContent = "Start";
      pomoStart.classList.remove("active-run");

      // Notify background to fire system notification
      chrome.runtime.sendMessage({
        action: "pomodoroComplete",
        isBreak: pomoBreak
      });

      // Switch mode
      pomoBreak = !pomoBreak;
      pomoSecondsLeft = pomoBreak ? 5 * 60 : pomoDefaultMins * 60;
      pomoDisplay.textContent = formatTime(pomoSecondsLeft);
    }
  }, 1000);
}

function pausePomodoro() {
  clearInterval(pomoTimer);
  pomoRunning = false;
  pomoStart.textContent = "Resume";
  pomoStart.classList.remove("active-run");
  pomoDisplay.className = "pomo-display";
}

function resetPomodoro() {
  clearInterval(pomoTimer);
  pomoRunning = false;
  pomoBreak = false;
  pomoSecondsLeft = pomoDefaultMins * 60;
  pomoDisplay.textContent = formatTime(pomoSecondsLeft);
  pomoDisplay.className = "pomo-display";
  pomoStart.textContent = "Start";
  pomoStart.classList.remove("active-run");
}

// ─── SETTINGS PAGE ───────────────────────────────────────────
function setupSettingsPage() {
  quickSettings.addEventListener("click", () => {
    popupMain.classList.add("hidden");
    settingsPage.classList.remove("hidden");
  });

  settingsBack.addEventListener("click", () => {
    settingsPage.classList.add("hidden");
    popupMain.classList.remove("hidden");
  });

  settingsSave.addEventListener("click", async () => {
    const settings = {
      apiKey:     $("input-api-key").value.trim(),
      notionKey:  $("input-notion-key").value.trim(),
      notionDbId: $("input-notion-db").value.trim()
    };

    await new Promise(res => chrome.storage.sync.set(settings, res));

    settingsStatus.classList.remove("hidden");
    settingsStatus.textContent = "Saved!";
    setTimeout(() => settingsStatus.classList.add("hidden"), 2000);

    // Re-detect auth mode label
    await detectAndSetAuthLabel();
  });
}

// ─── GENERATE BUTTON ─────────────────────────────────────────
function setupGenerateButton() {
  btnGenerate.addEventListener("click", async () => {
    if (btnGenerate.disabled) return;

    btnGenerate.disabled = true;
    btnLabel.textContent = "Analyzing…";
    statusDot.className = "header-dot loading";

    // Show skeleton
    summaryCard.innerHTML = `
      <div class="summary-card-tag" id="summary-ai-label">${summaryAiLabel.textContent}</div>
      <div class="skeleton-line" style="width:90%"></div>
      <div class="skeleton-line" style="width:80%"></div>
      <div class="skeleton-line" style="width:55%"></div>`;

    chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
      chrome.tabs.sendMessage(
        tabs[0].id,
        { action: "triggerSummary", mode: selectedMode },
        (res) => {
          if (chrome.runtime.lastError) {
            showError("Cannot run on this page.");
            return;
          }

          // The content script handles the heavy lifting;
          // we just need to update popup state
          statusDot.className = "header-dot active";
          btnGenerate.disabled = false;
          btnLabel.textContent = "Regenerate";
          summaryVisible = true;
          btnRemove.classList.remove("hidden");

          summaryCard.innerHTML = `
            <div class="summary-card-tag">${summaryAiLabel.textContent}</div>
            <div class="summary-card-text loaded">Summary generated — see panel on page</div>`;
        }
      );
    });
  });

  btnRemove.addEventListener("click", () => {
    chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
      chrome.tabs.sendMessage(tabs[0].id, { action: "removeSummary" });
    });
    btnRemove.classList.add("hidden");
    summaryVisible = false;
    btnLabel.textContent = "Generate smart summary";
    statusDot.className = "header-dot";
    summaryCard.innerHTML = `
      <div class="summary-card-tag">${summaryAiLabel.textContent}</div>
      <div class="summary-card-text">Waiting for page content</div>`;
  });
}

function showError(msg) {
  btnGenerate.disabled = false;
  btnLabel.textContent = "Generate smart summary";
  statusDot.className = "header-dot";
  summaryCard.innerHTML = `
    <div class="summary-card-tag">ERROR</div>
    <div class="summary-card-text" style="color:#c0392b">${msg}</div>`;
}

// ─── FONT QUICK BTN ──────────────────────────────────────────
function setupFontQuickBtn() {
  $("quick-font").addEventListener("click", () => {
    // Triggers the font panel in the content script panel
    chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
      chrome.tabs.sendMessage(tabs[0].id, { action: "toggleFontPanel" });
    });
  });
}
