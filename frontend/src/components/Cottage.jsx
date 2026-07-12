import { useEffect, useState } from "react";
import { motion } from "framer-motion";

const SNOWFLAKES = [
  [80, 3], [104, 6], [130, 2], [158, 5], [184, 4], [210, 7], [238, 3],
  [266, 5], [294, 2], [320, 6], [346, 4], [372, 3],
];

// Lighting presets for the window/sky — the room's walls stay a constant
// cozy plum (so the scene never clashes with the app's always-dark chrome).
const TIME_PRESETS = {
  night: {
    skyTop: "#221b3f",
    skyBottom: "#40355f",
    building: "#1c1636",
    litWindow: "#f4c76a",
    litOpacity: 0.85,
    celestialFill: "#f7e9e2",
    celestialCy: 72,
    celestialR: 15,
    lampOpacity: 1,
  },
  sunset: {
    skyTop: "#3d2f52",
    skyBottom: "#d9784f",
    building: "#2a2038",
    litWindow: "#ffb673",
    litOpacity: 0.75,
    celestialFill: "#ffa958",
    celestialCy: 172,
    celestialR: 28,
    lampOpacity: 1,
  },
  day: {
    skyTop: "#5f97c9",
    skyBottom: "#bfe1ee",
    building: "#3f6485",
    litWindow: "#eaf6ff",
    litOpacity: 0.3,
    celestialFill: "#fff6da",
    celestialCy: 60,
    celestialR: 20,
    lampOpacity: 0.35,
  },
};

// A cozy lofi-style desk by a rainy night window. Hand-built SVG so it scales
// crisply and needs no image assets.
export default function Cottage({ focused = false, weather = "off", timeOfDay = "night" }) {
  const [flash, setFlash] = useState(false);
  const time = TIME_PRESETS[timeOfDay] || TIME_PRESETS.night;

  useEffect(() => {
    if (weather !== "storm") return undefined;
    let timer;
    const scheduleFlash = () => {
      timer = setTimeout(() => {
        setFlash(true);
        setTimeout(() => setFlash(false), 150);
        scheduleFlash();
      }, 4500 + Math.random() * 9000);
    };
    scheduleFlash();
    return () => clearTimeout(timer);
  }, [weather]);

  const isRainy = weather === "rain" || weather === "storm";

  return (
    <div className="pointer-events-none select-none w-full flex items-center justify-center">
      <svg
        viewBox="0 0 640 480"
        className="w-[min(85vw,720px)] drop-shadow-[0_30px_60px_rgba(0,0,0,0.45)]"
      >
        <defs>
          <linearGradient id="wallGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#3b1f33" />
            <stop offset="1" stopColor="#2b1830" />
          </linearGradient>
          <linearGradient id="nightSky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={time.skyTop} />
            <stop offset="1" stopColor={time.skyBottom} />
          </linearGradient>
          <radialGradient id="lampGlow2" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" stopColor="rgba(255,233,176,0.65)" />
            <stop offset="1" stopColor="rgba(255,233,176,0)" />
          </radialGradient>
          <clipPath id="skyClip">
            <rect x="66" y="46" width="320" height="212" />
          </clipPath>
        </defs>

        {/* ---------- Room backdrop ---------- */}
        <rect x="8" y="8" width="624" height="464" rx="28" fill="url(#wallGrad)" />

        {/* ================= WINDOW ================= */}
        <rect x="56" y="36" width="340" height="232" rx="6" fill="#46396f" />
        <rect x="66" y="46" width="320" height="212" fill="url(#nightSky)" />

        <g clipPath="url(#skyClip)">
          {/* sun or moon */}
          <circle cx="300" cy={time.celestialCy} r={time.celestialR} fill={time.celestialFill} />

          {/* distant skyline */}
          {[
            [70, 214, 22, 44],
            [96, 198, 20, 60],
            [120, 220, 26, 38],
            [150, 204, 22, 54],
            [176, 224, 24, 34],
            [204, 192, 20, 66],
            [228, 216, 28, 42],
            [260, 206, 20, 52],
            [284, 222, 24, 36],
            [312, 198, 22, 60],
            [338, 218, 26, 40],
            [366, 208, 20, 50],
          ].map(([x, y, w, h], i) => (
            <rect key={`bld-${i}`} x={x} y={y} width={w} height={h} fill={time.building} />
          ))}
          {/* lit windows in the buildings */}
          {[
            [76, 226],
            [101, 214],
            [128, 232],
            [211, 210],
            [267, 220],
            [318, 216],
            [371, 224],
          ].map(([x, y], i) => (
            <rect key={`lit-${i}`} x={x} y={y} width="4" height="5" fill={time.litWindow} opacity={time.litOpacity} />
          ))}

          {/* rain streaks */}
          {isRainy &&
            Array.from({ length: weather === "storm" ? 22 : 16 }).map((_, i) => {
              const x = 70 + ((i * 53) % 300);
              const delay = (i % 8) * 0.18;
              const dur = (weather === "storm" ? 0.4 : 0.7) + ((i * 11) % 6) / 10;
              return (
                <line
                  key={`rain-${i}`}
                  className="window-rain"
                  x1={x}
                  y1="46"
                  x2={x - 6}
                  y2="72"
                  stroke="rgba(214,226,255,0.6)"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  style={{ animationDuration: `${dur}s`, animationDelay: `${delay}s` }}
                />
              );
            })}

          {/* snow flakes */}
          {weather === "snow" &&
            SNOWFLAKES.map(([x, r], i) => (
              <circle
                key={`snow-${i}`}
                className="window-snow"
                cx={x}
                cy="46"
                r={r}
                fill="rgba(255,255,255,0.85)"
                style={{
                  animationDuration: `${4 + (i % 5)}s`,
                  animationDelay: `${(i % 6) * 0.5}s`,
                }}
              />
            ))}

          {weather === "storm" && (
            <rect
              x="66"
              y="46"
              width="320"
              height="212"
              fill="#fff"
              opacity={flash ? 0.45 : 0}
              style={{ transition: "opacity 0.1s ease-out" }}
            />
          )}
        </g>

        {/* mullions (drawn over the sky so the frame reads on top) */}
        <rect x="223" y="46" width="6" height="212" fill="#46396f" />
        <rect x="66" y="149" width="320" height="6" fill="#46396f" />

        {/* windowsill */}
        <rect x="50" y="268" width="352" height="14" rx="4" fill="#8a5346" />

        {/* curtains */}
        <line x1="18" y1="22" x2="434" y2="22" stroke="#2b2350" strokeWidth="4" strokeLinecap="round" />
        <circle cx="18" cy="22" r="5" fill="#2b2350" />
        <circle cx="434" cy="22" r="5" fill="#2b2350" />
        <path d="M26 20 Q14 150 30 296 L62 296 Q48 150 58 20 Z" fill="#f3c6c0" opacity="0.94" />
        <path d="M38 26 Q30 150 42 288" stroke="#e0a3a3" strokeWidth="2" fill="none" opacity="0.6" />
        <path d="M414 20 Q426 150 410 296 L378 296 Q392 150 382 20 Z" fill="#f3c6c0" opacity="0.94" />
        <path d="M402 26 Q410 150 398 288" stroke="#e0a3a3" strokeWidth="2" fill="none" opacity="0.6" />

        {/* small wall decor, positioned above where the monitor sits below */}
        <rect x="424" y="58" width="46" height="60" rx="4" fill="#f3c6c0" opacity="0.9" />
        <rect x="431" y="65" width="32" height="46" rx="2" fill="#7a5a6e" />
        <g>
          <line x1="494" y1="50" x2="494" y2="70" stroke="#8a5346" strokeWidth="1.5" />
          <ellipse cx="494" cy="76" rx="12" ry="7" fill="#c0563f" />
          <path
            d="M485 74 q3 22 -2 32 M494 78 q1 26 0 38 M503 74 q-2 22 3 30"
            stroke="#56a07c"
            strokeWidth="2.5"
            fill="none"
            strokeLinecap="round"
          />
        </g>

        {/* ================= DESK ================= */}
        <polygon points="16,300 606,300 616,318 6,318" fill="#caa07f" />
        <rect x="6" y="318" width="610" height="98" rx="10" fill="#a87f5f" />

        {/* drawer fronts */}
        {[334, 368].map((y, i) => (
          <g key={`drawer-${i}`}>
            <rect x="460" y={y} width="112" height="28" rx="4" fill="#9c6c54" stroke="#8a5346" />
            <circle cx="516" cy={y + 14} r="3" fill="#6e4435" />
          </g>
        ))}

        {/* potted plant */}
        <g>
          <path
            d="M46 300 q-14 -40 -3 -68 q8 20 14 24 q-11 -27 1 -46 q6 27 13 32 q0 -22 9 -33 q3 32 -5 59 q-5 24 -18 32 z"
            fill="#3f7f63"
          />
          <polygon points="36,298 74,298 69,322 41,322" fill="#c0563f" />
          <polygon points="36,298 74,298 72,303 38,303" fill="#a8412d" />
        </g>

        {/* book stack */}
        <g>
          <rect x="96" y="286" width="58" height="14" rx="2" fill="#7faf8f" transform="rotate(-2 125 293)" />
          <rect x="100" y="274" width="54" height="13" rx="2" fill="#e8a3a8" transform="rotate(1.5 127 280)" />
          <rect x="94" y="262" width="56" height="13" rx="2" fill="#9b8bd6" transform="rotate(-1 122 268)" />
        </g>

        {/* mug + steam */}
        <g>
          <path d="M186 300 h30 v-20 h-30 z" fill="#d98a93" />
          <path d="M216 286 q10 -2 10 6 t-10 8" fill="none" stroke="#d98a93" strokeWidth="3" />
          <motion.path
            d="M194 276 q4 -10 0 -18 M204 276 q4 -10 0 -18"
            stroke="#f7e9e2"
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
            animate={{ opacity: [0, 0.6, 0], y: [0, -10, -16] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeOut" }}
          />
        </g>

        {/* open notebook */}
        <g>
          <polygon points="248,304 320,304 330,314 238,314" fill="#e7d9c9" />
          <polygon points="248,304 284,304 289,309 253,309" fill="#f7e9e2" opacity="0.7" />
          <polygon points="284,304 320,304 325,309 289,309" fill="#f7e9e2" opacity="0.5" />
          <line x1="284" y1="304" x2="289" y2="314" stroke="#c9b8a4" strokeWidth="1.5" />
        </g>

        {/* pencil cup */}
        <g>
          <path d="M366 306 h26 l-3 26 h-20 z" fill="#cf8f93" />
          <line x1="372" y1="306" x2="368" y2="278" stroke="#e8b04b" strokeWidth="3" strokeLinecap="round" />
          <line x1="380" y1="306" x2="384" y2="272" stroke="#7faf8f" strokeWidth="3" strokeLinecap="round" />
          <line x1="386" y1="306" x2="391" y2="282" stroke="#9b8bd6" strokeWidth="3" strokeLinecap="round" />
        </g>

        {/* monitor */}
        <g>
          <rect x="412" y="240" width="112" height="76" rx="6" fill="#3a2f42" />
          <motion.rect
            x="420"
            y="248"
            width="96"
            height="60"
            rx="2"
            fill={focused ? "#ffe9b0" : "#8fa8c8"}
            animate={focused ? { opacity: [0.7, 1, 0.7] } : { opacity: 0.8 }}
            transition={{ duration: 2.5, repeat: Infinity }}
          />
          <rect x="458" y="316" width="20" height="12" fill="#3a2f42" />
          <rect x="444" y="328" width="48" height="7" rx="3" fill="#2d2536" />
        </g>

        {/* desk lamp, arching in from the right */}
        <g className={focused ? "animate-flicker" : ""} opacity={time.lampOpacity}>
          <rect x="586" y="330" width="26" height="10" rx="3" fill="#5b4a7a" />
          <path
            d="M598 330 q-6 -46 -46 -54"
            fill="none"
            stroke="#5b4a7a"
            strokeWidth="5"
            strokeLinecap="round"
          />
          <ellipse cx="548" cy="272" rx="34" ry="24" fill="url(#lampGlow2)" />
          <path d="M534 264 l30 -10 l6 12 l-32 14 z" fill="#e8b04b" />
          <ellipse cx="548" cy="272" rx="7" ry="5" fill="#fff6da" />
        </g>

        {/* chair, pulled out in front of the desk — legs reach past the desk's
            bottom edge onto the floor so it reads as in front of it, not on it */}
        <g>
          <path
            d="M278 420 q-6 -40 4 -62 q30 -9 56 0 q10 22 4 62 z"
            fill="#6e4435"
          />
          <rect x="268" y="418" width="82" height="15" rx="6" fill="#5b3a2a" />
          {[288, 304, 320, 336].map((x, i) => (
            <line key={`slat-${i}`} x1={x} y1="356" x2={x} y2="417" stroke="#5b3a2a" strokeWidth="4" strokeLinecap="round" />
          ))}
          <line x1="278" y1="433" x2="272" y2="466" stroke="#5b3a2a" strokeWidth="5" strokeLinecap="round" />
          <line x1="340" y1="433" x2="346" y2="466" stroke="#5b3a2a" strokeWidth="5" strokeLinecap="round" />
        </g>
      </svg>
    </div>
  );
}
