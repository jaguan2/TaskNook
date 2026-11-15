import { Heart } from 'lucide-react';
import { useI18n } from '../i18n/I18nProvider';
import { FRIENDSHIP_LEVELS, levelFor } from '../lib/friendship';

/** Five milestones span the card. The next segment fills within its own level;
 * the numeric pair explains that local progress, including after a level-up. */
export default function FriendshipMeter({ username, name, points = 0, details = false }) {
  const { t, formatNumber } = useI18n();
  const bond = levelFor(points, username);
  const label = t(`friends.bond.level.${bond.level}`);
  const levelText = t('friends.bond.current', { level: formatNumber(bond.level), label });
  const nextText = bond.next === null ? t('friends.bond.max') : t('friends.bond.next', {
    points: formatNumber(bond.next), label: t(`friends.bond.level.${bond.nextLevel}`),
  });
  return <div data-friendship-meter={username}>
    <div className="mb-1.5 flex items-center justify-between gap-2 text-[10px] text-petal/75">
      <span className="flex min-w-0 items-center gap-1.5">
        <Heart size={11} className="shrink-0 text-rose" fill="currentColor" aria-hidden />
        <span>{levelText}</span>
      </span>
      <span className="shrink-0 tabular-nums">{bond.next === null ? t('friends.bond.maxShort')
        : t('friends.bond.progress', { earned: formatNumber(bond.earned), required: formatNumber(bond.required) })}</span>
    </div>
    <div role="progressbar" aria-label={t('friends.bond.aria', { name })}
      aria-valuemin={0} aria-valuemax={FRIENDSHIP_LEVELS.length}
      aria-valuenow={Math.min(FRIENDSHIP_LEVELS.length, Number((bond.level + (bond.next === null ? 0 : bond.progress)).toFixed(2)))}
      aria-valuetext={`${levelText}. ${nextText}`} title={nextText}
      className="flex w-full gap-1" data-friendship-level={bond.level}>
      {FRIENDSHIP_LEVELS.map(({ level }) => {
        const fill = level <= bond.level ? 1 : level === bond.level + 1 ? bond.progress : 0;
        return <span key={level} className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-white/10" aria-hidden="true">
          <span data-friendship-segment={level} className="block h-full rounded-full bg-gradient-to-r from-rose to-blush transition-[width] duration-500 motion-reduce:transition-none"
            style={{ width: `${fill * 100}%` }} />
        </span>;
      })}
    </div>
    {details && <div className="mt-2 space-y-2 text-xs leading-relaxed text-petal/70">
      <p>{nextText}</p>
      <p>{t(`friends.bond.growth.${bond.growth}`)}</p>
      <p className="text-[11px] text-petal/50">{t('friends.bond.hint')}</p>
    </div>}
  </div>;
}
