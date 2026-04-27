import type { CutPlanSource } from "@/lib/cutPlanner";

interface Props {
  source: CutPlanSource;
  variant?: "compact" | "large";
  maxHeight?: number;
  showHeader?: boolean;
  showCutSequence?: boolean;
  layoutNumber?: number;
}

function strategyLabel(value: CutPlanSource["layoutStrategy"]) {
  return value === "horizontal_shelf" ? "Horizontal shelf / rows" : "Vertical strip";
}

export function CutLayoutPreview({
  source,
  variant = "large",
  maxHeight,
  showHeader = true,
  showCutSequence = true,
  layoutNumber,
}: Props) {
  const sheetWidth = source.layoutWidth;
  const sheetHeight = source.layoutHeight;
  const targetMaxWidth = variant === "compact" ? 360 : 430;
  const fallbackMaxHeight = variant === "compact" ? 300 : 340;
  const targetMaxHeight = Math.max(220, maxHeight ?? fallbackMaxHeight);
  const sheetScale = Math.min(1, targetMaxWidth / sheetWidth, targetMaxHeight / sheetHeight);
  const frameWidth = Math.max(180, sheetWidth * sheetScale);
  const frameHeight = Math.max(130, sheetHeight * sheetScale);
  const drawingPadding = {
    top: 30,
    right: 16,
    bottom: 44,
    left: 54,
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
  const rotatedCuts = source.placedCuts.filter((cut) => cut.rotated).length;

  const shownCutSteps = variant === "compact" ? source.cutSteps.slice(0, 6) : source.cutSteps;
  const remainingSteps = Math.max(0, source.cutSteps.length - shownCutSteps.length);
  const markerPrefix = source.sourcePiece.id.slice(0, 8);

  return (
    <div className="space-y-3 rounded-2xl border border-border bg-white p-4 shadow-sm">
      {showHeader && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h4 className="text-sm font-semibold text-slate-900">
              Layout {layoutNumber ? `#${layoutNumber}` : "preview"} · {source.sourcePiece.code || "—"}
            </h4>
            <p className="text-xs text-muted-foreground">Rack {source.sourcePiece.rack} · Guillotine-feasible layout</p>
          </div>
          <div className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-700">{strategyLabel(source.layoutStrategy)}</div>
        </div>
      )}

      <div className="grid gap-2 rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-[11px] text-slate-700 sm:grid-cols-2">
        <div className="rounded-md bg-white px-2 py-1 shadow-sm">
          <span className="font-semibold text-slate-900">Sheet:</span> {sheetWidth} W × {sheetHeight} H mm
        </div>
        <div className="rounded-md bg-white px-2 py-1 shadow-sm">
          <span className="font-semibold text-slate-900">Glass:</span> {source.sourcePiece.glass_type}
        </div>
        <div className="rounded-md bg-white px-2 py-1 shadow-sm">
          <span className="font-semibold text-slate-900">Thickness:</span> {source.sourcePiece.thickness} mm
        </div>
        <div className="rounded-md bg-white px-2 py-1 shadow-sm">
          <span className="font-semibold text-slate-900">Used area:</span> {Math.round(source.usedArea).toLocaleString()} mm²
        </div>
        <div className="rounded-md bg-white px-2 py-1 shadow-sm">
          <span className="font-semibold text-slate-900">Leftover area:</span> {Math.round(usefulLeftoverArea).toLocaleString()} mm²
        </div>
        <div className="rounded-md bg-white px-2 py-1 shadow-sm">
          <span className="font-semibold text-slate-900">Waste area:</span> {Math.round(wasteArea).toLocaleString()} mm²
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-2 sm:p-3">
        <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="h-auto w-full">
          <defs>
            <marker id={`${markerPrefix}-dim-arrow`} viewBox="0 0 10 10" refX="5" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#0f172a" />
            </marker>
            <marker id={`${markerPrefix}-axis-arrow`} viewBox="0 0 10 10" refX="6" refY="5" markerWidth="5" markerHeight="5" orient="auto">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#1d4ed8" />
            </marker>
          </defs>

          <rect x={sheetX} y={sheetY} width={frameWidth} height={frameHeight} rx={10} fill="#f1f5f9" stroke="#475569" strokeWidth="1.6" />

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
                className="fill-slate-700 text-[8px] font-medium"
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
                className="fill-slate-800 text-[9px] font-semibold"
              >
                {cut.label}
                {cut.rotated ? " rotated" : ""}
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
                  strokeWidth="1.8"
                />
                <circle cx={markerX} cy={markerY} r="8" fill="#2563eb" stroke="#1e3a8a" strokeWidth="1" />
                <text x={markerX} y={markerY} textAnchor="middle" dominantBaseline="middle" className="fill-white text-[8px] font-bold">
                  {step.sequence}
                </text>
              </g>
            );
          })}

          <line x1={sheetX} y1={sheetY + frameHeight} x2={sheetX} y2={svgHeight - 20} stroke="#64748b" strokeDasharray="4 4" />
          <line x1={sheetX + frameWidth} y1={sheetY + frameHeight} x2={sheetX + frameWidth} y2={svgHeight - 20} stroke="#64748b" strokeDasharray="4 4" />
          <line
            x1={sheetX}
            y1={svgHeight - 20}
            x2={sheetX + frameWidth}
            y2={svgHeight - 20}
            stroke="#0f172a"
            strokeWidth="1.2"
            markerStart={`url(#${markerPrefix}-dim-arrow)`}
            markerEnd={`url(#${markerPrefix}-dim-arrow)`}
          />
          <text x={sheetX + frameWidth / 2} y={svgHeight - 25} textAnchor="middle" className="fill-slate-900 text-[9px] font-semibold">
            W: {sheetWidth} mm
          </text>

          <line x1={20} y1={sheetY} x2={sheetX} y2={sheetY} stroke="#64748b" strokeDasharray="4 4" />
          <line x1={20} y1={sheetY + frameHeight} x2={sheetX} y2={sheetY + frameHeight} stroke="#64748b" strokeDasharray="4 4" />
          <line
            x1={20}
            y1={sheetY}
            x2={20}
            y2={sheetY + frameHeight}
            stroke="#0f172a"
            strokeWidth="1.2"
            markerStart={`url(#${markerPrefix}-dim-arrow)`}
            markerEnd={`url(#${markerPrefix}-dim-arrow)`}
          />
          <text
            x={15}
            y={sheetY + frameHeight / 2}
            textAnchor="middle"
            transform={`rotate(-90 15 ${sheetY + frameHeight / 2})`}
            className="fill-slate-900 text-[9px] font-semibold"
          >
            H: {sheetHeight} mm
          </text>

          <circle cx={sheetX - 7} cy={sheetY - 7} r="3" fill="#1d4ed8" />
          <line x1={sheetX - 7} y1={sheetY - 7} x2={sheetX + 16} y2={sheetY - 7} stroke="#1d4ed8" strokeWidth="1.3" markerEnd={`url(#${markerPrefix}-axis-arrow)`} />
          <line x1={sheetX - 7} y1={sheetY - 7} x2={sheetX - 7} y2={sheetY + 16} stroke="#1d4ed8" strokeWidth="1.3" markerEnd={`url(#${markerPrefix}-axis-arrow)`} />
          <text x={sheetX + 18} y={sheetY - 9} className="fill-blue-700 text-[8px] font-semibold">
            x
          </text>
          <text x={sheetX - 14} y={sheetY + 18} className="fill-blue-700 text-[8px] font-semibold">
            y
          </text>
        </svg>
      </div>

      {showCutSequence && (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-2.5">
          <div className="mb-1.5 text-xs font-semibold text-slate-800">Cut sequence</div>
          {shownCutSteps.length === 0 ? (
            <div className="text-xs text-muted-foreground">No cuts required (single piece match).</div>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {shownCutSteps.map((step) => (
                <div key={`step-${step.id}`} className="rounded-full border border-slate-200 bg-white px-2 py-1 text-[11px] text-slate-700">
                  #{step.sequence} · {step.orientation} @ {Math.round(step.position)}mm
                </div>
              ))}
              {remainingSteps > 0 && (
                <div className="rounded-full border border-blue-200 bg-blue-50 px-2 py-1 text-[11px] font-medium text-blue-700">+{remainingSteps} more</div>
              )}
            </div>
          )}
        </div>
      )}

      <div className="text-xs text-muted-foreground">
        Source rack: {source.sourcePiece.rack} · Estimated useful leftover: {Math.round(usefulLeftoverArea).toLocaleString()} mm²
        {largestLeftover ? ` · Estimated leftover: ${Math.round(largestLeftover.width)} × ${Math.round(largestLeftover.height)} mm` : ""}
        {" · "}Strategy: {strategyLabel(source.layoutStrategy)}
        {rotatedCuts > 0 ? ` · Rotated fit: ${rotatedCuts} cut${rotatedCuts > 1 ? "s" : ""}` : ""}
      </div>
    </div>
  );
}
