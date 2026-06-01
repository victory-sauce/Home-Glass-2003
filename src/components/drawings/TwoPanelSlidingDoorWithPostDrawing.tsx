import { cn } from "@/lib/utils";

type TwoPanelSlidingDoorWithPostDrawingProps = {
  widthMm: number;
  heightMm: number;
  keyHeightMm?: number;
  quantity?: number;
  showLock?: boolean;
  lockPosition?: "left" | "right";
  itemCode?: string;
  productName?: string;
  className?: string;
};

export function TwoPanelSlidingDoorWithPostDrawing({
  widthMm,
  heightMm,
  keyHeightMm = 1000,
  showLock = true,
  className,
}: TwoPanelSlidingDoorWithPostDrawingProps) {
  const widthLabel = Math.round(Math.max(widthMm, 1));
  const heightLabel = Math.round(Math.max(heightMm, 1));
  const keyHeightLabel = Math.round(Math.max(keyHeightMm, 0));

  const doorHeight = 330;
  const doorWidth = doorHeight * (widthLabel / heightLabel);
  const doorX = 395 - doorWidth / 2;
  const doorY = 205;
  const floorY = doorY + doorHeight;
  const centerX = doorX + doorWidth / 2;
  const keyY = floorY - doorHeight * Math.min(keyHeightLabel / heightLabel, 1);

  const frameInset = 8;
  const panelTop = doorY + 18;
  const panelBottom = floorY - 18;
  const panelHeight = panelBottom - panelTop;
  const overlapWidth = Math.max(8, doorWidth * 0.055);
  const backLeafX = centerX + 4;
  const backLeafWidth = doorX + doorWidth - 24 - backLeafX;
  const frontLeafX = doorX + 18;
  const frontLeafWidth = centerX - frontLeafX + overlapWidth;
  const frontLeafRight = frontLeafX + frontLeafWidth;

  return (
    <svg
      viewBox="0 0 760 585"
      role="img"
      aria-label="D5 two-panel sliding door with reinforced post technical drawing"
      className={cn("w-full rounded-xl border border-slate-200 bg-white", className)}
    >
      <rect width="760" height="585" fill="#fff" />

      <TopView />

      <text x="560" y="78" textAnchor="middle" fontFamily="serif" fontSize="28" fill="#111827">
        OUT
      </text>
      <line x1="525" y1="88" x2="595" y2="88" stroke="#111827" strokeWidth="1.5" />
      <text x="560" y="118" textAnchor="middle" fontFamily="serif" fontSize="28" fill="#111827">
        IN
      </text>

      <DimensionLine
        x1={doorX}
        y1={doorY - 70}
        x2={doorX + doorWidth}
        y2={doorY - 70}
        label={`${widthLabel}`}
        labelX={centerX}
        labelY={doorY - 57}
        fontSize={28}
      />
      <ExtensionLine x={doorX} y1={doorY - 82} y2={doorY - 14} />
      <ExtensionLine x={doorX + doorWidth} y1={doorY - 82} y2={doorY - 14} />

      <DimensionLine
        x1={doorX - 92}
        y1={doorY}
        x2={doorX - 92}
        y2={floorY}
        label={`${heightLabel}`}
        labelX={doorX - 92}
        labelY={doorY + doorHeight / 2 + 8}
        vertical
        fontSize={28}
      />
      <line x1={doorX - 106} y1={doorY} x2={doorX - 12} y2={doorY} stroke="#111827" strokeWidth="1.4" />
      <line x1={doorX - 106} y1={floorY} x2={doorX - 12} y2={floorY} stroke="#111827" strokeWidth="1.4" />

      <g stroke="#111827" fill="none" strokeLinecap="square">
        <rect x={doorX} y={doorY} width={doorWidth} height={doorHeight} strokeWidth="2" />

        <line x1={doorX + frameInset} y1={doorY + frameInset} x2={doorX + doorWidth - frameInset} y2={doorY + frameInset} strokeWidth="1.2" />
        <line x1={doorX + frameInset} y1={floorY - frameInset} x2={doorX + doorWidth - frameInset} y2={floorY - frameInset} strokeWidth="1.2" />
        <line x1={doorX + frameInset} y1={doorY + frameInset} x2={doorX + frameInset} y2={floorY - frameInset} strokeWidth="1.2" />
        <line x1={doorX + doorWidth - frameInset} y1={doorY + frameInset} x2={doorX + doorWidth - frameInset} y2={floorY - frameInset} strokeWidth="1.2" />

        <DoorLeaf x={backLeafX} y={panelTop} width={backLeafWidth} height={panelHeight} />
        <DoorLeaf x={frontLeafX} y={panelTop} width={frontLeafWidth} height={panelHeight} />
        <line x1={frontLeafRight} y1={doorY + frameInset} x2={frontLeafRight} y2={floorY - frameInset} strokeWidth="1.8" />

        <GlassMarks x={frontLeafX + frontLeafWidth * 0.58} y={doorY + doorHeight * 0.45} />
        <GlassMarks x={backLeafX + backLeafWidth * 0.63} y={doorY + doorHeight * 0.45} />
        <SlideArrow x={centerX - 35} y={doorY + doorHeight * 0.55} length={70} />

        {showLock && (
          <>
            <rect x={doorX + 10} y={keyY - 9} width="4" height="20" strokeWidth="1.2" />
            <circle cx={doorX + doorWidth - 34} cy={keyY} r="12" fill="#fff" strokeWidth="1.4" />
            <text x={doorX + doorWidth - 34} y={keyY + 4} textAnchor="middle" fontFamily="serif" fontSize="12" fill="#111827" stroke="none">
              key
            </text>
            <rect x={doorX + doorWidth - 9} y={keyY - 11} width="4" height="22" strokeWidth="1.2" />
          </>
        )}
      </g>

      <line x1="0" y1={floorY} x2="760" y2={floorY} stroke="#111827" strokeWidth="2.5" />
      <text x="18" y={floorY - 12} fontFamily="serif" fontSize="20" fill="#111827">
        ระดับพื้น
      </text>

      <DimensionLine
        x1={doorX + doorWidth + 70}
        y1={floorY}
        x2={doorX + doorWidth + 70}
        y2={keyY}
        label={`${keyHeightLabel}`}
        labelX={doorX + doorWidth + 70}
        labelY={floorY - (floorY - keyY) / 2 + 8}
        vertical
        fontSize={28}
      />
      <line x1={doorX + doorWidth + 10} y1={keyY} x2={doorX + doorWidth + 84} y2={keyY} stroke="#111827" strokeWidth="1.4" />
    </svg>
  );
}

function TopView() {
  return (
    <g stroke="#111827" fill="none" strokeLinecap="square">
      <SlideArrow x={374} y={38} length={52} />
      <rect x={310} y={72} width={190} height={16} strokeWidth="1.2" />
      <line x1={316} y1={76} x2={494} y2={76} strokeWidth="1" />
      <line x1={316} y1={84} x2={494} y2={84} strokeWidth="1" />
      <rect x={318} y={74} width={87} height={5} strokeWidth="1" />
      <rect x={405} y={81} width={87} height={5} strokeWidth="1" />
      <line x1={405} y1={72} x2={405} y2={88} strokeWidth="1" />
      <line x1={320} y1={72} x2={320} y2={88} strokeWidth="1" />
      <line x1={490} y1={72} x2={490} y2={88} strokeWidth="1" />
    </g>
  );
}

function ExtensionLine({ x, y1, y2 }: { x: number; y1: number; y2: number }) {
  return <line x1={x} y1={y1} x2={x} y2={y2} stroke="#111827" strokeWidth="1.4" />;
}

function DoorLeaf({
  x,
  y,
  width,
  height,
}: {
  x: number;
  y: number;
  width: number;
  height: number;
}) {
  const inset = 9;

  return (
    <g>
      <rect x={x} y={y} width={width} height={height} fill="#fff" stroke="#111827" strokeWidth="1.3" />
      <rect
        x={x + inset}
        y={y + inset}
        width={Math.max(width - inset * 2, 1)}
        height={Math.max(height - inset * 2, 1)}
        fill="none"
        stroke="#111827"
        strokeWidth="1.2"
      />
    </g>
  );
}

function SlideArrow({ x, y, length }: { x: number; y: number; length: number }) {
  return (
    <g>
      <path d={`M ${x} ${y} h ${length} l -6 6`} fill="none" stroke="#111827" strokeWidth="1.4" />
      <path d={`M ${x + 6} ${y - 6} l -6 6 l 6 6`} fill="none" stroke="#111827" strokeWidth="1.4" />
    </g>
  );
}

function GlassMarks({ x, y }: { x: number; y: number }) {
  return (
    <g stroke="#111827" strokeWidth="1.2">
      <line x1={x} y1={y + 24} x2={x + 18} y2={y - 8} />
      <line x1={x + 8} y1={y + 24} x2={x + 26} y2={y - 8} />
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
  fontSize = 24,
}: {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  label: string;
  labelX: number;
  labelY: number;
  vertical?: boolean;
  fontSize?: number;
}) {
  return (
    <g>
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#111827" strokeWidth="1.2" />
      {vertical ? (
        <>
          <path d={`M ${x1 - 9} ${y1 - 9} L ${x1} ${y1} L ${x1 + 9} ${y1 - 9}`} fill="none" stroke="#111827" strokeWidth="1.2" />
          <path d={`M ${x2 - 9} ${y2 + 9} L ${x2} ${y2} L ${x2 + 9} ${y2 + 9}`} fill="none" stroke="#111827" strokeWidth="1.2" />
        </>
      ) : (
        <>
          <path d={`M ${x1 + 9} ${y1 - 9} L ${x1} ${y1} L ${x1 + 9} ${y1 + 9}`} fill="none" stroke="#111827" strokeWidth="1.2" />
          <path d={`M ${x2 - 9} ${y2 - 9} L ${x2} ${y2} L ${x2 - 9} ${y2 + 9}`} fill="none" stroke="#111827" strokeWidth="1.2" />
        </>
      )}
      <rect x={labelX - 38} y={labelY - fontSize + 4} width="76" height={fontSize + 8} fill="#fff" />
      <text x={labelX} y={labelY} textAnchor="middle" fontFamily="serif" fontSize={fontSize} fill="#111827">
        {label}
      </text>
    </g>
  );
}
