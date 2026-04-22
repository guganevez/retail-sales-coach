import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface Props {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  trend?: "up" | "down" | "flat";
  tone?: "default" | "success" | "warning" | "danger";
  className?: string;
}

export function StatCard({ label, value, hint, tone = "default", className }: Props) {
  const toneRing: Record<string, string> = {
    default: "",
    success: "ring-1 ring-success/20",
    warning: "ring-1 ring-warning/30",
    danger:  "ring-1 ring-danger/30",
  };
  const toneText: Record<string, string> = {
    default: "text-foreground",
    success: "text-success",
    warning: "text-warning",
    danger:  "text-danger",
  };
  return (
    <div className={cn("rounded-2xl bg-card p-4 shadow-soft", toneRing[tone], className)}>
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={cn("mt-1 text-xl font-bold num", toneText[tone])}>{value}</p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
