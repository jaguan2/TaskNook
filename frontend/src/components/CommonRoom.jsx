import { memo, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { COMMON_PLACES, resolveCommonProps } from "../lib/commonRooms";
import { floorPatch, isoBox, project, wallRect, WALL_H } from "../lib/iso";
import { footOf, isoDepth, ISO_ITEMS } from "../lib/isoRoom";
import { npcActivity } from "../lib/visiting";
import { levelFor } from "../lib/friendship";
import { ambienceVars } from "../lib/motion";
import { ISO_SPRITES } from "./IsoItems";
import FloorSurface from "./IsoFloorSurface";
import CommonGardenScene from "./CommonGardenScene";
import CommonLibraryScene from "./CommonLibraryScene";
import PersonaNameTag from "./PersonaNameTag";
import IsoContactShadow from "./IsoContactShadow";
import { CottageFloorShade, CottageLightDefs, CottageTableLight, CottageWallLight } from "./CommonCottageLighting";

function Surface({ surface, clipId }) {
  const { gx, gy, dx, dy, z, color } = surface;
  const box = isoBox(gx, gy, dx, dy, z || 7);
  return <>
    <g transform={!z ? "translate(0,7)" : undefined}>
      <polygon points={box.left} fill={z ? "#896b50" : "#705442"} />
      <polygon points={box.right} fill="#705442" />
    </g>
    <g transform={`translate(0,${-z})`}>
      <polygon points={floorPatch(gx, gy, dx, dy)} fill={color} />
      <g clipPath={`url(#${clipId})`}><FloorSurface w={11} d={9} style="boards" /></g>
    </g>
  </>;
}

function Prop({ p, scene, uid, lamp, lampGlow }) {
  const Sprite = ISO_SPRITES[p.item];
  const item = ISO_ITEMS[p.item];
  const at = project(p.gx, p.gy);
  const z = scene.surfaces[p.level || "ground"].z;
  return <g data-common-prop={p.id} transform={`translate(${at.x},${at.y - z - (p._rest || 0)})`}
    style={{ ...(p.tint && { "--tint": p.tint }), ...ambienceVars(p.gx, p.gy) }}>
    {scene.kind === "cottage" && !item.wall && (item.layer || 0) >= 0 && !p._rest &&
      <IsoContactShadow foot={footOf(p.item, p.rot)} height={item.hitH} paint={`${uid}-contact`} />}
    <g transform={p.rot % 2 === 1 ? "scale(-1,1)" : undefined}>
      <Sprite rot={(p.rot || 0) % 2} back={p.rot >= 2} />
    </g>
    {lamp && <CottageTableLight p={p} lamp={lamp} uid={uid} strength={lampGlow} />}
  </g>;
}

function SeatedPerson({ seat, scene, person, character, activity, now, guest, guestRef, onGrab, onChoose }) {
  const Resident = ISO_SPRITES.resident;
  const at = project(seat.gx, seat.gy);
  const z = scene.surfaces[seat.level].z;
  return <g ref={guest ? guestRef : undefined} data-common-person={guest ? "you" : person.username} data-seat={seat.id}
    transform={`translate(${at.x},${at.y - z})`}
    role={guest ? "button" : undefined} tabIndex={guest ? 0 : undefined}
    aria-label={guest ? "Move your character. Drag to an open seat or press Enter to choose." : undefined}
    pointerEvents={guest ? "all" : undefined}
    onPointerDown={guest ? onGrab : undefined}
    onKeyDown={guest ? (e) => {
      if (e.key !== "Enter" && e.key !== " ") return;
      e.preventDefault();
      onChoose();
    } : undefined}
    className={guest ? "cursor-grab active:cursor-grabbing" : undefined}
    style={{ ...ambienceVars(seat.gx, seat.gy), ...(guest && { touchAction: "none" }) }}>
    <ellipse cx="0" cy="10" rx="9" ry="2.5" fill="#302433" opacity=".18" />
    <g transform={`translate(0,${-seat.height})`}>
      <Resident seated seatH={seat.height} character={guest ? character : person.character}
        facing={seat.facing || "front"} activity={guest ? activity : npcActivity(person.username, now).state} />
    </g>
  </g>;
}

function SeatedName({ seat, scene, person, guest, friendship }) {
  const at = project(seat.gx, seat.gy);
  const z = scene.surfaces[seat.level].z;
  const bond = guest ? null : levelFor(friendship?.[person.username] || 0);
  return <PersonaNameTag data-common-name={guest ? "you" : person.username}
    x={at.x} y={at.y - z - seat.height - 27}
    heartProgress={bond?.frac} heartId={guest ? null : person.username}
    heartLabel={bond ? `${person.label}: ${bond.label}` : undefined}>
    {guest ? "You" : person.label}
  </PersonaNameTag>;
}

/** An authored split-level scene. Only seat selection is interactive; neither
 * its architecture nor the user's home layout enters the decoration pipeline. */
export default memo(function CommonRoom({ session, character, activity, timeOfDay, reduceMotion, paused = false, friendship, onChooseSeat }) {
  const scene = COMMON_PLACES[session.sceneId];
  const uid = useId();
  const svgRef = useRef(null);
  const chooserRef = useRef(null);
  const guestRef = useRef(null);
  const returnFocusRef = useRef(false);
  const heldRef = useRef(null);
  const dragRef = useRef(null);
  const [choosing, setChoosing] = useState(false);
  const [hintVisible, setHintVisible] = useState(true);
  const [dragging, setDragging] = useState(false);
  const [dragTargetId, setDragTargetId] = useState(null);
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    if (paused) return undefined;
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(timer);
  }, [paused]);
  useLayoutEffect(() => {
    if (choosing) chooserRef.current?.focus({ preventScroll: true });
    else if (returnFocusRef.current) {
      returnFocusRef.current = false;
      guestRef.current?.focus({ preventScroll: true });
    }
  }, [choosing, session.guestSeatId]);
  useEffect(() => {
    const timer = setTimeout(() => setHintVisible(false), 5_000);
    return () => clearTimeout(timer);
  }, []);
  const people = new Map(session.occupants.map((person) => [person.seatId, person]));
  const guestSeat = scene.seats.find((seat) => seat.id === session.guestSeatId);
  const openSeats = scene.seats.filter((seat) => !people.has(seat.id));
  const closeChooser = () => {
    returnFocusRef.current = true;
    setChoosing(false);
  };
  const choose = (seat) => {
    onChooseSeat(seat.id);
    closeChooser();
  };
  const pointerInScene = (e) => {
    const ctm = svgRef.current?.getScreenCTM();
    if (!ctm) return null;
    return new DOMPoint(e.clientX, e.clientY).matrixTransform(ctm.inverse());
  };
  const seatTargetPoint = (seat) => {
    const at = project(seat.gx, seat.gy);
    return { x: at.x, y: at.y - scene.surfaces[seat.level].z - seat.height + 9 };
  };
  const closestOpenSeat = (x, y) => {
    let closest = null;
    let distance = 44;
    for (const seat of openSeats) {
      const at = seatTargetPoint(seat);
      const next = Math.hypot(x - at.x, y - at.y);
      if (next <= distance) {
        closest = seat;
        distance = next;
      }
    }
    return closest;
  };
  const applyHeldPosition = () => {
    const drag = dragRef.current;
    if (!drag || !heldRef.current) return;
    heldRef.current.setAttribute("transform", `translate(${drag.x},${drag.y - 19})`);
  };
  const startGuestDrag = (e) => {
    if (e.button != null && e.button !== 0) return;
    const point = pointerInScene(e);
    if (!point) return;
    e.stopPropagation();
    const at = project(guestSeat.gx, guestSeat.gy);
    const floor = { x: at.x, y: at.y - scene.surfaces[guestSeat.level].z };
    dragRef.current = {
      pointerId: e.pointerId,
      holdX: point.x - floor.x,
      holdY: point.y - floor.y,
      x: floor.x,
      y: floor.y,
      target: guestSeat,
    };
    setChoosing(false);
    setDragTargetId(guestSeat.id);
    setDragging(true);
    svgRef.current?.setPointerCapture?.(e.pointerId);
  };
  const moveGuestDrag = (e) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;
    const point = pointerInScene(e);
    if (!point) return;
    drag.x = point.x - drag.holdX;
    drag.y = point.y - drag.holdY;
    applyHeldPosition();
    const target = closestOpenSeat(point.x, point.y);
    if (target?.id === drag.target?.id) return;
    drag.target = target;
    setDragTargetId(target?.id || null);
  };
  const endGuestDrag = (e) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;
    dragRef.current = null;
    setDragging(false);
    setDragTargetId(null);
    if (svgRef.current?.hasPointerCapture?.(e.pointerId)) svgRef.current.releasePointerCapture(e.pointerId);
    if (e.type === "pointerup" && drag.target && drag.target.id !== session.guestSeatId) {
      onChooseSeat(drag.target.id);
    }
  };
  const clip = (level) => `${uid}-${level}`;
  const glow = timeOfDay === "night" ? 0.62 : timeOfDay === "sunset" ? 0.52 : 0.2;
  const lampGlow = timeOfDay === "night" ? 1 : timeOfDay === "sunset" ? 0.82 : 0.34;
  const windowFill = timeOfDay === "night" ? "#4d4a67" : timeOfDay === "sunset" ? "#d79a68" : "#b7cbcb";
  const props = resolveCommonProps(scene);
  const layers = (level, part = "all") => {
    const entries = props.filter((p) => (p.level || "ground") === level)
      .filter((p) => part === "all" || (part === "wall") === !!ISO_ITEMS[p.item].wall)
      .map((p) => ({ id: p.id, depth: p._depth ?? isoDepth(p),
        layer: ISO_ITEMS[p.item].layer || 0, p }));
    for (const seat of part === "wall" ? [] : scene.seats.filter((seat) => seat.level === level)) {
      const person = people.get(seat.id);
      const guest = seat.id === session.guestSeatId;
      if ((!person && !guest) || (guest && dragging)) continue;
      const furniture = scene.props.find((p) => p.id === seat.furniture);
      entries.push({ id: `person-${seat.id}`, layer: 0, depth: isoDepth(furniture) + (seat.facing === "back" ? -0.01 : 0.01), seat, person, guest });
    }
    return entries.sort((a, b) => a.layer - b.layer || a.depth - b.depth)
      .map((entry) => entry.p ? <Prop key={entry.id} p={entry.p} scene={scene} uid={uid} lampGlow={lampGlow}
        lamp={scene.kind === "cottage" && ISO_ITEMS[entry.p.item].surface
          ? props.find((p) => p.on === entry.id && ISO_ITEMS[p.item].glow && !p.off) : null} /> :
        <SeatedPerson key={entry.id} {...entry} scene={scene} character={character} activity={activity} now={now}
          guestRef={guestRef}
          onGrab={startGuestDrag} onChoose={() => setChoosing(true)} />);
  };
  // Floor lift and clip share one coordinate space. Lifting only each pool
  // left the raised nook's wall-sconce glow outside an unlifted floor clip.
  const lightPools = (level) => <g transform={`translate(0,${-scene.surfaces[level].z})`} clipPath={`url(#${clip(level)})`}>
    {props.filter((p) => (p.level || "ground") === level).map((p) => {
      const item = ISO_ITEMS[p.item];
      if (!item.glow || p.off) return null;
      const [w, d] = footOf(p.item, p.rot);
      const at = project(p.gx + w / 2, p.gy + d / 2);
      const [radius, strength] = item.glow;
      return <g key={`pool-${p.id}`} data-common-light={p.id}
        opacity={strength * lampGlow} style={ambienceVars(p.gx, p.gy)}>
        <ellipse className={item.flicker ? "pool-flicker" : "pool-breathe"}
          cx={at.x} cy={at.y} rx={radius} ry={radius * 0.5} fill={`url(#${uid}-lamp-pool)`} />
      </g>;
    })}
  </g>;
  const P = (gx, gy, z = 0) => { const p = project(gx, gy); return `${p.x},${p.y - z}`; };
  // The raised nook used to lift only the rear portion of the shell, leaving
  // a tower-like step in the cottage silhouette. Keep its existing ceiling
  // clearance, but carry that roof elevation continuously across both walls.
  const cottageRoofH = WALL_H + (scene.surfaces.nook?.z || 0);
  const partitionStart = project(6.5, 0);
  const partitionEnd = project(6.5, 4);
  const partitionBulbs = Array.from({ length: 8 }, (_, i) => {
    const t = (i + 0.5) / 8;
    return {
      x: partitionStart.x + (partitionEnd.x - partitionStart.x) * t,
      y: partitionStart.y + (partitionEnd.y - partitionStart.y) * t - 104 + Math.sin(t * Math.PI) * 7,
    };
  });
  return <div className="absolute inset-0 overflow-hidden" data-common-room={scene.id}>
    <svg ref={svgRef} viewBox={scene.viewBox || "-260 -190 580 470"}
      className={`h-full w-full ${reduceMotion ? "cottage-preview" : scene.kind === "library" ? "common-library-calm" : ""}`} role="img" aria-label={scene.ariaLabel}
      onPointerMove={moveGuestDrag} onPointerUp={endGuestDrag} onPointerCancel={endGuestDrag}
      onLostPointerCapture={endGuestDrag}>
      <defs>
        {scene.kind === "cottage" && <CottageLightDefs uid={uid} />}
        <linearGradient id="isoScreen" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#4a3a6b" /><stop offset="1" stopColor="#2c2148" />
        </linearGradient>
        <linearGradient id="isoSky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={timeOfDay === "night" ? "#343754" : timeOfDay === "sunset" ? "#b96f69" : "#9fc5cc"} />
          <stop offset="1" stopColor={timeOfDay === "night" ? "#67617b" : timeOfDay === "sunset" ? "#efb276" : "#d5e2dc"} />
        </linearGradient>
        {Object.entries(scene.surfaces).map(([level, s]) => <clipPath key={level} id={clip(level)}>
          <polygon points={floorPatch(s.gx, s.gy, s.dx, s.dy)} />
        </clipPath>)}
        <radialGradient id={`${uid}-light`}><stop stopColor="#ffe8ab" /><stop offset="1" stopColor="#ffe8ab" stopOpacity="0" /></radialGradient>
        <radialGradient id={`${uid}-lamp-pool`}><stop stopColor="#ffe6a7" stopOpacity=".85" /><stop offset="1" stopColor="#ffe6a7" stopOpacity="0" /></radialGradient>
      </defs>
      <g pointerEvents="none">
        {scene.kind === "library" ? (
          <CommonLibraryScene scene={scene} uid={uid} clip={clip} glow={glow} lampGlow={lampGlow}
            timeOfDay={timeOfDay} layers={layers} lightPools={lightPools} />
        ) : scene.kind === "garden" ? (
          <CommonGardenScene scene={scene} uid={uid} clip={clip} glow={glow}
            layers={layers} lightPools={lightPools} />
        ) : <>
        {/* Rear walls and windows are deliberately behind every floor level. */}
        <polygon data-common-shell-wall="left" points={wallRect("left", 0, scene.d, 0, cottageRoofH)} fill="#a89484" />
        <polygon data-common-shell-wall="right" points={wallRect("right", 0, scene.w, 0, cottageRoofH)} fill="#8f817c" />
        {/* Panelling and a continuous rail make the walls feel furnished even
            where a shelf cannot fit, echoing the reference's blue wainscot. */}
        <polygon points={wallRect("left", 0, 9, 0, 43)} fill="#746e69" opacity=".55" />
        <polygon points={wallRect("right", 0, 11, 0, 43)} fill="#6a625f" opacity=".5" />
        <polygon points={wallRect("left", 0, 9, 41, 4)} fill="#d0b18c" />
        <polygon points={wallRect("right", 0, 11, 41, 4)} fill="#c39f7d" />
        {[1.5, 3, 4.5, 6, 7.5].map((t) => <path key={`left-panel-${t}`}
          d={`M${P(0, t)} L${P(0, t, 40)}`} stroke="#4f4a49" strokeWidth="1" opacity=".22" />)}
        {[1.6, 3.2, 4.8, 8.8, 10.4].map((t) => <path key={`right-panel-${t}`}
          d={`M${P(t, 0)} L${P(t, 0, 40)}`} stroke="#4f4746" strokeWidth="1" opacity=".22" />)}
        <CottageWallLight uid={uid} roofH={cottageRoofH} strength={lampGlow} />
        <polygon points={wallRect("left", 0.4, 2.3, 55, 70)} fill="#c6a980" stroke="#e0c59d" strokeWidth="4" />
        <polygon points={wallRect("left", 0.5, 2.1, 59, 62)} fill={windowFill} />
        <polygon points={wallRect("right", 6.1, 2.3, 36, 66)} fill="#c6a980" stroke="#d8bd94" strokeWidth="4" />
        <polygon points={wallRect("right", 6.2, 2.1, 40, 58)} fill={windowFill} />
        {(timeOfDay === "night" || timeOfDay === "sunset") && <>
          <polygon points={wallRect("left", 0.5, 2.1, 59, 62)} fill="#ffd38b" opacity=".16" />
          <polygon points={wallRect("right", 6.2, 2.1, 40, 58)} fill="#ffd38b" opacity=".2" />
        </>}
        <path d={`M${P(0, 1.55, 59)} L${P(0, 1.55, 121)} M${P(7.25, 0, 40)} L${P(7.25, 0, 98)}`} stroke="#ddc29b" strokeWidth="3" />
        <Surface surface={scene.surfaces.ground} clipId={clip("ground")} />
        <Surface surface={scene.surfaces.nook} clipId={clip("nook")} />
        <CottageFloorShade surface={scene.surfaces.ground} clipId={clip("ground")} />
        <CottageFloorShade surface={scene.surfaces.nook} clipId={clip("nook")} />
        {/* Solid risers meet the platform; the lower step is nearest. */}
        {[36, 24, 12].map((h, i) => { const b = isoBox(3.15, 3.1 + i * 0.5, 1.25, 0.5, h); return <g key={h}>
          <polygon points={b.left} fill="#8d7054" /><polygon points={b.right} fill="#755c48" /><polygon points={b.top} fill="#ceb190" />
        </g>; })}
        <g transform="translate(0,-36)" clipPath={`url(#${clip("nook")})`}>
          <ellipse cx="-10" cy="40" rx="55" ry="30" fill={`url(#${uid}-light)`} opacity={glow} />
        </g>
        {lightPools("nook")}
        {layers("nook")}
        {/* Rear-wall details belong behind the freestanding timber. Leaving
            them in the furniture stack let the corkboard paint over a beam. */}
        {layers("ground", "wall")}
        {/* A dressed open partition gives the two lower zones a threshold
            without covering either study seat: timber, vine and dim bulbs. */}
        <g data-common-partition="true">
        <path d={`M${P(6.5, 0, 111)} L${P(6.5, 4, 111)} L${P(6.5, 4)}`}
          fill="none" stroke="#8f694f" strokeWidth="11" strokeLinejoin="round" />
        <path d={`M${P(6.5, 0, 106)} L${P(6.5, 4, 106)}`}
          fill="none" stroke="#d1ae83" strokeWidth="2.5" />
        <path d={`M${partitionStart.x} ${partitionStart.y - 105} Q${(partitionStart.x + partitionEnd.x) / 2} ${partitionEnd.y - 91} ${partitionEnd.x} ${partitionEnd.y - 105}`}
          fill="none" stroke="#544b43" strokeWidth="1.2" />
        {partitionBulbs.map((bulb, i) => <g key={`partition-bulb-${i}`} data-partition-bulb="true">
          <circle cx={bulb.x} cy={bulb.y} r="5" fill="#ffd890" opacity=".11" />
          <circle cx={bulb.x} cy={bulb.y} r="1.7" fill="#ffe5a5" />
          {i % 2 === 0 && <ellipse cx={bulb.x - 3} cy={bulb.y - 4} rx="4.2" ry="1.8"
            fill="#4f7f60" transform={`rotate(${-24 + i * 7} ${bulb.x - 3} ${bulb.y - 4})`} />}
        </g>)}
        </g>
        <g clipPath={`url(#${clip("ground")})`}><ellipse cx="-7" cy="161" rx="90" ry="45" fill={`url(#${uid}-light)`} opacity={glow} /></g>
        {lightPools("ground")}
        {layers("ground", "floor")}
        </>}
      </g>
      {/* Seat targets are the only interactive scene elements. A separate HTML
          list offers larger touch targets and the same choices by keyboard. */}
      {(choosing || dragging) && scene.seats.map((seat) => {
        const at = seatTargetPoint(seat);
        const occupied = people.get(seat.id);
        if (dragging && occupied) return null;
        const targeted = seat.id === dragTargetId;
        return <g key={seat.id} transform={`translate(${at.x},${at.y})`}
          data-drop-seat={seat.id}
          role={choosing ? "button" : undefined} tabIndex={choosing && !occupied ? 0 : -1}
          aria-label={choosing ? (occupied ? `${seat.label}: ${occupied.label}` : `Sit at ${seat.label}`) : undefined}
          aria-disabled={choosing ? !!occupied : undefined} className={choosing && !occupied ? "cursor-pointer" : undefined}
          pointerEvents={choosing ? "all" : "none"}
          onClick={() => choosing && !occupied && choose(seat)}
          onKeyDown={(e) => { if (choosing && !occupied && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); choose(seat); } }}>
          <title>{occupied ? `${occupied.label} is sitting here` : seat.label}</title>
          <ellipse className={!reduceMotion && !occupied ? "pool-breathe" : undefined}
            rx={targeted ? 20 : 17} ry={targeted ? 12 : 10}
            fill={occupied ? "#847b79" : targeted ? "#ffe2a0" : "#f5cf83"} fillOpacity={targeted ? ".7" : ".45"}
            stroke={occupied ? "#b8a99a" : "#ffdf9f"} strokeWidth={targeted ? 2.4 : 1.5} />
        </g>;
      })}
      {/* Identity belongs to the people, not the furniture depth stack. Paint
          it last enough that a nearer prop can never bury who is sitting where. */}
      {scene.seats.map((seat) => {
        const person = people.get(seat.id);
        const guest = seat.id === session.guestSeatId;
        if ((!person && !guest) || (guest && dragging)) return null;
        return <SeatedName key={`name-${seat.id}`} seat={seat} scene={scene}
          person={person} guest={guest} friendship={friendship} />;
      })}
      {dragging && <g data-common-held="true" pointerEvents="none" ref={(node) => {
        heldRef.current = node;
        if (node) applyHeldPosition();
      }}>
        <ISO_SPRITES.resident held character={character} />
        <PersonaNameTag data-common-name="you" y="-52">You</PersonaNameTag>
      </g>}
    </svg>
    {(hintVisible || choosing) && <div
      className={choosing
        ? "common-seat-picker absolute right-6 top-6 z-40 w-[min(24rem,calc(100%-6rem))] rounded-2xl p-2 shadow-soft"
        : "common-seat-hint absolute top-6 left-1/2 z-20 w-max max-w-[min(30rem,calc(100%-2rem))] -translate-x-1/2 text-center"}
      onKeyDown={(event) => {
        if (choosing && event.key === "Escape") {
          event.preventDefault();
          event.stopPropagation();
          closeChooser();
        }
      }}>
      <button ref={chooserRef} type="button" aria-expanded={choosing}
        onClick={() => choosing ? closeChooser() : setChoosing(true)}
        aria-label={choosing ? "Close seat chooser" : `Drag and drop to change seats. Current seat: ${guestSeat.label}. Click to choose from a list.`}
        className="pill glass px-4 py-2 text-xs font-semibold text-cream shadow-soft hover:bg-white/10">
        {choosing ? "Done choosing" : "Drag and drop to change seats"}
      </button>
      {choosing && <div className="cozy-scroll mt-2 flex max-h-[min(24rem,calc(100dvh-10rem))] flex-wrap gap-1.5 overflow-y-auto rounded-xl p-1 text-left" role="group" aria-label="Common room seats">
        {scene.seats.map((seat) => { const person = people.get(seat.id); return <button key={seat.id} type="button"
          disabled={!!person} aria-pressed={seat.id === session.guestSeatId} onClick={() => choose(seat)}
          className={`pill px-3 py-2 text-xs disabled:opacity-50 ${seat.id === session.guestSeatId ? "bg-glow/20 text-glow" : "text-cream hover:bg-white/10"}`}>
          {seat.label}{person ? ` · ${person.label}` : ""}
        </button>; })}
      </div>}
    </div>}
  </div>;
});
