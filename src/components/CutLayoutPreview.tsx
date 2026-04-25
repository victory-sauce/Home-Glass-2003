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

export function CutLayoutPreview({ source }: Props) {
  const scale = Math.min(1, 420 / source.layoutWidth, 260 / source.layoutHeight);
  const frameWidth = Math.max(220, source.layoutWidth * scale);
  const frameHeight = Math.max(150, source.layoutHeight * scale);

  return (
    <div className="space-y-3 rounded-2xl border border-border bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <div className="font-semibold text-slate-900">
          {source.sourcePiece.code} · {source.layoutWidth}×{source.layoutHeight} mm
        </div>
        <div className="text-muted-foreground">
          Used {Math.round(source.usedArea).toLocaleString()} · Waste {Math.round(source.wasteArea).toLocaleString()} mm²
        </div>
      </div>

      <div className="overflow-x-auto">
        <div
          className="relative rounded-xl border-2 border-slate-400 bg-slate-100"
          style={{ width: frameWidth, height: frameHeight }}
        >
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
        </div>
      </div>

      <div className="text-xs text-muted-foreground">
        Source rack: {source.sourcePiece.rack} · Glass {source.sourcePiece.glass_type} · Thickness {source.sourcePiece.thickness}mm
      </div>
    </div>
  );
}
