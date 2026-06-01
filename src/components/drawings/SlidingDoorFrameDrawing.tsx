import type {
  DoorConfig,
  DoorMotion,
  TrackCount,
} from "@/components/quotations/types";
import { cn } from "@/lib/utils";

type SlidingDoorFrameDrawingProps = {
  widthMm: number;
  heightMm: number;
  trackCount?: TrackCount;
  showOutInMarker?: boolean;
  className?: string;
};

type SlidingDoorFixedDoorDrawingProps = SlidingDoorFrameDrawingProps & {
  panelCount?: number;
};

type SlidingDoorBehindTrackDrawingProps = SlidingDoorFrameDrawingProps;

type SlidingDoorCustomSystemDrawingProps = SlidingDoorFrameDrawingProps & {
  doors?: DoorConfig[];
  panelCount?: number;
};

type SlidingDoorFrameProps = {
  x: number;
  y: number;
  width: number;
  height: number;
  railThickness: number;
};

type FixedDoorProps = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type BehindTrackDoorProps = FixedDoorProps & {
  openSide: "left" | "right";
  slideDirection: "left" | "right";
};

type TopViewDoor = DoorConfig & {
  index: number;
};

const TOP_VIEW_TRACK_HEIGHT = 12;

export function SlidingDoorFrameDrawing({
  widthMm,
  heightMm,
  trackCount = 2,
  showOutInMarker = true,
  className,
}: SlidingDoorFrameDrawingProps) {
  const {
    viewBoxWidth,
    viewBoxHeight,
    frameX,
    frameY,
    frameWidth,
    frameHeight,
    railThickness,
    topViewY,
  } = getFrameLayout(widthMm, heightMm, { includeTopView: true });

  return (
    <svg
      viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`}
      role="img"
      aria-label="Sliding door frame module"
      className={cn("w-full rounded-xl border border-slate-200 bg-white", className)}
    >
      <rect width={viewBoxWidth} height={viewBoxHeight} fill="#fff" />

      <SlidingDoorTopViewFrame
        x={frameX}
        y={topViewY}
        width={frameWidth}
        trackCount={trackCount}
        showOutInMarker={showOutInMarker}
      />
      <FrameDimensions
        x={frameX}
        y={frameY}
        width={frameWidth}
        height={frameHeight}
        widthMm={widthMm}
        heightMm={heightMm}
      />

      <SlidingDoorFrame
        x={frameX}
        y={frameY}
        width={frameWidth}
        height={frameHeight}
        railThickness={railThickness}
      />
    </svg>
  );
}

export function SlidingDoorFixedDoorDrawing({
  widthMm,
  heightMm,
  panelCount = 1,
  trackCount = 1,
  showOutInMarker = true,
  className,
}: SlidingDoorFixedDoorDrawingProps) {
  const {
    viewBoxWidth,
    viewBoxHeight,
    frameX,
    frameY,
    frameWidth,
    frameHeight,
    railThickness,
    topViewY,
  } = getFrameLayout(widthMm, heightMm, { includeTopView: true });

  const safePanelCount = Math.max(Math.round(panelCount), 1);
  const openingX = frameX + railThickness;
  const openingY = frameY + railThickness;
  const openingWidth = Math.max(frameWidth - railThickness * 2, 1);
  const openingHeight = Math.max(frameHeight - railThickness * 2, 1);
  const doorX = openingX;
  const doorY = openingY;
  const doorWidth = Math.max(openingWidth / safePanelCount, 24);
  const doorHeight = Math.max(openingHeight, 24);

  return (
    <svg
      viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`}
      role="img"
      aria-label="Fixed door module"
      className={cn("w-full rounded-xl border border-slate-200 bg-white", className)}
    >
      <rect width={viewBoxWidth} height={viewBoxHeight} fill="#fff" />

      <SlidingDoorTopView
        x={frameX}
        y={topViewY}
        width={frameWidth}
        trackCount={trackCount}
        totalPanels={safePanelCount}
        fixedDoorIndexes={Array.from({ length: safePanelCount }).map((_, index) => index)}
        showOutInMarker={showOutInMarker}
      />
      <FrameDimensions
        x={frameX}
        y={frameY}
        width={frameWidth}
        height={frameHeight}
        widthMm={widthMm}
        heightMm={heightMm}
      />

      <SlidingDoorFrame
        x={frameX}
        y={frameY}
        width={frameWidth}
        height={frameHeight}
        railThickness={railThickness}
      />

      {Array.from({ length: safePanelCount }).map((_, index) => (
        <FixedDoor
          key={`fixed-door-${index}`}
          x={doorX + doorWidth * index}
          y={doorY}
          width={doorWidth}
          height={doorHeight}
        />
      ))}
    </svg>
  );
}

export function SlidingDoorBehindTrackDrawing({
  widthMm,
  heightMm,
  trackCount = 2,
  showOutInMarker = true,
  className,
}: SlidingDoorBehindTrackDrawingProps) {
  const {
    viewBoxWidth,
    viewBoxHeight,
    frameX,
    frameY,
    frameWidth,
    frameHeight,
    railThickness,
    topViewY,
  } = getFrameLayout(widthMm, heightMm, { includeTopView: true });

  const openingX = frameX + railThickness;
  const openingY = frameY + railThickness;
  const openingWidth = Math.max(frameWidth - railThickness * 2, 1);
  const openingHeight = Math.max(frameHeight - railThickness * 2, 1);
  const doorWidth = Math.max(openingWidth / 2, 24);
  const doorHeight = Math.max(openingHeight, 24);

  return (
    <svg
      viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`}
      role="img"
      aria-label="Behind track sliding door module"
      className={cn("w-full rounded-xl border border-slate-200 bg-white", className)}
    >
      <rect width={viewBoxWidth} height={viewBoxHeight} fill="#fff" />

      <SlidingDoorTopView
        x={frameX}
        y={topViewY}
        width={frameWidth}
        trackCount={trackCount}
        totalPanels={2}
        fixedDoorIndexes={[0]}
        behindDoorIndexes={[1]}
        showOutInMarker={showOutInMarker}
      />
      <FrameDimensions
        x={frameX}
        y={frameY}
        width={frameWidth}
        height={frameHeight}
        widthMm={widthMm}
        heightMm={heightMm}
      />

      <SlidingDoorFrame
        x={frameX}
        y={frameY}
        width={frameWidth}
        height={frameHeight}
        railThickness={railThickness}
      />

      <BehindTrackDoor
        x={openingX + doorWidth}
        y={openingY}
        width={doorWidth}
        height={doorHeight}
        openSide="left"
        slideDirection="left"
      />
      <FixedDoor x={openingX} y={openingY} width={doorWidth} height={doorHeight} />
    </svg>
  );
}

export function SlidingDoorBehindTrackReverseDrawing({
  widthMm,
  heightMm,
  trackCount = 2,
  showOutInMarker = true,
  className,
}: SlidingDoorBehindTrackDrawingProps) {
  const {
    viewBoxWidth,
    viewBoxHeight,
    frameX,
    frameY,
    frameWidth,
    frameHeight,
    railThickness,
    topViewY,
  } = getFrameLayout(widthMm, heightMm, { includeTopView: true });

  const openingX = frameX + railThickness;
  const openingY = frameY + railThickness;
  const openingWidth = Math.max(frameWidth - railThickness * 2, 1);
  const openingHeight = Math.max(frameHeight - railThickness * 2, 1);
  const doorWidth = Math.max(openingWidth / 2, 24);
  const doorHeight = Math.max(openingHeight, 24);

  return (
    <svg
      viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`}
      role="img"
      aria-label="Reverse behind track sliding door module"
      className={cn("w-full rounded-xl border border-slate-200 bg-white", className)}
    >
      <rect width={viewBoxWidth} height={viewBoxHeight} fill="#fff" />

      <SlidingDoorTopView
        x={frameX}
        y={topViewY}
        width={frameWidth}
        trackCount={trackCount}
        totalPanels={2}
        fixedDoorIndexes={[1]}
        behindDoorIndexes={[0]}
        showOutInMarker={showOutInMarker}
      />
      <FrameDimensions
        x={frameX}
        y={frameY}
        width={frameWidth}
        height={frameHeight}
        widthMm={widthMm}
        heightMm={heightMm}
      />

      <SlidingDoorFrame
        x={frameX}
        y={frameY}
        width={frameWidth}
        height={frameHeight}
        railThickness={railThickness}
      />

      <BehindTrackDoor
        x={openingX}
        y={openingY}
        width={doorWidth}
        height={doorHeight}
        openSide="right"
        slideDirection="right"
      />
      <FixedDoor
        x={openingX + doorWidth}
        y={openingY}
        width={doorWidth}
        height={doorHeight}
      />
    </svg>
  );
}

export function SlidingDoorFourPanelAssemblyDrawing({
  widthMm,
  heightMm,
  trackCount = 2,
  showOutInMarker = true,
  className,
}: SlidingDoorBehindTrackDrawingProps) {
  const {
    viewBoxWidth,
    viewBoxHeight,
    frameX,
    frameY,
    frameWidth,
    frameHeight,
    railThickness,
    topViewY,
  } = getFrameLayout(widthMm, heightMm, { includeTopView: true });

  const openingX = frameX + railThickness;
  const openingY = frameY + railThickness;
  const openingWidth = Math.max(frameWidth - railThickness * 2, 1);
  const openingHeight = Math.max(frameHeight - railThickness * 2, 1);
  const doorWidth = Math.max(openingWidth / 4, 24);
  const doorHeight = Math.max(openingHeight, 24);
  const doorOneX = openingX;
  const doorTwoX = openingX + doorWidth;
  const doorThreeX = openingX + doorWidth * 2;
  const doorFourX = openingX + doorWidth * 3;

  return (
    <svg
      viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`}
      role="img"
      aria-label="Four-panel front and behind track sliding door module"
      className={cn("w-full rounded-xl border border-slate-200 bg-white", className)}
    >
      <rect width={viewBoxWidth} height={viewBoxHeight} fill="#fff" />

      <SlidingDoorTopView
        x={frameX}
        y={topViewY}
        width={frameWidth}
        trackCount={trackCount}
        totalPanels={4}
        fixedDoorIndexes={[0, 3]}
        behindDoorIndexes={[1, 2]}
        showOutInMarker={showOutInMarker}
      />
      <FrameDimensions
        x={frameX}
        y={frameY}
        width={frameWidth}
        height={frameHeight}
        widthMm={widthMm}
        heightMm={heightMm}
      />

      <SlidingDoorFrame
        x={frameX}
        y={frameY}
        width={frameWidth}
        height={frameHeight}
        railThickness={railThickness}
      />

      <BehindTrackDoor
        x={doorTwoX}
        y={openingY}
        width={doorWidth}
        height={doorHeight}
        openSide="left"
        slideDirection="left"
      />
      <BehindTrackDoor
        x={doorThreeX}
        y={openingY}
        width={doorWidth}
        height={doorHeight}
        openSide="right"
        slideDirection="right"
      />
      <FixedDoor x={doorOneX} y={openingY} width={doorWidth} height={doorHeight} />
      <FixedDoor x={doorFourX} y={openingY} width={doorWidth} height={doorHeight} />
    </svg>
  );
}

export function SlidingDoorCustomSystemDrawing({
  widthMm,
  heightMm,
  trackCount = 2,
  panelCount = 2,
  doors,
  showOutInMarker = true,
  className,
}: SlidingDoorCustomSystemDrawingProps) {
  const {
    viewBoxWidth,
    viewBoxHeight,
    frameX,
    frameY,
    frameWidth,
    frameHeight,
    railThickness,
    topViewY,
  } = getFrameLayout(widthMm, heightMm, { includeTopView: true });

  const safeDoorCount = Math.max(Math.round(doors?.length || panelCount), 1);
  const normalizedDoors = normalizeDoorConfigs(doors, safeDoorCount, trackCount);
  const openingX = frameX + railThickness;
  const openingY = frameY + railThickness;
  const openingWidth = Math.max(frameWidth - railThickness * 2, 1);
  const openingHeight = Math.max(frameHeight - railThickness * 2, 1);
  const doorWidth = Math.max(openingWidth / safeDoorCount, 24);
  const doorHeight = Math.max(openingHeight, 24);
  const drawOrder = normalizedDoors
    .map((door, index) => ({ door, index }))
    .sort((a, b) => b.door.track - a.door.track || a.index - b.index);

  return (
    <svg
      viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`}
      role="img"
      aria-label="Custom sliding door system"
      className={cn("w-full rounded-xl border border-slate-200 bg-white", className)}
    >
      <rect width={viewBoxWidth} height={viewBoxHeight} fill="#fff" />

      <SlidingDoorTopView
        x={frameX}
        y={topViewY}
        width={frameWidth}
        trackCount={trackCount}
        totalPanels={safeDoorCount}
        doors={normalizedDoors.map((door, index) => ({
          ...door,
          index,
        }))}
        showOutInMarker={showOutInMarker}
      />
      <FrameDimensions
        x={frameX}
        y={frameY}
        width={frameWidth}
        height={frameHeight}
        widthMm={widthMm}
        heightMm={heightMm}
      />

      <SlidingDoorFrame
        x={frameX}
        y={frameY}
        width={frameWidth}
        height={frameHeight}
        railThickness={railThickness}
      />

      {drawOrder.map(({ door, index }) => {
        const doorX = openingX + doorWidth * index;

        if (door.motion === "fixed") {
          return (
            <FixedDoor
              key={door.id}
              x={doorX}
              y={openingY}
              width={doorWidth}
              height={doorHeight}
            />
          );
        }

        const slideDirection = door.motion === "slidesLeft" ? "left" : "right";

        return (
          <BehindTrackDoor
            key={door.id}
            x={doorX}
            y={openingY}
            width={doorWidth}
            height={doorHeight}
            openSide={slideDirection}
            slideDirection={slideDirection}
          />
        );
      })}
    </svg>
  );
}

function getFrameLayout(
  widthMm: number,
  heightMm: number,
  options: { includeTopView?: boolean } = {}
) {
  const safeWidthMm = Math.max(widthMm, 1);
  const safeHeightMm = Math.max(heightMm, 1);
  const includeTopView = options.includeTopView ?? false;

  const viewBoxWidth = 760;
  const viewBoxHeight = includeTopView ? 520 : 430;
  const maxFrameWidth = 650;
  const maxFrameHeight = includeTopView ? 300 : 330;
  const scale = Math.min(maxFrameWidth / safeWidthMm, maxFrameHeight / safeHeightMm);
  const frameWidth = safeWidthMm * scale;
  const frameHeight = safeHeightMm * scale;
  const frameX = (viewBoxWidth - frameWidth) / 2;
  const frameY = includeTopView ? 180 : (viewBoxHeight - frameHeight) / 2;
  const railThickness = Math.max(8, Math.min(16, frameWidth * 0.025));
  const topViewY = 58;

  return {
    viewBoxWidth,
    viewBoxHeight,
    frameX,
    frameY,
    frameWidth,
    frameHeight,
    railThickness,
    topViewY,
  };
}

function SlidingDoorTopView({
  x,
  y,
  width,
  trackCount = 2,
  totalPanels = 1,
  fixedDoorIndexes = [],
  behindDoorIndexes = [],
  doors,
  showOutInMarker = true,
}: {
  x: number;
  y: number;
  width: number;
  trackCount?: TrackCount;
  totalPanels?: number;
  fixedDoorIndexes?: number[];
  behindDoorIndexes?: number[];
  doors?: TopViewDoor[];
  showOutInMarker?: boolean;
}) {
  const frameWidth = 16;
  const safeTrackCount = getSafeTrackCount(trackCount);
  const frameHeight = getTopViewFrameHeight(safeTrackCount);
  const trackHeight = frameHeight / safeTrackCount;
  const innerX = x + frameWidth;
  const innerWidth = Math.max(width - frameWidth * 2, 1);
  const panelWidth = innerWidth / Math.max(totalPanels, 1);
  const legacyDoors = [
    ...behindDoorIndexes.map((index) => ({
      id: `top-view-behind-door-${index}`,
      index,
      track: Math.min(safeTrackCount, 2) as TrackCount,
      motion: "slidesLeft" as DoorMotion,
    })),
    ...fixedDoorIndexes.map((index) => ({
      id: `top-view-fixed-door-${index}`,
      index,
      track: 1 as TrackCount,
      motion: "fixed" as DoorMotion,
    })),
  ];
  const topViewDoors = doors ?? legacyDoors;

  return (
    <g fill="#fff" stroke="#111827" strokeLinecap="square" strokeLinejoin="miter">
      <SlidingDoorTopViewFrame
        x={x}
        y={y}
        width={width}
        trackCount={trackCount}
        showOutInMarker={false}
      />
      {topViewDoors.map((door) => (
        <TopViewTrackDoor
          key={`${door.id}-top-view`}
          x={innerX + panelWidth * door.index}
          y={getTopViewTrackY(y, safeTrackCount, trackHeight, door.track)}
          width={panelWidth}
          trackHeight={trackHeight}
        />
      ))}
      {topViewDoors
        .filter((door) => door.motion === "fixed")
        .map((door) => (
          <TopViewFixedLabel
            key={`${door.id}-top-view-fix-label`}
            x={innerX + panelWidth * door.index + panelWidth / 2}
            y={y - 10}
            panelWidth={panelWidth}
          />
        ))}
      {showOutInMarker && <OutInLabel x={x + width + 54} y={y - 6} />}
    </g>
  );
}

function SlidingDoorTopViewFrame({
  x,
  y,
  width,
  trackCount = 2,
  showOutInMarker = true,
}: {
  x: number;
  y: number;
  width: number;
  trackCount?: TrackCount;
  showOutInMarker?: boolean;
}) {
  const frameWidth = 16;
  const frameHeight = getTopViewFrameHeight(getSafeTrackCount(trackCount));
  const leftFrameRightX = x + frameWidth;
  const rightFrameLeftX = x + width - frameWidth;

  return (
    <g fill="#fff" stroke="#111827" strokeLinecap="square" strokeLinejoin="miter">
      <rect x={x} y={y} width={frameWidth} height={frameHeight} strokeWidth="1.5" />
      <rect x={x + width - frameWidth} y={y} width={frameWidth} height={frameHeight} strokeWidth="1.5" />
      <line x1={leftFrameRightX} y1={y} x2={rightFrameLeftX} y2={y} strokeWidth="1.5" />
      <line
        x1={leftFrameRightX}
        y1={y + frameHeight}
        x2={rightFrameLeftX}
        y2={y + frameHeight}
        strokeWidth="1.5"
      />
      {showOutInMarker && <OutInLabel x={x + width + 54} y={y - 6} />}
    </g>
  );
}

function normalizeDoorConfigs(
  doors: DoorConfig[] | undefined,
  doorCount: number,
  trackCount: TrackCount
): DoorConfig[] {
  const safeTrackCount = getSafeTrackCount(trackCount);

  return Array.from({ length: doorCount }).map((_, index) => {
    const door = doors?.[index];

    return {
      id: door?.id ?? `door-${index + 1}`,
      track: getSafeTrackCount(door?.track ?? 1) > safeTrackCount
        ? safeTrackCount
        : getSafeTrackCount(door?.track ?? 1),
      motion: door?.motion ?? "fixed",
    };
  });
}

function getSafeTrackCount(trackCount?: TrackCount): TrackCount {
  const parsedTrackCount = Number(trackCount) || 1;
  return Math.min(Math.max(Math.round(parsedTrackCount), 1), 4) as TrackCount;
}

function getTopViewFrameHeight(trackCount: TrackCount) {
  return Math.max(TOP_VIEW_TRACK_HEIGHT, trackCount * TOP_VIEW_TRACK_HEIGHT);
}

function getTopViewTrackY(
  y: number,
  trackCount: TrackCount,
  trackHeight: number,
  track: TrackCount
) {
  const safeTrack = Math.min(Math.max(track, 1), trackCount);
  return y + (trackCount - safeTrack) * trackHeight;
}

function TopViewTrackDoor({
  x,
  y,
  width,
  trackHeight,
}: {
  x: number;
  y: number;
  width: number;
  trackHeight: number;
}) {
  const squareSize = trackHeight;
  const rightSquareX = x + width - squareSize;
  const lineX1 = x + squareSize;
  const lineX2 = Math.max(rightSquareX, lineX1);
  const middleY = y + squareSize / 2;

  return (
    <g fill="#fff" stroke="#111827" strokeLinecap="square" strokeLinejoin="miter">
      <rect x={x} y={y} width={squareSize} height={squareSize} strokeWidth="1.5" />
      <rect x={rightSquareX} y={y} width={squareSize} height={squareSize} strokeWidth="1.5" />
      <line x1={lineX1} y1={y} x2={lineX2} y2={y} strokeWidth="1.5" />
      <line x1={lineX1} y1={middleY} x2={lineX2} y2={middleY} strokeWidth="1.5" />
      <line x1={lineX1} y1={y + squareSize} x2={lineX2} y2={y + squareSize} strokeWidth="1.5" />
    </g>
  );
}

function TopViewFixedLabel({
  x,
  y,
  panelWidth,
}: {
  x: number;
  y: number;
  panelWidth: number;
}) {
  const fontSize = Math.max(12, Math.min(25, panelWidth * 0.16));

  return (
    <text
      x={x}
      y={y}
      fill="#111827"
      stroke="none"
      fontFamily="Georgia, 'Times New Roman', serif"
      fontSize={fontSize}
      textAnchor="middle"
    >
      Fix
    </text>
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
  const dimensionStroke = "#111827";
  const topLineY = y - 42;
  const topExtensionY = topLineY - 12;
  const verticalLineX = Math.max(34, x - 54);
  const verticalLabelX = verticalLineX < 46 ? verticalLineX + 28 : verticalLineX - 16;
  const widthLabel = `${Math.round(Math.max(widthMm, 1))}`;
  const heightLabel = `${Math.round(Math.max(heightMm, 1))}`;

  return (
    <g fill="none" stroke={dimensionStroke} strokeLinecap="square" strokeLinejoin="miter">
      <DimensionLine
        x1={x}
        y1={topLineY}
        x2={x + width}
        y2={topLineY}
        label={widthLabel}
        labelX={x + width / 2}
        labelY={topLineY + 10}
      />
      <line x1={x} y1={topExtensionY} x2={x} y2={y - 8} strokeWidth="1.2" />
      <line
        x1={x + width}
        y1={topExtensionY}
        x2={x + width}
        y2={y - 8}
        strokeWidth="1.2"
      />

      <DimensionLine
        x1={verticalLineX}
        y1={y}
        x2={verticalLineX}
        y2={y + height}
        label={heightLabel}
        labelX={verticalLabelX}
        labelY={y + height / 2 + 9}
        vertical
      />
      <line x1={verticalLineX - 10} y1={y} x2={x - 8} y2={y} strokeWidth="1.2" />
      <line
        x1={verticalLineX - 10}
        y1={y + height}
        x2={x - 8}
        y2={y + height}
        strokeWidth="1.2"
      />
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
      <line x1={x1} y1={y1} x2={x2} y2={y2} strokeWidth="1.2" />
      {vertical ? (
        <>
          <path d={`M ${x1 - 8} ${y1 + 8} L ${x1} ${y1} L ${x1 + 8} ${y1 + 8}`} strokeWidth="1.2" />
          <path d={`M ${x2 - 8} ${y2 - 8} L ${x2} ${y2} L ${x2 + 8} ${y2 - 8}`} strokeWidth="1.2" />
        </>
      ) : (
        <>
          <path d={`M ${x1 + 8} ${y1 - 8} L ${x1} ${y1} L ${x1 + 8} ${y1 + 8}`} strokeWidth="1.2" />
          <path d={`M ${x2 - 8} ${y2 - 8} L ${x2} ${y2} L ${x2 - 8} ${y2 + 8}`} strokeWidth="1.2" />
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
        fill="#111827"
        stroke="none"
        fontFamily="Georgia, 'Times New Roman', serif"
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
    <g stroke="#111827" fill="#111827">
      <text
        x={x}
        y={y}
        stroke="none"
        fontFamily="Georgia, 'Times New Roman', serif"
        fontSize={fontSize}
        textAnchor="middle"
      >
        OUT
      </text>
      <line x1={x - 26} y1={y + 8} x2={x + 26} y2={y + 8} strokeWidth="1.3" />
      <text
        x={x}
        y={y + 30}
        stroke="none"
        fontFamily="Georgia, 'Times New Roman', serif"
        fontSize={fontSize}
        textAnchor="middle"
      >
        IN
      </text>
    </g>
  );
}

export function SlidingDoorFrame({
  x,
  y,
  width,
  height,
  railThickness,
}: SlidingDoorFrameProps) {
  const rightX = x + width - railThickness;
  const centerRailX = x + railThickness;
  const centerRailWidth = Math.max(width - railThickness * 2, 0);

  return (
    <g fill="#fff" stroke="#111827" strokeLinecap="square" strokeLinejoin="miter">
      <rect x={x} y={y} width={railThickness} height={height} strokeWidth="1.5" />
      <rect x={rightX} y={y} width={railThickness} height={height} strokeWidth="1.5" />
      <rect
        x={centerRailX}
        y={y}
        width={centerRailWidth}
        height={railThickness}
        strokeWidth="1.5"
      />
      <rect
        x={centerRailX}
        y={y + height - railThickness}
        width={centerRailWidth}
        height={railThickness}
        strokeWidth="1.5"
      />
    </g>
  );
}

export function FixedDoor({ x, y, width, height }: FixedDoorProps) {
  const inset = Math.max(8, Math.min(12, width * 0.08));
  const innerX = x + inset;
  const innerY = y + inset;
  const innerWidth = Math.max(width - inset * 2, 1);
  const innerHeight = Math.max(height - inset * 2, 1);
  const labelFontSize = Math.max(18, Math.min(34, width * 0.22));

  return (
    <g fill="#fff" stroke="#111827" strokeLinecap="square" strokeLinejoin="miter">
      <rect x={x} y={y} width={width} height={height} strokeWidth="1.5" />
      <rect x={innerX} y={innerY} width={innerWidth} height={innerHeight} strokeWidth="1.5" />
      <GlassMarks x={x + width * 0.5} y={y + height * 0.46} />
      <text
        x={innerX + innerWidth - 6}
        y={innerY + innerHeight - 8}
        fill="#111827"
        stroke="none"
        fontFamily="Georgia, 'Times New Roman', serif"
        fontSize={labelFontSize}
        textAnchor="end"
      >
        Fix
      </text>
    </g>
  );
}

export function BehindTrackDoor({
  x,
  y,
  width,
  height,
  openSide,
  slideDirection,
}: BehindTrackDoorProps) {
  const inset = Math.max(8, Math.min(12, width * 0.08));
  const innerOpenX = openSide === "left" ? x : x + width;
  const innerClosedX = openSide === "left" ? x + width - inset : x + inset;
  const innerY = y + inset;
  const innerBottomY = y + height - inset;
  const outerPath =
    openSide === "left"
      ? `M ${x} ${y} H ${x + width} V ${y + height} H ${x}`
      : `M ${x + width} ${y} H ${x} V ${y + height} H ${x + width}`;
  const innerPath =
    openSide === "left"
      ? `M ${innerOpenX} ${innerY} H ${innerClosedX} V ${innerBottomY} H ${innerOpenX}`
      : `M ${innerOpenX} ${innerY} H ${innerClosedX} V ${innerBottomY} H ${innerOpenX}`;

  return (
    <g fill="none" stroke="#111827" strokeLinecap="square" strokeLinejoin="miter">
      <path d={outerPath} strokeWidth="1.5" />
      <path d={innerPath} strokeWidth="1.5" />
      <GlassMarks x={x + width * 0.5} y={y + height * 0.46} />
      {slideDirection === "left" ? (
        <LeftSlideMark x={x + width * 0.5} y={y + height * 0.58} />
      ) : (
        <RightSlideMark x={x + width * 0.5} y={y + height * 0.58} />
      )}
    </g>
  );
}

function GlassMarks({ x, y }: { x: number; y: number }) {
  return (
    <g stroke="#111827" strokeWidth="1.5">
      <line x1={x - 10} y1={y + 18} x2={x + 5} y2={y - 8} />
      <line x1={x - 1} y1={y + 20} x2={x + 14} y2={y - 6} />
    </g>
  );
}

function LeftSlideMark({ x, y }: { x: number; y: number }) {
  const arrowWidth = 66;
  const leftX = x - arrowWidth / 2;
  const rightX = x + arrowWidth / 2;

  return (
    <g stroke="#111827" strokeWidth="1.5" fill="none">
      <path d={`M ${rightX} ${y} H ${leftX}`} />
      <path d={`M ${leftX} ${y} L ${leftX + 12} ${y - 7}`} />
      <path d={`M ${leftX} ${y} L ${leftX + 12} ${y + 7}`} />
      <text
        x={x}
        y={y + 22}
        stroke="none"
        fill="#111827"
        fontFamily="Georgia, 'Times New Roman', serif"
        fontSize="10"
        textAnchor="middle"
      >
        SLIDE
      </text>
    </g>
  );
}

function RightSlideMark({ x, y }: { x: number; y: number }) {
  const arrowWidth = 66;
  const leftX = x - arrowWidth / 2;
  const rightX = x + arrowWidth / 2;

  return (
    <g stroke="#111827" strokeWidth="1.5" fill="none">
      <path d={`M ${leftX} ${y} H ${rightX}`} />
      <path d={`M ${rightX} ${y} L ${rightX - 12} ${y - 7}`} />
      <path d={`M ${rightX} ${y} L ${rightX - 12} ${y + 7}`} />
      <text
        x={x}
        y={y + 22}
        stroke="none"
        fill="#111827"
        fontFamily="Georgia, 'Times New Roman', serif"
        fontSize="10"
        textAnchor="middle"
      >
        SLIDE
      </text>
    </g>
  );
}
