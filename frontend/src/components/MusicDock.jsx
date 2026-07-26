import { useEffect, useRef, useState } from "react";
import { useStore } from "../store";
import { stationKey } from "../lib/musicLink";

// The persistent music player + VC2-style bottom transport bar. Mounted at
// the App level (NOT inside the Sounds panel) so music keeps playing when the
// panel closes. YouTube stations play through the IFrame API in an invisible
// player, giving the bar real play/pause + volume; Spotify stations embed
// their own compact player in the bar (Spotify's embed keeps playback
// controls to itself).
let ytApiPromise = null;
function loadYouTubeApi() {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (!ytApiPromise) {
    ytApiPromise = new Promise((resolve) => {
      const prev = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        prev?.();
        resolve(window.YT);
      };
      const script = document.createElement("script");
      script.src = "https://www.youtube.com/iframe_api";
      script.onerror = () => resolve(null); // offline — no YouTube either way
      document.head.appendChild(script);
    });
  }
  return ytApiPromise;
}

export default function MusicDock() {
  const { musicOn, toggleMusic, musicStations, activeStationKey, selectStation } =
    useStore();
  const station = musicStations.find((s) => stationKey(s) === activeStationKey);

  const [playing, setPlaying] = useState(false);
  // Two distinct failure modes: the API script not loading means no internet;
  // a player error means THIS stream won't play (region/embed limits) but the
  // next one might.
  const [unavailable, setUnavailable] = useState(false);
  const [streamError, setStreamError] = useState(false);
  const [volume, setVolume] = useState(() => {
    const saved = Number(localStorage.getItem("tasknook.music.volume"));
    return saved >= 0 && saved <= 100 ? saved : 70;
  });
  const playerRef = useRef(null);
  const holderRef = useRef(null);
  const volumeRef = useRef(volume);
  volumeRef.current = volume;

  const isYouTube = station?.provider === "youtube";
  const key = station ? stationKey(station) : null;

  useEffect(() => {
    if (!musicOn || !station || station.provider !== "youtube") return undefined;
    let cancelled = false;
    let player = null;
    setUnavailable(false);
    setStreamError(false);
    (async () => {
      const YT = await loadYouTubeApi();
      if (cancelled) return;
      if (!YT) {
        setUnavailable(true);
        return;
      }
      const el = document.createElement("div");
      holderRef.current.appendChild(el);
      // A real 320×180 player parked off-screen — YouTube is unreliable with
      // sub-minimum (1×1) embeds, and we only want the audio anyway.
      player = new YT.Player(el, {
        width: 320,
        height: 180,
        ...(station.kind === "playlist" ? {} : { videoId: station.id }),
        playerVars: {
          autoplay: 1,
          ...(station.kind === "playlist"
            ? { listType: "playlist", list: station.id }
            : // Looping a single video needs it doubled into the playlist var.
              { loop: 1, playlist: station.id }),
        },
        events: {
          onReady: (e) => {
            e.target.setVolume(volumeRef.current);
            e.target.playVideo();
          },
          onStateChange: (e) => setPlaying(e.data === YT.PlayerState.PLAYING),
          onError: () => setStreamError(true),
        },
      });
      playerRef.current = player;
    })();
    return () => {
      cancelled = true;
      setPlaying(false);
      playerRef.current = null;
      try {
        player?.destroy();
      } catch {
        /* already gone */
      }
      if (holderRef.current) holderRef.current.innerHTML = "";
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [musicOn, key]);

  if (!musicOn || !station) return null;

  const index = musicStations.findIndex((s) => stationKey(s) === activeStationKey);
  const step = (delta) => {
    const next = musicStations[(index + delta + musicStations.length) % musicStations.length];
    selectStation(next);
  };
  const togglePlay = () => {
    const p = playerRef.current;
    if (!p?.playVideo) return;
    if (playing) p.pauseVideo();
    else p.playVideo();
  };
  const changeVolume = (v) => {
    setVolume(v);
    localStorage.setItem("tasknook.music.volume", String(v));
    playerRef.current?.setVolume?.(v);
  };

  return (
    <div className="absolute bottom-3 left-1/2 z-30 -translate-x-1/2">
      {/* the YouTube player lives off-screen (audio only, effectively) */}
      <div
        ref={holderRef}
        className="pointer-events-none absolute bottom-0 h-[180px] w-[320px]"
        style={{ left: "-9999px" }}
      />

      <div className="glass flex items-center gap-1.5 rounded-2xl px-2.5 py-1.5 shadow-soft">
        <button
          onClick={() => step(-1)}
          title="Previous station"
          className="pill grid h-7 w-7 place-items-center text-xs text-petal/70 hover:bg-white/10 hover:text-cream"
        >
          ⏮
        </button>
        {isYouTube && !unavailable && !streamError && (
          <button
            onClick={togglePlay}
            title={playing ? "Pause" : "Play"}
            className="pill grid h-8 w-9 place-items-center bg-glow text-xs font-bold text-plum shadow-soft hover:bg-amber"
          >
            {playing ? "❚❚" : "▶"}
          </button>
        )}
        <button
          onClick={() => step(1)}
          title="Next station"
          className="pill grid h-7 w-7 place-items-center text-xs text-petal/70 hover:bg-white/10 hover:text-cream"
        >
          ⏭
        </button>

        {station.provider === "spotify" ? (
          <iframe
            key={key}
            title="Spotify player"
            src={`https://open.spotify.com/embed/${station.kind}/${station.id}?utm_source=generator&theme=0`}
            width="280"
            height="80"
            allow="autoplay; clipboard-write; encrypted-media"
            className="rounded-xl border-0"
          />
        ) : (
          <>
            <p
              title={station.label}
              className="max-w-[10rem] truncate px-1 text-xs font-semibold text-cream"
            >
              {unavailable
                ? "needs internet 🌐"
                : streamError
                ? "won't play — try ⏭"
                : station.label}
            </p>
            <input
              type="range"
              min="0"
              max="100"
              step="5"
              value={volume}
              onChange={(e) => changeVolume(Number(e.target.value))}
              title="Music volume"
              className="w-16 accent-glow"
            />
          </>
        )}

        <button
          onClick={toggleMusic}
          title="Stop the music"
          className="pill grid h-7 w-7 place-items-center text-xs text-petal/50 hover:bg-white/10 hover:text-rose"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
