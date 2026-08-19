import { motion, useDragControls } from "framer-motion";
import { Pin, X } from "lucide-react";

export default function Drawer({
  title,
  subtitle,
  pinned,
  onTogglePin,
  onClose,
  offset = 0,
  zIndex = 30,
  onPointerDownCapture,
  children,
}) {
  const dragControls = useDragControls();

  return (
    <motion.aside
      key="drawer"
      drag
      dragListener={false}
      dragControls={dragControls}
      dragMomentum={false}
      dragElastic={0}
      onPointerDownCapture={onPointerDownCapture}
      initial={{ x: 420, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 420, opacity: 0 }}
      transition={{ type: "spring", stiffness: 280, damping: 30 }}
      // Positioned with explicit top/bottom (not a translate-y class):
      // framer-motion writes its own inline `transform` for the slide/drag,
      // which would silently overwrite any Tailwind translate and leave the
      // panel half off-screen.
      style={{
        top: `calc(4vh + ${offset}px)`,
        bottom: "4vh",
        // Stack offset, capped so the panel's left edge can never be pushed
        // off-screen on narrow viewports (width is min(92vw, 400px)).
        right: `min(calc(1rem + ${offset}px), calc(100vw - min(92vw, 400px) - 0.5rem))`,
        zIndex,
      }}
      /* z-30 puts the panel above the HUD it overlaps. It carried NO z-index,
         so it sat at z-auto under the to-do list (z-20) — and since the drawer
         is draggable and the list is pinned top-right, any panel moved near
         that corner had task rows and "+ New Task" printing straight through
         its header. Below the toast (z-50) and the clock cluster's popovers
         (z-40) on purpose: those are answers to something you just did, and
         must stay on top of the panel that prompted them. */
      className="absolute z-30 flex w-[min(92vw,400px)] flex-col rounded-3xl glass shadow-soft"
    >
      <header
        onPointerDown={(e) => dragControls.start(e)}
        className="flex cursor-grab items-start justify-between border-b border-white/10 px-5 py-4 active:cursor-grabbing"
      >
        <div>
          <h2 className="font-display text-lg font-bold text-cream">{title}</h2>
          {subtitle && <p className="text-xs text-petal/70">{subtitle}</p>}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={onTogglePin}
            title={pinned ? "Unpin" : "Pin in place"}
            className={`pill grid h-8 w-8 place-items-center transition ${
              pinned ? "bg-glow text-plum" : "text-cream hover:bg-white/10"
            }`}
          >
            <Pin size={15} />
          </button>
          <button
            onClick={onClose}
            title="Close (Esc)"
            aria-label="Close (Esc)"
            className="pill grid h-8 w-8 place-items-center text-cream hover:bg-white/10"
          >
            <X size={16} />
          </button>
        </div>
      </header>
      <div className="cozy-scroll flex-1 overflow-y-auto px-5 py-4">{children}</div>
    </motion.aside>
  );
}
