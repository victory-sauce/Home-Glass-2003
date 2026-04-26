import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import { PackagePlus, Lock, ReceiptText, Scissors } from "lucide-react";
import { supabase, type GlassPiece, type Order } from "@/lib/supabase";
import { generateCutPlans, type CutPlan } from "@/lib/cutPlanner";
import { OrderItemsEditor, type EditableOrderItem } from "@/components/OrderItemsEditor";
import { CutLayoutPreview } from "@/components/CutLayoutPreview";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface Props {
  pieces: GlassPiece[];
  onChange: () => void;
}

const initialForm = {
  customer_name: "",
  customer_phone: "",
  notes: "",
  receipt_type: "non_vat" as "vat" | "non_vat",
};

function makeInitialItem(): EditableOrderItem {
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

function receiptLabel(value: "vat" | "non_vat") {
  return value === "vat" ? "VAT receipt" : "Non-VAT receipt";
}

function validItems(items: EditableOrderItem[]) {
  return items.filter(
    (item) =>
      Number(item.width) > 0 &&
      Number(item.height) > 0 &&
      Number(item.quantity) > 0 &&
      Number(item.thickness) > 0 &&
      item.glass_type
  );
}

export function NewOrderPanel({ pieces, onChange }: Props) {
  const [form, setForm] = useState(initialForm);
  const [busy, setBusy] = useState(false);
  const [createdOrder, setCreatedOrder] = useState<Order | null>(null);
  const [items, setItems] = useState<EditableOrderItem[]>([makeInitialItem()]);

  const plans = useMemo(() => generateCutPlans(validItems(items), pieces), [items, pieces]);
  const bestPlan = plans[0] ?? null;
  const bestPlanTotals = useMemo(() => {
    if (!bestPlan) return null;
    return bestPlan.sources.reduce(
      (acc, source) => {
        const usefulLeftoverArea = source.leftoverRegions
          .filter((region) => region.kind === "leftover")
          .reduce((sum, region) => sum + region.width * region.height, 0);
        return {
          usedArea: acc.usedArea + source.usedArea,
          usefulLeftoverArea: acc.usefulLeftoverArea + usefulLeftoverArea,
        };
      },
      { usedArea: 0, usefulLeftoverArea: 0 }
    );
  }, [bestPlan]);

  const set = (key: keyof typeof initialForm, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const reset = () => {
    setForm(initialForm);
    setItems([makeInitialItem()]);
    setCreatedOrder(null);
  };

  const createOrder = async () => {
    const cleanedItems = validItems(items);

    if (!form.customer_name.trim() || cleanedItems.length === 0) {
      toast.error("Customer name and at least one order item are required");
      return;
    }

    setBusy(true);

    try {
      const customerName = form.customer_name.trim();
      const phone = form.customer_phone.trim();

      let customerId: string | null = null;

      if (phone) {
        const { data: existing } = await supabase.from("customers").select("id").eq("phone", phone).maybeSingle();
        customerId = existing?.id ?? null;
      }

      if (!customerId) {
        const { data: existingByName } = await supabase.from("customers").select("id").eq("name", customerName).maybeSingle();
        customerId = existingByName?.id ?? null;
      }

      if (!customerId) {
        const { data, error } = await supabase
          .from("customers")
          .insert({
            name: customerName,
            phone: phone || null,
            phone_normalized: phone ? phone.replace(/\D/g, "") : null,
          })
          .select("id")
          .single();

        if (error) throw error;
        customerId = data.id;
      }

      const firstItem = cleanedItems[0];

      const { data: orderData, error: orderError } = await supabase
        .from("orders")
        .insert({
          customer_id: customerId,
          customer_name_snapshot: customerName,
          customer_phone_snapshot: phone || null,
          glass_type: firstItem.glass_type,
          width: firstItem.width,
          height: firstItem.height,
          thickness: firstItem.thickness,
          allow_rotation: firstItem.allow_rotation,
          notes: form.notes || null,
          receipt_type: form.receipt_type,
          status: "open",
          selected_piece_id: bestPlan?.sources[0]?.sourcePiece.id ?? null,
        })
        .select("*")
        .single();

      if (orderError) throw orderError;

      const orderItemsPayload = cleanedItems.map((item) => ({
        order_id: orderData.id,
        width: item.width,
        height: item.height,
        quantity: item.quantity,
        thickness: item.thickness,
        glass_type: item.glass_type,
        allow_rotation: item.allow_rotation,
        notes: item.notes || null,
      }));

      const { error: itemError } = await supabase.from("order_items").insert(orderItemsPayload);
      if (itemError) throw itemError;

      await supabase.from("audit_logs").insert({
        action: "create_order",
        entity_type: "order",
        entity_id: orderData.id,
        details: {
          receipt_type: form.receipt_type,
          receipt_label: receiptLabel(form.receipt_type),
          item_count: cleanedItems.length,
          plan_sources: bestPlan?.usedSourceCount ?? 0,
          plan_waste: bestPlan?.totalWaste ?? null,
        },
      });

      setCreatedOrder(orderData as Order);
      toast.success(`Order created · ${receiptLabel(form.receipt_type)}`);
      onChange();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create order");
    } finally {
      setBusy(false);
    }
  };

  const reservePlan = async (plan: CutPlan | null) => {
    if (!createdOrder) {
      toast.error("Create the order first");
      return;
    }

    if (!plan || plan.sources.length === 0) {
      toast.error("No plan with source pieces available");
      return;
    }

    setBusy(true);

    try {
      const sourceIds = plan.sources.map((source) => source.sourcePiece.id);

      const { error: piecesError } = await supabase
        .from("glass_pieces")
        .update({ status: "reserved", reserved_order_id: createdOrder.id })
        .in("id", sourceIds);

      if (piecesError) throw piecesError;

      const { error: orderError } = await supabase
        .from("orders")
        .update({
          status: "reserved",
          selected_piece_id: plan.sources[0]?.sourcePiece.id ?? null,
        })
        .eq("id", createdOrder.id);

      if (orderError) throw orderError;

      await supabase.from("audit_logs").insert({
        action: "reserve_cut_plan",
        entity_type: "order",
        entity_id: createdOrder.id,
        details: {
          source_piece_ids: sourceIds,
          source_piece_codes: plan.sources.map((source) => source.sourcePiece.code),
          used_sources: plan.usedSourceCount,
          total_waste: plan.totalWaste,
          unplaced_items: plan.unplacedItems.length,
          receipt_type: createdOrder.receipt_type,
        },
      });

      toast.success(`Reserved ${sourceIds.length} source piece(s)`);
      onChange();
      reset();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to reserve plan");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="overflow-hidden rounded-3xl border border-border bg-card shadow-card">
      <div className="border-b bg-gradient-to-r from-slate-50 to-blue-50 p-4 md:p-5">
        <div className="flex items-center gap-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-cyan-500 text-white shadow-lg shadow-cyan-500/20">
            <PackagePlus className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-foreground">New customer order</h2>
            <p className="text-sm text-muted-foreground">Multi-piece order capture with first-pass cut planning.</p>
          </div>
          {createdOrder && <Badge className="ml-auto">Order #{createdOrder.id.slice(0, 8)}</Badge>}
        </div>
      </div>

      <div className="space-y-4 p-4 md:p-5">
        <div className="space-y-4 rounded-2xl border border-border bg-white p-3 md:p-4">
          <div className="grid gap-3 md:grid-cols-2">
            <Field label="Customer name">
              <Input value={form.customer_name} onChange={(e) => set("customer_name", e.target.value)} className="h-10" />
            </Field>
            <Field label="Phone / Contact">
              <Input value={form.customer_phone} onChange={(e) => set("customer_phone", e.target.value)} className="h-10" />
            </Field>
          </div>

          <div className="flex flex-col gap-2 rounded-xl border border-border bg-slate-50 p-3 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <ReceiptText className="h-4 w-4 text-blue-600" />
              <span>Receipt type</span>
            </div>
            <div className="grid gap-2 sm:grid-cols-2 md:w-auto">
              <ReceiptOption value="non_vat" selected={form.receipt_type === "non_vat"} title="Non-VAT receipt" onSelect={() => set("receipt_type", "non_vat")} />
              <ReceiptOption value="vat" selected={form.receipt_type === "vat"} title="VAT receipt" onSelect={() => set("receipt_type", "vat")} />
            </div>
          </div>

          <div>
            <div className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Order items</div>
            <OrderItemsEditor items={items} onChange={setItems} />
          </div>

          <Field label="Order notes">
            <Textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} className="min-h-20" />
          </Field>
        </div>

        <div className="rounded-2xl border border-border bg-slate-50 p-4">
          <div className="mb-3 flex items-center gap-2">
            <Scissors className="h-5 w-5 text-blue-700" />
            <h3 className="font-bold">Planner summary</h3>
          </div>

          {!bestPlan && <div className="rounded-xl border border-dashed bg-white p-4 text-sm text-muted-foreground">Add valid order items to generate a plan.</div>}

          {bestPlan && (
            <div className="rounded-xl border bg-white p-3 text-sm">
              <div className="font-semibold text-slate-900">
                Best plan: {bestPlan.usedSourceCount} source sheet{bestPlan.usedSourceCount === 1 ? "" : "s"} · Waste {Math.round(bestPlan.totalWaste).toLocaleString()} mm² ·{" "}
                {bestPlan.unplacedItems.length} cut{bestPlan.unplacedItems.length === 1 ? "" : "s"} unplaced
              </div>
              <div className="mt-2 grid gap-2 text-xs text-slate-700 sm:grid-cols-2 lg:grid-cols-3">
                <div className="rounded-md bg-slate-50 px-2 py-1">
                  <span className="font-semibold text-slate-900">Status:</span> {bestPlan.fulfilled ? "All requested cuts are placeable" : "Plan has unplaced cuts"}
                </div>
                <div className="rounded-md bg-slate-50 px-2 py-1">
                  <span className="font-semibold text-slate-900">Sources:</span> {bestPlan.usedSourceCount}
                </div>
                <div className="rounded-md bg-slate-50 px-2 py-1">
                  <span className="font-semibold text-slate-900">Used area:</span> {Math.round(bestPlanTotals?.usedArea ?? 0).toLocaleString()} mm²
                </div>
                <div className="rounded-md bg-slate-50 px-2 py-1">
                  <span className="font-semibold text-slate-900">Useful leftover:</span> {Math.round(bestPlanTotals?.usefulLeftoverArea ?? 0).toLocaleString()} mm²
                </div>
                <div className="rounded-md bg-slate-50 px-2 py-1">
                  <span className="font-semibold text-slate-900">Waste area:</span> {Math.round(bestPlan.totalWaste).toLocaleString()} mm²
                </div>
                <div className="rounded-md bg-slate-50 px-2 py-1">
                  <span className="font-semibold text-slate-900">Unplaced items:</span> {bestPlan.unplacedItems.length}
                </div>
              </div>
            </div>
          )}

          <div className="mt-4 flex flex-wrap gap-3">
            <Button onClick={createOrder} disabled={busy || !!createdOrder} className="h-11">
              <PackagePlus className="mr-2 h-4 w-4" />
              Create Order
            </Button>
            <Button onClick={() => reservePlan(bestPlan)} disabled={busy || !createdOrder || !bestPlan?.sources.length} variant="secondary" className="h-11 bg-gradient-accent text-primary-foreground">
              <Lock className="mr-2 h-4 w-4" />
              Reserve Plan
            </Button>
            {createdOrder && <Button variant="ghost" onClick={reset}>New Order</Button>}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-slate-50 p-4">
          <div className="mb-3 flex items-center gap-2">
            <Scissors className="h-5 w-5 text-blue-700" />
            <h3 className="font-bold">Recommended cut plan</h3>
          </div>

          {!bestPlan && <div className="rounded-xl border border-dashed bg-white p-4 text-sm text-muted-foreground">Add valid order items to generate a plan.</div>}

          {bestPlan && (
            <div className="space-y-3">
              <div className="grid gap-2 rounded-xl border bg-white p-3 text-xs sm:grid-cols-2 xl:grid-cols-5">
                <SummaryChip label="Sources" value={bestPlan.usedSourceCount} />
                <SummaryChip label="Used area" value={`${Math.round(bestPlanTotals?.usedArea ?? 0).toLocaleString()} mm²`} />
                <SummaryChip label="Useful leftover" value={`${Math.round(bestPlanTotals?.usefulLeftoverArea ?? 0).toLocaleString()} mm²`} />
                <SummaryChip label="Waste area" value={`${Math.round(bestPlan.totalWaste).toLocaleString()} mm²`} />
                <SummaryChip label="Unplaced cuts" value={bestPlan.unplacedItems.length} tone={bestPlan.unplacedItems.length > 0 ? "warn" : "default"} />
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                {bestPlan.sources.map((source, index) => (
                  <CutLayoutPreview
                    key={source.sourcePiece.id}
                    source={source}
                    variant="compact"
                    maxHeight={300}
                    showHeader
                    showCutSequence
                    layoutNumber={index + 1}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <Label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function ReceiptOption({
  value,
  selected,
  title,
  onSelect,
}: {
  value: "vat" | "non_vat";
  selected: boolean;
  title: string;
  onSelect: () => void;
}) {
  return (
    <label className={`flex cursor-pointer items-center gap-2 rounded-full border px-3 py-2 text-sm transition ${selected ? "border-blue-400 bg-blue-50 text-blue-900 ring-2 ring-blue-100" : "border-slate-200 bg-white text-slate-700 hover:border-blue-200"}`}>
      <input type="radio" name="receipt_type" value={value} checked={selected} onChange={onSelect} className="h-4 w-4 accent-blue-600" />
      <div className="font-semibold">{title}</div>
    </label>
  );
}

function SummaryChip({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: number | string;
  tone?: "default" | "warn";
}) {
  return (
    <div className={`rounded-lg px-2.5 py-2 ${tone === "warn" ? "bg-amber-50 text-amber-900" : "bg-slate-50 text-slate-700"}`}>
      <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="text-sm font-semibold">{value}</div>
    </div>
  );
}
