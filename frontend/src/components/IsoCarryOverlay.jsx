import { floorPatch } from "../lib/iso";
import { levelFor } from "../lib/friendship";
import { ISO_ITEMS, footOf, seatFor } from "../lib/isoRoom";
import { ISO_SPRITES } from "./IsoItems";
import PersonaNameTag from "./PersonaNameTag";

function HeldFigure({ walk, character, personaInfo, label, friendship }) {
  if (!walk) return null;
  const item = ISO_ITEMS[walk.item];
  const Sprite = ISO_SPRITES[walk.item];
  if (!item || !Sprite) return null;
  const sprite = (
    <Sprite held character={item.self ? character : personaInfo?.character} look={walk.look} />
  );
  const bond = personaInfo?.npcUsername
    ? levelFor(friendship?.[personaInfo.npcUsername] || 0)
    : null;
  return (
    <g style={walk.tint ? { "--tint": walk.tint } : undefined}>
      {(walk.rot || 0) % 2 === 1 ? <g transform="scale(-1,1)">{sprite}</g> : sprite}
      {label && (
        <PersonaNameTag
          y={item.roamer ? -30 : -52}
          heartProgress={bond?.frac}
          heartId={personaInfo?.npcUsername}
          heartLabel={bond ? `${label}: ${bond.label}` : undefined}
        >
          {label}
        </PersonaNameTag>
      )}
    </g>
  );
}

/** Landing affordances and the figure currently carried above the room. */
export default function IsoCarryOverlay({
  placements,
  target,
  cx,
  cy,
  walk,
  heldRef,
  applyHeld,
  character,
  personas,
  friendship,
}) {
  if (!target) return null;
  const carried = placements.find((placement) => placement.id === target.id);
  const isPet = ISO_ITEMS[carried?.item]?.roamer;
  const availableSeats = isPet ? [] : placements.filter((placement) => {
    const item = ISO_ITEMS[placement.item];
    if (!item || placement.id === target.id) return false;
    if (item.layer === -1 && placement.item !== "pond" && !item.persona) return true;
    if (!item.seat) return false;
    const others = placements.filter((other) => other.id !== target.id);
    return !others.some((other) => {
      if (!ISO_ITEMS[other.item]?.persona) return false;
      const seat = seatFor(other, others.filter((candidate) => candidate.id !== other.id));
      return seat && !seat.soft && seat.placement.id === placement.id;
    });
  });

  return (
    <g transform={`translate(${cx}, ${cy})`} pointerEvents="none">
      {availableSeats.map((placement) => (
        <polygon
          key={`glow-${placement.id}`}
          className="room-breathe"
          points={floorPatch(placement.gx, placement.gy, ...footOf(placement.item, placement.rot))}
          fill="#ffe9b0"
          fillOpacity="0.14"
          stroke="#ffe9b0"
          strokeWidth="1"
          opacity="0.75"
        />
      ))}
      <polygon
        points={floorPatch(target.gx, target.gy, target.foot[0], target.foot[1])}
        fill={target.ok ? "#ffe9b0" : "#d96a6a"}
        fillOpacity="0.12"
        stroke={target.ok ? "#ffe9b0" : "#d96a6a"}
        strokeWidth="1.5"
        strokeDasharray="6 4"
        opacity="0.9"
      />
      <g
        ref={(element) => {
          heldRef.current = element;
          if (element) applyHeld();
        }}
      >
        <HeldFigure
          walk={walk}
          character={character}
          personaInfo={personas ? personas[target.id] : null}
          friendship={friendship}
          label={personas?.[target.id]?.label ?? carried?.name}
        />
      </g>
    </g>
  );
}
