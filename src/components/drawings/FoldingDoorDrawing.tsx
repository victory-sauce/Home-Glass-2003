import type { FoldingDoorConfig, HandleSide } from "@/components/quotations/types";
import { cn } from "@/lib/utils";

type FoldingDoorDrawingProps = {
  widthMm: number;
  heightMm: number;
  panelCount: number;
  folding?: FoldingDoorConfig;
  showOutInMarker?: boolean;
  className?: string;
};

type FoldingLayout = {
  viewBoxWidth: number;
  viewBoxHeight: number;
  frameX: number;
  frameY: number;
  frameWidth: number;
  frameHeight: number;
  railThickness: number;
  topViewY: number;
};

type FoldingPanelProps = {
  x: number;
  y: number;
  width: number;
  height: number;
  index: number;
  leftPanels: number;
  showHandle: boolean;
  handleSide: HandleSide;
};

const LINE_COLOR = "#111827";
const GUIDE_COLOR = "#8a8f94";
const DRAWING_FONT = "Georgia, 'Times New Roman', serif";
const MAX_FOLDING_PANELS = 32;

export function FoldingDoorDrawing({
  widthMm,
  heightMm,
  panelCount,
  folding,
  showOutInMarker = true,
  className,
}: FoldingDoorDrawingProps) {
  const layout = getFoldingLayout(widthMm, heightMm);
  const totalPanels = getSafePanelCount(folding?.totalPanels ?? panelCount);
  const leftPanels = clamp(
    Math.round(folding?.leftPanels ?? 0),
    0,
    totalPanels
  );
  const configuredRightPanels = Math.round(
    folding?.rightPanels ?? totalPanels - leftPanels
  );
  const rightPanels =
    leftPanels + configuredRightPanels === totalPanels
      ? clamp(configuredRightPanels, 0, totalPanels)
      : totalPanels - leftPanels;
  const handlesByDoorNumber = getFoldingHandlesByDoorNumber(folding, totalPanels, leftPanels);

  const openingX = layout.frameX + layout.railThickness;
  const openingY = layout.frameY + layout.railThickness;
  const openingWidth = layout.frameWidth - layout.railThickness * 2;
  const openingHeight = layout.frameHeight - layout.railThickness * 2;
  const panelWidth = openingWidth / totalPanels;

  return (
    <svg
      viewBox={`0 0 ${layout.viewBoxWidth} ${layout.viewBoxHeight}`}
      role="img"
      aria-label="Custom folding door system"
      className={cn("w-full rounded-xl border border-slate-200 bg-white", className)}
    >
      <rect width={layout.viewBoxWidth} height={layout.viewBoxHeight} fill="#fff" />

      <FoldingTopView
        x={layout.frameX}
        y={layout.topViewY}
        width={layout.frameWidth}
        totalPanels={totalPanels}
        leftPanels={leftPanels}
        rightPanels={rightPanels}
        showOutInMarker={showOutInMarker}
      />

      <FrameDimensions
        x={layout.frameX}
        y={layout.frameY}
        width={layout.frameWidth}
        height={layout.frameHeight}
        widthMm={widthMm}
        heightMm={heightMm}
      />

      <FoldingFrame
        x={layout.frameX}
        y={layout.frameY}
        width={layout.frameWidth}
        height={layout.frameHeight}
        railThickness={layout.railThickness}
      />

      {Array.from({ length: totalPanels }).map((_, index) => (
        <FoldingPanel
          key={`folding-panel-${index}`}
          x={openingX + panelWidth * index}
          y={openingY}
          width={panelWidth}
          height={openingHeight}
          index={index}
          leftPanels={leftPanels}
          showHandle={handlesByDoorNumber.has(index + 1)}
          handleSide={handlesByDoorNumber.get(index + 1) ?? "right"}
        />
      ))}

      <FoldingMovementLegend
        x={openingX}
        y={layout.frameY + layout.frameHeight + 22}
        width={openingWidth}
        leftPanels={leftPanels}
        rightPanels={rightPanels}
      />
    </svg>
  );
}

function getFoldingLayout(widthMm: number, heightMm: number): FoldingLayout {
  const safeWidthMm = Math.max(widthMm, 1);
  const safeHeightMm = Math.max(heightMm, 1);
  const viewBoxWidth = 760;
  const viewBoxHeight = 560;
  const maxFrameWidth = 650;
  const maxFrameHeight = 285;
  const scale = Math.min(maxFrameWidth / safeWidthMm, maxFrameHeight / safeHeightMm);
  const frameWidth = safeWidthMm * scale;
  const frameHeight = safeHeightMm * scale;
  const frameX = (viewBoxWidth - frameWidth) / 2;
  const frameY = 205;
  const railThickness = Math.max(8, Math.min(14, frameWidth * 0.022));

  return {
    viewBoxWidth,
    viewBoxHeight,
    frameX,
    frameY,
    frameWidth,
    frameHeight,
    railThickness,
    topViewY: 64,
  };
}

function FoldingTopView({
  x,
  y,
  width,
  totalPanels,
  leftPanels,
  rightPanels,
  showOutInMarker,
}: {
  x: number;
  y: number;
  width: number;
  totalPanels: number;
  leftPanels: number;
  rightPanels: number;
  showOutInMarker: boolean;
}) {
  const height = 24;
  const endBlockWidth = 16;
  const innerX = x + endBlockWidth;
  const innerWidth = Math.max(width - endBlockWidth * 2, 1);
  const panelWidth = innerWidth / totalPanels;
  const splitX = innerX + panelWidth * leftPanels;
  const railInset = 6;
  const foldStackY = y + height + 12;
  const foldLegendY = foldStackY + 13;
  const arrowGap = 18;
  const leftFoldWidth = getFoldAccordionWidth(leftPanels);
  const rightFoldWidth = getFoldAccordionWidth(rightPanels);
  const leftArrow = getAdjacentFoldArrow({
    edgeX: innerX,
    foldWidth: leftFoldWidth,
    direction: "left",
    minX: innerX,
    maxX: innerX + innerWidth,
    gap: arrowGap,
  });
  const rightArrow = getAdjacentFoldArrow({
    edgeX: innerX + innerWidth,
    foldWidth: rightFoldWidth,
    direction: "right",
    minX: innerX,
    maxX: innerX + innerWidth,
    gap: arrowGap,
  });

  return (
    <g fill="none" stroke={LINE_COLOR} strokeLinecap="square" strokeLinejoin="miter">
      <rect x={x} y={y} width={width} height={height} fill="#fff" strokeWidth={1.7} />
      <rect x={x} y={y} width={endBlockWidth} height={height} fill="#fff" strokeWidth={1.7} />
      <rect
        x={x + width - endBlockWidth}
        y={y}
        width={endBlockWidth}
        height={height}
        fill="#fff"
        strokeWidth={1.7}
      />

      <line
        x1={innerX}
        y1={y + railInset}
        x2={innerX + innerWidth}
        y2={y + railInset}
        strokeWidth={1.3}
      />
      <line
        x1={innerX}
        y1={y + height - railInset}
        x2={innerX + innerWidth}
        y2={y + height - railInset}
        strokeWidth={1.3}
      />

      {Array.from({ length: totalPanels - 1 }).map((_, index) => {
        const boundaryX = innerX + panelWidth * (index + 1);
        return (
          <line
            key={`folding-top-boundary-${index}`}
            x1={boundaryX}
            y1={y}
            x2={boundaryX}
            y2={y + height}
            strokeWidth={1.2}
          />
        );
      })}

      {leftPanels > 0 && (
        <FoldArrow
          x1={leftArrow.x1}
          x2={leftArrow.x2}
          y={foldLegendY}
          direction="left"
        />
      )}

      {rightPanels > 0 && (
        <FoldArrow
          x1={rightArrow.x1}
          x2={rightArrow.x2}
          y={foldLegendY}
          direction="right"
        />
      )}

      {leftPanels > 0 && rightPanels > 0 && (
        <g strokeWidth={1.8}>
          <line x1={splitX - 3} y1={y - 2} x2={splitX - 3} y2={y + height + 2} />
          <line x1={splitX + 3} y1={y - 2} x2={splitX + 3} y2={y + height + 2} />
        </g>
      )}

      {leftPanels > 0 && (
        <FoldAccordionMark
          x={innerX}
          y={foldStackY}
          direction="left"
          panelCount={leftPanels}
          anchor="edge"
          strokeColor={LINE_COLOR}
        />
      )}
      {rightPanels > 0 && (
        <FoldAccordionMark
          x={innerX + innerWidth}
          y={foldStackY}
          direction="right"
          panelCount={rightPanels}
          anchor="edge"
          strokeColor={LINE_COLOR}
        />
      )}

      {showOutInMarker && <OutInLabel x={x + width + 54} y={y - 6} />}
    </g>
  );
}

function FoldingFrame({
  x,
  y,
  width,
  height,
  railThickness,
}: {
  x: number;
  y: number;
  width: number;
  height: number;
  railThickness: number;
}) {
  return (
    <g fill="#fff" stroke={LINE_COLOR} strokeLinecap="square" strokeLinejoin="miter">
      <rect x={x} y={y} width={width} height={height} strokeWidth={2.2} />
      <rect
        x={x + railThickness}
        y={y + railThickness}
        width={width - railThickness * 2}
        height={height - railThickness * 2}
        strokeWidth={1.5}
      />
      <line
        x1={x + railThickness}
        y1={y + railThickness * 0.48}
        x2={x + width - railThickness}
        y2={y + railThickness * 0.48}
        strokeWidth={1.2}
      />
      <line
        x1={x + railThickness}
        y1={y + height - railThickness * 0.48}
        x2={x + width - railThickness}
        y2={y + height - railThickness * 0.48}
        strokeWidth={1.2}
      />
    </g>
  );
}

function FoldingPanel({
  x,
  y,
  width,
  height,
  index,
  leftPanels,
  showHandle,
  handleSide,
}: FoldingPanelProps) {
  const stileWidth = Math.max(4, Math.min(9, width * 0.08));
  const glassInsetX = Math.max(7, Math.min(13, width * 0.12));
  const glassInsetY = Math.max(5, Math.min(8, height * 0.028));
  const glassX = x + glassInsetX;
  const glassY = y + glassInsetY;
  const glassWidth = Math.max(width - glassInsetX * 2, 6);
  const glassHeight = Math.max(height - glassInsetY * 2, 12);
  const handleOnRight = handleSide === "right";
  const handleX = handleOnRight ? x + width - stileWidth - 3 : x + stileWidth + 1;
  const foldDirection = index < leftPanels ? "left" : "right";

  return (
    <g fill="#fff" stroke={LINE_COLOR} strokeLinecap="square" strokeLinejoin="miter">
      <rect x={x} y={y} width={width} height={height} strokeWidth={1.7} />
      <line x1={x + stileWidth} y1={y} x2={x + stileWidth} y2={y + height} strokeWidth={1.2} />
      <line
        x1={x + width - stileWidth}
        y1={y}
        x2={x + width - stileWidth}
        y2={y + height}
        strokeWidth={1.2}
      />
      <rect
        x={glassX}
        y={glassY}
        width={glassWidth}
        height={glassHeight}
        strokeWidth={1.4}
      />

      <FoldDirectionOverlay
        x={glassX}
        y={glassY}
        width={glassWidth}
        height={glassHeight}
        direction={foldDirection}
      />

      <GlassMark
        cx={x + width * 0.52}
        cy={y + height * 0.52}
        size={Math.max(10, Math.min(18, width * 0.22))}
      />

      {showHandle && (
        <g>
          <rect
            x={handleX}
            y={y + height * 0.46}
            width={5}
            height={height * 0.12}
            rx={1.5}
            fill="#fff"
            strokeWidth={1.4}
          />
          <line
            x1={handleX + 2.5}
            y1={y + height * 0.49}
            x2={handleX + 2.5}
            y2={y + height * 0.55}
            strokeWidth={1.2}
          />
        </g>
      )}
    </g>
  );
}

function FoldDirectionOverlay({
  x,
  y,
  width,
  height,
  direction,
}: {
  x: number;
  y: number;
  width: number;
  height: number;
  direction: "left" | "right";
}) {
  const insetX = Math.max(3, Math.min(8, width * 0.06));
  const insetY = Math.max(4, Math.min(10, height * 0.035));
  const topY = y + insetY;
  const midY = y + height * 0.5;
  const bottomY = y + height - insetY;
  const farSideX = direction === "left" ? x + width - insetX : x + insetX;
  const pointX = direction === "left" ? x + insetX : x + width - insetX;

  return (
    <g
      fill="none"
      stroke={GUIDE_COLOR}
      strokeLinecap="square"
      strokeLinejoin="miter"
      opacity={0.82}
    >
      <path
        d={`M ${farSideX} ${topY} L ${pointX} ${midY} L ${farSideX} ${bottomY}`}
        strokeWidth={1.5}
        strokeDasharray="10 14"
      />
    </g>
  );
}

function FoldingMovementLegend({
  x,
  y,
  width,
  leftPanels,
  rightPanels,
}: {
  x: number;
  y: number;
  width: number;
  leftPanels: number;
  rightPanels: number;
}) {
  const arrowGap = 18;
  const leftFoldWidth = getFoldAccordionWidth(leftPanels);
  const rightFoldWidth = getFoldAccordionWidth(rightPanels);
  const leftArrow = getAdjacentFoldArrow({
    edgeX: x,
    foldWidth: leftFoldWidth,
    direction: "left",
    minX: x,
    maxX: x + width,
    gap: arrowGap,
  });
  const rightArrow = getAdjacentFoldArrow({
    edgeX: x + width,
    foldWidth: rightFoldWidth,
    direction: "right",
    minX: x,
    maxX: x + width,
    gap: arrowGap,
  });

  return (
    <g fill="none" stroke={LINE_COLOR} strokeLinecap="square" strokeLinejoin="miter">
      {leftPanels > 0 && (
        <g>
          <FoldArrow
            x1={leftArrow.x1}
            x2={leftArrow.x2}
            y={y}
            direction="left"
            strokeColor={LINE_COLOR}
          />
          <FoldAccordionMark
            x={x}
            y={y - 13}
            direction="left"
            panelCount={leftPanels}
            anchor="edge"
            strokeColor={LINE_COLOR}
          />
        </g>
      )}

      {rightPanels > 0 && (
        <g>
          <FoldArrow
            x1={rightArrow.x1}
            x2={rightArrow.x2}
            y={y}
            direction="right"
            strokeColor={LINE_COLOR}
          />
          <FoldAccordionMark
            x={x + width}
            y={y - 13}
            direction="right"
            panelCount={rightPanels}
            anchor="edge"
            strokeColor={LINE_COLOR}
          />
        </g>
      )}
    </g>
  );
}

function getAdjacentFoldArrow({
  edgeX,
  foldWidth,
  direction,
  minX,
  maxX,
  gap,
}: {
  edgeX: number;
  foldWidth: number;
  direction: "left" | "right";
  minX: number;
  maxX: number;
  gap: number;
}) {
  const desiredLength = Math.min(120, Math.max(70, (maxX - minX) * 0.22));
  const minLength = 42;

  if (direction === "left") {
    const foldRightX = edgeX + foldWidth;
    const tailX = Math.min(maxX, foldRightX + gap + desiredLength);
    const headX = Math.min(foldRightX + gap, tailX - minLength);
    return { x1: tailX, x2: headX };
  }

  const foldLeftX = edgeX - foldWidth;
  const headX = Math.max(minX, foldLeftX - gap);
  const tailX = Math.max(minX, headX - desiredLength);
  return { x1: tailX, x2: headX };
}

function FoldArrow({
  x1,
  x2,
  y,
  direction,
  strokeColor = LINE_COLOR,
}: {
  x1: number;
  x2: number;
  y: number;
  direction: "left" | "right";
  strokeColor?: string;
}) {
  const startX = Math.min(x1, x2);
  const endX = Math.max(x1, x2);
  const headX = direction === "left" ? startX : endX;
  const tailX = direction === "left" ? endX : startX;
  const headSign = direction === "left" ? 1 : -1;

  return (
    <g stroke={strokeColor} strokeWidth={1.7} fill="none" strokeLinecap="square">
      <line x1={tailX} y1={y} x2={headX} y2={y} />
      <line x1={headX} y1={y} x2={headX + headSign * 10} y2={y - 7} />
      <line x1={headX} y1={y} x2={headX + headSign * 10} y2={y + 7} />
    </g>
  );
}

function FoldAccordionMark({
  x,
  y,
  direction,
  panelCount,
  anchor = "center",
  strokeColor = GUIDE_COLOR,
}: {
  x: number;
  y: number;
  direction: "left" | "right";
  panelCount: number;
  anchor?: "center" | "edge";
  strokeColor?: string;
}) {
  const safePanelCount = Math.max(Math.round(panelCount), 1);
  const segmentWidth = FOLD_ACCORDION_SEGMENT_WIDTH;
  const segmentHeight = 26;
  const pathWidth = segmentWidth * safePanelCount;
  const startX =
    anchor === "edge"
      ? x
      : direction === "left"
        ? x - pathWidth / 2
        : x + pathWidth / 2;
  const startY = y;
  const points = Array.from({ length: safePanelCount + 1 }).map((_, index) => ({
    x:
      direction === "left"
        ? startX + segmentWidth * index
        : startX - segmentWidth * index,
    y: startY + (index % 2 === 0 ? 0 : segmentHeight),
  }));
  const pathD = points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
    .join(" ");

  return (
    <g stroke={strokeColor} strokeWidth={1.7} fill="none" strokeLinecap="square">
      <path d={pathD} />
    </g>
  );
}

const FOLD_ACCORDION_SEGMENT_WIDTH = 14;

function getFoldAccordionWidth(panelCount: number) {
  return Math.max(Math.round(panelCount), 0) * FOLD_ACCORDION_SEGMENT_WIDTH;
}

function GlassMark({
  cx,
  cy,
  size,
}: {
  cx: number;
  cy: number;
  size: number;
}) {
  return (
    <g stroke={LINE_COLOR} strokeWidth={1.8} strokeLinecap="square">
      <line x1={cx - size * 0.45} y1={cy + size * 0.4} x2={cx + size * 0.15} y2={cy - size * 0.55} />
      <line x1={cx + size * 0.05} y1={cy + size * 0.55} x2={cx + size * 0.65} y2={cy - size * 0.4} />
    </g>
  );
}

function FrameDimensions({
  x,
  y,
  width,
  height,
  widthMm,
  heightMm,
}: {
  x: number;
  y: number;
  width: number;
  height: number;
  widthMm: number;
  heightMm: number;
}) {
  const widthY = y - 45;
  const heightX = x - 52;
  const verticalLabelX = heightX < 46 ? heightX + 28 : heightX - 16;
  const widthLabel = `${Math.round(Math.max(widthMm, 1))}`;
  const heightLabel = `${Math.round(Math.max(heightMm, 1))}`;

  return (
    <g fill="none" stroke={LINE_COLOR} strokeLinecap="square" strokeLinejoin="miter">
      <DimensionLine
        x1={x}
        y1={widthY}
        x2={x + width}
        y2={widthY}
        label={widthLabel}
        labelX={x + width / 2}
        labelY={widthY + 10}
      />
      <line x1={x} y1={widthY - 16} x2={x} y2={y - 8} strokeWidth={1.2} />
      <line x1={x + width} y1={widthY - 16} x2={x + width} y2={y - 8} strokeWidth={1.2} />

      <DimensionLine
        x1={heightX}
        y1={y}
        x2={heightX}
        y2={y + height}
        label={heightLabel}
        labelX={verticalLabelX}
        labelY={y + height / 2 + 9}
        vertical
      />
      <line x1={heightX - 14} y1={y} x2={x - 8} y2={y} strokeWidth={1.2} />
      <line x1={heightX - 14} y1={y + height} x2={x - 8} y2={y + height} strokeWidth={1.2} />
    </g>
  );
}

function DimensionLine({
  x1,
  y1,
  x2,
  y2,
  label,
  labelX,
  labelY,
  vertical = false,
}: {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  label: string;
  labelX: number;
  labelY: number;
  vertical?: boolean;
}) {
  const fontSize = 24;
  const labelWidth = Math.max(54, label.length * 14);

  return (
    <g>
      <line x1={x1} y1={y1} x2={x2} y2={y2} strokeWidth={1.2} />
      {vertical ? (
        <>
          <path d={`M ${x1 - 8} ${y1 + 8} L ${x1} ${y1} L ${x1 + 8} ${y1 + 8}`} strokeWidth={1.2} />
          <path d={`M ${x2 - 8} ${y2 - 8} L ${x2} ${y2} L ${x2 + 8} ${y2 - 8}`} strokeWidth={1.2} />
        </>
      ) : (
        <>
          <path d={`M ${x1 + 8} ${y1 - 8} L ${x1} ${y1} L ${x1 + 8} ${y1 + 8}`} strokeWidth={1.2} />
          <path d={`M ${x2 - 8} ${y2 - 8} L ${x2} ${y2} L ${x2 - 8} ${y2 + 8}`} strokeWidth={1.2} />
        </>
      )}
      <rect
        x={labelX - labelWidth / 2}
        y={labelY - fontSize + 3}
        width={labelWidth}
        height={fontSize + 8}
        fill="#fff"
        stroke="none"
      />
      <text
        x={labelX}
        y={labelY}
        fill={LINE_COLOR}
        stroke="none"
        fontFamily={DRAWING_FONT}
        fontSize={fontSize}
        textAnchor="middle"
      >
        {label}
      </text>
    </g>
  );
}

function OutInLabel({ x, y }: { x: number; y: number }) {
  const fontSize = 21;

  return (
    <g stroke={LINE_COLOR} fill={LINE_COLOR}>
      <text
        x={x}
        y={y}
        stroke="none"
        fontFamily={DRAWING_FONT}
        fontSize={fontSize}
        textAnchor="middle"
      >
        OUT
      </text>
      <line x1={x - 26} y1={y + 8} x2={x + 26} y2={y + 8} strokeWidth={1.3} />
      <text
        x={x}
        y={y + 30}
        stroke="none"
        fontFamily={DRAWING_FONT}
        fontSize={fontSize}
        textAnchor="middle"
      >
        IN
      </text>
    </g>
  );
}

function getSafePanelCount(panelCount: number) {
  return clamp(Math.round(panelCount) || 1, 1, MAX_FOLDING_PANELS);
}

function getFoldingHandlesByDoorNumber(
  folding: FoldingDoorConfig | undefined,
  totalPanels: number,
  leftPanels: number
) {
  const handles = new Map<number, HandleSide>();

  if (folding?.handles?.length) {
    folding.handles.forEach((handle) => {
      const doorNumber = Math.round(handle.doorNumber);

      if (doorNumber >= 1 && doorNumber <= totalPanels && handles.size < 2) {
        handles.set(doorNumber, handle.side === "left" ? "left" : "right");
      }
    });

    return handles;
  }

  (folding?.handleDoorNumbers ?? []).forEach((doorNumber) => {
    const safeDoorNumber = Math.round(doorNumber);

    if (safeDoorNumber >= 1 && safeDoorNumber <= totalPanels && handles.size < 2) {
      handles.set(safeDoorNumber, safeDoorNumber <= leftPanels ? "right" : "left");
    }
  });

  return handles;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}
