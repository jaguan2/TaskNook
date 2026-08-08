/**
 * Is this event coming from somewhere a keystroke MEANS something?
 *
 * Global shortcuts have to stand down while someone is typing, and there were two
 * copies of that check disagreeing about what typing is: App's Escape handler
 * covered INPUT/TEXTAREA/SELECT/contentEditable, while IsoRoom's Backspace/Delete
 * shortcut covered only INPUT/TEXTAREA. So Backspace deleted the selected piece
 * of furniture out from under you while you were using a `<select>` or any
 * contenteditable — with the two-tap ✕ armed elsewhere in the app specifically so
 * that deletions can't happen by accident.
 *
 * One definition, imported by both, so the next shortcut inherits it.
 */
export function isTypingTarget(target) {
  if (!target) return false;
  const tag = target.tagName;
  return (
    tag === "INPUT" ||
    tag === "TEXTAREA" ||
    tag === "SELECT" ||
    target.isContentEditable === true
  );
}
