async function injectAndRun(func, args = []) {
  const [tab] = await chrome.tabs.query({
    active: true,
    currentWindow: true
  });

  await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func,
    args
  });
}

/* ---------------- CINEMATIC READING MODE ---------------- */

document.getElementById("readerMode").addEventListener("click", () => {
  injectAndRun(() => {

    if (document.getElementById("cinematic-overlay")) {
      document.getElementById("cinematic-overlay").remove();
      return;
    }

    const overlay = document.createElement("div");
    overlay.id = "cinematic-overlay";

    overlay.innerHTML = `
      <div id="reading-container"></div>
      <div id="reading-progress"></div>
      <button id="close-overlay">✕</button>
    `;

    document.body.appendChild(overlay);

    const style = document.createElement("style");
    style.innerHTML = `
      #cinematic-overlay {
        position: fixed;
        inset: 0;
        background: rgba(10,10,10,0.95);
        backdrop-filter: blur(8px);
        z-index: 999999;
        overflow-y: auto;
        padding: 60px 20px;
      }

      #reading-container {
        max-width: 750px;
        margin: auto;
        font-size: 18px;
        line-height: 1.9;
        color: #f5f5f5;
      }

      #reading-progress {
        position: fixed;
        top: 0;
        left: 0;
        height: 4px;
        width: 0%;
        background: #00e0ff;
        z-index: 9999999;
      }

      #close-overlay {
        position: fixed;
        top: 15px;
        right: 20px;
        background: #222;
        color: white;
        border: none;
        padding: 8px 12px;
        cursor: pointer;
        border-radius: 6px;
      }
    `;
    document.head.appendChild(style);

    const container = document.getElementById("reading-container");

    const elements = Array.from(document.querySelectorAll("h1, h2, h3, p"))
      .filter(el => el.innerText.trim().length > 20);

    elements.forEach(el => {
      const clone = el.cloneNode(true);
      container.appendChild(clone);
    });

    document.getElementById("close-overlay").onclick = () => {
      overlay.remove();
    };

    overlay.addEventListener("scroll", () => {
      const scrollTop = overlay.scrollTop;
      const scrollHeight = overlay.scrollHeight - overlay.clientHeight;
      const progress = (scrollTop / scrollHeight) * 100;
      document.getElementById("reading-progress").style.width = progress + "%";
    });

  });
});

/* ---------------- TTS ---------------- */

document.getElementById("readAll").addEventListener("click", () => {
  injectAndRun(() => {

    speechSynthesis.cancel();

    const overlay = document.getElementById("cinematic-overlay");
    const source = overlay ? overlay.querySelectorAll("p") : document.querySelectorAll("p");

    const text = Array.from(source)
      .map(p => p.innerText)
      .join(" ");

    if (!text) return;

    const utterance = new SpeechSynthesisUtterance(text);

    let player = document.getElementById("tts-player");

    if (!player) {
      player = document.createElement("div");
      player.id = "tts-player";
      player.innerHTML = `
        <div>🔊 Reading...</div>
        <button id="tts-stop">Stop</button>
      `;
      document.body.appendChild(player);

      const style = document.createElement("style");
      style.innerHTML = `
        #tts-player {
          position: fixed;
          bottom: 20px;
          right: 20px;
          background: #1e1e1e;
          color: white;
          padding: 15px;
          border-radius: 12px;
          box-shadow: 0 0 15px rgba(0,0,0,0.6);
          z-index: 9999999;
        }
        #tts-player button {
          margin-top: 8px;
          padding: 5px 10px;
        }
      `;
      document.head.appendChild(style);

      document.getElementById("tts-stop").onclick = () => {
        speechSynthesis.cancel();
      };
    }

    speechSynthesis.speak(utterance);

  });
});

/* ---------------- STOP ---------------- */

document.getElementById("stopReading").addEventListener("click", () => {
  injectAndRun(() => {
    speechSynthesis.cancel();
  });
});

/* ---------------- RESTORE ---------------- */

document.getElementById("restore").addEventListener("click", () => {
  injectAndRun(() => {
    location.reload();
  });
});