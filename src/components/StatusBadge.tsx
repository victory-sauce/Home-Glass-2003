import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const map: Record<string, string> = {
  available: "bg-success/15 text-success border-success/30",
  reserved: "bg-warning/15 text-warning border-warning/30",
  used: "bg-muted text-muted-foreground border-border",
  broken: "bg-destructive/15 text-destructive border-destructive/30",
  open: "bg-primary/15 text-primary border-primary/30",
  completed: "bg-success/15 text-success border-success/30",
  cancelled: "bg-muted text-muted-foreground border-border",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <Badge variant="outline" className={cn("font-medium capitalize", map[status] ?? "")}>
      {status}
    </Badge>
  );
}
