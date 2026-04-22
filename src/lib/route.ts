// Otimização simples de roteiro por nearest-neighbor a partir do CD.
// Tempo estimado: 4 min/km de trajeto + 25 min por visita (parada).

import { GeoPoint, distanceKm, COMPANY } from "./tracking";

const MIN_PER_KM = 4;
const STOP_MINUTES = 25;

export interface RouteStop<T> {
  item: T;
  geo: GeoPoint;
  legKm: number;       // km do ponto anterior até este
  cumulativeKm: number;
  cumulativeMinutes: number;
}

/** Ordena pontos por nearest-neighbor a partir de "start" (default: CD). */
export function optimizeRoute<T>(
  items: T[],
  geoOf: (it: T) => GeoPoint,
  start: GeoPoint = COMPANY.geo,
): RouteStop<T>[] {
  const remaining = [...items];
  const stops: RouteStop<T>[] = [];
  let current = start;
  let cumKm = 0;

  while (remaining.length > 0) {
    let bestIdx = 0;
    let bestDist = Infinity;
    for (let i = 0; i < remaining.length; i++) {
      const d = distanceKm(current, geoOf(remaining[i]));
      if (d < bestDist) {
        bestDist = d;
        bestIdx = i;
      }
    }
    const next = remaining.splice(bestIdx, 1)[0];
    cumKm += bestDist;
    const legMinutes = bestDist * MIN_PER_KM;
    const cumulativeMinutes = stops.reduce((s, st) => s + (st.legKm * MIN_PER_KM) + STOP_MINUTES, 0) + legMinutes;
    stops.push({
      item: next,
      geo: geoOf(next),
      legKm: bestDist,
      cumulativeKm: cumKm,
      cumulativeMinutes,
    });
    current = geoOf(next);
  }

  return stops;
}

export function formatMinutes(min: number): string {
  if (min < 60) return `${Math.round(min)}min`;
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  return m > 0 ? `${h}h${m.toString().padStart(2, "0")}` : `${h}h`;
}

export function formatKm(km: number): string {
  if (km < 10) return `${km.toFixed(1)} km`;
  return `${Math.round(km)} km`;
}
