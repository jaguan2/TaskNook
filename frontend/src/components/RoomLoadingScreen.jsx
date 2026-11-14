import { useI18n } from '../i18n/I18nProvider';

/** Scene-only loading feedback: the timer, music and navigation stay mounted. */
export default function RoomLoadingScreen({ roomName, complete = 0, total = 0, onCancel }) {
  const { t, formatNumber } = useI18n();
  const percent = total ? Math.round(complete / total * 100) : null;
  return <div data-room-loading className="absolute inset-0 z-20 flex items-center justify-center bg-night/90 px-6 text-cream">
    <div className="w-full max-w-xs text-center">
      <p role="status" className="text-lg font-semibold">
        {roomName ? t('room.loading.title', { room: roomName }) : t('room.loading.generic')}
      </p>
      <p className="mt-2 text-sm text-petal/70">{t('room.loading.description')}</p>
      {percent !== null && <>
        <div role="progressbar" aria-label={t('room.loading.progress')} aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent}
          className="mt-5 h-1.5 overflow-hidden rounded-full bg-white/10">
          <div className="h-full rounded-full bg-glow" style={{ width: `${percent}%` }} />
        </div>
        <p className="mt-2 text-xs tabular-nums text-petal/70">{formatNumber(percent / 100, { style: 'percent' })}</p>
      </>}
      {onCancel && <button type="button" onClick={onCancel}
        className="pill mt-6 min-h-11 px-4 py-2 text-sm text-cream hover:bg-white/10">
        {t('visit.returnHome')}
      </button>}
    </div>
  </div>;
}
