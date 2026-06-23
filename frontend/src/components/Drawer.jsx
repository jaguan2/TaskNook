import { AnimatePresence, motion } from "framer-motion";

export default function Drawer({ open, title, subtitle, onClose, children }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.aside
          key="drawer"
          initial={{ x: 420, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 420, opacity: 0 }}
          transition={{ type: "spring", stiffness: 280, damping: 30 }}
          className="absolute right-4 top-1/2 z-30 flex h-[82vh] w-[min(92vw,400px)] -translate-y-1/2 flex-col rounded-3xl glass shadow-soft"
        >
          <header className="flex items-start justify-between border-b border-white/10 px-5 py-4">
            <div>
              <h2 className="text-lg font-bold text-cream">{title}</h2>
              {subtitle && (
                <p className="text-xs text-petal/70">{subtitle}</p>
              )}
            </div>
            <button
              onClick={onClose}
              className="pill grid h-8 w-8 place-items-center text-cream hover:bg-white/10"
            >
              ✕
            </button>
          </header>
          <div className="cozy-scroll flex-1 overflow-y-auto px-5 py-4">
            {children}
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
