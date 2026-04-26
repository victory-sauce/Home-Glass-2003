import { Trash2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import type { CutPlanOrderItem } from "@/lib/cutPlanner";

export type EditableOrderItem = CutPlanOrderItem;

interface Props {
  items: EditableOrderItem[];
  onChange: (items: EditableOrderItem[]) => void;
}

const GLASS_TYPES = ["Clear", "Tinted", "Mirror", "Tempered", "Laminated"];

function makeNewItem(): EditableOrderItem {
  return {
    id: crypto.randomUUID(),
    width: 0,
    height: 0,
    quantity: 1,
    thickness: 6,
    glass_type: "Clear",
    allow_rotation: true,
    notes: "",
  };
}

export function OrderItemsEditor({ items, onChange }: Props) {
  const updateItem = <K extends keyof EditableOrderItem>(
    id: string,
    key: K,
    value: EditableOrderItem[K]
  ) => {
    onChange(items.map((item) => (item.id === id ? { ...item, [key]: value } : item)));
  };

  const removeItem = (id: string) => {
    onChange(items.filter((item) => item.id !== id));
  };

  return (
    <div className="space-y-2.5">
      {items.length === 0 && (
        <div className="rounded-xl border border-dashed border-border bg-slate-50 p-4 text-sm text-muted-foreground">
          No order items added yet.
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-border bg-white">
        <table className="min-w-[960px] w-full text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-2 py-1.5 text-left font-semibold">#</th>
              <th className="px-2 py-1.5 text-left font-semibold">Width</th>
              <th className="px-2 py-1.5 text-left font-semibold">Height</th>
              <th className="px-2 py-1.5 text-left font-semibold">Qty</th>
              <th className="px-2 py-1.5 text-left font-semibold">Thickness</th>
              <th className="px-2 py-1.5 text-left font-semibold">Glass Type</th>
              <th className="px-2 py-1.5 text-left font-semibold">Rotation</th>
              <th className="px-2 py-1.5 text-left font-semibold">Notes</th>
              <th className="px-2 py-1.5 text-right font-semibold">Delete</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => (
              <tr key={item.id} className="border-t align-top">
                <td className="px-2 py-1.5 font-semibold text-slate-900">{index + 1}</td>
                <td className="px-2 py-1.5">
                  <Input
                    type="number"
                    min={1}
                    value={item.width || ""}
                    onChange={(event) => updateItem(item.id, "width", Number(event.target.value) || 0)}
                    className="h-8"
                  />
                </td>
                <td className="px-2 py-1.5">
                  <Input
                    type="number"
                    min={1}
                    value={item.height || ""}
                    onChange={(event) => updateItem(item.id, "height", Number(event.target.value) || 0)}
                    className="h-8"
                  />
                </td>
                <td className="px-2 py-1.5">
                  <Input
                    type="number"
                    min={1}
                    value={item.quantity || 1}
                    onChange={(event) => updateItem(item.id, "quantity", Math.max(1, Number(event.target.value) || 1))}
                    className="h-8"
                  />
                </td>
                <td className="px-2 py-1.5">
                  <Input
                    type="number"
                    min={1}
                    step="0.1"
                    value={item.thickness || ""}
                    onChange={(event) => updateItem(item.id, "thickness", Number(event.target.value) || 0)}
                    className="h-8"
                  />
                </td>
                <td className="px-2 py-1.5">
                  <select
                    value={item.glass_type}
                    onChange={(event) => updateItem(item.id, "glass_type", event.target.value)}
                    className="h-8 w-full rounded-md border border-input bg-background px-2 text-sm"
                  >
                    {GLASS_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-2 py-1.5">
                  <label className="flex h-8 items-center gap-2 rounded-md border border-input px-2 text-xs">
                    <Checkbox
                      checked={item.allow_rotation}
                      onCheckedChange={(value) => updateItem(item.id, "allow_rotation", Boolean(value))}
                    />
                    Allow
                  </label>
                </td>
                <td className="px-2 py-1.5">
                  <Input
                    value={item.notes ?? ""}
                    onChange={(event) => updateItem(item.id, "notes", event.target.value)}
                    placeholder="Optional note"
                    className="h-8"
                  />
                </td>
                <td className="px-2 py-1.5 text-right">
                  <Button type="button" variant="ghost" size="icon" onClick={() => removeItem(item.id)} className="h-8 w-8 text-rose-600 hover:text-rose-700">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Button type="button" variant="outline" onClick={() => onChange([...items, makeNewItem()])}>
        <Plus className="mr-2 h-4 w-4" />
        Add item
      </Button>
    </div>
  );
}
