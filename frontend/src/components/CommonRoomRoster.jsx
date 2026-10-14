import { Mic, MicOff, Volume2, VolumeX } from "lucide-react";

export default function CommonRoomRoster({
  session,
  user,
  selfMuted,
  deafened,
  mutedPeople,
  onToggleSelf,
  onToggleDeafened,
  onTogglePerson,
}) {
  return (
    <div id="common-room-participants" className="border-t border-white/5 bg-night/25 px-2 py-2">
      <p className="px-1 pb-1.5 text-[10px] font-semibold uppercase tracking-wide text-petal/45">
        In this room
      </p>
      <div className="space-y-1">
        <div className="flex items-center gap-2 rounded-xl bg-white/5 px-2 py-1.5">
          <span className="grid h-6 w-6 place-items-center rounded-full bg-glow/20 text-[10px] font-bold text-glow">Y</span>
          <span className="min-w-0 flex-1 truncate text-xs font-semibold text-cream">
            {user?.displayName || "You"} <span className="font-normal text-petal/45">(you)</span>
          </span>
          <button
            type="button"
            onClick={onToggleSelf}
            aria-pressed={selfMuted}
            className={`pill grid h-7 w-7 place-items-center ${selfMuted ? "bg-danger/20 text-danger" : "text-petal hover:bg-white/10"}`}
            title={selfMuted ? "Unmute yourself" : "Mute yourself"}
            aria-label={selfMuted ? "Unmute yourself" : "Mute yourself"}
          >
            {selfMuted ? <MicOff size={13} /> : <Mic size={13} />}
          </button>
          <button
            type="button"
            onClick={onToggleDeafened}
            aria-pressed={deafened}
            className={`pill grid h-7 w-7 place-items-center ${deafened ? "bg-danger/20 text-danger" : "text-petal hover:bg-white/10"}`}
            title={deafened ? "Resume incoming room chat" : "Deafen room chat"}
            aria-label={deafened ? "Resume incoming room chat" : "Deafen room chat"}
          >
            {deafened ? <VolumeX size={13} /> : <Volume2 size={13} />}
          </button>
        </div>
        {session.occupants.map((person) => {
          const muted = mutedPeople.has(person.username);
          return (
            <div key={person.username} className="flex items-center gap-2 rounded-xl px-2 py-1.5 hover:bg-white/5">
              <span className="grid h-6 w-6 place-items-center rounded-full bg-white/10 text-[10px] font-bold text-petal">
                {person.label?.slice(0, 1).toUpperCase()}
              </span>
              <span className="min-w-0 flex-1 truncate text-xs font-semibold text-cream">{person.label}</span>
              <button
                type="button"
                onClick={() => onTogglePerson(person.username)}
                aria-pressed={muted}
                className={`pill flex items-center gap-1 px-2 py-1 text-[10px] font-semibold ${muted ? "bg-danger/15 text-danger" : "text-petal hover:bg-white/10"}`}
                aria-label={`${muted ? "Unmute" : "Mute"} ${person.label}`}
              >
                {muted ? <VolumeX size={11} /> : <Volume2 size={11} />}
                {muted ? "Muted" : "Mute"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

