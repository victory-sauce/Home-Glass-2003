import { useState } from "react";
import { supabase, type GlassPiece, type RackName } from "@/lib/supabase";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "./StatusBadge";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ArrowDown,
  ArrowUp,
  Layers,
  MoreVertical,
  Scissors,
  Wrench,
  RotateCcw,
  Trash2,
  Move,
} from "lucide-react";
import { toast } from "sonner";

const RACKS: RackName[] = ["A", "B", "C", "LEFTOVERS"];

interface Props {
  rack: RackName;
  pieces: GlassPiece[];
  onChange: () => void;
}

export function RackCard({ rack, pieces, onChange }: Props) {
  const isLeftovers = rack === "LEFTOVERS";

  return (
    <Card className="shadow-card overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 bg-header text-header-foreground">
        <div className="flex items-center gap-3">
          <div className="size-9 rounded-lg bg-primary/20 flex items-center justify-center">
            {isLeftovers ? <Scissors className="size-4" /> : <Layers className="size-4" />}
          </div>
          <div>
            <h3 className="font-bold tracking-wide">Rack {rack}</h3>
            <p className="text-xs text-header-foreground/60">{pieces.length} pieces</p>
          </div>
        </div>
      </div>
      <div className="p-3 space-y-2 max-h-[420px] overflow-auto bg-muted/30">
        {pieces.length === 0 && (
          <div className="text-center text-sm text-muted-foreground py-8">No pieces in this rack</div>
        )}
        {pieces.map((p, i) => (
          <PieceRow
            key={p.id}
            piece={p}
            index={i}
            total={pieces.length}
            onChange={onChange}
          />
        ))}
      </div>
    </Card>
  );
}

function PieceRow({
  piece,
  index,
  total,
  onChange,
}: {
  piece: GlassPiece;
  index: number;
  total: number;
  onChange: () => void;
}) {
  const [leftoverOpen, setLeftoverOpen] = useState(false);

  const audit = (action: string, details: Record<string, unknown> = {}) =>
    supabase.from("audit_logs").insert({
      action,
      entity_type: "glass_piece",
      entity_id: piece.id,
      details: { piece_code: piece.code, ...details },
    });

  const updateStatus = async (status: string) => {
    const { error } = await supabase.from("glass_pieces").update({ status }).eq("id", piece.id);
    if (error) return toast.error(error.message);
    await audit(`mark_${status}`);
    toast.success(`Marked ${status}`);
    onChange();
  };

  const moveRack = async (rack: RackName) => {
    const { error } = await supabase
      .from("glass_pieces")
      .update({ rack, rack_order: 9999 })
      .eq("id", piece.id);
    if (error) return toast.error(error.message);
    await audit("move_rack", { to: rack });
    toast.success(`Moved to ${rack}`);
    onChange();
  };

  const swapOrder = async (delta: -1 | 1) => {
    const newOrder = (piece.rack_order ?? index) + delta;
    const { error } = await supabase
      .from("glass_pieces")
      .update({ rack_order: newOrder })
      .eq("id", piece.id);
    if (error) return toast.error(error.message);
    await audit("reorder", { rack_order: newOrder });
    onChange();
  };

  return (
    <div className="rounded-lg bg-card border border-border p-3 shadow-sm hover:shadow-card transition-shadow">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-foreground">{piece.code}</span>
            <StatusBadge status={piece.status} />
          </div>
          <div className="text-sm text-muted-foreground mt-1">
            {piece.width}×{piece.height}mm · {piece.thickness}mm · {piece.glass_type}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button
            size="icon"
            variant="ghost"
            className="size-8"
            disabled={index === 0}
            onClick={() => swapOrder(-1)}
          >
            <ArrowUp className="size-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="size-8"
            disabled={index === total - 1}
            onClick={() => swapOrder(1)}
          >
            <ArrowDown className="size-4" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="icon" variant="ghost" className="size-8">
                <MoreVertical className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52 bg-popover">
              <DropdownMenuLabel>
                <Move className="size-3 inline mr-1" /> Move to rack
              </DropdownMenuLabel>
              {RACKS.filter((r) => r !== piece.rack).map((r) => (
                <DropdownMenuItem key={r} onClick={() => moveRack(r)}>
                  Rack {r}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setLeftoverOpen(true)}>
                <Scissors className="size-4 mr-2" /> Create leftover
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => updateStatus("used")}>
                <Wrench className="size-4 mr-2" /> Mark used
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => updateStatus("broken")}>
                <Trash2 className="size-4 mr-2" /> Mark broken
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => updateStatus("available")}>
                <RotateCcw className="size-4 mr-2" /> Restore
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <CreateLeftoverDialog
        open={leftoverOpen}
        onOpenChange={setLeftoverOpen}
        source={piece}
        onCreated={onChange}
      />
    </div>
  );
}

function CreateLeftoverDialog({
  open,
  onOpenChange,
  source,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  source: GlassPiece;
  onCreated: () => void;
}) {
  const [code, setCode] = useState("");
  const [width, setWidth] = useState("");
  const [height, setHeight] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    const w = parseFloat(width);
    const h = parseFloat(height);
    if (!code || !w || !h) {
      toast.error("Code, width and height are required");
      return;
    }
    setBusy(true);
    try {
      const { data, error } = await supabase
        .from("glass_pieces")
        .insert({
          code,
          width: w,
          height: h,
          thickness: source.thickness,
          glass_type: source.glass_type,
          rack: "LEFTOVERS",
          rack_order: 9999,
          status: "available",
          parent_piece_id: source.id,
        })
        .select("id")
        .single();
      if (error) throw error;

      await supabase.from("audit_logs").insert({
        action: "create_leftover",
        entity_type: "glass_piece",
        entity_id: data.id,
        details: { source_piece_id: source.id, source_code: source.code, code, width: w, height: h },
      });

      toast.success("Leftover created");
      onOpenChange(false);
      setCode("");
      setWidth("");
      setHeight("");
      onCreated();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed";
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card">
        <DialogHeader>
          <DialogTitle>Create leftover from {source.code}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="text-sm text-muted-foreground">
            Inherits {source.thickness}mm · {source.glass_type}
          </div>
          <div className="space-y-2">
            <Label>Code</Label>
            <Input value={code} onChange={(e) => setCode(e.target.value)} className="h-11" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Width (mm)</Label>
              <Input type="number" value={width} onChange={(e) => setWidth(e.target.value)} className="h-11" />
            </div>
            <div className="space-y-2">
              <Label>Height (mm)</Label>
              <Input type="number" value={height} onChange={(e) => setHeight(e.target.value)} className="h-11" />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={busy}>Create leftover</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
