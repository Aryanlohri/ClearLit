# ClearLit v2.1 — Chrome Extension

AI-powered reading assistant with smart summaries, tone analysis, focus tools, and more.

---

## NEW IN v2.1 (Medium Features)

| Feature | What it does |
|---|---|
| **Bias & Tone Detector** | Analyzes political lean + emotional tone after every summary |
| **Source Credibility Score** | Shows domain trust score (0–100) badge on every page |
| **Font & Spacing Controls** | Adjust font family, size, line-height, column width live on page |
| **Focus Highlight** | Dims text above/below your cursor to reduce reading drift |
| **Pomodoro Timer** | Built-in 25/5/15 min focus timer with system notifications |
| **Keyboard Shortcuts** | Alt+S summarize, Alt+F focus, Alt+R read, Alt+X close |
| **Export: Notion** | Push summaries to your Notion database via API |
| **Export: Obsidian** | Open summary directly in Obsidian via deep link |
| **Export: Copy** | Copy formatted summary + URL to clipboard |
| **Settings Page** | Store API keys, Notion config — persisted via chrome.storage |
| **Dyslexia Font** | Toggle Lexend (dyslexia-friendly) font across the page |

---

## SETUP — TWO MODES

### MODE 1: LOCAL / DEVELOPMENT (uses Google Vertex AI + Gemini)

Uses `credentials.json` with a Google Cloud service account.

**Steps:**

1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Enable the **Vertex AI API** for your project
3. Go to **IAM & Admin → Service Accounts → Create Service Account**
4. Assign the role: **Vertex AI User**
5. Under **Keys**, click **Add Key → Create new key → JSON**
6. Download the JSON file
7. **Replace** `credentials.json` in this folder with the downloaded file
8. Open Chrome → `chrome://extensions/` → Enable **Developer mode**
9. Click **Load unpacked** → select this folder

The extension will auto-detect `credentials.json` and use Gemini 2.5 Pro.

---

### MODE 2: PUBLISHED (uses Anthropic Claude API)

For when you publish the extension to the Chrome Web Store (no bundled credentials).

1. Get an **Anthropic API key** from [console.anthropic.com](https://console.anthropic.com)
2. Load the extension (same steps as above, but **without** filling in `credentials.json`)
3. Click the extension icon → bottom-right **Settings** gear
4. Paste your **Anthropic API key** (`sk-ant-...`)
5. Click **Save settings**

The extension auto-detects which mode to use — if `credentials.json` is valid, it uses Gemini. Otherwise it uses the stored Anthropic key.

---

## EXPORT TO NOTION (optional)

1. Go to [notion.so/my-integrations](https://www.notion.so/my-integrations) → Create integration
2. Copy the **Internal Integration Token** (`secret_...`)
3. Create a Notion database with these properties:
   - `Name` (Title)
   - `URL` (URL)
   - `Date` (Date)
4. Share the database with your integration
5. Copy the database ID from the URL: `notion.so/workspace/`**`DATABASE_ID`**`?v=...`
6. In ClearLit Settings → paste the token and database ID

---

## KEYBOARD SHORTCUTS

| Shortcut | Action |
|---|---|
| `Alt + S` | Generate summary |
| `Alt + K` | Generate key points |
| `Alt + F` | Toggle focus highlight |
| `Alt + R` | Toggle read aloud |
| `Alt + X` | Close panel |

---

## FILE STRUCTURE

```
clearlit/
├── manifest.json       — Extension config
├── background.js       — AI calls, Notion export, credibility DB
├── content.js          — Page injection: panel, focus, font controls, badges
├── popup.html          — Extension popup UI
├── popup.css           — Popup styles
├── popup.js            — Popup logic: pomodoro, settings, toggles
├── credentials.json    — REPLACE with your Google SA key (local mode)
└── README.md           — This file
```

---

## ICONS

Create an `icons/` folder and add:
- `icon16.png` — 16×16
- `icon48.png` — 48×48  
- `icon128.png` — 128×128

You can use any PNG. For testing, a solid dark square works fine.
