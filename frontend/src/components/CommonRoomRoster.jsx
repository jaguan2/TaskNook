import { Mic, MicOff, Volume2, VolumeX } from "lucide-react";
import { useI18n } from "../i18n/I18nProvider";

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
  const { t } = useI18n();
  return (
    <div id="common-room-participants" className="border-t border-white/5 bg-night/25 px-2 py-2">
      <p className="px-1 pb-1.5 text-[10px] font-semibold uppercase tracking-wide text-petal/45">
        {t("chat.room.roster")}
      </p>
      <div className="space-y-1">
        <div className="flex items-center gap-2 rounded-xl bg-white/5 px-2 py-1.5">
          <span className="grid h-6 w-6 place-items-center rounded-full bg-glow/20 text-[10px] font-bold text-glow">Y</span>
          <span className="min-w-0 flex-1 truncate text-xs font-semibold text-cream">
            {user?.displayName || t("chat.room.you")} <span className="font-normal text-petal/45">({t("chat.room.you")})</span>
          </span>
          <button
            type="button"
            onClick={onToggleSelf}
            aria-pressed={selfMuted}
            className={`pill grid h-7 w-7 place-items-center ${selfMuted ? "bg-danger/20 text-danger" : "text-petal hover:bg-white/10"}`}
            title={selfMuted ? t("chat.room.unmuteSelf") : t("chat.room.muteSelf")}
            aria-label={selfMuted ? t("chat.room.unmuteSelf") : t("chat.room.muteSelf")}
          >
            {selfMuted ? <MicOff size={13} /> : <Mic size={13} />}
          </button>
          <button
            type="button"
            onClick={onToggleDeafened}
            aria-pressed={deafened}
            className={`pill grid h-7 w-7 place-items-center ${deafened ? "bg-danger/20 text-danger" : "text-petal hover:bg-white/10"}`}
            title={deafened ? t("chat.room.resume") : t("chat.room.deafen")}
            aria-label={deafened ? t("chat.room.resume") : t("chat.room.deafen")}
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
                aria-label={t(muted ? "chat.room.unmutePerson" : "chat.room.mutePerson", { name: person.label })}
              >
                {muted ? <VolumeX size={11} /> : <Volume2 size={11} />}
                {muted ? t("chat.room.muted") : t("chat.room.mute")}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

