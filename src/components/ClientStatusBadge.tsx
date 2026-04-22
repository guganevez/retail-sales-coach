import { ClientStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

const map: Record<ClientStatus, { label: string; cls: string }> = {
  ativo:      { label: "Ativo",      cls: "bg-success-soft text-success" },
  inativo:    { label: "Inativo",    cls: "bg-muted text-muted-foreground" },
  bloqueado:  { label: "Bloqueado",  cls: "bg-danger-soft text-danger" },
  potencial:  { label: "Potencial",  cls: "bg-accent/15 text-accent" },
};

export function ClientStatusBadge({ status }: { status: ClientStatus }) {
  const { label, cls } = map[status];
  return <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide", cls)}>{label}</span>;
}
