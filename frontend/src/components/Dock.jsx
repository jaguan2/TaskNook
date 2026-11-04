import { useState } from "react";
import { createPortal } from "react-dom";
import {
  CalendarDays,
  ChevronLeft,
  ClipboardList,
  CloudSun,
  Headphones,
  Leaf,
  Menu,
  Settings,
  Sofa,
  UserRound,
  Users,
} from "lucide-react";
import { readStored, writeStored } from "../services/storage";
import { useI18n } from "../i18n/I18nProvider";

// Lucide stroke icons, not emoji: they inherit the theme's text colour and
// render identically on every OS (Windows emoji looked out of place — user
// feedback).
const ITEMS = [
  { key: "tasks", Icon: ClipboardList, labelKey: "panel.tasks.title" },
  { key: "calendar", Icon: CalendarDays, labelKey: "panel.calendar.title" },
  { key: "friends", Icon: Users, labelKey: "panel.friends.title" },
  { key: "challenges", Icon: Leaf, labelKey: "panel.challenges.title" },
  { key: "music", Icon: Headphones, labelKey: "panel.music.title" },
  { key: "weather", Icon: CloudSun, labelKey: "panel.weather.title" },
  { key: "room", Icon: Sofa, labelKey: "panel.room.title" },
  { key: "profile", Icon: UserRound, labelKey: "panel.profile.title" },
  { key: "settings", Icon: Settings, labelKey: "panel.settings.title" },
];

export default function Dock({ active, onSelect, onWarm }) {
  const { t } = useI18n();
  // Collapsible so the scene can breathe (VC2 keeps its chrome ghosted and
  // minimal). Persisted per device — it's a display preference.
  const [collapsed, setCollapsed] = useState(
    () => readStored("tasknook.dockCollapsed") === "1"
  );
  const [tooltip, setTooltip] = useState(null);
  const showLabel = (event, item) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const narrow = window.innerWidth < 600;
    setTooltip({
      label: t(item.labelKey),
      left: narrow ? rect.left + rect.width / 2 : rect.right + 8,
      top: narrow ? rect.top - 8 : rect.top + rect.height / 2,
    });
    onWarm?.(item.key);
  };
  const toggle = () => {
    // Persist OUTSIDE the updater — updaters must stay pure (StrictMode
    // double-invokes them), and `collapsed` is already in scope.
    const next = !collapsed;
    writeStored("tasknook.dockCollapsed", next ? "1" : "0");
    setCollapsed(next);
    setTooltip(null);
  };

  return (
    // Vertically centred when there's room, but never allowed to climb into
    // the top-left corner — that's the focus card's spot, and on short
    // windows the item list scrolls, so adding a tab cannot strand Settings
    // below the viewport. Reserve the bottom rail for Return Home/signature
    // and transport controls. Tooltips sit outside the scrolling glass surface.
    <div className="dock-shell intro-chrome absolute z-20">
      <div
        className="dock-surface glass flex flex-col gap-1.5 rounded-3xl p-1.5 shadow-soft"
        data-collapsed={collapsed ? "true" : "false"}
      >
        {collapsed ? (
          <button
            title={t("dock.open")}
            aria-label={t("dock.open")}
            onClick={toggle}
            className="dock-open pill grid h-10 w-10 place-items-center text-cream transition hover:bg-white/10"
          >
            <Menu size={18} />
          </button>
        ) : (
          <>
            <button
              title={t("dock.collapse")}
              aria-label={t("dock.collapse")}
              onClick={toggle}
              className="dock-collapse pill grid h-5 w-10 shrink-0 place-items-center text-petal/50 transition hover:bg-white/10 hover:text-cream"
            >
              <ChevronLeft className="dock-collapse-icon" size={13} />
            </button>
            <div className="dock-items flex min-h-0 flex-col gap-1.5 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              onScroll={() => setTooltip(null)}>
            {ITEMS.map((item) => (
              <button
                key={item.key}
                onClick={() => onSelect(item.key)}
                onPointerEnter={(event) => showLabel(event, item)}
                onPointerLeave={() => setTooltip(null)}
                onFocus={(event) => showLabel(event, item)}
                onBlur={() => setTooltip(null)}
                className={`dock-item pill relative grid h-10 w-10 shrink-0 place-items-center transition ${
                  active.includes(item.key)
                    ? "bg-glow text-plum"
                    : "text-cream hover:bg-white/10"
                }`}
              >
                <item.Icon size={17} />
                <span className="sr-only">{t(item.labelKey)}</span>
              </button>
            ))}
            </div>
          </>
        )}
      </div>
      {tooltip && createPortal(
        <span aria-hidden="true" className="dock-tooltip pointer-events-none fixed z-50 whitespace-nowrap rounded-lg bg-night/90 px-2 py-1 text-xs text-cream"
          style={{ left: tooltip.left, top: tooltip.top }}>{tooltip.label}</span>, document.body
      )}
    </div>
  );
}
