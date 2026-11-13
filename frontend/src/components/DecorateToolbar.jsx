import { Check, Redo2, Sofa, Undo2 } from 'lucide-react';

export default function DecorateToolbar({ onBrowse, onDone, onUndo, onRedo, canUndo, canRedo }) {
  return <div className="decorate-toolbar room-action-chip glass absolute z-40 flex h-11 items-center gap-1 rounded-full px-2 shadow-soft"
    role="toolbar" aria-label="Decorate mode">
    <button type="button" onClick={onBrowse} className="flex h-8 items-center gap-1.5 rounded-full px-3 text-xs font-semibold text-cream hover:bg-white/10"><Sofa size={15} />Furniture</button>
    <span className="mx-1 h-5 border-l border-white/15" />
    <button type="button" onClick={onUndo} disabled={!canUndo} aria-label="Undo room edit" title="Undo · Ctrl+Z" className="editor-toolbar-icon"><Undo2 size={17} /></button>
    <button type="button" onClick={onRedo} disabled={!canRedo} aria-label="Redo room edit" title="Redo · Ctrl+Shift+Z" className="editor-toolbar-icon"><Redo2 size={17} /></button>
    <button type="button" onClick={onDone} className="ml-1 flex h-8 items-center gap-1 rounded-full bg-glow px-3 text-xs font-semibold text-plum hover:bg-amber"><Check size={14} />Done</button>
  </div>;
}
