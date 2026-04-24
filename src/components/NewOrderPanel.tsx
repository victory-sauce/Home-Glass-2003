import { useEffect, useMemo, useState } from "react";
import { supabase, type GlassPiece, type Order } from "@/lib/supabase";
import { recommendPiece, type Recommendation } from "@/lib/recommend";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { PackagePlus, Sparkles, Lock, RotateCw } from "lucide-react";

interface Props {
  pieces: GlassPiece[];
  onChange: () => void;
}

const initial = {
  customer_name: "",
  customer_phone: "",
  glass_type: "",
  width: "",
  height: "",
  thickness: "",
  notes: "",
  allow_rotation: false,
};

export function NewOrderPanel({ pieces, onChange }: Props) {
  const [form, setForm] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [order, setOrder] = useState<Order | null>(null);
  const [rec, setRec] = useState<Recommendation | null>(null);

  const spec = useMemo(() => {
    const w = parseFloat(form.width);
    const h = parseFloat(form.height);
    const t = parseFloat(form.thickness);
    if (!form.glass_type || !w || !h || !t) return null;
    return {
      glass_type: form.glass_type,
      width: w,
      height: h,
      thickness: t,
      allow_rotation: form.allow_rotation,
    };
  }, [form]);

  // live recommendation preview
  useEffect(() => {
    if (!spec) {
      setRec(null);
      return;
    }
    setRec(recommendPiece(pieces, spec));
  }, [spec, pieces]);

  const set = (k: keyof typeof initial, v: string | boolean) =>
    setForm((f) => ({ ...f, [k]: v }));

  const reset = () => {
    setForm(initial);
    setOrder(null);
    setRec(null);
  };

  const createOrder = async () => {
    if (!spec || !form.customer_name) {
      toast.error("Fill in customer name and glass spec");
      return;
    }
    setBusy(true);
    try {
      // upsert customer (best-effort: match by phone if provided, else name)
      let customerId: string | null = null;
      const matchCol = form.customer_phone ? "phone" : "name";
      const matchVal = form.customer_phone || form.customer_name;
      const { data: existing } = await supabase
        .from("customers")
        .select("id")
        .eq(matchCol, matchVal)
        .maybeSingle();

      if (existing?.id) {
        customerId = existing.id;
      } else {
        const { data: created, error } = await supabase
          .from("customers")
          .insert({ name: form.customer_name, phone: form.customer_phone || null })
          .select("id")
          .single();
        if (error) throw error;
        customerId = created.id;
      }

      const { data: ord, error: oErr } = await supabase
        .from("orders")
        .insert({
          customer_id: customerId,
          customer_name_snapshot: form.customer_name,
          customer_phone_snapshot: form.customer_phone || null,
          glass_type: spec.glass_type,
          width: spec.width,
          height: spec.height,
          thickness: spec.thickness,
          notes: form.notes || null,
          allow_rotation: spec.allow_rotation,
          status: "open",
        })
        .select("*")
        .single();
      if (oErr) throw oErr;
      setOrder(ord as Order);
      toast.success("Order created");
      onChange();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to create order";
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  const reserveBest = async () => {
    if (!order) {
      toast.error("Create the order first");
      return;
    }
    if (!rec) {
      toast.error("No matching piece available");
      return;
    }
    setBusy(true);
    try {
      const { error: pErr } = await supabase
        .from("glass_pieces")
        .update({ status: "reserved", reserved_order_id: order.id })
        .eq("id", rec.piece.id);
      if (pErr) throw pErr;

      const { error: oErr } = await supabase
        .from("orders")
        .update({ selected_piece_id: rec.piece.id, status: "reserved" })
        .eq("id", order.id);
      if (oErr) throw oErr;

      await supabase.from("audit_logs").insert({
        action: "reserve_piece",
        entity_type: "glass_piece",
        entity_id: rec.piece.id,
        details: {
          order_id: order.id,
          piece_code: rec.piece.code,
          rotated: rec.rotated,
          waste: rec.waste,
        },
      });

      toast.success(`Reserved piece ${rec.piece.code}`);
      onChange();
      reset();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to reserve";
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="p-6 shadow-card">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-lg bg-gradient-accent text-primary-foreground flex items-center justify-center">
            <PackagePlus className="size-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">New customer order</h2>
            <p className="text-sm text-muted-foreground">Capture order, get the best matching piece</p>
          </div>
        </div>
        {order && (
          <Badge variant="outline" className="border-primary/30 text-primary">
            Order #{order.id.slice(0, 8)} · {order.status}
          </Badge>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Field label="Customer name">
          <Input value={form.customer_name} onChange={(e) => set("customer_name", e.target.value)} />
        </Field>
        <Field label="Phone / contact">
          <Input value={form.customer_phone} onChange={(e) => set("customer_phone", e.target.value)} />
        </Field>
        <Field label="Glass type">
          <Input value={form.glass_type} onChange={(e) => set("glass_type", e.target.value)} placeholder="e.g. clear, tempered" />
        </Field>
        <Field label="Width (mm)">
          <Input type="number" value={form.width} onChange={(e) => set("width", e.target.value)} />
        </Field>
        <Field label="Height (mm)">
          <Input type="number" value={form.height} onChange={(e) => set("height", e.target.value)} />
        </Field>
        <Field label="Thickness (mm)">
          <Input type="number" step="0.1" value={form.thickness} onChange={(e) => set("thickness", e.target.value)} />
        </Field>
        <div className="md:col-span-2 lg:col-span-2">
          <Field label="Notes">
            <Textarea rows={2} value={form.notes} onChange={(e) => set("notes", e.target.value)} />
          </Field>
        </div>
        <div className="flex items-end">
          <label className="flex items-center gap-3 h-12 px-4 rounded-lg border border-input bg-background cursor-pointer w-full">
            <Checkbox
              checked={form.allow_rotation}
              onCheckedChange={(v) => set("allow_rotation", Boolean(v))}
            />
            <span className="text-sm font-medium">Allow rotation</span>
            <RotateCw className="size-4 ml-auto text-muted-foreground" />
          </label>
        </div>
      </div>

      {/* Recommendation preview */}
      <div className="mt-5">
        {spec ? (
          rec ? (
            <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 flex flex-wrap items-center gap-4">
              <Sparkles className="size-5 text-primary" />
              <div className="flex-1 min-w-[200px]">
                <div className="text-sm text-muted-foreground">Recommended piece</div>
                <div className="font-semibold text-foreground">
                  {rec.piece.code} — {rec.piece.width}×{rec.piece.height}mm · {rec.piece.thickness}mm · {rec.piece.glass_type}
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  Rack {rec.piece.rack} · waste {Math.round(rec.waste).toLocaleString()} mm² {rec.rotated && "· rotated"}
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-warning/30 bg-warning/5 p-4 text-sm text-warning-foreground/80">
              No available piece matches that spec.
            </div>
          )
        ) : (
          <div className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
            Fill glass type, width, height & thickness to preview the best match.
          </div>
        )}
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        <Button onClick={createOrder} disabled={busy || !!order} className="h-12 px-6 text-base font-semibold">
          <PackagePlus className="size-5 mr-2" /> Create order
        </Button>
        <Button
          onClick={reserveBest}
          disabled={busy || !order || !rec}
          variant="secondary"
          className="h-12 px-6 text-base font-semibold bg-gradient-accent text-primary-foreground hover:opacity-90"
        >
          <Lock className="size-5 mr-2" /> Reserve best piece
        </Button>
        {order && (
          <Button onClick={reset} variant="ghost" className="h-12">
            New order
          </Button>
        )}
      </div>
    </Card>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">{label}</Label>
      {children}
    </div>
  );
}
