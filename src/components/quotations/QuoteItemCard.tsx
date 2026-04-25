import { SlidingDoorDrawing } from "@/components/drawings/SlidingDoorDrawing";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { QuoteItem } from "./types";

type QuoteItemCardProps = {
  item: QuoteItem;
};

export function QuoteItemCard({ item }: QuoteItemCardProps) {
  return (
    <Card className="border-slate-200">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle className="text-lg">
            {item.itemCode} · {item.productName}
          </CardTitle>
          <Badge variant="secondary">Qty {item.quantity}</Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <SlidingDoorDrawing
          widthMm={item.widthMm}
          heightMm={item.heightMm}
          floorLevelMm={item.floorLevelMm}
          panelCount={item.panelCount}
          quantity={item.quantity}
          showTopView
          showLock={item.showLock}
          lockPosition={item.lockPosition}
          viewDirection={item.viewDirection}
          itemCode={item.itemCode}
          productName={item.productName}
        />

        <div className="overflow-hidden rounded-lg border border-slate-200">
          <table className="w-full border-collapse text-sm">
            <tbody>
              <SpecRow label="Width" value={`${item.widthMm} mm`} />
              <SpecRow label="Height" value={`${item.heightMm} mm`} />
              <SpecRow
                label="Floor level"
                value={
                  typeof item.floorLevelMm === "number"
                    ? `${item.floorLevelMm} mm`
                    : "-"
                }
              />
              <SpecRow label="Panels" value={`${item.panelCount}`} />
              <SpecRow label="Aluminum color" value={item.aluminumColor} />
              <SpecRow label="Glass" value={item.glassType} />
              <SpecRow label="Hardware" value={item.hardware} />
              <SpecRow label="View" value={item.viewDirection} />
              <SpecRow label="Lock" value={item.showLock ? "Enabled" : "No lock"} />
              {item.location && <SpecRow label="Install location" value={item.location} />}
              {item.notes && <SpecRow label="Notes" value={item.notes} />}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

function SpecRow({ label, value }: { label: string; value: string }) {
  return (
    <tr className="border-b border-slate-200 last:border-b-0">
      <th className="w-44 bg-slate-50 px-3 py-2 text-left font-semibold text-slate-700">
        {label}
      </th>
      <td className="px-3 py-2 text-slate-800">{value}</td>
    </tr>
  );
}
