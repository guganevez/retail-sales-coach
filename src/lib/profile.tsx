import { createContext, useContext, useMemo, useState, ReactNode } from "react";

export type Role = "vendedor" | "supervisor" | "gerente";

export interface Profile {
  role: Role;
  name: string;
  initials: string;
  team?: string; // nome da equipe (supervisor/gerente)
}

const PROFILES: Record<Role, Profile> = {
  vendedor:   { role: "vendedor",   name: "Rafael Moreira",  initials: "RM" },
  supervisor: { role: "supervisor", name: "Patrícia Lima",   initials: "PL", team: "Equipe Centro-Oeste SP" },
  gerente:    { role: "gerente",    name: "Eduardo Nogueira",initials: "EN", team: "Diretoria Comercial" },
};

interface ProfileCtx {
  profile: Profile;
  role: Role;
  setRole: (r: Role) => void;
  /** filtro de visualização para supervisor/gerente */
  scope: "individual" | "equipe";
  setScope: (s: "individual" | "equipe") => void;
}

const Ctx = createContext<ProfileCtx | null>(null);

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<Role>("vendedor");
  const [scope, setScope] = useState<"individual" | "equipe">("equipe");

  const value = useMemo<ProfileCtx>(() => ({
    profile: PROFILES[role],
    role,
    setRole,
    scope,
    setScope,
  }), [role, scope]);

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
