import { useEffect, useState } from "react";
import { DrawingRenderer } from "@/components/drawings/DrawingRenderer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2 } from "lucide-react";
import type { QuoteItem } from "./types";

type QuoteItemCardProps = {
  item: QuoteItem;
  onUpdateItem?: (itemId: string, patch: Partial<QuoteItem>) => void;
  onDeleteItem?: (itemId: string) => void;
};

export function QuoteItemCard({ item, onUpdateItem, onDeleteItem }: QuoteItemCardProps) {
  const [draftWidth, setDraftWidth] = useState(String(item.widthMm));
  const [draftHeight, setDraftHeight] = useState(String(item.heightMm));

  useEffect(() => {
    setDraftWidth(String(item.widthMm));
  }, [item.widthMm]);

  useEffect(() => {
    setDraftHeight(String(item.heightMm));
  }, [item.heightMm]);

  const updatePositiveNumber = (
    field: "widthMm" | "heightMm",
    value: string,
    setDraftValue: (value: string) => void
  ) => {
    setDraftValue(value);

    if (value.trim() === "") {
      return;
    }

    const parsedValue = Number(value);

    if (!Number.isFinite(parsedValue) || parsedValue <= 0) {
      return;
    }

    onUpdateItem?.(item.id, {
      [field]: parsedValue,
    });
  };

  return (
    <Card className="border-slate-200">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle className="text-lg">
            {item.itemCode} · {item.productName}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">Qty {item.quantity}</Badge>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onDeleteItem?.(item.id)}
              className="text-red-600 hover:text-red-700"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <DrawingRenderer
          drawingId={item.drawingId}
          widthMm={item.widthMm}
          heightMm={item.heightMm}
          floorLevelMm={item.floorLevelMm}
          keyHeightMm={item.keyHeightMm}
          panelCount={item.panelCount}
          trackCount={item.trackCount}
          doors={item.doors}
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
              <SpecRow label="Product name" value={item.productName} />
              <EditableNumberSpecRow
                label="Width"
                value={draftWidth}
                suffix="mm"
                onChange={(value) => updatePositiveNumber("widthMm", value, setDraftWidth)}
                onBlur={() => setDraftWidth(String(item.widthMm))}
              />
              <EditableNumberSpecRow
                label="Height"
                value={draftHeight}
                suffix="mm"
                onChange={(value) => updatePositiveNumber("heightMm", value, setDraftHeight)}
                onBlur={() => setDraftHeight(String(item.heightMm))}
              />
              <SpecRow
                label="Floor level"
                value={
                  typeof item.floorLevelMm === "number"
                    ? `${item.floorLevelMm} mm`
                    : "-"
                }
              />
              {typeof item.keyHeightMm === "number" && (
                <SpecRow label="Key height" value={`${item.keyHeightMm} mm`} />
              )}
              <SpecRow label="Panels" value={`${item.panelCount}`} />
              <SpecRow
                label="Tracks"
                value={`${item.trackCount} track${item.trackCount > 1 ? "s" : ""}`}
              />
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

function EditableNumberSpecRow({
  label,
  value,
  suffix,
  onChange,
  onBlur,
}: {
  label: string;
  value: string;
  suffix: string;
  onChange: (value: string) => void;
  onBlur: () => void;
}) {
  return (
    <tr className="border-b border-slate-200 last:border-b-0">
      <th className="w-44 bg-slate-50 px-3 py-2 text-left font-semibold text-slate-700">
        {label}
      </th>
      <td className="px-3 py-2 text-slate-800">
        <div className="flex max-w-56 items-center gap-2">
          <Input
            type="number"
            min={1}
            value={value}
            onChange={(event) => onChange(event.target.value)}
            onBlur={onBlur}
            className="h-9"
          />
          <span className="text-sm text-slate-600">{suffix}</span>
        </div>
      </td>
    </tr>
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
