import type { CutPlanSource } from "@/lib/cutPlanner";

interface Props {
  source: CutPlanSource;
}

function strategyLabel(value: CutPlanSource["layoutStrategy"]) {
  return value === "horizontal_shelf" ? "Horizontal shelf / rows" : "Vertical strip";
}

export function CutLayoutPreview({ source }: Props) {
  const sheetWidth = source.layoutWidth;
  const sheetHeight = source.layoutHeight;
  const targetMaxWidth = 430;
  const targetMaxHeight = 260;
  const sheetScale = Math.min(1, targetMaxWidth / sheetWidth, targetMaxHeight / sheetHeight);
  const frameWidth = Math.max(220, sheetWidth * sheetScale);
  const frameHeight = Math.max(140, sheetHeight * sheetScale);
  const drawingPadding = {
    top: 34,
    right: 18,
    bottom: 50,
    left: 62,
  };
  const svgWidth = frameWidth + drawingPadding.left + drawingPadding.right;
  const svgHeight = frameHeight + drawingPadding.top + drawingPadding.bottom;
  const sheetX = drawingPadding.left;
  const sheetY = drawingPadding.top;

  const toX = (value: number) => sheetX + value * sheetScale;
  const toY = (value: number) => sheetY + value * sheetScale;
  const scaledW = (value: number) => Math.max(2, value * sheetScale);
  const scaledH = (value: number) => Math.max(2, value * sheetScale);
  const pastelPalette = ["#dbeafe", "#cffafe", "#e0e7ff", "#ccfbf1", "#f5d0fe", "#c7d2fe"];

  const usefulLeftoverArea = source.leftoverRegions
    .filter((region) => region.kind === "leftover")
    .reduce((sum, region) => sum + region.width * region.height, 0);
  const wasteArea = source.leftoverRegions
    .filter((region) => region.kind === "waste")
    .reduce((sum, region) => sum + region.width * region.height, 0);
  const largestLeftover = source.leftoverRegions
    .filter((region) => region.kind === "leftover")
    .sort((a, b) => b.width * b.height - a.width * a.height)[0];

  return (
    <div className="space-y-3 rounded-2xl border border-border bg-white p-4">
      <div>
        <h4 className="text-sm font-semibold text-slate-900">Recommended cut plan</h4>
        <p className="text-xs text-muted-foreground">Guillotine-feasible layout</p>
      </div>

      <div className="grid gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-md bg-white px-2 py-1 shadow-sm">
          <span className="font-medium text-slate-900">Source:</span> {source.sourcePiece.code || "—"}
        </div>
        <div className="rounded-md bg-white px-2 py-1 shadow-sm">
          <span className="font-medium text-slate-900">Sheet:</span> {sheetWidth} W × {sheetHeight} H mm
        </div>
        <div className="rounded-md bg-white px-2 py-1 shadow-sm">
          <span className="font-medium text-slate-900">Rack:</span> {source.sourcePiece.rack}
        </div>
        <div className="rounded-md bg-white px-2 py-1 shadow-sm">
          <span className="font-medium text-slate-900">Glass:</span> {source.sourcePiece.glass_type}
        </div>
        <div className="rounded-md bg-white px-2 py-1 shadow-sm">
          <span className="font-medium text-slate-900">Thickness:</span> {source.sourcePiece.thickness} mm
        </div>
        <div className="rounded-md bg-white px-2 py-1 shadow-sm">
          <span className="font-medium text-slate-900">Used area:</span> {Math.round(source.usedArea).toLocaleString()} mm²
        </div>
        <div className="rounded-md bg-white px-2 py-1 shadow-sm">
          <span className="font-medium text-slate-900">Leftover area:</span> {Math.round(usefulLeftoverArea).toLocaleString()} mm²
        </div>
        <div className="rounded-md bg-white px-2 py-1 shadow-sm">
          <span className="font-medium text-slate-900">Waste area:</span> {Math.round(wasteArea).toLocaleString()} mm²
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-2 sm:p-3">
        <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="h-auto w-full">
          <defs>
            <marker id="dim-arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#0f172a" />
            </marker>
            <marker id="axis-arrow" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="5" markerHeight="5" orient="auto">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#1d4ed8" />
            </marker>
          </defs>

          <rect x={sheetX} y={sheetY} width={frameWidth} height={frameHeight} rx={10} fill="#f1f5f9" stroke="#475569" strokeWidth="1.7" />

          {source.leftoverRegions.map((region, index) => (
            <g key={`region-${index}`}>
              <rect
                x={toX(region.x)}
                y={toY(region.y)}
                width={scaledW(region.width)}
                height={scaledH(region.height)}
                rx={4}
                fill={region.kind === "leftover" ? "#ccfbf1" : "#d1d5db"}
                stroke={region.kind === "leftover" ? "#0f766e" : "#6b7280"}
                strokeWidth="1"
                strokeDasharray={region.kind === "leftover" ? "6 4" : "3 3"}
              />
              <text
                x={toX(region.x) + Math.max(6, scaledW(region.width) / 2)}
                y={toY(region.y) + Math.max(12, scaledH(region.height) / 2)}
                textAnchor={scaledW(region.width) > 70 ? "middle" : "start"}
                className="fill-slate-700 text-[9px] font-medium"
              >
                {region.label}
              </text>
            </g>
          ))}

          {source.placedCuts.map((cut, index) => (
            <g key={`${cut.orderItemId}-${index}`}>
              <rect
                x={toX(cut.x)}
                y={toY(cut.y)}
                width={scaledW(cut.width)}
                height={scaledH(cut.height)}
                rx={4}
                fill={pastelPalette[index % pastelPalette.length]}
                stroke="#334155"
                strokeWidth="1"
              />
              <text
                x={toX(cut.x) + scaledW(cut.width) / 2}
                y={toY(cut.y) + scaledH(cut.height) / 2}
                textAnchor="middle"
                dominantBaseline="middle"
                className="fill-slate-800 text-[10px] font-semibold"
              >
                {cut.width}×{cut.height}
              </text>
            </g>
          ))}

          {source.cutSteps.map((step) => {
            const cutX = toX(step.x);
            const cutY = toY(step.y);
            const length = step.length * sheetScale;
            const markerX = step.orientation === "vertical" ? cutX : cutX + length / 2;
            const markerY = step.orientation === "vertical" ? cutY + length / 2 : cutY;
            return (
              <g key={step.id}>
                <line
                  x1={cutX}
                  y1={cutY}
                  x2={step.orientation === "vertical" ? cutX : cutX + length}
                  y2={step.orientation === "vertical" ? cutY + length : cutY}
                  stroke="#1d4ed8"
                  strokeWidth="2"
                />
                <circle cx={markerX} cy={markerY} r="9" fill="#2563eb" stroke="#1e3a8a" strokeWidth="1" />
                <text x={markerX} y={markerY} textAnchor="middle" dominantBaseline="middle" className="fill-white text-[9px] font-bold">
                  {step.sequence}
                </text>
              </g>
            );
          })}

          <line x1={sheetX} y1={sheetY + frameHeight} x2={sheetX} y2={svgHeight - 24} stroke="#64748b" strokeDasharray="4 4" />
          <line
            x1={sheetX + frameWidth}
            y1={sheetY + frameHeight}
            x2={sheetX + frameWidth}
            y2={svgHeight - 24}
            stroke="#64748b"
            strokeDasharray="4 4"
          />
          <line
            x1={sheetX}
            y1={svgHeight - 24}
            x2={sheetX + frameWidth}
            y2={svgHeight - 24}
            stroke="#0f172a"
            strokeWidth="1.3"
            markerStart="url(#dim-arrow)"
            markerEnd="url(#dim-arrow)"
          />
          <text x={sheetX + frameWidth / 2} y={svgHeight - 30} textAnchor="middle" className="fill-slate-900 text-[10px] font-semibold">
            Width: {sheetWidth} mm
          </text>

          <line x1={24} y1={sheetY} x2={sheetX} y2={sheetY} stroke="#64748b" strokeDasharray="4 4" />
          <line x1={24} y1={sheetY + frameHeight} x2={sheetX} y2={sheetY + frameHeight} stroke="#64748b" strokeDasharray="4 4" />
          <line
            x1={24}
            y1={sheetY}
            x2={24}
            y2={sheetY + frameHeight}
            stroke="#0f172a"
            strokeWidth="1.3"
            markerStart="url(#dim-arrow)"
            markerEnd="url(#dim-arrow)"
          />
          <text
            x={19}
            y={sheetY + frameHeight / 2}
            textAnchor="middle"
            transform={`rotate(-90 19 ${sheetY + frameHeight / 2})`}
            className="fill-slate-900 text-[10px] font-semibold"
          >
            Height: {sheetHeight} mm
          </text>

          <circle cx={sheetX - 8} cy={sheetY - 8} r="3.5" fill="#1d4ed8" />
          <line x1={sheetX - 8} y1={sheetY - 8} x2={sheetX + 18} y2={sheetY - 8} stroke="#1d4ed8" strokeWidth="1.4" markerEnd="url(#axis-arrow)" />
          <line x1={sheetX - 8} y1={sheetY - 8} x2={sheetX - 8} y2={sheetY + 18} stroke="#1d4ed8" strokeWidth="1.4" markerEnd="url(#axis-arrow)" />
          <text x={sheetX + 22} y={sheetY - 10} className="fill-blue-700 text-[9px] font-semibold">
            x
          </text>
          <text x={sheetX - 16} y={sheetY + 22} className="fill-blue-700 text-[9px] font-semibold">
            y
          </text>
        </svg>
      </div>

      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
        <div className="mb-2 text-xs font-semibold text-slate-800">Cut sequence</div>
        {source.cutSteps.length === 0 ? (
          <div className="text-xs text-muted-foreground">No cuts required (single piece match).</div>
        ) : (
          <ul className="space-y-1 text-xs text-slate-700">
            {source.cutSteps.map((step) => (
              <li key={`step-${step.id}`} className="flex items-start justify-between gap-2 rounded bg-white px-2 py-1">
                <span className="font-medium">#{step.sequence}</span>
                <span className="capitalize">{step.orientation}</span>
                <span>{Math.round(step.position)}mm</span>
                <span className="flex-1 text-right text-muted-foreground">{step.description}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="text-xs text-muted-foreground">
        Source rack: {source.sourcePiece.rack} · Estimated useful leftover: {Math.round(usefulLeftoverArea).toLocaleString()} mm²
        {largestLeftover ? ` · Estimated leftover: ${Math.round(largestLeftover.width)} × ${Math.round(largestLeftover.height)} mm` : ""}
        {" · "}Strategy: {strategyLabel(source.layoutStrategy)}
      </div>
    </div>
  );
}
