import { useEffect, useMemo, useRef } from "react";
import { MapContainer, TileLayer, Marker, Polyline, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Building2, MapPin, Truck } from "lucide-react";
import { TrackedOrder, COMPANY, distanceKm } from "@/lib/tracking";

interface Props {
  order: TrackedOrder;
}

/**
 * Cria um divIcon Leaflet com classes Tailwind do design system —
 * mantém cores semânticas (primary/success/accent) e estilo consistente.
 */
function makeIcon(html: string, size = 32) {
  return L.divIcon({
    html,
    className: "!bg-transparent !border-0",
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

const cdIcon = makeIcon(
  `<div class="grid h-8 w-8 place-items-center rounded-full bg-accent text-accent-foreground shadow-soft ring-2 ring-card">
     <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21h18"/><path d="M5 21V7l8-4v18"/><path d="M19 21V11l-6-4"/></svg>
   </div>`
);

const destIcon = makeIcon(
  `<div class="grid h-8 w-8 place-items-center rounded-full bg-success text-success-foreground shadow-soft ring-2 ring-card">
     <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
   </div>`
);

const vehicleIcon = makeIcon(
  `<div class="relative grid h-9 w-9 place-items-center">
     <span class="absolute inset-0 rounded-full bg-primary/30 animate-ping"></span>
     <span class="relative grid h-8 w-8 place-items-center rounded-full bg-primary text-primary-foreground shadow-glow ring-2 ring-card">
       <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M15 18H9"/><path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14"/><circle cx="17" cy="18" r="2"/><circle cx="7" cy="18" r="2"/></svg>
     </span>
   </div>`,
  36
);

/** Reenquadra o mapa sempre que os pontos relevantes mudarem. */
function FitBounds({ points }: { points: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (points.length === 0) return;
    if (points.length === 1) {
      map.setView(points[0], 13, { animate: true });
      return;
    }
    const bounds = L.latLngBounds(points);
    map.fitBounds(bounds, { padding: [32, 32], maxZoom: 14, animate: true });
  }, [map, JSON.stringify(points)]);
  return null;
}

export function TrackingMap({ order }: Props) {
  const cd: [number, number] = [COMPANY.geo.lat, COMPANY.geo.lng];
  const dest: [number, number] = [order.delivery.geo.lat, order.delivery.geo.lng];
  const vehicle = order.delivery.vehicle;
  const hasVehicle = !!vehicle && vehicle.plate !== "—" && order.status !== "entregue";
  const vehPos: [number, number] | null = hasVehicle
    ? [vehicle!.geo.lat, vehicle!.geo.lng]
    : null;

  const points = useMemo<[number, number][]>(
    () => (vehPos ? [cd, vehPos, dest] : [cd, dest]),
    [cd, dest, vehPos]
  );

  const distTotal = distanceKm(COMPANY.geo, order.delivery.geo);
  const mapRef = useRef<L.Map | null>(null);

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-muted/30">
      <div className="relative" style={{ height: 220 }}>
        <MapContainer
          ref={(m) => { mapRef.current = m; }}
          center={dest}
          zoom={8}
          scrollWheelZoom={false}
          className="h-full w-full"
          attributionControl={false}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; OpenStreetMap'
          />

          {/* Trajeto previsto CD → destino (tracejado) */}
          <Polyline
            positions={[cd, dest]}
            pathOptions={{
              color: "hsl(var(--primary))",
              weight: 2,
              opacity: 0.4,
              dashArray: "6 6",
            }}
          />

          {/* Trecho percorrido CD → veículo (sólido) */}
          {vehPos && (
            <Polyline
              positions={[cd, vehPos]}
              pathOptions={{ color: "hsl(var(--primary))", weight: 3.5, opacity: 0.9 }}
            />
          )}

          <Marker position={cd} icon={cdIcon}>
            <Popup>
              <strong>{COMPANY.name}</strong>
              <br />
              <span className="text-xs">{COMPANY.address}</span>
            </Popup>
          </Marker>

          <Marker position={dest} icon={destIcon}>
            <Popup>
              <strong>{order.clientFantasy}</strong>
              <br />
              <span className="text-xs">{order.delivery.address}</span>
            </Popup>
          </Marker>

          {vehPos && (
            <Marker position={vehPos} icon={vehicleIcon}>
              <Popup>
                <strong>Veículo {vehicle!.plate}</strong>
                <br />
                Motorista: {vehicle!.driver}
              </Popup>
            </Marker>
          )}

          <FitBounds points={points} />
        </MapContainer>
      </div>

      {/* Legenda */}
      <div className="flex items-center justify-between gap-2 border-t border-border bg-card/60 px-3 py-2 text-[10px]">
        <span className="inline-flex items-center gap-1">
          <Building2 className="h-3 w-3 text-accent" /> CD São Paulo
        </span>
        {hasVehicle && (
          <span className="inline-flex items-center gap-1 font-bold text-primary">
            <Truck className="h-3 w-3" /> {vehicle!.plate}
          </span>
        )}
        <span className="inline-flex items-center gap-1">
          <MapPin className="h-3 w-3 text-success" /> {distTotal.toFixed(0)} km destino
        </span>
      </div>
    </div>
  );
}
