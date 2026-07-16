# TaskNook 🏡

> A cozy, full-stack task tracker inspired by the game **Virtual Cottage**.

Settle in at a warm little desk by the window, queue up your tasks, and start a
focus block with lofi beats and rain, snow, or a full storm outside. Switch the
scene between night, sunset, and day — or let TaskNook check the real weather
where you are and match it automatically. Watch your productivity garden grow
— and cheer on your friends while you're at it.

![A cozy desk by a rainy window, with a focus timer, glowing monitor, and task list](docs/preview.png)

> **Just want to use it?** Download **`TaskNook.exe`** from the repo root and
> double-click it — that's the whole app in one file, no Python or Node needed.
> (macOS: clone the repo and run **`TaskNook.command`**.)

---

## Contents

- [Quick start](#-quick-start)
- [Run as a desktop app](#-run-as-a-desktop-app)
- [Features](#-features)
- [Tech stack](#-tech-stack)
- [Project structure](#-project-structure)

---

## 🚀 Quick start

**Prerequisites:** Python 3.10+ and Node 18+.

Run the backend and frontend in two terminals:

**1. Backend** — the Flask REST API on `http://localhost:5000`

```bash
cd backend
pip install -r requirements.txt
python app.py
```

**2. Frontend** — the Vite dev server on `http://localhost:5173`

```bash
cd frontend
npm install
npm run dev
```

Then open **http://localhost:5173** and you're in. 🎉

---

## 🖥️ Run as a desktop app

TaskNook can also run as a **native desktop application** — its own window, no
browser tab. It boots the Flask server locally and opens it in an OS window
(via [pywebview](https://pywebview.flowrl.com/); Windows uses the built-in
WebView2 runtime, macOS uses WebKit).

**One-click launch:**

| Platform | File | Notes |
|---|---|---|
| Windows | **`TaskNook.exe`** | Standalone — Python, the server and the app are all bundled inside. Nothing to install. |
| macOS | **`TaskNook.command`** | Needs Python + Node. First time: `chmod +x TaskNook.command`. |
| Linux | `TaskNook.command` | Also needs system WebKit, e.g. `sudo apt install python3-gi gir1.2-webkit2-4.1`. Without it, TaskNook falls back to opening in your browser. |

Your tasks and settings live in `%LOCALAPPDATA%\TaskNook\`, so they survive
closing the app — and updating the exe.

**Or run it manually:**

```bash
# one-time setup
cd frontend && npm install && npm run build && cd ..
pip install -r requirements-desktop.txt

# launch the native window
python desktop.py
```

<details>
<summary><b>Package it into a single <code>TaskNook.exe</code> (optional, Windows)</b></summary>

<br>

Bundle everything — Python, the server, and the built SPA — into one
double-clickable executable with [PyInstaller](https://pyinstaller.org/).

**Easiest:** run `build-exe.bat` from the repo root. It builds the frontend,
installs `requirements-desktop.txt` + `pyinstaller`, and packages `desktop.py`
into **`TaskNook.exe`** at the repo root (one file, no console window),
replacing the existing one.

**Manually**, the equivalent command is:

```bat
pip install -r requirements-desktop.txt pyinstaller
npm --prefix frontend run build            :: ensure frontend/dist exists

pyinstaller --onefile --windowed --name TaskNook ^
  --add-data "backend;backend" ^
  --add-data "frontend/dist;frontend/dist" ^
  --hidden-import flask_cors ^
  --hidden-import flask_sqlalchemy ^
  desktop.py
```

The app lands in `dist\TaskNook.exe`, and the DB it uses at runtime lives in
`%LOCALAPPDATA%\TaskNook\tasknook.db` (not inside the read-only bundle).

The `.exe` is a build artifact and stays out of git (`dist/` is ignored) — to
share it with people who don't want to build anything, attach `TaskNook.exe`
to a [GitHub Release](../../releases) so it's a one-click download.

> `backend/` and `frontend/dist` are bundled as **loose data files**, not
> analyzed as source — `desktop.py`'s `sys.path` trick then imports `app.py`
> from real files on disk at runtime, same as it does unfrozen. That's why
> `flask_cors`/`flask_sqlalchemy` need explicit `--hidden-import`: nothing in
> `desktop.py` itself references them for PyInstaller's analyzer to find.

</details>

---

## ✨ Features

| | Feature | What it does |
|---|---|---|
| 🏡 | **Cozy desk scene** | A hand-built flat SVG scene — a desk by a rainy window — with a glowing monitor, desk lamp and string lights that dim and brighten with the time of day. Opening the app pulls back from a peek through the window. |
| ✅ | **Tasks** | Add tasks with a duration & priority, check them off, and drag to reorder. |
| 🧠 | **Ordering algorithms** | Auto-arrange your list five different ways *(see below)*. |
| ⏱️ | **Focus timer** | Focus blocks (15 / 25 / 45 / 60 min) with a progress ring; finished blocks are logged as productivity time. Flip on 🍅 **Pomodoro mode** to cycle focus → break automatically for a set number of rounds, with your choice of break length. |
| 🗓️ | **Calendar** | Schedule tasks onto specific days and see what's planned. |
| 📈 | **Progress** | A live completion bar, focus-hours, and a "productivity garden" that grows a plant for every 15 focused minutes. |
| 🎵 | **Music** | Built-in lofi YouTube stations, or paste any YouTube or Spotify link (playlist/album/track/show/episode) to play your own. |
| 🌦️ | **Weather ambience** | Rain, snow, or a full storm (with thunder) — procedurally generated with the Web Audio API, works fully offline. The desk window shows matching weather. |
| 🕰️ | **Day / sunset / night** | Switch the scene's lighting — sky color, city lights, and a sun or moon — to match the mood you want. |
| 🌍 | **Real weather** | A built-in weather panel shows the actual current conditions where you are (via [Open-Meteo](https://open-meteo.com/), free & keyless) — geolocation first, manual city search as a fallback. "Match my real weather" auto-syncs the ambience and time of day to reality. |
| 🫶 | **Friends** | See everyone's daily progress to stay motivated — TaskNook auto-friends your local account with a few demo cottage-dwellers so it's never empty. |

**Ordering algorithms:**

- ✋ **My order** — manual drag-and-drop
- ⚡ **Quick wins first** — shortest duration first
- ⛰️ **Deep work first** — longest first
- 🌊 **Ebb & flow** — alternating short/long to pace yourself
- 🔥 **Priority** — high-priority tasks rise to the top

---

## 🧱 Tech stack

| Layer | Tech |
|---|---|
| **Frontend** | React 18 + Vite · Tailwind CSS · Framer Motion |
| **Backend** | Flask + Flask-SQLAlchemy (SQLite) · token auth · REST API |
| **External** | [Open-Meteo](https://open-meteo.com/) for real weather (free, no API key) — the only feature that needs internet; everything else is fully local |

The frontend is fully decoupled — it talks to the backend purely over the REST
API under `/api`. In development, Vite proxies `/api` to Flask automatically.

---

## 📁 Project structure

Everything a user needs sits at the repo root: the app itself and the launchers.
The source lives in `backend/` + `frontend/`.

```
TaskNook/
├── TaskNook.exe              # ⭐ Windows: double-click → the whole app, standalone
├── TaskNook.command          # ⭐ macOS/Linux one-click launcher (needs Python + Node)
├── build-exe.bat             # Rebuilds TaskNook.exe from source
├── desktop.py                # Native-window launcher (pywebview + waitress)
├── requirements-desktop.txt  # Desktop-app Python deps (pulls in backend deps too)
├── README.md
├── CLAUDE.md                 # Deep-dive guide to the codebase (for contributors & AI tools)
├── docs/
│   └── preview.png           # The screenshot at the top of this README
│
├── backend/                  # Flask REST API (SQLite, fully local)
│   ├── app.py                # Routes, token auth, demo seeding, static serving
│   ├── models.py             # SQLAlchemy models (User, Task, FocusSession, Token)
│   └── requirements.txt      # Backend Python deps
│
└── frontend/                 # React 18 + Vite single-page app
    ├── index.html
    ├── vite.config.js        # Dev server; proxies /api → Flask :5000
    ├── tailwind.config.js    # The cozy color palette
    └── src/
        ├── main.jsx          # Entry point
        ├── App.jsx           # Shell: scene, dock, panels, timer, intro animation
        ├── store.jsx         # Single source of truth (React Context)
        ├── index.css         # Tailwind layers + shared styles
        ├── components/
        │   ├── Cottage.jsx        # The hand-built SVG desk scene
        │   ├── TopBar.jsx, Dock.jsx, Drawer.jsx, FocusTimer.jsx
        │   ├── TaskPanel, CalendarPanel, ProgressPanel, FriendsPanel,
        │   │   MusicPanel, WeatherPanel, SettingsPanel (.jsx)
        │   └── WeatherOverlay.jsx # Full-screen rain / snow / storm visuals
        └── lib/
            ├── api.js             # Fetch wrapper (bearer-token auth)
            ├── algorithms.js      # Task-ordering strategies (pure functions)
            ├── audio.js           # Procedural rain/snow/storm (Web Audio API)
            ├── weather.js         # Open-Meteo real-weather client
            └── musicLink.js, youtube.js, spotify.js  # Music-link parsing
```

> After building the desktop app you'll also see `build/`, `dist/`, and
> `TaskNook.spec` locally — those are PyInstaller artifacts and are gitignored.

---

<div align="center">

Made cozy with 🌙 and lofi.

</div>
