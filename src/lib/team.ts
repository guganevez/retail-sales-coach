// Estrutura hierárquica fictícia, mas com totalizações corretas:
// Gerente = soma dos 2 supervisores. Cada Supervisor = soma dos seus 3 vendedores.

export interface SalesRep {
  id: string;
  name: string;
  initials: string;
  supervisorId: string;
  region: string;
  sold: number;        // R$ no mês
  margin: number;      // %
  deals: number;       // pedidos no mês
  goal: number;        // meta R$
  /** posição atual aproximada (lat/lng) — usada p/ rastreio do vendedor em campo */
  lat: number;
  lng: number;
}

export interface SupervisorNode {
  id: string;
  name: string;
  initials: string;
  team: string;
  managerId: string;
  reps: SalesRep[];
}

export interface ManagerNode {
  id: string;
  name: string;
  initials: string;
  area: string;
  supervisors: SupervisorNode[];
}

// 6 vendedores (3 por supervisor), comissão padrão 2,2%
export const reps: SalesRep[] = [
  // Equipe Centro-Oeste SP — supervisor s1 (Patrícia Lima)
  { id: "v1", name: "Rafael Moreira",     initials: "RM", supervisorId: "s1", region: "Marília-SP",  sold: 192480, margin: 8.4,  deals: 96,  goal: 220000, lat: -22.2154, lng: -49.9456 },
  { id: "v2", name: "Camila Tavares",     initials: "CT", supervisorId: "s1", region: "Bauru-SP",    sold: 248320, margin: 9.8,  deals: 122, goal: 260000, lat: -22.3145, lng: -49.0710 },
  { id: "v3", name: "Luís Henrique",      initials: "LH", supervisorId: "s1", region: "Garça-SP",    sold: 174900, margin: 7.6,  deals: 88,  goal: 200000, lat: -22.2125, lng: -49.6552 },
  // Equipe Litoral-SP — supervisor s2 (Carlos Andrade)
  { id: "v4", name: "Mariana Castro",     initials: "MC", supervisorId: "s2", region: "Santos-SP",   sold: 218300, margin: 11.2, deals: 81,  goal: 230000, lat: -23.9608, lng: -46.3331 },
  { id: "v5", name: "André Bittencourt",  initials: "AB", supervisorId: "s2", region: "São Vicente", sold: 161540, margin: 6.4,  deals: 64,  goal: 190000, lat: -23.9633, lng: -46.3919 },
  { id: "v6", name: "Beatriz Saldanha",   initials: "BS", supervisorId: "s2", region: "Praia Grande",sold: 142800, margin: 10.1, deals: 58,  goal: 180000, lat: -24.0058, lng: -46.4023 },
];

const repsBy = (sId: string) => reps.filter(r => r.supervisorId === sId);

export const supervisors: SupervisorNode[] = [
  { id: "s1", name: "Patrícia Lima",  initials: "PL", team: "Equipe Centro-Oeste SP", managerId: "g1", reps: repsBy("s1") },
  { id: "s2", name: "Carlos Andrade", initials: "CA", team: "Equipe Litoral-SP",      managerId: "g1", reps: repsBy("s2") },
];

export const manager: ManagerNode = {
  id: "g1",
  name: "Eduardo Nogueira",
  initials: "EN",
  area: "Diretoria Comercial",
  supervisors,
};

// ===== Helpers de agregação (sempre derivados, nunca hardcoded) =====

export interface AggregatedKPIs {
  sold: number;
  goal: number;
  deals: number;
  margin: number;       // média ponderada por venda
  ticket: number;
  commission: number;   // 2,2%
  goalPct: number;
}

const COMMISSION_RATE = 0.022;

export function aggregate(reps: SalesRep[]): AggregatedKPIs {
  const sold = reps.reduce((s, r) => s + r.sold, 0);
  const goal = reps.reduce((s, r) => s + r.goal, 0);
  const deals = reps.reduce((s, r) => s + r.deals, 0);
  const weightedMargin = sold > 0
    ? reps.reduce((s, r) => s + r.margin * r.sold, 0) / sold
    : 0;
  return {
    sold,
    goal,
    deals,
    margin: weightedMargin,
    ticket: deals > 0 ? sold / deals : 0,
    commission: sold * COMMISSION_RATE,
    goalPct: goal > 0 ? (sold / goal) * 100 : 0,
  };
}

export function kpisForRep(repId: string): AggregatedKPIs {
  const r = reps.find(x => x.id === repId);
  return r ? aggregate([r]) : aggregate([]);
}

export function kpisForSupervisor(supervisorId: string): AggregatedKPIs {
  return aggregate(repsBy(supervisorId));
}

export function kpisForManager(): AggregatedKPIs {
  return aggregate(reps);
}

export function getSupervisor(id: string) {
  return supervisors.find(s => s.id === id);
}
export function getRep(id: string) {
  return reps.find(r => r.id === id);
}
