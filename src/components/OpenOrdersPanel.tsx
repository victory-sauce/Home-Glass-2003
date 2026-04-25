import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  CalendarDays,
  ClipboardList,
  Filter,
  Lock,
  PackageCheck,
  Printer,
  ReceiptText,
  Scissors,
  Search,
} from "lucide-react";
import { supabase, type GlassPiece, type Order, type OrderItem } from "@/lib/supabase";
import { generateCutPlans, type CutPlanOrderItem } from "@/lib/cutPlanner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CutLayoutPreview } from "@/components/CutLayoutPreview";
import { toast } from "sonner";

interface Props {
  orders: Order[];
  pieces: GlassPiece[];
  onBack: () => void;
  onChange: () => void;
}

interface Recommendation {
  piece: GlassPiece;
  waste: number;
  rotated: boolean;
}

function normalize(value: string | null | undefined) {
  return String(value ?? "").trim().toLowerCase();
}

function receiptLabel(value?: string | null) {
  return value === "vat" ? "VAT" : "Non-VAT";
}

function getRecommendation(pieces: GlassPiece[], order: Order): Recommendation | null {
  const width = Number(order.width);
  const height = Number(order.height);
  const area = width * height;

  const matches = pieces
    .filter((piece) => piece.status === "available")
    .filter((piece) => Number(piece.thickness) === Number(order.thickness))
    .filter((piece) => normalize(piece.glass_type) === normalize(order.glass_type))
    .map((piece) => {
      const normal = Number(piece.width) >= width && Number(piece.height) >= height;
      const rotated = order.allow_rotation && Number(piece.width) >= height && Number(piece.height) >= width;
      if (!normal && !rotated) return null;
      return {
        piece,
        waste: Number(piece.width) * Number(piece.height) - area,
        rotated: !normal && rotated,
      };
    })
    .filter(Boolean) as Recommendation[];

  matches.sort((a, b) => {
    const aLeft = a.piece.rack === "LEFTOVERS" ? 0 : 1;
    const bLeft = b.piece.rack === "LEFTOVERS" ? 0 : 1;
    if (aLeft !== bLeft) return aLeft - bLeft;
    return a.waste - b.waste;
  });

  return matches[0] ?? null;
}

export function OpenOrdersPanel({ orders, pieces, onBack, onChange }: Props) {
  const [query, setQuery] = useState("");
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(orders[0]?.id ?? null);
  const [busy, setBusy] = useState(false);
  const [orderItemsByOrderId, setOrderItemsByOrderId] = useState<Record<string, OrderItem[]>>({});

  useEffect(() => {
    setSelectedOrderId((current) => current ?? orders[0]?.id ?? null);
  }, [orders]);

  useEffect(() => {
    const loadOrderItems = async () => {
      if (!orders.length) {
        setOrderItemsByOrderId({});
        return;
      }

      const orderIds = orders.map((order) => order.id);
      const { data, error } = await supabase
        .from("order_items")
        .select("*")
        .in("order_id", orderIds)
        .order("created_at", { ascending: true });

      if (error) {
        const message = error.message.toLowerCase();
        const missingTable =
          message.includes("order_items") &&
          (message.includes("does not exist") || message.includes("relation") || message.includes("schema cache"));

        if (!missingTable) {
          toast.error(`Failed loading order items: ${error.message}`);
        }

        setOrderItemsByOrderId({});
        return;
      }

      const map: Record<string, OrderItem[]> = {};
      for (const item of (data as OrderItem[]) ?? []) {
        if (!map[item.order_id]) map[item.order_id] = [];
        map[item.order_id].push(item);
      }
      setOrderItemsByOrderId(map);
    };

    loadOrderItems();
  }, [orders]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return orders.filter((order) => {
      if (!q) return true;
      return (
        order.id.toLowerCase().includes(q) ||
        normalize(order.customer_name_snapshot).includes(q) ||
        normalize(order.customer_phone_snapshot).includes(q) ||
        normalize(order.glass_type).includes(q)
      );
    });
  }, [orders, query]);

  const selectedOrder = filtered.find((order) => order.id === selectedOrderId) ?? filtered[0] ?? null;
  const selectedOrderItems = selectedOrder ? orderItemsByOrderId[selectedOrder.id] ?? [] : [];

  const selectedOrderPlan = useMemo(() => {
    if (!selectedOrder || selectedOrderItems.length === 0) return null;
    const cutItems: CutPlanOrderItem[] = selectedOrderItems.map((item) => ({
      id: item.id,
      width: Number(item.width),
      height: Number(item.height),
      quantity: Number(item.quantity),
      thickness: Number(item.thickness),
      glass_type: item.glass_type,
      allow_rotation: item.allow_rotation,
      notes: item.notes,
    }));

    return generateCutPlans(cutItems, pieces)[0] ?? null;
  }, [selectedOrder, selectedOrderItems, pieces]);

  const fallbackRecommendation = selectedOrder ? getRecommendation(pieces, selectedOrder) : null;

  const reserveSinglePiece = async () => {
    if (!selectedOrder || !fallbackRecommendation) {
      toast.error("No fallback recommendation available");
      return;
    }

    setBusy(true);

    try {
      const { error: pieceError } = await supabase
        .from("glass_pieces")
        .update({ status: "reserved", reserved_order_id: selectedOrder.id })
        .eq("id", fallbackRecommendation.piece.id);
      if (pieceError) throw pieceError;

      const { error: orderError } = await supabase
        .from("orders")
        .update({ status: "reserved", selected_piece_id: fallbackRecommendation.piece.id })
        .eq("id", selectedOrder.id);
      if (orderError) throw orderError;

      await supabase.from("audit_logs").insert({
        action: "reserve_piece_from_open_orders",
        entity_type: "order",
        entity_id: selectedOrder.id,
        details: {
          piece_code: fallbackRecommendation.piece.code,
          waste: fallbackRecommendation.waste,
          rotated: fallbackRecommendation.rotated,
        },
      });

      toast.success(`Reserved ${fallbackRecommendation.piece.code}`);
      onChange();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to reserve piece");
    } finally {
      setBusy(false);
    }
  };


  const reserveCutPlan = async () => {
    if (!selectedOrder || !selectedOrderPlan || selectedOrderPlan.sources.length === 0) {
      toast.error("No generated cut plan to reserve");
      return;
    }

    setBusy(true);

    try {
      const sourceIds = selectedOrderPlan.sources.map((source) => source.sourcePiece.id);

      const { error: pieceError } = await supabase
        .from("glass_pieces")
        .update({ status: "reserved", reserved_order_id: selectedOrder.id })
        .in("id", sourceIds);
      if (pieceError) throw pieceError;

      const { error: orderError } = await supabase
        .from("orders")
        .update({
          status: "reserved",
          selected_piece_id: selectedOrderPlan.sources[0]?.sourcePiece.id ?? null,
        })
        .eq("id", selectedOrder.id);
      if (orderError) throw orderError;

      await supabase.from("audit_logs").insert({
        action: "reserve_cut_plan_from_open_orders",
        entity_type: "order",
        entity_id: selectedOrder.id,
        details: {
          source_piece_ids: sourceIds,
          source_piece_codes: selectedOrderPlan.sources.map((source) => source.sourcePiece.code),
          used_sources: selectedOrderPlan.usedSourceCount,
          total_waste: selectedOrderPlan.totalWaste,
          unplaced_items: selectedOrderPlan.unplacedItems.length,
          receipt_type: selectedOrder.receipt_type ?? "non_vat",
        },
      });

      toast.success(`Reserved ${sourceIds.length} source piece(s)`);
      onChange();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to reserve cut plan");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Button variant="ghost" onClick={onBack} className="mb-2 -ml-2 text-muted-foreground">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to dashboard
          </Button>
          <h2 className="text-3xl font-bold">Open Orders</h2>
        </div>
        <Button onClick={onBack}>
          <ClipboardList className="mr-2 h-4 w-4" />
          New Order
        </Button>
      </div>

      <Card className="rounded-2xl border border-border bg-card p-4 shadow-card">
        <div className="grid gap-3 md:grid-cols-[1fr_auto]">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search orders" className="h-11 pl-9" />
          </div>
          <Button variant="outline" className="h-11">
            <Filter className="mr-2 h-4 w-4" />
            Filters
          </Button>
        </div>
      </Card>

      <div className="grid gap-5 xl:grid-cols-[1fr_1fr]">
        <Card className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
          <div className="border-b bg-slate-50 px-4 py-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">
            Orders ({filtered.length})
          </div>
          <div className="divide-y divide-border">
            {filtered.map((order) => (
              <button
                key={order.id}
                onClick={() => setSelectedOrderId(order.id)}
                className={`w-full p-4 text-left text-sm transition ${selectedOrder?.id === order.id ? "bg-blue-50" : "bg-white hover:bg-slate-50"}`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="font-semibold text-blue-700">{order.id.slice(0, 8)}</div>
                  <div className="text-xs text-muted-foreground">{receiptLabel(order.receipt_type)}</div>
                </div>
                <div className="mt-1 font-medium">{order.customer_name_snapshot || "Walk-in customer"}</div>
                <div className="text-muted-foreground">
                  {order.width} × {order.height} × {order.thickness}mm · {order.glass_type}
                </div>
              </button>
            ))}
            {filtered.length === 0 && <div className="p-6 text-center text-muted-foreground">No matching orders.</div>}
          </div>
        </Card>

        <Card className="rounded-2xl border border-border bg-card shadow-card">
          {!selectedOrder ? (
            <div className="p-8 text-center text-muted-foreground">Select an order to view details.</div>
          ) : (
            <div className="space-y-5 p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-xl font-bold">Order {selectedOrder.id.slice(0, 8)}</h3>
                  <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                    <CalendarDays className="h-3.5 w-3.5" />
                    {selectedOrder.created_at ? new Date(selectedOrder.created_at).toLocaleString() : "-"}
                  </div>
                </div>
                <div className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold">{receiptLabel(selectedOrder.receipt_type)}</div>
              </div>

              <div className="rounded-xl border bg-slate-50 p-3 text-sm">
                <div className="mb-2 font-semibold">Order Items</div>
                {selectedOrderItems.length === 0 ? (
                  <div className="text-muted-foreground">No order_items found. Showing single-piece fallback.</div>
                ) : (
                  <div className="space-y-2">
                    {selectedOrderItems.map((item) => (
                      <div key={item.id} className="rounded-lg border bg-white px-3 py-2">
                        {item.width}×{item.height} · qty {item.quantity} · {item.thickness}mm · {item.glass_type}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="rounded-xl border bg-slate-50 p-3 text-sm">
                <div className="mb-2 flex items-center gap-2 font-semibold">
                  <ReceiptText className="h-4 w-4 text-blue-600" />
                  Receipt workflow hint
                </div>
                {selectedOrder.receipt_type === "vat"
                  ? "Send this order through VAT receipt / tax invoice flow."
                  : "Send this order through normal non-VAT receipt flow."}
              </div>

              {selectedOrderPlan ? (
                <div className="space-y-2">
                  <div className="rounded-xl border bg-white p-3 text-sm">
                    <div className="font-semibold">Generated Cut Plan</div>
                    <div className="text-muted-foreground">
                      Sources {selectedOrderPlan.usedSourceCount} · Waste {Math.round(selectedOrderPlan.totalWaste).toLocaleString()} mm²
                    </div>
                  </div>
                  {selectedOrderPlan.sources.map((source) => (
                    <CutLayoutPreview key={source.sourcePiece.id} source={source} />
                  ))}
                  <Button onClick={reserveCutPlan} disabled={busy || selectedOrderPlan.unplacedItems.length > 0}>
                    <Lock className="mr-2 h-4 w-4" />
                    Reserve Plan Sources
                  </Button>
                </div>
              ) : fallbackRecommendation ? (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm">
                  <div className="mb-1 font-semibold">Single-piece fallback recommendation</div>
                  <div>
                    {fallbackRecommendation.piece.code} · {fallbackRecommendation.piece.width}×{fallbackRecommendation.piece.height} · waste {Math.round(fallbackRecommendation.waste).toLocaleString()} mm²
                  </div>
                  <Button className="mt-3" onClick={reserveSinglePiece} disabled={busy}>
                    <Lock className="mr-2 h-4 w-4" />
                    Reserve piece
                  </Button>
                </div>
              ) : (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                  No matching inventory for this order.
                </div>
              )}

              <div className="grid gap-2 md:grid-cols-3">
                <Button variant="outline" disabled={busy} onClick={() => onChange()}>
                  <PackageCheck className="mr-2 h-4 w-4" />
                  Refresh
                </Button>
                <Button variant="outline" disabled={busy} onClick={() => window.print()}>
                  <Printer className="mr-2 h-4 w-4" />
                  Print
                </Button>
                <Button variant="outline" disabled>
                  <Scissors className="mr-2 h-4 w-4" />
                  Cutting queue
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>
    </section>
  );
}
