import { useId } from "react";
import { project } from "../lib/iso";
import { wildlifeAt, wildlifeKeyframes } from "../lib/commonWildlife";

export function Duck({ color = "mallard", swimming = true, moving = false }) {
  const cream = color === "cream";
  const body = cream ? "#e6d9b4" : "#a89d85";
  const head = cream ? "#f1e5c7" : "#456b57";
  return <g data-duck-pose={swimming ? "swim" : "walk"}>
    {swimming ? <g fill="none" stroke="#bfdbcd" strokeWidth=".7" opacity=".65">
      <path d="M-14 1 q-5 -1 -7 1 M-12 4 q-5 0 -7 2" />
      <ellipse cy="1" rx="12" ry="3" opacity=".45" />
    </g> : <>
      <ellipse cy="1" rx="8" ry="2.4" fill="#344a35" opacity=".22" />
      <g className={moving ? "leg-step-a" : undefined}>
        <path d="M-3 -3 v4 l4 1" fill="none" stroke="#ba8747" strokeWidth="1.5" strokeLinecap="round" />
      </g>
      <g className={moving ? "leg-step-b" : undefined}>
        <path d="M3 -3 v4 l4 1" fill="none" stroke="#d09b51" strokeWidth="1.5" strokeLinecap="round" />
      </g>
    </>}
    <g transform={swimming ? "translate(0,2)" : undefined}>
      <path d="M-7 -5 L-13 -9 L-10 -2 Z" fill={cream ? "#c8b994" : "#655e52"} />
      <ellipse cy="-5" rx="10" ry="5.8" fill={body} />
      <path d="M-9 -3 Q0 0 9 -4 Q7 2 -1 1 Q-7 1 -9 -3" fill={cream ? "#b6a783" : "#756f61"} opacity=".65" />
      <ellipse cx="-1" cy="-5" rx="6" ry="3.5" fill={cream ? "#f1e6c9" : "#8b826e"} />
      {!cream && <path d="M-5 -6 l7 -1 l1 2 l-7 1" fill="#4e6e83" stroke="#dbd4bd" strokeWidth=".6" />}
      <path d="M5 -4 Q3 -10 6 -13 L11 -12 L11 -5" fill={head} />
      <ellipse cx="8" cy="-13" rx="4.8" ry="4.5" fill={head} />
      {!cream && <path d="M5 -8 Q8 -6 11 -8" fill="none" stroke="#e8dcc0" strokeWidth="1" />}
      <path d="M11 -14 L17 -12.7 L16 -10.8 L11 -11.5 Z" fill="#d7a44e" />
      <circle cx="9.5" cy="-14" r=".85" fill="#292d28" />
      <circle cx="9.7" cy="-14.3" r=".25" fill="#fff3d8" />
      {swimming && <path d="M-10 .1 Q0 3 10 -.3" fill="none" stroke="#a9d1c4" strokeWidth=".9" />}
    </g>
  </g>;
}

/** Browser-owned keyframes, no animation interval or React frame updates.
 * Attribute transforms stay on separate wrappers from animated transforms. */
export default function CommonWildlife({ wildlife, pond, reduceMotion, paused }) {
  const uid = `wildlife-${useId().replace(/:/g, "")}`;
  if (!wildlife || !pond) return null;
  const at = project(pond.gx, pond.gy);
  return <g data-common-wildlife="ducks" transform={`translate(${at.x},${at.y})`} pointerEvents="none" aria-hidden="true">
    {wildlife.ducks.map(duck => {
      const frames = wildlifeKeyframes(duck);
      const rest = wildlifeAt(duck, 0);
      const start = project(rest.gx, rest.gy);
      const name = `${uid}-${duck.id}`;
      const keyframes = (suffix, value, discrete = false) => `@keyframes ${name}-${suffix}{${frames.map(f =>
        `${f.offset * 100}%{${value(f)}${discrete ? "animation-timing-function:step-end;" : ""}}`).join("")}}`;
      const animate = suffix => ({ animation: reduceMotion ? "none" : `${name}-${suffix} ${duck.duration}ms linear ${-duck.phase * duck.duration}ms infinite`,
        animationPlayState: paused ? "paused" : "running" });
      return <g key={duck.id} data-wildlife-id={duck.id}>
        <style>{keyframes("route", f => `transform:translate(${f.x}px,${f.y}px);`)
          + keyframes("facing", f => `transform:scale(${f.facing},1);`, true)
          + keyframes("water", f => `opacity:${f.water ? 1 : 0};`, true)
          + keyframes("land", f => `opacity:${f.water ? 0 : 1};`, true)}</style>
        <g data-wildlife-route={duck.id} style={{ transform: `translate(${start.x}px,${start.y}px)`, ...animate("route") }}>
          <g style={{ transform: `scale(${rest.facing},1)`, ...animate("facing") }}>
            <g transform="scale(.68)">
              <g data-wildlife-water="true" style={{ opacity: rest.water ? 1 : 0, ...animate("water") }}><Duck color={duck.color} /></g>
              <g data-wildlife-land="true" style={{ opacity: rest.water ? 0 : 1, ...animate("land") }}><Duck color={duck.color} swimming={false} moving={!reduceMotion && !paused} /></g>
            </g>
          </g>
        </g>
      </g>;
    })}
  </g>;
}
