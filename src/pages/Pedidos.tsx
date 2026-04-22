import { useMemo, useState } from "react";
import { MobileShell } from "@/components/MobileShell";
import { OrderTracking } from "@/components/OrderTracking";
import { useProfile } from "@/lib/profile";
import {
  ordersForRep, ordersForSupervisor, ordersForManager,
  TrackedOrder, TrackingStatus, STATUS_LABEL,
  COMPANY, distanceKm,
} from "@/lib/tracking";
import { reps, supervisors } from "@/lib/team";
import { cn } from "@/lib/utils";
import { Radio, Search, X, MapPin, Truck } from "lucide-react";

const STATUS_FILTERS: { id: TrackingStatus | "todos" | "live"; label: string }[] = [
  { id: "live", label: "Ao vivo" },
  { id: "todos", label: "Todos" },
  { id: "criado", label: "Criados" },
  { id: "separacao", label: "Separação" },
  { id: "carga", label: "Carga" },
  { id: "em_rota", label: "Em rota" },
  { id: "entregue", label: "Entregues" },
  { id: "cancelado", label: "Cancelados" },
];

const Pedidos = () => {
  const { role, profile } = useProfile();
  const [filter, setFilter] = useState<TrackingStatus | "todos" | "live">("live");

  const orders: TrackedOrder[] = useMemo(() => {
    if (role === "vendedor") return ordersForRep(profile.id);
    if (role === "supervisor") return ordersForSupervisor(profile.id);
    return ordersForManager();
  }, [role, profile.id]);

  const filtered = useMemo(() => {
    if (filter === "todos") return orders;
    if (filter === "live") return orders.filter(o => ["separacao","carga","em_rota"].includes(o.status));
    return orders.filter(o => o.status === filter);
  }, [orders, filter]);

  const liveCount = orders.filter(o => ["separacao","carga","em_rota"].includes(o.status)).length;

  // Agrupar por vendedor quando supervisor/gerente
  const grouped = useMemo(() => {
    if (role === "vendedor") return null;
    const map = new Map<string, TrackedOrder[]>();
    filtered.forEach(o => {
      const arr = map.get(o.repId) || [];
      arr.push(o);
      map.set(o.repId, arr);
    });
    return map;
  }, [filtered, role]);

  const subtitle = role === "vendedor"
    ? "Seus pedidos em andamento"
    : role === "supervisor"
      ? `${profile.team} · ${reps.filter(r => r.supervisorId === profile.id).length} vendedores`
      : `Visão geral · ${supervisors.length} equipes · ${reps.length} vendedores`;

  return (
    <MobileShell title="Pedidos & Rastreio" subtitle={subtitle}>
      {/* Stats topo */}
      <div className="mb-3 grid grid-cols-3 gap-2">
        <Stat label="Total" value={orders.length} />
        <Stat label="Ao vivo" value={liveCount} live />
        <Stat label="Entregues" value={orders.filter(o => o.status === "entregue").length} tone="success" />
      </div>

      {/* Filtros */}
      <div className="mb-3 flex gap-2 overflow-x-auto pb-1 no-scrollbar">
        {STATUS_FILTERS.map(f => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={cn(
              "shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition",
              filter === f.id ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground"
            )}
          >
            {f.id === "live" && <Radio className="mr-1 inline h-3 w-3" />}
            {f.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="rounded-2xl bg-card p-8 text-center shadow-soft">
          <p className="text-sm text-muted-foreground">Nenhum pedido neste filtro.</p>
        </div>
      )}

      {/* Lista */}
      {role === "vendedor" ? (
        <div className="space-y-2">
          {filtered.map(o => <OrderTracking key={o.id} order={o} compact />)}
        </div>
      ) : (
        <div className="space-y-5">
          {Array.from(grouped!.entries()).map(([repId, list]) => {
            const rep = reps.find(r => r.id === repId);
            return (
              <section key={repId}>
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                    {rep?.name || repId} <span className="text-foreground/60">· {rep?.region}</span>
                  </h3>
                  <span className="text-[10px] text-muted-foreground">{list.length} pedido(s)</span>
                </div>
                <div className="space-y-2">
                  {list.map(o => <OrderTracking key={o.id} order={o} compact />)}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </MobileShell>
  );
};

function Stat({ label, value, tone, live }: { label: string; value: number; tone?: "success"; live?: boolean }) {
  return (
    <div className="rounded-2xl bg-card p-3 text-center shadow-soft">
      <p className={cn(
        "text-xl font-bold num inline-flex items-center gap-1",
        tone === "success" && "text-success",
        live && value > 0 && "text-primary"
      )}>
        {live && value > 0 && <Radio className="h-3.5 w-3.5 animate-pulse-soft" />}
        {value}
      </p>
      <p className="text-[10px] uppercase text-muted-foreground">{label}</p>
    </div>
  );
}

export default Pedidos;
