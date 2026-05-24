import { cn } from "@/lib/utils";

type FourPanelSlidingDoorDrawingProps = {
  widthMm: number;
  heightMm: number;
  quantity?: number;
  showLock?: boolean;
  lockPosition?: "left" | "right";
  itemCode?: string;
  productName?: string;
  className?: string;
};

export function FourPanelSlidingDoorDrawing({
  widthMm,
  heightMm,
  quantity = 1,
  showLock = true,
  lockPosition = "right",
  itemCode,
  productName,
  className,
}: FourPanelSlidingDoorDrawingProps) {
  const widthLabel = Math.round(Math.max(widthMm, 1));
  const heightLabel = Math.round(Math.max(heightMm, 1));
  const panelWidth = 145;
  const panelHeight = 330;
  const frameX = 70;
  const frameY = 250;
  const frameWidth = panelWidth * 4;
  const frameHeight = panelHeight;
  const lockX = lockPosition === "left" ? frameX + 10 : frameX + frameWidth - 10;
  const lockY = frameY + frameHeight * 0.6;

  return (
    <svg
      viewBox="0 0 760 670"
      role="img"
      aria-label="Four-panel sliding door technical drawing"
      className={cn("w-full rounded-xl border border-slate-200 bg-white", className)}
    >
      <rect width="760" height="670" fill="#fff" />

      <text x="38" y="40" fontSize="18" fontWeight="700" fill="#111827">
        {itemCode ?? "D6.2"}
      </text>
      <text x="96" y="40" fontSize="15" fill="#374151">
        {productName ?? "4-panel sliding glass door"}
      </text>
      <text x="38" y="64" fontSize="13" fill="#4b5563">
        Qty: {quantity} set{quantity > 1 ? "s" : ""}
      </text>

      <TopView x={frameX} y={90} width={frameWidth} />

      <DimensionLine
        x1={frameX}
        y1={frameY - 84}
        x2={frameX + frameWidth}
        y2={frameY - 84}
        label={`${widthLabel}`}
        labelX={frameX + frameWidth / 2}
        labelY={frameY - 72}
      />
      <line x1={frameX} y1={frameY - 95} x2={frameX} y2={frameY - 10} stroke="#111827" />
      <line
        x1={frameX + frameWidth}
        y1={frameY - 95}
        x2={frameX + frameWidth}
        y2={frameY - 10}
        stroke="#111827"
      />

      <g>
        <rect
          x={frameX}
          y={frameY}
          width={frameWidth}
          height={frameHeight}
          fill="#fff"
          stroke="#111827"
          strokeWidth="2"
        />
        <rect
          x={frameX + 7}
          y={frameY + 7}
          width={frameWidth - 14}
          height={frameHeight - 14}
          fill="none"
          stroke="#111827"
          strokeWidth="1.5"
        />
        {Array.from({ length: 4 }).map((_, index) => {
          const panelX = frameX + panelWidth * index;

          return (
            <g key={index}>
              {index > 0 && (
                <line
                  x1={panelX}
                  y1={frameY}
                  x2={panelX}
                  y2={frameY + frameHeight}
                  stroke="#111827"
                  strokeWidth="2"
                />
              )}
              <rect
                x={panelX + 11}
                y={frameY + 14}
                width={panelWidth - 22}
                height={frameHeight - 28}
                fill="none"
                stroke="#111827"
                strokeWidth="1.5"
              />
              <GlassMarks x={panelX + panelWidth / 2 - 10} y={frameY + 165} />
              <SlideArrow x={panelX + panelWidth / 2 - 30} y={frameY + 215} />
            </g>
          );
        })}

        {showLock && (
          <g>
            <circle cx={lockX} cy={lockY} r="8" fill="#fff" stroke="#111827" strokeWidth="1.5" />
            <text
              x={lockPosition === "left" ? lockX + 16 : lockX - 46}
              y={lockY + 5}
              fontSize="14"
              fill="#111827"
            >
              key
            </text>
          </g>
        )}
      </g>

      <line
        x1={frameX - 70}
        y1={frameY + frameHeight}
        x2={frameX + frameWidth + 72}
        y2={frameY + frameHeight}
        stroke="#111827"
        strokeWidth="3"
      />

      <DimensionLine
        x1={frameX + frameWidth + 124}
        y1={frameY}
        x2={frameX + frameWidth + 124}
        y2={frameY + frameHeight}
        label={`${heightLabel}`}
        labelX={frameX + frameWidth + 124}
        labelY={frameY + frameHeight / 2 + 8}
        vertical
      />
      <line
        x1={frameX + frameWidth + 6}
        y1={frameY}
        x2={frameX + frameWidth + 136}
        y2={frameY}
        stroke="#111827"
      />
      <line
        x1={frameX + frameWidth + 6}
        y1={frameY + frameHeight}
        x2={frameX + frameWidth + 136}
        y2={frameY + frameHeight}
        stroke="#111827"
      />
    </svg>
  );
}

function TopView({ x, y, width }: { x: number; y: number; width: number }) {
  const segment = width / 4;

  return (
    <g>
      {Array.from({ length: 4 }).map((_, index) => (
        <SlideArrow key={index} x={x + segment * index + segment / 2 - 30} y={y - 28} small />
      ))}
      <rect x={x} y={y} width={width} height="26" fill="none" stroke="#111827" />
      <rect x={x + 7} y={y + 5} width={width - 14} height="16" fill="none" stroke="#111827" />
      <polyline
        points={`${x + 8},${y + 22} ${x + segment - 8},${y + 22} ${x + segment - 8},${y + 13} ${
          x + segment * 2 - 8
        },${y + 13} ${x + segment * 2 - 8},${y + 6} ${x + segment * 3 - 8},${y + 6} ${
          x + segment * 3 - 8
        },${y + 1} ${x + width - 8},${y + 1}`}
        fill="none"
        stroke="#111827"
      />
    </g>
  );
}

function SlideArrow({ x, y, small = false }: { x: number; y: number; small?: boolean }) {
  const textY = y + (small ? 14 : 18);

  return (
    <g>
      <path d={`M ${x} ${y} h 56 l -5 5`} fill="none" stroke="#111827" strokeWidth="1.5" />
      <path d={`M ${x + 4} ${y - 4} l -5 4 l 5 4`} fill="none" stroke="#111827" strokeWidth="1.5" />
      <text x={x + 28} y={textY} textAnchor="middle" fontSize={small ? 8 : 10} fill="#111827">
        SLIDE
      </text>
    </g>
  );
}

function GlassMarks({ x, y }: { x: number; y: number }) {
  return (
    <g stroke="#111827" strokeWidth="1.2">
      <line x1={x} y1={y + 18} x2={x + 18} y2={y - 10} />
      <line x1={x + 7} y1={y + 20} x2={x + 25} y2={y - 8} />
      <line x1={x + 2} y1={y + 30} x2={x + 14} y2={y + 10} />
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
  return (
    <g>
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#111827" />
      {vertical ? (
        <>
          <path d={`M ${x1 - 8} ${y1 - 8} L ${x1} ${y1} L ${x1 + 8} ${y1 - 8}`} fill="none" stroke="#111827" />
          <path d={`M ${x2 - 8} ${y2 + 8} L ${x2} ${y2} L ${x2 + 8} ${y2 + 8}`} fill="none" stroke="#111827" />
        </>
      ) : (
        <>
          <path d={`M ${x1 + 8} ${y1 - 8} L ${x1} ${y1} L ${x1 + 8} ${y1 + 8}`} fill="none" stroke="#111827" />
          <path d={`M ${x2 - 8} ${y2 - 8} L ${x2} ${y2} L ${x2 - 8} ${y2 + 8}`} fill="none" stroke="#111827" />
        </>
      )}
      <rect
        x={labelX - 38}
        y={labelY - 20}
        width="76"
        height="28"
        fill="#fff"
      />
      <text x={labelX} y={labelY} textAnchor="middle" fontSize="28" fill="#000">
        {label}
      </text>
    </g>
  );
}
