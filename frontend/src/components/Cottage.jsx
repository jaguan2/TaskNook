import { useEffect, useState } from "react";
import { motion } from "framer-motion";

const SNOWFLAKES = [
  [112, 3], [136, 6], [162, 2], [190, 5], [216, 4], [242, 7], [270, 3],
  [298, 5], [326, 2], [352, 6], [378, 4], [404, 3],
];

// String-light garland: [x, y-on-curve] sampled along the swag path below.
const GARLAND_BULBS = [
  [77, 33], [138, 39], [198, 44], [259, 47], [320, 48],
  [381, 47], [442, 44], [502, 39], [563, 33],
];

// Lighting presets for the window/sky. The room itself (walls, floor, rug,
// curtains) is colored via the theme's CSS variables so switching color
// scheme re-tints the scene along with the rest of the app.
// lampGlow / screenGlow / bulbGlow drive how strongly the desk lamp, monitor
// and garland read against the current sky.
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
    lampGlow: 0.55,
    screenGlow: 0.4,
    bulbGlow: 0.95,
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
    lampGlow: 0.4,
    screenGlow: 0.25,
    bulbGlow: 0.8,
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
    lampGlow: 0.12,
    screenGlow: 0.08,
    bulbGlow: 0.3,
  },
};

// A cozy lofi-style desk by a rainy night window: proper desk with a drawer
// cabinet, a monitor showing a tiny task list, an angled desk lamp, string
// lights and a rug. Hand-built SVG so it scales crisply with no image assets.
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
          {/* Room surfaces follow the active color scheme (CSS variables from
              index.css) so "re-tint the whole app" includes the scene. var()
              only resolves in style=, not SVG presentation attributes. */}
          <linearGradient id="wallGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" style={{ stopColor: "rgb(var(--color-plum))" }} />
            <stop offset="1" style={{ stopColor: "rgb(var(--color-night))" }} />
          </linearGradient>
          <linearGradient id="nightSky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={time.skyTop} />
            <stop offset="1" stopColor={time.skyBottom} />
          </linearGradient>
          <linearGradient id="floorGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" style={{ stopColor: "rgb(var(--color-wine))" }} />
            <stop offset="1" style={{ stopColor: "rgb(var(--color-void))" }} />
          </linearGradient>
          <linearGradient id="screenGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#4a3a6b" />
            <stop offset="1" stopColor="#2c2148" />
          </linearGradient>
          <radialGradient id="lampPool">
            <stop offset="0" stopColor="#ffe9b0" />
            <stop offset="1" stopColor="#ffe9b0" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="lampCone" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#ffe9b0" stopOpacity="0.8" />
            <stop offset="1" stopColor="#ffe9b0" stopOpacity="0" />
          </linearGradient>
          <clipPath id="skyClip">
            <rect x="98" y="46" width="320" height="212" />
          </clipPath>
          <clipPath id="roomClip">
            <rect x="8" y="8" width="624" height="464" rx="28" />
          </clipPath>
        </defs>

        {/* ---------- Room backdrop ---------- */}
        <rect x="8" y="8" width="624" height="464" rx="28" fill="url(#wallGrad)" />

        {/* ---------- Floor + rug ---------- */}
        <g clipPath="url(#roomClip)">
          <rect x="8" y="390" width="624" height="8" style={{ fill: "rgb(var(--color-petal) / 0.16)" }} />
          <rect x="8" y="396" width="624" height="76" fill="url(#floorGrad)" />
          {/* floorboards */}
          <line x1="8" y1="420" x2="632" y2="420" stroke="#26122a" strokeWidth="1.5" opacity="0.4" />
          <line x1="8" y1="446" x2="632" y2="446" stroke="#26122a" strokeWidth="1.5" opacity="0.4" />
          {[[130, 398, 420], [340, 398, 420], [540, 398, 420], [220, 420, 446], [450, 420, 446], [90, 446, 470], [380, 446, 470]].map(([x, y1, y2], i) => (
            <line key={`board-${i}`} x1={x} y1={y1} x2={x} y2={y2} stroke="#26122a" strokeWidth="1.5" opacity="0.3" />
          ))}
          {/* rug */}
          <ellipse cx="320" cy="440" rx="225" ry="24" style={{ fill: "rgb(var(--color-rose))" }} opacity="0.4" />
          <ellipse cx="320" cy="440" rx="200" ry="18" fill="none" style={{ stroke: "rgb(var(--color-petal))" }} strokeWidth="3" opacity="0.3" />
          {/* soft shadow the desk casts */}
          <ellipse cx="320" cy="402" rx="290" ry="10" fill="#000" opacity="0.18" />
        </g>

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
        <path d="M58 20 Q46 150 62 296 L94 296 Q80 150 90 20 Z" style={{ fill: "rgb(var(--color-petal))" }} opacity="0.94" />
        <path d="M70 26 Q62 150 74 288" style={{ stroke: "rgb(var(--color-blush))" }} strokeWidth="2" fill="none" opacity="0.6" />
        <path d="M446 20 Q458 150 442 296 L410 296 Q424 150 414 20 Z" style={{ fill: "rgb(var(--color-petal))" }} opacity="0.94" />
        <path d="M434 26 Q442 150 430 288" style={{ stroke: "rgb(var(--color-blush))" }} strokeWidth="2" fill="none" opacity="0.6" />

        {/* string-light garland swagging across the top */}
        <g>
          <path d="M16 24 Q320 72 624 24" stroke="#2b2350" strokeWidth="2" fill="none" />
          {GARLAND_BULBS.map(([x, y], i) => (
            <g key={`bulb-${i}`}>
              <line x1={x} y1={y} x2={x} y2={y + 5} stroke="#2b2350" strokeWidth="1.5" />
              <circle cx={x} cy={y + 8} r="7" fill="#ffe9b0" opacity={time.bulbGlow * 0.22} />
              <circle cx={x} cy={y + 8} r="3.5" fill="#ffe9b0" opacity={time.bulbGlow} />
            </g>
          ))}
        </g>

        {/* small wall decor: frame, hanging plant, wall clock */}
        <rect x="474" y="58" width="46" height="60" rx="4" style={{ fill: "rgb(var(--color-petal))" }} opacity="0.9" />
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
        <g>
          <circle cx="497" cy="158" r="17" fill="#f7e9e2" stroke="#8a5346" strokeWidth="3" />
          <line x1="497" y1="144" x2="497" y2="147" stroke="#8a5346" strokeWidth="1.5" />
          <line x1="497" y1="169" x2="497" y2="172" stroke="#8a5346" strokeWidth="1.5" />
          <line x1="483" y1="158" x2="486" y2="158" stroke="#8a5346" strokeWidth="1.5" />
          <line x1="508" y1="158" x2="511" y2="158" stroke="#8a5346" strokeWidth="1.5" />
          <line x1="497" y1="158" x2="497" y2="148" stroke="#4a2238" strokeWidth="2" strokeLinecap="round" />
          <line x1="497" y1="158" x2="504" y2="161" stroke="#4a2238" strokeWidth="2" strokeLinecap="round" />
          <circle cx="497" cy="158" r="1.5" fill="#4a2238" />
        </g>

        {/* ================= DESK ================= */}
        {/* left side panel */}
        <rect x="54" y="316" width="14" height="82" rx="2" fill="#8f5d49" />
        <line x1="65" y1="318" x2="65" y2="396" stroke="#6e4435" strokeWidth="1.5" opacity="0.6" />

        {/* drawer cabinet */}
        <rect x="444" y="316" width="150" height="84" rx="4" fill="#a87f5f" stroke="#8a5346" />
        {[325, 361].map((y, i) => (
          <g key={`drawer-${i}`}>
            <rect x="453" y={y} width="132" height="30" rx="3" fill="#9c6c54" stroke="#8a5346" />
            <rect x="506" y={y + 13} width="26" height="4" rx="2" fill="#6e4435" />
          </g>
        ))}

        {/* desk top: surface + front edge, with a hint of wood grain */}
        <polygon points="44,292 596,292 610,306 30,306" fill="#caa07f" />
        <path d="M80 299 q130 -3 250 0 t 220 0" stroke="#b8895f" strokeWidth="1.5" fill="none" opacity="0.5" />
        <path d="M140 295 q90 2 180 0" stroke="#b8895f" strokeWidth="1" fill="none" opacity="0.4" />
        <rect x="30" y="306" width="580" height="12" rx="2" fill="#a87f5f" />
        <line x1="32" y1="307" x2="608" y2="307" stroke="#d8b28c" strokeWidth="1" opacity="0.5" />

        {/* warm light pools on the desk (lamp right, monitor centre) */}
        <ellipse cx="530" cy="299" rx="78" ry="12" fill="url(#lampPool)" opacity={time.lampGlow} />
        <ellipse cx="290" cy="298" rx="70" ry="9" fill="#e9ddff" opacity={time.screenGlow * 0.5} />

        {/* potted plant */}
        <g>
          <path
            d="M78 300 q-14 -40 -3 -68 q8 20 14 24 q-11 -27 1 -46 q6 27 13 32 q0 -22 9 -33 q3 32 -5 59 q-5 24 -18 32 z"
            fill="#3f7f63"
            transform="translate(0,-16)"
          />
          <polygon points="70,282 104,282 100,305 74,305" fill="#c0563f" />
          <polygon points="70,282 104,282 102,287 72,287" fill="#a8412d" />
        </g>

        {/* book stack */}
        <g>
          <rect x="128" y="286" width="58" height="14" rx="2" fill="#7faf8f" transform="rotate(-2 157 293)" />
          <rect x="132" y="274" width="54" height="13" rx="2" fill="#e8a3a8" transform="rotate(1.5 159 280)" />
          <rect x="126" y="262" width="56" height="13" rx="2" fill="#9b8bd6" transform="rotate(-1 154 268)" />
        </g>

        {/* monitor with a tiny task list on screen */}
        <g>
          <rect x="252" y="297" width="76" height="7" rx="3.5" fill="#3a3142" />
          <rect x="283" y="274" width="14" height="25" fill="#342c3e" />
          <rect x="220" y="194" width="140" height="86" rx="9" fill="#2c2438" stroke="#201a30" strokeWidth="2" />
          <rect x="228" y="202" width="124" height="70" rx="5" fill="url(#screenGrad)" />
          {/* on-screen task rows */}
          <circle cx="240" cy="218" r="3.5" fill="#7faf8f" />
          <path d="M238.5 218 l1.2 1.4 l2 -2.6" stroke="#2c2148" strokeWidth="1.2" fill="none" strokeLinecap="round" />
          <rect x="250" y="215" width="64" height="5" rx="2.5" fill="#f3c6c0" opacity="0.75" />
          <circle cx="240" cy="232" r="3.5" fill="none" stroke="#f3c6c0" strokeWidth="1.5" opacity="0.5" />
          <rect x="250" y="229" width="80" height="5" rx="2.5" fill="#f3c6c0" opacity="0.45" />
          <circle cx="240" cy="246" r="3.5" fill="none" stroke="#f3c6c0" strokeWidth="1.5" opacity="0.5" />
          <rect x="250" y="243" width="52" height="5" rx="2.5" fill="#f3c6c0" opacity="0.45" />
          <rect x="236" y="258" width="108" height="5" rx="2.5" fill="#fff" opacity="0.12" />
          <rect x="236" y="258" width="64" height="5" rx="2.5" fill="#7faf8f" opacity="0.9" />
          {/* glass sheen */}
          <polygon points="228,202 268,202 240,272 228,272" fill="#fff" opacity="0.05" />
        </g>

        {/* mug + steam */}
        <g>
          <path d="M380 300 h30 v-20 h-30 z" fill="#d98a93" />
          <path d="M410 286 q10 -2 10 6 t-10 8" fill="none" stroke="#d98a93" strokeWidth="3" />
          <motion.path
            d="M388 276 q4 -10 0 -18 M398 276 q4 -10 0 -18"
            stroke="#f7e9e2"
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
            animate={{ opacity: [0, 0.6, 0], y: [0, -10, -16] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeOut" }}
          />
        </g>

        {/* pencil cup */}
        <g>
          <path d="M425 286 h26 l-3 26 h-20 z" fill="#cf8f93" />
          <line x1="431" y1="286" x2="427" y2="258" stroke="#e8b04b" strokeWidth="3" strokeLinecap="round" />
          <line x1="439" y1="286" x2="443" y2="252" stroke="#7faf8f" strokeWidth="3" strokeLinecap="round" />
          <line x1="445" y1="286" x2="450" y2="262" stroke="#9b8bd6" strokeWidth="3" strokeLinecap="round" />
        </g>

        {/* open notebook, sitting in the lamplight */}
        <g>
          <polygon points="463,304 535,304 545,314 453,314" fill="#e7d9c9" />
          <polygon points="463,304 499,304 504,309 468,309" fill="#f7e9e2" opacity="0.7" />
          <polygon points="499,304 535,304 540,309 504,309" fill="#f7e9e2" opacity="0.5" />
          <line x1="499" y1="304" x2="504" y2="314" stroke="#c9b8a4" strokeWidth="1.5" />
        </g>

        {/* angled desk lamp */}
        <g>
          <ellipse cx="566" cy="296" rx="18" ry="5" fill="#3a3142" />
          <line x1="566" y1="294" x2="552" y2="258" stroke="#3a3142" strokeWidth="4" strokeLinecap="round" />
          <line x1="552" y1="258" x2="528" y2="240" stroke="#3a3142" strokeWidth="4" strokeLinecap="round" />
          <circle cx="552" cy="258" r="3.5" fill="#2c2438" />
          <path d="M512 232 h32 l8 18 h-48 z" fill="#e8b04b" stroke="#c98f3a" />
          <circle cx="528" cy="252" r="4" fill="#ffe9b0" opacity={Math.max(0.4, time.lampGlow)} />
          <polygon
            className="animate-flicker"
            points="516,254 540,254 566,294 490,294"
            fill="url(#lampCone)"
            opacity={time.lampGlow * 0.55}
          />
        </g>
      </svg>
    </div>
  );
}
