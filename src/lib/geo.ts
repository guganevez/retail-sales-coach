// Localizações aproximadas de cidades atendidas (centro). Usadas para estimar
// rota quando o cliente não tem lat/lng explícito.
import { GeoPoint } from "./tracking";
import { clients } from "./mock";
import { trackedOrders } from "./tracking";

const CITY_GEO: Record<string, GeoPoint> = {
  "Marília-SP":     { lat: -22.2154, lng: -49.9456 },
  "Bauru-SP":       { lat: -22.3145, lng: -49.0710 },
  "Garça-SP":       { lat: -22.2125, lng: -49.6552 },
  "Pompéia-SP":     { lat: -22.1054, lng: -50.1740 },
  "Vera Cruz-SP":   { lat: -22.2199, lng: -49.8170 },
  "Santos-SP":      { lat: -23.9608, lng: -46.3331 },
  "São Vicente":    { lat: -23.9633, lng: -46.3919 },
  "Praia Grande":   { lat: -24.0058, lng: -46.4023 },
};

/** Retorna a melhor coordenada conhecida para o cliente (do tracking se houver, ou cidade). */
export function clientGeo(clientId: string): GeoPoint {
  // 1. Tenta encontrar coord. de entrega real em pedidos rastreados
  const tracked = trackedOrders.find(o => o.clientId === clientId);
  if (tracked) return tracked.delivery.geo;

  // 2. Cai pra cidade do cliente
  const c = clients.find(x => x.id === clientId);
  if (c && CITY_GEO[c.city]) return CITY_GEO[c.city];

  // 3. Fallback central CD
  return { lat: -23.5236, lng: -46.5419 };
}

/** Cidade aproximada (rótulo simplificado). */
export function clientCity(clientId: string): string {
  const c = clients.find(x => x.id === clientId);
  return c?.city ?? "—";
}
