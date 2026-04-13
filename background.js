/* popup.css — CLEARLIT v2.1 · TURA color palette */

@import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@400;600;700;800&family=Barlow:wght@300;400;500&display=swap');

:root {
  /* TURA palette */
  --bg:          #2c2f30;
  --bg-card:     #323637;
  --bg-card-2:   #252829;
  --bg-hover:    #383c3d;
  --border:      rgba(255,255,255,0.09);
  --text-1:      #f0f0ee;
  --text-2:      #7a8484;
  --text-3:      #484f50;
  --toggle-off:  #1e2122;
  --toggle-on:   #f0f0ee;
  --radius-card: 10px;
  --radius-pill: 100px;
}

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

body {
  width: 320px;
  background: var(--bg);
  color: var(--text-1);
  font-family: 'Barlow', sans-serif;
  font-size: 14px;
  -webkit-font-smoothing: antialiased;
}

html, body {
  scrollbar-width: none;
  -ms-overflow-style: none;
  overflow-x: hidden;
}
::-webkit-scrollbar { display: none !important; width: 0 !important; }

.popup {
  padding: 0 0 8px 0;
  animation: fadeUp 0.22s ease both;
}
@keyframes fadeUp {
  from { opacity: 0; transform: translateY(5px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* ── HEADER ── */
.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 20px 14px;
}

.header-logo {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 15px;
  font-weight: 800;
  letter-spacing: 0.2em;
}
.logo-clear { color: var(--text-1); }
.logo-lit   { color: var(--text-3); }

.header-dot {
  width: 7px; height: 7px;
  border-radius: 50%;
  background: var(--text-3);
  transition: background 0.3s;
}
.header-dot.active  { background: #7acf95; box-shadow: 0 0 6px rgba(122,207,149,0.4); }
.header-dot.loading { background: #c9a84c; animation: pulse 1s infinite; }
@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }

/* ── DIVIDERS ── */
.divider     { height: 1px; background: var(--border); }
.row-divider { height: 1px; background: var(--border); margin-left: 56px; }

/* ── SECTION LABEL ── */
.section-label {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.22em;
  color: var(--text-3);
  padding: 14px 20px 10px;
  text-transform: uppercase;
}

/* ── FEATURE ROW ── */
.feature-row {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 13px 20px;
  transition: background 0.15s;
  cursor: default;
}
.feature-row:hover { background: var(--bg-hover); }

.feature-icon {
  width: 36px; height: 36px;
  border-radius: 9px;
  background: var(--bg-card-2);
  border: 1px solid var(--border);
  display: flex; align-items: center; justify-content: center;
  color: var(--text-2);
  flex-shrink: 0;
}

.feature-text { flex: 1; }
.feature-title {
  font-family: 'Barlow', sans-serif;
  font-size: 14px; font-weight: 500;
  color: var(--text-1); line-height: 1.3; margin-bottom: 2px;
}
.feature-sub {
  font-family: 'Barlow', sans-serif;
  font-size: 11px; color: var(--text-2); font-weight: 300;
}

/* ── TOGGLE ── */
.toggle { cursor: pointer; flex-shrink: 0; }
.toggle input { display: none; }
.toggle-track {
  display: block; width: 44px; height: 26px;
  border-radius: var(--radius-pill);
  background: var(--toggle-off);
  border: 1px solid var(--text-3);
  position: relative; transition: background 0.22s, border-color 0.22s;
}
.toggle-thumb {
  position: absolute; top: 3px; left: 3px;
  width: 18px; height: 18px; border-radius: 50%;
  background: var(--text-3);
  transition: transform 0.22s cubic-bezier(.4,0,.2,1), background 0.22s;
}
.toggle input:checked + .toggle-track {
  background: var(--toggle-on);
  border-color: var(--toggle-on);
}
.toggle input:checked + .toggle-track .toggle-thumb {
  transform: translateX(18px);
  background: var(--bg);
}

/* ── POMODORO ── */
.pomodoro-row {
  display: flex; align-items: center; gap: 10px;
  padding: 10px 20px 14px; flex-wrap: wrap;
}
.pomo-display {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 24px; font-weight: 700;
  letter-spacing: 0.06em; color: var(--text-1);
  min-width: 74px; transition: color 0.3s;
}
.pomo-display.running { color: #7acf95; }
.pomo-display.done    { color: #cf7a7a; }

.pomo-controls { display: flex; gap: 6px; }
.pomo-btn {
  all: unset; cursor: pointer;
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 10px; font-weight: 700; letter-spacing: 0.14em;
  color: var(--text-2); padding: 5px 11px;
  border: 1px solid var(--border); border-radius: 5px;
  transition: all 0.15s;
}
.pomo-btn:hover { color: var(--text-1); border-color: var(--text-2); background: var(--bg-hover); }
.pomo-btn.active-run { color: #7acf95; border-color: rgba(122,207,149,0.3); }

.pomo-mode-pills { display: flex; gap: 4px; margin-left: auto; }
.pomo-pill {
  all: unset; cursor: pointer;
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 9px; font-weight: 700; letter-spacing: 0.1em;
  color: var(--text-3); padding: 3px 8px;
  border: 1px solid var(--border); border-radius: 100px;
  transition: all 0.15s;
}
.pomo-pill:hover { color: var(--text-2); border-color: var(--text-3); }
.pomo-pill.active { background: var(--bg-card); border-color: var(--text-3); color: var(--text-1); }

/* ── MODE PILLS ── */
.mode-pills { display: flex; gap: 6px; padding: 4px 20px 12px; }
.pill {
  flex: 1; padding: 7px 0;
  border-radius: var(--radius-pill);
  background: transparent; border: 1px solid var(--border);
  color: var(--text-2);
  font-family: 'Barlow', sans-serif;
  font-size: 11px; font-weight: 500; cursor: pointer;
  transition: all 0.15s; letter-spacing: 0.02em;
}
.pill:hover { border-color: var(--text-3); color: var(--text-1); }
.pill.active { background: var(--bg-card); border-color: var(--text-3); color: var(--text-1); }

/* ── SUMMARY CARD ── */
.summary-card {
  margin: 0 20px 10px;
  padding: 13px 15px;
  background: var(--bg-card-2);
  border: 1px solid var(--border);
  border-radius: var(--radius-card);
  min-height: 68px;
}
.summary-card-tag {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 9px; font-weight: 700;
  letter-spacing: 0.2em; color: var(--text-3);
  margin-bottom: 7px; text-transform: uppercase;
}
.summary-card-text {
  font-family: 'Barlow', sans-serif;
  font-size: 12px; color: var(--text-2);
  line-height: 1.6; font-weight: 300;
  transition: color 0.2s;
}
.summary-card-text.loaded { color: var(--text-1); }

/* skeleton */
.skeleton-line {
  height: 11px; border-radius: 4px;
  background: linear-gradient(90deg, var(--bg-card) 25%, var(--bg-hover) 50%, var(--bg-card) 75%);
  background-size: 200% 100%;
  animation: shimmer 1.4s infinite; margin-bottom: 8px;
}
.skeleton-line:last-child { width: 55%; margin-bottom: 0; }
@keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }

/* ── GENERATE BUTTON ── */
.generate-btn {
  display: flex; align-items: center; justify-content: space-between;
  width: calc(100% - 40px); margin: 0 20px 8px;
  padding: 14px 18px;
  background: var(--bg-card); border: 1px solid var(--border);
  border-radius: var(--radius-card);
  color: var(--text-1);
  font-family: 'Barlow', sans-serif;
  font-size: 13px; font-weight: 500; cursor: pointer;
  transition: all 0.15s;
}
.generate-btn:hover { background: var(--bg-hover); border-color: var(--text-3); transform: translateY(-1px); }
.generate-btn:disabled { opacity: 0.4; cursor: not-allowed; transform: none; }
.generate-arrow { color: var(--text-2); flex-shrink: 0; }

/* ── REMOVE BUTTON ── */
.remove-btn {
  display: flex; align-items: center; justify-content: center;
  width: calc(100% - 40px); margin: 0 20px 8px;
  padding: 9px; background: transparent;
  border: 1px solid var(--border); border-radius: var(--radius-pill);
  color: var(--text-2);
  font-family: 'Barlow', sans-serif;
  font-size: 11px; cursor: pointer; transition: all 0.15s;
}
.remove-btn:hover { color: var(--text-1); border-color: var(--text-3); }
.remove-btn.hidden { display: none; }

/* ── SHORTCUTS ROW ── */
.shortcuts-row {
  display: grid; grid-template-columns: 1fr 1fr;
  gap: 4px; padding: 10px 20px;
}
.shortcut-item { display: flex; align-items: center; gap: 7px; }
.shortcut-key {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 9px; font-weight: 700; letter-spacing: 0.1em;
  color: var(--text-3); background: var(--bg-card-2);
  border: 1px solid var(--border); border-radius: 4px;
  padding: 2px 5px; white-space: nowrap;
}
.shortcut-desc { font-size: 11px; color: var(--text-2); font-weight: 300; }

/* ── QUICK ROW ── */
.quick-row { display: flex; gap: 6px; padding: 12px 20px 6px; }
.quick-btn {
  flex: 1; padding: 9px 4px;
  border-radius: var(--radius-pill);
  background: var(--bg-card-2); border: 1px solid var(--border);
  color: var(--text-2);
  font-family: 'Barlow', sans-serif;
  font-size: 11px; font-weight: 400; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  gap: 5px; transition: all 0.15s;
}
.quick-btn:hover { background: var(--bg-hover); color: var(--text-1); border-color: var(--text-3); }

/* ── SETTINGS PAGE ── */
.settings-page { padding: 0 0 16px; animation: fadeUp 0.2s ease both; }
.settings-page.hidden { display: none; }
.popup.hidden { display: none; }

.settings-header {
  display: flex; align-items: center; gap: 12px; padding: 16px 20px;
}
.back-btn {
  all: unset; cursor: pointer;
  font-size: 18px; color: var(--text-2); transition: color 0.15s;
}
.back-btn:hover { color: var(--text-1); }
.settings-title {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 12px; font-weight: 700; letter-spacing: 0.18em;
  color: var(--text-2); text-transform: uppercase;
}

.settings-field { padding: 6px 20px; }
.settings-label {
  display: block;
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 10px; font-weight: 700; letter-spacing: 0.16em;
  color: var(--text-2); margin-bottom: 6px;
}
.settings-hint { font-weight: 400; letter-spacing: 0.04em; color: var(--text-3); }
.settings-input {
  width: 100%; padding: 9px 12px;
  background: var(--bg-card-2); border: 1px solid var(--border);
  border-radius: 8px; color: var(--text-1);
  font-family: 'Barlow', sans-serif; font-size: 11px; font-weight: 300;
  outline: none; transition: border-color 0.15s;
}
.settings-input:focus { border-color: var(--text-3); }
.settings-input::placeholder { color: var(--text-3); }

.shortcuts-list { padding: 0 20px 8px; }
.shortcut-row-full {
  display: flex; align-items: center; gap: 10px;
  padding: 6px 0; font-size: 11px; color: var(--text-2); font-weight: 300;
  border-bottom: 1px solid var(--border);
}
.shortcut-row-full:last-child { border-bottom: none; }
.shortcut-row-full .shortcut-key {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 10px; color: var(--text-2);
  background: var(--bg-card-2); border: 1px solid var(--border);
  border-radius: 4px; padding: 2px 6px;
}

.settings-status {
  text-align: center; font-family: 'Barlow Condensed', sans-serif;
  font-size: 11px; font-weight: 700; letter-spacing: 0.18em;
  color: #7acf95; padding: 8px 20px;
}
.settings-status.hidden { display: none; }

/* bottom handle */
.popup::after {
  content: ''; display: block;
  width: 36px; height: 3px; border-radius: 2px;
  background: var(--border); margin: 12px auto 0;
}
