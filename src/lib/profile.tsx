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
  /** identidade ativa dentro do papel (qual vendedor "eu sou", qual supervisor "eu sou") */
  activeRepId: string;
  setActiveRepId: (id: string) => void;
  activeSupervisorId: string;
  setActiveSupervisorId: (id: string) => void;
  /** quando supervisor: id do vendedor selecionado para drill (ou null = equipe inteira) */
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

const DEFAULT_REP_ID = "v1";
const DEFAULT_SUP_ID = "s1";

function buildProfile(role: Role, repId: string, supId: string): Profile {
  if (role === "vendedor") {
    const rep = getRep(repId) ?? reps[0];
    return {
      role, id: rep.id, name: rep.name, initials: rep.initials,
      supervisorId: rep.supervisorId,
    };
  }
  if (role === "supervisor") {
    const sup = getSupervisor(supId) ?? supervisors[0];
    return {
      role, id: sup.id, name: sup.name, initials: sup.initials,
      team: sup.team,
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
  const [activeRepId, setActiveRepId] = useState<string>(DEFAULT_REP_ID);
  const [activeSupervisorId, setActiveSupervisorId] = useState<string>(DEFAULT_SUP_ID);
  const [selectedRepId, setSelectedRepId] = useState<string | null>(null);
  const [selectedSupervisorId, setSelectedSupervisorId] = useState<string | null>(null);

  const value = useMemo<ProfileCtx>(() => ({
    profile: buildProfile(role, activeRepId, activeSupervisorId),
    role,
    setRole: (r) => {
      setRole(r);
      setSelectedRepId(null);
      setSelectedSupervisorId(null);
      setScope(r === "vendedor" ? "individual" : "equipe");
    },
    activeRepId,
    setActiveRepId: (id) => {
      setActiveRepId(id);
      // ao trocar a identidade do vendedor, re-sincroniza o supervisor "pai"
      const r = getRep(id);
      if (r) setActiveSupervisorId(r.supervisorId);
    },
    activeSupervisorId,
    setActiveSupervisorId,
    selectedRepId, setSelectedRepId,
    selectedSupervisorId, setSelectedSupervisorId,
    scope, setScope,
  }), [role, scope, activeRepId, activeSupervisorId, selectedRepId, selectedSupervisorId]);

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
