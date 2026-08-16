import { useEffect, useMemo, useState } from "react";
import { Heart } from "lucide-react";
import { useStore } from "../store";
import { api } from "../lib/api";
import { useArmed } from "../lib/useArmed";
import { VISIT_ACCESS, npcActivity, npcDailyStats } from "../lib/visiting";
import { levelFor } from "../lib/friendship";
import { chatTitle, whenLabel } from "../lib/chat";
import ChatThread from "./ChatThread";

const doorHint = (key) => VISIT_ACCESS.find((v) => v.key === key)?.hint;

// The presence line: what a friend is doing RIGHT NOW, beside their door.
// Same honest theater as the rest of visiting — npcActivity derives it from
// the clock, deterministically, so it holds still while you look at it.
const ACTIVITY_LINE = {
  focus: (m) => `📖 focusing — ${m}m left`,
  break: () => "☕ on a break",
  idle: () => "🪴 pottering about",
};

export default function FriendsPanel() {
  // The knock timer lives in the STORE, not here — this drawer closes for
  // all sorts of reasons mid-wait, and a knock that died with it broke
  // "the bots always answer". Scheduled chat replies live there for exactly
  // the same reason.
  const {
    user,
    friends,
    refreshAll,
    visitFriend,
    knockFriend,
    knockingId,
    chats,
    openChatWith,
    openGroupChat,
    friendship,
  } = useStore();
  const [username, setUsername] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [armedId, arm] = useArmed();
  // Which thread is open, by id — held as an ID rather than the object so the
  // header and unread badge track the store's fresh copy after each message.
  const [openChatId, setOpenChatId] = useState(null);
  const [picking, setPicking] = useState(null); // group members being chosen
  const [groupName, setGroupName] = useState("");
  // The statuses move with the clock, so the open panel re-derives them every
  // half-minute — a focus block counting down that never counted would give
  // the simulation away.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(id);
  }, []);

  const openChat = useMemo(
    () => chats.find((c) => c.id === openChatId) || null,
    [chats, openChatId]
  );
  const groupChats = useMemo(() => chats.filter((c) => c.isGroup), [chats]);
  // Unread lives on the thread, but it's the FRIEND row you look at first.
  const unreadByFriend = useMemo(() => {
    const map = {};
    for (const c of chats) {
      if (c.isGroup || !c.unread) continue;
      for (const m of c.members) if (m.id !== user?.id) map[m.id] = c.unread;
    }
    return map;
  }, [chats, user?.id]);

  const visit = (f) => {
    if (f.visitAccess === "private" || knockingId) return;
    if (f.visitAccess === "invite") knockFriend(f);
    else visitFriend(f);
  };

  const chatWith = async (f) => {
    const chat = await openChatWith(f);
    if (chat) setOpenChatId(chat.id);
  };

  const startGroup = async () => {
    if (picking.length < 2) return;
    const chat = await openGroupChat(picking, groupName);
    setPicking(null);
    setGroupName("");
    if (chat) setOpenChatId(chat.id);
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

  // An open thread REPLACES the list rather than stacking below it: the drawer
  // is one column wide and a conversation wants all of it.
  if (openChat) {
    return (
      <div className="h-[70vh]">
        <ChatThread chat={openChat} onBack={() => setOpenChatId(null)} />
      </div>
    );
  }

  // Choosing who's in a new group — a step, not a dialog (VC2: panels do
  // their own flow rather than opening something on top).
  if (picking) {
    const toggle = (id) =>
      setPicking((prev) =>
        prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
      );
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setPicking(null);
              setGroupName("");
            }}
            title="Back to friends"
            aria-label="Back to friends"
            className="pill grid h-8 w-8 place-items-center text-cream transition hover:bg-white/10"
          >
            ‹
          </button>
          <p className="text-sm font-semibold text-cream">New group chat</p>
        </div>
        <input
          value={groupName}
          onChange={(e) => setGroupName(e.target.value)}
          maxLength={60}
          placeholder="group name (optional)"
          aria-label="Group name"
          className="w-full rounded-xl bg-white/10 px-3 py-2 text-sm text-cream placeholder:text-petal/50 outline-none focus:ring-2 focus:ring-glow/50"
        />
        <div className="space-y-1.5">
          {friends.map((f) => {
            const chosen = picking.includes(f.id);
            return (
              <button
                key={f.id}
                onClick={() => toggle(f.id)}
                aria-pressed={chosen}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition ${
                  chosen ? "bg-glow/20" : "bg-white/5 hover:bg-white/10"
                }`}
              >
                <span className="grid h-8 w-8 place-items-center rounded-full bg-wine text-base">
                  {f.avatar}
                </span>
                <span className="min-w-0 flex-1 truncate text-sm text-cream">
                  {f.displayName}
                </span>
                <span className={`text-xs ${chosen ? "text-glow" : "text-petal/40"}`}>
                  {chosen ? "✓" : ""}
                </span>
              </button>
            );
          })}
        </div>
        <button
          onClick={startGroup}
          disabled={picking.length < 2}
          className="pill w-full bg-glow py-2 text-sm font-semibold text-plum hover:bg-amber disabled:opacity-40"
        >
          {picking.length < 2
            ? "Pick at least two friends"
            : `Start with ${picking.length} friends`}
        </button>
      </div>
    );
  }

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

      {/* Group chats, above the roster: they have no other home, whereas a
          one-to-one is always one tap from the friend's own row. */}
      {friends.length > 1 && (
        <section className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-petal/60">
              Group chats
            </p>
            <button
              onClick={() => setPicking([])}
              className="pill bg-white/10 px-2.5 py-1 text-xs font-semibold text-cream hover:bg-white/20"
            >
              ＋ New
            </button>
          </div>
          {groupChats.length === 0 ? (
            <p className="rounded-xl bg-white/5 px-3 py-3 text-xs text-petal/60">
              Get everyone in one room — study together, or just natter.
            </p>
          ) : (
            groupChats.map((c) => (
              <button
                key={c.id}
                onClick={() => setOpenChatId(c.id)}
                className="flex w-full items-center gap-2 rounded-xl bg-white/5 px-3 py-2 text-left transition hover:bg-white/10"
              >
                <span className="text-base">👥</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm text-cream">
                    {chatTitle(c, user?.id)}
                  </span>
                  {c.lastMessage && (
                    <span className="block truncate text-[11px] text-petal/50">
                      {c.lastMessage.body}
                    </span>
                  )}
                </span>
                {c.lastMessage && (
                  <span className="shrink-0 text-[10px] text-petal/40">
                    {whenLabel(c.lastMessage.createdAt, Date.now())}
                  </span>
                )}
                {c.unread > 0 && (
                  <span className="grid h-5 min-w-[1.25rem] shrink-0 place-items-center rounded-full bg-glow px-1 text-[10px] font-bold text-plum">
                    {c.unread}
                  </span>
                )}
              </button>
            ))
          )}
        </section>
      )}

      <div className="space-y-2">
        {friends.length === 0 && (
          <p className="rounded-xl bg-white/5 px-3 py-6 text-center text-sm text-petal/60">
            No cottage neighbours yet. Add a friend to cheer each other on! 🫶
          </p>
        )}
        {friends.map((f) => {
          // The DISPLAYED day is simulated (lib/visiting.js), not the seeded
          // rows: the API's numbers never change, so every bot showed
          // "0m focused" forever beside a presence line claiming they were
          // mid-block. npcDailyStats rolls a fresh list per local day and
          // ticks the minutes up through it, on the same 30s clock as the
          // presence line — one simulation, one story.
          const sim = npcDailyStats(f.username, now);
          const hours = Math.floor(sim.focusMinutes / 60);
          const mins = sim.focusMinutes % 60;
          const completion = sim.tasksTotal
            ? Math.round((sim.tasksDone / sim.tasksTotal) * 100)
            : 0;
          const bond = levelFor(friendship[f.username] || 0);
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
                    {hours > 0 ? `${hours}h ` : ""}{mins}m focused · {sim.tasksDone}/{sim.tasksTotal} tasks
                  </p>
                </div>
              </div>
              <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-sage to-glow transition-all duration-700"
                  style={{ width: `${completion}%` }}
                />
              </div>
              {/* The friendship bar: one bar that fills over the whole
                  friendship, not per level — level colour lives in the label.
                  Rose DECORATES here (the meaning is the width + label, which
                  survive any theme's re-tint of rose). */}
              <div
                className="mt-1.5 flex items-center gap-2"
                title={`Friendship grows as you chat, visit and spend time together${
                  bond.next ? ` — ${bond.next} to the next level` : " — as close as it gets"
                }`}
              >
                <Heart size={10} className="shrink-0 text-rose" fill="currentColor" />
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-rose to-blush transition-all duration-700"
                    style={{ width: `${Math.round(bond.frac * 100)}%` }}
                  />
                </div>
                <span className="shrink-0 text-[10px] text-petal/50">{bond.label}</span>
              </div>
              {/* Two ways to reach them on the left, what they're doing on the
                  right. The ACTIONS are their own group: as three children of
                  one `justify-between` row, the door button floated in the
                  middle and landed at a different x on every card, because its
                  position was set by the length of the presence text beside it
                  ("pottering about" vs "focusing — 6m left"). Chat and the door
                  are a pair and now sit as one. */}
              <div className="mt-2 flex items-center justify-between gap-2">
                <div className="flex shrink-0 items-center gap-1.5">
                <button
                  onClick={() => chatWith(f)}
                  title={`Message ${f.displayName}`}
                  className="pill inline-flex shrink-0 items-center gap-1 bg-white/10 px-3 py-1 text-xs font-semibold text-cream transition hover:bg-white/20"
                >
                  💬 Chat
                  {unreadByFriend[f.id] > 0 && (
                    <span className="grid h-4 min-w-[1rem] place-items-center rounded-full bg-glow px-1 text-[10px] font-bold text-plum">
                      {unreadByFriend[f.id]}
                    </span>
                  )}
                </button>
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
                {(() => {
                  const a = npcActivity(f.username, now);
                  return (
                    <span className="shrink-0 text-right text-[11px] text-petal/60">
                      {ACTIVITY_LINE[a.state](a.minutesLeft)}
                    </span>
                  );
                })()}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
