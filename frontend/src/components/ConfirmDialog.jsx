/** A deliberate pause before removing user data — a dialog, never a row whose
 * label morphs into “sure?”. The action remains explicit even during a run of
 * deletions, which is when a tiny state change is easiest to miss. */
export default function ConfirmDialog({ open, title, message, confirmLabel = "Delete", onCancel, onConfirm }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[70] grid place-items-center bg-plum/45 p-4" role="presentation">
      <div role="dialog" aria-modal="true" aria-labelledby="confirm-title" className="glass w-full max-w-sm rounded-2xl p-5 shadow-soft">
        <h2 id="confirm-title" className="text-base font-bold text-cream">{title}</h2>
        <p className="mt-2 text-sm text-petal/70">{message}</p>
        <div className="mt-5 flex justify-end gap-2">
          <button autoFocus onClick={onCancel} className="pill bg-white/10 px-3 py-1.5 text-sm font-semibold text-petal hover:bg-white/20">Cancel</button>
          <button onClick={onConfirm} className="pill bg-danger/90 px-3 py-1.5 text-sm font-bold text-plum hover:bg-danger">{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}
