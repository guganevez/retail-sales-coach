import { HealthLevel } from "@/lib/calc";
import { cn } from "@/lib/utils";

const map: Record<HealthLevel, string> = {
  good: "bg-success",
  warn: "bg-warning",
  bad: "bg-danger",
};

export function HealthDot({ level, className }: { level: HealthLevel; className?: string }) {
  return <span className={cn("inline-block h-2.5 w-2.5 rounded-full", map[level], className)} />;
}

export function HealthPill({ level, label }: { level: HealthLevel; label: string }) {
  const tone: Record<HealthLevel, string> = {
    good: "bg-success-soft text-success",
    warn: "bg-warning-soft text-warning",
    bad: "bg-danger-soft text-danger",
  };
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-semibold", tone[level])}>
      <HealthDot level={level} />
      {label}
    </span>
  );
}
