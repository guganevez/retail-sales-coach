import { Link, NavLink, useLocation } from "react-router-dom";
import { Home, Users, ShoppingCart, BarChart3, Bell, Plus, Search, FileText, ChevronDown, Truck } from "lucide-react";
import { ReactNode, useState } from "react";
import { cn } from "@/lib/utils";
import { smartAlerts } from "@/lib/mock";
import { useProfile, ROLE_LABEL, Role } from "@/lib/profile";
import { UniversalSearch } from "./UniversalSearch";

interface Props {
  title?: string;
  subtitle?: string;
  children: ReactNode;
  rightSlot?: ReactNode;
  hideTopBar?: boolean;
}

const tabs = [
  { to: "/", label: "Início", icon: Home, end: true },
  { to: "/pedidos", label: "Rastreio", icon: Truck },
  { to: "/pedido/novo", label: "Pedido", icon: ShoppingCart, primary: true },
  { to: "/clientes", label: "Clientes", icon: Users },
  { to: "/painel", label: "Painel", icon: BarChart3 },
];

export function MobileShell({ title, subtitle, children, rightSlot, hideTopBar }: Props) {
  const location = useLocation();
  const alertCount = smartAlerts.filter(a => a.severity !== "info").length;
  const [searchOpen, setSearchOpen] = useState(false);
  const { profile, role, setRole } = useProfile();
  const [roleMenuOpen, setRoleMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      {!hideTopBar && (
        <header className="sticky top-0 z-30 gradient-hero text-primary-foreground">
          <div className="mx-auto max-w-2xl px-4 pt-5 pb-6">
            <div className="flex items-center justify-between gap-2">
              <button
                onClick={() => setRoleMenuOpen(v => !v)}
                className="flex items-center gap-3 rounded-xl px-2 py-1 -ml-2 transition active:bg-white/10"
              >
                <div className="grid h-10 w-10 place-items-center rounded-full bg-white/15 text-sm font-bold backdrop-blur">
                  {profile.initials}
                </div>
                <div className="text-left">
                  <p className="text-[10px]/none opacity-80 uppercase tracking-wide">{ROLE_LABEL[role]}</p>
                  <p className="text-sm font-semibold inline-flex items-center gap-1">
                    {profile.name}
                    <ChevronDown className={cn("h-3.5 w-3.5 transition", roleMenuOpen && "rotate-180")} />
                  </p>
                </div>
              </button>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSearchOpen(true)}
                  className="grid h-10 w-10 place-items-center rounded-full bg-white/15 backdrop-blur transition hover:bg-white/25"
                  aria-label="Buscar"
                >
                  <Search className="h-5 w-5" />
                </button>
                <Link
                  to="/alertas"
                  className="relative grid h-10 w-10 place-items-center rounded-full bg-white/15 backdrop-blur transition hover:bg-white/25"
                  aria-label="Alertas"
                >
                  <Bell className="h-5 w-5" />
                  {alertCount > 0 && (
                    <span className="absolute -right-0.5 -top-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-warning px-1 text-[10px] font-bold text-warning-foreground">
                      {alertCount}
                    </span>
                  )}
                </Link>
              </div>
            </div>

            {roleMenuOpen && (
              <div className="mt-3 rounded-2xl bg-white/12 p-1.5 backdrop-blur">
                {(["vendedor", "supervisor", "gerente"] as Role[]).map((r) => (
                  <button
                    key={r}
                    onClick={() => { setRole(r); setRoleMenuOpen(false); }}
                    className={cn(
                      "flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm transition",
                      role === r ? "bg-white/25 font-semibold" : "hover:bg-white/10"
                    )}
                  >
                    <span>{ROLE_LABEL[r]}</span>
                    <span className="text-[10px] opacity-75">
                      {r === "vendedor" ? "Carteira própria" : r === "supervisor" ? "Equipe" : "Visão geral"}
                    </span>
                  </button>
                ))}
              </div>
            )}

            {(title || subtitle) && (
              <div className="mt-5">
                {subtitle && <p className="text-xs uppercase tracking-wide opacity-75">{subtitle}</p>}
                {title && <h1 className="mt-0.5 text-2xl font-bold">{title}</h1>}
              </div>
            )}
            {rightSlot}
          </div>
        </header>
      )}

      <main className="mx-auto max-w-2xl px-4 pb-28 pt-4 animate-slide-up" key={location.pathname}>
        {children}
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center justify-around px-2 py-2">
          {tabs.map(({ to, label, icon: Icon, end, primary }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  "flex flex-col items-center gap-1 rounded-xl px-2 py-1.5 text-[10px] font-medium transition",
                  primary && "relative -mt-6",
                  !primary && (isActive ? "text-primary" : "text-muted-foreground"),
                )
              }
            >
              {primary ? (
                <>
                  <span className="grid h-14 w-14 place-items-center rounded-full bg-primary text-primary-foreground shadow-glow">
                    <Plus className="h-6 w-6" strokeWidth={2.5} />
                  </span>
                  <span className="text-primary">{label}</span>
                </>
              ) : (
                <>
                  <Icon className="h-5 w-5" />
                  <span>{label}</span>
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>

      <UniversalSearch open={searchOpen} onOpenChange={setSearchOpen} />
    </div>
  );
}
