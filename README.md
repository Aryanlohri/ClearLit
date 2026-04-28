<div align="center">

<br/>

```
 ██████╗██╗     ███████╗ █████╗ ██████╗ ██╗     ██╗████████╗
██╔════╝██║     ██╔════╝██╔══██╗██╔══██╗██║     ██║╚══██╔══╝
██║     ██║     █████╗  ███████║██████╔╝██║     ██║   ██║   
██║     ██║     ██╔══╝  ██╔══██║██╔══██╗██║     ██║   ██║   
╚██████╗███████╗███████╗██║  ██║██║  ██║███████╗██║   ██║   
 ╚═════╝╚══════╝╚══════╝╚═╝  ╚═╝╚═╝  ╚═╝╚══════╝╚═╝   ╚═╝  
```

### **AI-Powered Reading Assistant for the Modern Web**
*Smarter reading. Deeper focus. Zero noise.*

<br/>

[![Edge Add-on](https://img.shields.io/badge/Microsoft%20Edge-Get%20Extension-0078D7?style=for-the-badge&logo=microsoftedge&logoColor=white)](https://microsoftedge.microsoft.com/addons/detail/clearlit/kfpoielincngdkeiedepofpnpnglgcco)
[![Chrome Extension](https://img.shields.io/badge/Chrome-Coming%20Soon-4285F4?style=for-the-badge&logo=googlechrome&logoColor=white)](#)
[![Version](https://img.shields.io/badge/version-2.1.0-22c55e?style=for-the-badge)](#)
[![License](https://img.shields.io/badge/license-MIT-f59e0b?style=for-the-badge)](#)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-a855f7?style=for-the-badge)](#contributing)

<br/>

<img src="https://raw.githubusercontent.com/your-username/clearlit/main/assets/hero-preview.png" alt="ClearLit in action" width="780" style="border-radius:12px"/>

<br/><br/>

</div>

---

## What is ClearLit?

**ClearLit** is a cross-browser AI reading assistant that transforms how you consume content on the web. Whether you're reading long-form journalism, academic papers, technical documentation, or news — ClearLit layers intelligent tooling directly onto every page: instant AI summaries, bias detection, source credibility scoring, distraction-free focus modes, and deep integrations with your note-taking workflow.

Built for researchers, students, journalists, analysts, and anyone who reads seriously on the internet.

> *Stop skimming. Start understanding.*

<br/>

---

## Browser Support

| Browser | Status | Store Link |
|---|---|---|
| 🌐 **Microsoft Edge** | ✅ Live | [Install from Edge Add-ons](https://microsoftedge.microsoft.com/addons/detail/clearlit/kfpoielincngdkeiedepofpnpnglgcco) |
| 🌐 **Google Chrome** | 🔜 Coming Soon | Chrome Web Store *(pending review)* |
| 🌐 **Brave / Opera / Arc** | ✅ Compatible | Install via Chrome instructions |

> ClearLit is built on standard WebExtensions APIs — it runs on any Chromium-based browser.

<br/>

---

## Feature Overview

### 🧠 AI Intelligence Layer

| Feature | Description |
|---|---|
| **Smart Summaries** | Instant, context-aware summaries of any web page — powered by Claude AI |
| **Key Points Extraction** | Pulls the core arguments and facts from dense content |
| **Bias & Tone Detector** | Analyzes political lean and emotional tone after every summary |
| **Source Credibility Score** | Displays a live domain trust badge (0–100) on every page you visit |

### 🎯 Focus & Accessibility

| Feature | Description |
|---|---|
| **Focus Highlight** | Dims text above and below your cursor to eliminate reading drift |
| **Pomodoro Timer** | Built-in 25/5/15 min focus timer with system notifications |
| **Font & Spacing Controls** | Adjust font family, size, line-height, and column width live on any page |
| **Dyslexia Font** | One-click toggle to Lexend — a dyslexia-friendly typeface — across the entire page |
| **Read Aloud** | Text-to-speech for any selected or summarized content |

### 📤 Export & Integrations

| Feature | Description |
|---|---|
| **Notion Export** | Push summaries directly to your Notion database via API |
| **Obsidian Export** | Open summaries in Obsidian instantly via deep link |
| **Copy to Clipboard** | Copy a formatted summary + source URL in one click |

### ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `Alt + S` | Generate AI summary |
| `Alt + K` | Extract key points |
| `Alt + F` | Toggle focus highlight |
| `Alt + R` | Toggle read aloud |
| `Alt + X` | Close panel |

<br/>

---

## Getting Started

ClearLit uses the **Anthropic Claude API** to power all AI features. Setup takes under two minutes.

### Step 1 — Install the Extension

**Microsoft Edge:**
→ [Install from Microsoft Edge Add-ons](https://microsoftedge.microsoft.com/addons/detail/clearlit/kfpoielincngdkeiedepofpnpnglgcco)

**Chrome / Brave / Arc:**
1. Download or clone this repository
2. Open `chrome://extensions/` in your browser
3. Enable **Developer mode** (top-right toggle)
4. Click **Load unpacked** → select the `clearlit/` folder

---

### Step 2 — Get Your Anthropic API Key

1. Go to [console.anthropic.com](https://console.anthropic.com)
2. Sign up or log in
3. Navigate to **API Keys** → click **Create Key**
4. Copy your key — it starts with `sk-ant-...`

> Your key is stored **locally** in your browser via `chrome.storage`. It is never transmitted to any server other than Anthropic's official API endpoint.

---

### Step 3 — Configure ClearLit

1. Click the **ClearLit icon** in your browser toolbar
2. Click the ⚙️ **Settings gear** (bottom-right of the popup)
3. Paste your Anthropic API key into the field
4. Click **Save Settings**

That's it. ClearLit is ready to use on any page.

<br/>

---

## Notion Integration (Optional)

Connect ClearLit to your Notion workspace to save summaries as structured database entries automatically.

### 1. Create a Notion Integration

1. Go to [notion.so/my-integrations](https://www.notion.so/my-integrations)
2. Click **New integration**
3. Name it (e.g. *ClearLit*) and click **Submit**
4. Copy the **Internal Integration Token** — it starts with `secret_...`

### 2. Set Up Your Database

Create a Notion database with the following properties:

| Property | Type |
|---|---|
| `Name` | Title |
| `URL` | URL |
| `Date` | Date |

### 3. Share the Database with Your Integration

1. Open the database in Notion
2. Click **Share** → **Invite** → select your integration
3. Copy the **Database ID** from the page URL:
   ```
   notion.so/workspace/→ DATABASE_ID ←?v=...
   ```

### 4. Connect in ClearLit Settings

Open ClearLit Settings → paste your **Integration Token** and **Database ID** → Save.

Every summary you export will now appear as a new entry in your Notion database.

<br/>

---

## Obsidian Integration (Optional)

No setup required. Obsidian export uses the `obsidian://` deep link protocol.

Make sure **Obsidian** is installed on your system. When you click **Export to Obsidian**, ClearLit will open a new note pre-filled with the summary and source URL in the Obsidian app.

<br/>

---

## File Structure

```
clearlit/
├── manifest.json         Extension config & permissions
├── background.js         AI calls, Notion export, credibility database
├── content.js            Page injection: panel, focus, font controls, badges
├── popup.html            Extension popup UI
├── popup.css             Popup styles
├── popup.js              Popup logic: pomodoro, settings, toggles
├── credentials.json      Google SA key placeholder (unused in published mode)
├── icons/
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
└── README.md
```

<br/>

---

## Privacy & Security

- **Your API key** is stored locally using `chrome.storage.sync` — it never touches our servers.
- **No telemetry.** ClearLit does not collect analytics, usage data, or browsing history.
- **No backend.** All AI requests go directly from your browser to Anthropic's API.
- **Open source.** The full source is here — audit it yourself.

<br/>

---

## Roadmap

- [ ] Firefox support
- [ ] Safari / WebKit support
- [ ] Highlight + annotate mode
- [ ] Multi-tab summary comparison
- [ ] Custom AI personas / reading levels
- [ ] Logseq export
- [ ] Bear / Markdown export

Have a feature request? [Open an issue](../../issues).

<br/>

---

## Contributing

Pull requests are welcome. For major changes, please open an issue first to discuss what you'd like to change.

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Commit your changes: `git commit -m 'Add your feature'`
4. Push to the branch: `git push origin feature/your-feature`
5. Open a Pull Request

<br/>

---

## License

[MIT](LICENSE) — free to use, modify, and distribute.

<br/>

---

<div align="center">

**Built with care for people who read seriously.**

[![Edge Add-on](https://img.shields.io/badge/Microsoft%20Edge-Install%20ClearLit-0078D7?style=for-the-badge&logo=microsoftedge&logoColor=white)](https://microsoftedge.microsoft.com/addons/detail/clearlit/kfpoielincngdkeiedepofpnpnglgcco)

<sub>ClearLit is not affiliated with Anthropic, Google, Notion, or Obsidian.</sub>

</div>