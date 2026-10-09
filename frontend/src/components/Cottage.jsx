import { memo, useId, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import CottageLandscape from "./CottageLandscape";
import { COTTAGE_DESK, COTTAGE_FRAME, GRID, ITEMS, clampToRoom, snap, sortForRender } from "../lib/room";
import { ambienceVars } from "../lib/motion";
import { ITEM_SPRITES } from "./RoomItems";
import RoomTintPicker from "./RoomTintPicker";
import CottageItemControls from "./CottageItemControls";
import { isTypingTarget } from "../lib/typing";

// A wider room fits a study area, separate seating and an open foreground.
// Fit the whole authored frame so furniture and access paths remain visible
// at small desktop sizes. The backdrop extends past the frame to stay full
// bleed on taller windows. Saved decoration coordinates remain unchanged.
const VIEW_BOX = `${COTTAGE_FRAME.x} ${COTTAGE_FRAME.y} ${COTTAGE_FRAME.w} ${COTTAGE_FRAME.h}`;

const SNOWFLAKES = [
  [112, 3], [136, 6], [162, 2], [190, 5], [216, 4], [242, 7], [270, 3],
  [298, 5], [326, 2], [352, 6], [378, 4], [404, 3],
];

// Lighting presets for the window/sky. The room itself (walls, floor, rug,
// curtains) is colored via the theme's CSS variables so switching color
// scheme re-tints the scene along with the rest of the app.
// lampGlow / screenGlow / bulbGlow drive how strongly the desk lamp, laptop
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
// window, desk, laptop) is a fixed shell; the decor is `room` — freeform
// placements the user arranges in edit mode by dragging. Hand-built SVG so it
// scales crisply with no image assets.
function Cottage({
  preview = false,
  setting = "city",
  weather = "off",
  timeOfDay = "night",
  room = [],
  editMode = false,
  onMoveItem,
  onRemoveItem,
  onTintItem,
  onDuplicateItem,
  // resolved by App from the Motion setting + the OS preference
  reduceMotion = false,
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
  const uid = useId();
  const time = { ...(TIME_PRESETS[timeOfDay] || TIME_PRESETS.night),
    static: preview || reduceMotion, lampPool: `${uid}-lampPool`, lampCone: `${uid}-lampCone` };

  useEffect(() => {
    // Gated for reduced motion too — the flash is a photosensitivity
    // concern, and as a transition it escapes the CSS animation block.
    if (weather !== "storm" || reduceMotion) return undefined;
    let timer;
    let flashTimer;
    const scheduleFlash = () => {
      timer = setTimeout(() => {
        setFlash(true);
        flashTimer = setTimeout(() => setFlash(false), 150);
        scheduleFlash();
      }, 4500 + Math.random() * 9000);
    };
    scheduleFlash();
    return () => {
      clearTimeout(timer);
      clearTimeout(flashTimer);
    };
  }, [weather, reduceMotion]);

  // Leaving edit mode drops any selection so no ghost outline lingers.
  useEffect(() => {
    if (!editMode) setSelectedId(null);
  }, [editMode]);

  // Escape deselects first (closing the tint picker); only the NEXT press
  // reaches App's handler and exits decorating. Capture + stopPropagation
  // keeps App's window listener out of this one (same trick as IsoRoom).
  useEffect(() => {
    if (!editMode || !selectedId) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        setSelectedId(null);
        return;
      }
      if (isTypingTarget(e.target)) return;
      const deltas = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
      const delta = deltas[e.key];
      const selected = room.find((p) => p.id === selectedId);
      if (!delta || !selected || ITEMS[selected.item]?.fixed) return;
      e.preventDefault();
      e.stopPropagation();
      const step = GRID * (e.shiftKey ? 5 : 1);
      const next = clampToRoom(selected.item, selected.x + delta[0] * step, selected.y + delta[1] * step);
      onMoveItem?.(selected.id, next.x, next.y);
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [editMode, selectedId, room, onMoveItem]);

  const isRainy = weather === "rain" || weather === "storm";

  /* ---------------- drag engine ---------------- */
  // Screen px -> the SVG's room coords, accounting for the scaled/
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
  };

  const ordered = sortForRender(room);
  const selectedPlacement =
    editMode && selectedId ? room.find((p) => p.id === selectedId) : null;

  const renderPlacement = (p) => {
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
        // ambienceVars rides along the same way (fed from the GRID
        // square, stable across renders): without it every placed
        // plant fell back to --phase: 0s and the flat scene swayed as
        // one body — the exact lockstep the iso room fixed.
        style={{
          ...ambienceVars(p.x / GRID, p.y / GRID),
          ...(p.tint ? { "--tint": p.tint } : null),
        }}
        className={editMode ? (item.fixed ? "room-item-fixed" : "room-item") : undefined}
        role={editMode ? "button" : undefined}
        tabIndex={editMode ? 0 : undefined}
        aria-label={editMode ? `Select ${item.label}` : undefined}
        onKeyDown={(e) => {
          if (editMode && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); setSelectedId(p.id); }
        }}
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
          </>
        )}
      </g>
    );
  };

  const sceneChildren = ordered.map(renderPlacement);

  return (
    <div
      className={`select-none ${preview ? "relative h-28 cottage-preview" : "absolute inset-0"} ${
        editMode ? "pointer-events-auto" : "pointer-events-none"
      }`}
    >
      <svg
        aria-hidden={preview || undefined}
        ref={svgRef}
        viewBox={VIEW_BOX}
        preserveAspectRatio={preview ? "xMidYMid meet" : "xMidYMax meet"}
        className="h-full w-full"
        style={{
          // Without this a touch drag pans/scrolls the page instead of moving
          // the item. Only while decorating, so normal scrolling is unaffected.
          touchAction: editMode ? "none" : undefined,
        }}
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
          <linearGradient id={`${uid}-wallGrad`} gradientUnits="userSpaceOnUse" x1="0" y1="-240" x2="0" y2="480">
            <stop offset="0" style={{ stopColor: "rgb(var(--color-plum))" }} />
            <stop offset="1" style={{ stopColor: "rgb(var(--color-night))" }} />
          </linearGradient>
          <linearGradient id={`${uid}-nightSky`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={time.skyTop} />
            <stop offset="1" stopColor={time.skyBottom} />
          </linearGradient>
          <linearGradient id={`${uid}-floorGrad`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" style={{ stopColor: "rgb(var(--color-wine))" }} />
            <stop offset="1" style={{ stopColor: "rgb(var(--color-void))" }} />
          </linearGradient>
          <pattern id={`${uid}-floorBoards`} patternUnits="userSpaceOnUse" x="-640" y="398" width="400" height="52">
            <path d="M0 0 H400 M0 26 H400" stroke="#26122a" strokeWidth="1.5" opacity=".4" />
            <path d="M100 0 V26 M300 0 V26 M0 26 V52 M200 26 V52 M400 26 V52" stroke="#26122a" strokeWidth="1.5" opacity=".3" />
          </pattern>
          <linearGradient id={`${uid}-screenGrad`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#4a3a6b" />
            <stop offset="1" stopColor="#2c2148" />
          </linearGradient>
          <radialGradient id={`${uid}-lampPool`}>
            <stop offset="0" stopColor="#ffe9b0" />
            <stop offset="1" stopColor="#ffe9b0" stopOpacity="0" />
          </radialGradient>
          <linearGradient id={`${uid}-lampCone`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#ffe9b0" stopOpacity="0.8" />
            <stop offset="1" stopColor="#ffe9b0" stopOpacity="0" />
          </linearGradient>
          <clipPath id={`${uid}-roomClip`}><rect x={COTTAGE_FRAME.x} y={COTTAGE_FRAME.y} width={COTTAGE_FRAME.w} height={COTTAGE_FRAME.h} /></clipPath>
          <clipPath id={`${uid}-skyClip`}>
            <rect x="98" y="46" width="320" height="212" />
          </clipPath>
        </defs>

        {/* Backdrop extends beyond the frame to fill tall and wide windows. */}
        <rect x="-640" y="-960" width="2560" height="1356" fill={`url(#${uid}-wallGrad)`} />

        {/* Low wall panels give the furniture a grounded backdrop. */}
        <rect x="-640" y="320" width="2560" height="70" fill="#000" opacity=".06" />
        <path d="M-640 320 H1920 M-640 324 H1920" stroke="#f7e9e2" opacity=".08" />
        {Array.from({ length: 32 }, (_, i) => <path key={i} d={`M${-628 + i * 80} 333 h64 v45 h-64Z`} fill="none" stroke="#f7e9e2" opacity=".055" />)}

        {/* ---------- Floor ---------- */}
        <g>
          <rect x="-640" y="390" width="2560" height="8" style={{ fill: "rgb(var(--color-petal) / 0.16)" }} />
          <rect x="-640" y="396" width="2560" height={COTTAGE_FRAME.h - 396} fill={`url(#${uid}-floorGrad)`} />
          {/* floorboards */}
          <rect x="-640" y="396" width="2560" height={COTTAGE_FRAME.h - 396} fill={`url(#${uid}-floorBoards)`} />
          {/* soft shadow the desk casts */}
          <ellipse cx="320" cy="402" rx="290" ry="10" fill="#000" opacity="0.18" />
        </g>

        {/* ================= WINDOW ================= */}
        <rect x="88" y="36" width="340" height="232" rx="6" fill="#46396f" />
        <rect x="98" y="46" width="320" height="212" fill={`url(#${uid}-nightSky)`} />

        <g clipPath={`url(#${uid}-skyClip)`}>
          {/* sun or moon */}
          <circle cx="332" cy={time.celestialCy} r={time.celestialR} fill={time.celestialFill} />

          <CottageLandscape setting={setting} time={time} />

          {/* rain streaks. Delays are NEGATIVE, scaled to each drop's own
              duration (the overlay's lesson): a positive delay parks a
              visible streak at its start position until its turn comes, then
              pops it to the 0% keyframe — negative, it's already raining on
              the first frame. */}
          {isRainy &&
            Array.from({ length: weather === "storm" ? 22 : 16 }).map((_, i) => {
              const x = 102 + ((i * 53) % 300);
              const dur = (weather === "storm" ? 0.4 : 0.7) + ((i * 11) % 6) / 10;
              const delay = (-(((i * 13) % 17) / 17) * dur).toFixed(2);
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

          {/* snow flakes — same negative-delay rule as the rain above */}
          {weather === "snow" &&
            SNOWFLAKES.map(([x, r], i) => {
              const dur = 4 + (i % 5);
              return (
                <circle
                  key={`snow-${i}`}
                  className="window-snow"
                  cx={x}
                  cy="46"
                  r={r}
                  fill="rgba(255,255,255,0.85)"
                  style={{
                    animationDuration: `${dur}s`,
                    animationDelay: `${(-(((i * 13) % 17) / 17) * dur).toFixed(2)}s`,
                  }}
                />
              );
            })}

          {/* leaves past the window — the same seasonal cue as the overlay,
              since the window is meant to agree with the sky outside it */}
          {weather === "leaves" &&
            SNOWFLAKES.slice(0, 8).map(([x], i) => {
              const dur = 6 + (i % 4);
              return (
                <rect
                  key={`leaf-${i}`}
                  className="window-snow"
                  x={x}
                  y="46"
                  width={5 + (i % 3)}
                  height={3.5 + (i % 3) * 0.7}
                  rx="2"
                  fill={["#c9622f", "#d98a3c", "#a8452c"][i % 3]}
                  opacity="0.85"
                  style={{
                    animationDuration: `${dur}s`,
                    animationDelay: `${(-(((i * 13) % 17) / 17) * dur).toFixed(2)}s`,
                  }}
                />
              );
            })}

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
        <rect x={COTTAGE_DESK.kneeLeft - 14} y="316" width="14" height={COTTAGE_DESK.floorY - 318} rx="2" fill="#8f5d49" />
        <line x1="65" y1="318" x2="65" y2="396" stroke="#6e4435" strokeWidth="1.5" opacity="0.6" />

        {/* drawer cabinet */}
        <rect x={COTTAGE_DESK.drawers.x} y={COTTAGE_DESK.drawers.y} width={COTTAGE_DESK.drawers.w} height={COTTAGE_DESK.floorY - COTTAGE_DESK.drawers.y} rx="4" fill="#a87f5f" stroke="#8a5346" />
        {[325, 361].map((y, i) => (
          <g key={`drawer-${i}`}>
            <rect x="453" y={y} width="132" height="30" rx="3" fill="#9c6c54" stroke="#8a5346" />
            <rect x="506" y={y + 13} width="26" height="4" rx="2" fill="#6e4435" />
          </g>
        ))}

        {/* desk top: surface + front edge, with a hint of wood grain */}
        <polygon points={`${COTTAGE_DESK.left + 14},292 ${COTTAGE_DESK.right - 14},292 ${COTTAGE_DESK.right},306 ${COTTAGE_DESK.left},306`} fill="#caa07f" />
        <path d="M80 299 q130 -3 250 0 t 220 0" stroke="#b8895f" strokeWidth="1.5" fill="none" opacity="0.5" />
        <path d="M140 295 q90 2 180 0" stroke="#b8895f" strokeWidth="1" fill="none" opacity="0.4" />
        <rect x="30" y="306" width="580" height="12" rx="2" fill="#a87f5f" />
        <line x1="32" y1="307" x2="608" y2="307" stroke="#d8b28c" strokeWidth="1" opacity="0.5" />

        {/* the laptop's cool light pool (the lamp's travels with the lamp) */}
        <ellipse cx="290" cy="298" rx="70" ry="9" fill="#e9ddff" opacity={time.screenGlow * 0.5} />

        {/* Open laptop: a hinged screen, keyboard deck and visible trackpad. */}
        <g role="img" aria-label="Open laptop on the study desk" transform={`translate(290,306) scale(${COTTAGE_DESK.laptopScale}) translate(-290,-306)`}>
          <ellipse cx="290" cy="301" rx="82" ry="4" fill="#3a3142" opacity=".18" />
          <rect x="226" y="207" width="128" height="78" rx="7" fill="#695566" stroke="#3a3142" strokeWidth="2" />
          <rect x="233" y="215" width="114" height="61" rx="3" fill={`url(#${uid}-screenGrad)`} />
          <circle cx="290" cy="211" r="1.3" fill="#2c2438" />
          {/* on-screen task rows */}
          <circle cx="243" cy="228" r="3" fill="#7faf8f" />
          <path d="M241.5 228 l1.2 1.4 l2 -2.6" stroke="#2c2148" strokeWidth="1.2" fill="none" strokeLinecap="round" />
          <rect x="253" y="225" width="61" height="5" rx="2.5" fill="#f3c6c0" opacity="0.75" />
          <circle cx="243" cy="241" r="3" fill="none" stroke="#f3c6c0" strokeWidth="1.5" opacity="0.5" />
          <rect x="253" y="238" width="76" height="5" rx="2.5" fill="#f3c6c0" opacity="0.45" />
          <circle cx="243" cy="254" r="3" fill="none" stroke="#f3c6c0" strokeWidth="1.5" opacity="0.5" />
          <rect x="253" y="251" width="49" height="5" rx="2.5" fill="#f3c6c0" opacity="0.45" />
          <rect x="241" y="266" width="98" height="4" rx="2" fill="#fff" opacity="0.12" />
          <rect x="241" y="266" width="59" height="4" rx="2" fill="#7faf8f" opacity="0.9" />
          {/* glass sheen */}
          <polygon points="233,215 269,215 245,276 233,276" fill="#fff" opacity="0.05" />
          <path d="M232 283 H348" stroke="#3a3142" strokeWidth="3" strokeLinecap="round" />
          <path d="M228 284 H352 L367 301 H213Z" fill="#bda9ad" />
          <path d="M237 287 H343 L350 294 H230Z" fill="#695566" />
          <path d="M235 290 H345 M247 287 l-2 7 M260 287 l-1 7 M273 287 v7 M287 287 v7 M301 287 v7 M315 287 l1 7 M329 287 l2 7" stroke="#bda9ad" strokeWidth=".8" opacity=".6" />
          <rect x="279" y="296" width="22" height="4" rx="1" fill="#a49098" stroke="#8f788d" strokeWidth=".7" />
          <path d="M213 301 H367 Q364 305 359 305 H221 Q216 305 213 301Z" fill="#8f788d" />
          <path d="M276 302 h28" stroke="#cbb8b9" strokeWidth="1.5" strokeLinecap="round" />
        </g>

        {/* ================= PLACED DECORATIONS ================= */}
        <g clipPath={`url(#${uid}-roomClip)`}>{sceneChildren}</g>
      </svg>

      {selectedPlacement && <CottageItemControls key={selectedPlacement.id} placement={selectedPlacement}
        onMove={onMoveItem} onDuplicate={onDuplicateItem} onClose={() => setSelectedId(null)}
        onRemove={(id) => { onRemoveItem?.(id); setSelectedId(null); }} />}

      {/* Colour popover for the selected item — HTML, not SVG, because it
          needs a real text input for hex codes. Anchored inside the scene
          container so it follows the room at any size. */}
      {selectedPlacement && ITEMS[selectedPlacement.item]?.tintable !== false && (
        <RoomTintPicker placement={selectedPlacement} onTint={onTintItem} />
      )}
    </div>
  );
}

// Stable room actions let unrelated store updates skip this heavy SVG. The
// timer has its own provider, so its one-second tick never reaches the scene.
export default memo(Cottage);
