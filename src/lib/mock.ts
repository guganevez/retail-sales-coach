import { Client, Order, Product, Salesperson, SmartAlert } from "./types";

export const salesperson: Salesperson = {
  id: "v1",
  name: "Rafael Moreira",
  initials: "RM",
  goalMonth: 280000,
  achievedMonth: 192480,
  achievedWeek: 48230,
  achievedToday: 9870,
  avgMargin: 8.4,
  estimatedCommission: 4280,
};

export const products: Product[] = [
  { id: "p1",  code: "70112", name: "Cerveja Pilsen Lata 350ml", brand: "Brahma",   category: "Cervejas",      unit: "FD 12un", weightKg: 4.5, cost: 32.10, psv: 41.90, pmv: 36.50, promo: true },
  { id: "p2",  code: "70118", name: "Cerveja Pilsen Long Neck 355ml", brand: "Heineken", category: "Cervejas", unit: "CX 24un", weightKg: 9.8, cost: 110.40, psv: 145.90, pmv: 124.00 },
  { id: "p3",  code: "30210", name: "Refrigerante Cola 2L", brand: "Coca-Cola", category: "Refrigerantes", unit: "FD 6un",  weightKg: 13.0, cost: 41.20, psv: 53.40, pmv: 45.90 },
  { id: "p4",  code: "30215", name: "Refrigerante Guaraná 2L", brand: "Antarctica", category: "Refrigerantes", unit: "FD 6un", weightKg: 13.0, cost: 32.80, psv: 42.90, pmv: 36.40 },
  { id: "p5",  code: "30290", name: "Suco de Laranja 1L", brand: "Del Valle",   category: "Sucos",         unit: "CX 12un", weightKg: 12.5, cost: 58.30, psv: 78.50, pmv: 64.20 },
  { id: "p6",  code: "40310", name: "Água Mineral s/ Gás 500ml", brand: "Crystal", category: "Águas",       unit: "FD 12un", weightKg: 6.2, cost: 9.80, psv: 14.90, pmv: 11.20, promo: true },
  { id: "p7",  code: "40320", name: "Energético 269ml", brand: "Red Bull",        category: "Energéticos",   unit: "CX 24un", weightKg: 7.0, cost: 168.40, psv: 219.90, pmv: 188.00 },
  { id: "p8",  code: "50410", name: "Whisky 1L", brand: "Johnnie Walker Red",     category: "Destilados",    unit: "UN",      weightKg: 1.4, cost: 78.90, psv: 109.90, pmv: 89.50 },
  { id: "p9",  code: "60510", name: "Salgadinho 90g", brand: "Elma Chips",        category: "Snacks",        unit: "CX 10un", weightKg: 1.1, cost: 42.30, psv: 58.90, pmv: 47.20 },
  { id: "p10", code: "70113", name: "Chope Pilsen Barril 30L", brand: "Brahma",   category: "Cervejas",      unit: "BARRIL",  weightKg: 32.0, cost: 312.50, psv: 419.00, pmv: 348.00 },
];

export const clients: Client[] = [
  { id: "c1", name: "Bar do Zé Comércio LTDA", fantasy: "Bar do Zé", city: "Marília-SP", segment: "Bar", status: "ativo", creditLimit: 18000, creditUsed: 6420, overdueAmount: 0, lastPurchaseDays: 5, avgTicket: 2840, avgMargin: 9.2, notes: "Prefere entrega de manhã. Pagamento 28 dias." },
  { id: "c2", name: "Restaurante Sabor & Cia", fantasy: "Sabor & Cia", city: "Bauru-SP", segment: "Restaurante", status: "ativo", creditLimit: 35000, creditUsed: 12300, overdueAmount: 0, lastPurchaseDays: 12, avgTicket: 5120, avgMargin: 11.4 },
  { id: "c3", name: "Mercadinho Bom Preço",     fantasy: "Bom Preço", city: "Marília-SP", segment: "Mercado", status: "ativo", creditLimit: 25000, creditUsed: 24600, overdueAmount: 0, lastPurchaseDays: 3, avgTicket: 4200, avgMargin: 6.8, notes: "Muito sensível a preço. Negocia bastante." },
  { id: "c4", name: "Pizzaria Forno a Lenha",   fantasy: "Forno a Lenha", city: "Garça-SP", segment: "Pizzaria", status: "ativo", creditLimit: 12000, creditUsed: 8900, overdueAmount: 1240, lastPurchaseDays: 18, avgTicket: 1980, avgMargin: 12.1 },
  { id: "c5", name: "Conveniência 24h LTDA",    fantasy: "Conv. 24h", city: "Marília-SP", segment: "Conveniência", status: "bloqueado", creditLimit: 8000, creditUsed: 8000, overdueAmount: 3680, lastPurchaseDays: 47, avgTicket: 1450, avgMargin: 7.4 },
  { id: "c6", name: "Lanchonete Esquina",       fantasy: "Esquina Lanches", city: "Pompéia-SP", segment: "Lanchonete", status: "inativo", creditLimit: 6000, creditUsed: 0, overdueAmount: 0, lastPurchaseDays: 62, avgTicket: 980, avgMargin: 8.8 },
  { id: "c7", name: "Boteco do Carlinhos",      fantasy: "Boteco Carlinhos", city: "Vera Cruz-SP", segment: "Bar", status: "ativo", creditLimit: 15000, creditUsed: 4300, overdueAmount: 0, lastPurchaseDays: 8, avgTicket: 2100, avgMargin: 10.5 },
  { id: "c8", name: "Adega Premium Drinks",     fantasy: "Adega Premium", city: "Bauru-SP", segment: "Adega", status: "potencial", creditLimit: 0, creditUsed: 0, overdueAmount: 0, lastPurchaseDays: 999, avgTicket: 0, avgMargin: 0, notes: "Lead novo — primeira visita agendada." },
];

// last prices practiced per (clientId, productId)
export const lastPriceMap: Record<string, Record<string, number>> = {
  c1: { p1: 38.50, p3: 49.90, p6: 13.20, p9: 54.00 },
  c2: { p2: 138.00, p5: 72.40, p7: 208.00, p8: 99.90 },
  c3: { p1: 36.90, p3: 47.50, p4: 38.40, p6: 12.80 },
  c4: { p1: 39.20, p3: 51.00, p9: 56.80 },
  c7: { p1: 38.90, p4: 39.60, p6: 13.50 },
};

// "products often bought" by client — drives suggestions
export const frequentByClient: Record<string, string[]> = {
  c1: ["p1", "p3", "p6", "p9", "p4"],
  c2: ["p2", "p5", "p7", "p8", "p10"],
  c3: ["p1", "p3", "p4", "p6"],
  c4: ["p1", "p3", "p9", "p4"],
  c7: ["p1", "p4", "p6", "p9"],
};

export const recentOrders: Order[] = [
  { id: "o1", clientId: "c1", date: "2025-04-17", type: "entrega", shift: "manha", paymentTerm: "28 dias", totalGross: 2840, margin: 9.4, commission: 2.1, items: [
    { productId: "p1", qty: 24, price: 38.50 }, { productId: "p3", qty: 18, price: 49.90 }, { productId: "p6", qty: 30, price: 13.20 },
  ]},
  { id: "o2", clientId: "c1", date: "2025-04-10", type: "entrega", shift: "manha", paymentTerm: "28 dias", totalGross: 2210, margin: 8.1, commission: 1.8, items: [
    { productId: "p1", qty: 18, price: 38.50 }, { productId: "p3", qty: 12, price: 49.90 },
  ]},
  { id: "o3", clientId: "c2", date: "2025-04-12", type: "entrega", shift: "tarde", paymentTerm: "30 dias", totalGross: 5120, margin: 11.4, commission: 2.4, items: [
    { productId: "p2", qty: 18, price: 138.00 }, { productId: "p7", qty: 6, price: 208.00 },
  ]},
];

export const smartAlerts: SmartAlert[] = [
  { id: "a1", severity: "danger",  title: "Cliente bloqueado",     description: "Conveniência 24h: R$ 3.680 vencidos há +30 dias.", clientId: "c5", cta: "Ver financeiro" },
  { id: "a2", severity: "warning", title: "Limite quase estourado", description: "Mercadinho Bom Preço usou 98% do crédito.", clientId: "c3", cta: "Revisar limite" },
  { id: "a3", severity: "warning", title: "Título vencido",          description: "Pizzaria Forno a Lenha: R$ 1.240 em atraso.", clientId: "c4", cta: "Ver duplicata" },
  { id: "a4", severity: "info",    title: "Cliente sem compra",      description: "Lanchonete Esquina há 62 dias sem pedido.", clientId: "c6", cta: "Agendar visita" },
  { id: "a5", severity: "info",    title: "Oportunidade",            description: "Bar do Zé costuma comprar Guaraná 2L — não está no carrinho.", clientId: "c1", cta: "Sugerir" },
];

// Logística — capacidade do dia
export const logistics = {
  capacityKg: 4500,
  scheduledKg: 3120,
};

export const formatBRL = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2 });

export const formatPct = (n: number) => `${n.toFixed(1)}%`;
