import { memo, useEffect, useId, useRef, useState } from "react";
import { COMMON_PLACES, resolveCommonProps } from "../lib/commonRooms";
import { floorPatch, isoBox, project, wallRect } from "../lib/iso";
import { footOf, isoDepth, ISO_ITEMS } from "../lib/isoRoom";
import { npcActivity } from "../lib/visiting";
import { ambienceVars } from "../lib/motion";
import { ISO_SPRITES } from "./IsoItems";
import FloorSurface from "./IsoFloorSurface";
import CommonGardenScene from "./CommonGardenScene";

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

function Prop({ p, scene }) {
  const Sprite = ISO_SPRITES[p.item];
  const at = project(p.gx, p.gy);
  const z = scene.surfaces[p.level || "ground"].z;
  return <g data-common-prop={p.id} transform={`translate(${at.x},${at.y - z - (p._rest || 0)})`}
    style={{ ...(p.tint && { "--tint": p.tint }), ...ambienceVars(p.gx, p.gy) }}>
    <g transform={p.rot % 2 === 1 ? "scale(-1,1)" : undefined}>
      <Sprite rot={(p.rot || 0) % 2} back={p.rot >= 2} />
    </g>
  </g>;
}

function SeatedPerson({ seat, scene, person, character, activity, now, guest }) {
  const Resident = ISO_SPRITES.resident;
  const at = project(seat.gx, seat.gy);
  const z = scene.surfaces[seat.level].z;
  return <g data-common-person={guest ? "you" : person.username} data-seat={seat.id}
    transform={`translate(${at.x},${at.y - z})`}
    style={ambienceVars(seat.gx, seat.gy)}>
    <ellipse cx="0" cy="10" rx="9" ry="2.5" fill="#302433" opacity=".18" />
    <g transform={`translate(0,${-seat.height})`}>
      <Resident seated seatH={seat.height} character={guest ? character : person.character}
        facing={seat.facing || "front"} activity={guest ? activity : npcActivity(person.username, now).state} />
    </g>
  </g>;
}

/** An authored split-level scene. Only seat selection is interactive; neither
 * its architecture nor the user's home layout enters the decoration pipeline. */
export default memo(function CommonRoom({ session, character, activity, timeOfDay, reduceMotion, onChooseSeat }) {
  const scene = COMMON_PLACES[session.sceneId];
  const uid = useId();
  const chooserRef = useRef(null);
  const [choosing, setChoosing] = useState(false);
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(timer);
  }, []);
  const people = new Map(session.occupants.map((person) => [person.seatId, person]));
  const guestSeat = scene.seats.find((seat) => seat.id === session.guestSeatId);
  const choose = (seat) => {
    onChooseSeat(seat.id);
    setChoosing(false);
    // The selected target unmounts with the list. Keep keyboard users on the
    // persistent chooser rather than dropping focus onto the document body.
    chooserRef.current?.focus({ preventScroll: true });
  };
  const clip = (level) => `${uid}-${level}`;
  const glow = timeOfDay === "night" ? 0.62 : timeOfDay === "sunset" ? 0.52 : 0.2;
  const lampGlow = timeOfDay === "night" ? 1 : timeOfDay === "sunset" ? 0.82 : 0.34;
  const windowFill = timeOfDay === "night" ? "#4d4a67" : timeOfDay === "sunset" ? "#d79a68" : "#b7cbcb";
  const props = resolveCommonProps(scene);
  const layers = (level) => {
    const entries = props.filter((p) => (p.level || "ground") === level)
      .map((p) => ({ id: p.id, depth: p._depth ?? isoDepth(p),
        layer: ISO_ITEMS[p.item].layer || 0, p }));
    for (const seat of scene.seats.filter((seat) => seat.level === level)) {
      const person = people.get(seat.id);
      const guest = seat.id === session.guestSeatId;
      if (!person && !guest) continue;
      const furniture = scene.props.find((p) => p.id === seat.furniture);
      entries.push({ id: `person-${seat.id}`, layer: 0, depth: isoDepth(furniture) + (seat.facing === "back" ? -0.01 : 0.01), seat, person, guest });
    }
    return entries.sort((a, b) => a.layer - b.layer || a.depth - b.depth)
      .map((entry) => entry.p ? <Prop key={entry.id} p={entry.p} scene={scene} /> :
        <SeatedPerson key={entry.id} {...entry} scene={scene} character={character} activity={activity} now={now} />);
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
    <svg viewBox="-260 -190 580 470" className={`h-full w-full ${reduceMotion ? "cottage-preview" : ""}`} role="img" aria-label={scene.ariaLabel}>
      <defs>
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
        {scene.kind === "garden" ? (
          <CommonGardenScene scene={scene} uid={uid} clip={clip} glow={glow}
            layers={layers} lightPools={lightPools} />
        ) : <>
        <ellipse cx="20" cy="208" rx="215" ry="33" fill="#241d2b" opacity=".17" />
        {/* Rear walls and windows are deliberately behind every floor level. */}
        <polygon points={`${P(0, 0)} ${P(0, 9)} ${P(0, 9, 118)} ${P(0, 3.1, 118)} ${P(0, 3.1, 154)} ${P(0, 0, 154)}`} fill="#a89484" />
        <polygon points={`${P(0, 0)} ${P(11, 0)} ${P(11, 0, 118)} ${P(4.4, 0, 118)} ${P(4.4, 0, 154)} ${P(0, 0, 154)}`} fill="#8f817c" />
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
        {/* Solid risers meet the platform; the lower step is nearest. */}
        {[36, 24, 12].map((h, i) => { const b = isoBox(3.15, 3.1 + i * 0.5, 1.25, 0.5, h); return <g key={h}>
          <polygon points={b.left} fill="#8d7054" /><polygon points={b.right} fill="#755c48" /><polygon points={b.top} fill="#ceb190" />
        </g>; })}
        <g transform="translate(0,-36)" clipPath={`url(#${clip("nook")})`}>
          <ellipse cx="-10" cy="40" rx="55" ry="30" fill={`url(#${uid}-light)`} opacity={glow} />
        </g>
        {lightPools("nook")}
        {layers("nook")}
        {/* A dressed open partition gives the two lower zones a threshold
            without covering either study seat: timber, vine and dim bulbs. */}
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
        <g clipPath={`url(#${clip("ground")})`}><ellipse cx="-7" cy="161" rx="90" ry="45" fill={`url(#${uid}-light)`} opacity={glow} /></g>
        {lightPools("ground")}
        {layers("ground")}
        </>}
      </g>
      {/* Seat targets are the only interactive scene elements. A separate HTML
          list offers larger touch targets and the same choices by keyboard. */}
      {choosing && scene.seats.map((seat) => {
        const at = project(seat.gx, seat.gy);
        const occupied = people.get(seat.id);
        return <g key={seat.id} transform={`translate(${at.x},${at.y - scene.surfaces[seat.level].z - seat.height})`}
          role="button" tabIndex={occupied ? -1 : 0} aria-label={occupied ? `${seat.label}: ${occupied.label}` : `Sit at ${seat.label}`}
          aria-disabled={!!occupied} className={occupied ? "" : "cursor-pointer"}
          onClick={() => !occupied && choose(seat)}
          onKeyDown={(e) => { if (!occupied && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); choose(seat); } }}>
          <title>{occupied ? `${occupied.label} is sitting here` : seat.label}</title>
          <ellipse cy="9" rx="17" ry="10" fill={occupied ? "#847b79" : "#f5cf83"} fillOpacity=".45"
            stroke={occupied ? "#b8a99a" : "#ffdf9f"} strokeWidth="1.5" />
        </g>;
      })}
    </svg>
    <div className="absolute bottom-20 left-6 z-20 max-w-[min(28rem,calc(100%-3rem))]">
      <button ref={chooserRef} type="button" aria-expanded={choosing} onClick={() => setChoosing((open) => !open)}
        className="pill glass px-3 py-2 text-xs font-semibold text-cream hover:bg-white/10">
        {choosing ? "Done choosing" : `Change seat · ${guestSeat.label}`}
      </button>
      {choosing && <div className="glass mt-2 flex flex-wrap gap-1.5 rounded-2xl p-2" role="group" aria-label="Common room seats">
        {scene.seats.map((seat) => { const person = people.get(seat.id); return <button key={seat.id} type="button"
          disabled={!!person} aria-pressed={seat.id === session.guestSeatId} onClick={() => choose(seat)}
          className={`pill px-3 py-2 text-xs disabled:opacity-50 ${seat.id === session.guestSeatId ? "bg-glow/20 text-glow" : "text-cream hover:bg-white/10"}`}>
          {seat.label}{person ? ` · ${person.label}` : ""}
        </button>; })}
      </div>}
    </div>
  </div>;
});
