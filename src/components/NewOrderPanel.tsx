import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { supabase, type GlassPiece, type Order } from "@/lib/supabase";
import { getRecommendations, type Recommendation } from "@/lib/recommend";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  PackagePlus,
  Lock,
  RotateCw,
  Search,
  Scissors,
  Layers,
  CheckCircle2,
  ReceiptText,
} from "lucide-react";
import { toast } from "sonner";

interface Props {
  pieces: GlassPiece[];
  onChange: () => void;
}

const initial = {
  customer_name: "",
  customer_phone: "",
  glass_type: "Clear",
  width: "",
  height: "",
  thickness: "6",
  notes: "",
  allow_rotation: true,
  receipt_type: "non_vat" as "vat" | "non_vat",
};

function rackLabel(rack: string) {
  return rack === "LEFTOVERS" ? "Leftovers" : `Rack ${rack}`;
}

function formatWaste(value: number) {
  return `${Math.round(value).toLocaleString()} mm²`;
}

function matchQualityLabel(index: number) {
  if (index === 0) return "Best match";
  if (index <= 2) return "Good option";
  return "Alternative";
}

function receiptLabel(value: "vat" | "non_vat") {
  return value === "vat" ? "VAT receipt" : "Non-VAT receipt";
}

export function NewOrderPanel({ pieces, onChange }: Props) {
  const [form, setForm] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [order, setOrder] = useState<Order | null>(null);
  const [selectedRecommendation, setSelectedRecommendation] =
    useState<Recommendation | null>(null);

  const spec = useMemo(() => {
    const width = Number.parseFloat(form.width);
    const height = Number.parseFloat(form.height);
    const thickness = Number.parseFloat(form.thickness);

    if (!form.glass_type || !width || !height || !thickness) return null;

    return {
      glass_type: form.glass_type,
      width,
      height,
      thickness,
      allow_rotation: form.allow_rotation,
    };
  }, [form]);

  const recommendations = useMemo(() => {
    if (!spec) return [];
    return getRecommendations(pieces, spec);
  }, [pieces, spec]);

  const bestRecommendation = recommendations[0] ?? null;

  useEffect(() => {
    setSelectedRecommendation(bestRecommendation);
  }, [bestRecommendation]);

  const set = (key: keyof typeof initial, value: string | boolean) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const reset = () => {
    setForm(initial);
    setOrder(null);
    setSelectedRecommendation(null);
  };

  const createOrder = async () => {
    if (!spec || !form.customer_name.trim()) {
      toast.error("Fill in customer name and glass spec");
      return;
    }

    setBusy(true);

    try {
      let customerId: string | null = null;

      const phone = form.customer_phone.trim();
      const customerName = form.customer_name.trim();

      if (phone) {
        const { data: existing } = await supabase
          .from("customers")
          .select("id")
          .eq("phone", phone)
          .maybeSingle();

        if (existing?.id) {
          customerId = existing.id;
        }
      }

      if (!customerId) {
        const { data: existingByName } = await supabase
          .from("customers")
          .select("id")
          .eq("name", customerName)
          .maybeSingle();

        if (existingByName?.id) {
          customerId = existingByName.id;
        }
      }

      if (!customerId) {
        const { data: created, error } = await supabase
          .from("customers")
          .insert({
            name: customerName,
            phone: phone || null,
            phone_normalized: phone ? phone.replace(/\D/g, "") : null,
          })
          .select("id")
          .single();

        if (error) throw error;

        customerId = created.id;
      }

      const { data: createdOrder, error: orderError } = await supabase
        .from("orders")
        .insert({
          customer_id: customerId,
          customer_name_snapshot: customerName,
          customer_phone_snapshot: phone || null,
          glass_type: spec.glass_type,
          width: spec.width,
          height: spec.height,
          thickness: spec.thickness,
          notes: form.notes || null,
          allow_rotation: spec.allow_rotation,
          receipt_type: form.receipt_type,
          status: "open",
          selected_piece_id: selectedRecommendation?.piece.id ?? null,
        })
        .select("*")
        .single();

      if (orderError) throw orderError;

      setOrder(createdOrder as Order);

      await supabase.from("audit_logs").insert({
        action: "create_order",
        entity_type: "order",
        entity_id: createdOrder.id,
        details: {
          customer_name: customerName,
          customer_phone: phone || null,
          glass_type: spec.glass_type,
          width: spec.width,
          height: spec.height,
          thickness: spec.thickness,
          receipt_type: form.receipt_type,
          receipt_label: receiptLabel(form.receipt_type),
          recommended_piece: selectedRecommendation?.piece.code ?? null,
        },
      });

      toast.success(`Order created · ${receiptLabel(form.receipt_type)}`);
      onChange();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to create order";

      toast.error(message);
    } finally {
      setBusy(false);
    }
  };

  const reservePiece = async (recommendation?: Recommendation | null) => {
    const target = recommendation ?? selectedRecommendation;

    if (!order) {
      toast.error("Create the order first");
      return;
    }

    if (!target) {
      toast.error("No matching piece selected");
      return;
    }

    setBusy(true);

    try {
      const { error: pieceError } = await supabase
        .from("glass_pieces")
        .update({
          status: "reserved",
          reserved_order_id: order.id,
        })
        .eq("id", target.piece.id);

      if (pieceError) throw pieceError;

      const { error: orderError } = await supabase
        .from("orders")
        .update({
          selected_piece_id: target.piece.id,
          status: "reserved",
        })
        .eq("id", order.id);

      if (orderError) throw orderError;

      await supabase.from("audit_logs").insert({
        action: "reserve_piece",
        entity_type: "glass_piece",
        entity_id: target.piece.id,
        details: {
          order_id: order.id,
          piece_code: target.piece.code,
          rotated: target.rotated,
          waste: target.waste,
          receipt_type: order.receipt_type,
        },
      });

      toast.success(`Reserved piece ${target.piece.code}`);
      onChange();
      reset();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to reserve piece";

      toast.error(message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="overflow-hidden rounded-3xl border border-border bg-card shadow-card">
      <div className="border-b bg-gradient-to-r from-slate-50 to-blue-50 p-6">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-cyan-500 text-white shadow-lg shadow-cyan-500/20">
            <PackagePlus className="h-7 w-7" />
          </div>

          <div>
            <h2 className="text-2xl font-bold tracking-tight text-foreground">
              New customer order
            </h2>
            <p className="text-muted-foreground">
              Capture order, search inventory, and reserve the best matching
              piece
            </p>
          </div>

          {order && (
            <Badge className="ml-auto rounded-full px-3 py-1">
              Order #{order.id.slice(0, 8)} · {order.status}
            </Badge>
          )}
        </div>
      </div>

      <div className="grid gap-0 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-5 p-6">
          <div className="grid gap-4 md:grid-cols-3">
            <Field label="Customer name">
              <Input
                value={form.customer_name}
                onChange={(event) => set("customer_name", event.target.value)}
                className="h-12"
              />
            </Field>

            <Field label="Phone / Contact">
              <Input
                value={form.customer_phone}
                onChange={(event) => set("customer_phone", event.target.value)}
                className="h-12"
              />
            </Field>

            <Field label="Glass type">
              <select
                value={form.glass_type}
                onChange={(event) => set("glass_type", event.target.value)}
                className="h-12 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="Clear">Clear</option>
                <option value="Tinted">Tinted</option>
                <option value="Mirror">Mirror</option>
                <option value="Tempered">Tempered</option>
                <option value="Laminated">Laminated</option>
              </select>
            </Field>

            <Field label="Width (mm)">
              <Input
                type="number"
                value={form.width}
                onChange={(event) => set("width", event.target.value)}
                className="h-12"
              />
            </Field>

            <Field label="Height (mm)">
              <Input
                type="number"
                value={form.height}
                onChange={(event) => set("height", event.target.value)}
                className="h-12"
              />
            </Field>

            <Field label="Thickness (mm)">
              <select
                value={form.thickness}
                onChange={(event) => set("thickness", event.target.value)}
                className="h-12 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="5">5mm</option>
                <option value="6">6mm</option>
                <option value="8">8mm</option>
                <option value="10">10mm</option>
                <option value="12">12mm</option>
              </select>
            </Field>
          </div>

          <div className="rounded-2xl border border-border bg-slate-50 p-4">
            <div className="mb-3 flex items-center gap-2">
              <ReceiptText className="h-5 w-5 text-blue-600" />
              <div>
                <div className="font-semibold text-foreground">
                  Receipt type
                </div>
                <div className="text-sm text-muted-foreground">
                  This will be used later to trigger the correct Flow Account
                  process.
                </div>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <ReceiptOption
                value="non_vat"
                selected={form.receipt_type === "non_vat"}
                title="Non-VAT receipt"
                description="For normal receipt without VAT tax invoice."
                onSelect={() => set("receipt_type", "non_vat")}
              />

              <ReceiptOption
                value="vat"
                selected={form.receipt_type === "vat"}
                title="VAT receipt"
                description="For VAT receipt / tax invoice workflow."
                onSelect={() => set("receipt_type", "vat")}
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-[1fr_320px]">
            <Field label="Notes">
              <Textarea
                value={form.notes}
                onChange={(event) => set("notes", event.target.value)}
                className="min-h-28"
              />
            </Field>

            <div className="flex items-end">
              <label className="flex h-12 w-full cursor-pointer items-center gap-3 rounded-lg border border-input bg-background px-4">
                <Checkbox
                  checked={form.allow_rotation}
                  onCheckedChange={(value) =>
                    set("allow_rotation", Boolean(value))
                  }
                />
                <span className="text-sm font-medium">Allow rotation</span>
                <RotateCw className="ml-auto h-4 w-4 text-muted-foreground" />
              </label>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button
              onClick={createOrder}
              disabled={busy || !!order}
              className="h-12 px-6 text-base font-semibold"
            >
              <PackagePlus className="mr-2 h-5 w-5" />
              Create order
            </Button>

            <Button
              onClick={() => reservePiece()}
              disabled={busy || !order || !selectedRecommendation}
              variant="secondary"
              className="h-12 bg-gradient-accent px-6 text-base font-semibold text-primary-foreground hover:opacity-90"
            >
              <Lock className="mr-2 h-5 w-5" />
              Reserve selected piece
            </Button>

            {order && (
              <Button onClick={reset} variant="ghost" className="h-12">
                New order
              </Button>
            )}
          </div>
        </div>

        <div className="border-t bg-slate-50 p-6 lg:border-l lg:border-t-0">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
              <Search className="h-5 w-5" />
            </div>

            <div>
              <h3 className="font-bold text-foreground">
                Available matching pieces
              </h3>
              <p className="text-sm text-muted-foreground">
                Leftovers first, then regular racks by least waste
              </p>
            </div>
          </div>

          {!spec && (
            <div className="rounded-2xl border border-dashed border-border bg-white p-5 text-sm text-muted-foreground">
              Fill glass type, width, height and thickness to preview matching
              inventory options.
            </div>
          )}

          {spec && recommendations.length === 0 && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-800">
              No available piece matches this size, thickness and glass type.
            </div>
          )}

          {spec && recommendations.length > 0 && (
            <div className="space-y-3">
              {recommendations.slice(0, 8).map((recommendation, index) => {
                const selected =
                  selectedRecommendation?.piece.id === recommendation.piece.id;
                const isLeftover = recommendation.piece.rack === "LEFTOVERS";

                return (
                  <button
                    key={recommendation.piece.id}
                    type="button"
                    onClick={() => setSelectedRecommendation(recommendation)}
                    className={`w-full rounded-2xl border bg-white p-4 text-left shadow-sm transition hover:border-blue-300 hover:shadow-md ${
                      selected
                        ? "border-blue-500 ring-4 ring-blue-100"
                        : "border-slate-200"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-lg font-bold text-slate-950">
                            {recommendation.piece.code}
                          </span>

                          <Badge
                            variant={index === 0 ? "default" : "secondary"}
                            className="rounded-full"
                          >
                            {matchQualityLabel(index)}
                          </Badge>

                          {isLeftover && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-cyan-50 px-2.5 py-1 text-xs font-semibold text-cyan-700 ring-1 ring-cyan-200">
                              <Scissors className="h-3 w-3" />
                              Leftover
                            </span>
                          )}

                          {selected && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200">
                              <CheckCircle2 className="h-3 w-3" />
                              Selected
                            </span>
                          )}
                        </div>

                        <div className="mt-2 text-sm text-slate-600">
                          {recommendation.piece.width}×
                          {recommendation.piece.height}mm ·{" "}
                          {recommendation.piece.thickness}mm ·{" "}
                          {recommendation.piece.glass_type}
                        </div>

                        <div className="mt-1 flex flex-wrap gap-2 text-xs text-muted-foreground">
                          <span>{rackLabel(recommendation.piece.rack)}</span>
                          <span>·</span>
                          <span>Waste {formatWaste(recommendation.waste)}</span>
                          {recommendation.rotated && (
                            <>
                              <span>·</span>
                              <span>Rotated fit</span>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                        <Layers className="h-5 w-5" />
                      </div>
                    </div>
                  </button>
                );
              })}

              {recommendations.length > 8 && (
                <div className="rounded-xl border border-dashed border-border bg-white p-3 text-center text-sm text-muted-foreground">
                  +{recommendations.length - 8} more matching pieces not shown
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </Label>
      {children}
    </div>
  );
}

function ReceiptOption({
  value,
  selected,
  title,
  description,
  onSelect,
}: {
  value: "vat" | "non_vat";
  selected: boolean;
  title: string;
  description: string;
  onSelect: () => void;
}) {
  return (
    <label
      className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition ${
        selected
          ? "border-blue-400 bg-blue-50 ring-2 ring-blue-100"
          : "border-slate-200 bg-white hover:border-blue-200"
      }`}
    >
      <input
        type="radio"
        name="receipt_type"
        value={value}
        checked={selected}
        onChange={onSelect}
        className="mt-1 h-4 w-4 accent-blue-600"
      />

      <div>
        <div className="font-semibold text-slate-950">{title}</div>
        <div className="mt-1 text-sm text-muted-foreground">{description}</div>
      </div>
    </label>
  );
}
