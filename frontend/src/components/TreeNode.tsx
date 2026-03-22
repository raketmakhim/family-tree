import { RawNodeDatum } from "react-d3-tree";
import { COLORS } from "../styles/colors";

interface TreeNodeProps {
  nodeDatum: RawNodeDatum;
  selectedPersonId: string | undefined;
  onSelect: (personId: string) => void;
}

const R = 28; // circle radius for all nodes

export default function TreeNode({ nodeDatum, selectedPersonId, onSelect }: TreeNodeProps) {
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
    const cx = R + 25;
    return (
      <g>
        {/* Left circle — primary person */}
        <g onClick={() => personId && onSelect(personId)} style={{ cursor: "pointer" }}>
          <circle cx={-cx} cy={0} r={R}
            fill={isPersonSel ? COLORS.primary : COLORS.primaryLight}
            stroke={COLORS.primary} strokeWidth={2} />
          <text textAnchor="middle" x={-cx} y={R + 16} fontSize={13} fontWeight={500}
            textRendering="geometricPrecision"
            paintOrder="stroke" stroke="white" strokeWidth={4} strokeLinejoin="round"
            fill={COLORS.text}>
            {nodeDatum.name}
          </text>
          {dob && (
            <text textAnchor="middle" x={-cx} y={R + 31} fontSize={11}
              textRendering="geometricPrecision"
              paintOrder="stroke" stroke="white" strokeWidth={3} strokeLinejoin="round"
              fill={COLORS.muted}>
              {dob}
            </text>
          )}
        </g>
        {/* Heart */}
        <text textAnchor="middle" x={0} y={5} fontSize={13} fill={COLORS.accent}
          style={{ pointerEvents: "none" }}>♥</text>
        {/* Right circle — spouse */}
        <g onClick={() => onSelect(spouseId)} style={{ cursor: "pointer" }}>
          <circle cx={cx} cy={0} r={R}
            fill={spouseFill}
            stroke={spouseStroke} strokeWidth={2} />
          <text textAnchor="middle" x={cx} y={R + 16} fontSize={13} fontWeight={500}
            textRendering="geometricPrecision"
            paintOrder="stroke" stroke="white" strokeWidth={4} strokeLinejoin="round"
            fill={COLORS.text}>
            {spouseName || "Unknown"}
          </text>
          {spouseDob && (
            <text textAnchor="middle" x={cx} y={R + 31} fontSize={11}
              textRendering="geometricPrecision"
              paintOrder="stroke" stroke="white" strokeWidth={3} strokeLinejoin="round"
              fill={COLORS.muted}>
              {spouseDob}
            </text>
          )}
        </g>
      </g>
    );
  }

  // Single person — circle, name below
  return (
    <g onClick={() => personId && onSelect(personId)} style={{ cursor: "pointer" }}>
      <circle r={R}
        fill={isPersonSel ? COLORS.primary : COLORS.primaryLight}
        stroke={COLORS.primary} strokeWidth={2} />
      <text textAnchor="middle" y={R + 16} fontSize={13} fontWeight={500}
        textRendering="geometricPrecision"
        paintOrder="stroke" stroke="white" strokeWidth={4} strokeLinejoin="round"
        fill={COLORS.text}>
        {nodeDatum.name}
      </text>
      {dob && (
        <text textAnchor="middle" y={R + 31} fontSize={11}
          textRendering="geometricPrecision"
          paintOrder="stroke" stroke="white" strokeWidth={3} strokeLinejoin="round"
          fill={COLORS.muted}>
          {dob}
        </text>
      )}
    </g>
  );
}
