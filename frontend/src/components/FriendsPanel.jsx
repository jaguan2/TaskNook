import { useState } from "react";
import { useStore } from "../store";
import { api } from "../lib/api";
import { useArmed } from "../lib/useArmed";
import { VISIT_ACCESS } from "../lib/visiting";

const doorHint = (key) => VISIT_ACCESS.find((v) => v.key === key)?.hint;

export default function FriendsPanel() {
  // The knock timer lives in the STORE, not here — this drawer closes for
  // all sorts of reasons mid-wait, and a knock that died with it broke
  // "the bots always answer".
  const { friends, refreshAll, visitFriend, knockFriend, knockingId } = useStore();
  const [username, setUsername] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [armedId, arm] = useArmed();

  const visit = (f) => {
    if (f.visitAccess === "private" || knockingId) return;
    if (f.visitAccess === "invite") knockFriend(f);
    else visitFriend(f);
  };

  const add = async (e) => {
    e.preventDefault();
    if (!username.trim()) return;
    setBusy(true);
    setError("");
    try {
      await api.addFriend(username.trim().toLowerCase());
      setUsername("");
      await refreshAll();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id) => {
    try {
      await api.removeFriend(id);
      await refreshAll();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="space-y-4">
      <form onSubmit={add} className="flex gap-2">
        <input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="add by username (try: kai)"
          className="flex-1 rounded-xl bg-white/10 px-3 py-2 text-sm text-cream placeholder:text-petal/50 outline-none focus:ring-2 focus:ring-glow/50"
        />
        <button
          disabled={busy}
          className="pill bg-glow px-4 py-2 text-sm font-semibold text-plum hover:bg-amber disabled:opacity-50"
        >
          +
        </button>
      </form>
      {error && <p className="text-xs text-danger">{error}</p>}

      <div className="space-y-2">
        {friends.length === 0 && (
          <p className="rounded-xl bg-white/5 px-3 py-6 text-center text-sm text-petal/60">
            No cottage neighbours yet. Add a friend to cheer each other on! 🫶
          </p>
        )}
        {friends.map((f) => {
          const hours = Math.floor(f.focusMinutesToday / 60);
          const mins = f.focusMinutesToday % 60;
          return (
            <div
              key={f.id}
              className="group rounded-2xl bg-white/5 px-3 py-3 transition hover:bg-white/10"
            >
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-full bg-wine text-xl">
                  {f.avatar}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <p className="truncate text-sm font-semibold text-cream">
                      {f.displayName}
                    </p>
                    <button
                      onClick={() => arm(f.id, () => remove(f.id))}
                      title="Remove friend"
                      aria-label="Remove friend"
                      className={`hover-reveal shrink-0 transition ${
                        armedId === f.id
                          ? "confirming text-[10px] font-bold text-danger"
                          : "text-sm text-petal/40 hover:text-danger"
                      }`}
                    >
                      {armedId === f.id ? "sure?" : "✕"}
                    </button>
                  </div>
                  <p className="text-xs text-petal/60">
                    {hours > 0 ? `${hours}h ` : ""}{mins}m focused · {f.tasksDone}/{f.tasksTotal} tasks
                  </p>
                </div>
              </div>
              <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-sage to-glow transition-all duration-700"
                  style={{ width: `${f.completion}%` }}
                />
              </div>
              {/* The door. One affordance per access level: walk in, knock
                  and wait, or a lock you can't press. */}
              <div className="mt-2">
                {f.visitAccess === "private" ? (
                  <span
                    title={doorHint("private")}
                    className="pill inline-flex cursor-default items-center gap-1 bg-white/5 px-3 py-1 text-xs font-semibold text-petal/40"
                  >
                    🔒 private
                  </span>
                ) : (
                  <button
                    onClick={() => visit(f)}
                    disabled={knockingId !== null}
                    title={doorHint(f.visitAccess)}
                    className="pill inline-flex items-center gap-1 bg-white/10 px-3 py-1 text-xs font-semibold text-cream transition hover:bg-white/20 disabled:opacity-50"
                  >
                    {knockingId === f.id
                      ? "🚪 knocking…"
                      : f.visitAccess === "invite"
                      ? "🚪 Knock"
                      : "🚪 Visit"}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
