import { useState } from "react";
import { useStore } from "./store";
import Cottage from "./components/Cottage";
import TopBar from "./components/TopBar";
import Dock from "./components/Dock";
import Drawer from "./components/Drawer";
import FocusTimer from "./components/FocusTimer";
import RainOverlay from "./components/RainOverlay";
import TaskPanel from "./components/TaskPanel";
import CalendarPanel from "./components/CalendarPanel";
import ProgressPanel from "./components/ProgressPanel";
import FriendsPanel from "./components/FriendsPanel";
import MusicPanel from "./components/MusicPanel";

const PANELS = {
  tasks: { title: "Tasks", subtitle: "Add, arrange & check things off", Comp: TaskPanel },
  calendar: { title: "Calendar", subtitle: "Plan tasks across your days", Comp: CalendarPanel },
  progress: { title: "Progress", subtitle: "Your cozy productivity, today", Comp: ProgressPanel },
  friends: { title: "Friends", subtitle: "Cheer on your cottage neighbours", Comp: FriendsPanel },
  music: { title: "Sounds", subtitle: "Set the mood for deep focus", Comp: MusicPanel },
};

export default function App() {
  const { booting, running, rainOn } = useStore();
  const [panel, setPanel] = useState(null);

  if (booting) {
    return (
      <div className="grid h-full place-items-center text-petal">
        <div className="animate-float text-4xl">🏡</div>
      </div>
    );
  }

  const Active = panel ? PANELS[panel] : null;

  return (
    <div className="relative h-full w-full overflow-hidden">
      <RainOverlay active={rainOn} />

      {/* Centerpiece cottage */}
      <div className="absolute inset-0 grid place-items-center">
        <Cottage focused={running} />
      </div>

      <TopBar />
      <Dock active={panel} onSelect={setPanel} />

      <Drawer
        open={!!panel}
        title={Active?.title}
        subtitle={Active?.subtitle}
        onClose={() => setPanel(null)}
      >
        {Active && <Active.Comp />}
      </Drawer>

      <FocusTimer />
    </div>
  );
}
