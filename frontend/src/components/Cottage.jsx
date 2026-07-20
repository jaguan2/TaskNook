import { memo, useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ITEMS, clampToRoom, snap, sortForRender } from "../lib/room";
import { ITEM_SPRITES } from "./RoomItems";
import RoomTintPicker from "./RoomTintPicker";

// The scene scales with the window instead of being pinned to a fixed max
// width: whichever viewport budget is smaller wins, so the 4:3 room grows as
// the app is resized and never outgrows its space. 84vh of *width* is 63vh of
// height at this aspect ratio, which clears the top bar and the focus timer.
const SCENE_WIDTH = "min(90vw, 84vh)";

const SNOWFLAKES = [
  [112, 3], [136, 6], [162, 2], [190, 5], [216, 4], [242, 7], [270, 3],
  [298, 5], [326, 2], [352, 6], [378, 4], [404, 3],
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

// A cozy lofi-style desk by a rainy night window. The structure (walls,
// window, desk, monitor) is a fixed shell; the decor is `room` — freeform
// placements the user arranges in edit mode by dragging. Hand-built SVG so it
// scales crisply with no image assets.
function Cottage({
  weather = "off",
  timeOfDay = "night",
  room = [],
  editMode = false,
  scale = 1,
  onMoveItem,
  onRemoveItem,
  onTintItem,
  onDragEnd,
}) {
  const [flash, setFlash] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  // Mirrors dragRef.current?.id purely so the dragged item can render lifted.
  // (The ref drives the maths; this drives the visuals.)
  const [draggingId, setDraggingId] = useState(null);
  const svgRef = useRef(null);
  // { id, dx, dy } while a drag is in flight — offset keeps the grab point
  // under the cursor instead of snapping the origin to it.
  const dragRef = useRef(null);
  const reduceMotion = useReducedMotion();
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

  // Leaving edit mode drops any selection so no ghost outline lingers.
  useEffect(() => {
    if (!editMode) setSelectedId(null);
  }, [editMode]);

  const isRainy = weather === "rain" || weather === "storm";

  /* ---------------- drag engine ---------------- */
  // Screen px -> the SVG's 640x480 viewBox coords, accounting for the scaled/
  // letterboxed rendering (and the intro zoom transform, via the CTM).
  const toScene = (e) => {
    const svg = svgRef.current;
    const ctm = svg?.getScreenCTM();
    if (!ctm) return null;
    return new DOMPoint(e.clientX, e.clientY).matrixTransform(ctm.inverse());
  };

  const startDrag = (placement) => (e) => {
    if (!editMode) return;
    e.stopPropagation();
    setSelectedId(placement.id);
    if (ITEMS[placement.item].fixed) return; // selectable (for ✕) but pinned
    const p = toScene(e);
    if (!p) return;
    dragRef.current = { id: placement.id, item: placement.item, dx: p.x - placement.x, dy: p.y - placement.y };
    setDraggingId(placement.id);
    // Capture on the <svg>, not this <g>: sortForRender reorders the item
    // groups as their y changes, and React re-creating/moving the captured
    // element mid-drag would silently drop the capture. The svg is stable.
    svgRef.current?.setPointerCapture?.(e.pointerId);
  };

  const moveDrag = (e) => {
    const drag = dragRef.current;
    if (!drag) return;
    const p = toScene(e);
    if (!p) return;
    const { x, y } = clampToRoom(drag.item, snap(p.x - drag.dx), snap(p.y - drag.dy));
    onMoveItem?.(drag.id, x, y);
  };

  const endDrag = () => {
    if (!dragRef.current) return;
    dragRef.current = null;
    setDraggingId(null);
    onDragEnd?.();
  };

  const ordered = sortForRender(room);
  const selectedPlacement =
    editMode && selectedId ? room.find((p) => p.id === selectedId) : null;

  return (
    <div
      className={`select-none relative w-full flex items-center justify-center ${
        editMode ? "pointer-events-auto" : "pointer-events-none"
      }`}
    >
      <svg
        ref={svgRef}
        viewBox="0 0 640 480"
        style={{
          // Responsive base size × the user's own size preference (Room panel).
          width: `calc(${SCENE_WIDTH} * ${scale})`,
          // Without this a touch drag pans/scrolls the page instead of moving
          // the item. Only while decorating, so normal scrolling is unaffected.
          touchAction: editMode ? "none" : undefined,
        }}
        className="drop-shadow-[0_30px_60px_rgba(0,0,0,0.45)]"
        onPointerMove={moveDrag}
        onPointerUp={endDrag}
        onPointerLeave={endDrag}
        // Touch drags end with pointercancel, not pointerup — without this a
        // touch drag would leave the engine stuck mid-drag.
        onPointerCancel={endDrag}
        onPointerDown={() => editMode && setSelectedId(null)}
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

        {/* ---------- Floor ---------- */}
        <g clipPath="url(#roomClip)">
          <rect x="8" y="390" width="624" height="8" style={{ fill: "rgb(var(--color-petal) / 0.16)" }} />
          <rect x="8" y="396" width="624" height="76" fill="url(#floorGrad)" />
          {/* floorboards */}
          <line x1="8" y1="420" x2="632" y2="420" stroke="#26122a" strokeWidth="1.5" opacity="0.4" />
          <line x1="8" y1="446" x2="632" y2="446" stroke="#26122a" strokeWidth="1.5" opacity="0.4" />
          {[[130, 398, 420], [340, 398, 420], [540, 398, 420], [220, 420, 446], [450, 420, 446], [90, 446, 470], [380, 446, 470]].map(([x, y1, y2], i) => (
            <line key={`board-${i}`} x1={x} y1={y1} x2={x} y2={y2} stroke="#26122a" strokeWidth="1.5" opacity="0.3" />
          ))}
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

        {/* the monitor's cool light pool (the lamp's travels with the lamp) */}
        <ellipse cx="290" cy="298" rx="70" ry="9" fill="#e9ddff" opacity={time.screenGlow * 0.5} />

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

        {/* ================= PLACED ITEMS ================= */}
        <g clipPath="url(#roomClip)">
          {ordered.map((p) => {
            const item = ITEMS[p.item];
            const Sprite = ITEM_SPRITES[p.item];
            if (!item || !Sprite) return null;
            const selected = editMode && selectedId === p.id;
            return (
              <g
                key={p.id}
                transform={`translate(${p.x},${p.y})`}
                // The user's colour choice rides a CSS variable; sprites paint
                // their main material with var(--tint, <classic colour>).
                style={p.tint ? { "--tint": p.tint } : undefined}
                className={editMode ? (item.fixed ? "room-item-fixed" : "room-item") : undefined}
                onPointerDown={startDrag(p)}
              >
                {/* generous invisible grab target */}
                {editMode && (
                  <rect
                    x={item.hit.x}
                    y={item.hit.y}
                    width={item.hit.w}
                    height={item.hit.h}
                    fill="transparent"
                  />
                )}
                {/* The scale lives on an INNER group: framer-motion writes its
                    own inline `transform`, which would overwrite the parent's
                    translate() and fling the item to the origin. */}
                <motion.g
                  initial={reduceMotion ? false : { scale: 0.4, opacity: 0 }}
                  animate={{
                    scale: draggingId === p.id && !reduceMotion ? 1.07 : 1,
                    opacity: 1,
                  }}
                  transition={{ type: "spring", stiffness: 420, damping: 26 }}
                  style={{ transformBox: "fill-box", transformOrigin: "center" }}
                >
                  <Sprite time={time} />
                </motion.g>
                {selected && (
                  <>
                    <rect
                      x={item.hit.x - 4}
                      y={item.hit.y - 4}
                      width={item.hit.w + 8}
                      height={item.hit.h + 8}
                      rx="6"
                      fill="none"
                      stroke="#ffe9b0"
                      strokeWidth="1.5"
                      strokeDasharray="5 4"
                      opacity="0.9"
                    />
                    <g
                      className="room-remove"
                      onPointerDown={(e) => {
                        e.stopPropagation();
                        onRemoveItem?.(p.id);
                        setSelectedId(null);
                      }}
                    >
                      <circle cx={item.hit.x + item.hit.w + 6} cy={item.hit.y - 6} r="9" fill="#d96a6a" />
                      <path
                        d={`M${item.hit.x + item.hit.w + 2} ${item.hit.y - 10} l8 8 M${item.hit.x + item.hit.w + 10} ${item.hit.y - 10} l-8 8`}
                        stroke="#fff"
                        strokeWidth="2"
                        strokeLinecap="round"
                      />
                    </g>
                  </>
                )}
              </g>
            );
          })}
        </g>
      </svg>

      {/* Colour popover for the selected item — HTML, not SVG, because it
          needs a real text input for hex codes. Anchored inside the scene
          container so it follows the room at any size. */}
      {selectedPlacement && ITEMS[selectedPlacement.item]?.tintable !== false && (
        <RoomTintPicker placement={selectedPlacement} onTint={onTintItem} />
      )}
    </div>
  );
}

// The store's context value changes every second (the focus timer ticks), so
// every consumer — including this fairly heavy SVG — re-renders each second by
// default. None of Cottage's props change on a tick, so memoising skips that
// work entirely and keeps the idle animations smooth. Relies on the room
// action props being stable (they're useCallback'd in store.jsx).
export default memo(Cottage);
