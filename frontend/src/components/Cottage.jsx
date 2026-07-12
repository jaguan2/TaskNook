import { useEffect, useState } from "react";
import { motion } from "framer-motion";

const SNOWFLAKES = [
  [112, 3], [136, 6], [162, 2], [190, 5], [216, 4], [242, 7], [270, 3],
  [298, 5], [326, 2], [352, 6], [378, 4], [404, 3],
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
  },
};

// A cozy lofi-style desk by a rainy night window. Hand-built SVG so it scales
// crisply and needs no image assets.
export default function Cottage({ weather = "off", timeOfDay = "night" }) {
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
        className="w-full max-w-[720px] max-h-[54vh] drop-shadow-[0_30px_60px_rgba(0,0,0,0.45)]"
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
          <clipPath id="skyClip">
            <rect x="98" y="46" width="320" height="212" />
          </clipPath>
        </defs>

        {/* ---------- Room backdrop ---------- */}
        <rect x="8" y="8" width="624" height="464" rx="28" fill="url(#wallGrad)" />

        {/* ================= WINDOW ================= */}
        <rect x="88" y="36" width="340" height="232" rx="6" fill="#46396f" />
        <rect x="98" y="46" width="320" height="212" fill="url(#nightSky)" />

        <g clipPath="url(#skyClip)">
          {/* sun or moon */}
          <circle cx="332" cy={time.celestialCy} r={time.celestialR} fill={time.celestialFill} />

          {/* distant skyline */}
          {[
            [102, 214, 22, 44],
            [128, 198, 20, 60],
            [152, 220, 26, 38],
            [182, 204, 22, 54],
            [208, 224, 24, 34],
            [236, 192, 20, 66],
            [260, 216, 28, 42],
            [292, 206, 20, 52],
            [316, 222, 24, 36],
            [344, 198, 22, 60],
            [370, 218, 26, 40],
            [398, 208, 20, 50],
          ].map(([x, y, w, h], i) => (
            <rect key={`bld-${i}`} x={x} y={y} width={w} height={h} fill={time.building} />
          ))}
          {/* lit windows in the buildings */}
          {[
            [108, 226],
            [133, 214],
            [160, 232],
            [243, 210],
            [299, 220],
            [350, 216],
            [403, 224],
          ].map(([x, y], i) => (
            <rect key={`lit-${i}`} x={x} y={y} width="4" height="5" fill={time.litWindow} opacity={time.litOpacity} />
          ))}

          {/* rain streaks */}
          {isRainy &&
            Array.from({ length: weather === "storm" ? 22 : 16 }).map((_, i) => {
              const x = 102 + ((i * 53) % 300);
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
              x="98"
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
        <rect x="255" y="46" width="6" height="212" fill="#46396f" />
        <rect x="98" y="149" width="320" height="6" fill="#46396f" />

        {/* windowsill */}
        <rect x="82" y="268" width="352" height="14" rx="4" fill="#8a5346" />

        {/* curtains */}
        <line x1="50" y1="22" x2="466" y2="22" stroke="#2b2350" strokeWidth="4" strokeLinecap="round" />
        <circle cx="50" cy="22" r="5" fill="#2b2350" />
        <circle cx="466" cy="22" r="5" fill="#2b2350" />
        <path d="M58 20 Q46 150 62 296 L94 296 Q80 150 90 20 Z" fill="#f3c6c0" opacity="0.94" />
        <path d="M70 26 Q62 150 74 288" stroke="#e0a3a3" strokeWidth="2" fill="none" opacity="0.6" />
        <path d="M446 20 Q458 150 442 296 L410 296 Q424 150 414 20 Z" fill="#f3c6c0" opacity="0.94" />
        <path d="M434 26 Q442 150 430 288" stroke="#e0a3a3" strokeWidth="2" fill="none" opacity="0.6" />

        {/* small wall decor */}
        <rect x="474" y="58" width="46" height="60" rx="4" fill="#f3c6c0" opacity="0.9" />
        <rect x="481" y="65" width="32" height="46" rx="2" fill="#7a5a6e" />
        <g>
          <line x1="544" y1="50" x2="544" y2="70" stroke="#8a5346" strokeWidth="1.5" />
          <ellipse cx="544" cy="76" rx="12" ry="7" fill="#c0563f" />
          <path
            d="M535 74 q3 22 -2 32 M544 78 q1 26 0 38 M553 74 q-2 22 3 30"
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
            d="M78 300 q-14 -40 -3 -68 q8 20 14 24 q-11 -27 1 -46 q6 27 13 32 q0 -22 9 -33 q3 32 -5 59 q-5 24 -18 32 z"
            fill="#3f7f63"
          />
          <polygon points="68,298 106,298 101,322 73,322" fill="#c0563f" />
          <polygon points="68,298 106,298 104,303 70,303" fill="#a8412d" />
        </g>

        {/* book stack */}
        <g>
          <rect x="128" y="286" width="58" height="14" rx="2" fill="#7faf8f" transform="rotate(-2 157 293)" />
          <rect x="132" y="274" width="54" height="13" rx="2" fill="#e8a3a8" transform="rotate(1.5 159 280)" />
          <rect x="126" y="262" width="56" height="13" rx="2" fill="#9b8bd6" transform="rotate(-1 154 268)" />
        </g>

        {/* mug + steam */}
        <g>
          <path d="M218 300 h30 v-20 h-30 z" fill="#d98a93" />
          <path d="M248 286 q10 -2 10 6 t-10 8" fill="none" stroke="#d98a93" strokeWidth="3" />
          <motion.path
            d="M226 276 q4 -10 0 -18 M236 276 q4 -10 0 -18"
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
          <polygon points="268,304 340,304 350,314 258,314" fill="#e7d9c9" />
          <polygon points="268,304 304,304 309,309 273,309" fill="#f7e9e2" opacity="0.7" />
          <polygon points="304,304 340,304 345,309 309,309" fill="#f7e9e2" opacity="0.5" />
          <line x1="304" y1="304" x2="309" y2="314" stroke="#c9b8a4" strokeWidth="1.5" />
        </g>

        {/* pencil cup */}
        <g>
          <path d="M366 286 h26 l-3 26 h-20 z" fill="#cf8f93" />
          <line x1="372" y1="286" x2="368" y2="258" stroke="#e8b04b" strokeWidth="3" strokeLinecap="round" />
          <line x1="380" y1="286" x2="384" y2="252" stroke="#7faf8f" strokeWidth="3" strokeLinecap="round" />
          <line x1="386" y1="286" x2="391" y2="262" stroke="#9b8bd6" strokeWidth="3" strokeLinecap="round" />
        </g>
      </svg>
    </div>
  );
}
