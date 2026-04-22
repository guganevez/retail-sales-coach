export type ClientStatus = "ativo" | "inativo" | "bloqueado" | "potencial";

export interface Client {
  id: string;
  name: string;
  fantasy: string;
  city: string;
  segment: string;
  status: ClientStatus;
  creditLimit: number;
  creditUsed: number;
  overdueAmount: number;
  lastPurchaseDays: number;
  avgTicket: number;
  avgMargin: number;
  notes?: string;
}

export interface Product {
  id: string;
  code: string;
  name: string;
  brand: string;
  category: string;
  unit: string; // CX 12un, FD 24un, etc
  weightKg: number;
  cost: number;
  psv: number; // preço sugerido de venda
  pmv: number; // preço mínimo de venda
  promo?: boolean;
}

export interface OrderItem {
  productId: string;
  qty: number;
  price: number;
  lastPrice?: number; // último preço praticado p/ cliente
}

export type OrderType = "entrega" | "retirada" | "orcamento";
export type Shift = "manha" | "tarde" | "noite";

export interface Order {
  id: string;
  clientId: string;
  date: string; // ISO
  items: OrderItem[];
  type: OrderType;
  shift: Shift;
  paymentTerm: string;
  totalGross: number;
  margin: number; // %
  commission: number; // %
}

export interface Salesperson {
  id: string;
  name: string;
  initials: string;
  goalMonth: number; // R$
  achievedMonth: number;
  achievedWeek: number;
  achievedToday: number;
  avgMargin: number;
  estimatedCommission: number;
}

export type AlertSeverity = "info" | "warning" | "danger";
export interface SmartAlert {
  id: string;
  severity: AlertSeverity;
  title: string;
  description: string;
  clientId?: string;
  cta?: string;
}
