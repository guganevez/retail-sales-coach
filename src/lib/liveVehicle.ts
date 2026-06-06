// Simula recebimento de novas localizações GPS do veículo em "tempo real".
// Em produção, troque o setInterval por uma assinatura de websocket / SSE /
// Supabase Realtime — a forma do hook (estado reativo) já é a esperada.

import { useEffect, useRef, useState } from "react";
import { GeoPoint, TrackedOrder, COMPANY, distanceKm } from "./tracking";

// Velocidade média (km/h) por status — usada p/ ETA e p/ avanço do mock.
const SPEED_KMH: Record<string, number> = {
  em_rota: 55,
  carga: 0,
  separacao: 0,
  criado: 0,
  entregue: 0,
  cancelado: 0,
};

const TICK_MS = 4000; // intervalo entre "pings" simulados

interface LiveState {
  geo: GeoPoint;
  remainingKm: number;
  totalKm: number;
  etaMinutes: number;     // minutos restantes até o destino
  etaAt: Date | null;     // horário previsto
  updatedAt: Date;
  movingKmh: number;
}

/**
 * Hook que devolve a posição do veículo atualizada a cada novo "ping"
 * (mock determinístico que interpola até o destino). Recalcula distância
 * restante e ETA a cada atualização.
 */
export function useLiveVehicle(order: TrackedOrder): LiveState {
  const dest = order.delivery.geo;
  const totalKm = distanceKm(COMPANY.geo, dest);
  const speed = SPEED_KMH[order.status] ?? 0;

  const initialGeo: GeoPoint =
    order.delivery.vehicle?.geo ?? COMPANY.geo;

  const [geo, setGeo] = useState<GeoPoint>(initialGeo);
  const [updatedAt, setUpdatedAt] = useState<Date>(new Date());
  const lastRef = useRef<GeoPoint>(initialGeo);

  // Reseta quando muda o pedido
  useEffect(() => {
    setGeo(initialGeo);
    lastRef.current = initialGeo;
    setUpdatedAt(new Date());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order.id]);

  useEffect(() => {
    if (speed === 0) return; // não há movimento p/ simular

    const id = setInterval(() => {
      const cur = lastRef.current;
      const remaining = distanceKm(cur, dest);
      if (remaining < 0.05) return;

      // Avanço por tick: km percorridos = speed * (TICK_MS/3600000)
      const stepKm = Math.min(remaining, speed * (TICK_MS / 3_600_000));
      const t = stepKm / remaining; // fração do caminho restante
      const next: GeoPoint = {
        lat: cur.lat + (dest.lat - cur.lat) * t,
        lng: cur.lng + (dest.lng - cur.lng) * t,
      };
      lastRef.current = next;
      setGeo(next);
      setUpdatedAt(new Date());
    }, TICK_MS);

    return () => clearInterval(id);
  }, [dest.lat, dest.lng, speed]);

  const remainingKm = distanceKm(geo, dest);
  const etaMinutes = speed > 0 ? (remainingKm / speed) * 60 : Infinity;
  const etaAt = Number.isFinite(etaMinutes)
    ? new Date(Date.now() + etaMinutes * 60_000)
    : null;

  return {
    geo,
    remainingKm,
    totalKm,
    etaMinutes,
    etaAt,
    updatedAt,
    movingKmh: speed,
  };
}

export function formatEta(min: number): string {
  if (!Number.isFinite(min)) return "—";
  if (min < 1) return "chegando";
  if (min < 60) return `${Math.round(min)} min`;
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  return m ? `${h}h${m.toString().padStart(2, "0")}` : `${h}h`;
}

export function formatClock(d: Date | null): string {
  if (!d) return "—";
  return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}
