import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  supabase,
  isSupabaseConfigured,
  type GlassPiece,
  type Order,
  type RackName,
} from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { KpiCard } from "@/components/KpiCard";
import { NewOrderPanel } from "@/components/NewOrderPanel";
import { RackCard } from "@/components/RackCard";
import { OpenOrdersPanel } from "@/components/OpenOrdersPanel";
import {
  AlertTriangle,
  ClipboardList,
  GlassWater,
  PackageCheck,
  Scissors,
} from "lucide-react";
import { toast } from "sonner";

const RACKS: RackName[] = ["A", "B", "C", "LEFTOVERS"];

export default function Index() {
  const navigate = useNavigate();
  const [pieces, setPieces] = useState<GlassPiece[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [openOrders, setOpenOrders] = useState(0);
  const [loading, setLoading] = useState(true);
  const [inventoryError, setInventoryError] = useState<string | null>(null);
  const [ordersError, setOrdersError] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<"dashboard" | "openOrders">(
    "dashboard"
  );

  const load = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      setInventoryError("Supabase is not configured. Check src/lib/supabase.ts.");
      return;
    }

    setLoading(true);
    setInventoryError(null);
    setOrdersError(null);

    try {
      const { data, error } = await supabase
        .from("glass_pieces")
        .select("*")
        .order("rack", { ascending: true })
        .order("rack_order", { ascending: true });

      if (error) {
        setInventoryError(error.message);
        setPieces([]);
        toast.error(`Inventory error: ${error.message}`);
      } else {
        setPieces((data as GlassPiece[]) ?? []);
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown inventory fetch error";

      setInventoryError(message);
      setPieces([]);
      toast.error(`Inventory error: ${message}`);
      console.error("Inventory fetch exception:", error);
    }

    try {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        setOrdersError(error.message);
        setOrders([]);
      } else {
        const orderRows = (data as Order[]) ?? [];
        setOrders(orderRows);
        setOpenOrders(
          orderRows.filter(
            (order) =>
              order.status !== "completed" && order.status !== "cancelled"
          ).length
        );
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown orders fetch error";

      setOrdersError(message);
      setOrders([]);
      console.error("Orders fetch exception:", error);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const byRack = useMemo(() => {
    const map: Record<RackName, GlassPiece[]> = {
      A: [],
      B: [],
      C: [],
      LEFTOVERS: [],
    };

    for (const piece of pieces) {
      const rack = (piece.rack ?? "").toString().toUpperCase() as RackName;

      if (map[rack]) {
        map[rack].push(piece);
      }
    }

    for (const rack of Object.keys(map) as RackName[]) {
      map[rack].sort((a, b) => (a.rack_order ?? 0) - (b.rack_order ?? 0));
    }

    return map;
  }, [pieces]);

  const kpis = useMemo(() => {
    const available = pieces.filter(
      (piece) => piece.status === "available"
    ).length;

    const reserved = pieces.filter(
      (piece) => piece.status === "reserved"
    ).length;

    const leftovers = pieces.filter(
      (piece) =>
        (piece.rack ?? "").toString().toUpperCase() === "LEFTOVERS" &&
        piece.status === "available"
    ).length;

    return {
      available,
      reserved,
      leftovers,
    };
  }, [pieces]);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-primary shadow-glow">
                <GlassWater className="h-8 w-8 text-primary-foreground" />
              </div>

              <div>
                <h1 className="text-3xl font-bold tracking-tight text-foreground">
                  Home Glass 2003
                </h1>
                <p className="text-muted-foreground">
                  Glass order & inventory system
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                onClick={() => navigate("/quotations")}
              >
                Quotations
              </Button>

              {activeView === "openOrders" && (
                <Button
                  variant="outline"
                  onClick={() => setActiveView("dashboard")}
                >
                  Dashboard
                </Button>
              )}

              <Button variant="outline" onClick={load} disabled={loading}>
                {loading ? "Refreshing..." : "Refresh inventory"}
              </Button>
            </div>
          </div>

          {!isSupabaseConfigured && (
            <div className="flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-destructive">
              <AlertTriangle className="mt-0.5 h-5 w-5" />
              <div>
                <div className="font-semibold">Supabase not configured</div>
                <div className="text-sm">
                  Open <code>src/lib/supabase.ts</code> and paste your project
                  URL and anon public key.
                </div>
              </div>
            </div>
          )}

          {inventoryError && (
            <div className="flex items-start gap-3 rounded-xl border border-red-300 bg-red-50 p-4 text-red-800">
              <AlertTriangle className="mt-0.5 h-5 w-5" />
              <div>
                <div className="font-semibold">Inventory fetch error</div>
                <div className="text-sm">{inventoryError}</div>
              </div>
            </div>
          )}

          {ordersError && (
            <div className="flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-amber-800">
              <AlertTriangle className="mt-0.5 h-5 w-5" />
              <div>
                <div className="font-semibold">Orders fetch error</div>
                <div className="text-sm">{ordersError}</div>
              </div>
            </div>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        {activeView === "openOrders" ? (
          <OpenOrdersPanel
            orders={orders}
            pieces={pieces}
            onBack={() => setActiveView("dashboard")}
            onChange={load}
          />
        ) : (
          <>
            <section className="grid gap-4 md:grid-cols-4">
              <KpiCard
                label="Available pieces"
                value={kpis.available}
                icon={PackageCheck}
                tone="success"
              />

              <KpiCard
                label="Reserved pieces"
                value={kpis.reserved}
                icon={ClipboardList}
                tone="primary"
              />

              <KpiCard
                label="Leftovers"
                value={kpis.leftovers}
                icon={Scissors}
                tone="secondary"
              />

              <button
                type="button"
                onClick={() => setActiveView("openOrders")}
                className="text-left transition hover:-translate-y-0.5 hover:shadow-lg"
              >
                <KpiCard
                  label="Open orders"
                  value={openOrders}
                  icon={ClipboardList}
                  tone="warning"
                />
              </button>
            </section>

            <section>
              <NewOrderPanel pieces={pieces} onChange={load} />
            </section>

            <section className="space-y-4">
              <div className="flex flex-col justify-between gap-2 md:flex-row md:items-end">
                <div>
                  <h2 className="text-2xl font-bold tracking-tight text-foreground">
                    Glass inventory
                  </h2>
                  <p className="text-muted-foreground">
                    Visual rack overview
                  </p>
                </div>

                {loading && (
                  <div className="rounded-full bg-muted px-4 py-2 text-sm text-muted-foreground">
                    Loading…
                  </div>
                )}
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                {RACKS.map((rack) => (
                  <RackCard
                    key={rack}
                    rack={rack}
                    pieces={byRack[rack]}
                    onChange={load}
                  />
                ))}
              </div>

              {!loading && pieces.length === 0 && !inventoryError && (
                <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center text-muted-foreground">
                  No inventory rows were returned from Supabase.
                </div>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
}
