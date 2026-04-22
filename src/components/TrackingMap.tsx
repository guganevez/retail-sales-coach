import { Truck, MapPin, Building2 } from "lucide-react";
import { TrackedOrder, COMPANY, distanceKm } from "@/lib/tracking";
import { cn } from "@/lib/utils";

interface Props {
  order: TrackedOrder;
}

/**
 * Mini-mapa SVG (sem dependência externa). Plota CD, destino e veículo
 * normalizados em uma viewport, com linha de trajeto. Suficiente p/ MVP
 * mostrar relação espacial sem custos de tiles/API.
 */
export function TrackingMap({ order }: Props) {
  const cd = COMPANY.geo;
  const dest = order.delivery.geo;
  const vehicle = order.delivery.vehicle?.geo;

  // Coletar pontos para calcular bounds
  const points = [cd, dest, ...(vehicle ? [vehicle] : [])];
  const lats = points.map(p => p.lat);
  const lngs = points.map(p => p.lng);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);

  // Padding em graus (pelo menos 0.05 p/ não colar nas bordas)
  const padLat = Math.max(0.05, (maxLat - minLat) * 0.25);
  const padLng = Math.max(0.05, (maxLng - minLng) * 0.25);

  const W = 320;
  const H = 180;

  const project = (lat: number, lng: number) => {
    const x = ((lng - (minLng - padLng)) / ((maxLng + padLng) - (minLng - padLng))) * W;
    // y invertido (lat maior = mais ao norte = topo)
    const y = H - ((lat - (minLat - padLat)) / ((maxLat + padLat) - (minLat - padLat))) * H;
    return { x, y };
  };

  const pCD = project(cd.lat, cd.lng);
  const pDest = project(dest.lat, dest.lng);
  const pVeh = vehicle ? project(vehicle.lat, vehicle.lng) : null;

  const distTotal = distanceKm(cd, dest);
  const showVehicle = !!vehicle && order.delivery.vehicle?.plate !== "—" && order.status !== "entregue";

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-muted/30">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-44 w-full">
        {/* grid leve */}
        <defs>
          <pattern id="grid" width="32" height="32" patternUnits="userSpaceOnUse">
            <path d="M 32 0 L 0 0 0 32" fill="none" stroke="hsl(var(--border))" strokeWidth="0.5" opacity="0.5" />
          </pattern>
        </defs>
        <rect width={W} height={H} fill="url(#grid)" />

        {/* Trajeto CD → destino (tracejado) */}
        <line
          x1={pCD.x} y1={pCD.y} x2={pDest.x} y2={pDest.y}
          stroke="hsl(var(--primary))"
          strokeWidth="1.5"
          strokeDasharray="4 3"
          opacity="0.5"
        />

        {/* Trecho percorrido CD → veículo (sólido) */}
        {pVeh && (
          <line
            x1={pCD.x} y1={pCD.y} x2={pVeh.x} y2={pVeh.y}
            stroke="hsl(var(--primary))"
            strokeWidth="2.5"
            opacity="0.9"
          />
        )}

        {/* CD */}
        <g>
          <circle cx={pCD.x} cy={pCD.y} r="8" fill="hsl(var(--accent))" stroke="hsl(var(--card))" strokeWidth="2" />
          <text x={pCD.x} y={pCD.y - 12} textAnchor="middle" fontSize="9" fontWeight="700" fill="hsl(var(--foreground))">CD</text>
        </g>

        {/* Destino */}
        <g>
          <circle cx={pDest.x} cy={pDest.y} r="8" fill="hsl(var(--success))" stroke="hsl(var(--card))" strokeWidth="2" />
          <text x={pDest.x} y={pDest.y - 12} textAnchor="middle" fontSize="9" fontWeight="700" fill="hsl(var(--foreground))">Cliente</text>
        </g>

        {/* Veículo (pulsa) */}
        {showVehicle && pVeh && (
          <g>
            <circle cx={pVeh.x} cy={pVeh.y} r="11" fill="hsl(var(--primary))" opacity="0.25">
              <animate attributeName="r" values="9;15;9" dur="1.6s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.4;0;0.4" dur="1.6s" repeatCount="indefinite" />
            </circle>
            <circle cx={pVeh.x} cy={pVeh.y} r="6" fill="hsl(var(--primary))" stroke="hsl(var(--card))" strokeWidth="2" />
            <text x={pVeh.x} y={pVeh.y - 10} textAnchor="middle" fontSize="8" fontWeight="700" fill="hsl(var(--primary))">
              {order.delivery.vehicle?.plate}
            </text>
          </g>
        )}
      </svg>

      {/* Legenda */}
      <div className="flex items-center justify-between gap-2 border-t border-border bg-card/60 px-3 py-2 text-[10px]">
        <span className="inline-flex items-center gap-1">
          <Building2 className="h-3 w-3 text-accent" /> CD São Paulo
        </span>
        {showVehicle && (
          <span className="inline-flex items-center gap-1 font-bold text-primary">
            <Truck className="h-3 w-3" /> Veículo ao vivo
          </span>
        )}
        <span className="inline-flex items-center gap-1">
          <MapPin className="h-3 w-3 text-success" /> {distTotal.toFixed(0)} km destino
        </span>
      </div>
    </div>
  );
}
