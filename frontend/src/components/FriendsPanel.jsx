import { useState } from "react";
import { useStore } from "../store";
import { api } from "../lib/api";

export default function FriendsPanel() {
  const { friends, refreshAll } = useStore();
  const [username, setUsername] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

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
      {error && <p className="text-xs text-rose">{error}</p>}

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
                      onClick={() => remove(f.id)}
                      className="text-xs text-petal/40 opacity-0 transition hover:text-rose group-hover:opacity-100"
                    >
                      remove
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
            </div>
          );
        })}
      </div>
    </div>
  );
}
