import { motion } from "framer-motion";

// A cozy isometric cottage cutaway, inspired by "Virtual Cottage".
// Hand-built SVG so it scales crisply and needs no image assets.
export default function Cottage({ focused = false, night = true }) {
  return (
    <div className="pointer-events-none select-none w-full flex items-center justify-center">
      <svg
        viewBox="0 0 600 560"
        className="w-[min(78vw,640px)] drop-shadow-[0_30px_60px_rgba(0,0,0,0.45)]"
      >
        <defs>
          <linearGradient id="roofL" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#3a2f5e" />
            <stop offset="1" stopColor="#2b2350" />
          </linearGradient>
          <linearGradient id="roofR" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#2b2350" />
            <stop offset="1" stopColor="#221b40" />
          </linearGradient>
          <linearGradient id="wallL" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#e0a3a3" />
            <stop offset="1" stopColor="#cf8f93" />
          </linearGradient>
          <linearGradient id="wallR" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#c9858d" />
            <stop offset="1" stopColor="#b9737d" />
          </linearGradient>
          <linearGradient id="floor" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#c46b5a" />
            <stop offset="1" stopColor="#a85345" />
          </linearGradient>
          <radialGradient id="windowGlow" cx="0.5" cy="0.4" r="0.7">
            <stop offset="0" stopColor="#fff6da" />
            <stop offset="0.6" stopColor="#ffe9b0" />
            <stop offset="1" stopColor="#f4c982" />
          </radialGradient>
          <radialGradient id="lampGlow" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" stopColor="rgba(255,233,176,0.55)" />
            <stop offset="1" stopColor="rgba(255,233,176,0)" />
          </radialGradient>
        </defs>

        {/* ---------- Roof (behind everything) ---------- */}
        <polygon points="300,150 135,240 215,92" fill="url(#roofL)" />
        <polygon points="300,150 465,240 385,92" fill="url(#roofR)" />
        <polygon points="215,92 385,92 300,150" fill="#332a57" />
        {/* roof rim highlight */}
        <polyline
          points="135,240 215,92 385,92 465,240"
          fill="none"
          stroke="#46396f"
          strokeWidth="4"
          strokeLinejoin="round"
        />

        {/* ---------- Walls ---------- */}
        <polygon points="300,150 135,240 135,390 300,300" fill="url(#wallL)" />
        <polygon points="300,150 465,240 465,390 300,300" fill="url(#wallR)" />
        {/* back corner seam */}
        <line x1="300" y1="150" x2="300" y2="300" stroke="#b9737d" strokeWidth="2" />

        {/* ---------- Floor ---------- */}
        <polygon points="300,300 135,390 300,480 465,390" fill="url(#floor)" />
        {/* plank lines */}
        {[0.25, 0.5, 0.75].map((t) => (
          <line
            key={`pl-${t}`}
            x1={300 - 165 * t}
            y1={300 + 90 * t}
            x2={300 + 165 * (1 - t)}
            y2={480 - 90 * (1 - t)}
            stroke="#9a4c3f"
            strokeWidth="1.5"
            opacity="0.5"
          />
        ))}

        {/* ---------- Rug ---------- */}
        <polygon points="245,372 175,360 230,402 300,414" fill="#e8b04b" opacity="0.9" />
        <polygon
          points="248,380 205,373 232,396 275,403"
          fill="none"
          stroke="#c98a2e"
          strokeWidth="2"
        />

        {/* ================= LEFT SIDE: window + bookshelf ================= */}
        {/* window glow spill */}
        <ellipse cx="205" cy="300" rx="120" ry="70" fill="url(#lampGlow)" />
        {/* window */}
        <g className={focused ? "animate-flicker" : ""}>
          <polygon points="170,225 222,197 222,262 170,290" fill="url(#windowGlow)" />
          <polygon
            points="170,225 222,197 222,262 170,290"
            fill="none"
            stroke="#f3e3c0"
            strokeWidth="3"
          />
          <line x1="196" y1="211" x2="196" y2="276" stroke="#f3e3c0" strokeWidth="2" />
          <line x1="170" y1="257" x2="222" y2="229" stroke="#f3e3c0" strokeWidth="2" />
        </g>

        {/* bookshelf */}
        <g>
          <polygon points="232,205 270,182 270,300 232,320" fill="#a86a5d" />
          <polygon points="232,205 270,182 274,186 236,209" fill="#8a5346" />
          {[228, 256, 284].map((y, i) => (
            <line
              key={`sh-${i}`}
              x1="234"
              y1={y - 10}
              x2="270"
              y2={y - 32}
              stroke="#8a5346"
              strokeWidth="3"
            />
          ))}
          {/* books */}
          {[
            [240, 220, "#7faf8f"],
            [246, 217, "#e8a3a8"],
            [252, 214, "#e8b04b"],
            [258, 211, "#9b8bd6"],
            [240, 248, "#e8a3a8"],
            [248, 244, "#7faf8f"],
            [256, 240, "#e8b04b"],
          ].map(([x, y, c], i) => (
            <rect
              key={`bk-${i}`}
              x={x}
              y={y}
              width="5"
              height="16"
              rx="1"
              fill={c}
              // rotate (angle cx cy) is valid SVG; skewY takes only an angle.
              // Tilt each book about its own base so they lean on the shelf.
              transform={`rotate(-32 ${x} ${y + 16})`}
            />
          ))}
        </g>

        {/* calendar on the back wall */}
        <polygon points="300,210 332,193 332,235 300,252" fill="#f7e9e2" />
        <polygon points="300,210 332,193 332,201 300,218" fill="#d98a93" />

        {/* ================= DESK + CHAIR + CHARACTER ================= */}
        {/* desk */}
        <polygon points="178,318 238,300 250,306 190,324" fill="#caa07f" />
        <polygon points="178,318 190,324 190,352 178,346" fill="#a87f5f" />
        <polygon points="238,300 250,306 250,334 238,328" fill="#b58c6a" />
        {/* laptop */}
        <polygon points="200,310 224,302 230,305 206,313" fill="#caced6" />
        <motion.polygon
          points="206,313 230,305 230,292 206,300"
          fill={focused ? "#bfe2ff" : "#8fa8c8"}
          animate={focused ? { opacity: [0.7, 1, 0.7] } : { opacity: 0.8 }}
          transition={{ duration: 2.5, repeat: Infinity }}
        />

        {/* chair */}
        <polygon points="196,352 224,343 232,347 204,356" fill="#b07d63" />
        <polygon points="224,343 232,347 232,316 224,312" fill="#9c6c54" />

        {/* character (sitting, back to us) */}
        <g>
          {/* body */}
          <motion.path
            d="M205 350 q14 -8 30 -2 q4 18 -4 30 q-16 6 -30 -2 q-2 -16 4 -26 z"
            fill="#5b6b9b"
            animate={focused ? { y: [0, -1.2, 0] } : { y: 0 }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          />
          {/* head + bun */}
          <circle cx="226" cy="333" r="11" fill="#3f2e2a" />
          <circle cx="219" cy="324" r="5" fill="#34211d" />
        </g>

        {/* potted plant (left foreground) */}
        <g>
          <path
            d="M150 360 q-18 -50 -4 -86 q10 26 18 30 q-14 -34 2 -58 q8 34 16 40 q0 -28 12 -42 q4 40 -6 74 q-6 30 -22 42 z"
            fill="#3f7f63"
          />
          <path
            d="M150 360 q-18 -50 -4 -86 q6 22 12 28"
            fill="none"
            stroke="#56a07c"
            strokeWidth="2"
            opacity="0.6"
          />
          <polygon points="138,356 176,356 170,386 144,386" fill="#c0563f" />
          <polygon points="138,356 176,356 174,362 140,362" fill="#a8412d" />
        </g>

        {/* ================= RIGHT SIDE: loft bed + ladder ================= */}
        {/* loft platform */}
        <polygon points="300,300 465,240 465,256 300,316" fill="#9c6c54" />
        <polygon points="300,300 300,316 360,346 360,330" fill="#6e4435" />
        {/* round roof window */}
        <ellipse cx="408" cy="200" rx="20" ry="26" fill="url(#windowGlow)" />
        <ellipse
          cx="408"
          cy="200"
          rx="20"
          ry="26"
          fill="none"
          stroke="#f3e3c0"
          strokeWidth="3"
        />
        {/* bed */}
        <polygon points="330,300 452,256 452,236 330,280" fill="#f3c6c0" />
        <polygon points="330,300 330,280 360,292 360,312" fill="#e0a9a6" />
        {/* pillow + blanket */}
        <polygon points="338,286 372,274 372,262 338,274" fill="#f7e9e2" />
        <polygon points="372,290 448,262 448,244 372,272" fill="#e89aa0" />

        {/* ladder */}
        <g stroke="#5b4a7a" strokeWidth="5" strokeLinecap="round">
          <line x1="350" y1="318" x2="392" y2="430" />
          <line x1="368" y1="312" x2="410" y2="424" />
          {[0.2, 0.45, 0.7, 0.95].map((t) => (
            <line
              key={`rg-${t}`}
              x1={350 + 18 * t}
              y1={318 + 112 * t}
              x2={368 + 18 * t}
              y2={312 + 112 * t}
              strokeWidth="4"
            />
          ))}
        </g>

        {/* ================= KITCHEN (lower right) ================= */}
        <g>
          {/* counter */}
          <polygon points="392,330 462,306 462,360 392,384" fill="#e3d3cf" />
          <polygon points="392,330 392,384 404,390 404,336" fill="#cdb9b4" />
          <polygon points="392,330 462,306 470,310 400,334" fill="#f1e6e2" />
          {/* sink */}
          <polygon points="410,332 432,324 432,332 410,340" fill="#9fb4c0" />
          {/* stove burners */}
          <circle cx="446" cy="332" r="3.5" fill="#7a5a52" />
          <circle cx="452" cy="340" r="3.5" fill="#7a5a52" />
          {/* utensil jar */}
          <polygon points="398,322 408,318 408,330 398,334" fill="#cf8f93" />
          {/* hanging shelf */}
          <polygon points="420,300 460,286 460,292 420,306" fill="#b58c6a" />
        </g>

        {/* hanging plant (top-left interior) */}
        <g className="origin-top">
          <line x1="262" y1="150" x2="262" y2="196" stroke="#8a5346" strokeWidth="1.5" />
          <ellipse cx="262" cy="202" rx="14" ry="8" fill="#c0563f" />
          <path
            d="M250 200 q4 30 -2 44 M262 204 q2 34 0 50 M274 200 q-2 30 4 42"
            stroke="#56a07c"
            strokeWidth="3"
            fill="none"
            strokeLinecap="round"
          />
        </g>
      </svg>
    </div>
  );
}
