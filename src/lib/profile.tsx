import { createContext, useContext, useMemo, useState, ReactNode } from "react";
import { manager, supervisors, reps, SalesRep, SupervisorNode, getRep, getSupervisor } from "./team";

export type Role = "vendedor" | "supervisor" | "gerente";

export interface Profile {
  role: Role;
  id: string;          // id do vendedor/supervisor/gerente
  name: string;
  initials: string;
  team?: string;
  supervisorId?: string;  // se vendedor, a quem reporta
}

interface ProfileCtx {
  profile: Profile;
  role: Role;
  setRole: (r: Role) => void;
  /** quando supervisor: id do vendedor selecionado (ou null = equipe inteira) */
  selectedRepId: string | null;
  setSelectedRepId: (id: string | null) => void;
  /** quando gerente: id do supervisor selecionado (ou null = visão consolidada) */
  selectedSupervisorId: string | null;
  setSelectedSupervisorId: (id: string | null) => void;
  /** filtro legado mantido p/ compat */
  scope: "individual" | "equipe";
  setScope: (s: "individual" | "equipe") => void;
}

const Ctx = createContext<ProfileCtx | null>(null);

// "Eu" em cada papel — Rafael (v1) é o vendedor demo, Patrícia (s1) o supervisor demo, Eduardo o gerente.
const DEFAULT_REP: SalesRep = reps.find(r => r.id === "v1")!;
const DEFAULT_SUP: SupervisorNode = supervisors.find(s => s.id === "s1")!;

function buildProfile(role: Role): Profile {
  if (role === "vendedor") {
    return {
      role, id: DEFAULT_REP.id, name: DEFAULT_REP.name, initials: DEFAULT_REP.initials,
      supervisorId: DEFAULT_REP.supervisorId,
    };
  }
  if (role === "supervisor") {
    return {
      role, id: DEFAULT_SUP.id, name: DEFAULT_SUP.name, initials: DEFAULT_SUP.initials,
      team: DEFAULT_SUP.team,
    };
  }
  return {
    role, id: manager.id, name: manager.name, initials: manager.initials,
    team: manager.area,
  };
}

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<Role>("vendedor");
  const [scope, setScope] = useState<"individual" | "equipe">("equipe");
  const [selectedRepId, setSelectedRepId] = useState<string | null>(null);
  const [selectedSupervisorId, setSelectedSupervisorId] = useState<string | null>(null);

  const value = useMemo<ProfileCtx>(() => ({
    profile: buildProfile(role),
    role,
    setRole: (r) => {
      setRole(r);
      setSelectedRepId(null);
      setSelectedSupervisorId(null);
      setScope(r === "vendedor" ? "individual" : "equipe");
    },
    selectedRepId, setSelectedRepId,
    selectedSupervisorId, setSelectedSupervisorId,
    scope, setScope,
  }), [role, scope, selectedRepId, selectedSupervisorId]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useProfile() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useProfile must be used within ProfileProvider");
  return ctx;
}

export const ROLE_LABEL: Record<Role, string> = {
  vendedor: "Vendedor",
  supervisor: "Supervisor",
  gerente: "Gerente",
};
