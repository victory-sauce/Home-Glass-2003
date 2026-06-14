import type { FoldingDoorConfig } from "@/components/quotations/types";
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
};

const LINE_COLOR = "#111827";
const GUIDE_COLOR = "#8a8f94";
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
  const handleDoorNumbers = new Set(
    (folding?.handleDoorNumbers ?? []).filter(
      (doorNumber) => doorNumber >= 1 && doorNumber <= totalPanels
    )
  );

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
          showHandle={handleDoorNumbers.has(index + 1)}
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
  const height = 34;
  const endBlockWidth = 18;
  const innerX = x + endBlockWidth;
  const innerWidth = Math.max(width - endBlockWidth * 2, 1);
  const panelWidth = innerWidth / totalPanels;
  const splitX = innerX + panelWidth * leftPanels;

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

      <line x1={innerX} y1={y + 9} x2={innerX + innerWidth} y2={y + 9} strokeWidth={1.3} />
      <line
        x1={innerX}
        y1={y + height - 9}
        x2={innerX + innerWidth}
        y2={y + height - 9}
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
          x1={innerX + innerWidth * 0.4}
          x2={innerX + innerWidth * 0.18}
          y={y - 18}
          direction="left"
        />
      )}

      {rightPanels > 0 && (
        <FoldArrow
          x1={innerX + innerWidth * 0.6}
          x2={innerX + innerWidth * 0.82}
          y={y - 18}
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
          y={y + height + 12}
          direction="left"
          panelCount={leftPanels}
          anchor="edge"
        />
      )}
      {rightPanels > 0 && (
        <FoldAccordionMark
          x={innerX + innerWidth}
          y={y + height + 12}
          direction="right"
          panelCount={rightPanels}
          anchor="edge"
        />
      )}

      {showOutInMarker && (
        <g transform={`translate(${x + width + 48} ${y - 10})`}>
          <text
            x={0}
            y={0}
            textAnchor="middle"
            fontFamily="Times New Roman, serif"
            fontSize={31}
            fontWeight={700}
            fill={LINE_COLOR}
            stroke="none"
          >
            OUT
          </text>
          <line x1={-38} y1={10} x2={38} y2={10} strokeWidth={1.8} />
          <text
            x={0}
            y={40}
            textAnchor="middle"
            fontFamily="Times New Roman, serif"
            fontSize={31}
            fontWeight={700}
            fill={LINE_COLOR}
            stroke="none"
          >
            IN
          </text>
        </g>
      )}
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
}: FoldingPanelProps) {
  const stileWidth = Math.max(4, Math.min(9, width * 0.08));
  const glassInsetX = Math.max(7, Math.min(13, width * 0.12));
  const glassInsetY = Math.max(10, Math.min(16, height * 0.055));
  const glassX = x + glassInsetX;
  const glassY = y + glassInsetY;
  const glassWidth = Math.max(width - glassInsetX * 2, 6);
  const glassHeight = Math.max(height - glassInsetY * 2, 12);
  const handleOnRight = index < leftPanels;
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
  return (
    <g fill="none" stroke={GUIDE_COLOR} strokeLinecap="square" strokeLinejoin="miter">
      {leftPanels > 0 && (
        <g>
          <FoldArrow
            x1={x + width * 0.44}
            x2={x + width * 0.24}
            y={y}
            direction="left"
            strokeColor={GUIDE_COLOR}
          />
          <FoldAccordionMark
            x={x}
            y={y + 22}
            direction="left"
            panelCount={leftPanels}
            anchor="edge"
          />
        </g>
      )}

      {rightPanels > 0 && (
        <g>
          <FoldArrow
            x1={x + width * 0.56}
            x2={x + width * 0.76}
            y={y}
            direction="right"
            strokeColor={GUIDE_COLOR}
          />
          <FoldAccordionMark
            x={x + width}
            y={y + 22}
            direction="right"
            panelCount={rightPanels}
            anchor="edge"
          />
        </g>
      )}
    </g>
  );
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
}: {
  x: number;
  y: number;
  direction: "left" | "right";
  panelCount: number;
  anchor?: "center" | "edge";
}) {
  const safePanelCount = Math.max(Math.round(panelCount), 1);
  const segmentWidth = 14;
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
    <g stroke={GUIDE_COLOR} strokeWidth={1.7} fill="none" strokeLinecap="square">
      <path d={pathD} />
    </g>
  );
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

  return (
    <g stroke={LINE_COLOR} fill={LINE_COLOR} strokeLinecap="square" strokeLinejoin="miter">
      <DimensionArrow x1={x} y1={widthY} x2={x + width} y2={widthY} />
      <line x1={x} y1={widthY - 16} x2={x} y2={y - 8} strokeWidth={1.2} />
      <line x1={x + width} y1={widthY - 16} x2={x + width} y2={y - 8} strokeWidth={1.2} />
      <text
        x={x + width / 2}
        y={widthY + 8}
        textAnchor="middle"
        fontFamily="Times New Roman, serif"
        fontSize={26}
        stroke="none"
      >
        {Math.round(widthMm)}
      </text>

      <DimensionArrow x1={heightX} y1={y} x2={heightX} y2={y + height} />
      <line x1={heightX - 14} y1={y} x2={x - 8} y2={y} strokeWidth={1.2} />
      <line x1={heightX - 14} y1={y + height} x2={x - 8} y2={y + height} strokeWidth={1.2} />
      <text
        x={heightX - 16}
        y={y + height / 2 + 8}
        textAnchor="middle"
        fontFamily="Times New Roman, serif"
        fontSize={26}
        stroke="none"
      >
        {Math.round(heightMm)}
      </text>
    </g>
  );
}

function DimensionArrow({
  x1,
  y1,
  x2,
  y2,
}: {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}) {
  const isHorizontal = y1 === y2;
  const headSize = 10;

  if (isHorizontal) {
    return (
      <g fill="none" stroke={LINE_COLOR} strokeWidth={1.2}>
        <line x1={x1} y1={y1} x2={x2} y2={y2} />
        <line x1={x1} y1={y1} x2={x1 + headSize} y2={y1 - headSize} />
        <line x1={x1} y1={y1} x2={x1 + headSize} y2={y1 + headSize} />
        <line x1={x2} y1={y2} x2={x2 - headSize} y2={y2 - headSize} />
        <line x1={x2} y1={y2} x2={x2 - headSize} y2={y2 + headSize} />
      </g>
    );
  }

  return (
    <g fill="none" stroke={LINE_COLOR} strokeWidth={1.2}>
      <line x1={x1} y1={y1} x2={x2} y2={y2} />
      <line x1={x1} y1={y1} x2={x1 - headSize} y2={y1 + headSize} />
      <line x1={x1} y1={y1} x2={x1 + headSize} y2={y1 + headSize} />
      <line x1={x2} y1={y2} x2={x2 - headSize} y2={y2 - headSize} />
      <line x1={x2} y1={y2} x2={x2 + headSize} y2={y2 - headSize} />
    </g>
  );
}

function getSafePanelCount(panelCount: number) {
  return clamp(Math.round(panelCount) || 1, 1, MAX_FOLDING_PANELS);
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}
