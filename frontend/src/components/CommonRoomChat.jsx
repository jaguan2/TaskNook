import { useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronDown,
  MessageCircle,
  Send,
  Users,
} from "lucide-react";
import { botReply, replyDelayMs } from "../lib/chat";
import {
  COMMON_CHAT_MAX_LENGTH,
  appendCommonChatMessage,
  commonChatPresence,
  commonChatResponder,
  commonChatWelcome,
} from "../lib/commonChat";
import { levelFor } from "../lib/friendship";
import { isTypingTarget } from "../lib/typing";
import CommonRoomChatMessages from "./CommonRoomChatMessages";
import CommonRoomRoster from "./CommonRoomRoster";

const initial = (user, roomName) => [{
  id: "welcome",
  kind: "system",
  body: commonChatWelcome(user?.displayName || user?.username, roomName),
}];

const isControlTarget = (target) => {
  if (isTypingTarget(target)) return true;
  return target instanceof Element
    && Boolean(target.closest("button, a, [role='button'], [role='link']"));
};

export default function CommonRoomChat({ session, roomName, user, friendship = {}, disabled = false }) {
  const [open, setOpen] = useState(false);
  const [rosterOpen, setRosterOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [selfMuted, setSelfMuted] = useState(false);
  const [deafened, setDeafened] = useState(false);
  const [mutedPeople, setMutedPeople] = useState(() => new Set());
  const [messages, setMessages] = useState(() => initial(user, roomName));
  const [pending, setPending] = useState([]);
  const inputRef = useRef(null);
  const scrollerRef = useRef(null);
  const sequence = useRef(0);
  const timers = useRef(new Set());
  const occupantsRef = useRef(session.occupants);
  const mutedRef = useRef(mutedPeople);
  const deafenedRef = useRef(deafened);
  const initialChange = session.change
    ? `${session.change.type}:${session.change.person?.username}:${session.nextChangeAt || ""}`
    : null;
  const seenChange = useRef(initialChange);

  useEffect(() => { occupantsRef.current = session.occupants; }, [session.occupants]);
  useEffect(() => { mutedRef.current = mutedPeople; }, [mutedPeople]);
  useEffect(() => { deafenedRef.current = deafened; }, [deafened]);
  useEffect(() => () => {
    timers.current.forEach(clearTimeout);
    timers.current.clear();
  }, []);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!disabled) return;
    setOpen(false);
    setRosterOpen(false);
  }, [disabled]);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (disabled) return;
      if (event.key === "Escape" && open) {
        event.preventDefault();
        event.stopPropagation();
        setRosterOpen(false);
        setOpen(false);
        return;
      }
      if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey) return;
      if (event.key !== "Enter" && event.key !== "/") return;
      if (isControlTarget(event.target)) return;
      event.preventDefault();
      setOpen(true);
      setRosterOpen(false);
    };
    // Document capture runs before App's window-bubble Escape handler. This
    // lets an expanded chat close itself without leaking child state into App
    // or turning the second Escape's "go home" behavior into a DOM query.
    document.addEventListener("keydown", onKeyDown, true);
    return () => document.removeEventListener("keydown", onKeyDown, true);
  }, [disabled, open]);

  const changeKey = session.change
    ? `${session.change.type}:${session.change.person?.username}:${session.nextChangeAt || ""}`
    : null;
  useEffect(() => {
    if (!changeKey || seenChange.current === changeKey) return;
    seenChange.current = changeKey;
    if (deafened) return;
    const body = commonChatPresence(session.change);
    if (!body) return;
    const message = { id: `presence-${changeKey}`, kind: "system", body };
    setMessages((current) => appendCommonChatMessage(current, message));
  }, [changeKey, deafened, session.change]);

  const visibleMessages = useMemo(
    () => messages.filter((message) =>
      message.kind !== "npc" || !mutedPeople.has(message.username)
    ),
    [messages, mutedPeople]
  );

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (scroller) scroller.scrollTop = scroller.scrollHeight;
  }, [visibleMessages, pending, open]);

  const togglePerson = (username) => {
    setMutedPeople((current) => {
      const next = new Set(current);
      if (next.has(username)) next.delete(username);
      else next.add(username);
      return next;
    });
  };

  const send = () => {
    const body = draft.trim();
    if (!body || selfMuted) return;
    const sentAt = Date.now();
    const id = ++sequence.current;
    setMessages((current) => appendCommonChatMessage(current, {
      id: `you-${id}`,
      kind: "user",
      username: user?.username || "you",
      label: user?.displayName || "You",
      body,
    }));
    setDraft("");

    if (deafenedRef.current) return;
    const responder = commonChatResponder(
      occupantsRef.current,
      body,
      sentAt,
      id,
      mutedRef.current
    );
    if (!responder) return;
    const pendingId = `reply-${id}`;
    setPending((current) => [...current, { id: pendingId, label: responder.label }]);
    const timeout = setTimeout(() => {
      timers.current.delete(timeout);
      setPending((current) => current.filter((item) => item.id !== pendingId));
      const stillPresent = occupantsRef.current.some(
        (person) => person.username === responder.username
      );
      if (!stillPresent || deafenedRef.current || mutedRef.current.has(responder.username)) return;
      const bond = levelFor(friendship[responder.username] || 0).level;
      setMessages((current) => appendCommonChatMessage(current, {
        id: pendingId,
        kind: "npc",
        username: responder.username,
        label: responder.label,
        body: botReply(responder.username, body, Date.now(), id, bond),
      }));
    }, replyDelayMs(responder.username, sentAt, id));
    timers.current.add(timeout);
  };

  const recent = open ? visibleMessages : visibleMessages.slice(-3);

  return (
    <section
      data-common-room-chat
      data-common-chat-open={open ? "true" : "false"}
      aria-label="Common room chat"
      className="absolute bottom-20 left-6 z-30 w-[min(22rem,calc(100vw-3rem))] sm:left-24"
    >
      <div className="glass overflow-hidden rounded-2xl border border-white/10 shadow-soft backdrop-blur-xl">
        <button
          type="button"
          onClick={() => {
            setOpen((current) => !current);
            setRosterOpen(false);
          }}
          aria-expanded={open}
          className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-semibold text-cream transition hover:bg-white/10"
        >
          <MessageCircle size={14} className="text-glow" />
          <span className="flex-1">Room chat</span>
          {!open && <span className="font-normal text-petal/50">Enter or /</span>}
          <ChevronDown size={14} className={`transition ${open ? "rotate-180" : ""}`} />
        </button>

        <CommonRoomChatMessages
          open={open}
          deafened={deafened}
          messages={recent}
          pending={pending}
          scrollerRef={scrollerRef}
        />

        {open && (
          <>
            <div className="flex items-center gap-1.5 border-t border-white/5 px-2 py-1.5">
              <button
                type="button"
                onClick={() => setRosterOpen((current) => !current)}
                aria-expanded={rosterOpen}
                aria-controls="common-room-participants"
                className="pill flex items-center gap-1.5 px-2 py-1 text-[10px] font-semibold text-petal transition hover:bg-white/10 hover:text-cream"
              >
                <Users size={12} /> {session.occupants.length + 1} here
                <span className="text-petal/40">Tab</span>
              </button>
              <span className="ml-auto text-[10px] text-petal/40">
                Esc closes
              </span>
            </div>

            {rosterOpen && (
              <CommonRoomRoster
                session={session}
                user={user}
                selfMuted={selfMuted}
                deafened={deafened}
                mutedPeople={mutedPeople}
                onToggleSelf={() => setSelfMuted((current) => !current)}
                onToggleDeafened={() => setDeafened((current) => !current)}
                onTogglePerson={togglePerson}
              />
            )}

            <form
              className="flex gap-1.5 border-t border-white/5 p-2"
              onSubmit={(event) => {
                event.preventDefault();
                send();
              }}
            >
              <input
                ref={inputRef}
                type="text"
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Tab") {
                    event.preventDefault();
                    setRosterOpen((current) => !current);
                  } else if (event.key === "Escape") {
                    event.preventDefault();
                    event.stopPropagation();
                    setRosterOpen(false);
                    setOpen(false);
                  }
                }}
                disabled={selfMuted}
                maxLength={COMMON_CHAT_MAX_LENGTH}
                aria-label="Message the room"
                placeholder={selfMuted ? "Unmute yourself to chat" : "Message the room…"}
                className="min-w-0 flex-1 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs text-cream placeholder:text-petal/40 focus:border-glow/50 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={selfMuted || !draft.trim()}
                aria-label="Send room message"
                className="pill grid h-8 w-8 place-items-center bg-white/10 text-petal transition hover:bg-white/20 disabled:opacity-35"
              >
                <Send size={13} />
              </button>
            </form>
          </>
        )}
      </div>
    </section>
  );
}

