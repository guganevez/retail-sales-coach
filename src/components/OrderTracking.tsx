import { Link } from "react-router-dom";
import { Truck, MapPin, Clock, Package, CheckCircle2, XCircle, Navigation, Radio } from "lucide-react";
import {
  TrackedOrder, STATUS_LABEL, STATUS_ORDER, statusProgress,
  COMPANY, distanceKm, timeUntil, timeAgo,
} from "@/lib/tracking";
import { formatBRL } from "@/lib/mock";
import { cn } from "@/lib/utils";
import { TrackingMap } from "./TrackingMap";
import { EtaSummary } from "./EtaSummary";

interface Props {
  order: TrackedOrder;
  /** se true, mostra apenas resumo p/ listas. Default = false (detalhes) */
  compact?: boolean;
}

const statusTone: Record<string, string> = {
  criado: "bg-muted text-muted-foreground",
  separacao: "bg-accent/15 text-accent",
  carga: "bg-warning-soft text-warning",
  em_rota: "bg-primary/10 text-primary",
  entregue: "bg-success-soft text-success",
  cancelado: "bg-danger-soft text-danger",
};

export function OrderTracking({ order, compact }: Props) {
  const isLive = order.status === "em_rota" || order.status === "carga" || order.status === "separacao";
  const progress = statusProgress(order.status);
  const distFromCompany = distanceKm(COMPANY.geo, order.delivery.geo);
  const distVehicleToDest = order.delivery.vehicle
    ? distanceKm(order.delivery.vehicle.geo, order.delivery.geo)
    : null;

  if (compact) {
    return (
      <Link
        to={`/pedidos/${order.id}`}
        className="block rounded-2xl bg-card p-3 shadow-soft transition active:scale-[0.99]"
      >
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-muted-foreground num">{order.id}</span>
              <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold", statusTone[order.status])}>
                {STATUS_LABEL[order.status]}
              </span>
              {isLive && (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-primary">
                  <Radio className="h-3 w-3 animate-pulse-soft" /> AO VIVO
                </span>
              )}
            </div>
            <p className="mt-0.5 truncate text-sm font-semibold">{order.clientFantasy}</p>
            <p className="text-[11px] text-muted-foreground">{order.city} · {formatBRL(order.total)}</p>
          </div>
          <div className="text-right">
            {order.delivery.eta && order.status !== "entregue" && order.status !== "cancelado" ? (
              <>
                <p className="text-[10px] uppercase text-muted-foreground">ETA</p>
                <p className="text-xs font-bold text-primary num">{timeUntil(order.delivery.eta)}</p>
              </>
            ) : (
              <p className="text-[10px] text-muted-foreground">{timeAgo(order.events[order.events.length - 1].at)}</p>
            )}
          </div>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
          <div
            className={cn(
              "h-full rounded-full transition-all",
              order.status === "cancelado" ? "bg-danger" :
              order.status === "entregue" ? "bg-success" : "bg-primary"
            )}
            style={{ width: `${order.status === "cancelado" ? 100 : progress}%` }}
          />
        </div>
      </Link>
    );
  }

  return (
    <article className="space-y-4">
      {/* Header status */}
      <div className="rounded-2xl bg-card p-4 shadow-soft">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-[11px] font-bold uppercase text-muted-foreground num">{order.id}</p>
            <h2 className="text-lg font-bold">{order.clientFantasy}</h2>
            <p className="text-xs text-muted-foreground">
              {order.city} · {order.weightKg} kg · {formatBRL(order.total)}
            </p>
          </div>
          <span className={cn("rounded-full px-3 py-1 text-xs font-bold", statusTone[order.status])}>
            {STATUS_LABEL[order.status]}
          </span>
        </div>

        {/* Timeline horizontal */}
        {order.status !== "cancelado" && (
          <div className="mt-4">
            <div className="relative h-1.5 rounded-full bg-muted">
              <div
                className={cn("h-full rounded-full",
                  order.status === "entregue" ? "bg-success" : "bg-primary"
                )}
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="mt-2 grid grid-cols-5 gap-1 text-[9px] text-muted-foreground">
              {STATUS_ORDER.map((s, i) => {
                const reached = STATUS_ORDER.indexOf(order.status) >= i;
                return (
                  <div key={s} className={cn("text-center font-medium", reached && "text-foreground")}>
                    {STATUS_LABEL[s].replace("Em ", "").replace("Pedido ", "")}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {isLive && (
          <div className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-[11px] font-bold text-primary">
            <Radio className="h-3 w-3 animate-pulse-soft" /> Acompanhamento ao vivo
          </div>
        )}
      </div>

      {/* Geo / veículo */}
      <div className="rounded-2xl bg-card p-4 shadow-soft">
        <h3 className="flex items-center gap-1.5 text-sm font-semibold">
          <MapPin className="h-4 w-4 text-primary" /> Localização
        </h3>

        <div className="mt-3 space-y-3">
          <Row icon={<Truck className="h-4 w-4" />} label="Origem (CD)">
            <p className="text-xs font-semibold">{COMPANY.name}</p>
            <p className="text-[11px] text-muted-foreground">{COMPANY.address}</p>
            <p className="text-[10px] text-muted-foreground num">
              {COMPANY.geo.lat.toFixed(4)}, {COMPANY.geo.lng.toFixed(4)}
            </p>
          </Row>

          <Row icon={<Navigation className="h-4 w-4" />} label="Destino">
            <p className="text-xs font-semibold">{order.delivery.address}</p>
            <p className="text-[10px] text-muted-foreground num">
              {order.delivery.geo.lat.toFixed(4)}, {order.delivery.geo.lng.toFixed(4)}
            </p>
            <p className="mt-0.5 text-[11px] font-bold text-primary num">
              {distFromCompany.toFixed(1)} km da empresa
            </p>
          </Row>

          {order.delivery.vehicle && order.delivery.vehicle.plate !== "—" && (
            <Row icon={<Package className="h-4 w-4" />} label="Veículo">
              <p className="text-xs font-semibold num">{order.delivery.vehicle.plate} · {order.delivery.vehicle.driver}</p>
              <p className="text-[10px] text-muted-foreground num">
                Posição: {order.delivery.vehicle.geo.lat.toFixed(4)}, {order.delivery.vehicle.geo.lng.toFixed(4)}
              </p>
              {distVehicleToDest !== null && order.status !== "entregue" && (
                <p className="mt-0.5 text-[11px] font-bold text-warning num">
                  {distVehicleToDest.toFixed(1)} km até o destino
                </p>
              )}
            </Row>
          )}

          {order.delivery.eta && order.status !== "entregue" && order.status !== "cancelado" && (
            <div className="rounded-xl bg-primary/5 p-3">
              <p className="inline-flex items-center gap-1.5 text-xs font-bold text-primary">
                <Clock className="h-3.5 w-3.5" /> ETA: {timeUntil(order.delivery.eta)}
              </p>
            </div>
          )}

          {/* "Mapa" simplificado: barra de proximidade veículo→destino */}
          {distVehicleToDest !== null && order.status !== "entregue" && order.status !== "cancelado" && (
            <div>
              <div className="mb-1 flex items-center justify-between text-[10px] text-muted-foreground">
                <span>CD</span><span>Cliente</span>
              </div>
              <div className="relative h-2 rounded-full bg-muted">
                <div
                  className="absolute -top-1 h-4 w-4 -translate-x-1/2 rounded-full border-2 border-card bg-primary shadow-glow"
                  style={{
                    left: `${Math.max(0, Math.min(100,
                      (1 - distVehicleToDest / Math.max(0.1, distFromCompany)) * 100
                    ))}%`,
                  }}
                  aria-label="Posição do veículo"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Histórico */}
      <div className="rounded-2xl bg-card p-4 shadow-soft">
        <h3 className="text-sm font-semibold">Histórico do pedido</h3>
        <ol className="mt-3 space-y-3">
          {order.events.map((ev, i) => {
            const Icon = ev.status === "entregue" ? CheckCircle2 : ev.status === "cancelado" ? XCircle : Truck;
            return (
              <li key={i} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <span className={cn(
                    "grid h-7 w-7 place-items-center rounded-full",
                    ev.status === "entregue" ? "bg-success-soft text-success" :
                    ev.status === "cancelado" ? "bg-danger-soft text-danger" : "bg-primary/10 text-primary"
                  )}>
                    <Icon className="h-4 w-4" />
                  </span>
                  {i < order.events.length - 1 && <span className="my-1 w-0.5 flex-1 bg-border" />}
                </div>
                <div className="pb-2">
                  <p className="text-xs font-semibold">{STATUS_LABEL[ev.status]}</p>
                  <p className="text-[11px] text-muted-foreground">{timeAgo(ev.at)} · {ev.by || "Sistema"}</p>
                  {ev.note && <p className="mt-0.5 text-[11px] italic text-muted-foreground">{ev.note}</p>}
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </article>
  );
}

function Row({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground">{icon}</span>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{label}</p>
        {children}
      </div>
    </div>
  );
}
