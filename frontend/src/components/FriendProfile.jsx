import { X } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useI18n } from '../i18n/I18nProvider';
import { npcProfile } from '../lib/npcProfiles';
import { npcWeeklyFocusMinutes } from '../lib/leaderboard';
import { parseBirthDate } from '../lib/profile';
import FriendshipMeter from './FriendshipMeter';

// A backdrop event is retargeted to the native dialog. Its padding also targets
// the dialog, so check the coordinates before treating a click as dismissal.
function onBackdrop(event) {
  if (event.target !== event.currentTarget) return false;
  const bounds = event.currentTarget.getBoundingClientRect();
  return event.clientX < bounds.left || event.clientX > bounds.right
    || event.clientY < bounds.top || event.clientY > bounds.bottom;
}

/** Render outside the HUD so positioning and inherited styles belong to the
 * app window. The native modal owns focus containment/background inertness. */
export default function FriendProfile({ id, friend, stats, now, onClose, friendshipPoints = 0 }) {
  const dialogRef = useRef(null);
  const backdropPress = useRef(false);
  useEffect(() => {
    const dialog = dialogRef.current;
    dialog.showModal();
    return () => dialog.close();
  }, []);
  const close = () => {
    // Remove modal inertness before the parent returns focus to the friend row.
    dialogRef.current.close();
    onClose();
  };
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
  return createPortal(<dialog ref={dialogRef} id={id} aria-modal="true" aria-labelledby={`${id}-title`}
    aria-describedby={`${id}-description`} data-friend-profile={friend.username}
    onCancel={event => { event.preventDefault(); close(); }}
    onKeyDown={event => event.stopPropagation()}
    onPointerDown={event => { backdropPress.current = onBackdrop(event); }}
    onClick={event => {
      const dismiss = backdropPress.current && onBackdrop(event);
      backdropPress.current = false;
      if (dismiss) close();
    }}
    className="glass fixed inset-0 m-auto h-fit max-h-[calc(100dvh-2rem)] w-[min(92vw,440px)] max-w-none overflow-hidden rounded-3xl p-0 text-cream shadow-soft open:flex open:flex-col backdrop:bg-plum/60 backdrop:backdrop-blur-sm">
    <header className="flex shrink-0 items-center gap-3 border-b border-white/10 px-5 py-4">
      <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-wine text-2xl" aria-hidden>{friend.avatar}</span>
      <div className="min-w-0 flex-1">
        <h2 id={`${id}-title`} className="break-words font-display text-lg font-bold text-cream">{t('friends.profile.title', { name: friend.displayName })}</h2>
        <p id={`${id}-description`} className="break-words text-xs text-petal/65">{t('friends.profile.neighbour')} · @{friend.username}</p>
      </div>
      <button type="button" onClick={close} aria-label={t('friends.profile.close', { name: friend.displayName })}
        className="pill grid h-11 w-11 shrink-0 place-items-center text-petal/70 hover:bg-white/10 hover:text-cream focus-visible:outline focus-visible:outline-2 focus-visible:outline-glow">
        <X aria-hidden size={18} />
      </button>
    </header>
    <div className="cozy-scroll min-h-0 overflow-y-auto overscroll-contain p-5">
      <p className="text-sm leading-relaxed text-petal/80">{t(`friends.profile.interest.${profile.interest}`)}</p>
      <dl className="mt-3 space-y-2 text-xs">
        {facts.map(([name, value]) => <div key={name} className="flex justify-between gap-3">
          <dt className="shrink-0 text-petal/60">{name}</dt><dd className="min-w-0 break-words text-right text-cream">{value}</dd>
        </div>)}
      </dl>
      <section className="mt-4 rounded-xl bg-night/25 p-3" aria-label={t('friends.bond.title')}>
        <FriendshipMeter username={friend.username} name={friend.displayName} points={friendshipPoints} details />
      </section>
      <dl className="mt-4 grid grid-cols-2 gap-2 rounded-xl bg-night/25 p-3">
        {[[t('friends.profile.today'), stats.focusMinutes],
          [t('friends.profile.week'), npcWeeklyFocusMinutes(friend.username, now)]].map(([name, minutes]) => <div key={name}>
          <dt className="text-[10px] text-petal/60">{name}</dt>
          <dd className="mt-1 text-sm font-semibold tabular-nums text-glow">{formatDuration(minutes, { short: true })}</dd>
        </div>)}
      </dl>
    </div>
  </dialog>, document.body);
}
