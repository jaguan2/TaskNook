# TaskNook 🏡

> A cozy, full-stack task tracker inspired by the game **Virtual Cottage**.

Settle in at a warm little desk by the window, queue up your tasks, and start a
focus block with lofi beats and rain, snow, or a full storm outside. Switch the
scene between night, sunset, and day — or let TaskNook check the real weather
where you are and match it automatically. Watch your productivity garden grow
— and cheer on your friends while you're at it.

![A cozy desk by a rainy window, with a focus timer, glowing monitor, and task list](docs/preview.png)

> **Just want to use it?** Grab `TaskNook.exe` from
> [Releases](../../releases) if one is published — or clone the repo and
> double-click **`TaskNook.bat`** (Windows) / **`TaskNook.command`** (macOS).
> No setup beyond having Python + Node installed.

---

## Contents

- [Quick start](#-quick-start)
- [Run as a desktop app](#-run-as-a-desktop-app)
- [Features](#-features)
- [Tech stack](#-tech-stack)
- [API reference](#-api-reference)
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

**One-click launch:** double-click the launcher for your platform:

| Platform | File | Notes |
|---|---|---|
| Windows | **`TaskNook.bat`** | Works out of the box (WebView2). |
| macOS | **`TaskNook.command`** | First time: `chmod +x TaskNook.command`. |
| Linux | `TaskNook.command` | Also needs system WebKit, e.g. `sudo apt install python3-gi gir1.2-webkit2-4.1`. Without it, TaskNook falls back to opening in your browser. |

On first launch it builds the frontend and installs the desktop dependencies,
then opens the app. Subsequent launches start instantly.

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
into `dist\TaskNook.exe` (one file, no console window).

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

## 🔌 API reference

All endpoints live under `/api`. Authenticated routes expect an
`Authorization: Bearer <token>` header (returned by login & register).

> There's no login screen — TaskNook is single-user and local, so the frontend
> silently logs into (or creates, on first launch) one fixed local account
> using the endpoints below. They're listed here because they're still real,
> callable API routes, not because you'll ever see a login form.

### Auth

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/auth/register` | Create an account, returns a token |
| `POST` | `/auth/login` | Log in, returns a token |
| `GET` | `/auth/me` | Get the current user |

Real-world weather (the built-in Weather panel) isn't a backend route at all —
the frontend calls Open-Meteo directly; see `lib/weather.js`.

### Tasks

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/tasks` | List your tasks |
| `POST` | `/tasks` | Create a task |
| `PUT` | `/tasks/:id` | Update (complete, edit, schedule) |
| `PUT` | `/tasks/reorder` | Persist a manual ordering |
| `DELETE` | `/tasks/:id` | Delete a task |

### Progress & social

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/sessions` | Log a completed focus block |
| `GET` | `/stats` | Today's completion & focus minutes |
| `GET` | `/friends` | List friends + their daily progress |
| `POST` | `/friends` | Add a friend by username |
| `DELETE` | `/friends/:id` | Remove a friend |

---

## 📁 Project structure

Everything a user needs sits at the repo root: the one-click launchers and the
`.exe` build script. The app itself lives in `backend/` + `frontend/`.

```
TaskNook/
├── TaskNook.bat              # ⭐ Windows: double-click → build (first run) + open the app
├── TaskNook.command          # ⭐ macOS/Linux: the same one-click launcher
├── build-exe.bat             # Package everything into a single dist/TaskNook.exe
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
