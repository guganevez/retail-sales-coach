// Rastreio de pedidos em "tempo real" (mock determinístico).
// Status: criado → separacao → carga → em_rota → entregue (ou cancelado)

export type TrackingStatus =
  | "criado"
  | "separacao"
  | "carga"
  | "em_rota"
  | "entregue"
  | "cancelado";

export interface TrackingEvent {
  status: TrackingStatus;
  at: string;        // ISO
  note?: string;
  by?: string;       // operador / motorista
}

export interface GeoPoint {
  lat: number;
  lng: number;
}

export interface TrackedOrder {
  id: string;                 // ex: PED-1042
  clientId: string;
  clientFantasy: string;
  city: string;
  repId: string;              // vendedor responsável
  total: number;
  weightKg: number;
  status: TrackingStatus;
  createdAt: string;
  events: TrackingEvent[];
  delivery: {
    address: string;
    geo: GeoPoint;            // destino
    eta?: string;             // ISO previsão
    vehicle?: { plate: string; driver: string; geo: GeoPoint }; // posição atual do caminhão
  };
}

// Empresa modelo — Negri Distribuidora
// R. dos Continentes, 74 - Vila Ré, São Paulo - SP, 03668-010
export const COMPANY = {
  name: "Negri Distribuidora",
  address: "R. dos Continentes, 74 — Vila Ré, São Paulo-SP",
  geo: { lat: -23.5236, lng: -46.5419 } as GeoPoint,
};

// Distância em km — Haversine
export function distanceKm(a: GeoPoint, b: GeoPoint): number {
  const R = 6371;
  const toRad = (n: number) => (n * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * R * Math.asin(Math.sqrt(h));
}

export const STATUS_LABEL: Record<TrackingStatus, string> = {
  criado: "Pedido criado",
  separacao: "Em separação",
  carga: "Em carregamento",
  em_rota: "Em rota de entrega",
  entregue: "Entregue",
  cancelado: "Cancelado",
};

export const STATUS_ORDER: TrackingStatus[] = [
  "criado", "separacao", "carga", "em_rota", "entregue",
];

export function statusProgress(s: TrackingStatus): number {
  if (s === "cancelado") return 0;
  const i = STATUS_ORDER.indexOf(s);
  return ((i + 1) / STATUS_ORDER.length) * 100;
}

// Pedidos fictícios — distribuídos pelos 6 vendedores e seguindo lógica geográfica.
// Para cada pedido o ETA, distância e posição do veículo são coerentes com o status.
const now = Date.now();
const iso = (minsAgo: number) => new Date(now - minsAgo * 60_000).toISOString();
const isoFuture = (minsAhead: number) => new Date(now + minsAhead * 60_000).toISOString();

export const trackedOrders: TrackedOrder[] = [
  {
    id: "PED-1042",
    clientId: "c1", clientFantasy: "Bar do Zé", city: "Marília-SP",
    repId: "v1", total: 2840, weightKg: 168,
    status: "em_rota", createdAt: iso(220),
    events: [
      { status: "criado",    at: iso(220), by: "Rafael Moreira" },
      { status: "separacao", at: iso(180), by: "CD Centro" },
      { status: "carga",     at: iso(95),  by: "Doca 3" },
      { status: "em_rota",   at: iso(40),  by: "Motorista João S.", note: "Saiu para entrega" },
    ],
    delivery: {
      address: "Av. Sampaio Vidal, 1240 — Marília-SP",
      geo: { lat: -22.2156, lng: -49.9489 },
      eta: isoFuture(45),
      vehicle: { plate: "FXG-2C45", driver: "João Souza", geo: { lat: -22.4987, lng: -49.0210 } }, // a caminho
    },
  },
  {
    id: "PED-1043",
    clientId: "c2", clientFantasy: "Sabor & Cia", city: "Bauru-SP",
    repId: "v2", total: 5120, weightKg: 312,
    status: "carga", createdAt: iso(150),
    events: [
      { status: "criado",    at: iso(150), by: "Camila Tavares" },
      { status: "separacao", at: iso(120), by: "CD Centro" },
      { status: "carga",     at: iso(15),  by: "Doca 1" },
    ],
    delivery: {
      address: "R. Rio Branco, 880 — Bauru-SP",
      geo: { lat: -22.3146, lng: -49.0712 },
      eta: isoFuture(180),
      vehicle: { plate: "RTH-9D11", driver: "Marcos Lima", geo: COMPANY.geo },
    },
  },
  {
    id: "PED-1044",
    clientId: "c3", clientFantasy: "Bom Preço", city: "Marília-SP",
    repId: "v1", total: 4200, weightKg: 245,
    status: "separacao", createdAt: iso(60),
    events: [
      { status: "criado",    at: iso(60), by: "Rafael Moreira" },
      { status: "separacao", at: iso(20), by: "CD Centro" },
    ],
    delivery: {
      address: "R. das Flores, 220 — Marília-SP",
      geo: { lat: -22.2061, lng: -49.9522 },
      eta: isoFuture(360),
      vehicle: { plate: "—", driver: "—", geo: COMPANY.geo },
    },
  },
  {
    id: "PED-1045",
    clientId: "c4", clientFantasy: "Forno a Lenha", city: "Garça-SP",
    repId: "v3", total: 1980, weightKg: 92,
    status: "em_rota", createdAt: iso(310),
    events: [
      { status: "criado",    at: iso(310), by: "Luís Henrique" },
      { status: "separacao", at: iso(260), by: "CD Centro" },
      { status: "carga",     at: iso(160), by: "Doca 2" },
      { status: "em_rota",   at: iso(70),  by: "Motorista Pedro C." },
    ],
    delivery: {
      address: "Pç. Barão do Rio Branco, 50 — Garça-SP",
      geo: { lat: -22.2128, lng: -49.6549 },
      eta: isoFuture(20),
      vehicle: { plate: "GHK-4B88", driver: "Pedro Carvalho", geo: { lat: -22.2200, lng: -49.6601 } }, // quase chegando
    },
  },
  {
    id: "PED-1046",
    clientId: "c2", clientFantasy: "Sabor & Cia", city: "Santos-SP",
    repId: "v4", total: 6480, weightKg: 410,
    status: "entregue", createdAt: iso(1440),
    events: [
      { status: "criado",    at: iso(1440), by: "Mariana Castro" },
      { status: "separacao", at: iso(1380), by: "CD Litoral" },
      { status: "carga",     at: iso(1290), by: "Doca 4" },
      { status: "em_rota",   at: iso(1180), by: "Motorista Júlia P." },
      { status: "entregue",  at: iso(960),  by: "Recebido por Ana M." },
    ],
    delivery: {
      address: "Av. Pres. Wilson, 412 — Santos-SP",
      geo: { lat: -23.9612, lng: -46.3328 },
      vehicle: { plate: "LSV-7K22", driver: "Júlia Pereira", geo: { lat: -23.9612, lng: -46.3328 } },
    },
  },
  {
    id: "PED-1047",
    clientId: "c7", clientFantasy: "Boteco Carlinhos", city: "Vera Cruz-SP",
    repId: "v3", total: 2100, weightKg: 118,
    status: "carga", createdAt: iso(75),
    events: [
      { status: "criado",    at: iso(75), by: "Luís Henrique" },
      { status: "separacao", at: iso(45), by: "CD Centro" },
      { status: "carga",     at: iso(8),  by: "Doca 2" },
    ],
    delivery: {
      address: "R. Carlos Gomes, 75 — Vera Cruz-SP",
      geo: { lat: -22.2199, lng: -49.8170 },
      eta: isoFuture(240),
      vehicle: { plate: "MNO-3J57", driver: "Felipe R.", geo: COMPANY.geo },
    },
  },
  {
    id: "PED-1048",
    clientId: "c4", clientFantasy: "Praia Mar Bar", city: "Praia Grande-SP",
    repId: "v6", total: 1320, weightKg: 84,
    status: "criado", createdAt: iso(12),
    events: [
      { status: "criado", at: iso(12), by: "Beatriz Saldanha" },
    ],
    delivery: {
      address: "Av. Pres. Costa e Silva, 900 — Praia Grande-SP",
      geo: { lat: -24.0061, lng: -46.4030 },
      eta: isoFuture(480),
      vehicle: { plate: "—", driver: "—", geo: COMPANY.geo },
    },
  },
  {
    id: "PED-1049",
    clientId: "c5", clientFantasy: "Conv. 24h", city: "São Vicente",
    repId: "v5", total: 980, weightKg: 56,
    status: "cancelado", createdAt: iso(2880),
    events: [
      { status: "criado",    at: iso(2880), by: "André Bittencourt" },
      { status: "cancelado", at: iso(2820), note: "Cliente bloqueado por inadimplência" },
    ],
    delivery: {
      address: "R. Frei Gaspar, 320 — São Vicente",
      geo: { lat: -23.9635, lng: -46.3922 },
    },
  },
];

// Filtrar por escopo (vendedor/supervisor/gerente)
import { reps } from "./team";

export function ordersForRep(repId: string): TrackedOrder[] {
  return trackedOrders.filter(o => o.repId === repId);
}
export function ordersForSupervisor(supervisorId: string): TrackedOrder[] {
  const repIds = reps.filter(r => r.supervisorId === supervisorId).map(r => r.id);
  return trackedOrders.filter(o => repIds.includes(o.repId));
}
export function ordersForManager(): TrackedOrder[] {
  return trackedOrders;
}

export function timeUntil(iso: string): string {
  const diff = new Date(iso).getTime() - Date.now();
  if (diff <= 0) return "agora";
  const m = Math.round(diff / 60000);
  if (m < 60) return `em ${m} min`;
  const h = Math.floor(m / 60);
  const rm = m % 60;
  return rm ? `em ${h}h${rm}` : `em ${h}h`;
}

export function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "agora";
  if (m < 60) return `há ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `há ${h}h`;
  return `há ${Math.floor(h / 24)}d`;
}
