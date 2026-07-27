import { useEffect, useRef, useState } from "react";
import { Headphones, Pause, Play, SkipBack, SkipForward, X } from "lucide-react";
import { useStore } from "../store";
import { stationKey } from "../lib/musicLink";

// The persistent music player + VC2-style bottom transport bar. Mounted at
// the App level (NOT inside the Sounds panel) so music keeps playing when the
// panel closes. YouTube stations play through the IFrame API in an off-screen
// player, giving the bar real controls: play/pause, ⏮⏭ (tracks within a
// playlist, stations otherwise), a seek bar with times (live streams get a
// LIVE badge instead), volume, and the current track's title. Spotify
// stations embed their own compact player (Spotify keeps controls to itself).
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
      script.onerror = () => {
        // Offline NOW isn't offline forever: clear the cached promise so the
        // next station change / toggle retries instead of pinning the bar to
        // "needs internet" until an app restart.
        ytApiPromise = null;
        resolve(null);
      };
      document.head.appendChild(script);
    });
  }
  return ytApiPromise;
}

function fmtTime(s) {
  if (!Number.isFinite(s) || s < 0) return "0:00";
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60).toString().padStart(2, "0");
  return h > 0 ? `${h}:${m.toString().padStart(2, "0")}:${sec}` : `${m}:${sec}`;
}

// A "duration" that is missing or absurd means a live stream.
const isLiveDuration = (d) => !Number.isFinite(d) || d <= 0 || d > 43200;

export default function MusicDock({ onOpenPanel }) {
  const { musicOn, toggleMusic, musicStations, activeStationKey, selectStation } =
    useStore();
  const station = musicStations.find((s) => stationKey(s) === activeStationKey);

  const [playing, setPlaying] = useState(false);
  // Two distinct failure modes: the API script not loading means no internet;
  // a player error means THIS stream won't play (region/embed limits) but the
  // next one might.
  const [unavailable, setUnavailable] = useState(false);
  const [streamError, setStreamError] = useState(false);
  const [track, setTrack] = useState({ title: "", t: 0, d: 0, live: false });
  const [volume, setVolume] = useState(() => {
    const saved = Number(localStorage.getItem("tasknook.music.volume"));
    return saved >= 0 && saved <= 100 ? saved : 70;
  });
  const playerRef = useRef(null);
  const holderRef = useRef(null);
  const volumeRef = useRef(volume);
  volumeRef.current = volume;
  const skipStreakRef = useRef(0);

  const isYouTube = station?.provider === "youtube";
  const isPlaylist = isYouTube && station?.kind === "playlist";
  const key = station ? stationKey(station) : null;

  useEffect(() => {
    if (!musicOn || !station || station.provider !== "youtube") return undefined;
    // Captured once: the cleanup must clear the SAME node the player mounted
    // into, not whatever the ref points at by teardown time.
    const holder = holderRef.current;
    let cancelled = false;
    let player = null;
    let poll = null;
    setUnavailable(false);
    setStreamError(false);
    setTrack({ title: "", t: 0, d: 0, live: false });
    skipStreakRef.current = 0;
    (async () => {
      const YT = await loadYouTubeApi();
      if (cancelled) return;
      if (!YT) {
        setUnavailable(true);
        return;
      }
      const el = document.createElement("div");
      holder.appendChild(el);
      // A real 320×180 player parked off-screen — YouTube is unreliable with
      // sub-minimum (1×1) embeds, and we only want the audio anyway.
      player = new YT.Player(el, {
        width: 320,
        height: 180,
        ...(station.kind === "playlist" ? {} : { videoId: station.id }),
        playerVars:
          station.kind === "playlist"
            ? {}
            : // Looping a single video needs it doubled into the playlist var.
              { loop: 1, playlist: station.id },
        events: {
          onReady: (e) => {
            e.target.setVolume(volumeRef.current);
            // loadPlaylist is an explicit "load and play" — more reliable
            // than autoplay playerVars for playlists.
            if (station.kind === "playlist") {
              e.target.loadPlaylist({ list: station.id, listType: "playlist" });
            } else {
              e.target.playVideo();
            }
          },
          onStateChange: (e) => {
            setPlaying(e.data === YT.PlayerState.PLAYING);
            if (e.data === YT.PlayerState.PLAYING) skipStreakRef.current = 0;
          },
          onError: () => {
            // In a playlist a single broken/blocked track shouldn't kill the
            // station — skip it (bounded, so a fully-broken list still ends).
            if (station.kind === "playlist" && skipStreakRef.current < 5) {
              skipStreakRef.current += 1;
              player?.nextVideo?.();
            } else {
              setStreamError(true);
            }
          },
        },
      });
      playerRef.current = player;
      // Track title + position for the bar, ~1Hz.
      poll = setInterval(() => {
        const p = playerRef.current;
        if (!p?.getCurrentTime) return;
        try {
          const d = p.getDuration?.() ?? 0;
          setTrack({
            title: p.getVideoData?.()?.title || "",
            t: p.getCurrentTime() || 0,
            d,
            live: isLiveDuration(d),
          });
        } catch {
          /* player mid-teardown */
        }
      }, 1000);
    })();
    return () => {
      cancelled = true;
      setPlaying(false);
      playerRef.current = null;
      clearInterval(poll);
      try {
        player?.destroy();
      } catch {
        /* already gone */
      }
      if (holder) holder.innerHTML = "";
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [musicOn, key]);

  if (!musicOn || !station) return null;

  const index = musicStations.findIndex((s) => stationKey(s) === activeStationKey);
  const stepStation = (delta) => {
    const next = musicStations[(index + delta + musicStations.length) % musicStations.length];
    selectStation(next);
  };
  // ⏮⏭ move through the playlist's tracks; for single-video stations they
  // move through stations instead (a lone video has no "next track").
  const stepBack = () => {
    if (isPlaylist && playerRef.current?.previousVideo) playerRef.current.previousVideo();
    else stepStation(-1);
  };
  const stepForward = () => {
    if (isPlaylist && playerRef.current?.nextVideo) playerRef.current.nextVideo();
    else stepStation(1);
  };
  const togglePlay = () => {
    const p = playerRef.current;
    if (!p?.playVideo) return;
    if (playing) p.pauseVideo();
    else p.playVideo();
  };
  const seekTo = (v) => {
    playerRef.current?.seekTo?.(v, true);
    setTrack((prev) => ({ ...prev, t: v }));
  };
  const changeVolume = (v) => {
    setVolume(v);
    localStorage.setItem("tasknook.music.volume", String(v));
    playerRef.current?.setVolume?.(v);
  };

  const title =
    (unavailable && "needs internet 🌐") ||
    (streamError && "won't play — try another station") ||
    track.title ||
    station.label;

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
          onClick={onOpenPanel}
          title="Open the Sounds panel (stations & ambience)"
          className="pill grid h-7 w-7 place-items-center text-petal/60 hover:bg-white/10 hover:text-cream"
        >
          <Headphones size={13} />
        </button>
        <button
          onClick={stepBack}
          title={isPlaylist ? "Previous track" : "Previous station"}
          className="pill grid h-7 w-7 place-items-center text-petal/70 hover:bg-white/10 hover:text-cream"
        >
          <SkipBack size={13} />
        </button>
        {isYouTube && !unavailable && !streamError && (
          <button
            onClick={togglePlay}
            title={playing ? "Pause" : "Play"}
            className="pill grid h-8 w-9 place-items-center bg-glow text-plum shadow-soft hover:bg-amber"
          >
            {playing ? <Pause size={14} /> : <Play size={14} />}
          </button>
        )}
        <button
          onClick={stepForward}
          title={isPlaylist ? "Next track" : "Next station"}
          className="pill grid h-7 w-7 place-items-center text-petal/70 hover:bg-white/10 hover:text-cream"
        >
          <SkipForward size={13} />
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
            <div className="flex w-56 flex-col gap-0.5 px-1">
              <p title={title} className="truncate text-xs font-semibold text-cream">
                {title}
              </p>
              {playing && track.live && (
                <p className="text-[10px] font-bold uppercase tracking-wider text-danger">
                  ● live
                </p>
              )}
              {/* keep the bar mounted through pauses and seek-buffering —
                  hiding it on every state change made seeking feel broken */}
              {!track.live && track.d > 0 && (
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] tabular-nums text-petal/60">
                    {fmtTime(track.t)}
                  </span>
                  <input
                    type="range"
                    min="0"
                    max={Math.max(1, Math.floor(track.d))}
                    step="1"
                    value={Math.floor(track.t)}
                    onChange={(e) => seekTo(Number(e.target.value))}
                    title="Seek"
                    className="h-1 min-w-0 flex-1 accent-glow"
                  />
                  <span className="text-[10px] tabular-nums text-petal/60">
                    {fmtTime(track.d)}
                  </span>
                </div>
              )}
            </div>
            <input
              type="range"
              min="0"
              max="100"
              step="5"
              value={volume}
              onChange={(e) => changeVolume(Number(e.target.value))}
              title="Music volume"
              className="w-14 accent-glow"
            />
          </>
        )}

        <button
          onClick={toggleMusic}
          title="Stop the music"
          className="pill grid h-7 w-7 place-items-center text-petal/50 hover:bg-white/10 hover:text-danger"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
