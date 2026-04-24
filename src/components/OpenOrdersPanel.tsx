import { useMemo, useState } from "react";
import { supabase, type GlassPiece, type Order } from "@/lib/supabase";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Clock,
  Filter,
  Lock,
  MapPin,
  PackageCheck,
  Printer,
  ReceiptText,
  Scissors,
  Search,
  Sparkles,
  User,
  X,
} from "lucide-react";
import { toast } from "sonner";

type OrderWithRecommendation = Order & {
  recommendation?: Recommendation | null;
};

interface Recommendation {
  piece: GlassPiece;
  waste: number;
  rotated: boolean;
  sourcePriority: number;
}

interface Props {
  orders: Order[];
  pieces: GlassPiece[];
  onBack: () => void;
  onChange: () => void;
}

function statusClass(status: string) {
  switch (status) {
    case "open":
      return "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200";
    case "reserved":
      return "bg-blue-50 text-blue-700 ring-1 ring-blue-200";
    case "cutting":
      return "bg-purple-50 text-purple-700 ring-1 ring-purple-200";
    case "ready":
      return "bg-amber-50 text-amber-700 ring-1 ring-amber-200";
    case "completed":
      return "bg-slate-100 text-slate-600 ring-1 ring-slate-200";
    case "cancelled":
      return "bg-rose-50 text-rose-700 ring-1 ring-rose-200";
    default:
      return "bg-slate-100 text-slate-600 ring-1 ring-slate-200";
  }
}

function normalize(value: string | null | undefined) {
  return String(value ?? "").trim().toLowerCase();
}

function formatDate(value?: string) {
  if (!value) return "-";

  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

function receiptLabel(value?: string | null) {
  return value === "vat" ? "VAT receipt" : "Non-VAT receipt";
}

function receiptClass(value?: string | null) {
  if (value === "vat") {
    return "bg-blue-50 text-blue-700 ring-1 ring-blue-200";
  }

  return "bg-slate-100 text-slate-700 ring-1 ring-slate-200";
}

function getRecommendations(
  pieces: GlassPiece[],
  order: Order
): Recommendation[] {
  const orderWidth = Number(order.width);
  const orderHeight = Number(order.height);
  const orderThickness = Number(order.thickness);
  const orderArea = orderWidth * orderHeight;

  if (!orderWidth || !orderHeight || !orderThickness) return [];

  return pieces
    .filter((piece) => piece.status === "available")
    .filter((piece) => Number(piece.thickness) === orderThickness)
    .filter(
      (piece) => normalize(piece.glass_type) === normalize(order.glass_type)
    )
    .map((piece) => {
      const normalFit =
        Number(piece.width) >= orderWidth &&
        Number(piece.height) >= orderHeight;

      const rotatedFit =
        order.allow_rotation &&
        Number(piece.width) >= orderHeight &&
        Number(piece.height) >= orderWidth;

      if (!normalFit && !rotatedFit) return null;

      return {
        piece,
        waste: Number(piece.width) * Number(piece.height) - orderArea,
        rotated: !normalFit && rotatedFit,
        sourcePriority: piece.rack === "LEFTOVERS" ? 0 : 1,
      };
    })
    .filter(Boolean)
    .sort((a, b) => {
      if (!a || !b) return 0;
      if (a.sourcePriority !== b.sourcePriority) {
        return a.sourcePriority - b.sourcePriority;
      }
      if (a.waste !== b.waste) return a.waste - b.waste;
      return (a.piece.rack_order ?? 0) - (b.piece.rack_order ?? 0);
    }) as Recommendation[];
}

function getBestRecommendation(pieces: GlassPiece[], order: Order) {
  return getRecommendations(pieces, order)[0] ?? null;
}

function rackLabel(rack: string | null | undefined) {
  return rack === "LEFTOVERS" ? "Leftovers" : `Rack ${rack}`;
}

function MiniGlassPreview({ piece }: { piece: GlassPiece }) {
  return (
    <div className="relative flex h-28 items-center justify-center rounded-2xl border border-cyan-200 bg-gradient-to-br from-cyan-50 via-white to-blue-50 shadow-inner">
      <div className="absolute inset-4 rounded-lg border-2 border-cyan-200 bg-white/60" />
      <div className="absolute left-7 top-6 h-10 w-px rotate-45 bg-cyan-200" />
      <div className="absolute right-8 bottom-6 h-12 w-px rotate-45 bg-cyan-200" />
      <div className="relative z-10 rounded-full bg-white/80 px-3 py-1 text-sm font-semibold text-slate-700 shadow-sm">
        {piece.width} × {piece.height} mm
      </div>
    </div>
  );
}

function OrderTimeline({ status }: { status: string }) {
  const steps = [
    { key: "open", label: "Order created" },
    { key: "reserved", label: "Piece reserved" },
    { key: "cutting", label: "Cutting in progress" },
    { key: "ready", label: "Ready for pickup" },
    { key: "completed", label: "Completed" },
  ];

  const statusOrder = ["open", "reserved", "cutting", "ready", "completed"];
  const currentIndex = Math.max(0, statusOrder.indexOf(status));

  return (
    <div className="space-y-3">
      {steps.map((step, index) => {
        const active = index <= currentIndex;

        return (
          <div key={step.key} className="flex gap-3">
            <div className="flex flex-col items-center">
              <div
                className={`h-3 w-3 rounded-full ${
                  active ? "bg-blue-600" : "bg-slate-200"
                }`}
              />
              {index < steps.length - 1 && (
                <div className="mt-1 h-7 w-px bg-slate-200" />
              )}
            </div>

            <div className="-mt-1">
              <div
                className={`text-sm font-medium ${
                  active ? "text-slate-900" : "text-slate-400"
                }`}
              >
                {step.label}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function OpenOrdersPanel({ orders, pieces, onBack, onChange }: Props) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [glassFilter, setGlassFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(
    orders[0]?.id ?? null
  );
  const [busy, setBusy] = useState(false);

  const enrichedOrders = useMemo<OrderWithRecommendation[]>(() => {
    return orders.map((order) => ({
      ...order,
      recommendation: getBestRecommendation(pieces, order),
    }));
  }, [orders, pieces]);

  const filteredOrders = useMemo(() => {
    const q = query.trim().toLowerCase();

    return enrichedOrders.filter((order) => {
      const recommendation = order.recommendation;

      const matchesSearch =
        !q ||
        order.id.toLowerCase().includes(q) ||
        normalize(order.customer_name_snapshot).includes(q) ||
        normalize(order.customer_phone_snapshot).includes(q) ||
        normalize(order.glass_type).includes(q) ||
        normalize(order.receipt_type).includes(q);

      const matchesStatus =
        statusFilter === "all" || order.status === statusFilter;

      const matchesGlass =
        glassFilter === "all" ||
        normalize(order.glass_type) === normalize(glassFilter);

      const source =
        recommendation?.piece.rack === "LEFTOVERS"
          ? "leftovers"
          : recommendation?.piece.rack
          ? "racks"
          : "none";

      const matchesSource =
        sourceFilter === "all" || sourceFilter === source;

      return matchesSearch && matchesStatus && matchesGlass && matchesSource;
    });
  }, [enrichedOrders, query, statusFilter, glassFilter, sourceFilter]);

  const selectedOrder =
    filteredOrders.find((order) => order.id === selectedOrderId) ??
    filteredOrders[0] ??
    null;

  const recommendations = selectedOrder
    ? getRecommendations(pieces, selectedOrder)
    : [];

  const bestRecommendation = recommendations[0] ?? null;

  const stats = useMemo(() => {
    return {
      open: orders.filter((order) => order.status === "open").length,
      reserved: orders.filter((order) => order.status === "reserved").length,
      cutting: orders.filter((order) => order.status === "cutting").length,
      ready: orders.filter((order) => order.status === "ready").length,
    };
  }, [orders]);

  const reservePiece = async () => {
    if (!selectedOrder || !bestRecommendation) {
      toast.error("No recommended piece available");
      return;
    }

    setBusy(true);

    try {
      const { error: pieceError } = await supabase
        .from("glass_pieces")
        .update({
          status: "reserved",
          reserved_order_id: selectedOrder.id,
        })
        .eq("id", bestRecommendation.piece.id);

      if (pieceError) throw pieceError;

      const { error: orderError } = await supabase
        .from("orders")
        .update({
          selected_piece_id: bestRecommendation.piece.id,
          status: "reserved",
        })
        .eq("id", selectedOrder.id);

      if (orderError) throw orderError;

      await supabase.from("audit_logs").insert({
        action: "reserve_piece_from_open_orders",
        entity_type: "order",
        entity_id: selectedOrder.id,
        details: {
          piece_id: bestRecommendation.piece.id,
          piece_code: bestRecommendation.piece.code,
          rack: bestRecommendation.piece.rack,
          waste: bestRecommendation.waste,
          rotated: bestRecommendation.rotated,
          receipt_type: selectedOrder.receipt_type ?? "non_vat",
        },
      });

      toast.success(`Reserved ${bestRecommendation.piece.code}`);
      onChange();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to reserve piece";
      toast.error(message);
    } finally {
      setBusy(false);
    }
  };

  const updateOrderStatus = async (status: string) => {
    if (!selectedOrder) return;

    setBusy(true);

    try {
      const { error } = await supabase
        .from("orders")
        .update({ status })
        .eq("id", selectedOrder.id);

      if (error) throw error;

      await supabase.from("audit_logs").insert({
        action: `order_${status}`,
        entity_type: "order",
        entity_id: selectedOrder.id,
        details: {
          order_id: selectedOrder.id,
          status,
          receipt_type: selectedOrder.receipt_type ?? "non_vat",
        },
      });

      toast.success(`Order marked ${status}`);
      onChange();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to update order";
      toast.error(message);
    } finally {
      setBusy(false);
    }
  };

  const customerHistory = selectedOrder
    ? orders
        .filter(
          (order) =>
            order.id !== selectedOrder.id &&
            normalize(order.customer_phone_snapshot) ===
              normalize(selectedOrder.customer_phone_snapshot)
        )
        .slice(0, 3)
    : [];

  return (
    <section className="space-y-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
        <div>
          <Button
            variant="ghost"
            onClick={onBack}
            className="mb-3 -ml-3 text-muted-foreground"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to dashboard
          </Button>

          <h2 className="text-3xl font-bold tracking-tight text-foreground">
            Open Orders
          </h2>
          <p className="text-muted-foreground">
            Track active customer jobs, assigned glass, and cut progress
          </p>
        </div>

        <Button onClick={onBack}>
          <ClipboardList className="mr-2 h-4 w-4" />
          New Order
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <MiniStat
          label="Open orders"
          value={stats.open}
          sublabel="Needs inventory match"
          icon={ClipboardList}
          tone="amber"
        />
        <MiniStat
          label="Reserved pieces"
          value={stats.reserved}
          sublabel="Holding inventory"
          icon={Lock}
          tone="blue"
        />
        <MiniStat
          label="Awaiting cut"
          value={stats.cutting}
          sublabel="Ready to process"
          icon={Scissors}
          tone="purple"
        />
        <MiniStat
          label="Ready for pickup"
          value={stats.ready}
          sublabel="Completed cutting"
          icon={PackageCheck}
          tone="green"
        />
      </div>

      <Card className="rounded-2xl border border-border bg-card p-4 shadow-card">
        <div className="grid gap-3 md:grid-cols-[1.4fr_180px_180px_180px_auto]">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search orders, customers, phone..."
              className="h-11 pl-9"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="h-11 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="all">Status: All</option>
            <option value="open">Open</option>
            <option value="reserved">Reserved</option>
            <option value="cutting">Cutting</option>
            <option value="ready">Ready</option>
            <option value="completed">Completed</option>
          </select>

          <select
            value={glassFilter}
            onChange={(event) => setGlassFilter(event.target.value)}
            className="h-11 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="all">Glass type: All</option>
            <option value="Clear">Clear</option>
            <option value="Tinted">Tinted</option>
            <option value="Mirror">Mirror</option>
            <option value="Tempered">Tempered</option>
            <option value="Laminated">Laminated</option>
          </select>

          <select
            value={sourceFilter}
            onChange={(event) => setSourceFilter(event.target.value)}
            className="h-11 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="all">Source: All</option>
            <option value="leftovers">Leftovers</option>
            <option value="racks">Regular racks</option>
            <option value="none">No match</option>
          </select>

          <Button variant="outline" className="h-11">
            <Filter className="mr-2 h-4 w-4" />
            More filters
          </Button>
        </div>
      </Card>

      <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <Card className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
          <div className="border-b bg-slate-50 px-4 py-3">
            <div className="grid grid-cols-[120px_1fr_120px_140px_70px_100px_100px_120px_100px] gap-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">
              <div>Order ID</div>
              <div>Customer</div>
              <div>Phone</div>
              <div>Requested size</div>
              <div>THK</div>
              <div>Glass</div>
              <div>Receipt</div>
              <div>Source</div>
              <div>Status</div>
            </div>
          </div>

          <div className="divide-y divide-border">
            {filteredOrders.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                No orders match your filters.
              </div>
            ) : (
              filteredOrders.map((order) => {
                const recommendation = order.recommendation;
                const selected = selectedOrder?.id === order.id;

                return (
                  <button
                    key={order.id}
                    onClick={() => setSelectedOrderId(order.id)}
                    className={`grid w-full grid-cols-[120px_1fr_120px_140px_70px_100px_100px_120px_100px] gap-3 px-4 py-4 text-left text-sm transition hover:bg-blue-50/60 ${
                      selected
                        ? "bg-blue-50 ring-1 ring-inset ring-blue-200"
                        : "bg-white"
                    }`}
                  >
                    <div className="font-bold text-blue-700">
                      {order.id.slice(0, 8)}
                    </div>

                    <div className="font-medium text-slate-900">
                      {order.customer_name_snapshot || "Walk-in customer"}
                    </div>

                    <div className="text-muted-foreground">
                      {order.customer_phone_snapshot || "-"}
                    </div>

                    <div className="font-medium">
                      {order.width} × {order.height}
                    </div>

                    <div>{order.thickness}</div>

                    <div>{order.glass_type}</div>

                    <div>
                      <span
                        className={`rounded-full px-2 py-1 text-xs font-semibold ${receiptClass(
                          order.receipt_type
                        )}`}
                      >
                        {order.receipt_type === "vat" ? "VAT" : "Non-VAT"}
                      </span>
                    </div>

                    <div className="text-muted-foreground">
                      {recommendation
                        ? rackLabel(recommendation.piece.rack)
                        : "No match"}
                    </div>

                    <div>
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${statusClass(
                          order.status
                        )}`}
                      >
                        {order.status}
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>

          <div className="flex items-center justify-between border-t bg-slate-50 px-4 py-3 text-sm text-muted-foreground">
            <div>
              Showing {filteredOrders.length} of {orders.length} orders
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" disabled>
                1
              </Button>
            </div>
          </div>
        </Card>

        <Card className="rounded-2xl border border-border bg-card shadow-card">
          {!selectedOrder ? (
            <div className="p-8 text-center text-muted-foreground">
              Select an order to view details.
            </div>
          ) : (
            <div className="divide-y divide-border">
              <div className="flex items-start justify-between gap-4 p-5">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-xl font-bold text-foreground">
                      Order {selectedOrder.id.slice(0, 8)}
                    </h3>
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${statusClass(
                        selectedOrder.status
                      )}`}
                    >
                      {selectedOrder.status}
                    </span>
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${receiptClass(
                        selectedOrder.receipt_type
                      )}`}
                    >
                      {receiptLabel(selectedOrder.receipt_type)}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                    <CalendarDays className="h-3.5 w-3.5" />
                    Created {formatDate(selectedOrder.created_at)}
                  </div>
                </div>

                <Button variant="ghost" size="icon" onClick={onBack}>
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="grid gap-5 p-5 md:grid-cols-[1fr_1fr_180px]">
                <div>
                  <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground">
                    <User className="h-4 w-4" />
                    Customer
                  </div>
                  <div className="font-semibold">
                    {selectedOrder.customer_name_snapshot || "Walk-in customer"}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {selectedOrder.customer_phone_snapshot || "-"}
                  </div>
                </div>

                <div>
                  <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground">
                    <ClipboardList className="h-4 w-4" />
                    Requested glass
                  </div>
                  <dl className="grid grid-cols-2 gap-y-1 text-sm">
                    <dt className="text-muted-foreground">Size</dt>
                    <dd className="font-medium">
                      {selectedOrder.width} × {selectedOrder.height}
                    </dd>

                    <dt className="text-muted-foreground">Thickness</dt>
                    <dd className="font-medium">
                      {selectedOrder.thickness} mm
                    </dd>

                    <dt className="text-muted-foreground">Glass type</dt>
                    <dd className="font-medium">{selectedOrder.glass_type}</dd>

                    <dt className="text-muted-foreground">Rotation</dt>
                    <dd className="font-medium">
                      {selectedOrder.allow_rotation ? "Yes" : "No"}
                    </dd>

                    <dt className="text-muted-foreground">Receipt</dt>
                    <dd className="font-medium">
                      {receiptLabel(selectedOrder.receipt_type)}
                    </dd>
                  </dl>
                </div>

                <div>
                  <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground">
                    <Clock className="h-4 w-4" />
                    Timeline
                  </div>
                  <OrderTimeline status={selectedOrder.status} />
                </div>
              </div>

              <div className="px-5 pb-5">
                <div className="rounded-xl border bg-slate-50 p-3 text-sm text-slate-600">
                  <div className="mb-1 flex items-center gap-2 font-semibold text-slate-900">
                    <ReceiptText className="h-4 w-4 text-blue-600" />
                    Flow Account trigger
                  </div>
                  {selectedOrder.receipt_type === "vat"
                    ? "Later this order should trigger the VAT receipt / tax invoice workflow in Flow Account."
                    : "Later this order should trigger the normal non-VAT receipt workflow in Flow Account."}
                </div>
              </div>

              {selectedOrder.notes && (
                <div className="px-5 pb-5">
                  <div className="rounded-xl border bg-slate-50 p-3 text-sm text-slate-600">
                    <div className="mb-1 font-semibold text-slate-900">
                      Notes
                    </div>
                    {selectedOrder.notes}
                  </div>
                </div>
              )}

              <div className="p-5">
                {bestRecommendation ? (
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4">
                    <div className="mb-4 flex flex-wrap items-center gap-2">
                      <Sparkles className="h-5 w-5 text-emerald-700" />
                      <h4 className="font-bold text-emerald-950">
                        Best Match Recommendation
                      </h4>
                      <Badge className="rounded-full bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
                        {bestRecommendation.piece.rack === "LEFTOVERS"
                          ? "Best leftover match"
                          : "Best rack match"}
                      </Badge>
                    </div>

                    <div className="grid gap-4 md:grid-cols-[180px_1fr_170px]">
                      <MiniGlassPreview piece={bestRecommendation.piece} />

                      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                        <dt className="text-muted-foreground">Piece code</dt>
                        <dd className="font-semibold">
                          {bestRecommendation.piece.code}
                        </dd>

                        <dt className="text-muted-foreground">Rack</dt>
                        <dd className="font-semibold">
                          {rackLabel(bestRecommendation.piece.rack)}
                        </dd>

                        <dt className="text-muted-foreground">Piece size</dt>
                        <dd className="font-semibold">
                          {bestRecommendation.piece.width} ×{" "}
                          {bestRecommendation.piece.height}
                        </dd>

                        <dt className="text-muted-foreground">Thickness</dt>
                        <dd className="font-semibold">
                          {bestRecommendation.piece.thickness} mm
                        </dd>

                        <dt className="text-muted-foreground">Waste</dt>
                        <dd className="font-semibold">
                          {Math.round(
                            bestRecommendation.waste
                          ).toLocaleString()}{" "}
                          mm²
                        </dd>

                        <dt className="text-muted-foreground">Fit</dt>
                        <dd className="font-semibold">
                          {bestRecommendation.rotated ? "Rotated" : "Normal"}
                        </dd>
                      </dl>

                      <div className="space-y-2">
                        <Button
                          className="w-full"
                          onClick={reservePiece}
                          disabled={busy}
                        >
                          <Lock className="mr-2 h-4 w-4" />
                          Reserve Piece
                        </Button>

                        <Button
                          variant="outline"
                          className="w-full"
                          onClick={() =>
                            toast.info(
                              `${bestRecommendation.piece.code} is in ${rackLabel(
                                bestRecommendation.piece.rack
                              )}`
                            )
                          }
                        >
                          <MapPin className="mr-2 h-4 w-4" />
                          View Rack Location
                        </Button>

                        <Button
                          variant="outline"
                          className="w-full"
                          onClick={() =>
                            toast.info(
                              `${recommendations.length} matching pieces found`
                            )
                          }
                        >
                          See Other Matches (
                          {Math.max(0, recommendations.length - 1)})
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-800">
                    No available inventory currently matches this order.
                  </div>
                )}
              </div>

              <div className="p-5">
                <div className="mb-3 text-sm font-semibold text-foreground">
                  Quick Actions
                </div>

                <div className="grid gap-3 md:grid-cols-4">
                  <Button
                    variant="outline"
                    onClick={reservePiece}
                    disabled={busy || !bestRecommendation}
                  >
                    <Lock className="mr-2 h-4 w-4" />
                    Reserve
                  </Button>

                  <Button
                    variant="outline"
                    onClick={() => updateOrderStatus("cutting")}
                    disabled={busy}
                  >
                    <Scissors className="mr-2 h-4 w-4" />
                    Mark Cutting
                  </Button>

                  <Button
                    variant="outline"
                    onClick={() => updateOrderStatus("completed")}
                    disabled={busy}
                  >
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Complete
                  </Button>

                  <Button
                    variant="outline"
                    onClick={() => window.print()}
                    disabled={busy}
                  >
                    <Printer className="mr-2 h-4 w-4" />
                    Print
                  </Button>
                </div>
              </div>

              <div className="p-5">
                <div className="mb-3 text-sm font-semibold text-foreground">
                  Customer History
                </div>

                {customerHistory.length === 0 ? (
                  <div className="rounded-xl border border-dashed bg-slate-50 p-4 text-sm text-muted-foreground">
                    No previous orders found for this customer.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {customerHistory.map((order) => (
                      <div
                        key={order.id}
                        className="grid grid-cols-[90px_1fr_90px] gap-3 rounded-xl border bg-white p-3 text-sm"
                      >
                        <div className="font-semibold text-blue-700">
                          {order.id.slice(0, 8)}
                        </div>
                        <div className="text-muted-foreground">
                          {order.width} × {order.height} × {order.thickness} mm ·{" "}
                          {order.glass_type} · {receiptLabel(order.receipt_type)}
                        </div>
                        <div>
                          <span
                            className={`rounded-full px-2 py-1 text-xs font-semibold capitalize ${statusClass(
                              order.status
                            )}`}
                          >
                            {order.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </Card>
      </div>
    </section>
  );
}

function MiniStat({
  label,
  value,
  sublabel,
  icon: Icon,
  tone,
}: {
  label: string;
  value: number;
  sublabel: string;
  icon: typeof ClipboardList;
  tone: "amber" | "blue" | "purple" | "green";
}) {
  const toneClass = {
    amber: "bg-amber-50 text-amber-700",
    blue: "bg-blue-50 text-blue-700",
    purple: "bg-purple-50 text-purple-700",
    green: "bg-emerald-50 text-emerald-700",
  }[tone];

  return (
    <Card className="rounded-2xl border border-border bg-card p-5 shadow-card">
      <div className="flex items-center gap-4">
        <div
          className={`flex h-12 w-12 items-center justify-center rounded-2xl ${toneClass}`}
        >
          <Icon className="h-6 w-6" />
        </div>

        <div>
          <div className="text-3xl font-bold text-foreground">{value}</div>
          <div className="font-medium text-foreground">{label}</div>
          <div className="text-xs text-muted-foreground">{sublabel}</div>
        </div>
      </div>
    </Card>
  );
}
