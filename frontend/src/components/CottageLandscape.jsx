// Shared by the room and preset thumbnails; coordinates match the window.
export default function CottageLandscape({ setting, time }) {
  if (setting === "woodland") return <g>
    <path d="M98 211 Q163 135 246 193 T418 171 V258 H98Z" fill={time.building} opacity=".45" />
    <path d="M98 239 Q214 182 320 224 T418 211 V258 H98Z" fill={time.building} opacity=".65" />
    {[110, 143, 184, 355, 394, 416].map((x, i) => <g key={x} transform={`translate(${x} ${190 + i % 3 * 13})`}>
      <path d="M0 -43 L-16 -8 H-10 L-23 15 H-5 V42 H5 V15 H23 L10 -8 H16Z" fill={time.building} />
    </g>)}
  </g>;
  if (setting === "coast") return <g>
    <path d="M98 188 H418 V258 H98Z" fill={time.building} opacity=".65" />
    <path d="M98 195 Q142 191 186 195 T274 195 T362 195 T450 195 M124 213 h65 m48 0 h51 m24 14 h76 M162 235 h98" stroke={time.celestialFill} strokeWidth="2" opacity=".25" fill="none" />
    <path d="M98 258 V230 Q161 222 204 242 T418 250 V258Z" fill="#ae9c8b" opacity=".6" />
    <path d="M361 193 v-31 l16 24 h-16 m-9 8 h25 l-6 5 h-13Z" fill={time.celestialFill} opacity=".7" />
  </g>;
  return <g>
    {[[102,214,22],[128,198,20],[152,220,26],[182,204,22],[208,224,24],[236,192,20],[260,216,28],[292,206,20],[316,222,24],[344,198,22],[370,218,26],[398,208,20]].map(([x,y,w]) =>
      <rect key={x} x={x} y={y} width={w} height={258-y} fill={time.building} />)}
    {[[108,226],[133,214],[160,232],[243,210],[299,220],[350,216],[403,224]].map(([x,y]) =>
      <rect key={x} x={x} y={y} width="4" height="5" fill={time.litWindow} opacity={time.litOpacity} />)}
  </g>;
}
