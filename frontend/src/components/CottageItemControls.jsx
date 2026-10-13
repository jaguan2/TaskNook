import { Copy, X } from "lucide-react";
import { GRID, ITEMS, clampToRoom } from "../lib/room";
import { useArmed } from "../lib/useArmed";

export default function CottageItemControls({ placement, onMove, onDuplicate, onRemove, onClose }) {
  const item = ITEMS[placement.item];
  const [armedId, arm] = useArmed();
  const nudge = (dx, dy) => {
    const next = clampToRoom(placement.item, placement.x + dx * GRID, placement.y + dy * GRID);
    onMove(placement.id, next.x, next.y);
  };
  return <div className="glass absolute right-6 top-6 z-20 w-52 space-y-2 rounded-2xl p-3 shadow-soft" role="group" aria-label="Selected decoration controls">
    <div className="flex items-center justify-between gap-2">
      <p className="text-xs font-semibold text-cream">{item.label}</p>
      <button type="button" aria-label="Deselect decoration" onClick={onClose} className="text-petal/60 hover:text-cream"><X size={14} /></button>
    </div>
    {!item.fixed && <>
      <div className="flex gap-1" role="group" aria-label="Move decoration">
        {[["left", "←", -1, 0], ["up", "↑", 0, -1], ["down", "↓", 0, 1], ["right", "→", 1, 0]].map(([name, label, dx, dy]) =>
          <button key={name} type="button" aria-label={`Move decoration ${name}`} onClick={() => nudge(dx, dy)} className="pill flex-1 bg-white/10 py-1 text-cream hover:bg-white/20">{label}</button>)}
      </div>
      <p className="text-[10px] text-petal/55">Arrow keys move · Shift moves farther</p>
    </>}
    <div className="flex gap-2">
      {!item.fixed && <button type="button" onClick={() => onDuplicate(placement.id)} className="pill flex items-center gap-1 bg-white/10 px-3 py-1 text-xs text-cream hover:bg-white/20"><Copy size={12} />Duplicate</button>}
      <button type="button" onClick={() => arm(placement.id, () => onRemove(placement.id))} className="pill px-3 py-1 text-xs text-danger hover:bg-danger/10">
        {armedId === placement.id ? "Remove?" : "Remove"}
      </button>
    </div>
  </div>;
}
