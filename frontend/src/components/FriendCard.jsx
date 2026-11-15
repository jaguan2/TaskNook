import { useI18n } from '../i18n/I18nProvider';
import { VISIT_ACCESS, npcActivity, npcDailyStats } from '../lib/visiting';
import FriendshipMeter from './FriendshipMeter';

const ACTIVITY_LINE = {
  focus: m => `📖 focusing — ${m}m left`, break: () => '☕ on a break', idle: () => '🪴 pottering about',
};
const ACTIVITY_DOT = { focus: 'bg-glow', break: 'bg-sage', idle: 'bg-petal/40' };
const doorHint = key => VISIT_ACCESS.find(v => v.key === key)?.hint;

/** One native stretched profile button covers the card. Action buttons are
 * siblings above it, so Chat/Visit/Remove cannot also open a profile. Passive
 * content passes pointer events through; it stays available to screen readers. */
export default function FriendCard({ friend, now, points, profileId, onProfile, onRemove,
  onChat, onVisit, armed, chatBusy, knockingId, unread, chatVisibility }) {
  const { t } = useI18n();
  const sim = npcDailyStats(friend.username, now);
  const hours = Math.floor(sim.focusMinutes / 60), minutes = sim.focusMinutes % 60;
  const completion = sim.tasksTotal ? Math.round(sim.tasksDone / sim.tasksTotal * 100) : 0;
  const activity = npcActivity(friend.username, now), line = ACTIVITY_LINE[activity.state](activity.minutesLeft);
  return <div data-friend-card={friend.username} className="group relative isolate rounded-2xl bg-white/5 px-3 py-2.5 transition hover:bg-white/10">
    <button type="button" aria-haspopup="dialog" aria-expanded={!!profileId} aria-controls={profileId || undefined}
      aria-label={t('friends.profile.open', { name: friend.displayName })} onClick={onProfile}
      className="absolute inset-0 z-0 rounded-2xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-glow" />
    <div className="pointer-events-none relative space-y-2">
      <div className="flex min-h-11 items-center gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-wine text-lg" aria-hidden>{friend.avatar}</span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-cream">{friend.displayName}</p>
          <p className="text-xs text-petal/60">{hours > 0 ? `${hours}h ` : ''}{minutes}m focused · {sim.tasksDone}/{sim.tasksTotal} tasks</p>
        </div>
        <button type="button" onClick={onRemove} title="Remove friend" aria-label="Remove friend"
          className={`hover-reveal pointer-events-auto relative z-10 shrink-0 transition ${armed
            ? 'confirming text-[10px] font-bold text-danger' : 'text-sm text-petal/40 hover:text-danger'}`}>
          {armed ? 'sure?' : '✕'}
        </button>
      </div>
      <div className="h-1 w-full overflow-hidden rounded-full bg-white/10" title={`${completion}% tasks complete`}>
        <div className="h-full rounded-full bg-gradient-to-r from-sage to-glow transition-[width] duration-700 motion-reduce:transition-none" style={{ width: `${completion}%` }} />
      </div>
      <FriendshipMeter username={friend.username} name={friend.displayName} points={points} />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex shrink-0 items-center gap-1.5">
          <button type="button" onClick={onChat} disabled={chatBusy} title={`Message ${friend.displayName}`}
            className="pill pointer-events-auto relative z-10 inline-flex shrink-0 items-center gap-1 bg-white/10 px-3 py-1 text-xs font-semibold text-cream transition hover:bg-white/20 disabled:opacity-50">
            💬 Chat
            {unread > 0 && chatVisibility !== 'hidden' && <span className={`grid h-4 min-w-[1rem] place-items-center rounded-full bg-glow px-1 text-[10px] font-bold text-plum ${chatVisibility === 'faded' ? 'opacity-40' : ''}`}>{unread}</span>}
          </button>
          {friend.visitAccess === 'private' ? <span title={doorHint('private')}
            className="pill inline-flex cursor-default items-center gap-1 bg-white/5 px-3 py-1 text-xs font-semibold text-petal/40">🔒 private</span>
            : <button type="button" onClick={onVisit} disabled={knockingId !== null} title={doorHint(friend.visitAccess)}
              className="pill pointer-events-auto relative z-10 inline-flex items-center gap-1 bg-white/10 px-3 py-1 text-xs font-semibold text-cream transition hover:bg-white/20 disabled:opacity-50">
              {knockingId === friend.id ? '🚪 knocking…' : friend.visitAccess === 'invite' ? '🚪 Knock' : '🚪 Visit'}
            </button>}
        </div>
        <span className="flex min-w-0 items-center gap-1.5 text-right text-[11px] text-petal/60" title={line}>
          <span className="hover-reveal truncate">{line}</span>
          <span className={`h-2 w-2 shrink-0 rounded-full ${ACTIVITY_DOT[activity.state]}`} />
        </span>
      </div>
    </div>
  </div>;
}
