import { Card } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  label: string;
  value: number | string;
  icon: LucideIcon;
  tone?: "primary" | "success" | "warning" | "secondary";
}

const toneClasses: Record<NonNullable<Props["tone"]>, string> = {
  primary: "bg-primary/10 text-primary",
  success: "bg-success/10 text-success",
  warning: "bg-warning/10 text-warning",
  secondary: "bg-secondary/10 text-secondary",
};

export function KpiCard({ label, value, icon: Icon, tone = "primary" }: Props) {
  return (
    <Card className="p-5 shadow-card flex items-center gap-4">
      <div className={cn("size-12 rounded-xl flex items-center justify-center", toneClasses[tone])}>
        <Icon className="size-6" />
      </div>
      <div>
        <div className="text-2xl font-bold text-foreground leading-none">{value}</div>
        <div className="text-sm text-muted-foreground mt-1">{label}</div>
      </div>
    </Card>
  );
}
