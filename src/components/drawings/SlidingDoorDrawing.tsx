import { cn } from "@/lib/utils";

type SlidingDoorDrawingProps = {
  widthMm: number;
  heightMm: number;
  floorLevelMm?: number;
  panelCount?: number;
  quantity?: number;
  showTopView?: boolean;
  showLock?: boolean;
  lockPosition?: "left" | "right";
  viewDirection?: "inside" | "outside";
  itemCode?: string;
  productName?: string;
  className?: string;
};

export function SlidingDoorDrawing({
  widthMm,
  heightMm,
  floorLevelMm,
  panelCount = 3,
  quantity = 1,
  showTopView = true,
  showLock = true,
  lockPosition = "right",
  viewDirection = "inside",
  itemCode,
  productName,
  className,
}: SlidingDoorDrawingProps) {
  const safeWidthMm = Math.max(widthMm, 1);
  const safeHeightMm = Math.max(heightMm, 1);
  const safePanelCount = Math.max(panelCount, 1);

  const viewBoxWidth = 920;
  const viewBoxHeight = 500;

  const maxDrawingWidthPx = 610;
  const maxDrawingHeightPx = 250;
  const scale = Math.min(
    maxDrawingWidthPx / safeWidthMm,
    maxDrawingHeightPx / safeHeightMm
  );

  const drawingWidthPx = safeWidthMm * scale;
  const drawingHeightPx = safeHeightMm * scale;

  const originX = 150;
  const originY = 150;

  const frameStroke = 6;
  const panelWidthPx = drawingWidthPx / safePanelCount;

  const widthLineY = originY - 28;
  const floorLineY = originY + drawingHeightPx + 36;

  const lockX =
    lockPosition === "left"
      ? originX + panelWidthPx * 0.25
      : originX + drawingWidthPx - panelWidthPx * 0.25;
  const lockY = originY + drawingHeightPx * 0.45;

  return (
    <svg
      viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`}
      role="img"
      aria-label="Sliding door technical drawing"
      className={cn("w-full rounded-xl border border-slate-200 bg-white", className)}
    >
      <defs>
        <marker
          id="dimension-arrow"
          markerWidth="8"
          markerHeight="8"
          refX="4"
          refY="4"
          orient="auto"
        >
          <path d="M0,0 L8,4 L0,8 z" fill="#334155" />
        </marker>
        <marker
          id="slide-arrow"
          markerWidth="10"
          markerHeight="10"
          refX="5"
          refY="5"
          orient="auto"
        >
          <path d="M0,0 L10,5 L0,10 z" fill="#2563eb" />
        </marker>
      </defs>

      <rect x="0" y="0" width={viewBoxWidth} height={viewBoxHeight} fill="#f8fafc" />

      <text x={40} y={36} fontSize={16} fontWeight={700} fill="#0f172a">
        {itemCode ?? "D6.1"}
      </text>
      <text x={100} y={36} fontSize={14} fill="#334155">
        {productName ?? "3-panel sliding glass door"}
      </text>
      <text x={40} y={62} fontSize={13} fill="#475569">
        Qty: {quantity} set{quantity > 1 ? "s" : ""}
      </text>

      {showTopView && (
        <g>
          <text x={originX} y={86} fontSize={12} fill="#64748b">
            Top view track
          </text>
          <rect
            x={originX}
            y={96}
            width={drawingWidthPx}
            height={16}
            rx={3}
            fill="#e2e8f0"
            stroke="#94a3b8"
          />
          <line
            x1={originX + drawingWidthPx / 3}
            y1={96}
            x2={originX + drawingWidthPx / 3}
            y2={112}
            stroke="#94a3b8"
          />
          <line
            x1={originX + (drawingWidthPx * 2) / 3}
            y1={96}
            x2={originX + (drawingWidthPx * 2) / 3}
            y2={112}
            stroke="#94a3b8"
          />
        </g>
      )}

      <g>
        <rect
          x={originX}
          y={originY}
          width={drawingWidthPx}
          height={drawingHeightPx}
          fill="#e2e8f0"
          stroke="#0f172a"
          strokeWidth={frameStroke}
          rx={4}
        />

        {Array.from({ length: safePanelCount }).map((_, index) => {
          const panelX = originX + panelWidthPx * index;
          const slideDirection = index % 2 === 0 ? 1 : -1;

          return (
            <g key={`panel-${index}`}>
              <rect
                x={panelX + 4}
                y={originY + 4}
                width={Math.max(panelWidthPx - 8, 5)}
                height={Math.max(drawingHeightPx - 8, 5)}
                fill="#f8fafc"
                stroke="#475569"
                strokeWidth={2}
              />

              <line
                x1={panelX + panelWidthPx * 0.25}
                y1={originY + drawingHeightPx * 0.25}
                x2={panelX + panelWidthPx * 0.75}
                y2={originY + drawingHeightPx * 0.75}
                stroke="#93c5fd"
                strokeWidth={2}
                opacity={0.9}
              />

              <line
                x1={panelX + panelWidthPx * 0.5}
                y1={originY + drawingHeightPx + 18}
                x2={panelX + panelWidthPx * (0.5 + 0.18 * slideDirection)}
                y2={originY + drawingHeightPx + 18}
                stroke="#2563eb"
                strokeWidth={2.5}
                markerEnd="url(#slide-arrow)"
              />

              <text
                x={panelX + panelWidthPx * 0.5}
                y={originY + drawingHeightPx + 38}
                fontSize={11}
                textAnchor="middle"
                fill="#2563eb"
              >
                SLIDE
              </text>
            </g>
          );
        })}
      </g>

      <g>
        <line
          x1={originX}
          y1={widthLineY}
          x2={originX + drawingWidthPx}
          y2={widthLineY}
          stroke="#334155"
          strokeWidth={1.8}
          markerStart="url(#dimension-arrow)"
          markerEnd="url(#dimension-arrow)"
        />
        <line
          x1={originX}
          y1={originY - 12}
          x2={originX}
          y2={originY + 2}
          stroke="#334155"
          strokeWidth={1.5}
        />
        <line
          x1={originX + drawingWidthPx}
          y1={originY - 12}
          x2={originX + drawingWidthPx}
          y2={originY + 2}
          stroke="#334155"
          strokeWidth={1.5}
        />
        <text
          x={originX + drawingWidthPx / 2}
          y={widthLineY - 10}
          fontSize={14}
          fontWeight={600}
          textAnchor="middle"
          fill="#0f172a"
        >
          WIDTH {Math.round(safeWidthMm)} mm
        </text>
      </g>

      <g>
        <line
          x1={originX - 34}
          y1={originY}
          x2={originX - 34}
          y2={originY + drawingHeightPx}
          stroke="#334155"
          strokeWidth={1.8}
          markerStart="url(#dimension-arrow)"
          markerEnd="url(#dimension-arrow)"
        />
        <line
          x1={originX - 14}
          y1={originY}
          x2={originX + 2}
          y2={originY}
          stroke="#334155"
          strokeWidth={1.5}
        />
        <line
          x1={originX - 14}
          y1={originY + drawingHeightPx}
          x2={originX + 2}
          y2={originY + drawingHeightPx}
          stroke="#334155"
          strokeWidth={1.5}
        />
        <text
          x={originX - 58}
          y={originY + drawingHeightPx / 2}
          fontSize={14}
          fontWeight={600}
          textAnchor="middle"
          fill="#0f172a"
          transform={`rotate(-90 ${originX - 58} ${originY + drawingHeightPx / 2})`}
        >
          HEIGHT {Math.round(safeHeightMm)} mm
        </text>
      </g>

      {typeof floorLevelMm === "number" && (
        <g>
          <line
            x1={originX}
            y1={floorLineY}
            x2={originX + drawingWidthPx}
            y2={floorLineY}
            stroke="#16a34a"
            strokeWidth={2}
            strokeDasharray="6 4"
          />
          <text
            x={originX + drawingWidthPx / 2}
            y={floorLineY + 22}
            fontSize={13}
            textAnchor="middle"
            fill="#166534"
            fontWeight={600}
          >
            FLOOR LEVEL {Math.round(floorLevelMm)} mm
          </text>
        </g>
      )}

      {showLock && (
        <g>
          <circle cx={lockX} cy={lockY} r={9} fill="#f8fafc" stroke="#0f172a" strokeWidth={2} />
          <path
            d={`M ${lockX - 4} ${lockY + 1} L ${lockX + 4} ${lockY + 1} M ${lockX - 1} ${
              lockY + 1
            } L ${lockX - 1} ${lockY + 6}`}
            stroke="#0f172a"
            strokeWidth={1.5}
          />
          <text x={lockX + 16} y={lockY + 5} fontSize={12} fill="#334155">
            LOCK/KEY
          </text>
        </g>
      )}

      <g>
        <rect x={710} y={140} width={150} height={82} rx={8} fill="#e2e8f0" stroke="#94a3b8" />
        <text x={785} y={164} textAnchor="middle" fontSize={13} fontWeight={700} fill="#0f172a">
          VIEW
        </text>
        <text
          x={785}
          y={188}
          textAnchor="middle"
          fontSize={13}
          fill={viewDirection === "outside" ? "#2563eb" : "#64748b"}
          fontWeight={viewDirection === "outside" ? 700 : 500}
        >
          OUT
        </text>
        <text
          x={785}
          y={210}
          textAnchor="middle"
          fontSize={13}
          fill={viewDirection === "inside" ? "#2563eb" : "#64748b"}
          fontWeight={viewDirection === "inside" ? 700 : 500}
        >
          IN
        </text>
      </g>
    </svg>
  );
}
