import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useStore } from "./store";
import { derivePalette, PALETTE_VARS } from "./lib/palette";
import Cottage from "./components/Cottage";
import TopBar from "./components/TopBar";
import Dock from "./components/Dock";
import Drawer from "./components/Drawer";
import FocusTimer from "./components/FocusTimer";
import WeatherOverlay from "./components/WeatherOverlay";
import TaskPanel from "./components/TaskPanel";
import CalendarPanel from "./components/CalendarPanel";
import ProgressPanel from "./components/ProgressPanel";
import FriendsPanel from "./components/FriendsPanel";
import MusicPanel from "./components/MusicPanel";
import WeatherPanel from "./components/WeatherPanel";
import RoomPanel from "./components/RoomPanel";
import SettingsPanel from "./components/SettingsPanel";

const PANELS = {
  tasks: { title: "Tasks", subtitle: "Add, arrange & check things off", Comp: TaskPanel },
  calendar: { title: "Calendar", subtitle: "Plan tasks across your days", Comp: CalendarPanel },
  progress: { title: "Progress", subtitle: "Your cozy productivity, today", Comp: ProgressPanel },
  friends: { title: "Friends", subtitle: "Cheer on your cottage neighbours", Comp: FriendsPanel },
  music: { title: "Sounds", subtitle: "Set the mood for deep focus", Comp: MusicPanel },
  weather: { title: "Weather", subtitle: "Check the sky outside, for real", Comp: WeatherPanel },
  room: { title: "Room", subtitle: "Make the space yours — drag to arrange", Comp: RoomPanel },
  settings: { title: "Settings", subtitle: "Volume & brightness", Comp: SettingsPanel },
};

export default function App() {
  const {
    booting,
    weatherMode,
    timeOfDay,
    brightness,
    colorScheme,
    customColor,
    roomPlacements,
    roomEditMode,
    setRoomEditMode,
    moveRoomItem,
    removeRoomItem,
    setRoomItemTint,
    roomScale,
  } = useStore();
  // Each entry is { key, pinned }. Pinned panels stay open when another dock
  // item is clicked instead of being replaced by it.
  const [openPanels, setOpenPanels] = useState([]);
  const [frontKey, setFrontKey] = useState(null);
  const reduceMotion = useReducedMotion();

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

  // Escape closes the front-most unpinned panel.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== "Escape") return;
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
  }, [frontKey]);

  if (booting) {
    return (
      <div className="grid h-full place-items-center text-petal">
        <div className="animate-float text-4xl">🏡</div>
      </div>
    );
  }

  return (
    <div
      className="relative h-full w-full overflow-hidden"
      style={{ filter: `brightness(${brightness})` }}
    >
      <WeatherOverlay mode={weatherMode} />

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
        <Cottage
          weather={weatherMode}
          timeOfDay={timeOfDay}
          room={roomPlacements}
          editMode={roomEditMode}
          scale={roomScale}
          onMoveItem={moveRoomItem}
          onRemoveItem={removeRoomItem}
          onTintItem={setRoomItemTint}
        />
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
            className="pill glass absolute bottom-6 left-6 z-30 px-4 py-2 text-sm font-semibold text-glow shadow-soft hover:bg-white/10"
          >
            🛋️ Decorating — drag items · click to finish
          </motion.button>
        )}
      </AnimatePresence>

      <TopBar />
      <Dock active={openPanels.map((p) => p.key)} onSelect={toggleDockPanel} />

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
              <Def.Comp />
            </Drawer>
          );
        })}
      </AnimatePresence>

      {/* The timer card floats over the bottom of the scene — the deepest
          strip of the floor zone — so while decorating it steps aside or it
          would sit on top of exactly the items being grabbed. Hidden via
          `visibility`, NOT unmounting/display:none: those replay the
          .intro-chrome boot animation on return (1.5s of invisible timer),
          while visibility:hidden also removes it from hit-testing without
          restarting anything. The countdown itself lives in the store and
          keeps ticking either way. */}
      <div
        className={`transition-opacity duration-300 ${
          roomEditMode ? "invisible opacity-0" : "opacity-100"
        }`}
      >
        <FocusTimer />
      </div>

      {/* rkive. — the maker's signature, same wordmark as the portfolio */}
      <div
        className="intro-chrome absolute bottom-5 right-6 z-10 select-none"
        title="A space where I archive and share my journey, wherever it takes me."
      >
        <span className="font-mark text-lg font-semibold text-petal/40 transition-colors duration-300 hover:text-petal/90">
          rkive<span className="text-glow/70">.</span>
        </span>
      </div>
    </div>
  );
}
