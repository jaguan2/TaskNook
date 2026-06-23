# TaskNook 🏡

A cozy, full-stack task tracker inspired by the game **Virtual Cottage**. Curl up
in a warm little isometric room, queue up your tasks, start a focus block with
lofi beats and rain on the window, and watch your productivity garden grow — while
cheering on your friends.

![A cozy isometric cottage with a focus timer, task list, and friends panel](docs/preview.png)

## ✨ Features

- **Cozy cottage scene** — a hand-built isometric SVG room (desk, loft bed, kitchen,
  plants, glowing window) that gently comes alive while you focus.
- **Tasks** — add tasks with a duration & priority, check them off, drag to reorder.
- **Ordering algorithms** — arrange your list by:
  - ✋ *My order* (manual drag-and-drop)
  - ⚡ *Quick wins first* (shortest duration first)
  - ⛰️ *Deep work first* (longest first)
  - 🌊 *Ebb & flow* (alternating short/long to pace yourself)
  - 🔥 *Priority* (high-priority first)
- **Focus timer** — Pomodoro-style blocks (15/25/45/60 min) with a progress ring;
  completed blocks are logged as productivity time.
- **Calendar** — schedule tasks onto specific days and see what's planned.
- **Progress** — a live completion bar, focus-hours, and a "productivity garden"
  that grows a plant for every 15 focused minutes.
- **Lofi music & rain** — toggle embedded lofi radio and procedurally-generated
  rainfall (Web Audio, works offline) for ambience.
- **Friends / social** — add friends by username and watch each other's daily
  progress to stay motivated.

## 🧱 Tech stack

| Layer    | Tech                                                            |
| -------- | -------------------------------------------------------------- |
| Frontend | React 18 + Vite, Tailwind CSS, Framer Motion                    |
| Backend  | Flask + Flask-SQLAlchemy (SQLite), token auth, REST API        |

The frontend talks to the backend purely over the REST API under `/api`.

## 🚀 Getting started

You'll need **Python 3.10+** and **Node 18+**.

### 1. Backend (Flask REST API → http://localhost:5000)

```bash
cd backend
pip install -r requirements.txt
python app.py
```

On first run this creates `tasknook.db` and seeds a few demo cottage-dwellers
(`luna`, `kai`, `sora`, `mochi` — password `lofi123`) so the Friends panel has life.

### 2. Frontend (Vite dev server → http://localhost:5173)

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173. The Vite dev server proxies `/api` to Flask, so just
run both. Click **"peek inside with the demo account"** to log in instantly, or
sign up to create your own cottage.

### Production / single-server mode

Build the frontend and let Flask serve it on one port:

```bash
cd frontend && npm run build      # outputs frontend/dist
cd ../backend && python app.py     # now serves the app at http://localhost:5000
```

## 🔌 API overview

All endpoints are under `/api`. Authenticated routes expect an
`Authorization: Bearer <token>` header (returned by login/register).

| Method   | Endpoint                | Description                          |
| -------- | ----------------------- | ------------------------------------ |
| `POST`   | `/auth/register`        | Create account, returns a token      |
| `POST`   | `/auth/login`           | Log in, returns a token              |
| `GET`    | `/auth/me`              | Current user                         |
| `GET`    | `/tasks`                | List your tasks                      |
| `POST`   | `/tasks`                | Create a task                        |
| `PUT`    | `/tasks/:id`            | Update (complete, edit, schedule)    |
| `PUT`    | `/tasks/reorder`        | Persist a manual ordering            |
| `DELETE` | `/tasks/:id`            | Delete a task                        |
| `POST`   | `/sessions`             | Log a completed focus block          |
| `GET`    | `/stats`                | Today's completion & focus minutes   |
| `GET`    | `/friends`              | Friends + their daily progress       |
| `POST`   | `/friends`              | Add a friend by username             |
| `DELETE` | `/friends/:id`          | Remove a friend                      |

## 📁 Project structure

```
TaskNook/
├── backend/
│   ├── app.py            # Flask app, routes, seeding, optional static serving
│   ├── models.py         # SQLAlchemy models (User, Task, FocusSession, Token)
│   └── requirements.txt
└── frontend/
    ├── src/
    │   ├── components/   # Cottage, TopBar, FocusTimer, panels, Drawer, Dock…
    │   ├── lib/          # api client, ordering algorithms, ambient audio
    │   ├── store.jsx     # React context: auth, tasks, timer, ambient
    │   └── App.jsx
    └── vite.config.js
```

Made cozy with 🌙 and lofi.
