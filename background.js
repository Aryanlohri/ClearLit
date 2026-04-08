// background.js — CLEARLIT v2.0 (Fixed: token cache, retry, safe parsing, model fallback)

"use strict";

// ─────────────────────────────────────────────────────────────
// TOKEN CACHE
// Re-use access tokens for up to 55 minutes (they expire at 60)
// Eliminates redundant JWT signing on every click
// ─────────────────────────────────────────────────────────────
let _tokenCache = null;   // { token: string, expiresAt: number }

async function getCachedAccessToken() {
  const now = Date.now();
  if (_tokenCache && now < _tokenCache.expiresAt) {
    return _tokenCache.token;
  }
  const serviceAccount = await loadServiceAccount();
  const token = await getGoogleAccessToken(serviceAccount);
  _tokenCache = { token, expiresAt: now + 55 * 60 * 1000 };
  return token;
}

// ─────────────────────────────────────────────────────────────
// MESSAGE HANDLER
// ─────────────────────────────────────────────────────────────
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "generateSummary") {
    generateSummary(request.text, request.mode || "summary")
      .then((summary) => sendResponse({ success: true, summary }))
      .catch((err) => {
        console.error("[ClearLit] generateSummary error:", err);
        sendResponse({ success: false, error: err.message });
      });
    return true; // keep message channel open for async
  }
});

// ─────────────────────────────────────────────────────────────
// LOAD credentials.json FROM EXTENSION ROOT
// ─────────────────────────────────────────────────────────────
async function loadServiceAccount() {
  const url = chrome.runtime.getURL("credentials.json");
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(
      `Could not load credentials.json (HTTP ${res.status}). ` +
      "Make sure the file exists in your extension folder."
    );
  }
  const data = await res.json();
  // Validate required fields
  const required = ["client_email", "private_key", "project_id", "token_uri"];
  for (const field of required) {
    if (!data[field]) {
      throw new Error(
        `credentials.json is missing required field: "${field}". ` +
        "Make sure you downloaded a Service Account key (not an API key)."
      );
    }
  }
  return data;
}

// ─────────────────────────────────────────────────────────────
// IMPORT PRIVATE KEY
// ─────────────────────────────────────────────────────────────
async function importPrivateKey(pem) {
  // Strip PEM headers and newlines
  const b64 = pem
    .replace(/-----BEGIN PRIVATE KEY-----/g, "")
    .replace(/-----END PRIVATE KEY-----/g, "")
    .replace(/\r?\n/g, "")
    .trim();

  const binary = Uint8Array.from(atob(b64), c => c.charCodeAt(0));

  return crypto.subtle.importKey(
    "pkcs8",
    binary.buffer,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );
}

// ─────────────────────────────────────────────────────────────
// BASE64URL ENCODE
// ─────────────────────────────────────────────────────────────
function b64url(obj) {
  return btoa(JSON.stringify(obj))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function b64urlBytes(bytes) {
  return btoa(String.fromCharCode(...new Uint8Array(bytes)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

// ─────────────────────────────────────────────────────────────
// GET GOOGLE OAUTH ACCESS TOKEN
// ─────────────────────────────────────────────────────────────
async function getGoogleAccessToken(serviceAccount) {
  const now = Math.floor(Date.now() / 1000);

  const header = { alg: "RS256", typ: "JWT" };
  const claim = {
    iss: serviceAccount.client_email,
    scope: "https://www.googleapis.com/auth/cloud-platform",
    aud: serviceAccount.token_uri,
    exp: now + 3600,
    iat: now,
  };

  const unsignedJWT = `${b64url(header)}.${b64url(claim)}`;

  const key = await importPrivateKey(serviceAccount.private_key);
  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    new TextEncoder().encode(unsignedJWT)
  );

  const signedJWT = `${unsignedJWT}.${b64urlBytes(signature)}`;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: signedJWT,
    }),
  });

  const data = await res.json();

  if (!data.access_token) {
    throw new Error(
      `OAuth token exchange failed: ${data.error_description || data.error || JSON.stringify(data)}`
    );
  }

  return data.access_token;
}

// ─────────────────────────────────────────────────────────────
// FETCH WITH RETRY
// Retries on 429 (rate limit) and 503 (service unavailable)
// with exponential backoff up to maxRetries attempts
// ─────────────────────────────────────────────────────────────
async function fetchWithRetry(url, options, maxRetries = 3) {
  const RETRYABLE = new Set([429, 500, 502, 503, 504]);
  let lastError;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const res = await fetch(url, options);

    if (res.ok) return res;

    if (RETRYABLE.has(res.status)) {
      lastError = res;
      const delay = Math.min(1000 * 2 ** attempt, 8000); // 1s, 2s, 4s
      console.warn(`[ClearLit] HTTP ${res.status} — retrying in ${delay}ms (attempt ${attempt + 1})`);
      await new Promise(r => setTimeout(r, delay));

      // Invalidate token cache on 401/403 in case it expired early
      if (res.status === 401 || res.status === 403) {
        _tokenCache = null;
        options.headers["Authorization"] = `Bearer ${await getCachedAccessToken()}`;
      }
      continue;
    }

    // Non-retryable error — parse and throw immediately
    let errMsg = `API error (${res.status})`;
    try {
      const errBody = await res.json();
      errMsg = errBody?.error?.message || errBody?.error || errMsg;
    } catch (_) {}
    throw new Error(errMsg);
  }

  // Exhausted retries
  let errMsg = `API error (${lastError.status}) after ${maxRetries} retries`;
  try {
    const errBody = await lastError.json();
    errMsg = errBody?.error?.message || errMsg;
  } catch (_) {}
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
};

// ─────────────────────────────────────────────────────────────
// MODEL CONFIG
// Using Gemini 2.5 Pro as the sole model
// ─────────────────────────────────────────────────────────────
const MODELS = [
  "gemini-2.5-pro",
];

// ─────────────────────────────────────────────────────────────
// MAIN GENERATE FUNCTION
// ─────────────────────────────────────────────────────────────
async function generateSummary(pageText, mode = "summary") {
  const serviceAccount = await loadServiceAccount();
  const accessToken = await getCachedAccessToken();

  const projectId = serviceAccount.project_id;
  const location = "us-central1";
  const systemPrompt = PROMPTS[mode] || PROMPTS.summary;
  const userText = pageText.slice(0, 6000);

  const body = JSON.stringify({
    contents: [
      {
        role: "user",
        parts: [{ text: `${systemPrompt}\n\n${userText}` }],
      },
    ],
    generationConfig: {
      maxOutputTokens: 512,
      temperature: 0.4,
      topP: 0.9,
    },
  });

  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${accessToken}`,
  };

  // Try each model in order — fall back if the first isn't available
  let lastError;
  for (const model of MODELS) {
    const endpoint =
      `https://${location}-aiplatform.googleapis.com/v1/projects/${projectId}` +
      `/locations/${location}/publishers/google/models/${model}:generateContent`;

    try {
      const res = await fetchWithRetry(endpoint, { method: "POST", headers, body });
      const data = await res.json();

      // Safe extraction — guard every level
      const candidates = data?.candidates;
      if (!candidates || candidates.length === 0) {
        throw new Error("Gemini returned no candidates. The page content may have been filtered.");
      }

      const text = candidates[0]?.content?.parts?.[0]?.text;
      if (!text || text.trim().length === 0) {
        throw new Error("Gemini returned an empty response.");
      }

      return text.trim();

    } catch (err) {
      // 404 means model not available in this project — try next
      if (err.message.includes("404") || err.message.includes("not found")) {
        console.warn(`[ClearLit] Model ${model} not available, trying fallback…`);
        lastError = err;
        continue;
      }
      throw err; // any other error — propagate immediately
    }
  }

  throw lastError || new Error("All Gemini models failed.");
}