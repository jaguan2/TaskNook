import { isoBox } from "../lib/iso";

/**
 * The workhorse: an axis-aligned volume with its three visible faces at three
 * values (top lit, left mid, right dark), shaded by translucent black so the
 * depth survives ANY tint.
 *
 * `tint={false}` opts a part out of the colour picker. That matters more than
 * it sounds: a bed's tint is its DUVET, so the frame and headboard have to
 * stay wood — without this, picking purple gave you a purple headboard too.
 */
export function TintedBox({ gx, gy, dx, dy, h, fallback, dark = 0.32, mid = 0.18, tint = true }) {
  const box = isoBox(gx, gy, dx, dy, h);
  const { B, C, D } = box.corners;
  const up = (p) => `${p.x},${p.y - h}`;
  const paint = { fill: tint ? `var(--tint, ${fallback})` : fallback };
  // How deep the contact shading runs, scaled to the box — a 3px chair seat
  // must not get the same 7px band as a wardrobe.
  const foot = Math.min(7, Math.max(1.5, h * 0.34));
  return (
    <g>
      <polygon points={box.left} style={paint} />
      <polygon points={box.left} fill="#000" opacity={mid} />
      <polygon points={box.right} style={paint} />
      <polygon points={box.right} fill="#000" opacity={dark} />
      <polygon points={box.top} style={paint} />
      {/* Contact shading where the box meets whatever it stands on. Nearly
          every piece in the catalog is built from these, so one band here
          gives the whole room weight at once — without it a box looks pasted
          onto the floor rather than resting on it. */}
      <polygon
        points={`${D.x},${D.y} ${C.x},${C.y} ${C.x},${C.y - foot} ${D.x},${D.y - foot}`}
        fill="#000"
        opacity="0.15"
      />
      <polygon
        points={`${B.x},${B.y} ${C.x},${C.y} ${C.x},${C.y - foot} ${B.x},${B.y - foot}`}
        fill="#000"
        opacity="0.15"
      />
      <polyline
        points={`${up(D)} ${up(C)} ${up(B)}`}
        fill="none"
        stroke="#fff"
        opacity="0.13"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
    </g>
  );
}

