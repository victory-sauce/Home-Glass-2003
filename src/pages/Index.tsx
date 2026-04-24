import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase, isSupabaseConfigured, type GlassPiece, type RackName } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { KpiCard } from "@/components/KpiCard";
import { NewOrderPanel } from "@/components/NewOrderPanel";
import { RackCard } from "@/components/RackCard";
import {
  GlassWater,
  LogOut,
  PackageCheck,
  Lock,
  Scissors,
  ClipboardList,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";

const RACKS: RackName[] = ["A", "B", "C", "LEFTOVERS"];

export default function Index() {
  const { user, signOut } = useAuth();
  const nav = useNavigate();
  const [pieces, setPieces] = useState<GlassPiece[]>([]);
  const [openOrders, setOpenOrders] = useState(0);
  const [loading, setLoading] = useState(true);
  const [inventoryError, setInventoryError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<string>("");

  const load = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const [pi, ord] = await Promise.all([
      supabase.from("glass_pieces").select("*").order("rack_order", { ascending: true }),
      supabase.from("orders").select("id", { count: "exact", head: true }).eq("status", "open"),
    ]);
    if (pi.error) toast.error(pi.error.message);
    setPieces((pi.data as GlassPiece[]) ?? []);
    setOpenOrders(ord.count ?? 0);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const byRack = useMemo(() => {
    const map: Record<string, GlassPiece[]> = { A: [], B: [], C: [], LEFTOVERS: [] };
    for (const p of pieces) {
      const r = (p.rack ?? "").toString().toUpperCase();
      if (map[r]) map[r].push(p);
    }
    for (const k of Object.keys(map)) {
      map[k].sort((a, b) => (a.rack_order ?? 0) - (b.rack_order ?? 0));
    }
    return map;
  }, [pieces]);

  const kpis = useMemo(() => {
    const available = pieces.filter((p) => p.status === "available").length;
    const reserved = pieces.filter((p) => p.status === "reserved").length;
    const leftovers = pieces.filter(
      (p) => (p.rack ?? "").toString().toUpperCase() === "LEFTOVERS"
    ).length;
    return { available, reserved, leftovers };
  }, [pieces]);

  const handleSignOut = async () => {
    await signOut();
    nav("/login");
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-header text-header-foreground shadow-elevated">
        <div className="container py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="size-11 rounded-xl bg-gradient-accent flex items-center justify-center">
              <GlassWater className="size-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">Glass Shop Dashboard</h1>
              <p className="text-xs text-header-foreground/60">Orders & inventory</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-header-foreground/70 hidden sm:block">{user?.email}</span>
            <Button variant="secondary" onClick={handleSignOut} className="h-10">
              <LogOut className="size-4 mr-2" /> Sign out
            </Button>
          </div>
        </div>
      </header>

      <main className="container py-6 space-y-6">
        {!isSupabaseConfigured && (
          <div className="rounded-xl border border-warning/40 bg-warning/10 p-4 flex items-start gap-3">
            <AlertTriangle className="size-5 text-warning shrink-0 mt-0.5" />
            <div className="text-sm">
              <strong>Supabase not configured.</strong> Open <code className="px-1.5 py-0.5 rounded bg-muted">src/lib/supabase.ts</code> and paste your project URL and anon key.
            </div>
          </div>
        )}

        {/* KPIs */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard label="Available pieces" value={kpis.available} icon={PackageCheck} tone="success" />
          <KpiCard label="Reserved" value={kpis.reserved} icon={Lock} tone="warning" />
          <KpiCard label="Leftovers" value={kpis.leftovers} icon={Scissors} tone="primary" />
          <KpiCard label="Open orders" value={openOrders} icon={ClipboardList} tone="secondary" />
        </div>

        {/* Top: New order */}
        <NewOrderPanel pieces={pieces} onChange={load} />

        {/* Bottom: Inventory */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold text-foreground">Glass inventory</h2>
              <p className="text-sm text-muted-foreground">Visual rack overview</p>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {RACKS.map((r) => (
              <RackCard key={r} rack={r} pieces={byRack[r] ?? []} onChange={load} />
            ))}
          </div>
          {loading && (
            <div className="text-center text-sm text-muted-foreground py-6">Loading…</div>
          )}
        </section>
      </main>
    </div>
  );
}
