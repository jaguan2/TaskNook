import { useEffect, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { useStore } from "./store";
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
import SettingsPanel from "./components/SettingsPanel";

const PANELS = {
  tasks: { title: "Tasks", subtitle: "Add, arrange & check things off", Comp: TaskPanel },
  calendar: { title: "Calendar", subtitle: "Plan tasks across your days", Comp: CalendarPanel },
  progress: { title: "Progress", subtitle: "Your cozy productivity, today", Comp: ProgressPanel },
  friends: { title: "Friends", subtitle: "Cheer on your cottage neighbours", Comp: FriendsPanel },
  music: { title: "Sounds", subtitle: "Set the mood for deep focus", Comp: MusicPanel },
  weather: { title: "Weather", subtitle: "Check the sky outside, for real", Comp: WeatherPanel },
  settings: { title: "Settings", subtitle: "Volume & brightness", Comp: SettingsPanel },
};

export default function App() {
  const { booting, weatherMode, timeOfDay, brightness, colorScheme } = useStore();
  // Each entry is { key, pinned }. Pinned panels stay open when another dock
  // item is clicked instead of being replaced by it.
  const [openPanels, setOpenPanels] = useState([]);
  const [frontKey, setFrontKey] = useState(null);

  // data-theme lives on <html> (not this component's root) so the CSS
  // variables it swaps also reach <body>'s own themed background gradient.
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", colorScheme);
  }, [colorScheme]);

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

      {/* Centerpiece cottage */}
      <div className="absolute inset-0 grid place-items-center">
        <Cottage weather={weatherMode} timeOfDay={timeOfDay} />
      </div>

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

      <FocusTimer />
    </div>
  );
}
