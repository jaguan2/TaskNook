import { lazy, Suspense, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Sofa } from "lucide-react";
import { useStore } from "./store";
import { useTimerStatus } from "./timer";
import { useReducedMotionPref } from "./lib/motion";
import { moodFor } from "./lib/profile";
import { derivePalette, PALETTE_VARS } from "./lib/palette";
import Cottage from "./components/Cottage";
import ErrorBoundary from "./components/ErrorBoundary";
import IsoRoom from "./components/IsoRoom";
import TopBar from "./components/TopBar";
import Dock from "./components/Dock";
import Drawer from "./components/Drawer";
import HudFocusCard from "./components/HudFocusCard";
import HudTasks from "./components/HudTasks";
import MusicDock from "./components/MusicDock";
import WeatherOverlay from "./components/WeatherOverlay";
import SkyOverlay from "./components/SkyOverlay";
// Panels are lazy: all eight shipped in the first chunk even though most
// sessions open one or two, and several are heavy (the calendar, the room
// browser). They live behind a dock click, so a chunk fetch is invisible.
// The room panel's sprites are NOT duplicated into its chunk — IsoItems is
// already in the main bundle via the always-mounted scene.
const TaskPanel = lazy(() => import("./components/TaskPanel"));
const CalendarPanel = lazy(() => import("./components/CalendarPanel"));
const ProgressPanel = lazy(() => import("./components/ProgressPanel"));
const FriendsPanel = lazy(() => import("./components/FriendsPanel"));
const MusicPanel = lazy(() => import("./components/MusicPanel"));
const WeatherPanel = lazy(() => import("./components/WeatherPanel"));
const RoomPanel = lazy(() => import("./components/RoomPanel"));
const SettingsPanel = lazy(() => import("./components/SettingsPanel"));
const ProfilePanel = lazy(() => import("./components/ProfilePanel"));

const PANELS = {
  tasks: { title: "Tasks", subtitle: "Add, arrange & check things off", Comp: TaskPanel },
  calendar: { title: "Calendar", subtitle: "Plan tasks across your days", Comp: CalendarPanel },
  progress: { title: "Progress", subtitle: "Your cozy productivity, today", Comp: ProgressPanel },
  friends: { title: "Friends", subtitle: "Cheer on your cottage neighbours", Comp: FriendsPanel },
  music: { title: "Sounds", subtitle: "Set the mood for deep focus", Comp: MusicPanel },
  weather: { title: "Weather", subtitle: "Check the sky outside, for real", Comp: WeatherPanel },
  room: { title: "Room", subtitle: "Make the space yours — drag to arrange", Comp: RoomPanel },
  profile: { title: "Profile", subtitle: "Who you are, and who lives here", Comp: ProfilePanel },
  settings: { title: "Settings", subtitle: "Brightness & colours", Comp: SettingsPanel },
};

export default function App() {
  const {
    booting,
    bootError,
    toast,
    dismissToast,
    weatherMode,
    timeOfDay,
    brightness,
    colorScheme,
    customColor,
    motionMode,
    roomPlacements,
    roomEditMode,
    setRoomEditMode,
    moveRoomItem,
    removeRoomItem,
    setRoomItemTint,
    roomScale,
    isoPreview,
    isoRoom,
    lastIsoAddedId,
    moveIsoItem,
    removeIsoItem,
    rotateIsoItem,
    setIsoItemTint,
    character,
  } = useStore();
  // The NARROW timer context: running/phase only. Reading the full one here
  // would re-render App — and with it the dock, the HUD and every open panel —
  // once a second, which is exactly what splitting the timer out avoided.
  const { running, phase } = useTimerStatus();
  // What your character is thinking. Derived from the STATUS hook, so it
  // changes on a real transition and never on a tick — the scene is memo'd and
  // a per-second prop change would redraw the whole room.
  const mood = moodFor({ running, phase });
  // Each entry is { key, pinned }. Pinned panels stay open when another dock
  // item is clicked instead of being replaced by it.
  const [openPanels, setOpenPanels] = useState([]);
  const [frontKey, setFrontKey] = useState(null);
  // Resolved once here and threaded down: the setting wins over the OS
  // preference, and framer-motion's own hook only knows about the latter.
  const reduceMotion = useReducedMotionPref(motionMode);

  // data-theme lives on <html> (not this component's root) so the CSS
  // variables it swaps also reach <body>'s own themed background gradient.
  // For the "custom" scheme there's no CSS block — we derive the ramp from the
  // picked colour and set the variables inline (inline styles win over the
  // [data-theme] rules). Switching back to a preset removes them again.
  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute("data-theme", colorScheme);
    if (colorScheme === "custom") {
      const vars = derivePalette(customColor);
      Object.entries(vars).forEach(([name, value]) =>
        root.style.setProperty(name, value)
      );
    } else {
      PALETTE_VARS.forEach((name) => root.style.removeProperty(name));
    }
  }, [colorScheme, customColor]);

  const toggleDockPanel = (key) => {
    setOpenPanels((prev) => {
      const existing = prev.find((p) => p.key === key);
      if (existing) {
        if (existing.pinned) return prev; // pinned panels ignore dock re-clicks
        return prev.filter((p) => p.key !== key);
      }
      return [...prev.filter((p) => p.pinned), { key, pinned: false }];
    });
    setFrontKey(key);
  };
  const closePanel = (key) => setOpenPanels((prev) => prev.filter((p) => p.key !== key));
  const togglePin = (key) =>
    setOpenPanels((prev) => prev.map((p) => (p.key === key ? { ...p, pinned: !p.pinned } : p)));

  // Escape leaves decorating mode first; otherwise it closes the front-most
  // unpinned panel.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== "Escape") return;
      // Never yank a panel out from under someone mid-typing (same guard the
      // iso room's Delete shortcut uses).
      const t = e.target;
      if (
        t &&
        (t.tagName === "INPUT" ||
          t.tagName === "TEXTAREA" ||
          t.tagName === "SELECT" ||
          t.isContentEditable)
      )
        return;
      if (roomEditMode) {
        setRoomEditMode(false);
        return;
      }
      setOpenPanels((prev) => {
        const closable = prev.filter((p) => !p.pinned);
        if (closable.length === 0) return prev;
        const target =
          closable.find((p) => p.key === frontKey) || closable[closable.length - 1];
        return prev.filter((p) => p.key !== target.key);
      });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [frontKey, roomEditMode, setRoomEditMode]);

  if (booting) {
    return (
      <div className="grid h-full place-items-center text-petal">
        <div className="animate-float text-4xl">🏡</div>
      </div>
    );
  }

  // Bootstrap failed outright (backend unreachable) — say so instead of
  // rendering a silently empty cottage.
  if (bootError) {
    return (
      <div className="grid h-full place-items-center px-6 text-center text-petal">
        <div className="space-y-3">
          <div className="text-4xl">🌧️</div>
          <p className="text-sm font-semibold text-cream">
            TaskNook couldn't reach its backend.
          </p>
          <p className="text-xs text-petal/60">
            Your data is safe — start the server and try again.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="pill glass px-4 py-2 text-sm font-semibold text-glow shadow-soft hover:bg-white/10"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="relative h-full w-full overflow-hidden"
      // No identity filter: any non-none filter on the root forces the whole
      // app into one composited layer that re-rasterizes every paint.
      style={brightness === 1 ? undefined : { filter: `brightness(${brightness})` }}
    >
      {/* Sky first in the DOM = behind the scene: the room floats in front
          of the moon/stars/sun/clouds. */}
      <SkyOverlay weatherMode={weatherMode} timeOfDay={timeOfDay} />
      <WeatherOverlay mode={weatherMode} reduceMotion={reduceMotion} />

      {/* Centerpiece cottage. On first open we start zoomed right into the
          window and pull back to reveal the room — like stepping back from
          peeking through it. The transform origin sits roughly on the window
          within the centred SVG; UI chrome fades in afterwards via the
          .intro-chrome CSS delay. */}
      <motion.div
        className="absolute inset-0 grid place-items-center"
        style={{ transformOrigin: "48% 36%" }}
        initial={reduceMotion ? { opacity: 0 } : { scale: 3, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{
          duration: reduceMotion ? 0.6 : 2.2,
          ease: [0.16, 1, 0.3, 1],
          opacity: { duration: reduceMotion ? 0.6 : 0.9, ease: "easeOut" },
        }}
      >
        {/* The scene gets its OWN boundary. It's the most failure-prone thing
            in the app (thousands of SVG nodes generated from editable layout
            data), and it's also the most disposable: if the room can't draw,
            the to-do list, the timer and the panels should all still work. */}
        <ErrorBoundary
          fallback={(error, retry) => (
            <div className="glass max-w-xs rounded-2xl px-5 py-4 text-center shadow-soft">
              <p className="text-sm font-semibold text-cream">
                The room couldn&apos;t be drawn 🌫️
              </p>
              <p className="mt-1 text-xs text-petal/60">
                Everything else still works — your layout is saved.
              </p>
              <button
                onClick={retry}
                title={String(error?.message || error)}
                className="pill mt-3 bg-white/10 px-4 py-1.5 text-xs font-semibold text-glow hover:bg-white/20"
              >
                Try again
              </button>
            </div>
          )}
        >
          {isoPreview ? (
            <IsoRoom
              size={isoRoom}
              placements={isoRoom.placements}
              editMode={roomEditMode}
              timeOfDay={timeOfDay}
              highlightId={lastIsoAddedId}
              working={running && phase === "focus"}
              character={character}
              mood={mood}
              reduceMotion={reduceMotion}
              onMoveItem={moveIsoItem}
              onRemoveItem={removeIsoItem}
              onRotateItem={rotateIsoItem}
              onTintItem={setIsoItemTint}
            />
          ) : (
            <Cottage
              weather={weatherMode}
              timeOfDay={timeOfDay}
              room={roomPlacements}
              editMode={roomEditMode}
              scale={roomScale}
              onMoveItem={moveRoomItem}
              onRemoveItem={removeRoomItem}
              onTintItem={setRoomItemTint}
              reduceMotion={reduceMotion}
            />
          )}
        </ErrorBoundary>
      </motion.div>

      {/* Decorating chip: visible whenever edit mode is on, so there's always
          a way out even with the Room panel closed. */}
      <AnimatePresence>
        {roomEditMode && (
          <motion.button
            initial={{ y: 24, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 24, opacity: 0 }}
            onClick={() => setRoomEditMode(false)}
            className="pill glass absolute bottom-6 left-6 z-30 flex h-11 items-center gap-1.5 px-4 text-sm font-semibold text-glow shadow-soft hover:bg-white/10"
          >
            {/* The chip doubles as the cheat-sheet for the mode's hidden keys —
                ⌫ only works in the iso scene (the flat one has per-item ✕). */}
            <Sofa size={15} className="shrink-0" />
            {isoPreview
              ? "Decorating — drag items · ⌫ removes · Esc or click to finish"
              : "Decorating — drag items · Esc or click to finish"}
          </motion.button>
        )}
      </AnimatePresence>

      <TopBar />
      <Dock active={openPanels.map((p) => p.key)} onSelect={toggleDockPanel} />

      {/* Shared error toast — top-centre (the one HUD zone nothing owns).
          Outside the decorating visibility wrapper: failures matter in every
          mode. The wrapper div centres it because framer-motion owns the
          motion.div's transform (a -translate-x-1/2 there would be lost). */}
      <div
        // The wrapper is always mounted, so aria-live here announces each new
        // toast as it appears. Only the pill itself takes pointer events —
        // this strip spans the window and would otherwise eat clicks on the
        // scene behind it.
        aria-live="polite"
        className="pointer-events-none absolute inset-x-0 top-5 z-50 flex justify-center"
      >
        <AnimatePresence>
          {toast && (
            <motion.button
              key={toast.id}
              type="button"
              onClick={dismissToast}
              title="Dismiss"
              initial={{ y: -16, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -16, opacity: 0 }}
              className="glass pointer-events-auto rounded-full px-4 py-2 text-xs font-semibold text-cream shadow-soft transition hover:bg-white/15"
            >
              {toast.message}
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {openPanels.map(({ key, pinned }, i) => {
          const Def = PANELS[key];
          return (
            <Drawer
              key={key}
              title={Def.title}
              subtitle={Def.subtitle}
              pinned={pinned}
              onTogglePin={() => togglePin(key)}
              onClose={() => closePanel(key)}
              offset={i * 28}
              zIndex={frontKey === key ? 40 : 30}
              onPointerDownCapture={() => setFrontKey(key)}
            >
              {/* Each panel is its own chunk; the fallback is a beat at most
                  (local file), so keep it quiet rather than a spinner. */}
              <Suspense
                fallback={<p className="px-1 py-4 text-xs text-petal/40">Opening…</p>}
              >
                <Def.Comp />
              </Suspense>
            </Drawer>
          );
        })}
      </AnimatePresence>

      {/* The HUD cards own the scene's top corners (focus card left, to-do
          right) — exactly where wall items can now be placed — and the maker's
          signature sits bottom-left where the decorating chip appears. So all
          three step aside while decorating. Hidden via `visibility`, NOT
          unmounting/display:none: those replay the .intro-chrome boot
          animation on return (1.5s of invisible chrome), while
          visibility:hidden also removes them from hit-testing without
          restarting anything. Timers keep ticking in the store either way. */}
      <div
        className={`transition-opacity duration-300 ${
          roomEditMode ? "invisible opacity-0" : "opacity-100"
        }`}
      >
        <HudFocusCard />
        <HudTasks onOpenTasks={() => toggleDockPanel("tasks")} />
        {/* Bottom-centre transport bar. Lives OUTSIDE the Sounds panel so the
            music keeps playing when the panel closes; hidden (not unmounted)
            while decorating so playback survives that too and the tint picker
            gets the bottom-centre spot. */}
        <MusicDock onOpenPanel={() => toggleDockPanel("music")} />

        {/* rkive. — the maker's signature, same wordmark as the portfolio.
            Sits ON the bottom rail: same bottom-6, same 44px height, so its
            optical centre lines up with the transport bar and the clock
            cluster instead of floating a few px below them. */}
        <div
          className="intro-chrome absolute bottom-6 left-6 z-10 flex h-11 select-none items-center"
          title="A space where I archive and share my journey, wherever it takes me."
        >
          <span className="font-mark text-lg font-semibold text-petal/40 transition-colors duration-300 hover:text-petal/90">
            rkive<span className="text-glow/70">.</span>
          </span>
        </div>
      </div>

    </div>
  );
}
