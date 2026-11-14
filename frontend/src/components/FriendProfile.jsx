import { X } from 'lucide-react';
import { useI18n } from '../i18n/I18nProvider';
import { npcProfile } from '../lib/npcProfiles';
import { npcWeeklyFocusMinutes } from '../lib/leaderboard';
import { parseBirthDate } from '../lib/profile';

/** Inline character details reuse the row's daily stats and weekly board's
 * simulation. Opening a profile never starts a visit or writes account data. */
export default function FriendProfile({ id, friend, stats, now, onClose }) {
  const { t, formatDate, formatDuration } = useI18n();
  const profile = npcProfile(friend.username);
  const dateLabel = value => {
    const { year, month, day } = parseBirthDate(value);
    return formatDate(new Date(year, month - 1, day), { year: 'numeric', month: 'long', day: 'numeric' });
  };
  const facts = [
    [t('friends.profile.birthday'), dateLabel(profile.birthDate)],
    [t('friends.profile.gender'), t(`friends.profile.gender.${profile.gender}`)],
    [t('friends.profile.pronouns'), profile.pronouns],
    [t('friends.profile.joined'), dateLabel(profile.joinedDate)],
  ];
  return <section id={id} aria-label={t('friends.profile.title', { name: friend.displayName })}
    className="mt-3 border-t border-white/10 pt-3" data-friend-profile={friend.username}>
    <div className="flex items-center justify-between gap-2">
      <h3 className="text-xs font-semibold text-cream">{t('friends.profile.title', { name: friend.displayName })}</h3>
      <button type="button" onClick={onClose} aria-label={t('friends.profile.close', { name: friend.displayName })}
        className="pill grid h-9 w-9 shrink-0 place-items-center text-petal/70 hover:bg-white/10 hover:text-cream">
        <X aria-hidden size={14} />
      </button>
    </div>
    <p className="text-[11px] text-petal/60">{t('friends.profile.neighbour')} · @{friend.username}</p>
    <p className="mt-2 text-xs leading-relaxed text-petal/80">{t(`friends.profile.interest.${profile.interest}`)}</p>
    <dl className="mt-3 space-y-2 text-xs">
      {facts.map(([name, value]) => <div key={name} className="flex justify-between gap-3">
        <dt className="shrink-0 text-petal/60">{name}</dt><dd className="min-w-0 break-words text-right text-cream">{value}</dd>
      </div>)}
    </dl>
    <dl className="mt-4 grid grid-cols-2 gap-2 rounded-xl bg-night/25 p-3">
      {[[t('friends.profile.today'), stats.focusMinutes],
        [t('friends.profile.week'), npcWeeklyFocusMinutes(friend.username, now)]].map(([name, minutes]) => <div key={name}>
        <dt className="text-[10px] text-petal/60">{name}</dt>
        <dd className="mt-1 text-sm font-semibold tabular-nums text-glow">{formatDuration(minutes, { short: true })}</dd>
      </div>)}
    </dl>
  </section>;
}
