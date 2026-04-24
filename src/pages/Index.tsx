import { useCallback, useEffect, useMemo, useState } from "react";
import {
  supabase,
  isSupabaseConfigured,
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  type GlassPiece,
  type RackName,
} from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { KpiCard } from "@/components/KpiCard";
import { NewOrderPanel } from "@/components/NewOrderPanel";
import { RackCard } from "@/components/RackCard";
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
  const [pieces, setPieces] = useState<GlassPiece[]>([]);
  const [openOrders, setOpenOrders] = useState(0);
  const [loading, setLoading] = useState(true);

  const [inventoryError, setInventoryError] = useState<string | null>(null);
  const [ordersError, setOrdersError] = useState<string | null>(null);
  const [rawFetchResult, setRawFetchResult] = useState<string>("");
  const [lastLoadedAt, setLastLoadedAt] = useState<string>("");

  const load = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      setInventoryError(
        "Supabase is not configured. Check src/lib/supabase.ts."
      );
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

      console.log("glass_pieces data:", data);
      console.log("glass_pieces error:", error);

      if (error) {
        setInventoryError(error.message);
        setPieces([]);
        toast.error(`Inventory error: ${error.message}`);
      } else {
        setPieces((data as GlassPiece[]) ?? []);
        setLastLoadedAt(new Date().toLocaleTimeString());
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
      const { count, error } = await supabase
        .from("orders")
        .select("id", { count: "exact", head: true })
        .eq("status", "open");

      console.log("orders count:", count);
      console.log("orders error:", error);

      if (error) {
        setOrdersError(error.message);
      } else {
        setOpenOrders(count ?? 0);
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown orders fetch error";
      setOrdersError(message);
      console.error("Orders count exception:", error);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const testRawRestFetch = async () => {
    setRawFetchResult("Testing raw REST request...");

    try {
      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/glass_pieces?select=code,width,height,thickness,glass_type,rack,rack_order,status&limit=3`,
        {
          headers: {
            apikey: SUPABASE_ANON_KEY,
            Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          },
        }
      );

      const body = await response.text();

      setRawFetchResult(
        [
          `Status: ${response.status} ${response.statusText}`,
          "",
          body,
        ].join("\n")
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown raw fetch error";
      setRawFetchResult(`ERROR: ${message}`);
      console.error("Raw REST fetch error:", error);
    }
  };

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
      map[rack].sort(
        (a, b) => (a.rack_order ?? 0) - (b.rack_order ?? 0)
      );
    }

    return map;
  }, [pieces]);

  const kpis = useMemo(() => {
    const available = pieces.filter((piece) => piece.status === "available")
      .length;

    const reserved = pieces.filter((piece) => piece.status === "reserved")
      .length;

    const leftovers = pieces.filter(
      (piece) =>
        (piece.rack ?? "").toString().toUpperCase() === "LEFTOVERS" &&
        piece.status === "available"
    ).length;

    const broken = pieces.filter((piece) => piece.status === "broken").length;

    return {
      available,
      reserved,
      leftovers,
      broken,
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
                  Glass Shop Dashboard
                </h1>
                <p className="text-muted-foreground">
                  Orders & inventory management
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="rounded-full border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-800">
                Test mode: authentication disabled
              </div>

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
                  URL and anon/publishable key.
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
                <div className="font-semibold">Orders count error</div>
                <div className="text-sm">{ordersError}</div>
              </div>
            </div>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
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

          <KpiCard
            label="Open orders"
            value={openOrders}
            icon={ClipboardList}
            tone="warning"
          />
        </section>

        <section className="rounded-2xl border border-border bg-card p-4 shadow-card">
          <div className="mb-3 flex flex-col justify-between gap-3 md:flex-row md:items-center">
            <div>
              <h2 className="text-lg font-semibold text-foreground">
                Inventory debug
              </h2>
              <p className="text-sm text-muted-foreground">
                Use this while testing Supabase connection and inventory loading.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={load} disabled={loading}>
                Reload Supabase data
              </Button>

              <Button variant="outline" onClick={testRawRestFetch}>
                Test raw REST fetch
              </Button>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-xl bg-muted p-3 text-sm">
              <div className="font-semibold">Loaded pieces</div>
              <div className="mt-1 text-2xl font-bold">{pieces.length}</div>
              <div className="mt-1 text-xs text-muted-foreground">
                Last loaded: {lastLoadedAt || "not loaded yet"}
              </div>
            </div>

            <div className="rounded-xl bg-muted p-3 text-sm">
              <div className="font-semibold">Supabase URL</div>
              <div className="mt-1 break-all font-mono text-xs">
                {SUPABASE_URL}
              </div>
            </div>

            <div className="rounded-xl bg-muted p-3 text-sm">
              <div className="font-semibold">Key detected</div>
              <div className="mt-1 font-mono text-xs">
                {SUPABASE_ANON_KEY
                  ? `${SUPABASE_ANON_KEY.slice(0, 24)}...`
                  : "No key"}
              </div>
            </div>
          </div>

          {pieces[0] && (
            <div className="mt-3">
              <div className="mb-1 text-sm font-semibold">
                First loaded piece
              </div>
              <pre className="max-h-56 overflow-auto rounded-xl bg-slate-950 p-4 text-xs text-slate-100">
                {JSON.stringify(pieces[0], null, 2)}
              </pre>
            </div>
          )}

          {rawFetchResult && (
            <div className="mt-3">
              <div className="mb-1 text-sm font-semibold">
                Raw REST fetch result
              </div>
              <pre className="max-h-56 overflow-auto whitespace-pre-wrap rounded-xl bg-slate-950 p-4 text-xs text-slate-100">
                {rawFetchResult}
              </pre>
            </div>
          )}
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
      </main>
    </div>
  );
}
