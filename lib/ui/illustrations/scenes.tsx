// lib/ui/illustrations/scenes.tsx
// Phase 4: vintage-cartography line illustrations authored in-code as SVG.
// Binding brief: scripts/asset-spec-sheet.md · docs/design-language.md.
// Every component: square viewBox 0 0 160 160 (RoadmapBg is tall), props { size? }.
import React from 'react';
import Svg, {
  Path, Circle, Line, Rect, Ellipse, G, Polyline, Polygon, Defs, ClipPath,
} from 'react-native-svg';
import { color } from '../tokens';

export type IllustrationProps = { size?: number };

// Shared palette — never hard-code outside this map.
const INK = color.text.primary; //  #2C3E1F
const SAGE = color.brand.primary; // #6B7D54
const MUTE = color.text.muted; //   #8A8270
const PARCH = color.bg.muted; //    #EFE5CF

const SW = 1.4; // hand-drawn stroke weight
const stroke = {
  stroke: INK,
  strokeWidth: SW,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  fill: 'none',
};

// Faint ink-dust scattered in the negative space (texture, never a subject).
function InkDust({ seed = 0 }: { seed?: number }) {
  const dots = [
    [22, 30], [134, 26], [18, 120], [142, 110], [40, 140],
    [120, 138], [30, 70], [138, 64], [78, 14], [88, 150],
  ];
  return (
    <G opacity={0.28}>
      {dots.map(([cx, cy], i) => (
        <Circle key={i} cx={cx + (seed % 3)} cy={cy} r={(i % 3 === 0 ? 1.3 : 0.8)} fill={MUTE} />
      ))}
    </G>
  );
}

function Frame({ size = 160, children }: { size?: number; children: React.ReactNode }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 160 160" fill="none">
      {children}
    </Svg>
  );
}

/* ---- App background tile -------------------------------------------- */
export function ParchmentBg({ size = 160 }: IllustrationProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 160 160" fill="none">
      <Rect x={0} y={0} width={160} height={160} fill={color.bg.base} />
      <G opacity={0.5}>
        <InkDust seed={1} />
        <InkDust seed={2} />
      </G>
      {/* faint contour wash */}
      <G opacity={0.12} stroke={MUTE} strokeWidth={1} fill="none">
        <Path d="M-10 44 C 40 30, 90 60, 170 40" />
        <Path d="M-10 104 C 50 92, 100 120, 170 100" />
      </G>
    </Svg>
  );
}

/* ---- Empty states --------------------------------------------------- */
export function EmptyNoClass({ size = 160 }: IllustrationProps) {
  // A small wooden gate at the edge of a quiet meadow.
  return (
    <Frame size={size}>
      <InkDust />
      {/* horizon */}
      <Path d="M14 112 C 54 104, 104 118, 146 108" {...stroke} stroke={MUTE} opacity={0.7} />
      {/* gate posts */}
      <Line x1={58} y1={56} x2={58} y2={120} {...stroke} />
      <Line x1={102} y1={56} x2={102} y2={120} {...stroke} />
      {/* gate bars */}
      <Line x1={58} y1={74} x2={102} y2={74} {...stroke} />
      <Line x1={58} y1={92} x2={102} y2={92} {...stroke} />
      <Line x1={58} y1={120} x2={102} y2={92} {...stroke} opacity={0.7} />
      <Line x1={102} y1={120} x2={58} y2={92} {...stroke} opacity={0.7} />
      {/* post caps */}
      <Path d="M54 56 L58 49 L62 56" {...stroke} />
      <Path d="M98 56 L102 49 L106 56" {...stroke} />
      {/* meadow tufts */}
      <Path d="M30 122 q3 -10 6 0 M120 124 q3 -11 6 0 M138 116 q3 -9 5 0" {...stroke} stroke={SAGE} />
    </Frame>
  );
}

export function EmptyNoActivity({ size = 160 }: IllustrationProps) {
  // Empty lectern + closed scroll. Mood: waiting.
  return (
    <Frame size={size}>
      <InkDust />
      {/* lectern slope */}
      <Path d="M48 72 L112 60 L120 70 L56 84 Z" {...stroke} />
      {/* ridge */}
      <Line x1={84} y1={66} x2={88} y2={77} {...stroke} opacity={0.6} />
      {/* stem + foot */}
      <Line x1={84} y1={80} x2={84} y2={124} {...stroke} />
      <Path d="M66 128 C 76 120, 92 120, 102 128" {...stroke} />
      {/* closed scroll on the rest */}
      <G transform="translate(0 -4)">
        <Rect x={62} y={62} width={40} height={9} rx={4.5} {...stroke} transform="rotate(-9 82 66)" />
        <Line x1={66} y1={60} x2={70} y2={70} {...stroke} opacity={0.6} transform="rotate(-9 82 66)" />
      </G>
    </Frame>
  );
}

export function EmptyAllDone({ size = 160 }: IllustrationProps) {
  // Laurel wreath + open journal with an ink check. Mood: quiet completion.
  return (
    <Frame size={size}>
      <InkDust />
      {/* laurel */}
      <Path d="M58 118 C 34 96, 36 60, 64 40" {...stroke} stroke={SAGE} />
      <Path d="M102 118 C 126 96, 124 60, 96 40" {...stroke} stroke={SAGE} />
      {[0, 1, 2, 3].map((i) => (
        <G key={`l${i}`} stroke={SAGE} strokeWidth={SW} strokeLinecap="round" fill="none">
          <Path d={`M${52 - i * 2} ${108 - i * 18} q -10 -4 -12 -12`} />
          <Path d={`M${108 + i * 2} ${108 - i * 18} q 10 -4 12 -12`} />
        </G>
      ))}
      {/* open journal */}
      <Path d="M62 96 L80 90 L98 96 L98 116 L80 110 L62 116 Z" {...stroke} />
      <Line x1={80} y1={90} x2={80} y2={110} {...stroke} opacity={0.6} />
      {/* ink check */}
      <Polyline points="70,103 76,108 90,98" {...stroke} stroke={SAGE} />
    </Frame>
  );
}

export function EmptyNoRank({ size = 160 }: IllustrationProps) {
  // Blank wax-sealed envelope. Mood: nothing yet to report.
  return (
    <Frame size={size}>
      <InkDust />
      <Rect x={44} y={58} width={72} height={48} rx={4} {...stroke} />
      <Path d="M44 62 L80 88 L116 62" {...stroke} />
      {/* wax seal */}
      <Circle cx={80} cy={88} r={9} {...stroke} stroke={color.accent.warm} />
      <Path d="M76 84 q4 4 8 0 M76 90 q4 4 8 0" {...stroke} stroke={color.accent.warm} opacity={0.7} />
    </Frame>
  );
}

export function EmptyStartHere({ size = 160 }: IllustrationProps) {
  // Compass + faint trail leading off the page. Mood: invitation.
  return (
    <Frame size={size}>
      <InkDust />
      {/* compass */}
      <Circle cx={64} cy={78} r={26} {...stroke} />
      <Circle cx={64} cy={78} r={3} {...stroke} fill={INK} />
      <Polygon points="64,56 70,78 64,100 58,78" {...stroke} stroke={SAGE} />
      {[0, 90, 180, 270].map((a) => (
        <Line
          key={a}
          x1={64}
          y1={78}
          x2={64 + 30 * Math.cos((a * Math.PI) / 180)}
          y2={78 + 30 * Math.sin((a * Math.PI) / 180)}
          {...stroke}
          opacity={0.35}
        />
      ))}
      {/* dashed trail off-page */}
      <Path
        d="M92 92 C 110 104, 120 122, 150 120"
        stroke={MUTE}
        strokeWidth={SW}
        strokeLinecap="round"
        strokeDasharray="2 7"
        fill="none"
      />
    </Frame>
  );
}

/* ---- Error states --------------------------------------------------- */
export function ErrorNetwork({ size = 160 }: IllustrationProps) {
  // Torn map fragment + frayed compass needle.
  return (
    <Frame size={size}>
      <InkDust />
      <Path
        d="M48 50 L112 46 L116 96 L92 110 L84 100 L74 112 L52 104 Z"
        {...stroke}
      />
      {/* torn jagged edge */}
      <Polyline points="48,50 44,58 50,64 45,72 52,80 47,90 52,104" {...stroke} opacity={0.7} />
      {/* faded contour */}
      <Path d="M60 70 C 74 64, 90 76, 104 70" {...stroke} stroke={MUTE} opacity={0.55} />
      {/* frayed needle */}
      <Path d="M70 92 L96 66" {...stroke} stroke={color.accent.warm} />
      <Path d="M92 66 l4 0 0 4" {...stroke} stroke={color.accent.warm} opacity={0.7} />
    </Frame>
  );
}

export function ErrorServer({ size = 160 }: IllustrationProps) {
  // A toppled inkwell.
  return (
    <Frame size={size}>
      <InkDust />
      <G transform="rotate(-22 84 92)">
        <Path d="M64 70 L104 70 L100 100 Q84 110 68 100 Z" {...stroke} />
        <Ellipse cx={84} cy={70} rx={20} ry={6} {...stroke} />
      </G>
      {/* spilled ink pool */}
      <Path
        d="M60 116 C 70 104, 96 104, 112 112 C 120 118, 104 126, 84 124 C 70 123, 56 124, 60 116 Z"
        stroke={INK}
        strokeWidth={SW}
        fill={INK}
        fillOpacity={0.14}
        strokeLinejoin="round"
      />
    </Frame>
  );
}

export function ErrorUnknown({ size = 160 }: IllustrationProps) {
  // A closed sextant case.
  return (
    <Frame size={size}>
      <InkDust />
      <Rect x={46} y={62} width={68} height={48} rx={6} {...stroke} />
      <Line x1={46} y1={84} x2={114} y2={84} {...stroke} opacity={0.6} />
      {/* clasp */}
      <Rect x={74} y={80} width={12} height={8} rx={2} {...stroke} />
      {/* corner straps */}
      <Path d="M46 70 q-6 0 -6 8 M114 70 q6 0 6 8" {...stroke} opacity={0.6} />
      {/* embossed arc hint */}
      <Path d="M60 100 A 22 22 0 0 1 100 100" {...stroke} stroke={MUTE} opacity={0.5} />
    </Frame>
  );
}

/* ---- Scroll / map grounds ------------------------------------------ */
export function RoadmapBg({ size = 160 }: IllustrationProps) {
  // Tall: foothills (bottom) climbing to a misty peak (top). NO path drawn.
  const h = size * 3; // 160 : 480
  return (
    <Svg width={size} height={h} viewBox="0 0 160 480" fill="none" preserveAspectRatio="xMidYMid slice">
      <Rect x={0} y={0} width={160} height={480} fill={color.bg.base} />
      {/* misty peak */}
      <Path d="M40 70 L80 24 L120 70" {...stroke} stroke={MUTE} opacity={0.7} />
      <Path d="M70 38 l6 8 -10 6" {...stroke} stroke={MUTE} opacity={0.5} />
      <Path d="M20 96 C 60 86, 100 96, 140 88" {...stroke} stroke={MUTE} opacity={0.4} />
      {/* mid ridges */}
      <Path d="M0 210 L46 168 L88 210 L130 176 L160 206" {...stroke} stroke={SAGE} opacity={0.45} />
      <Path d="M0 300 L52 262 L104 300 L160 270" {...stroke} stroke={SAGE} opacity={0.4} />
      {/* foothills */}
      <Path d="M0 392 C 40 366, 80 396, 120 372 C 140 360, 152 380, 160 372" {...stroke} stroke={SAGE} opacity={0.55} />
      <Path d="M0 440 C 50 420, 100 446, 160 424" {...stroke} stroke={SAGE} opacity={0.5} />
      {/* marginal ferns */}
      <G stroke={SAGE} strokeWidth={SW} strokeLinecap="round" fill="none" opacity={0.5}>
        <Path d="M16 462 q6 -22 0 -40 M16 452 q-8 -4 -10 -10 M16 444 q8 -4 10 -10 M16 436 q-8 -3 -9 -8" />
        <Path d="M146 470 q-6 -20 0 -36 M146 460 q8 -4 10 -9 M146 452 q-8 -3 -9 -8" />
      </G>
      <InkDust seed={1} />
    </Svg>
  );
}

export function TerritoryBg({ size = 160 }: IllustrationProps) {
  // Old map ground: faded topographic lines + corner compass rose. NO hex grid.
  return (
    <Svg width={size} height={size} viewBox="0 0 160 160" fill="none">
      <Defs>
        <ClipPath id="terr-clip"><Rect x={0} y={0} width={160} height={160} /></ClipPath>
      </Defs>
      <G clipPath="url(#terr-clip)">
        <Rect x={0} y={0} width={160} height={160} fill={color.bg.base} />
        {/* nested contour lines (topographic feel) */}
        <G stroke={MUTE} strokeWidth={1} fill="none" opacity={0.3}>
          <Path d="M-20 60 C 30 40, 70 70, 110 50 C 140 36, 170 56, 190 44" />
          <Path d="M-20 80 C 30 62, 70 92, 110 72 C 140 58, 170 78, 190 66" />
          <Path d="M-20 104 C 30 88, 70 116, 110 96 C 140 82, 170 102, 190 90" />
          <Path d="M-20 128 C 40 114, 80 138, 120 120 C 150 108, 175 126, 190 116" />
        </G>
        {/* faded compass rose, corner */}
        <G transform="translate(126 126)" opacity={0.4}>
          <Circle cx={0} cy={0} r={18} stroke={MUTE} strokeWidth={1} fill="none" />
          <Polygon points="0,-18 4,0 0,18 -4,0" stroke={MUTE} strokeWidth={1} fill="none" />
          <Polygon points="-18,0 0,4 18,0 0,-4" stroke={MUTE} strokeWidth={1} fill="none" />
        </G>
      </G>
    </Svg>
  );
}
