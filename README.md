# ClearLit-  Extension

A unified, powerful, and clean accessibility extension for Google Chrome designed to provide a premium and seamless reading experience. Accessibility Hub transforms cluttered web pages into a focused, cinematic reading interface, combined with instantaneous Text-to-Speech (TTS) and fine-grained text control.

## 🚀 Features

*   **Cinematic Reading Mode:** Instantly removes ads, sidebars, and unnecessary styling to display a clean, beautiful reading overlay with a progress bar and smooth typography.
*   **Text-to-Speech (TTS):** 
    *   **Read Full Page:** Instantly listens to the contents of the page with built-in voice acting.
    *   **Stop/Pause Reading:** Simple control module that hovers while audio plays.
*   **Typography Controls (Coming Soon / UI Ready):**
    *   Scale font sizes up or down seamlessly.
    *   Switch to dyslexia-friendly or customized accessible fonts (Arial, Georgia, Courier New, Verdana).
*   **Premium Dark UI:** Built with a clean, fully black, glassmorphism-inspired aesthetic to reduce eye strain from the first click.

## 🛠 Tech Stack

*   **HTML5 / CSS3:** For the popup structure and premium dark mode styling.
*   **Vanilla JavaScript:** Lightweight execution of content scripts, overlays, and TTS API interactions.
*   **Chrome Extensions API:** Manipulating tabs, scripting execution, and cross-context message passing via Manifest V3.

## 📁 File Structure

```text
accessibility-extension/
├── manifest.json   # Chrome Extension configuration (Manifest V3)
├── background.js   # Background service worker for extension event handling
├── content.js      # Content script meant for contextual page manipulation
├── popup.html      # Main UI interface for the extension
├── popup.css       # Styling for the extension UI (dark theme)
├── popup.js        # Logic for buttons, TTS bindings, and cinematic mode injection
└── styles.css      # Additional stylesheet
```

## ⚙️ Installation Guide

Follow these steps to load the extension via your local Chrome developer environment:

1. Clone this repository or download the folder to your local machine.
2. Open Google Chrome and navigate to the Extensions page: `chrome://extensions/`.
3. Enable **Developer mode** in the top-right corner.
4. Click on the **Load unpacked** button in the top-left pane.
5. Select the `accessibility-extension` folder.
6. The *Accessibility Hub* icon will now appear in your browser toolbar! (You can pin it for quick access).

## 💡 How to Use

1. Navigate to any article or text-heavy web page.
2. Click on the **Accessibility Hub** extension icon in your Chrome toolbar.
3. Select **Smart Reading Overlay** to activate the cinematic, distraction-free reading view.
4. Click **Read Full Page** to activate the Text-to-Speech reader.
5. Once you are done, click **Restore Page** or close the overlay to go back to the original webpage.

## 🤝 Contributing

Contributions, issues, and feature requests are welcome! 
Feel free to check the [issues page](../../issues) if you want to contribute or suggest enhancements to the UI/UX.

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.
