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

      {/* Busca por cliente — autocomplete + atalhos */}
      <div className="relative mb-3">
        <div className="flex items-center gap-2 rounded-2xl bg-card px-3 py-2 shadow-soft">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => { setQuery(e.target.value); setHighlight(0); setShowSuggest(true); }}
            onFocus={() => setShowSuggest(true)}
            onBlur={() => setTimeout(() => setShowSuggest(false), 150)}
            onKeyDown={(e) => {
              if (!suggestions.length) {
                if (e.key === "Escape") { setQuery(""); setShowSuggest(false); }
                return;
              }
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setHighlight((h) => (h + 1) % suggestions.length);
                setShowSuggest(true);
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setHighlight((h) => (h - 1 + suggestions.length) % suggestions.length);
                setShowSuggest(true);
              } else if (e.key === "Enter") {
                e.preventDefault();
                const pick = suggestions[highlight]?.client;
                if (pick) {
                  setQuery(pick.fantasy);
                  setShowSuggest(false);
                  inputRef.current?.blur();
                }
              } else if (e.key === "Escape") {
                if (showSuggest) setShowSuggest(false);
                else { setQuery(""); inputRef.current?.blur(); }
              } else if (e.key === "Tab" && suggestions[highlight]) {
                // Tab = autocompletar com a sugestão sem fechar
                e.preventDefault();
                setQuery(suggestions[highlight].client.fantasy);
              }
            }}
            placeholder='Buscar cliente, fantasia ou cidade…  (atalho: " / ")'
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            aria-autocomplete="list"
            aria-expanded={showSuggest && suggestions.length > 0}
            aria-controls="cliente-suggest-list"
            aria-activedescendant={suggestions[highlight] ? `sg-${suggestions[highlight].client.id}` : undefined}
          />
          {!query && (
            <kbd className="hidden sm:inline-flex h-5 select-none items-center rounded border border-border bg-muted px-1.5 text-[10px] font-bold text-muted-foreground">
              /
            </kbd>
          )}
          {query && (
            <button onClick={() => { setQuery(""); inputRef.current?.focus(); }} aria-label="Limpar busca">
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          )}
        </div>

        {/* Painel de sugestões */}
        {showSuggest && suggestions.length > 0 && (
          <ul
            id="cliente-suggest-list"
            role="listbox"
            className="absolute left-0 right-0 top-full z-30 mt-1 overflow-hidden rounded-2xl border border-border bg-card shadow-glow"
          >
            {suggestions.map((s, i) => {
              const c = s.client;
              const live = c.orders.some(o => ["separacao","carga","em_rota"].includes(o.status));
              const isOn = i === highlight;
              return (
                <li
                  id={`sg-${c.id}`}
                  key={c.id}
                  role="option"
                  aria-selected={isOn}
                  onMouseEnter={() => setHighlight(i)}
                  onMouseDown={(e) => {
                    e.preventDefault(); // evita blur antes do click
                    setQuery(c.fantasy);
                    setShowSuggest(false);
                  }}
                  className={cn(
                    "flex cursor-pointer items-center justify-between gap-2 px-3 py-2 text-sm transition",
                    isOn ? "bg-primary/10" : "hover:bg-muted",
                  )}
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">
                      <MarkText text={c.fantasy} term={q} />
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      <MapPin className="mr-0.5 inline h-3 w-3" />
                      <MarkText text={c.city} term={q} /> · {c.orders.length} pedido(s)
                      {s.matchField === "city" && <span className="ml-1 text-[9px] uppercase opacity-70">via cidade</span>}
                    </p>
                  </div>
                  {live && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-1.5 py-0.5 text-[9px] font-bold text-primary">
                      <Radio className="h-2.5 w-2.5 animate-pulse-soft" /> AO VIVO
                    </span>
                  )}
                  {isOn && <CornerDownLeft className="h-3.5 w-3.5 shrink-0 text-primary" />}
                </li>
              );
            })}
            <li className="flex items-center justify-between gap-3 border-t border-border bg-muted/40 px-3 py-1.5 text-[10px] text-muted-foreground">
              <span className="inline-flex items-center gap-2">
                <span className="inline-flex items-center gap-1"><ArrowUp className="h-3 w-3" /><ArrowDown className="h-3 w-3" /> navegar</span>
                <span className="inline-flex items-center gap-1"><CornerDownLeft className="h-3 w-3" /> selecionar</span>
                <span>Tab autocompletar</span>
                <span>Esc fechar</span>
              </span>
              <span>{suggestions.length} sugestão(ões)</span>
            </li>
          </ul>
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
