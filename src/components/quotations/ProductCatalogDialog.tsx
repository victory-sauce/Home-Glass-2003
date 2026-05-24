import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { DrawingRenderer } from "@/components/drawings/DrawingRenderer";
import { drawingCatalog, type DrawingCatalogItem } from "@/components/drawings/catalog";

type ProductCatalogDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddItem: (item: DrawingCatalogItem) => void;
};

export function ProductCatalogDialog({
  open,
  onOpenChange,
  onAddItem,
}: ProductCatalogDialogProps) {
  const [query, setQuery] = useState("");

  const filteredCatalog = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) {
      return drawingCatalog;
    }

    return drawingCatalog.filter((item) =>
      [
        item.itemCode,
        item.productName,
        item.description,
        item.id,
        ...item.tags,
      ]
        .join(" ")
        .toLowerCase()
        .includes(normalizedQuery)
    );
  }, [query]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-5xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Product Catalog</DialogTitle>
          <DialogDescription>
            Search available product drawings and add them to the current quotation.
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by code, name, panel count, or tag"
            className="pl-9"
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {filteredCatalog.map((item) => (
            <article
              key={item.id}
              className="grid gap-3 rounded-lg border border-slate-200 bg-white p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-blue-700">{item.itemCode}</div>
                  <h3 className="text-lg font-semibold text-slate-950">{item.productName}</h3>
                  <p className="mt-1 text-sm text-slate-600">{item.description}</p>
                </div>
                <Badge variant="outline">{item.defaults.panelCount} panels</Badge>
              </div>

              <div className="h-56 overflow-hidden rounded-lg border border-slate-100 bg-slate-50">
                <DrawingRenderer
                  drawingId={item.defaults.drawingId}
                  widthMm={item.defaults.widthMm}
                  heightMm={item.defaults.heightMm}
                  floorLevelMm={item.defaults.floorLevelMm}
                  panelCount={item.defaults.panelCount}
                  quantity={item.defaults.quantity}
                  showLock={item.defaults.showLock}
                  lockPosition={item.defaults.lockPosition}
                  viewDirection={item.defaults.viewDirection}
                  itemCode={item.defaults.itemCode}
                  productName={item.defaults.productName}
                  className="h-full border-0"
                />
              </div>

              <div className="flex flex-wrap gap-2">
                {item.tags.map((tag) => (
                  <Badge key={tag} variant="secondary">
                    {tag}
                  </Badge>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm text-slate-700">
                <div>
                  <span className="font-semibold">Width:</span> {item.defaults.widthMm} mm
                </div>
                <div>
                  <span className="font-semibold">Height:</span> {item.defaults.heightMm} mm
                </div>
              </div>

              <Button onClick={() => onAddItem(item)}>Add to quotation</Button>
            </article>
          ))}
        </div>

        {filteredCatalog.length === 0 && (
          <div className="rounded-lg border border-dashed border-slate-300 p-8 text-center text-sm text-muted-foreground">
            No catalog items match that search.
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
