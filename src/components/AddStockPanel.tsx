import { type FormEvent, useMemo, useState } from "react";
import { supabase, type RackName } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const glassTypes = ["Clear", "Tinted", "Mirror", "Tempered", "Laminated"];
const rackOptions: RackName[] = ["A", "B", "C", "LEFTOVERS"];

interface AddStockPanelProps {
  onChange: () => Promise<void> | void;
  onSuccess?: () => void;
}

interface AddStockForm {
  code: string;
  quantity: number;
  width: number;
  height: number;
  thickness: number;
  glassType: string;
  rack: RackName;
  rackOrder: string;
}

const initialForm: AddStockForm = {
  code: "",
  quantity: 1,
  width: 2440,
  height: 1830,
  thickness: 6,
  glassType: "Clear",
  rack: "A",
  rackOrder: "",
};

function generateCodes(baseCode: string, quantity: number) {
  if (quantity === 1) {
    return [baseCode];
  }

  const match = baseCode.match(/^(.*?)(\d+)$/);
  if (match) {
    const prefix = match[1];
    const numericPart = match[2];
    const start = Number.parseInt(numericPart, 10);
    const width = numericPart.length;

    return Array.from({ length: quantity }, (_, index) => {
      const num = String(start + index).padStart(width, "0");
      return `${prefix}${num}`;
    });
  }

  return Array.from({ length: quantity }, (_, index) => `${baseCode}-${index + 1}`);
}

export function AddStockPanel({ onChange, onSuccess }: AddStockPanelProps) {
  const [form, setForm] = useState<AddStockForm>(initialForm);
  const [submitting, setSubmitting] = useState(false);

  const generatedCodesPreview = useMemo(() => {
    const code = form.code.trim();
    if (!code) {
      return "Codes will be generated from your code/prefix.";
    }

    return generateCodes(code, Math.max(1, form.quantity)).join(", ");
  }, [form.code, form.quantity]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const code = form.code.trim();
    const quantity = Math.max(1, Number(form.quantity));

    if (!code) {
      toast.error("Code / Prefix is required.");
      return;
    }

    if (quantity < 1) {
      toast.error("Quantity must be at least 1.");
      return;
    }

    if (Number(form.width) <= 0 || Number(form.height) <= 0 || Number(form.thickness) <= 0) {
      toast.error("Width, height and thickness must be greater than 0.");
      return;
    }

    if (!form.glassType) {
      toast.error("Glass type is required.");
      return;
    }

    if (!form.rack) {
      toast.error("Rack is required.");
      return;
    }

    setSubmitting(true);

    try {
      const codes = generateCodes(code, quantity);

      let startRackOrder: number;
      if (form.rackOrder.trim()) {
        startRackOrder = Number.parseInt(form.rackOrder, 10);
      } else {
        const { data: maxRow, error: maxError } = await supabase
          .from("glass_pieces")
          .select("rack_order")
          .eq("rack", form.rack)
          .order("rack_order", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (maxError) {
          throw maxError;
        }

        startRackOrder = (maxRow?.rack_order ?? 0) + 1;
      }

      if (Number.isNaN(startRackOrder)) {
        toast.error("Rack position must be a valid number.");
        setSubmitting(false);
        return;
      }

      const rows = codes.map((pieceCode, index) => ({
        code: pieceCode,
        width: Number(form.width),
        height: Number(form.height),
        thickness: Number(form.thickness),
        glass_type: form.glassType,
        status: "available",
        rack: form.rack,
        rack_order: startRackOrder + index,
        parent_piece_id: null,
        reserved_order_id: null,
      }));

      const { data: insertedRows, error: insertError } = await supabase
        .from("glass_pieces")
        .insert(rows)
        .select("id, code, rack_order");

      if (insertError) {
        throw insertError;
      }

      const rackOrders = insertedRows?.map((row) => row.rack_order) ?? [];
      const entityId = quantity === 1 ? insertedRows?.[0]?.id ?? null : null;

      const { error: auditError } = await supabase.from("audit_logs").insert({
        action: "add_stock",
        entity_type: "glass_piece",
        entity_id: entityId,
        details: {
          codes,
          quantity,
          rack: form.rack,
          width: Number(form.width),
          height: Number(form.height),
          thickness: Number(form.thickness),
          glass_type: form.glassType,
          rack_orders: rackOrders,
        },
      });

      if (auditError) {
        console.error("Audit log error:", auditError);
      }

      toast.success(`Added ${quantity} stock piece${quantity > 1 ? "s" : ""}.`);
      setForm(initialForm);
      await onChange();
      onSuccess?.();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to add stock.";
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="code">Code / Prefix *</Label>
          <Input
            id="code"
            placeholder="e.g. G100 or MIRROR"
            value={form.code}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, code: event.target.value }))
            }
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="quantity">Quantity *</Label>
          <Input
            id="quantity"
            type="number"
            min={1}
            value={form.quantity}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, quantity: Number(event.target.value) }))
            }
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="width">Width (mm) *</Label>
          <Input
            id="width"
            type="number"
            min={1}
            value={form.width}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, width: Number(event.target.value) }))
            }
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="height">Height (mm) *</Label>
          <Input
            id="height"
            type="number"
            min={1}
            value={form.height}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, height: Number(event.target.value) }))
            }
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="thickness">Thickness (mm) *</Label>
          <Input
            id="thickness"
            type="number"
            min={1}
            value={form.thickness}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, thickness: Number(event.target.value) }))
            }
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="glassType">Glass Type *</Label>
          <select
            id="glassType"
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={form.glassType}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, glassType: event.target.value }))
            }
            required
          >
            {glassTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="rack">Rack *</Label>
          <select
            id="rack"
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={form.rack}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, rack: event.target.value as RackName }))
            }
            required
          >
            {rackOptions.map((rack) => (
              <option key={rack} value={rack}>
                {rack}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="rackOrder">Rack Position (Order)</Label>
          <Input
            id="rackOrder"
            type="number"
            min={1}
            placeholder="Optional (leave blank to append)"
            value={form.rackOrder}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, rackOrder: event.target.value }))
            }
          />
        </div>
      </div>

      <div className="rounded-xl border border-blue-100 bg-blue-50 p-3 text-sm text-blue-900">
        <p className="font-medium">How it works</p>
        <p className="mt-1">{generatedCodesPreview}</p>
      </div>

      <Button type="submit" disabled={submitting}>
        {submitting ? "Adding..." : "Add to Stock"}
      </Button>
    </form>
  );
}
