import { motion, useDragControls } from "framer-motion";

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
      style={{
        top: `calc(50% + ${offset}px)`,
        right: `calc(1rem + ${offset}px)`,
        zIndex,
      }}
      className="absolute flex h-[88vh] w-[min(92vw,400px)] -translate-y-1/2 flex-col rounded-3xl glass shadow-soft"
    >
      <header
        onPointerDown={(e) => dragControls.start(e)}
        className="flex cursor-grab items-start justify-between border-b border-white/10 px-5 py-4 active:cursor-grabbing"
      >
        <div>
          <h2 className="text-lg font-bold text-cream">{title}</h2>
          {subtitle && <p className="text-xs text-petal/70">{subtitle}</p>}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={onTogglePin}
            title={pinned ? "Unpin" : "Pin in place"}
            className={`pill grid h-8 w-8 place-items-center text-sm transition ${
              pinned ? "bg-glow text-plum" : "text-cream hover:bg-white/10"
            }`}
          >
            📌
          </button>
          <button
            onClick={onClose}
            className="pill grid h-8 w-8 place-items-center text-cream hover:bg-white/10"
          >
            ✕
          </button>
        </div>
      </header>
      <div className="cozy-scroll flex-1 overflow-y-auto px-5 py-4">{children}</div>
    </motion.aside>
  );
}
