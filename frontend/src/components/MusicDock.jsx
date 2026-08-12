import { useEffect, useRef, useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Pause,
  Play,
  SkipBack,
  SkipForward,
  Volume2,
} from "lucide-react";
import { useStore } from "../store";
import { readJSON, readStored, writeJSON, writeStored } from "../lib/storage";
import { formatClock } from "../lib/time";
import { stationKey, stationUrl } from "../lib/musicLink";

// The persistent music player + VC2-style bottom transport bar. Mounted at
// the App level (NOT inside the Sounds panel) so music keeps playing when the
// panel closes. YouTube stations play through the IFrame API in an off-screen
// player, giving the bar real controls: play/pause, ⏮⏭ (tracks within a
// playlist, stations otherwise), a seek bar with times (live streams get a
// LIVE badge instead), volume, and the current track's title. Spotify
// stations embed their own compact player (Spotify keeps controls to itself).
const YT_SCRIPT_SRC = "https://www.youtube.com/iframe_api";
// How long to wait for the API before calling it a failure. `onerror` only
// covers the script failing to LOAD; a captive portal or a proxy that serves
// something else returns 200 and then `onYouTubeIframeAPIReady` simply never
// fires — the promise never settled, so there was no player, no "needs
// internet", and no way out short of restarting the app.
const YT_LOAD_TIMEOUT = 12000;

let ytApiPromise = null;
function loadYouTubeApi() {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (!ytApiPromise) {
    ytApiPromise = new Promise((resolve) => {
      let settled = false;
      const finish = (value) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        // Offline NOW isn't offline forever: clear the cached promise so the
        // next station change / toggle retries instead of pinning the bar to
        // "needs internet" until an app restart.
        if (!value) ytApiPromise = null;
        resolve(value);
      };
      const timer = setTimeout(() => finish(null), YT_LOAD_TIMEOUT);

      const prev = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        prev?.();
        finish(window.YT);
      };
      // Reuse the tag if one is already in the document: every retry used to
      // append another <script>, and a few failed stations left a pile of them
      // in <head> all racing the same global callback.
      //
      // A tag that FAILED is not reusable, though, and that was the hole: a
      // script's `error` event fires once at load time and never again, and a
      // browser will not re-fetch an existing script element. So after one
      // genuine offline failure every retry found the dead tag, attached a
      // listener that could never fire, and burned the full 12s timeout before
      // reporting "needs internet" — for ever, until an app restart. That is the
      // opposite of what the comment above `finish` promises. Removing the
      // corpse on error is what makes the retry real; the TIMEOUT path always
      // self-healed, because `window.YT?.Player` short-circuits at the top.
      const existing = document.querySelector(`script[src="${YT_SCRIPT_SRC}"]`);
      if (existing) {
        existing.addEventListener("error", () => finish(null), { once: true });
        return;
      }
      const script = document.createElement("script");
      script.src = YT_SCRIPT_SRC;
      script.onerror = () => {
        script.remove();
        finish(null);
      };
      document.head.appendChild(script);
    });
  }
  return ytApiPromise;
}

const fmtTime = (s) => formatClock(s);

// A "duration" that is missing or absurd means a live stream.
const isLiveDuration = (d) => !Number.isFinite(d) || d <= 0 || d > 43200;

// Where the music stopped: station key, playlist index, seconds in, and the
// title/duration so the bar can SHOW the spot before the player even loads.
const RESUME_KEY = "tasknook.music.resume";
// Bar hidden, music still playing — a display preference, so it persists per
// device exactly like `tasknook.dockCollapsed`.
const COLLAPSED_KEY = "tasknook.music.collapsed";
// Read at module load, before any toggle can change it: "was music on when
// the app last closed?" distinguishes the boot mount (no user gesture —
// autoplay would be blocked, so CUE at the saved spot with ▶ armed) from a
// station click (a real gesture that should start playing as always).
const BOOTED_WITH_MUSIC_ON = readStored("tasknook.music.on") === "1";
// Only the FIRST player mount after launch may cue; later mounts are clicks.
let bootResumeConsumed = false;

const EMPTY_TRACK = { title: "", t: 0, d: 0, live: false, videoId: "" };

export default function MusicDock() {
  const { musicOn, musicStations, activeStationKey, selectStation } = useStore();
  // The store already resolves `activeStationKey` to a station that exists;
  // the fallback is belt-and-braces, because the cost of getting it wrong here
  // is a bar that renders nothing at all — no transport, no way back.
  const station =
    musicStations.find((s) => stationKey(s) === activeStationKey) || musicStations[0];

  const [playing, setPlaying] = useState(false);
  // Collapsed = the bar folds down to a single pill and the music plays on.
  // This is why hiding is a state and not an unmount: the YouTube player lives
  // in the off-screen holder below, so returning null here would tear it down
  // and "hide" would silently mean "stop".
  const [collapsed, setCollapsed] = useState(() => readStored(COLLAPSED_KEY) === "1");
  const setHidden = (next) => {
    // Persist OUTSIDE the updater — updaters must stay pure (StrictMode
    // double-invokes them).
    writeStored(COLLAPSED_KEY, next ? "1" : "0");
    setCollapsed(next);
  };
  // Two distinct failure modes: the API script not loading means no internet;
  // a player error means THIS stream won't play (region/embed limits) but the
  // next one might.
  const [unavailable, setUnavailable] = useState(false);
  const [streamError, setStreamError] = useState(false);
  const [track, setTrack] = useState(() => {
    // Seed the bar from the resume record so a relaunch shows the saved
    // track and position IMMEDIATELY — before the player has loaded — with
    // ▶ armed to pick up from there.
    const saved = BOOTED_WITH_MUSIC_ON && station ? readJSON(RESUME_KEY, null) : null;
    return saved && saved.key === stationKey(station) && Number.isFinite(saved.t)
      ? {
          title: saved.title || "",
          t: saved.t,
          d: saved.d || 0,
          live: false,
          // The saved track's own id, so the title still deep-links correctly
          // in the cued state (a playlist would otherwise link to track 1
          // while the bar shows where you actually left off).
          videoId: saved.vid || "",
        }
      : EMPTY_TRACK;
  });
  const [volume, setVolume] = useState(() => {
    const saved = Number(readStored("tasknook.music.volume"));
    return saved >= 0 && saved <= 100 ? saved : 70;
  });
  const playerRef = useRef(null);
  const holderRef = useRef(null);
  const volumeRef = useRef(volume);
  volumeRef.current = volume;
  const skipStreakRef = useRef(0);
  const lastSavedRef = useRef(-1);

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
    // The resume record, consumed by at most one mount per launch (see the
    // module consts above for why only the boot mount may cue).
    const savedSpot = readJSON(RESUME_KEY, null);
    const resume =
      BOOTED_WITH_MUSIC_ON &&
      !bootResumeConsumed &&
      savedSpot &&
      savedSpot.key === key &&
      Number.isFinite(savedSpot.t)
        ? savedSpot
        : null;
    bootResumeConsumed = true;
    setUnavailable(false);
    setStreamError(false);
    // Keep the seeded title/position through the cue path — resetting here
    // would blank the bar exactly when it should show where you left off.
    if (!resume) setTrack(EMPTY_TRACK);
    skipStreakRef.current = 0;
    // Written ~every 5s while playing, on every pause, and on pagehide —
    // a hard window close loses a few seconds of position at worst.
    const saveResume = (p) => {
      try {
        const d = p?.getDuration?.() ?? 0;
        if (!p?.getCurrentTime || isLiveDuration(d)) return;
        writeJSON(RESUME_KEY, {
          key,
          index: p.getPlaylistIndex?.() ?? -1,
          t: Math.floor(p.getCurrentTime() || 0),
          d,
          title: p.getVideoData?.()?.title || "",
          vid: p.getVideoData?.()?.video_id || "",
          savedAt: Date.now(),
        });
      } catch {
        /* player mid-teardown */
      }
    };
    const flush = () => saveResume(playerRef.current);
    window.addEventListener("pagehide", flush);
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
            if (resume) {
              // CUE, don't play: the bar shows the saved track and time,
              // and the first ▶ press resumes from exactly there.
              if (station.kind === "playlist") {
                e.target.cuePlaylist({
                  list: station.id,
                  listType: "playlist",
                  index: resume.index > 0 ? resume.index : 0,
                  startSeconds: Math.max(0, resume.t),
                });
              } else {
                e.target.cueVideoById({
                  videoId: station.id,
                  startSeconds: Math.max(0, resume.t),
                });
              }
            } else if (station.kind === "playlist") {
              // loadPlaylist is an explicit "load and play" — more reliable
              // than autoplay playerVars for playlists.
              e.target.loadPlaylist({ list: station.id, listType: "playlist" });
            } else {
              e.target.playVideo();
            }
          },
          onStateChange: (e) => {
            setPlaying(e.data === YT.PlayerState.PLAYING);
            if (e.data === YT.PlayerState.PLAYING) skipStreakRef.current = 0;
            // cueVideoById (the resume path) drops the constructor's
            // doubled-playlist loop, so singles loop by hand instead.
            if (e.data === YT.PlayerState.ENDED && station.kind !== "playlist") {
              e.target.seekTo(0, true);
              e.target.playVideo();
            }
            // Pausing is the natural "stepping away" moment — save the
            // exact spot rather than waiting out the throttle.
            if (e.data === YT.PlayerState.PAUSED) saveResume(e.target);
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
          const st = p.getPlayerState?.();
          // Cued-but-unstarted (the resume state): the bar is showing the
          // SAVED position, and a cued player reports duration 0 — polling
          // now would wipe the seed and misread the zeros as a live stream.
          if (st === YT.PlayerState.CUED || st === YT.PlayerState.UNSTARTED) return;
          const d = p.getDuration?.() ?? 0;
          const data = p.getVideoData?.() || {};
          const next = {
            title: data.title || "",
            // Which track is playing, for the title's deep link — inside a
            // playlist this changes without the station changing.
            videoId: data.video_id || "",
            // Whole seconds: the bar shows m:ss, so sub-second precision was
            // guaranteeing a new object (and a re-render) every tick even for a
            // paused player where nothing had changed at all.
            t: Math.floor(p.getCurrentTime() || 0),
            d,
            live: isLiveDuration(d),
          };
          setTrack((prev) =>
            prev.title === next.title &&
            prev.t === next.t &&
            prev.d === next.d &&
            prev.live === next.live &&
            prev.videoId === next.videoId
              ? prev // same reference → React bails, no re-render
              : next
          );
          // Remember the spot (~every 5s while playing) so a relaunch can
          // cue it. Synchronous storage writes at 1Hz would be churn;
          // losing up to five seconds of position is nothing.
          if (
            st === YT.PlayerState.PLAYING &&
            !next.live &&
            next.t % 5 === 0 &&
            next.t !== lastSavedRef.current
          ) {
            lastSavedRef.current = next.t;
            saveResume(p);
          }
        } catch {
          /* player mid-teardown */
        }
      }, 1000);
    })();
    return () => {
      cancelled = true;
      // The station is changing or the dock is closing — bank the spot
      // before the player is torn down.
      flush();
      window.removeEventListener("pagehide", flush);
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

  const index = musicStations.findIndex((s) => stationKey(s) === key);
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
    writeStored("tasknook.music.volume", String(v));
    playerRef.current?.setVolume?.(v);
  };

  const title =
    (unavailable && "needs internet 🌐") ||
    (streamError && "won't play — try another station") ||
    track.title ||
    station.label;
  // Where this station lives on the web — the title links out to it.
  const link = stationUrl(station, track.videoId);

  return (
    // bottom-6 + a 44px-tall bar = the shared bottom rail (see App.jsx)
    <div className="absolute bottom-6 left-1/2 z-30 -translate-x-1/2">
      {/* The YouTube player lives off-screen (audio only, effectively) —
          OUTSIDE the collapsed/expanded branch below, because it must stay
          mounted for the music to survive hiding the bar. */}
      <div
        ref={holderRef}
        className="pointer-events-none absolute bottom-0 h-[180px] w-[320px]"
        style={{ left: "-9999px" }}
      />

      {/* Folded away, the bar is HIDDEN, never unmounted — for a Spotify
          station the visible embed IS the player, so dropping it from the tree
          would stop the music the button promises to keep playing. Same
          mechanism App.jsx already uses to survive decorating:
          `visibility` (not display:none) also drops the transport out of the
          tab order, and `absolute` takes it out of flow so the pill below can
          hold the rail spot and stay centred. */}
      <div className={collapsed ? "pointer-events-none invisible absolute bottom-0" : undefined}>
        <div className="glass flex items-center gap-1.5 rounded-2xl px-2.5 py-1.5 shadow-soft">
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
              className="pill grid h-8 w-8 place-items-center bg-glow text-plum shadow-soft hover:bg-amber"
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
            /* Title over ONE controls line. Volume used to sit outside this
               column, so it centred on the whole bar while the seek bar sat in
               the column's lower row — two sliders an inch apart on different
               baselines, which is exactly what reads as sloppy. Putting them on
               the same line aligns them by construction instead of by tuning
               padding. Fixed heights (leading-4 + h-3.5 + gap-0.5 = 32px) keep
               the bar 44px whatever state it's in, matching the pills opposite:
               a transport bar that changes height as a track loads is its own
               kind of misalignment. */
            <div className="flex w-64 flex-col justify-center gap-0.5 px-1">
              {/* The title is a real <a target="_blank">, not a click handler:
                  that's what gives middle-click, ctrl/⌘-click and
                  right-click → copy link address for free. It matters in the
                  packaged app too — pywebview's WebView2 backend intercepts the
                  new-window request and hands the URL to the system browser
                  (edgechromium.py's on_new_window_request, and
                  OPEN_EXTERNAL_LINKS_IN_BROWSER defaults on). Its `else` branch
                  is why `target` is not optional: a plain same-window link would
                  navigate the APP away to YouTube, and the desktop window has no
                  back button to return with.
                  The 9px glyph is always visible rather than hover-revealed —
                  a link nobody knows is a link doesn't get clicked, and the
                  affordance has to survive touch and keyboard too. */}
              {link ? (
                <a
                  href={link}
                  target="_blank"
                  rel="noreferrer"
                  title={`${title} — open in your browser`}
                  className="group flex items-center gap-1 text-xs font-semibold leading-4 text-cream transition-colors hover:text-glow"
                >
                  <span className="truncate group-hover:underline">{title}</span>
                  <ExternalLink
                    size={9}
                    className="shrink-0 text-petal/40 transition-colors group-hover:text-glow"
                  />
                </a>
              ) : (
                <p title={title} className="truncate text-xs font-semibold leading-4 text-cream">
                  {title}
                </p>
              )}
              <div className="flex h-3.5 items-center gap-1.5">
                {/* keep the bar mounted through pauses and seek-buffering —
                    hiding it on every state change made seeking feel broken */}
                {playing && track.live ? (
                  <span className="flex-1 text-[10px] font-bold uppercase leading-none tracking-wider text-danger">
                    ● live
                  </span>
                ) : !track.live && track.d > 0 ? (
                  <>
                    {/* fixed-width so the seek bar doesn't jump a few px wider
                        the moment a track ticks past 9:59 */}
                    <span className="w-10 shrink-0 text-[10px] leading-none tabular-nums text-petal/60">
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
                      aria-label="Seek"
                      className="h-1 min-w-0 flex-1 accent-glow"
                    />
                    <span className="w-10 shrink-0 text-right text-[10px] leading-none tabular-nums text-petal/60">
                      {fmtTime(track.d)}
                    </span>
                  </>
                ) : (
                  <span className="flex-1" />
                )}
                <Volume2 size={11} className="shrink-0 text-petal/50" />
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={volume}
                  onChange={(e) => changeVolume(Number(e.target.value))}
                  title="Music volume"
                  aria-label="Music volume"
                  className="h-1 w-10 shrink-0 accent-glow"
                />
              </div>
            </div>
          )}

          {/* Hides the bar, keeps the music. Not a ✕ any more: an ✕ on a
              playing station read as "stop", and stopping lives on the clock
              cluster's music toggle and in the Sounds panel. Chevron DOWN
              because the bar is on the bottom rail — it folds away toward its
              own edge, the way the Dock's chevron points at the left one. */}
          <button
            onClick={() => setHidden(true)}
            title="Hide the player — the music keeps playing"
            aria-label="Hide the player — the music keeps playing"
            className="pill grid h-7 w-7 place-items-center text-petal/50 hover:bg-white/10 hover:text-cream"
          >
            <ChevronDown size={14} />
          </button>
        </div>
      </div>

      {/* The folded state: one pill, same idea as the Dock's ☰. The h-11
          wrapper is what keeps it on the bottom rail — the pill itself is
          smaller, and hanging it off `bottom-6` directly would drop its
          optical centre 6px below the signature and the clock cluster.
          A chevron UP, not a music note: the clock cluster's music toggle is
          already a note on this same rail, and THAT one stops playback — two
          note buttons an inch apart, one of which kills the music, is exactly
          the confusion this rework removes. The chevron is the literal inverse
          of the ⌄ that folded it away, and the glow tint (only while something
          is playing) is what says "music" instead. */}
      {collapsed && (
        <div className="flex h-11 items-center">
          <button
            onClick={() => setHidden(false)}
            title={playing ? "Show the music player (playing)" : "Show the music player"}
            aria-label="Show the music player"
            className={`glass pill grid h-8 w-8 place-items-center shadow-soft transition hover:bg-white/10 hover:text-cream ${
              playing ? "text-glow" : "text-petal/60"
            }`}
          >
            <ChevronUp size={15} />
          </button>
        </div>
      )}
    </div>
  );
}
