import { Clock, Navigation, Truck, CheckCircle2, XCircle } from "lucide-react";
import { TrackedOrder, COMPANY, distanceKm, timeUntil, STATUS_LABEL } from "@/lib/tracking";
import { cn } from "@/lib/utils";

interface Props {
  order: TrackedOrder;
}

/**
 * Resumo no topo do tracking: ETA + proximidade CD→cliente e veículo→destino.
 * Atualiza automaticamente conforme `order.status` ou posição do veículo mudam
 * (componente puro derivado dos dados — re-renderiza quando o pai re-renderiza).
 */
export function EtaSummary({ order }: Props) {
  const distCdClient = distanceKm(COMPANY.geo, order.delivery.geo);
  const vehicle = order.delivery.vehicle;
  const hasVehicle = vehicle && vehicle.plate !== "—";
  const distVehDest = hasVehicle ? distanceKm(vehicle!.geo, order.delivery.geo) : null;
  const traveled = distVehDest !== null ? Math.max(0, distCdClient - distVehDest) : 0;
  const traveledPct = distCdClient > 0 ? Math.min(100, (traveled / distCdClient) * 100) : 0;

  // Estados terminais
  if (order.status === "entregue") {
    return (
      <div className="rounded-2xl bg-success-soft p-4 shadow-soft">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-success" />
          <div>
            <p className="text-xs font-bold uppercase text-success">Pedido entregue</p>
            <p className="text-[11px] text-success/80">{distCdClient.toFixed(1)} km percorridos do CD</p>
          </div>
        </div>
      </div>
    );
  }

  if (order.status === "cancelado") {
    return (
      <div className="rounded-2xl bg-danger-soft p-4 shadow-soft">
        <div className="flex items-center gap-2">
          <XCircle className="h-5 w-5 text-danger" />
          <div>
            <p className="text-xs font-bold uppercase text-danger">Pedido cancelado</p>
            <p className="text-[11px] text-danger/80">Sem entrega prevista</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-gradient-to-br from-primary/10 to-accent/5 p-4 shadow-soft">
      {/* Linha 1 — ETA grande */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
            Previsão de chegada
          </p>
          <p className="mt-0.5 inline-flex items-center gap-1.5 text-2xl font-bold text-primary">
            <Clock className="h-5 w-5" />
            {order.delivery.eta ? timeUntil(order.delivery.eta) : "—"}
          </p>
          <p className="text-[11px] text-muted-foreground">
            {STATUS_LABEL[order.status]}
          </p>
        </div>
        {distVehDest !== null && (
          <div className="text-right">
            <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Falta</p>
            <p className="text-lg font-bold num text-foreground">{distVehDest.toFixed(1)} km</p>
            <p className="text-[10px] text-muted-foreground num">de {distCdClient.toFixed(1)} km</p>
          </div>
        )}
      </div>

      {/* Linha 2 — barra de proximidade veículo no trajeto */}
      <div className="mt-4">
        <div className="mb-1.5 flex items-center justify-between text-[10px] font-semibold text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Truck className="h-3 w-3" /> CD
          </span>
          <span className="inline-flex items-center gap-1">
            Cliente <Navigation className="h-3 w-3" />
          </span>
        </div>
        <div className="relative h-2.5 rounded-full bg-card">
          <div
            className="h-full rounded-full bg-primary transition-all duration-700"
            style={{ width: `${traveledPct}%` }}
          />
          {hasVehicle && (
            <div
              className="absolute -top-1 grid h-4.5 w-4.5 -translate-x-1/2 place-items-center rounded-full border-2 border-card bg-primary shadow-glow transition-all duration-700"
              style={{ left: `${traveledPct}%`, height: 18, width: 18 }}
              aria-label="Veículo"
            >
              <Truck className="h-2.5 w-2.5 text-primary-foreground" />
            </div>
          )}
        </div>
        <div className="mt-1.5 flex items-center justify-between text-[10px] num text-muted-foreground">
          <span>{traveled.toFixed(1)} km percorridos</span>
          <span>{traveledPct.toFixed(0)}%</span>
        </div>
      </div>

      {/* Linha 3 — métricas resumidas */}
      <div className="mt-3 grid grid-cols-2 gap-2">
        <Metric label="CD → Cliente" value={`${distCdClient.toFixed(1)} km`} />
        <Metric
          label="Veículo → Destino"
          value={distVehDest !== null ? `${distVehDest.toFixed(1)} km` : "—"}
          highlight
        />
      </div>
    </div>
  );
}

function Metric({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={cn(
      "rounded-xl p-2 text-center",
      highlight ? "bg-primary/15" : "bg-card/70"
    )}>
      <p className="text-[9px] font-bold uppercase text-muted-foreground">{label}</p>
      <p className={cn("text-sm font-bold num", highlight && "text-primary")}>{value}</p>
    </div>
  );
}
