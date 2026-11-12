import { BOOK_COLORS, SHELF_LAYOUTS } from '../lib/shelfDecor';

export default function ShelfDecorControls({ placement, onDecor }) {
  const decor = placement.decor || {};
  const change = patch => onDecor(placement.id, { ...decor, ...patch });
  return <fieldset className="space-y-2 border-t border-white/10 pt-2" aria-label="Shelf decorations">
    <legend className="text-xs font-semibold text-cream">Shelf decorations</legend>
    <label className="block text-xs text-petal">Contents
      <select aria-label="Shelf contents" value={decor.layout || ''} onChange={e => change({ layout: e.target.value })} className="ml-2 rounded bg-night px-2 py-1 text-cream">
        <option value="">Original arrangement</option>
        {Object.entries(SHELF_LAYOUTS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
      </select>
    </label>
    <div className="flex items-center gap-1.5" role="group" aria-label="Book colours">
      <span className="mr-1 text-xs text-petal">Books</span>
      {BOOK_COLORS.map(color => <button type="button" key={color} aria-label={`Book colour ${color}`} aria-pressed={decor.bookColor === color} onClick={() => change({ bookColor: color })} className="h-5 w-5 rounded-full border border-white/40 aria-pressed:ring-2 aria-pressed:ring-white" style={{ backgroundColor: color }} />)}
    </div>
    <button type="button" onClick={() => onDecor(placement.id, null)} disabled={!placement.decor} className="text-xs text-petal underline disabled:opacity-40">Reset decorations</button>
  </fieldset>;
}
