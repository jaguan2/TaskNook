import { Copy, Move, Palette, RotateCcw, RotateCw, Scaling, Trash2, X } from 'lucide-react';
import { furnitureFacingLabel } from '../lib/furnitureFacing';
import { furnitureDimensions, RESIZABLE_FURNITURE, snapFurnitureDimensions } from '../lib/furnitureDimensions';
import RoomTintPicker from './RoomTintPicker';

export default function IsoItemInspector({ placement, item, mode, onMode, onRotate, onDuplicate, onRemove,
  onTint, onDecor, onResize, onDragResize, onClose }) {
  const limits = RESIZABLE_FURNITURE[placement.item], size = furnitureDimensions(placement);
  const paintable = item.tintable !== false || item.variants;
  const copyable = !item.unique && !item.persona && !item.roamer;
  const tabs = [['place', Move, 'Move'], ...(paintable && onTint ? [['colour', Palette, 'Colours']] : []),
    ...(limits && onResize ? [['size', Scaling, 'Size']] : [])];
  return <section className="iso-item-inspector glass absolute z-40 space-y-2 rounded-2xl p-3 text-cream shadow-soft"
    data-item-inspector role="group" aria-label="Selected furniture controls">
    <header className="flex items-center justify-between gap-2">
      <div className="min-w-0"><p className="truncate text-xs font-semibold text-cream">{item.icon} {item.label}</p>
        <p className="text-[10px] text-petal/60">{furnitureFacingLabel(placement)}</p></div>
      <button type="button" onClick={onClose} aria-label="Deselect furniture" className="grid h-8 w-8 place-items-center rounded-lg hover:bg-white/10"><X size={15} /></button>
    </header>
    <div className="grid grid-cols-4 gap-1">
      <button type="button" onClick={() => onRotate?.(placement.id, 1)} className="editor-item-action" title="Turn left · Shift+R"><RotateCcw size={16} />Turn left</button>
      <button type="button" onClick={() => onRotate?.(placement.id, -1)} className="editor-item-action" title="Turn right · R"><RotateCw size={16} />Turn right</button>
      <button type="button" onClick={() => onDuplicate?.(placement.id)} disabled={!copyable || !onDuplicate} className="editor-item-action" title="Copy · Shift+D"><Copy size={16} />Copy</button>
      <button type="button" onClick={() => onRemove?.(placement.id)} className="editor-item-action" title="Remove · Delete · Undo restores it"><Trash2 size={16} />Remove</button>
    </div>
    <div className="flex gap-1 border-t border-white/10 pt-2" role="group" aria-label="Furniture tools">
      {tabs.map(([key, Icon, label]) => <button type="button" key={key} aria-pressed={mode === key} onClick={() => onMode(key === 'place' ? 'hidden' : key)}
        className={`flex flex-1 items-center justify-center gap-1 rounded-lg px-2 py-1.5 text-xs ${mode === key ? 'bg-glow text-plum' : 'bg-white/5 text-petal hover:bg-white/10'}`}><Icon size={13} />{label}</button>)}
    </div>
    {mode === 'place' && <p className="text-[10px] leading-relaxed text-petal/65">Drag the piece or use arrow keys. R turns right; Shift+D copies. Escape deselects.</p>}
    {mode === 'colour' && paintable && <RoomTintPicker placement={placement} item={item} onTint={onTint} onDecor={onDecor} embedded />}
    {mode === 'size' && limits && <div className="space-y-2">
      <p className="text-[10px] text-petal/60">{size.w} × {size.d} tiles · half-tile steps</p>
      {[['w', 'Width', limits.minW, limits.maxW], ['d', 'Depth', limits.minD, limits.maxD]].map(([key, label, min, max]) =>
        <div key={key} className="flex items-center justify-between gap-2 text-xs">
          <span>{label} <span className="text-[10px] text-petal/50">{min}–{max}</span></span>
          <div className="flex items-center gap-2">
            <button type="button" aria-label={`Decrease ${label.toLowerCase()}`} disabled={size[key] <= min} className="editor-size-step"
              onClick={() => onResize(placement.id, snapFurnitureDimensions(placement.item, size.w - (key === 'w' ? .5 : 0), size.d - (key === 'd' ? .5 : 0)))}>−</button>
            <span className="w-8 text-center tabular-nums">{size[key]}</span>
            <button type="button" aria-label={`Increase ${label.toLowerCase()}`} disabled={size[key] >= max} className="editor-size-step"
              onClick={() => onResize(placement.id, snapFurnitureDimensions(placement.item, size.w + (key === 'w' ? .5 : 0), size.d + (key === 'd' ? .5 : 0)))}>+</button>
          </div>
        </div>)}
      <div className="flex items-center justify-between gap-2">
        <button type="button" onClick={onDragResize} className="text-xs text-glow underline">Drag resize handle</button>
        <button type="button" disabled={!placement.dimensions} onClick={() => onResize(placement.id, null)} className="text-[10px] text-petal/70 underline disabled:opacity-40">Original size</button>
      </div>
    </div>}
  </section>;
}
