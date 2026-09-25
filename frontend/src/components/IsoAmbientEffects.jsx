import { useId } from "react";

// Fixed particle budgets, animated entirely in CSS. The position stays on a
// parent so animation transforms cannot detach an effect from its source.
export function SteamWisps({ x = 0, y = 0, scale = 1 }) {
  return (
    <g transform={`translate(${x},${y}) scale(${scale})`} pointerEvents="none" aria-hidden="true">
      {[0, 1, 2].map((i) => (
        <g key={i} transform={`translate(${(i - 1) * 1.8},0)`}>
          <path className="steam-wisp"
            style={{ animationDelay: `calc(var(--phase, 0s) - ${i * 2.1}s)` }}
            d="M0 0 C-3 -3 3 -5 0 -8" fill="none" stroke="#fff0da"
            strokeWidth="1.1" strokeLinecap="round" />
        </g>
      ))}
    </g>
  );
}

// Firebox-local coordinates, shared with Fireplace's arched opening. Clip
// sparks to the opening: they must never drift through solid masonry.
export function HearthEmbers() {
  const clip = `hearth-embers-${useId()}`;
  return (
    <g pointerEvents="none" aria-hidden="true">
      <defs><clipPath id={clip}><path d="M8 -6 v-22 a11 11 0 0 1 22 0 v22 z" /></clipPath></defs>
      <g clipPath={`url(#${clip})`}>
        {[15, 20, 24].map((x, i) => (
          <g key={x} transform={`translate(${x},-17)`}>
            <g className="hearth-ember" style={{ animationDelay: `calc(var(--phase, 0s) - ${i * 2.7}s)` }}>
              <circle r="1.7" fill="#ffb35a" opacity="0.16" />
              <circle r="0.65" fill="#ffdd8a" />
            </g>
          </g>
        ))}
      </g>
    </g>
  );
}
