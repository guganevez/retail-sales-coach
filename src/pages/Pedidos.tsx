import { useEffect, useMemo, useRef, useState } from "react";
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
import { Radio, Search, X, MapPin, Truck, CornerDownLeft, ArrowDown, ArrowUp } from "lucide-react";

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
  const [query, setQuery] = useState("");
  const [highlight, setHighlight] = useState(0);
  const [showSuggest, setShowSuggest] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Atalho "/" foca a busca (quando não estiver em outro input)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (e.key === "/" && tag !== "INPUT" && tag !== "TEXTAREA") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const orders: TrackedOrder[] = useMemo(() => {
    if (role === "vendedor") return ordersForRep(profile.id);
    if (role === "supervisor") return ordersForSupervisor(profile.id);
    return ordersForManager();
  }, [role, profile.id]);

  // Lista única de clientes (com contagem) — base do atalho de busca
  const clientList = useMemo(() => {
    const map = new Map<string, { id: string; fantasy: string; city: string; orders: TrackedOrder[] }>();
    orders.forEach(o => {
      const c = map.get(o.clientId) || { id: o.clientId, fantasy: o.clientFantasy, city: o.city, orders: [] };
      c.orders.push(o);
      map.set(o.clientId, c);
    });
    return Array.from(map.values()).sort((a, b) => a.fantasy.localeCompare(b.fantasy));
  }, [orders]);

  // Match de busca por cliente (nome ou cidade) — com score p/ ranquear sugestões
  const q = query.trim().toLowerCase();
  const scored = useMemo(() => {
    if (!q) return [];
    return clientList
      .map(c => {
        const f = c.fantasy.toLowerCase();
        const ct = c.city.toLowerCase();
        let score = 0;
        let matchField: "fantasy" | "city" | null = null;
        if (f === q) { score = 100; matchField = "fantasy"; }
        else if (f.startsWith(q)) { score = 80; matchField = "fantasy"; }
        else if (f.includes(q)) { score = 50; matchField = "fantasy"; }
        else if (ct.startsWith(q)) { score = 40; matchField = "city"; }
        else if (ct.includes(q)) { score = 20; matchField = "city"; }
        // bônus: clientes com pedidos ao vivo aparecem antes
        const live = c.orders.some(o => ["separacao","carga","em_rota"].includes(o.status));
        if (live) score += 5;
        // desempate: mais pedidos primeiro
        score += Math.min(4, c.orders.length);
        return { client: c, score, matchField };
      })
      .filter(x => x.score > 0)
      .sort((a, b) => b.score - a.score);
  }, [q, clientList]);
  const matchedClients = scored.map(s => s.client);
  const suggestions = scored.slice(0, 6);

  const filtered = useMemo(() => {
    let base = orders;
    if (q) {
      base = base.filter(o =>
        o.clientFantasy.toLowerCase().includes(q) || o.city.toLowerCase().includes(q),
      );
    }
    if (filter === "todos") return base;
    if (filter === "live") return base.filter(o => ["separacao","carga","em_rota"].includes(o.status));
    return base.filter(o => o.status === filter);
  }, [orders, filter, q]);

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

      {/* Busca por cliente — atalho rápido */}
      <div className="mb-3 flex items-center gap-2 rounded-2xl bg-card px-3 py-2 shadow-soft">
        <Search className="h-4 w-4 text-muted-foreground" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar cliente, fantasia ou cidade…"
          className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
        {query && (
          <button onClick={() => setQuery("")} aria-label="Limpar busca">
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        )}
      </div>

      {/* Resultados de cliente — agrupa pedidos do cliente buscado */}
      {q && matchedClients.length > 0 && (
        <section className="mb-4 space-y-3">
          <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
            {matchedClients.length} cliente(s) encontrado(s)
          </p>
          {matchedClients.map(c => {
            const live = c.orders.find(o => ["separacao","carga","em_rota"].includes(o.status));
            const liveVehicle = live?.delivery.vehicle;
            const liveDist = live ? distanceKm(COMPANY.geo, live.delivery.geo) : 0;
            return (
              <div key={c.id} className="rounded-2xl bg-card p-3 shadow-soft">
                <div className="mb-2 flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold">{c.fantasy}</p>
                    <p className="text-[11px] text-muted-foreground">
                      <MapPin className="mr-0.5 inline h-3 w-3" />
                      {c.city} · {c.orders.length} pedido(s)
                    </p>
                  </div>
                  {live && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                      <Radio className="h-3 w-3 animate-pulse-soft" /> AO VIVO
                    </span>
                  )}
                </div>

                {/* Posição atual do veículo do pedido em andamento */}
                {live && liveVehicle && liveVehicle.plate !== "—" && (
                  <div className="mb-2 rounded-xl bg-primary/5 p-2 text-[11px]">
                    <p className="inline-flex items-center gap-1 font-bold text-primary">
                      <Truck className="h-3 w-3" /> {liveVehicle.plate} · {liveVehicle.driver}
                    </p>
                    <p className="text-[10px] text-muted-foreground num">
                      Posição: {liveVehicle.geo.lat.toFixed(4)}, {liveVehicle.geo.lng.toFixed(4)} ·
                      {" "}{distanceKm(liveVehicle.geo, live.delivery.geo).toFixed(1)} km do destino
                      {" "}({liveDist.toFixed(1)} km do CD)
                    </p>
                  </div>
                )}

                {/* Lista compacta dos pedidos do cliente */}
                <div className="space-y-2">
                  {c.orders
                    .slice()
                    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                    .map(o => <OrderTracking key={o.id} order={o} compact />)}
                </div>
              </div>
            );
          })}
        </section>
      )}

      {q && matchedClients.length === 0 && (
        <div className="mb-3 rounded-2xl bg-card p-4 text-center shadow-soft">
          <p className="text-sm text-muted-foreground">Nenhum cliente encontrado para “{query}”.</p>
        </div>
      )}

      {!q && (
        <>
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
        </>
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
