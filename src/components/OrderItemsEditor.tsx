import type { ReactNode } from "react";
import { Trash2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
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
    <div className="space-y-3">
      {items.length === 0 && (
        <div className="rounded-xl border border-dashed border-border bg-slate-50 p-4 text-sm text-muted-foreground">
          No order items added yet.
        </div>
      )}

      {items.map((item, index) => (
        <div key={item.id} className="rounded-xl border bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <div className="text-sm font-semibold text-slate-900">Item #{index + 1}</div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => removeItem(item.id)}
              className="text-rose-600 hover:text-rose-700"
            >
              <Trash2 className="mr-1 h-4 w-4" />
              Delete
            </Button>
          </div>

          <div className="grid gap-3 md:grid-cols-4">
            <Field label="Width (mm)">
              <Input
                type="number"
                min={1}
                value={item.width || ""}
                onChange={(event) => updateItem(item.id, "width", Number(event.target.value) || 0)}
              />
            </Field>

            <Field label="Height (mm)">
              <Input
                type="number"
                min={1}
                value={item.height || ""}
                onChange={(event) => updateItem(item.id, "height", Number(event.target.value) || 0)}
              />
            </Field>

            <Field label="Quantity">
              <Input
                type="number"
                min={1}
                value={item.quantity || 1}
                onChange={(event) => updateItem(item.id, "quantity", Math.max(1, Number(event.target.value) || 1))}
              />
            </Field>

            <Field label="Thickness (mm)">
              <Input
                type="number"
                min={1}
                step="0.1"
                value={item.thickness || ""}
                onChange={(event) => updateItem(item.id, "thickness", Number(event.target.value) || 0)}
              />
            </Field>

            <Field label="Glass type">
              <select
                value={item.glass_type}
                onChange={(event) => updateItem(item.id, "glass_type", event.target.value)}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                {GLASS_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Notes">
              <Input
                value={item.notes ?? ""}
                onChange={(event) => updateItem(item.id, "notes", event.target.value)}
                placeholder="Optional item note"
              />
            </Field>

            <div className="md:col-span-2">
              <Label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Rotation
              </Label>
              <label className="flex h-10 items-center gap-3 rounded-md border border-input px-3">
                <Checkbox
                  checked={item.allow_rotation}
                  onCheckedChange={(value) =>
                    updateItem(item.id, "allow_rotation", Boolean(value))
                  }
                />
                <span className="text-sm">Allow rotation if needed</span>
              </label>
            </div>
          </div>
        </div>
      ))}

      <Button type="button" variant="outline" onClick={() => onChange([...items, makeNewItem()])}>
        <Plus className="mr-2 h-4 w-4" />
        Add item
      </Button>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <Label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </Label>
      {children}
    </div>
  );
}
