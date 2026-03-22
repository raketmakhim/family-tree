import { RawNodeDatum } from "react-d3-tree";
import { COLORS } from "../styles/colors";

interface TreeNodeProps {
  nodeDatum: RawNodeDatum;
  selectedPersonId: string | undefined;
  onSelect: (personId: string) => void;
  spouseGap?: number;
}

const R = 28; // circle radius for all nodes

// Split "First Last" into ["First", "Last"], or ["First"] if no space.
const splitName = (name: string): [string, string?] => {
  const i = name.indexOf(" ");
  return i === -1 ? [name] : [name.slice(0, i), name.slice(i + 1)];
};

// Render a name (1 or 2 lines) + optional dob below a circle at (cx, 0).
function NameLabel({ name, dob, cx = 0, fill, muted }: {
  name: string; dob?: string; cx?: number; fill: string; muted: string;
}) {
  const [first, last] = splitName(name);
  const nameY1 = R + 16;
  const nameY2 = R + 29;
  const dobY = last ? R + 42 : R + 31;
  const textProps = {
    textAnchor: "middle" as const,
    x: cx,
    textRendering: "geometricPrecision" as const,
    paintOrder: "stroke" as const,
    stroke: "white",
    strokeWidth: 4,
    strokeLinejoin: "round" as const,
  };
  return (
    <>
      <text {...textProps} y={nameY1} fontSize={13} fontWeight={500} fill={fill}>{first}</text>
      {last && <text {...textProps} y={nameY2} fontSize={13} fontWeight={500} fill={fill}>{last}</text>}
      {dob && <text {...textProps} y={dobY} fontSize={11} strokeWidth={3} fill={muted}>{dob}</text>}
    </>
  );
}

export default function TreeNode({ nodeDatum, selectedPersonId, onSelect, spouseGap = 40 }: TreeNodeProps) {
  const attrs = nodeDatum.attributes ?? {};
  const personId = attrs.personId as string | undefined;
  const spouseId = attrs.spouseId as string | undefined;
  const spouseName = attrs.spouseName as string | undefined;
  const spouseDob = attrs.spouseDob as string | undefined;
  const dob = attrs.dob as string | undefined;
  const spouseMarriedIn = attrs.spouseMarriedIn === "true";
  const isPersonSel = selectedPersonId === personId;
  const isSpouseSel = selectedPersonId === spouseId;

  // Colours — married-in spouses use amber instead of blue
  const spouseFill = isSpouseSel ? COLORS.marriedIn : (spouseMarriedIn ? COLORS.marriedInLight : COLORS.primaryLight);
  const spouseStroke = spouseMarriedIn ? COLORS.marriedIn : COLORS.primary;

  if (spouseId) {
    // Couple node — two circles side by side with ♥ between, names below
    const cx = R + spouseGap;
    return (
      <g>
        {/* Left circle — primary person */}
        <g data-person-id={personId} onClick={(e) => { e.stopPropagation(); personId && onSelect(personId); }} style={{ cursor: "pointer" }}>
          <circle cx={-cx} cy={0} r={R}
            fill={isPersonSel ? COLORS.primary : COLORS.primaryLight}
            stroke={COLORS.primary} strokeWidth={2} />
          <NameLabel name={nodeDatum.name} dob={dob} cx={-cx} fill={COLORS.text} muted={COLORS.muted} />
        </g>
        {/* Heart */}
        <text textAnchor="middle" x={0} y={5} fontSize={13} fill={COLORS.accent}
          style={{ pointerEvents: "none" }}>♥</text>
        {/* Right circle — spouse */}
        <g data-person-id={spouseId} onClick={(e) => { e.stopPropagation(); onSelect(spouseId); }} style={{ cursor: "pointer" }}>
          <circle cx={cx} cy={0} r={R}
            fill={spouseFill}
            stroke={spouseStroke} strokeWidth={2} />
          <NameLabel name={spouseName || "Unknown"} dob={spouseDob} cx={cx} fill={COLORS.text} muted={COLORS.muted} />
        </g>
      </g>
    );
  }

  // Single person — circle, name below
  return (
    <g data-person-id={personId} onClick={(e) => { e.stopPropagation(); personId && onSelect(personId); }} style={{ cursor: "pointer" }}>
      <circle r={R}
        fill={isPersonSel ? COLORS.primary : COLORS.primaryLight}
        stroke={COLORS.primary} strokeWidth={2} />
      <NameLabel name={nodeDatum.name} dob={dob} fill={COLORS.text} muted={COLORS.muted} />
    </g>
  );
}
