import { memo, useEffect, useMemo, useState } from 'react';
import { COMMON_PLACES, commonPropModelOptions, resolveCommonProps } from '../lib/commonRooms';
import { catalogImages, catalogModelRequest } from '../services/catalogModels';
import { useI18n } from '../i18n/I18nProvider';
import CommonRoom from './CommonRoom';
import RoomLoadingScreen from './RoomLoadingScreen';

function progressFor(requests) {
  return { total: requests.length,
    complete: requests.filter(request => catalogImages.snapshot(request).status !== 'loading').length };
}

/** Lease this place's unique images before mounting its large SVG tree. A warm
 * visit opens immediately; errors finish preparation using the normal fallback
 * and Retry models action. Later retries never unmount the occupied scene. */
export default memo(function CommonRoomEntry({ onCancel, ...props }) {
  const scene = COMMON_PLACES[props.session.sceneId];
  const { label } = useI18n();
  const requests = useMemo(() => [...new Map(resolveCommonProps(scene)
    .map(p => catalogModelRequest(commonPropModelOptions(p)))
    .filter(Boolean).map(request => [request.id, request])).values()], [scene]);
  const [progress, setProgress] = useState(() => progressFor(requests));
  const [opened, setOpened] = useState(progress.complete === progress.total);

  useEffect(() => {
    const update = () => {
      const next = progressFor(requests);
      setProgress(previous => previous.complete === next.complete && previous.total === next.total ? previous : next);
    };
    const releases = requests.map(request => catalogImages.subscribe(request, update));
    update();
    return () => releases.forEach(release => release());
  }, [requests]);
  useEffect(() => {
    if (progress.complete === progress.total) setOpened(true);
  }, [progress]);

  return opened ? <CommonRoom {...props} /> : <RoomLoadingScreen
    roomName={label('commonPlaces', scene.id, scene.label)} {...progress} onCancel={onCancel} />;
});
