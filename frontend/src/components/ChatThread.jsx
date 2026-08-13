import { useEffect, useMemo, useRef, useState } from "react";
import { useStore } from "../store";
import { api } from "../lib/api";
import { useArmed } from "../lib/useArmed";
import { MESSAGE_MAX, chatTitle, whenLabel } from "../lib/chat";
import { npcActivity } from "../lib/visiting";

// What a friend is doing, shown under their name in the thread header — the
// same line the Friends list gives them, so the two never disagree about the
// person you're looking at.
const ACTIVITY_LINE = {
  focus: (m) => `📖 focusing — ${m}m left`,
  break: () => "☕ on a break",
  idle: () => "🪴 pottering about",
};

/**
 * One open conversation.
 *
 * Messages are LOCAL state, not the store's: only this view reads them, they
 * change on a timer that belongs to the store's reply scheduler, and putting
 * them in the context would re-render every consumer for a line nobody else
 * can see. The store hands them back through the `onMessages` callback it
 * already calls after each write.
 */
export default function ChatThread({ chat, onBack }) {
  const { user, sendChatMessage, markChatRead, deleteChat } = useStore();
  const [messages, setMessages] = useState(null);
  const [draft, setDraft] = useState("");
  const [now, setNow] = useState(() => Date.now());
  const [armedId, arm] = useArmed();
  const scroller = useRef(null);
  const inputRef = useRef(null);

  const others = useMemo(
    () => (chat.members || []).filter((m) => m.id !== user?.id),
    [chat.members, user?.id]
  );
  const byId = useMemo(
    () => Object.fromEntries((chat.members || []).map((m) => [m.id, m])),
    [chat.members]
  );

  // Stamps are relative ("12m"), so they have to be re-derived or a thread left
  // open all afternoon keeps insisting every message arrived "now".
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    let live = true;
    api
      .chatMessages(chat.id)
      .then((rows) => live && setMessages(rows))
      .catch(() => live && setMessages([]));
    markChatRead(chat.id);
    return () => {
      live = false;
    };
  }, [chat.id, markChatRead]);

  // Stick to the bottom as lines arrive — a chat that opens at the top is a
  // transcript, not a conversation.
  useEffect(() => {
    const el = scroller.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  const send = (e) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text) return;
    setDraft("");
    inputRef.current?.focus();
    sendChatMessage(chat, text, setMessages);
  };

  const title = chatTitle(chat, user?.id);
  const solo = !chat.isGroup && others.length === 1 ? others[0] : null;
  const activity = solo ? npcActivity(solo.username, now) : null;

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <div className="flex items-center gap-2">
        <button
          onClick={onBack}
          title="Back to friends"
          aria-label="Back to friends"
          className="pill grid h-8 w-8 shrink-0 place-items-center text-cream transition hover:bg-white/10"
        >
          ‹
        </button>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-cream">
            {chat.isGroup ? "👥 " : solo ? `${solo.avatar} ` : ""}
            {title}
          </p>
          <p className="truncate text-[11px] text-petal/60">
            {activity
              ? ACTIVITY_LINE[activity.state](activity.minutesLeft)
              : others.map((m) => m.displayName).join(", ")}
          </p>
        </div>
        <button
          onClick={() => arm(chat.id, () => deleteChat(chat.id).then(onBack))}
          title="Delete this chat"
          aria-label={armedId === chat.id ? "Tap again to delete this chat" : "Delete this chat"}
          className={`shrink-0 transition ${
            armedId === chat.id
              ? "confirming text-[10px] font-bold text-danger"
              : "text-sm text-petal/40 hover:text-danger"
          }`}
        >
          {armedId === chat.id ? "sure?" : "✕"}
        </button>
      </div>

      <div
        ref={scroller}
        className="cozy-scroll min-h-0 flex-1 overflow-y-auto rounded-2xl bg-white/5 p-3"
      >
        {/* min-h-full + justify-end keeps a short conversation sitting on the
            composer instead of stranded at the top of an empty column, while a
            long one still grows and scrolls normally. */}
        <div className="flex min-h-full flex-col justify-end space-y-2">
        {messages === null && (
          <p className="py-6 text-center text-xs text-petal/50">one moment…</p>
        )}
        {messages?.length === 0 && (
          <p className="py-6 text-center text-xs text-petal/60">
            Say hello 👋 {solo ? solo.displayName : "everyone"} will answer when
            they&apos;re free.
          </p>
        )}
        {messages?.map((m) => {
          const mine = m.senderId === user?.id;
          const who = byId[m.senderId];
          return (
            <div
              key={m.id}
              className={`flex flex-col ${mine ? "items-end" : "items-start"}`}
            >
              {/* Only a group needs to say who is talking — in a one-to-one
                  there are two people and the sides already say it. */}
              {!mine && chat.isGroup && (
                <span className="px-1 text-[10px] font-semibold text-petal/60">
                  {who?.avatar} {who?.displayName}
                </span>
              )}
              <div
                className={`max-w-[85%] whitespace-pre-wrap break-words rounded-2xl px-3 py-1.5 text-sm ${
                  mine ? "bg-glow text-plum" : "bg-white/10 text-cream"
                }`}
              >
                {m.body}
              </div>
              <span className="px-1 pt-0.5 text-[10px] text-petal/40">
                {whenLabel(m.createdAt, now)}
              </span>
            </div>
          );
        })}
        </div>
      </div>

      <form onSubmit={send} className="flex shrink-0 gap-2">
        <input
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          maxLength={MESSAGE_MAX}
          placeholder="say something…"
          aria-label="Message"
          className="min-w-0 flex-1 rounded-xl bg-white/10 px-3 py-2 text-sm text-cream placeholder:text-petal/50 outline-none focus:ring-2 focus:ring-glow/50"
        />
        <button
          disabled={!draft.trim()}
          title="Send"
          aria-label="Send"
          className="pill bg-glow px-4 py-2 text-sm font-semibold text-plum hover:bg-amber disabled:opacity-40"
        >
          ↑
        </button>
      </form>
    </div>
  );
}
