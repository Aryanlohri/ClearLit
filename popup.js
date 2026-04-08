// popup.js — CLEARLIT

let selectedMode = "summary";

const dot        = document.getElementById("status-dot");
const card       = document.getElementById("summary-card");
const cardText   = document.getElementById("summary-status");
const btnGen     = document.getElementById("btn-generate");
const btnLabel   = document.getElementById("btn-label");
const btnIcon    = document.getElementById("btn-icon");
const btnRemove  = document.getElementById("btn-remove");

// ── MODE PILLS ────────────────────────────────────────────────────────────
document.querySelectorAll(".pill").forEach((pill) => {
  pill.addEventListener("click", () => {
    document.querySelectorAll(".pill").forEach((p) => p.classList.remove("active"));
    pill.classList.add("active");
    selectedMode = pill.dataset.mode;
  });
});

// ── TOGGLE PERSISTENCE ───────────────────────────────────────────────────
const toggleIds = ["toggle-cinematic", "toggle-bionic", "toggle-tts"];

// Load saved toggle states
chrome.storage.sync.get(toggleIds, (vals) => {
  toggleIds.forEach((id) => {
    if (vals[id]) document.getElementById(id).checked = true;
  });
});

toggleIds.forEach((id) => {
  document.getElementById(id).addEventListener("change", (e) => {
    chrome.storage.sync.set({ [id]: e.target.checked });

    // Send toggle state to content script
    sendToActiveTab({ action: "toggleFeature", feature: id, enabled: e.target.checked });
  });
});

// ── GENERATE BUTTON ───────────────────────────────────────────────────────
btnGen.addEventListener("click", async () => {
  setLoading(true);
  dot.className = "header-dot loading";
  showSkeleton();

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  // Inject content script fresh each time
  try {
    await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ["content.js"] });
  } catch (_) {}

  chrome.tabs.sendMessage(
    tab.id,
    { action: "triggerSummary", mode: selectedMode },
    (response) => {
      if (chrome.runtime.lastError || !response) {
        showError("Could not connect to page. Try refreshing.");
        return;
      }
      // Wait for the background to finish — listen for completion
    }
  );

  // Listen for result from background (relayed via content)
  chrome.runtime.onMessage.addListener(function handler(msg) {
    if (msg.action === "summaryDone") {
      chrome.runtime.onMessage.removeListener(handler);
      setLoading(false);
      dot.className = "header-dot active";
      showSuccess(msg.mode);
      btnRemove.classList.remove("hidden");
      setTimeout(() => window.close(), 1400);
    }
    if (msg.action === "summaryError") {
      chrome.runtime.onMessage.removeListener(handler);
      showError(msg.error || "Unknown error");
    }
  });
});

// ── REMOVE BUTTON ─────────────────────────────────────────────────────────
btnRemove.addEventListener("click", async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  chrome.tabs.sendMessage(tab.id, { action: "removeSummary" });
  btnRemove.classList.add("hidden");
  dot.className = "header-dot";
  cardText.textContent = "Waiting for page content";
  cardText.classList.remove("loaded");
  card.querySelector(".summary-card-tag").textContent = "CLAUDE · ANTHROPIC";
});

// ── QUICK BUTTONS ─────────────────────────────────────────────────────────
document.getElementById("quick-focus").addEventListener("click", () => {
  sendToActiveTab({ action: "toggleFeature", feature: "focus-tunnel", enabled: true });
});

document.getElementById("quick-font").addEventListener("click", () => {
  sendToActiveTab({ action: "toggleFeature", feature: "font-size", enabled: true });
});

document.getElementById("quick-settings").addEventListener("click", () => {
  chrome.runtime.openOptionsPage();
});

// ── HELPERS ───────────────────────────────────────────────────────────────
async function sendToActiveTab(msg) {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  try {
    await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ["content.js"] });
  } catch (_) {}
  chrome.tabs.sendMessage(tab.id, msg);
}

function setLoading(on) {
  btnGen.disabled = on;
  btnLabel.textContent = on ? "Generating…" : "Generate smart summary";
  btnIcon.style.opacity = on ? "0" : "1";
}

function showSkeleton() {
  card.innerHTML = `
    <div class="summary-card-tag">CLAUDE · ANTHROPIC</div>
    <div class="skeleton-line"></div>
    <div class="skeleton-line"></div>
    <div class="skeleton-line"></div>
  `;
}

function showSuccess(mode) {
  const labels = { summary: "Summary injected", keypoints: "Key points injected", simplify: "Simplified text injected" };
  card.innerHTML = `
    <div class="summary-card-tag">CLAUDE · ANTHROPIC</div>
    <div class="summary-card-text loaded">✓ ${labels[mode] || "Summary injected"} at the top of the article.</div>
  `;
}

function showError(msg) {
  setLoading(false);
  dot.className = "header-dot";
  card.innerHTML = `
    <div class="summary-card-tag" style="color:#ef4444">ERROR</div>
    <div class="summary-card-text" style="color:#7f1d1d">${msg}</div>
  `;
}
