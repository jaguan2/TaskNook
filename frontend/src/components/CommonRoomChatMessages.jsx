export default function CommonRoomChatMessages({
  open,
  deafened,
  messages,
  pending,
  scrollerRef,
}) {
  return (
    <div
      ref={scrollerRef}
      role="log"
      aria-live="polite"
      aria-label="Room messages"
      className={`${open ? "max-h-44" : "max-h-20"} cozy-scroll overflow-y-auto border-t border-white/5 bg-night/20 px-3 py-2`}
    >
      {deafened && (
        <p className="mb-1 text-center text-[10px] font-semibold text-petal/50">
          Incoming room chat is paused
        </p>
      )}
      <div className="space-y-1">
        {messages.map((message) => message.kind === "system" ? (
          <p key={message.id} data-message-kind="system" className="text-[11px] italic text-petal/55">
            {message.body}
          </p>
        ) : (
          <p key={message.id} data-message-kind={message.kind} className="break-words text-xs leading-relaxed text-cream/90">
            <span className={`mr-1 font-semibold ${message.kind === "user" ? "text-glow" : "text-petal"}`}>
              {message.label}:
            </span>
            {message.body}
          </p>
        ))}
      </div>
      {pending.length > 0 && !deafened && (
        <p role="status" className="mt-1 text-[10px] text-petal/45">
          {pending.map((item) => item.label).join(" and ")}
          {pending.length === 1 ? " is" : " are"} typing…
        </p>
      )}
    </div>
  );
}

