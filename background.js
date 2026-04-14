// background.js — CLEARLIT v2.1 (Medium features: tone/bias, credibility, shortcuts, export)

"use strict";

// ─────────────────────────────────────────────────────────────
// AUTH MODE DETECTION
// LOCAL (dev): uses credentials.json + Google OAuth (Vertex AI)
// PUBLISHED: uses ANTHROPIC_API_KEY stored in chrome.storage
// ─────────────────────────────────────────────────────────────
let _tokenCache = null;
let _authMode = null; // "local" | "published"

async function detectAuthMode() {
  if (_authMode) return _authMode;
  try {
    const url = chrome.runtime.getURL("credentials.json");
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      if (data.client_email && data.private_key) {
        _authMode = "local";
        return "local";
      }
    }
  } catch (_) {}
  _authMode = "published";
  return "published";
}

// ─────────────────────────────────────────────────────────────
// MESSAGE HANDLER
// ─────────────────────────────────────────────────────────────
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {

  if (request.action === "generateSummary") {
    generateSummary(request.text, request.mode || "summary")
      .then(summary => sendResponse({ success: true, summary }))
      .catch(err => {
        console.error("[ClearLit]", err);
        sendResponse({ success: false, error: err.message });
      });
    return true;
  }

  if (request.action === "getCredibilityScore") {
    getCredibilityScore(request.domain)
      .then(score => sendResponse({ success: true, score }))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true;
  }

  if (request.action === "exportToNotion") {
    exportToNotion(request.title, request.summary, request.url)
      .then(result => sendResponse({ success: true, result }))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true;
  }

  if (request.action === "saveSettings") {
    chrome.storage.sync.set(request.settings, () => sendResponse({ success: true }));
    return true;
  }

  if (request.action === "getSettings") {
    chrome.storage.sync.get(null, (settings) => sendResponse({ success: true, settings }));
    return true;
  }

  if (request.action === "pomodoroComplete") {
    chrome.notifications.create({
      type: "basic",
      iconUrl: "icons/icon48.png",
      title: "ClearLit · Pomodoro",
      message: request.isBreak ? "Break's over! Time to focus." : "Focus session complete! Take a break.",
      priority: 2
    });
    sendResponse({ success: true });
    return true;
  }

});

// ─────────────────────────────────────────────────────────────
// LOAD SERVICE ACCOUNT (local dev mode)
// ─────────────────────────────────────────────────────────────
async function loadServiceAccount() {
  const url = chrome.runtime.getURL("credentials.json");
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Could not load credentials.json (HTTP ${res.status}).`);
  const data = await res.json();
  const required = ["client_email", "private_key", "project_id", "token_uri"];
  for (const field of required) {
    if (!data[field]) throw new Error(`credentials.json missing field: "${field}"`);
  }
  return data;
}

// ─────────────────────────────────────────────────────────────
// GOOGLE OAUTH (local dev mode)
// ─────────────────────────────────────────────────────────────
async function importPrivateKey(pem) {
  const b64 = pem
    .replace(/-----BEGIN PRIVATE KEY-----/g, "")
    .replace(/-----END PRIVATE KEY-----/g, "")
    .replace(/\r?\n/g, "").trim();
  const binary = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
  return crypto.subtle.importKey(
    "pkcs8", binary.buffer,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false, ["sign"]
  );
}

function b64url(obj) {
  return btoa(JSON.stringify(obj)).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");
}
function b64urlBytes(bytes) {
  return btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");
}

async function getGoogleAccessToken(serviceAccount) {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const claim = {
    iss: serviceAccount.client_email,
    scope: "https://www.googleapis.com/auth/cloud-platform",
    aud: serviceAccount.token_uri,
    exp: now + 3600, iat: now
  };
  const unsignedJWT = `${b64url(header)}.${b64url(claim)}`;
  const key = await importPrivateKey(serviceAccount.private_key);
  const signature = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(unsignedJWT));
  const signedJWT = `${unsignedJWT}.${b64urlBytes(signature)}`;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: signedJWT })
  });
  const data = await res.json();
  if (!data.access_token) throw new Error(`OAuth failed: ${data.error_description || data.error}`);
  return data.access_token;
}

async function getCachedAccessToken() {
  const now = Date.now();
  if (_tokenCache && now < _tokenCache.expiresAt) return _tokenCache.token;
  const serviceAccount = await loadServiceAccount();
  const token = await getGoogleAccessToken(serviceAccount);
  _tokenCache = { token, expiresAt: now + 55 * 60 * 1000 };
  return token;
}

// ─────────────────────────────────────────────────────────────
// FETCH WITH RETRY
// ─────────────────────────────────────────────────────────────
async function fetchWithRetry(url, options, maxRetries = 3) {
  const RETRYABLE = new Set([429, 500, 502, 503, 504]);
  let lastError;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const res = await fetch(url, options);
    if (res.ok) return res;
    if (RETRYABLE.has(res.status)) {
      lastError = res;
      const delay = Math.min(1000 * 2 ** attempt, 8000);
      await new Promise(r => setTimeout(r, delay));
      if ((res.status === 401 || res.status === 403) && options.headers?.Authorization) {
        _tokenCache = null;
        options.headers["Authorization"] = `Bearer ${await getCachedAccessToken()}`;
      }
      continue;
    }
    let errMsg = `API error (${res.status})`;
    try { const b = await res.json(); errMsg = b?.error?.message || b?.error || errMsg; } catch (_) {}
    throw new Error(errMsg);
  }
  let errMsg = `API error after ${maxRetries} retries`;
  try { const b = await lastError.json(); errMsg = b?.error?.message || errMsg; } catch (_) {}
  throw new Error(errMsg);
}

// ─────────────────────────────────────────────────────────────
// PROMPTS
// ─────────────────────────────────────────────────────────────
const PROMPTS = {
  summary:
    "You are a concise summarizer. Summarize the webpage content into exactly 4 bullet points. " +
    "Each bullet is one complete, clear sentence. Start each with '•'. Return plain text only, no markdown.",

  keypoints:
    "Extract the 5 most important facts from this webpage. " +
    "Return a plain numbered list (1. 2. 3. ...). No markdown. One sentence per point.",

  simplify:
    "Rewrite the main content of this webpage in simple language a 12-year-old would understand. " +
    "Use short sentences. Return plain text only, no headers.",

  tone:
    "Analyze the tone and bias of this webpage content. Return a JSON object with these exact fields: " +
    '{"tone": "neutral|persuasive|emotional|alarming|promotional", ' +
    '"bias": "left|center-left|center|center-right|right|unknown", ' +
    '"confidence": 0-100, ' +
    '"signals": ["short phrase 1", "short phrase 2", "short phrase 3"]} ' +
    "Return ONLY the JSON object, no markdown, no explanation."
};

// ─────────────────────────────────────────────────────────────
// CALL AI — routes to local (Gemini/Vertex) or published (Anthropic)
// ─────────────────────────────────────────────────────────────
async function callAI(systemPrompt, userText) {
  const mode = await detectAuthMode();

  if (mode === "local") {
    return callGemini(systemPrompt, userText);
  } else {
    return callAnthropic(systemPrompt, userText);
  }
}

async function callGemini(systemPrompt, userText) {
  const serviceAccount = await loadServiceAccount();
  const accessToken = await getCachedAccessToken();
  const projectId = serviceAccount.project_id;
  const location = "us-central1";
  const model = "gemini-2.5-pro";

  const body = JSON.stringify({
    contents: [{ role: "user", parts: [{ text: `${systemPrompt}\n\n${userText}` }] }],
    generationConfig: { maxOutputTokens: 512, temperature: 0.4, topP: 0.9 }
  });

  const endpoint = `https://${location}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${location}/publishers/google/models/${model}:generateContent`;
  const res = await fetchWithRetry(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
    body
  });
  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Gemini returned an empty response.");
  return text.trim();
}

async function callAnthropic(systemPrompt, userText) {
  const { apiKey } = await chrome.storage.sync.get("apiKey");
  if (!apiKey) throw new Error("No API key set. Please add your Anthropic API key in Settings.");

  const res = await fetchWithRetry("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01"
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 512,
      system: systemPrompt,
      messages: [{ role: "user", content: userText }]
    })
  });
  const data = await res.json();
  const text = data?.content?.[0]?.text;
  if (!text) throw new Error("Anthropic returned an empty response.");
  return text.trim();
}

// ─────────────────────────────────────────────────────────────
// MAIN GENERATE FUNCTION
// ─────────────────────────────────────────────────────────────
async function generateSummary(pageText, mode = "summary") {
  const systemPrompt = PROMPTS[mode] || PROMPTS.summary;
  const userText = pageText.slice(0, 6000);
  return callAI(systemPrompt, userText);
}

// ─────────────────────────────────────────────────────────────
// TONE & BIAS ANALYSIS
// ─────────────────────────────────────────────────────────────
async function analyzeTone(pageText) {
  const result = await callAI(PROMPTS.tone, pageText.slice(0, 4000));
  try {
    const clean = result.replace(/```json|```/g, "").trim();
    return JSON.parse(clean);
  } catch (_) {
    return { tone: "unknown", bias: "unknown", confidence: 0, signals: [] };
  }
}

// ─────────────────────────────────────────────────────────────
// SOURCE CREDIBILITY SCORE
// Uses a built-in heuristic database + domain age signals
// ─────────────────────────────────────────────────────────────
const CREDIBILITY_DB = {
  // Tier 1 — high credibility
  "reuters.com": 95, "apnews.com": 95, "bbc.com": 93, "bbc.co.uk": 93,
  "theguardian.com": 88, "nytimes.com": 87, "washingtonpost.com": 86,
  "economist.com": 90, "ft.com": 90, "nature.com": 96, "science.org": 96,
  "who.int": 95, "cdc.gov": 94, "nih.gov": 95, "gov.uk": 90,
  "wikipedia.org": 75, "britannica.com": 88,
  // Tier 2 — moderate
  "cnn.com": 72, "nbcnews.com": 74, "cbsnews.com": 76, "abcnews.go.com": 75,
  "politico.com": 78, "theatlantic.com": 80, "vox.com": 72, "axios.com": 80,
  "bloomberg.com": 85, "wsj.com": 85, "forbes.com": 70, "businessinsider.com": 65,
  // Tier 3 — lower trust
  "buzzfeed.com": 52, "dailymail.co.uk": 45, "nypost.com": 50,
  "breitbart.com": 30, "infowars.com": 10, "theonion.com": 5,
};

async function getCredibilityScore(domain) {
  const clean = domain.replace(/^www\./, "").toLowerCase();

  if (CREDIBILITY_DB[clean] !== undefined) {
    return {
      score: CREDIBILITY_DB[clean],
      domain: clean,
      tier: scoreToTier(CREDIBILITY_DB[clean]),
      source: "database"
    };
  }

  // Unknown domain — return neutral with note
  return {
    score: 50,
    domain: clean,
    tier: "unknown",
    source: "estimated"
  };
}

function scoreToTier(score) {
  if (score >= 85) return "high";
  if (score >= 65) return "moderate";
  if (score >= 40) return "low";
  return "very-low";
}

// ─────────────────────────────────────────────────────────────
// EXPORT TO NOTION
// ─────────────────────────────────────────────────────────────
async function exportToNotion(title, summary, pageUrl) {
  const { notionKey, notionDbId } = await chrome.storage.sync.get(["notionKey", "notionDbId"]);
  if (!notionKey) throw new Error("No Notion API key configured in Settings.");
  if (!notionDbId) throw new Error("No Notion database ID configured in Settings.");

  const body = {
    parent: { database_id: notionDbId },
    properties: {
      Name: { title: [{ text: { content: title || "ClearLit Summary" } }] },
      URL: { url: pageUrl },
      Date: { date: { start: new Date().toISOString().split("T")[0] } }
    },
    children: [
      {
        object: "block",
        type: "paragraph",
        paragraph: {
          rich_text: [{ type: "text", text: { content: summary } }]
        }
      }
    ]
  };

  const res = await fetch("https://api.notion.com/v1/pages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${notionKey}`,
      "Notion-Version": "2022-06-28"
    },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.message || `Notion API error (${res.status})`);
  }

  return await res.json();
}
