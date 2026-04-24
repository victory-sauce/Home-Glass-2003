import { useMemo, useState } from "react";
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
  RotateCcw,
  Trash2,
  Move,
  Star,
} from "lucide-react";
import { toast } from "sonner";

const RACKS: RackName[] = ["A", "B", "C", "LEFTOVERS"];

interface Props {
  rack: RackName;
  pieces: GlassPiece[];
  onChange: () => void;
}

function rackTitle(rack: RackName | string) {
  return rack === "LEFTOVERS" ? "Leftovers" : `Rack ${rack}`;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function getThumbnailSize(piece: GlassPiece) {
  const width = Number(piece.width || 0);
  const height = Number(piece.height || 0);

  const maxW = 98;
  const maxH = 64;

  if (!width || !height) {
    return {
      width: 72,
      height: 48,
    };
  }

  const ratio = width / height;

  let thumbWidth = maxW;
  let thumbHeight = maxW / ratio;

  if (thumbHeight > maxH) {
    thumbHeight = maxH;
    thumbWidth = maxH * ratio;
  }

  return {
    width: clamp(thumbWidth, 44, maxW),
    height: clamp(thumbHeight, 30, maxH),
  };
}

function statusRowClass(status: string, isFront: boolean) {
  if (isFront) {
    return "border-blue-400 bg-blue-50/60 ring-2 ring-blue-100";
  }

  switch (status) {
    case "reserved":
      return "border-amber-200 bg-amber-50/40";
    case "broken":
      return "border-rose-200 bg-rose-50/40 opacity-70";
    case "used":
      return "border-slate-200 bg-slate-100/70 opacity-70";
    default:
      return "border-slate-200 bg-white";
  }
}

function MiniGlassThumbnail({
  piece,
  isFront,
}: {
  piece: GlassPiece;
  isFront: boolean;
}) {
  const size = getThumbnailSize(piece);

  return (
    <div className="flex w-[132px] shrink-0 items-center gap-2">
      <div className="flex h-[86px] w-[116px] items-center justify-center">
        <div
          className={`relative rounded-md border-2 bg-gradient-to-br from-sky-50 via-white to-cyan-50 shadow-sm ${
            isFront ? "border-blue-400" : "border-blue-200"
          }`}
          style={{
            width: size.width,
            height: size.height,
          }}
        >
          <div className="absolute left-2 top-2 h-5 w-px rotate-45 bg-cyan-200" />
          <div className="absolute right-3 bottom-3 h-6 w-px rotate-45 bg-cyan-200" />
          <div className="absolute inset-1 rounded-sm border border-white/80" />
        </div>
      </div>
    </div>
  );
}

export function RackCard({ rack, pieces, onChange }: Props) {
  const isLeftovers = rack === "LEFTOVERS";

  const visiblePieces = useMemo(() => {
    return [...pieces].sort(
      (a, b) => (a.rack_order ?? 0) - (b.rack_order ?? 0)
    );
  }, [pieces]);

  const frontPiece = visiblePieces.find(
    (piece) => piece.status === "available"
  );

  return (
    <Card className="overflow-hidden rounded-3xl border border-border bg-card shadow-card">
      <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 p-6 text-white">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-cyan-400/15 text-cyan-200 ring-1 ring-cyan-300/20">
            <Layers className="h-7 w-7" />
          </div>

          <div className="min-w-0">
            <h3 className="text-2xl font-bold tracking-tight">
              {rackTitle(rack)}
            </h3>
            <p className="text-sm text-slate-300">
              {visiblePieces.length} pieces
              {frontPiece ? ` · Front: ${frontPiece.code}` : ""}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white p-5">
        <div className="mb-4 flex items-center gap-4">
          <div className="h-px flex-1 bg-slate-200" />
          <div className="rounded-full bg-blue-50 px-4 py-1 text-sm font-semibold text-blue-700 ring-1 ring-blue-200">
            Front
          </div>
          <div className="h-px flex-1 bg-slate-200" />
        </div>

        <div className="space-y-3">
          {visiblePieces.length === 0 && (
            <div className="rounded-2xl border border-dashed border-border bg-slate-50 p-8 text-center text-sm text-muted-foreground">
              No pieces in this rack
            </div>
          )}

          {visiblePieces.map((piece, index) => (
            <PieceRow
              key={piece.id}
              piece={piece}
              index={index}
              total={visiblePieces.length}
              isFront={index === 0}
              onChange={onChange}
            />
          ))}
        </div>

        <div className="mt-5 flex items-center gap-4">
          <div className="h-px flex-1 bg-slate-200" />
          <div className="rounded-full bg-slate-50 px-4 py-1 text-sm font-semibold text-slate-500 ring-1 ring-slate-200">
            Back
          </div>
          <div className="h-px flex-1 bg-slate-200" />
        </div>
      </div>

      {isLeftovers && (
        <div className="border-t bg-cyan-50 px-5 py-3 text-xs text-cyan-800">
          Leftovers are prioritized first when recommending glass for new orders.
        </div>
      )}
    </Card>
  );
}

function PieceRow({
  piece,
  index,
  total,
  isFront,
  onChange,
}: {
  piece: GlassPiece;
  index: number;
  total: number;
  isFront: boolean;
  onChange: () => void;
}) {
  const [leftoverOpen, setLeftoverOpen] = useState(false);

  const audit = (action: string, details: Record<string, unknown> = {}) =>
    supabase.from("audit_logs").insert({
      action,
      entity_type: "glass_piece",
      entity_id: piece.id,
      details: {
        piece_code: piece.code,
        ...details,
      },
    });

  const updateStatus = async (status: string) => {
    const { error } = await supabase
      .from("glass_pieces")
      .update({ status })
      .eq("id", piece.id);

    if (error) {
      toast.error(error.message);
      return;
    }

    await audit(`mark_${status}`);
    toast.success(`Marked ${status}`);
    onChange();
  };

  const moveRack = async (rack: RackName) => {
    const { error } = await supabase
      .from("glass_pieces")
      .update({
        rack,
        rack_order: 9999,
      })
      .eq("id", piece.id);

    if (error) {
      toast.error(error.message);
      return;
    }

    await audit("move_rack", { to: rack });
    toast.success(`Moved to ${rackTitle(rack)}`);
    onChange();
  };

  const swapOrder = async (delta: -1 | 1) => {
    const newOrder = Math.max(1, (piece.rack_order ?? index + 1) + delta);

    const { error } = await supabase
      .from("glass_pieces")
      .update({ rack_order: newOrder })
      .eq("id", piece.id);

    if (error) {
      toast.error(error.message);
      return;
    }

    await audit("reorder", { rack_order: newOrder });
    onChange();
  };

  return (
    <>
      <div
        className={`rounded-2xl border p-4 shadow-sm transition hover:border-blue-300 hover:shadow-md ${statusRowClass(
          piece.status,
          isFront
        )}`}
      >
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex min-w-0 flex-1 gap-4">
            <div className="flex w-10 shrink-0 items-center justify-center">
              <div
                className={`flex h-9 w-9 items-center justify-center rounded-xl text-sm font-bold ${
                  isFront
                    ? "bg-blue-600 text-white"
                    : "bg-slate-100 text-blue-700"
                }`}
              >
                {index + 1}
              </div>
            </div>

            <MiniGlassThumbnail piece={piece} isFront={isFront} />

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <div className="text-xl font-bold text-slate-950">
                  {piece.code}
                </div>

                <StatusBadge status={piece.status} />

                {isFront && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 ring-1 ring-blue-200">
                    <Star className="h-3 w-3" />
                    Front sheet
                  </span>
                )}

                {piece.parent_piece_id && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-cyan-50 px-2.5 py-1 text-xs font-semibold text-cyan-700 ring-1 ring-cyan-200">
                    <Scissors className="h-3 w-3" />
                    Leftover
                  </span>
                )}
              </div>

              <div className="mt-2 grid gap-2 text-sm text-slate-600 md:grid-cols-3">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Size
                  </div>
                  <div className="font-semibold text-slate-800">
                    {piece.width} × {piece.height} mm
                  </div>
                </div>

                <div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Thickness
                  </div>
                  <div className="font-semibold text-slate-800">
                    {piece.thickness} mm
                  </div>
                </div>

                <div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Type
                  </div>
                  <div className="font-semibold text-slate-800">
                    {piece.glass_type}
                  </div>
                </div>
              </div>

              <div className="mt-2 text-xs text-slate-400">
                Position {index + 1} of {total}
              </div>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1 self-end xl:self-center">
            <Button
              variant="ghost"
              size="icon"
              disabled={index === 0}
              onClick={() => swapOrder(-1)}
              title="Move toward front"
            >
              <ArrowUp className="h-5 w-5" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              disabled={index === total - 1}
              onClick={() => swapOrder(1)}
              title="Move toward back"
            >
              <ArrowDown className="h-5 w-5" />
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreVertical className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>

              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>{piece.code}</DropdownMenuLabel>
                <DropdownMenuSeparator />

                <DropdownMenuLabel className="text-xs text-muted-foreground">
                  Move to rack
                </DropdownMenuLabel>

                {RACKS.filter((r) => r !== piece.rack).map((r) => (
                  <DropdownMenuItem key={r} onClick={() => moveRack(r)}>
                    <Move className="mr-2 h-4 w-4" />
                    {rackTitle(r)}
                  </DropdownMenuItem>
                ))}

                <DropdownMenuSeparator />

                <DropdownMenuItem onClick={() => setLeftoverOpen(true)}>
                  <Scissors className="mr-2 h-4 w-4" />
                  Create leftover
                </DropdownMenuItem>

                <DropdownMenuItem onClick={() => updateStatus("used")}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Mark used
                </DropdownMenuItem>

                <DropdownMenuItem onClick={() => updateStatus("broken")}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Mark broken
                </DropdownMenuItem>

                <DropdownMenuItem onClick={() => updateStatus("available")}>
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Restore
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      <CreateLeftoverDialog
        open={leftoverOpen}
        onOpenChange={setLeftoverOpen}
        source={piece}
        onCreated={onChange}
      />
    </>
  );
}

function CreateLeftoverDialog({
  open,
  onOpenChange,
  source,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (value: boolean) => void;
  source: GlassPiece;
  onCreated: () => void;
}) {
  const [code, setCode] = useState("");
  const [width, setWidth] = useState("");
  const [height, setHeight] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    const w = Number.parseFloat(width);
    const h = Number.parseFloat(height);

    if (!code.trim() || !w || !h) {
      toast.error("Code, width and height are required");
      return;
    }

    if (w <= 0 || h <= 0) {
      toast.error("Width and height must be greater than zero");
      return;
    }

    setBusy(true);

    try {
      const { data, error } = await supabase
        .from("glass_pieces")
        .insert({
          code: code.trim(),
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

      if (error) {
        throw error;
      }

      await supabase.from("audit_logs").insert({
        action: "create_leftover",
        entity_type: "glass_piece",
        entity_id: data.id,
        details: {
          source_piece_id: source.id,
          source_code: source.code,
          code: code.trim(),
          width: w,
          height: h,
        },
      });

      toast.success("Leftover created");
      onOpenChange(false);
      setCode("");
      setWidth("");
      setHeight("");
      onCreated();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to create leftover";

      toast.error(message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create leftover from {source.code}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-xl bg-muted p-3 text-sm text-muted-foreground">
            Inherits {source.thickness}mm · {source.glass_type}
          </div>

          <div className="space-y-2">
            <Label>Code</Label>
            <Input
              value={code}
              onChange={(event) => setCode(event.target.value)}
              placeholder="Example: L015"
              className="h-11"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Width (mm)</Label>
              <Input
                type="number"
                value={width}
                onChange={(event) => setWidth(event.target.value)}
                className="h-11"
              />
            </div>

            <div className="space-y-2">
              <Label>Height (mm)</Label>
              <Input
                type="number"
                value={height}
                onChange={(event) => setHeight(event.target.value)}
                className="h-11"
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={busy}
          >
            Cancel
          </Button>

          <Button onClick={submit} disabled={busy}>
            {busy ? "Creating..." : "Create leftover"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
