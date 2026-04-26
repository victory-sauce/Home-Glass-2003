import type { CutPlanSource } from "@/lib/cutPlanner";

interface Props {
  source: CutPlanSource;
}

const COLORS = [
  "bg-blue-200 border-blue-400",
  "bg-cyan-200 border-cyan-400",
  "bg-indigo-200 border-indigo-400",
  "bg-teal-200 border-teal-400",
  "bg-sky-200 border-sky-400",
  "bg-violet-200 border-violet-400",
];

function strategyLabel(value: CutPlanSource["layoutStrategy"]) {
  return value === "horizontal_shelf" ? "Horizontal shelf / rows" : "Vertical strip";
}

export function CutLayoutPreview({ source }: Props) {
  const scale = Math.min(1, 420 / source.layoutWidth, 260 / source.layoutHeight);
  const frameWidth = Math.max(220, source.layoutWidth * scale);
  const frameHeight = Math.max(150, source.layoutHeight * scale);

  const usefulLeftoverArea = source.leftoverRegions
    .filter((region) => region.kind === "leftover")
    .reduce((sum, region) => sum + region.width * region.height, 0);

  return (
    <div className="space-y-3 rounded-2xl border border-border bg-white p-4">
      <div>
        <h4 className="text-sm font-semibold text-slate-900">Recommended cut plan</h4>
        <p className="text-xs text-muted-foreground">Guillotine-feasible layout</p>
      </div>

      <div className="grid gap-2 text-xs text-slate-700 sm:grid-cols-2 lg:grid-cols-3">
        <div>
          <span className="font-medium text-slate-900">Source:</span> {source.sourcePiece.code}
        </div>
        <div>
          <span className="font-medium text-slate-900">Size:</span> {source.layoutWidth}×{source.layoutHeight} mm
        </div>
        <div>
          <span className="font-medium text-slate-900">Rack:</span> {source.sourcePiece.rack}
        </div>
        <div>
          <span className="font-medium text-slate-900">Glass:</span> {source.sourcePiece.glass_type}
        </div>
        <div>
          <span className="font-medium text-slate-900">Thickness:</span> {source.sourcePiece.thickness} mm
        </div>
        <div>
          <span className="font-medium text-slate-900">Used/Waste:</span> {Math.round(source.usedArea).toLocaleString()} /{" "}
          {Math.round(source.wasteArea).toLocaleString()} mm²
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className="flex items-start gap-2">
          <div className="pt-1 text-[10px] font-medium text-muted-foreground">{source.layoutHeight}mm</div>
          <div
            className="relative rounded-xl border-2 border-slate-400 bg-slate-100"
            style={{ width: frameWidth, height: frameHeight }}
          >
            {source.leftoverRegions.map((region, index) => (
              <div
                key={`region-${index}`}
                className={`absolute overflow-hidden rounded border border-dashed p-1 text-[10px] leading-tight text-slate-600 ${
                  region.kind === "leftover" ? "border-slate-400 bg-slate-200/70" : "border-slate-300 bg-slate-200/35"
                }`}
                style={{
                  left: region.x * scale,
                  top: region.y * scale,
                  width: Math.max(20, region.width * scale),
                  height: Math.max(16, region.height * scale),
                }}
                title={region.label}
              >
                {region.label}
              </div>
            ))}

            {source.placedCuts.map((cut, index) => {
              const color = COLORS[index % COLORS.length];
              return (
                <div
                  key={`${cut.orderItemId}-${index}`}
                  className={`absolute overflow-hidden rounded border p-1 text-[10px] font-semibold leading-tight text-slate-800 ${color}`}
                  style={{
                    left: cut.x * scale,
                    top: cut.y * scale,
                    width: Math.max(26, cut.width * scale),
                    height: Math.max(20, cut.height * scale),
                  }}
                  title={`${cut.width}x${cut.height}${cut.rotated ? " (rotated)" : ""}`}
                >
                  <div>{cut.width}×{cut.height}</div>
                  {cut.rotated && <div className="text-[9px] text-slate-600">rotated</div>}
                </div>
              );
            })}

            {source.cutSteps.map((step) => (
              <div key={step.id}>
                <div
                  className="absolute bg-blue-700/80"
                  style={
                    step.orientation === "vertical"
                      ? {
                          left: step.x * scale,
                          top: step.y * scale,
                          width: 2,
                          height: Math.max(6, step.length * scale),
                        }
                      : {
                          left: step.x * scale,
                          top: step.y * scale,
                          width: Math.max(6, step.length * scale),
                          height: 2,
                        }
                  }
                />
                <div
                  className="absolute flex h-5 w-5 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-blue-800 bg-blue-600 text-[10px] font-bold text-white"
                  style={{
                    left: (step.orientation === "vertical" ? step.x : step.x + step.length / 2) * scale,
                    top: (step.orientation === "vertical" ? step.y + step.length / 2 : step.y) * scale,
                  }}
                  title={step.description}
                >
                  {step.sequence}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="pl-8 text-[10px] font-medium text-muted-foreground">{source.layoutWidth}mm</div>

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
        Source rack: {source.sourcePiece.rack} · Estimated useful leftover: {Math.round(usefulLeftoverArea).toLocaleString()} mm² · Strategy: {strategyLabel(source.layoutStrategy)}
      </div>
    </div>
  );
}
